const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: false });
const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
    console.log("📥 Webhook hit");
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "✅ Bot is working! (Test)");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server on port ${PORT}`);
});
