import os
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

# Enable logging
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                    level=logging.INFO)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.environ.get('BOT_TOKEN')  # Set this in Railway environment variables

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Send me a forwarded message, and I'll extract the user's ID.\n\nUse /help for more.")

async def extract_user_id(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.message
    if not msg:
        return
    
    # Check if the message is a forward
    if msg.forward_from:
        original_user = msg.forward_from
        await msg.reply_text(
            f"Forwarded from User ID: {original_user.id}\n"
            f"Username: @{original_user.username if original_user.username else 'No username'}\n"
            f"First Name: {original_user.first_name}"
        )
    elif msg.forward_from_chat:
        original_chat = msg.forward_from_chat
        await msg.reply_text(
            f"Forwarded from Chat ID: {original_chat.id}\n"
            f"Chat Title: {original_chat.title if original_chat.title else 'No title'}"
        )
    elif msg.reply_to_message:
        original = msg.reply_to_message
        if original.from_user:
            await msg.reply_text(
                f"Replied to User ID: {original.from_user.id}\n"
                f"Username: @{original.from_user.username if original.from_user.username else 'No username'}\n"
                f"First Name: {original.from_user.first_name}"
            )
        elif original.forward_from:
            # If the reply is a forwarded message, get that original sender
            forwarded_user = original.forward_from
            await msg.reply_text(
                f"Reply to forwarded message – Original User ID: {forwarded_user.id}\n"
                f"Username: @{forwarded_user.username if forwarded_user.username else 'No username'}"
            )
        else:
            await msg.reply_text("Cannot extract any user ID from this reply.")
    else:
        await msg.reply_text("No forward/reply detected. Send a message that was forwarded or reply to a message.")

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Commands:\n"
        "/start - Start the bot\n"
        "/help - Show this help\n\n"
        "Just forward any message to me, and I'll extract the user ID.\n"
        "Or reply to a message and I'll extract the original sender's ID."
    )

def main():
    if not BOT_TOKEN:
        logger.error("BOT_TOKEN environment variable not set!")
        return

    application = Application.builder().token(BOT_TOKEN).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(MessageHandler(filters.ALL, extract_user_id))

    logger.info("Bot is running...")
    application.run_polling()

if __name__ == '__main__':
    main()
