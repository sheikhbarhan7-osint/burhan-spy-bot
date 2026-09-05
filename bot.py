import os
import asyncio
import time
import logging
from telethon import TelegramClient, events
from telethon.tl.functions.users import GetFullUserRequest

logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                    level=logging.INFO)
logger = logging.getLogger('bot')

API_ID = int(os.environ.get('API_ID'))
API_HASH = os.environ.get('API_HASH')
BOT_TOKEN = os.environ.get('BOT_TOKEN')

client = TelegramClient('bot_session', API_ID, API_HASH)

# ⚡ Sabse safe & advanced detail extractor
async def get_details(entity):
    user = await client.get_entity(entity)
    full = await client(GetFullUserRequest(user))
    
    # Bio nikalne ka bug-free tarika
    bio = None
    if hasattr(full, 'about'):
        bio = full.about
    elif hasattr(full, 'full_user') and hasattr(full.full_user, 'about'):
        bio = full.full_user.about
        
    username = user.username
    first_name = user.first_name or ""
    last_name = user.last_name or ""
    nickname = f"{first_name} {last_name}".strip()
    if not nickname:
        nickname = "No Name"
        
    return user, username, nickname, bio

# 🚀 Premium Welcome Message
@client.on(events.NewMessage(pattern='/start'))
async def start(event):
    text = (
        "🚀 **WELCOME TO THE ULTIMATE ID EXTRACTOR** 🚀\n\n"
        "🔥 **Premium Features Active** 🔥\n"
        "⚡ **Forward any message** → Original sender details\n"
        "💎 **Send any @username** → Auto-detect & extract\n"
        "🧠 **Get User ID, Nickname, Bio Instantly!**\n\n"
        "📸 **How to use:**\n"
        "1️⃣ Forward any message to me\n"
        "2️⃣ Send @username directly\n"
        "3️⃣ Or use /resolve @username\n\n"
        "🌟 **Powered by Telethon MTProto** 🌟"
    )
    await event.reply(text, parse_mode='markdown')

# 🎯 Main Message Handler (Sab kuch ek saath)
@client.on(events.NewMessage)
async def main_handler(event):
    text = event.raw_text
    
    # 1️⃣ FORWARDED MESSAGE HANDLING
    if event.message.forward:
        sender = event.message.forward.sender_id
        if sender:
            try:
                user, username, nickname, bio = await get_details(sender)
                reply = (
                    f"🔫 **FORWARDED SENDER DETAILS** 🔫\n"
                    f"━━━━━━━━━━━━━━━━━━━━━━\n"
                    f"🆔 **User ID:** `{user.id}`\n"
                    f"👤 **Nickname:** {nickname}\n"
                    f"📛 **Username:** @{username if username else 'No Username'}\n"
                )
                if bio:
                    reply += f"📝 **Bio:** {bio}\n"
                reply += f"━━━━━━━━━━━━━━━━━━━━━━\n⚡ *Extracted by Advanced Bot*"
                await event.reply(reply, parse_mode='markdown')
            except Exception as e:
                await event.reply(f"❌ Error: {str(e)}")
        return

    # 2️⃣ /resolve COMMAND
    if text.startswith('/resolve '):
        username = text.replace('/resolve ', '').strip().lstrip('@')
        try:
            user, username, nickname, bio = await get_details(username)
            reply = (
                f"🎯 **USER DETAILS FOUND** 🎯\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"🆔 **User ID:** `{user.id}`\n"
                f"👤 **Nickname:** {nickname}\n"
                f"📛 **Username:** @{username if username else 'N/A'}\n"
            )
            if bio:
                reply += f"📝 **Bio:** {bio}\n"
            reply += f"━━━━━━━━━━━━━━━━━━━━━━\n⚡ *Extracted by Advanced Bot*"
            await event.reply(reply, parse_mode='markdown')
        except Exception as e:
            await event.reply(f"❌ Error: {str(e)}\nMaybe username doesn't exist or is private.")
        return

    # 3️⃣ DIRECT USERNAME (AUTO-DETECT) - Bina command ke
    if text.startswith('@') or (len(text) < 50 and ' ' not in text and not text.startswith('/')):
        username = text.strip().lstrip('@')
        try:
            user, username, nickname, bio = await get_details(username)
            reply = (
                f"🎯 **USER DETAILS FOUND** 🎯\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"🆔 **User ID:** `{user.id}`\n"
                f"👤 **Nickname:** {nickname}\n"
                f"📛 **Username:** @{username if username else 'N/A'}\n"
            )
            if bio:
                reply += f"📝 **Bio:** {bio}\n"
            reply += f"━━━━━━━━━━━━━━━━━━━━━━\n⚡ *Extracted by Advanced Bot*"
            await event.reply(reply, parse_mode='markdown')
        except:
            # Agar username exist nahi karta, toh silent ignore kar
            pass
        return

    # 4️⃣ KOI BHI / COMMAND - Help message
    if text.startswith('/'):
        await event.reply("🔍 Use /resolve @username ya directly @username bhejo, ya forward karo.", parse_mode='markdown')
        return

# ♾️ Never-Die Loop (Crash-proof)
async def main():
    while True:
        try:
            await client.start(bot_token=BOT_TOKEN)
            logger.info("🚀 Premium Bot Started Successfully!")
            await client.run_until_disconnected()
        except Exception as e:
            logger.error(f"💥 Bot crashed: {e}. Restarting in 5 seconds...")
            time.sleep(5)

if __name__ == '__main__':
    asyncio.run(main())
