-- AI GrowthOS Enterprise — D1 schema migration
-- Run with: wrangler d1 execute growthos --file=migrations/0001_initial.sql

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
  model TEXT DEFAULT 'glm-5-turbo',
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
