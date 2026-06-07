const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'growthos.db');

let db = null;

function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}

function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}

function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}

function exec(sql) {
  return db.exec(sql);
}

function initTables() {
  exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      lifecycle_stage TEXT DEFAULT 'new',
      rfm_score INTEGER DEFAULT 0,
      ai_churn_prob REAL DEFAULT 0.0,
      tags TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workflows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      actions_json TEXT DEFAULT '[]',
      status TEXT DEFAULT 'active',
      run_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS content_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      prompt TEXT,
      output TEXT,
      model_used TEXT DEFAULT 'mock',
      tokens_used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agent_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_name TEXT NOT NULL,
      task TEXT,
      result TEXT,
      status TEXT DEFAULT 'completed',
      cost_usd REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS metrics_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_key TEXT NOT NULL,
      metric_value REAL,
      snapshot_date DATE
    );

    CREATE TABLE IF NOT EXISTS comm_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      account_name TEXT NOT NULL,
      channel_id TEXT,
      webhook_url TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      comm_account_id INTEGER,
      contact_name TEXT,
      contact_avatar TEXT,
      channel_user_id TEXT,
      last_message TEXT,
      last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      assigned_to TEXT DEFAULT 'ai',
      status TEXT DEFAULT 'open',
      unread_count INTEGER DEFAULT 0,
      tags TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      direction TEXT NOT NULL,
      content TEXT,
      message_type TEXT DEFAULT 'text',
      sent_by TEXT NOT NULL,
      ai_node_type TEXT,
      quality_score REAL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_reply_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      trigger_condition TEXT DEFAULT '{}',
      reply_template TEXT NOT NULL,
      model TEXT DEFAULT 'glm-4.5-air',
      language TEXT DEFAULT 'auto',
      platforms TEXT DEFAULT '["all"]',
      is_active INTEGER DEFAULT 1,
      fire_count INTEGER DEFAULT 0,
      version INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      platform_order_id TEXT,
      contact_name TEXT,
      contact_email TEXT,
      status TEXT DEFAULT 'pending',
      items_json TEXT DEFAULT '[]',
      subtotal REAL DEFAULT 0,
      shipping_fee REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      currency TEXT DEFAULT 'TWD',
      shipping_address TEXT,
      tracking_number TEXT,
      logistics_provider TEXT,
      estimated_delivery TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      notification_type TEXT,
      channel TEXT,
      content TEXT,
      status TEXT DEFAULT 'sent',
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER,
      contact_name TEXT,
      level TEXT DEFAULT 'member',
      points INTEGER DEFAULT 0,
      total_spend REAL DEFAULT 0,
      join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_upgrade_date DATETIME
    );

    CREATE TABLE IF NOT EXISTS partners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER,
      contact_name TEXT,
      tier TEXT DEFAULT 'affiliate',
      commission_rate REAL DEFAULT 0.1,
      referral_count INTEGER DEFAULT 0,
      total_earnings REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      trigger_type TEXT DEFAULT 'manual',
      trigger_config TEXT DEFAULT '{}',
      audience_segment TEXT DEFAULT 'all',
      target_count INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      open_rate REAL DEFAULT 0,
      click_rate REAL DEFAULT 0,
      conversion_rate REAL DEFAULT 0,
      revenue_generated REAL DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS email_sequences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER,
      step_number INTEGER DEFAULT 1,
      subject TEXT,
      content TEXT,
      delay_days INTEGER DEFAULT 0,
      delay_hours INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      sent_count INTEGER DEFAULT 0,
      open_count INTEGER DEFAULT 0,
      click_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS loyalty_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      contact_name TEXT,
      type TEXT NOT NULL,
      points_delta INTEGER DEFAULT 0,
      balance_after INTEGER DEFAULT 0,
      description TEXT,
      source TEXT DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function seedDemoData() {
  exec(`DELETE FROM contacts`);
  exec(`DELETE FROM sqlite_sequence WHERE name='contacts'`);
  const contacts = [
    ['Alice Chen', 'alice@techcorp.com', '+1-555-0101', 'active', 85, 0.08, 'enterprise,saas'],
    ['Bob Martinez', 'bob@startup.io', '+1-555-0102', 'active', 72, 0.15, 'startup,growth'],
    ['Carol Wang', 'carol@agency.co', '+1-555-0103', 'at_risk', 45, 0.62, 'agency,smb'],
    ['David Kim', 'david@ecommerce.com', '+1-555-0104', 'active', 91, 0.04, 'ecommerce,enterprise'],
    ['Emma Davis', 'emma@freelance.net', '+1-555-0105', 'new', 10, 0.38, 'freelancer'],
    ['Frank Liu', 'frank@bigco.com', '+1-555-0106', 'lost', 18, 0.87, 'enterprise,churned'],
    ['Grace Park', 'grace@media.com', '+1-555-0107', 'active', 67, 0.22, 'media,content'],
    ['Henry Brown', 'henry@consulting.biz', '+1-555-0108', 'at_risk', 33, 0.71, 'consulting,smb'],
    ['Iris Zhang', 'iris@finance.co', '+1-555-0109', 'new', 5, 0.45, 'finance,new'],
    ['James Wilson', 'james@retail.com', '+1-555-0110', 'active', 78, 0.11, 'retail,loyalty'],
  ];
  contacts.forEach(([name, email, phone, stage, rfm, churn, tags]) => {
    run(
      `INSERT INTO contacts (name, email, phone, lifecycle_stage, rfm_score, ai_churn_prob, tags) VALUES (?,?,?,?,?,?,?)`,
      [name, email, phone, stage, rfm, churn, tags]
    );
  });

  exec(`DELETE FROM workflows`);
  exec(`DELETE FROM sqlite_sequence WHERE name='workflows'`);
  const workflows = [
    ['Welcome Email Sequence', 'user_signup',
      JSON.stringify([
        { type: 'send_email', template: 'welcome', delay: 0 },
        { type: 'send_email', template: 'onboarding_day3', delay: 3 },
        { type: 'send_email', template: 'feature_highlight', delay: 7 },
      ]),
      'active', 234],
    ['Churn Risk Alert', 'ai_trigger',
      JSON.stringify([
        { type: 'tag_contact', tag: 'at_risk' },
        { type: 'notify_slack', channel: '#cs-alerts' },
        { type: 'create_task', assignee: 'cs_team', priority: 'high' },
      ]),
      'active', 89],
    ['Monthly Re-engagement', 'scheduled',
      JSON.stringify([
        { type: 'segment_filter', condition: 'inactive_30d' },
        { type: 'send_email', template: 'reengagement_offer', delay: 0 },
        { type: 'track_conversion', window: 7 },
      ]),
      'paused', 45],
  ];
  workflows.forEach(([name, trigger, actions, status, runCount]) => {
    run(`INSERT INTO workflows (name, trigger_type, actions_json, status, run_count) VALUES (?,?,?,?,?)`,
      [name, trigger, actions, status, runCount]);
  });

  exec(`DELETE FROM content_history`);
  exec(`DELETE FROM sqlite_sequence WHERE name='content_history'`);
  const contents = [
    ['article', 'Write about AI marketing automation trends in 2026',
      'AI-Powered Marketing in 2026: The Automation Revolution\n\nSituation: Marketing teams are overwhelmed by data...', 'glm-4-air', 850],
    ['social', 'Promote our new AI analytics feature launch',
      "🚀 Big news! Our AI analytics just got smarter.\n\n#AIMarketing #GrowthHacking #MarTech", 'glm-4-flash', 120],
    ['ad', 'Facebook ad for SaaS trial conversion',
      'Stop Guessing. Start Growing.\n\nAttention: 73% of marketers miss revenue because they lack real-time insights...', 'glm-4-air', 310],
    ['campaign', 'Summer growth campaign for B2B SaaS',
      'Campaign: "Scale Season" Q3 Growth Push\nGoal: 200 trial signups, 40 conversions...', 'glm-4', 1200],
    ['social', 'Share customer success story',
      "💡 How TechCorp 3x'd their pipeline with AI GrowthOS\n\n#CustomerSuccess #B2BSaaS", 'glm-4-flash', 98],
  ];
  contents.forEach(([type, prompt, output, model, tokens]) => {
    run(`INSERT INTO content_history (type, prompt, output, model_used, tokens_used) VALUES (?,?,?,?,?)`,
      [type, prompt, output, model, tokens]);
  });

  exec(`DELETE FROM comm_accounts`);
  exec(`DELETE FROM sqlite_sequence WHERE name='comm_accounts'`);
  [
    ['line', 'LINE Official 官方帳號', '@growthos_official', 'https://api.line.me/webhook'],
    ['whatsapp', 'WhatsApp Business', '+886-900-000-001', 'https://graph.facebook.com/webhook'],
    ['telegram', 'Telegram Bot', '@GrowthOS_bot', 'https://api.telegram.org/webhook'],
    ['email', 'Support Email', 'support@growthos.ai', null],
  ].forEach(([platform, name, channelId, webhook]) => {
    run(`INSERT INTO comm_accounts (platform, account_name, channel_id, webhook_url) VALUES (?,?,?,?)`,
      [platform, name, channelId, webhook]);
  });

  exec(`DELETE FROM conversations`);
  exec(`DELETE FROM sqlite_sequence WHERE name='conversations'`);
  const now = new Date();
  const convos = [
    ['line', 1, 'Alice Chen', '🧑', 'U001', '請問你們的企業方案怎麼計費？', new Date(now - 5*60000).toISOString(), 'ai', 'open', 2, 'enterprise,inquiry'],
    ['whatsapp', 2, 'Bob Martinez', '👨', 'W002', 'Hi, I need help with my order #1023', new Date(now - 15*60000).toISOString(), 'human', 'open', 1, 'order,support'],
    ['telegram', 3, 'Carol Wang', '👩', 'T003', '我想了解一下 VIP 會員方案', new Date(now - 30*60000).toISOString(), 'ai', 'open', 0, 'vip,inquiry'],
    ['line', 1, 'David Kim', '🧔', 'U004', '謝謝！問題解決了', new Date(now - 2*3600000).toISOString(), 'ai', 'resolved', 0, 'resolved'],
    ['email', 4, 'Emma Davis', '👱', 'E005', 'Refund request for order #992', new Date(now - 4*3600000).toISOString(), 'human', 'open', 3, 'refund,urgent'],
    ['whatsapp', 2, 'Frank Liu', '🧑', 'W006', '什麼時候可以發貨？', new Date(now - 6*3600000).toISOString(), 'ai', 'open', 1, 'shipping'],
  ];
  convos.forEach(([platform, acctId, name, avatar, userId, lastMsg, lastAt, assignedTo, status, unread, tags]) => {
    run(`INSERT INTO conversations (platform, comm_account_id, contact_name, contact_avatar, channel_user_id, last_message, last_message_at, assigned_to, status, unread_count, tags) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [platform, acctId, name, avatar, userId, lastMsg, lastAt, assignedTo, status, unread, tags]);
  });

  exec(`DELETE FROM messages`);
  exec(`DELETE FROM sqlite_sequence WHERE name='messages'`);
  [
    [1, 'inbound', '請問你們的企業方案怎麼計費？', 'text', 'human', null, null],
    [1, 'outbound', '您好！我們的企業方案採用年費制，依照使用者數量和功能模組計費。基礎方案 $299/月，包含 5 個 AI 員工席位。請問您的團隊大概有多少人？', 'text', 'ai', 'acquisition', 4.8],
    [1, 'inbound', '我們大概 20 人，需要全部 14 個 AI 員工', 'text', 'human', null, null],
    [1, 'outbound', '了解！20 人團隊 + 全功能方案，建議選擇企業旗艦版 $899/月，無限 AI 員工 + 優先支援 + 專屬客戶成功經理。我可以安排一個 30 分鐘的 Demo 給您看實際效果，方便嗎？', 'text', 'ai', 'revenue', 4.9],
    [2, 'inbound', 'Hi, I need help with my order #1023', 'text', 'human', null, null],
    [2, 'outbound', 'Hi Bob! I can see your order #1023 is currently in processing. Expected shipment is within 24 hours. Is there anything specific you need help with?', 'text', 'ai', 'order', 4.7],
    [5, 'inbound', 'Refund request for order #992', 'text', 'human', null, null],
    [5, 'outbound', 'Hi Emma, I\'ve received your refund request for order #992. Our policy allows returns within 7 days. A team member will review and process within 2 business days. Reference: REF-2026-992', 'text', 'ai', 'service', 4.5],
  ].forEach(([convId, dir, content, type, sentBy, nodeType, score]) => {
    run(`INSERT INTO messages (conversation_id, direction, content, message_type, sent_by, ai_node_type, quality_score) VALUES (?,?,?,?,?,?,?)`,
      [convId, dir, content, type, sentBy, nodeType, score]);
  });

  exec(`DELETE FROM ai_reply_rules`);
  exec(`DELETE FROM sqlite_sequence WHERE name='ai_reply_rules'`);
  [
    ['歡迎新用戶', 'acquisition', '{"trigger":"first_contact"}', '您好！歡迎加入 {brand}！我是您的 AI 助理，隨時為您服務。請問有什麼我可以幫您的嗎？', 'glm-4.5-air', 'auto', '["line","whatsapp","telegram"]', 1, 892],
    ['激活引導', 'activation', '{"trigger":"first_purchase"}', '恭喜您完成第一筆訂單！🎉 接下來我們為您準備了專屬的入門指南，幫助您快速上手所有功能。', 'glm-4.5-air', 'auto', '["all"]', 1, 234],
    ['流失預警喚回', 'retention', '{"trigger":"inactive_days","value":30}', '好久不見，{name}！我們想您了。這裡有一個專屬給您的優惠方案，限時 3 天，點擊了解詳情 👉', 'glm-4.5', 'auto', '["line","email"]', 1, 156],
    ['訂單確認通知', 'order_status', '{"status":"paid"}', '✅ 訂單確認！您的訂單 #{order_id} 已成功付款，金額 {amount}。我們將在 1-2 個工作日內為您出貨，敬請期待！', 'glm-4.5-air', 'auto', '["all"]', 1, 1203],
    ['出貨通知', 'order_status', '{"status":"shipped"}', '🚚 您的訂單已出貨！物流單號：{tracking_no}，預計 {delivery_date} 送達。您可以點此追蹤物流狀態。', 'glm-4.5-air', 'auto', '["all"]', 1, 987],
    ['AI 客服 RAG', 'service', '{"trigger":"any_message","fallback":true}', '感謝您的訊息！我正在幫您查詢相關資訊，請稍候...\n\n如果問題較為複雜，我會為您轉接專業客服人員。', 'glm-4.5', 'auto', '["all"]', 1, 3421],
    ['VIP 升級祝賀', 'vip', '{"trigger":"tier_upgrade"}', '🌟 恭喜您升級為 {new_tier} 會員！您現在享有專屬優惠、優先客服和 {points} 點數獎勵。感謝您的支持！', 'glm-4.5', 'auto', '["all"]', 1, 67],
    ['社群健康暖場', 'community', '{"trigger":"community_silent_hours","value":24}', '大家好！今天分享一個實用技巧：{tip_of_day} 💡 有問題隨時在這裡討論！', 'glm-4.5-air', 'auto', '["telegram","discord"]', 0, 23],
    ['活動提醒', 'event', '{"trigger":"event_before_hours","value":24}', '⏰ 提醒：明天的 {event_name} 活動即將開始！時間：{event_time}，地點：{event_location}。期待與您相見！', 'glm-4.5-air', 'auto', '["all"]', 1, 445],
  ].forEach(([name, trigType, cond, template, model, lang, platforms, active, fires]) => {
    run(`INSERT INTO ai_reply_rules (name, trigger_type, trigger_condition, reply_template, model, language, platforms, is_active, fire_count) VALUES (?,?,?,?,?,?,?,?,?)`,
      [name, trigType, cond, template, model, lang, platforms, active, fires]);
  });

  exec(`DELETE FROM orders`);
  exec(`DELETE FROM sqlite_sequence WHERE name='orders'`);
  const orderData = [
    ['shopify', 'SHO-10291', 'Alice Chen', 'alice@techcorp.com', 'delivered',
      JSON.stringify([{name:'GrowthOS Pro 年費', sku:'PRO-Y', qty:1, price:3588}]),
      3588, 0, 0, 3588, 'TWD', '台北市信義區信義路五段7號', 'SF1234567890', '順豐速運', '2026-06-02'],
    ['shopify', 'SHO-10292', 'Bob Martinez', 'bob@startup.io', 'shipped',
      JSON.stringify([{name:'GrowthOS Basic 月費', sku:'BASIC-M', qty:3, price:897}]),
      897, 60, 0, 957, 'TWD', '台北市大安區忠孝東路四段1號', 'BK9876543210', '黑貓宅急便', '2026-06-08'],
    ['amazon', 'AMZ-B08XYZ001', 'Carol Wang', 'carol@agency.co', 'processing',
      JSON.stringify([{name:'Agency Plan', sku:'AGY-M', qty:1, price:1299}]),
      1299, 0, 100, 1199, 'TWD', '高雄市前鎮區中山二路2號', null, null, null],
    ['shopee', 'SPE-240601001', 'David Kim', 'david@ecommerce.com', 'pending',
      JSON.stringify([{name:'Enterprise Plan', sku:'ENT-Y', qty:1, price:10788},{name:'Add-on: SEO Module', sku:'SEO-Y', qty:1, price:1188}]),
      11976, 0, 1200, 10776, 'TWD', '台中市西屯區臺灣大道三段99號', null, null, null],
    ['shopify', 'SHO-10289', 'Emma Davis', 'emma@freelance.net', 'refund_requested',
      JSON.stringify([{name:'GrowthOS Starter', sku:'STR-M', qty:1, price:299}]),
      299, 0, 0, 299, 'TWD', '新北市板橋區縣民大道二段7號', 'BK1111111111', '黑貓宅急便', '2026-05-30'],
    ['tiktok', 'TTK-20260601', 'Frank Liu', 'frank@bigco.com', 'paid',
      JSON.stringify([{name:'GrowthOS Pro 月費', sku:'PRO-M', qty:5, price:1495}]),
      1495, 0, 0, 1495, 'TWD', '台北市中正區忠孝西路一段36號', null, null, null],
  ];
  orderData.forEach(([platform, pid, cname, cemail, status, items, sub, ship, disc, total, curr, addr, track, logis, est]) => {
    run(`INSERT INTO orders (platform, platform_order_id, contact_name, contact_email, status, items_json, subtotal, shipping_fee, discount, total_amount, currency, shipping_address, tracking_number, logistics_provider, estimated_delivery) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [platform, pid, cname, cemail, status, items, sub, ship, disc, total, curr, addr, track, logis, est]);
  });

  exec(`DELETE FROM members`);
  exec(`DELETE FROM sqlite_sequence WHERE name='members'`);
  [
    [1, 'Alice Chen', 'gold', 8500, 35880],
    [2, 'Bob Martinez', 'silver', 3200, 10764],
    [3, 'Carol Wang', 'member', 500, 1199],
    [4, 'David Kim', 'platinum', 15600, 107760],
    [5, 'Emma Davis', 'member', 100, 299],
    [6, 'Frank Liu', 'silver', 2800, 8970],
    [7, 'Grace Park', 'gold', 7200, 28800],
    [10, 'James Wilson', 'silver', 4100, 14388],
  ].forEach(([cid, name, level, points, spend]) => {
    run(`INSERT INTO members (contact_id, contact_name, level, points, total_spend) VALUES (?,?,?,?,?)`,
      [cid, name, level, points, spend]);
  });

  exec(`DELETE FROM campaigns`);
  exec(`DELETE FROM sqlite_sequence WHERE name='campaigns'`);
  [
    ['新用戶 7 天激活序列', 'email_sequence', 'active', 'event_based', '{"trigger":"user_signup"}', 'new_users', 420, 387, 0.72, 0.34, 0.18, 12400, '2026-05-01', null],
    ['流失用戶喚回序列', 'email_sequence', 'active', 'scheduled', '{"trigger":"inactive_30d"}', 'at_risk', 156, 142, 0.48, 0.21, 0.09, 4200, '2026-05-15', null],
    ['VIP 升級恭賀活動', 'push_notification', 'active', 'event_based', '{"trigger":"tier_upgrade"}', 'all_members', 67, 67, 0.91, 0.62, 0.44, 18900, '2026-06-01', null],
    ['雙11 大促行銷活動', 'social_post', 'scheduled', 'scheduled', '{"date":"2026-11-11"}', 'all', 0, 0, 0, 0, 0, 0, '2026-11-11', '2026-11-12'],
    ['老客戶回購提醒', 'sms', 'paused', 'scheduled', '{"trigger":"no_purchase_60d"}', 'loyal', 89, 76, 0.55, 0.28, 0.13, 3100, '2026-04-01', null],
    ['社群暖場周報', 'social_post', 'active', 'scheduled', '{"frequency":"weekly","day":"monday"}', 'community', 12, 12, 0, 0.78, 0.15, 0, '2026-01-01', null],
    ['活動報名確認 + 提醒', 'email_sequence', 'completed', 'event_based', '{"trigger":"event_signup"}', 'event_attendees', 234, 234, 0.89, 0.56, 0.72, 0, '2026-05-20', '2026-05-22'],
  ].forEach(([name, type, status, triggerType, triggerConfig, segment, targetCount, sentCount, openRate, clickRate, convRate, revenue, start, end]) => {
    run(`INSERT INTO campaigns (name, type, status, trigger_type, trigger_config, audience_segment, target_count, sent_count, open_rate, click_rate, conversion_rate, revenue_generated, start_date, end_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [name, type, status, triggerType, triggerConfig, segment, targetCount, sentCount, openRate, clickRate, convRate, revenue, start, end]);
  });

  exec(`DELETE FROM email_sequences`);
  exec(`DELETE FROM sqlite_sequence WHERE name='email_sequences'`);
  [
    [1, 1, '歡迎加入！你的旅程從這裡開始 🎉', '親愛的 {name}，\n\n感謝加入 AI GrowthOS！接下來 7 天，我們會帶你走過所有核心功能...', 0, 0, 1, 387, 279, 131],
    [1, 2, '【Day 2】你的第一個 AI 工作流', '昨天你建立了帳號。今天讓我們來跑第一個 AI 自動化工作流...', 1, 0, 1, 345, 186, 89],
    [1, 3, '【Day 4】看看你的成長數據', '你已經使用 GrowthOS 4 天了！以下是你的成長分析...', 3, 0, 1, 312, 201, 112],
    [1, 4, '【Day 7】完成激活，解鎖進階功能', '恭喜完成第一週！你已解鎖所有進階功能。以下是 3 個最強大的工具...', 6, 0, 1, 289, 155, 69],
    [2, 1, '好久不見，{name}！', '我們想你了。你上次登入距今已 30 天，有什麼我們可以幫忙的嗎？', 0, 0, 1, 142, 68, 30],
    [2, 2, '專屬優惠：限時 48 小時', '因為你是我們的老用戶，這裡有一個專屬優惠等著你...', 3, 0, 1, 98, 41, 13],
    [7, 1, '報名確認：{event_name}', '感謝報名！以下是你的活動資訊...', 0, 0, 1, 234, 208, 169],
    [7, 2, '活動明天開始！ ⏰', '提醒你，{event_name} 明天 {event_time} 開始。請準時參加...', 1, 0, 1, 234, 198, 142],
  ].forEach(([cid, step, subject, content, days, hours, isActive, sent, opens, clicks]) => {
    run(`INSERT INTO email_sequences (campaign_id, step_number, subject, content, delay_days, delay_hours, is_active, sent_count, open_count, click_count) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [cid, step, subject, content, days, hours, isActive, sent, opens, clicks]);
  });

  exec(`DELETE FROM loyalty_transactions`);
  exec(`DELETE FROM sqlite_sequence WHERE name='loyalty_transactions'`);
  [
    [1, 'Alice Chen', 'earn', 500, 8500, '訂單 SHO-10291 消費積分', 'order'],
    [1, 'Alice Chen', 'earn', 200, 8000, 'VIP 生日禮積分', 'birthday'],
    [1, 'Alice Chen', 'redeem', -300, 7800, '兌換折扣券 -NT$150', 'redemption'],
    [4, 'David Kim', 'earn', 1200, 15600, '訂單 SPE-240601001 消費積分', 'order'],
    [4, 'David Kim', 'earn', 500, 14400, 'Platinum 升級獎勵', 'level_upgrade'],
    [2, 'Bob Martinez', 'earn', 200, 3200, '訂單 SHO-10292 消費積分', 'order'],
    [2, 'Bob Martinez', 'earn', 100, 3000, '邀請好友獎勵', 'referral'],
    [7, 'Grace Park', 'earn', 300, 7200, '活動簽到積分', 'event'],
    [7, 'Grace Park', 'redeem', -200, 6900, '兌換免運券', 'redemption'],
    [8, 'James Wilson', 'earn', 150, 4100, '月度活躍獎勵', 'activity'],
  ].forEach(([mid, name, type, delta, balance, desc, source]) => {
    run(`INSERT INTO loyalty_transactions (member_id, contact_name, type, points_delta, balance_after, description, source) VALUES (?,?,?,?,?,?,?)`,
      [mid, name, type, delta, balance, desc, source]);
  });

  exec(`DELETE FROM metrics_snapshots`);
  exec(`DELETE FROM sqlite_sequence WHERE name='metrics_snapshots'`);
  const today = new Date().toISOString().split('T')[0];
  [
    ['revenue', 12500], ['mau', 3420], ['active_agents', 14], ['workflow_runs', 847],
    ['acquisition', 1000], ['activation', 420], ['retention', 280],
    ['revenue_conversions', 156], ['referral', 43],
  ].forEach(([key, val]) => {
    run(`INSERT INTO metrics_snapshots (metric_key, metric_value, snapshot_date) VALUES (?,?,?)`, [key, val, today]);
  });
}

function initDb() {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initTables();
  seedDemoData();
  console.log('[db] SQLite (better-sqlite3 WAL) initialized at', dbPath);
}

module.exports = { initDb, run, get, all, exec, getDb: () => db };
