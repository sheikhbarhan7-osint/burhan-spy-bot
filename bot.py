import os
import asyncio
import time
import logging
from telethon import TelegramClient, events
from telethon.tl.functions.users import GetFullUserRequest

# Setup logging
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                    level=logging.INFO)
logger = logging.getLogger('bot')

# Get credentials from Railway environment
API_ID = int(os.environ.get('API_ID'))
API_HASH = os.environ.get('API_HASH')
BOT_TOKEN = os.environ.get('BOT_TOKEN')

# Create client (session file will be in memory or tmp, Railway handles it)
client = TelegramClient('bot_session', API_ID, API_HASH)

def user_info(user):
    return (f"User ID: {user.id}\n"
            f"Username: @{user.username if user.username else 'No username'}\n"
            f"First Name: {user.first_name}\n"
            f"Last Name: {user.last_name if user.last_name else 'N/A'}\n"
            f"Bot: {user.bot}")

@client.on(events.NewMessage(pattern='/start'))
async def start(event):
    await event.reply("I'm your ID extractor bot. Send a forwarded message or use /resolve @username.")

@client.on(events.NewMessage(pattern='/help'))
async def help(event):
    await event.reply(
        "Commands:\n"
        "/resolve @username – Get user ID from a public username\n"
        "/start – Start the bot\n"
        "/help – Show this help\n\n"
        "Just forward any message to me, and I'll extract the original sender's ID."
    )

@client.on(events.NewMessage(pattern='/resolve (.+)'))
async def resolve_username(event):
    username = event.pattern_match.group(1).strip()
    if username.startswith('@'):
        username = username[1:]
    try:
        user = await client.get_entity(username)
        reply = user_info(user)
        full = await client(GetFullUserRequest(user))
        if full.about:
            reply += f"\nBio: {full.about}"
        if user.phone:
            reply += f"\nPhone: +{user.phone}"
        await event.reply(reply)
    except Exception as e:
        await event.reply(f"Error: {str(e)}\nMaybe that username doesn't exist or is private.")

@client.on(events.NewMessage)
async def extract_forward(event):
    if event.message.forward:
        if event.message.forward.from_id:
            try:
                user = await client.get_entity(event.message.forward.from_id)
                await event.reply("Forwarded message details:\n" + user_info(user))
            except:
                await event.reply("Forwarded message, but cannot extract user info.")
        elif event.message.forward.chat_id:
            chat = await client.get_entity(event.message.forward.chat_id)
            await event.reply(f"Forwarded from channel:\nChat ID: {chat.id}\nTitle: {chat.title}")
        else:
            await event.reply("Forwarded message but no ID available.")
    elif event.message.reply_to:
        reply_msg = await event.message.get_reply_message()
        if reply_msg and reply_msg.sender_id:
            user = await client.get_entity(reply_msg.sender_id)
            await event.reply("Replied to user details:\n" + user_info(user))
        else:
            await event.reply("Replied to a message but sender not found.")

async def main():
    try:
        # Connect and start the bot
        await client.start(bot_token=BOT_TOKEN)
        logger.info("Bot started successfully. Listening for messages...")
        await client.run_until_disconnected()
    except Exception as e:
        logger.error(f"Error in main: {e}")
    finally:
        await client.disconnect()

if __name__ == '__main__':
    # Infinite loop to restart if it crashes
    while True:
        try:
            asyncio.run(main())
        except Exception as e:
            logger.error(f"Bot crashed: {e}. Restarting in 5 seconds...")
            time.sleep(5)
