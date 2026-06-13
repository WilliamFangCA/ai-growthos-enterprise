// 活動引擎：受眾解析、AI 個性化執行（模擬發送）、排程計算
// 由 routes/marketing.js（手動執行）與 index.js（排程器）共用
const crypto = require('crypto');
const { run, get, all } = require('../db');
const { callAI } = require('../aiRouter');
const channelAdapter = require('./channelAdapter');

// RFM 分群條件 —— 必須與 routes/crm.js 的分群邏輯一致（互斥）
const RFM_CONDITIONS = {
  champions: `(c.rfm_score >= 75 AND c.ai_churn_prob < 0.2)`,
  loyal:     `(c.rfm_score >= 50 AND c.ai_churn_prob < 0.4 AND NOT (c.rfm_score >= 75 AND c.ai_churn_prob < 0.2))`,
  at_risk:   `(c.ai_churn_prob >= 0.4 AND c.ai_churn_prob < 0.8)`,
  lost:      `(c.ai_churn_prob >= 0.8 OR (c.rfm_score < 50 AND c.ai_churn_prob >= 0.4))`,
};

// 受眾篩選 SQL 組裝：{ stages, rfm_buckets, member_levels, tags } 空陣列 = 不過濾
function buildAudienceQuery(filters = {}) {
  const where = [];
  const params = [];

  const stages = filters.stages || [];
  if (stages.length) {
    where.push(`c.lifecycle_stage IN (${stages.map(() => '?').join(',')})`);
    params.push(...stages);
  }

  const levels = filters.member_levels || [];
  if (levels.length) {
    where.push(`m.level IN (${levels.map(() => '?').join(',')})`);
    params.push(...levels);
  }

  const buckets = (filters.rfm_buckets || []).filter(b => RFM_CONDITIONS[b]);
  if (buckets.length) {
    where.push(`(${buckets.map(b => RFM_CONDITIONS[b]).join(' OR ')})`);
  }

  const tags = filters.tags || [];
  if (tags.length) {
    where.push(`(${tags.map(() => `c.tags LIKE '%' || ? || '%'`).join(' OR ')})`);
    params.push(...tags);
  }

  const sql = `
    SELECT DISTINCT c.id, c.name, c.email, c.lifecycle_stage, c.rfm_score, c.tags,
           COALESCE(m.level, 'member') AS member_level, COALESCE(m.points, 0) AS points
    FROM contacts c LEFT JOIN members m ON m.contact_id = c.id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`;
  return { sql, params };
}

function resolveAudience(filters) {
  const { sql, params } = buildAudienceQuery(filters);
  return all(sql, params);
}

function countAudience(filters) {
  const audience = resolveAudience(filters);
  return {
    count: audience.length,
    sample: audience.slice(0, 5).map(c => ({ id: c.id, name: c.name, lifecycle_stage: c.lifecycle_stage })),
  };
}

// 排程下次執行時間：{ date, time, recurrence: once|daily|weekly|monthly }
function computeNextRunAt(triggerConfig = {}, fromDate = null) {
  const { date, time, recurrence } = triggerConfig;
  if (!date && !recurrence) return null;
  const t = time || '09:00';

  if (!fromDate) {
    // 初次建立：用設定的日期時間
    const first = new Date(`${date || new Date().toISOString().split('T')[0]}T${t}:00`);
    return isNaN(first) ? null : first.toISOString();
  }
  // 已執行過：依週期推進
  const base = new Date(fromDate);
  switch (recurrence) {
    case 'daily':   base.setDate(base.getDate() + 1); break;
    case 'weekly':  base.setDate(base.getDate() + 7); break;
    case 'monthly': base.setMonth(base.getMonth() + 1); break;
    default: return null; // once：不再排程
  }
  return base.toISOString();
}

function interpolate(template, contact) {
  return String(template || '')
    .replaceAll('{name}', contact.name || '顧客')
    .replaceAll('{points}', String(contact.points ?? 0))
    .replaceAll('{level}', contact.member_level || 'member');
}

