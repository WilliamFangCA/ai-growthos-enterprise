const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db');
const campaignEngine = require('../services/campaignEngine');

// 行銷事件 → AI 回覆規則 trigger_type 對應（建立活動同步建立規則時使用）
const EVENT_TO_RULE_TRIGGER = {
  user_signup: 'acquisition',
  first_purchase: 'activation',
  cart_abandoned: 'revenue',
  points_threshold: 'revenue',
  inactive_n_days: 'retention',
  birthday: 'retention',
  order_status_change: 'order_status',
  member_upgrade: 'vip',
};

// GET /api/marketing/stats
router.get('/stats', (req, res) => {
  try {
    const total = (get(`SELECT COUNT(*) as v FROM campaigns`) || {}).v || 0;
    const active = (get(`SELECT COUNT(*) as v FROM campaigns WHERE status = 'active'`) || {}).v || 0;
    const draft = (get(`SELECT COUNT(*) as v FROM campaigns WHERE status = 'draft'`) || {}).v || 0;
    const completed = (get(`SELECT COUNT(*) as v FROM campaigns WHERE status = 'completed'`) || {}).v || 0;
    const totalSent = (get(`SELECT COALESCE(SUM(sent_count), 0) as v FROM campaigns`) || {}).v || 0;
    const totalRevenue = (get(`SELECT COALESCE(SUM(revenue_generated), 0) as v FROM campaigns`) || {}).v || 0;
    const avgOpenRate = (get(`SELECT AVG(open_rate) as v FROM campaigns WHERE sent_count > 0`) || {}).v || 0;
    const avgConvRate = (get(`SELECT AVG(conversion_rate) as v FROM campaigns WHERE sent_count > 0`) || {}).v || 0;

    res.json({ total, active, draft, completed, totalSent, totalRevenue, avgOpenRate, avgConvRate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/marketing/campaigns
router.get('/campaigns', (req, res) => {
  try {
    const { status, type } = req.query;
    let sql = 'SELECT * FROM campaigns WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (type) { sql += ' AND type = ?'; params.push(type); }
    sql += ' ORDER BY created_at DESC';
    res.json(all(sql, params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/marketing/audience/count — 受眾預估（即時預覽觸達人數）
router.post('/audience/count', (req, res) => {
  try {
    res.json(campaignEngine.countAudience(req.body || {}));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/marketing/campaigns/:id — 含解析後設定、關聯 AI 規則、近期執行
router.get('/campaigns/:id', (req, res) => {
  try {
    const campaign = get(`SELECT * FROM campaigns WHERE id = ?`, [req.params.id]);
    if (!campaign) return res.status(404).json({ error: 'Not found' });
    const sequences = all(`SELECT * FROM email_sequences WHERE campaign_id = ? ORDER BY step_number`, [req.params.id]);
    const linkedRule = get(`SELECT id, name, trigger_type, is_active, fire_count FROM ai_reply_rules WHERE campaign_id = ?`, [req.params.id]) || null;
    const executions = all(`SELECT * FROM campaign_executions WHERE campaign_id = ? ORDER BY executed_at DESC LIMIT 30`, [req.params.id]);
    res.json({
      ...campaign,
      trigger_config_parsed: JSON.parse(campaign.trigger_config || '{}'),
      audience_config_parsed: JSON.parse(campaign.audience_config || '{}'),
      ai_config_parsed: JSON.parse(campaign.ai_config || '{}'),
      sequences,
      linked_rule: linkedRule,
      executions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/marketing/campaigns — 完整建立（觸發設定 + 受眾 + AI 自動執行 + 可選同步建立 AI 規則）
router.post('/campaigns', (req, res) => {
  try {
    const {
      name, type, trigger_type,
      trigger_config = {},      // scheduled: {date,time,recurrence} / event_based: {event,n}
      audience_segment,         // 人類可讀摘要標籤
      audience_config = {},     // {stages,rfm_buckets,member_levels,tags}
      ai_config = {},           // {auto_execute,message_template,model}
      create_reply_rule = false,
    } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'name and type required' });

    const targetCount = campaignEngine.countAudience(audience_config).count;
    const nextRunAt = trigger_type === 'scheduled' ? campaignEngine.computeNextRunAt(trigger_config, null) : null;

    run(`INSERT INTO campaigns (name, type, trigger_type, trigger_config, audience_segment, audience_config, ai_config, target_count, next_run_at, status)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [name, type, trigger_type || 'manual', JSON.stringify(trigger_config), audience_segment || 'all',
       JSON.stringify(audience_config), JSON.stringify(ai_config), targetCount, nextRunAt,
       trigger_type === 'scheduled' || trigger_type === 'event_based' ? 'active' : 'draft']);
    const created = get(`SELECT * FROM campaigns ORDER BY id DESC LIMIT 1`);

    // 同步建立關聯 AI 自動回覆規則
    let linkedRule = null;
    if (create_reply_rule) {
      const ruleTrigger = EVENT_TO_RULE_TRIGGER[trigger_config.event] || 'retention';
      run(`INSERT INTO ai_reply_rules (name, trigger_type, trigger_condition, reply_template, model, language, platforms, is_active, campaign_id)
           VALUES (?,?,?,?,?,?,?,1,?)`,
        [`[活動] ${name}`, ruleTrigger, JSON.stringify({ source: 'campaign', campaign_id: created.id, ...trigger_config }),
         ai_config.message_template || `您好 {name}，感謝參與「${name}」活動！`,
         ai_config.model || 'glm-5-turbo', 'auto', JSON.stringify(['all']), created.id]);
      linkedRule = get(`SELECT id, name, trigger_type, is_active FROM ai_reply_rules WHERE campaign_id = ?`, [created.id]);
    }

    res.status(201).json({ ...created, linked_rule: linkedRule, target_count: targetCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/marketing/campaigns/:id/execute — 立即執行（模擬發送 + AI 個性化 + 完整日誌）
router.post('/campaigns/:id/execute', async (req, res) => {
  try {
    const summary = await campaignEngine.executeCampaign(
      parseInt(req.params.id, 10),
      req.user?.email || 'manual'
    );
    res.json(summary);
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
  }
});

// GET /api/marketing/campaigns/:id/executions — 執行日誌
router.get('/campaigns/:id/executions', (req, res) => {
  try {
    const { batch_id } = req.query;
    let sql = `SELECT * FROM campaign_executions WHERE campaign_id = ?`;
    const params = [req.params.id];
    if (batch_id) { sql += ' AND batch_id = ?'; params.push(batch_id); }
    sql += ' ORDER BY executed_at DESC LIMIT 100';
    res.json(all(sql, params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/marketing/campaigns/:id/status
router.put('/campaigns/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['draft', 'scheduled', 'active', 'paused', 'completed'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    run(`UPDATE campaigns SET status = ? WHERE id = ?`, [status, req.params.id]);
    res.json({ success: true, id: req.params.id, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/marketing/templates
router.get('/templates', (req, res) => {
  try {
    const { aarrr, type } = req.query;
    let templates = [
      // ── ACQUISITION ─────────────────────────────────────────────
      {
        id: 'tpl_acq_1', aarrr: 'acquisition',
        name: 'LINE 加好友歡迎禮', type: 'line_message', trigger: 'user_signup', steps: 3, icon: '🎁',
        description: '新好友加入 LINE OA 即觸發：歡迎訊息 + 首購折扣碼 + 品牌介紹，48h 內完成轉化',
        preview: '🎉 歡迎加入！送您首購 9 折優惠碼：WELCOME10，48小時內有效',
        tags: ['LINE', '新客', '首購'],
      },
      {
        id: 'tpl_acq_2', aarrr: 'acquisition',
        name: '社群新成員導流序列', type: 'line_message', trigger: 'group_join', steps: 2, icon: '👋',
        description: 'LINE 群組新成員加入 → 私訊邀請加 OA → 完成首購激活，適合社群型電商',
        preview: '👋 歡迎加入粉絲群！加入官方帳號領取獨家新人禮，點擊 → [連結]',
        tags: ['LINE群組', '導流'],
      },
      {
        id: 'tpl_acq_3', aarrr: 'acquisition',
        name: '老帶新裂變計劃', type: 'push_notification', trigger: 'manual', steps: 4, icon: '🔗',
        description: '為現有會員生成專屬推薦碼，雙向獎勵機制（推薦人+被推薦人各享優惠）',
        preview: '📢 邀請好友加入，您和好友各獲得 NT$100 購物金！您的推薦碼：{{code}}',
        tags: ['裂變', '推薦碼'],
      },
      {
        id: 'tpl_acq_4', aarrr: 'acquisition',
        name: '限時閃購廣播', type: 'line_message', trigger: 'scheduled', steps: 2, icon: '⚡',
        description: 'LINE 群組定時限時特賣廣播，搭配倒計時和限量提示，刺激衝動購買',
        preview: '⚡ 限時 2 小時！精選商品 6 折起，限量 50 組，售完為止！立即搶購 →',
        tags: ['閃購', 'LINE廣播'],
      },
      {
        id: 'tpl_acq_5', aarrr: 'acquisition',
        name: '節慶促銷五部曲', type: 'email_sequence', trigger: 'scheduled', steps: 5, icon: '🎊',
        description: '春節/母親節/雙11 等節慶活動完整序列：預告→開賣→中場衝刺→最後機會→感謝',
        preview: '🎊 雙11 倒數 7 天！提前加購享 8 折，限時開放預購清單...',
        tags: ['節慶', '促銷', '序列'],
      },
      // ── ACTIVATION ──────────────────────────────────────────────
      {
        id: 'tpl_act_1', aarrr: 'activation',
        name: '新用戶 7 天激活序列', type: 'email_sequence', trigger: 'user_signup', steps: 4, icon: '🚀',
        description: '從歡迎→功能引導→行為分析→首購激勵，完整激活新用戶的 7 天旅程',
        preview: '🚀 Hi {{name}}！歡迎來到 [品牌]，7 天內完成首購可獲得積分加倍...',
        tags: ['新用戶', '激活序列', '7天'],
      },
      {
        id: 'tpl_act_2', aarrr: 'activation',
        name: '首購轉化 48H 序列', type: 'line_message', trigger: 'user_signup', steps: 3, icon: '🛒',
        description: '加入後 1h/24h/48h 三波 LINE 推送，主動引導完成第一筆訂單，轉化率 +28%',
        preview: '🛒 {{name}}，您有 NT$50 首購折扣等著您！限 48 小時使用，快來選購 →',
        tags: ['首購', '48小時', 'LINE'],
      },
      {
        id: 'tpl_act_3', aarrr: 'activation',
        name: '直播導購激活流程', type: 'line_message', trigger: 'event_based', steps: 5, icon: '📺',
        description: '直播前提醒→開播通知→中場加購→結束追單→評價收集，完整直播電商閉環',
        preview: '📺 直播即將開始（15分後）！點擊進入直播間，搶先預購熱門商品 →',
        tags: ['直播', '導購', 'LINE商務'],
      },
      {
        id: 'tpl_act_4', aarrr: 'activation',
        name: '商品試用申請序列', type: 'email_sequence', trigger: 'event_based', steps: 4, icon: '🧪',
        description: '試用申請確認→寄出通知→使用中提醒→評價收集，提升試用轉正率至 45%+',
        preview: '🧪 您的試用申請已通過！預計 3-5 天到貨，到貨後記得完成體驗回饋...',
        tags: ['試用', '評價', '轉化'],
      },
      // ── RETENTION ───────────────────────────────────────────────
      {
        id: 'tpl_ret_1', aarrr: 'retention',
        name: '流失用戶喚回序列', type: 'email_sequence', trigger: 'inactive_30d', steps: 3, icon: '💌',
        description: '30 天未活躍觸發，AI 個人化喚回：詢問→提供誘因→最後機會，回流率 +23%',
        preview: '💌 好久不見，{{name}}！我們為您準備了專屬回歸禮，有效期 72 小時...',
        tags: ['喚回', '流失防止', 'AI'],
      },
      {
        id: 'tpl_ret_2', aarrr: 'retention',
        name: '生日 VIP 專屬禮序列', type: 'line_message', trigger: 'scheduled', steps: 3, icon: '🎂',
        description: '生日前 7 天預告→生日當天禮物碼→生日後 3 天最後提醒，增強情感連結',
        preview: '🎂 {{name}}，您的生日快到了！我們準備了一份驚喜，敬請期待...',
        tags: ['生日', 'VIP', '情感行銷'],
      },
      {
        id: 'tpl_ret_3', aarrr: 'retention',
        name: '月度 AI 個人化推薦', type: 'line_message', trigger: 'scheduled', steps: 1, icon: '🤖',
        description: 'AI 分析購買記錄，每月發送個人化推薦清單，點擊率比廣播訊息高 3.5x',
        preview: '🤖 根據您的喜好，本月為您精選了 5 件寶貝，快來看看 →',
        tags: ['AI推薦', '個人化', '月報'],
      },
      {
        id: 'tpl_ret_4', aarrr: 'retention',
        name: '回流窗口期智能提醒', type: 'push_notification', trigger: 'ai_trigger', steps: 2, icon: '⏰',
        description: 'AI 根據個人消耗週期預測最佳提醒時機，在客戶「快用完」時精準推送補貨',
        preview: '⏰ {{name}}，您的上次購買已過了 {{days}} 天，是時候補貨了！',
        tags: ['AI', '補貨提醒', '智能'],
      },
      {
        id: 'tpl_ret_5', aarrr: 'retention',
        name: '社群高互動積分回饋', type: 'social_post', trigger: 'event_based', steps: 2, icon: '❤️',
        description: '社群互動（點讚/留言/分享）自動獎勵積分，提升群組活躍度和品牌黏著度',
        preview: '❤️ 感謝您的互動！已送出 50 點積分，累積可兌換好禮 →',
        tags: ['社群', '積分', '互動'],
      },
      {
        id: 'tpl_ret_6', aarrr: 'retention',
        name: '每週社群暖場', type: 'social_post', trigger: 'scheduled', steps: 1, icon: '💬',
        description: '自動發送每週社群暖場貼文，結合當週熱門話題 + 商品推薦，保持社群活躍',
        preview: '💬 本週話題：{{hot_topic}} ！你們怎麼看？留言告訴我們，精選留言送積分！',
        tags: ['社群', '定時貼文', '暖場'],
      },
      // ── REVENUE ─────────────────────────────────────────────────
      {
        id: 'tpl_rev_1', aarrr: 'revenue',
        name: 'VIP 升級恭賀序列', type: 'push_notification', trigger: 'tier_upgrade', steps: 2, icon: '👑',
        description: '自動發送 VIP 升級恭賀 + 專屬福利說明 + VIP 限定商品預覽，刺激更高消費',
        preview: '👑 恭喜晉升 {{level}} 會員！您現在享有 {{benefits}}，查看 VIP 專屬商品 →',
        tags: ['VIP', '升級', '福利'],
      },
      {
        id: 'tpl_rev_2', aarrr: 'revenue',
        name: 'AI 交叉/向上銷售', type: 'line_message', trigger: 'event_based', steps: 2, icon: '📈',
        description: '訂單完成後 3 天 AI 推薦配件/升級版，Cross-sell/Up-sell 轉化率提升 18%',
        preview: '📦 您的商品已到貨！根據您的購買，這些搭配商品銷售火熱 →',
        tags: ['Cross-sell', 'AI推薦', '客單提升'],
      },
      {
        id: 'tpl_rev_3', aarrr: 'revenue',
        name: '購物車棄單三波追回', type: 'line_message', trigger: 'event_based', steps: 3, icon: '🛒',
        description: '棄單後 1h/4h/24h 三波追回：提醒→優惠誘因→最後機會，棄單回收率 15-20%',
        preview: '🛒 您有商品遺忘在購物車了！完成結帳享 95 折，優惠限 24 小時 →',
        tags: ['棄單追回', '轉化', '緊迫感'],
      },
      {
        id: 'tpl_rev_4', aarrr: 'revenue',
        name: '訂單全程狀態通知', type: 'push_notification', trigger: 'event_based', steps: 6, icon: '📦',
        description: '確認→備貨→出貨→運送中→到貨→評價，全生命週期通知，降低客服詢問 60%',
        preview: '📦 訂單 #{{order_id}} 已出貨！{{carrier}} 追蹤號：{{tracking_no}}',
        tags: ['訂單', '物流', '全程'],
      },
      {
        id: 'tpl_rev_5', aarrr: 'revenue',
        name: '復購週期智能催購', type: 'line_message', trigger: 'ai_trigger', steps: 2, icon: '🔄',
        description: 'AI 分析個人消耗週期，在預測復購窗口發送個人化催購訊息，復購率 +31%',
        preview: '🔄 {{name}}，距上次購買已 {{days}} 天，是否需要補充{{product}}？',
        tags: ['復購', 'AI預測', '週期'],
      },
      {
        id: 'tpl_rev_6', aarrr: 'revenue',
        name: 'RFM 高價值客戶維繫', type: 'email_sequence', trigger: 'ai_trigger', steps: 4, icon: '💎',
        description: 'RFM 模型識別高價值客戶，提供差異化維繫方案：私訊/電話/VIP 專屬活動邀請',
        preview: '💎 親愛的貴賓，我們為您準備了一場專屬 VIP 品鑑會，名額有限...',
        tags: ['RFM', 'VIP維繫', '高價值'],
      },
      // ── REFERRAL ────────────────────────────────────────────────
      {
        id: 'tpl_ref_1', aarrr: 'referral',
        name: '活動報名確認序列', type: 'email_sequence', trigger: 'event_signup', steps: 3, icon: '📅',
        description: '報名確認→活動前 24h 提醒→感謝 + 評價收集，完整活動行銷閉環',
        preview: '📅 報名成功！已確認參加 {{event_name}}，記得在日曆上標記 {{date}}',
        tags: ['活動', '報名', '提醒'],
      },
      {
        id: 'tpl_ref_2', aarrr: 'referral',
        name: '轉介紹雙向獎勵', type: 'line_message', trigger: 'event_based', steps: 4, icon: '🤝',
        description: '推薦碼追蹤 + 雙向獎勵自動發放，推薦人和新客各享優惠，裂變效率最大化',
        preview: '🤝 好友透過您的推薦完成首購！NT$100 購物金已入帳，感謝您的推薦！',
        tags: ['推薦計劃', '裂變', '雙向獎勵'],
      },
      {
        id: 'tpl_ref_3', aarrr: 'referral',
        name: 'UGC 曬單徵集', type: 'line_message', trigger: 'event_based', steps: 3, icon: '📸',
        description: '到貨後邀請曬單，積分獎勵，UGC 內容同步到社群提升品牌信任度和轉化率',
        preview: '📸 收到商品了嗎？曬出開箱照片，獲得 200 積分獎勵，點選上傳 →',
        tags: ['UGC', '曬單', '口碑'],
      },
      {
        id: 'tpl_ref_4', aarrr: 'referral',
        name: '社群大使招募計劃', type: 'email_sequence', trigger: 'manual', steps: 5, icon: '⭐',
        description: '識別頂級會員→邀請→說明計劃→任務清單→激勵發放，建立品牌大使體系',
        preview: '⭐ 我們觀察到您是最忠實的客戶，特邀加入品牌大使計劃，享有專屬特權...',
        tags: ['大使', '頂級會員', '社群領袖'],
      },
      {
        id: 'tpl_ref_5', aarrr: 'referral',
        name: '拼團購發起序列', type: 'line_message', trigger: 'manual', steps: 4, icon: '👥',
        description: '發起拼團→招募成員提醒→成團通知→開始購買，利用社交壓力促進成交',
        preview: '👥 {{name}} 邀請您一起拼團！再差 {{n}} 人可享 7 折，快呼朋引伴 →',
        tags: ['拼團', '社交購物', '共購'],
      },
    ];

    if (aarrr && aarrr !== 'all') templates = templates.filter(t => t.aarrr === aarrr);
    if (type && type !== 'all') templates = templates.filter(t => t.type === type);

    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/marketing/loyalty
router.get('/loyalty', (req, res) => {
  try {
    const transactions = all(`SELECT * FROM loyalty_transactions ORDER BY created_at DESC LIMIT 50`);
    const totalEarned = (get(`SELECT COALESCE(SUM(points_delta), 0) as v FROM loyalty_transactions WHERE type = 'earn'`) || {}).v || 0;
    const totalRedeemed = Math.abs((get(`SELECT COALESCE(SUM(points_delta), 0) as v FROM loyalty_transactions WHERE type = 'redeem'`) || {}).v || 0);
    const totalMembers = (get(`SELECT COUNT(*) as v FROM members`) || {}).v || 0;
    const avgPoints = (get(`SELECT AVG(points) as v FROM members`) || {}).v || 0;
    res.json({ transactions, stats: { totalEarned, totalRedeemed, totalMembers, avgPoints: Math.round(avgPoints) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
