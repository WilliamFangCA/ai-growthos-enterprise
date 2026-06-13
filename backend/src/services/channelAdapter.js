// 渠道適配器：所有「發送」動作的唯一出口。
// 目前為模擬模式 —— 完整記錄發送內容但不真正送出；
// 之後要切換真實發送，只需在此檔對應渠道實作 send（讀取 Settings 金鑰），呼叫端不必改動。

const SIMULATED_CHANNELS = ['line', 'whatsapp', 'telegram', 'email', 'sms', 'push', 'messenger', 'webhook'];

async function send({ channel, recipient, content, meta = {} }) {
  const ch = SIMULATED_CHANNELS.includes(channel) ? channel : 'line';
  // ── 真實發送掛載點 ──
  // if (ch === 'line' && process.env.LINE_CHANNEL_ACCESS_TOKEN) { ...真實呼叫 LINE Messaging API... }
  return {
    status: 'simulated',
    channel: ch,
    recipient: recipient || 'unknown',
    contentPreview: String(content || '').slice(0, 500),
    meta,
    simulatedAt: new Date().toISOString(),
  };
}

// 活動類型 → 發送渠道
function campaignTypeToChannel(type) {
  switch (type) {
    case 'email_sequence':     return 'email';
    case 'sms':                return 'sms';
    case 'push_notification':  return 'push';
    case 'line_message':       return 'line';
    case 'social_post':        return 'push';
    default:                   return 'line';
  }
}

module.exports = { send, campaignTypeToChannel };