const AI_PERSONALIZE_CAP = 5; // 每批最多 N 位走 AI 個性化生成，其餘走模板插值（控制延遲與成本）

async function executeCampaign(campaignId, executedBy = 'manual') {
  const campaign = get(`SELECT * FROM campaigns WHERE id = ?`, [campaignId]);
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

  const audienceConfig = JSON.parse(campaign.audience_config || '{}');
  const aiConfig = JSON.parse(campaign.ai_config || '{}');
  const triggerConfig = JSON.parse(campaign.trigger_config || '{}');
  const audience = resolveAudience(audienceConfig);
  const channel = channelAdapter.campaignTypeToChannel(campaign.type);
  const template = aiConfig.message_template || `您好 {name}，感謝您持續支持！我們為您準備了專屬訊息。`;
  const batchId = crypto.randomUUID();

  // 先推進 next_run_at / 狀態，避免 AI 生成耗時期間排程器重複觸發
  if (campaign.trigger_type === 'scheduled') {
    const next = computeNextRunAt(triggerConfig, new Date().toISOString());
    if (next) {
      run(`UPDATE campaigns SET next_run_at = ? WHERE id = ?`, [next, campaignId]);
    } else {
      run(`UPDATE campaigns SET next_run_at = NULL, status = 'completed' WHERE id = ?`, [campaignId]);
    }
  }

  const results = [];
  for (let i = 0; i < audience.length; i++) {
    const contact = audience[i];
    let message;
    let personalization = 'template';

    if (aiConfig.auto_execute && i < AI_PERSONALIZE_CAP) {
      try {
        const aiResult = await callAI(
          `根據以下客戶輪廓，把訊息模板改寫成一則個性化行銷訊息（保持原意與長度相近，繁體中文，含 emoji）：\n客戶：${contact.name}，生命週期：${contact.lifecycle_stage}，會員等級：${contact.member_level}，積分：${contact.points}，標籤：${contact.tags || '無'}\n模板：${interpolate(template, contact)}\n\n只輸出訊息本文。`,
          '你是 CRM 個性化訊息專家。輸出精煉、親切、可直接發送的訊息。',
          { model: aiConfig.model || 'glm-5-turbo', maxTokens: 300 }
        );
        message = aiResult.content.trim();
        personalization = aiResult.source === 'mock' ? 'template' : 'ai';
        if (personalization === 'template') message = interpolate(template, contact);
      } catch {
        message = interpolate(template, contact);
      }
    } else {
      message = interpolate(template, contact);
    }

    const sendResult = await channelAdapter.send({
      channel,
      recipient: contact.email || contact.name,
      content: message,
      meta: { campaign_id: campaignId, contact_id: contact.id },
    });

    run(`INSERT INTO campaign_executions (batch_id, campaign_id, campaign_name, contact_id, contact_name, channel, message_content, personalization, status, executed_by)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [batchId, campaignId, campaign.name, contact.id, contact.name, channel, message, personalization, `simulated_${sendResult.status === 'simulated' ? 'sent' : sendResult.status}`, executedBy]);

    results.push({ contact: contact.name, personalization, message });
  }

  run(`UPDATE campaigns SET sent_count = sent_count + ? WHERE id = ?`, [audience.length, campaignId]);

  return {
    batchId,
    campaignId,
    campaignName: campaign.name,
    audienceCount: audience.length,
    sent: audience.length,
    aiGenerated: results.filter(r => r.personalization === 'ai').length,
    templated: results.filter(r => r.personalization === 'template').length,
    channel,
    sampleMessages: results.slice(0, 3),
    executedBy,
    executedAt: new Date().toISOString(),
    mode: 'simulated', // 模擬模式：完整記錄但未真實送出
  };
}

module.exports = { resolveAudience, countAudience, computeNextRunAt, executeCampaign, AI_PERSONALIZE_CAP };
