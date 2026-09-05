import os
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

# Environment variables से token और admin ID लें
BOT_TOKEN = os.environ.get("BOT_TOKEN")
ADMIN_ID = int(os.environ.get("USER_ID"))  # आपकी Telegram user ID

# Logging setup
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# /start command handler
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    user_id = user.id
    first_name = user.first_name or "Friend"
    username = user.username or "N/A"

    # 10-line English Welcome Message
    welcome_message = (
        f"🌟 *Welcome, {first_name}!* 🌟\n"
        f"Thank you for using this bot.\n"
        f"It is designed to fetch your Telegram ID.\n"
        f"📌 *Your User ID:* `{user_id}`\n"
        f"📌 *Your Username:* @{username}\n"
        f"📌 *Admin (Developer) ID:* `{ADMIN_ID}`\n"
        f"🧾 *Main Features:*\n"
        f"• Use /start to see this message\n"
        f"• Admin can send forwarded messages to get original IDs\n"
        f"🤖 *Powered by:* Your Name / Brand"
    )

    await update.message.reply_text(
        welcome_message,
        parse_mode="Markdown"
    )

# Admin के लिए message handler (forward पहचानने के लिए)
async def admin_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    # सिर्फ admin ही यह function चला सकता है
    if user.id != ADMIN_ID:
        return

    message = update.message

    # अगर message forward किया गया है
    if message.forward_from:
        original_user_id = message.forward_from.id
        original_name = message.forward_from.first_name
        await update.message.reply_text(
            f"🔍 *Original User ID:* `{original_user_id}`\n"
            f"👤 *Name:* {original_name}",
            parse_mode="Markdown"
        )
    elif message.forward_from_chat:
        # अगर channel से forward हुआ है
        chat_id = message.forward_from_chat.id
        chat_title = message.forward_from_chat.title or "Channel"
        await update.message.reply_text(
            f"📢 *Channel ID:* `{chat_id}`\n"
            f"🏷️ *Title:* {chat_title}",
            parse_mode="Markdown"
        )
    else:
        # अगर forward नहीं है, तो admin को उनकी खुद की ID बता दें
        await update.message.reply_text(
            f"👤 *Your User ID:* `{user.id}`\n"
            f"Please forward any message to get its original sender's ID.",
            parse_mode="Markdown"
        )

# Error handler
async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logger.warning("Update '%s' caused error '%s'", update, context.error)

def main():
    # Application बनाएं
    application = Application.builder().token(BOT_TOKEN).build()

    # Handlers जोड़ें
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.ALL & ~filters.COMMAND, admin_message))

    # Error handler
    application.add_error_handler(error_handler)

    # Bot चलाएं (polling)
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
