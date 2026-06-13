const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');

// 會員等級制度（PRD 4.12）：依累計消費自動升降級，partner 為邀請制
const LEVELS = [
  { key: 'visitor',  name: '訪客',     minSpend: -1,     icon: '👤', color: '#6b7280', pointsMultiplier: 0,   benefits: ['瀏覽商品', '訂閱電子報'] },
  { key: 'member',   name: '一般會員', minSpend: 0,      icon: '🙋', color: '#9ca3af', pointsMultiplier: 1,   benefits: ['消費積分 1x', '生日禮', '會員專屬活動'] },
  { key: 'silver',   name: '白銀會員', minSpend: 5000,   icon: '🥈', color: '#94a3b8', pointsMultiplier: 1.2, benefits: ['消費積分 1.2x', '生日雙倍積分', '不定期專屬優惠'] },
  { key: 'gold',     name: '黃金會員', minSpend: 20000,  icon: '🥇', color: '#f59e0b', pointsMultiplier: 1.5, benefits: ['消費積分 1.5x', '免運券每月 2 張', '新品優先購'] },
  { key: 'platinum', name: '白金會員', minSpend: 60000,  icon: '💠', color: '#38bdf8', pointsMultiplier: 2,   benefits: ['消費積分 2x', '專屬客服通道', '季度好禮'] },
  { key: 'diamond',  name: '鑽石會員', minSpend: 150000, icon: '💎', color: '#a78bfa', pointsMultiplier: 2.5, benefits: ['消費積分 2.5x', '專屬客戶成功經理', 'VIP 活動邀請'] },
  { key: 'vip',      name: 'VIP',      minSpend: 300000, icon: '👑', color: '#fbbf24', pointsMultiplier: 3,   benefits: ['消費積分 3x', '年度尊榮禮遇', '一對一專屬顧問'] },
  { key: 'partner',  name: '合伙人',   minSpend: Infinity, inviteOnly: true, icon: '🤝', color: '#34d399', pointsMultiplier: 3, benefits: ['銷售分潤', '專屬推薦碼', '合伙人季會'] },
];

const PARTNER_TIERS = [
  { key: 'affiliate',   name: '推廣大使', commission: 0.10, threshold: '邀請制' },
  { key: 'distributor', name: '分銷合伙人', commission: 0.18, threshold: '季度推薦 ≥ 10 單' },
  { key: 'strategic',   name: '戰略合伙人', commission: 0.25, threshold: '年度業績 ≥ NT$50 萬' },
];

function levelForSpend(totalSpend) {
  // partner 不參與自動升級
  let result = LEVELS[1]; // member
  for (const lv of LEVELS) {
    if (lv.inviteOnly) continue;
    if (totalSpend >= lv.minSpend) result = lv;
  }
  return result;
}

function levelMeta(key) {
  return LEVELS.find(l => l.key === key) || LEVELS[1];
}

