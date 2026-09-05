import os
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

BOT_TOKEN = os.environ.get("BOT_TOKEN")

# Railway variable se Admin ID safe read karo (बस start को अलग पहचानने के लिए, अब बाकी फीचर सबके लिए है)
try:
    ADMIN_ID = int(os.environ.get("USER_ID", "0"))
except ValueError:
    ADMIN_ID = 0

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# /start command - सबके लिए सिर्फ अपनी ID दिखेगी
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    user_id = user.id
    first_name = user.first_name or "Friend"
    username = user.username or "N/A"

    welcome_message = (
        f"🌟 *Welcome, {first_name}!* 🌟\n"
        f"Thank you for using this bot.\n"
        f"📌 *Your User ID:* `{user_id}`\n"
        f"📌 *Your Username:* @{username}\n"
        f"🧾 *Main Features:*\n"
        f"• Forward any user's message to get their User ID, Name, Username & Bio\n"
        f"🤖 *Powered by:* Your Name / Brand"
    )

    await update.message.reply_text(welcome_message, parse_mode="Markdown")

# अब ये function सबके लिए है (कोई Admin check नहीं)
async def get_user_info(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message

    # अगर किसी यूज़र का message forward किया गया है
    if message.forward_from:
        original_user_id = message.forward_from.id
        original_name = message.forward_from.first_name
        username = message.forward_from.username or "N/A"

        # Bio निकालने की कोशिश करें
        bio = "N/A"
        try:
            chat_info = await context.bot.get_chat(original_user_id)
            if chat_info.bio:
                bio = chat_info.bio
        except Exception:
            pass  # अगर bio नहीं मिल पाता तो N/A ही रहेगा

        reply_text = (
            f"🔍 *Original User ID:* `{original_user_id}`\n"
            f"👤 *Name (Nickname):* {original_name}\n"
            f"📌 *Username:* @{username}\n"
            f"📝 *Bio:* {bio}"
        )
        await update.message.reply_text(reply_text, parse_mode="Markdown")

    # अगर किसी Channel का message forward किया गया है
    elif message.forward_from_chat:
        chat_id = message.forward_from_chat.id
        chat_title = message.forward_from_chat.title or "Channel"
        await update.message.reply_text(
            f"📢 *Channel ID:* `{chat_id}`\n"
            f"🏷️ *Title:* {chat_title}",
            parse_mode="Markdown"
        )
    
    # अगर किसी ने बिना forward किए सीधा मैसेज भेजा है
    else:
        user = update.effective_user
        await update.message.reply_text(
            f"👤 *Your User ID:* `{user.id}`\n"
            f"❌ *Note:* कृपया किसी दूसरे बंदे का मैसेज forward करके भेजो, ताकि उसकी ID, नाम और Bio निकाल सकूं।",
            parse_mode="Markdown"
        )

async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logger.warning("Update '%s' caused error '%s'", update, context.error)

def main():
    application = Application.builder().token(BOT_TOKEN).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.ALL & ~filters.COMMAND, get_user_info))
    application.add_error_handler(error_handler)
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
