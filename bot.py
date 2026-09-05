import os
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

BOT_TOKEN = os.environ.get("BOT_TOKEN")

try:
    ADMIN_ID = int(os.environ.get("USER_ID", "0"))
except ValueError:
    ADMIN_ID = 0

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# /start command
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
        f"• Forward any user's message to get their ID, Name, Username & Bio\n"
        f"🤖 *Powered by:* Your Name / Brand"
    )
    await update.message.reply_text(welcome_message, parse_mode="Markdown")

# नया और सबसे सटीक फीचर (सबके लिए)
async def get_user_info(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message

    # सबसे पहले नया Telegram API (forward_origin) चेक करते हैं
    if message.forward_origin:
        origin = message.forward_origin
        
        # 1. अगर असली यूज़र का मैसेज है (सबसे कॉमन केस)
        if origin.type == "user":
            original_user = origin.sender_user
            original_user_id = original_user.id
            original_name = original_user.first_name or "N/A"
            username = original_user.username or "N/A"
            
            # Bio निकालने की कोशिश
            bio = "N/A"
            try:
                chat_info = await context.bot.get_chat(original_user_id)
                if chat_info.bio:
                    bio = chat_info.bio
            except:
                pass

            await update.message.reply_text(
                f"🔍 *Original User ID:* `{original_user_id}`\n"
                f"👤 *Name (Nickname):* {original_name}\n"
                f"📌 *Username:* @{username}\n"
                f"📝 *Bio:* {bio}",
                parse_mode="Markdown"
            )

        # 2. अगर चैनल/ग्रुप से फॉरवर्ड किया है
        elif origin.type == "chat":
            original_chat = origin.sender_chat
            chat_id = original_chat.id
            chat_title = original_chat.title or "Chat"
            await update.message.reply_text(
                f"📢 *Original Chat/Group ID:* `{chat_id}`\n"
                f"🏷️ *Title:* {chat_title}",
                parse_mode="Markdown"
            )

        # 3. अगर सामने वाले ने ID छुपाई हुई है (Anonymity On)
        elif origin.type == "hidden_user":
            await update.message.reply_text(
                f"🙈 *Original User* ने अपनी ID छुपा रखी है!\n"
                f"👤 *Hidden Name:* {origin.sender_user_name}\n"
                f"⚠️ इसकी ID निकालना संभव नहीं है।",
                parse_mode="Markdown"
            )
        return

    # पुराने API से फॉलबैक चेक (पुराने बोट्स के लिए)
    if message.forward_from:
        original_user_id = message.forward_from.id
        original_name = message.forward_from.first_name or "N/A"
        username = message.forward_from.username or "N/A"
        bio = "N/A"
        try:
            chat_info = await context.bot.get_chat(original_user_id)
            if chat_info.bio:
                bio = chat_info.bio
        except:
            pass

        await update.message.reply_text(
            f"🔍 *Original User ID:* `{original_user_id}`\n"
            f"👤 *Name (Nickname):* {original_name}\n"
            f"📌 *Username:* @{username}\n"
            f"📝 *Bio:* {bio}",
            parse_mode="Markdown"
        )
        return

    if message.forward_from_chat:
        chat_id = message.forward_from_chat.id
        chat_title = message.forward_from_chat.title or "Chat"
        await update.message.reply_text(
            f"📢 *Channel/Group ID:* `{chat_id}`\n"
            f"🏷️ *Title:* {chat_title}",
            parse_mode="Markdown"
        )
        return

    # अगर कुछ भी नहीं मिला (बिना फॉरवर्ड किए मैसेज भेजा है)
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