// GET /api/members/stats — 會員總覽統計
router.get('/stats', (req, res) => {
  try {
    const total = (get(`SELECT COUNT(*) as v FROM members`) || {}).v || 0;
    const totalPoints = (get(`SELECT COALESCE(SUM(points),0) as v FROM members`) || {}).v || 0;
    const totalSpend = (get(`SELECT COALESCE(SUM(total_spend),0) as v FROM members`) || {}).v || 0;
    const byLevel = all(`SELECT level, COUNT(*) as count, COALESCE(SUM(points),0) as points, COALESCE(SUM(total_spend),0) as spend FROM members GROUP BY level`);
    const distribution = LEVELS.filter(l => l.key !== 'visitor').map(lv => {
      const row = byLevel.find(r => r.level === lv.key) || {};
      return { ...lv, minSpend: lv.minSpend === Infinity ? null : lv.minSpend, count: row.count || 0, points: row.points || 0, spend: row.spend || 0 };
    });
    const partners = (get(`SELECT COUNT(*) as v FROM partners WHERE status = 'active'`) || {}).v || 0;
    const partnerEarnings = (get(`SELECT COALESCE(SUM(total_earnings),0) as v FROM partners`) || {}).v || 0;
    const monthEarned = (get(`SELECT COALESCE(SUM(points_delta),0) as v FROM loyalty_transactions WHERE type='earn' AND created_at >= date('now','start of month')`) || {}).v || 0;
    const monthRedeemed = Math.abs((get(`SELECT COALESCE(SUM(points_delta),0) as v FROM loyalty_transactions WHERE type='redeem' AND created_at >= date('now','start of month')`) || {}).v || 0);
    res.json({ total, totalPoints, totalSpend, distribution, partners, partnerEarnings, monthEarned, monthRedeemed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/members/levels — 等級規則（前端展示升級路徑用）
router.get('/levels', (req, res) => {
  res.json({
    levels: LEVELS.map(l => ({ ...l, minSpend: l.minSpend === Infinity ? null : l.minSpend })),
    partnerTiers: PARTNER_TIERS,
  });
});

// GET /api/members — 會員列表（支援等級篩選與關鍵字搜尋）
router.get('/', (req, res) => {
  try {
    const { level, q } = req.query;
    let sql = `
      SELECT m.*, c.email, c.phone, c.lifecycle_stage, c.ai_churn_prob, c.tags
      FROM members m LEFT JOIN contacts c ON c.id = m.contact_id
      WHERE 1=1`;
    const params = [];
    if (level && level !== 'all') { sql += ' AND m.level = ?'; params.push(level); }
    if (q) { sql += ' AND (m.contact_name LIKE ? OR c.email LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
    sql += ' ORDER BY m.total_spend DESC';
    const rows = all(sql, params).map(m => {
      const current = levelMeta(m.level);
      const next = LEVELS.find(l => !l.inviteOnly && l.minSpend > m.total_spend);
      return {
        ...m,
        level_meta: { name: current.name, icon: current.icon, color: current.color, pointsMultiplier: current.pointsMultiplier },
        next_level: next ? { key: next.key, name: next.name, icon: next.icon, remaining: Math.max(0, next.minSpend - m.total_spend) } : null,
      };
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/members — 將既有聯絡人加入會員體系
router.post('/', (req, res) => {
  try {
    const { contact_id, contact_name } = req.body;
    if (!contact_name) return res.status(400).json({ error: 'contact_name required' });
    const dup = get(`SELECT id FROM members WHERE contact_name = ?`, [contact_name]);
    if (dup) return res.status(409).json({ error: '此聯絡人已是會員' });
    run(`INSERT INTO members (contact_id, contact_name, level, points, total_spend) VALUES (?,?,?,?,?)`,
      [contact_id || null, contact_name, 'member', 0, 0]);
    const created = get(`SELECT * FROM members ORDER BY id DESC LIMIT 1`);
    run(`INSERT INTO loyalty_transactions (member_id, contact_name, type, points_delta, balance_after, description, source) VALUES (?,?,?,?,?,?,?)`,
      [created.id, contact_name, 'earn', 100, 100, '入會禮積分', 'system']);
    run(`UPDATE members SET points = 100 WHERE id = ?`, [created.id]);
    res.status(201).json({ ...created, points: 100, welcome_bonus: 100 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/members/:id/points — 積分調整（earn/redeem）+ 自動升級檢查 + AI 通知模擬
router.post('/:id/points', (req, res) => {
  try {
    const member = get(`SELECT * FROM members WHERE id = ?`, [req.params.id]);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const { delta, reason, source, spend_delta } = req.body;
    const points = parseInt(delta, 10);
    if (!points || isNaN(points)) return res.status(400).json({ error: 'delta（正數加點、負數扣點）required' });
    if (points < 0 && member.points + points < 0) {
      return res.status(400).json({ error: `積分不足：目前 ${member.points} 點，無法扣除 ${Math.abs(points)} 點` });
    }

    const newBalance = member.points + points;
    const newSpend = member.total_spend + (parseFloat(spend_delta) || 0);
    const type = points >= 0 ? 'earn' : 'redeem';
    run(`INSERT INTO loyalty_transactions (member_id, contact_name, type, points_delta, balance_after, description, source) VALUES (?,?,?,?,?,?,?)`,
      [member.id, member.contact_name, type, points, newBalance, reason || (type === 'earn' ? '手動加點' : '手動扣點'), source || 'manual']);

    // 自動升降級檢查（partner 維持不變）
    let upgrade = null;
    let newLevel = member.level;
    if (member.level !== 'partner') {
      const target = levelForSpend(newSpend);
      if (target.key !== member.level) {
        const oldMeta = levelMeta(member.level);
        const isUp = LEVELS.findIndex(l => l.key === target.key) > LEVELS.findIndex(l => l.key === member.level);
        newLevel = target.key;
        upgrade = {
          from: { key: member.level, name: oldMeta.name, icon: oldMeta.icon },
          to: { key: target.key, name: target.name, icon: target.icon },
          direction: isUp ? 'upgrade' : 'downgrade',
          // PRD 4.8 VIP 節點：升級時 AI 自動發送個性化恭賀
          ai_notification: isUp
            ? `🌟 恭喜 ${member.contact_name} 升級為${target.name}！專屬福利：${target.benefits.join('、')}`
            : null,
        };
        run(`UPDATE members SET level = ?, last_upgrade_date = CURRENT_TIMESTAMP WHERE id = ?`, [newLevel, member.id]);
      }
    }
    run(`UPDATE members SET points = ?, total_spend = ? WHERE id = ?`, [newBalance, newSpend, member.id]);

    res.json({
      success: true,
      member_id: member.id,
      points_delta: points,
      balance_after: newBalance,
      total_spend: newSpend,
      level: newLevel,
      upgrade,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/members/loyalty — 積分流水帳（支援類型篩選）
router.get('/loyalty', (req, res) => {
  try {
    const { type, limit } = req.query;
    let sql = `SELECT * FROM loyalty_transactions WHERE 1=1`;
    const params = [];
    if (type && type !== 'all') { sql += ' AND type = ?'; params.push(type); }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Math.min(parseInt(limit, 10) || 100, 500));
    const transactions = all(sql, params);
    const totalEarned = (get(`SELECT COALESCE(SUM(points_delta),0) as v FROM loyalty_transactions WHERE type='earn'`) || {}).v || 0;
    const totalRedeemed = Math.abs((get(`SELECT COALESCE(SUM(points_delta),0) as v FROM loyalty_transactions WHERE type='redeem'`) || {}).v || 0);
    res.json({ transactions, stats: { totalEarned, totalRedeemed, redeemRate: totalEarned ? +(totalRedeemed / totalEarned).toFixed(3) : 0 } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/members/partners — 合伙人列表 + 統計（社群商業模式 08 合伙人運營）
router.get('/partners', (req, res) => {
  try {
    const partners = all(`SELECT * FROM partners ORDER BY total_earnings DESC`).map(p => ({
      ...p,
      tier_meta: PARTNER_TIERS.find(t => t.key === p.tier) || PARTNER_TIERS[0],
    }));
    const stats = {
      total: partners.length,
      active: partners.filter(p => p.status === 'active').length,
      totalReferrals: partners.reduce((s, p) => s + (p.referral_count || 0), 0),
      totalEarnings: partners.reduce((s, p) => s + (p.total_earnings || 0), 0),
    };
    res.json({ partners, stats, tiers: PARTNER_TIERS });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/members/partners — 將會員晉升為合伙人
router.post('/partners', (req, res) => {
  try {
    const { member_id, tier } = req.body;
    const member = get(`SELECT * FROM members WHERE id = ?`, [member_id]);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    const dup = get(`SELECT id FROM partners WHERE contact_name = ? AND status = 'active'`, [member.contact_name]);
    if (dup) return res.status(409).json({ error: '此會員已是合伙人' });
    const tierMeta = PARTNER_TIERS.find(t => t.key === tier) || PARTNER_TIERS[0];
    run(`INSERT INTO partners (contact_id, contact_name, tier, commission_rate, referral_count, total_earnings, status) VALUES (?,?,?,?,0,0,'active')`,
      [member.contact_id, member.contact_name, tierMeta.key, tierMeta.commission]);
    run(`UPDATE members SET level = 'partner', last_upgrade_date = CURRENT_TIMESTAMP WHERE id = ?`, [member.id]);
    const created = get(`SELECT * FROM partners ORDER BY id DESC LIMIT 1`);
    res.status(201).json({
      ...created,
      tier_meta: tierMeta,
      ai_notification: `🤝 恭喜 ${member.contact_name} 成為${tierMeta.name}！分潤比例 ${Math.round(tierMeta.commission * 100)}%，專屬推薦碼已生成。`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/members/partners/:id — 更新合伙人（等級/分潤/狀態）
router.put('/partners/:id', (req, res) => {
  try {
    const partner = get(`SELECT * FROM partners WHERE id = ?`, [req.params.id]);
    if (!partner) return res.status(404).json({ error: 'Partner not found' });
    const { tier, commission_rate, status } = req.body;
    const updates = [];
    const params = [];
    if (tier !== undefined) {
      const tierMeta = PARTNER_TIERS.find(t => t.key === tier);
      if (!tierMeta) return res.status(400).json({ error: `Invalid tier. Must be: ${PARTNER_TIERS.map(t => t.key).join(', ')}` });
      updates.push('tier = ?', 'commission_rate = ?');
      params.push(tierMeta.key, commission_rate !== undefined ? commission_rate : tierMeta.commission);
    } else if (commission_rate !== undefined) {
      updates.push('commission_rate = ?');
      params.push(commission_rate);
    }
    if (status !== undefined) {
      if (!['active', 'paused', 'terminated'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
      updates.push('status = ?');
      params.push(status);
    }
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.params.id);
    run(`UPDATE partners SET ${updates.join(', ')} WHERE id = ?`, params);
    const updated = get(`SELECT * FROM partners WHERE id = ?`, [req.params.id]);
    res.json({ ...updated, tier_meta: PARTNER_TIERS.find(t => t.key === updated.tier) || PARTNER_TIERS[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
