import os
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

BOT_TOKEN = os.environ.get("BOT_TOKEN")

# Railway variable se Admin ID safely read karo
try:
    ADMIN_ID = int(os.environ.get("USER_ID", "0"))
except ValueError:
    ADMIN_ID = 0
    print("⚠️ ERROR: USER_ID variable mein sirf numbers daalo!")

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# /start command - SABKE LIYE SAME MESSAGE (Bina Admin ID ke)
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    user_id = user.id
    first_name = user.first_name or "Friend"
    username = user.username or "N/A"

    # यहाँ Admin ID का कोई ज़िक्र नहीं है
    welcome_message = (
        f"🌟 *Welcome, {first_name}!* 🌟\n"
        f"Thank you for using this bot.\n"
        f"📌 *Your User ID:* `{user_id}`\n"
        f"📌 *Your Username:* @{username}\n"
        f"🧾 *Main Features:*\n"
        f"• Use /start to see this message\n"
        f"• Admin can send forwarded messages to get original IDs\n"
        f"🤖 *Powered by:* Your Name / Brand"
    )

    await update.message.reply_text(welcome_message, parse_mode="Markdown")

# Admin का खास काम (Forward messages से ID निकालना)
async def admin_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    # अगर यूज़र Admin नहीं है (ID match नहीं हुई), तो बोट चुप रहेगा
    if user.id != ADMIN_ID:
        return

    message = update.message

    # अगर user से forward हुआ है
    if message.forward_from:
        original_user_id = message.forward_from.id
        original_name = message.forward_from.first_name
        await update.message.reply_text(
            f"🔍 *Original User ID:* `{original_user_id}`\n"
            f"👤 *Name:* {original_name}",
            parse_mode="Markdown"
        )
    # अगर channel से forward हुआ है
    elif message.forward_from_chat:
        chat_id = message.forward_from_chat.id
        chat_title = message.forward_from_chat.title or "Channel"
        await update.message.reply_text(
            f"📢 *Channel ID:* `{chat_id}`\n"
            f"🏷️ *Title:* {chat_title}",
            parse_mode="Markdown"
        )
    # अगर forward नहीं है
    else:
        await update.message.reply_text(
            f"👤 *Your User ID:* `{user.id}`\n"
            f"Please forward any message to get its original sender's ID.",
            parse_mode="Markdown"
        )

async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logger.warning("Update '%s' caused error '%s'", update, context.error)

def main():
    application = Application.builder().token(BOT_TOKEN).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.ALL & ~filters.COMMAND, admin_message))
    application.add_error_handler(error_handler)
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
