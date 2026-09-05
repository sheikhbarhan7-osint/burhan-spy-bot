import os
import asyncio
import time
import logging
from telethon import TelegramClient, events
from telethon.tl.functions.users import GetFullUserRequest
from telethon.tl.types import PeerUser, PeerChannel

logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                    level=logging.INFO)
logger = logging.getLogger('bot')

API_ID = int(os.environ.get('API_ID'))
API_HASH = os.environ.get('API_HASH')
BOT_TOKEN = os.environ.get('BOT_TOKEN')

client = TelegramClient('bot_session', API_ID, API_HASH)

# 🧠 Universal detail extractor (User ya Channel dono handle karta hai)
async def get_user_details(entity):
    """
    entity -> Username string, User ID integer, or Peer object
    Returns: (type, id, name, username, bio)
    """
    user = await client.get_entity(entity)
    full = await client(GetFullUserRequest(user))
    
    # Safe bio extraction (fixes 'UserFull has no attribute about')
    bio = None
    if hasattr(full, 'about'):
        bio = full.about
    elif hasattr(full, 'full_user') and hasattr(full.full_user, 'about'):
        bio = full.full_user.about

    if isinstance(user, PeerChannel) or hasattr(user, 'title'):
        # Channel
        return {
            'type': 'channel',
            'id': user.id,
            'name': user.title,
            'username': user.username,
            'bio': bio
        }
    else:
        # User
        nickname = f"{user.first_name or ''} {user.last_name or ''}".strip()
        if not nickname:
            nickname = "No Name"
        return {
            'type': 'user',
            'id': user.id,
            'name': nickname,
            'username': user.username,
            'bio': bio
        }

# 🎉 Premium Welcome Message
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

# 🎯 Main Handler – sab kuch yahan handle hota hai
@client.on(events.NewMessage)
async def main_handler(event):
    text = event.raw_text

    # 1️⃣ FORWARDED MESSAGE HANDLING (FIXED!)
    if event.message.forward:
        fwd = event.message.forward
        if fwd.from_id:
            # fwd.from_id is the original sender (User or Channel)
            try:
                details = await get_user_details(fwd.from_id)
                if details['type'] == 'user':
                    reply = (
                        f"🔫 **FORWARDED USER DETAILS** 🔫\n"
                        f"━━━━━━━━━━━━━━━━━━━━━━\n"
                        f"🆔 **User ID:** `{details['id']}`\n"
                        f"👤 **Nickname:** {details['name']}\n"
                        f"📛 **Username:** @{details['username'] if details['username'] else 'No Username'}\n"
                    )
                    if details['bio']:
                        reply += f"📝 **Bio:** {details['bio']}\n"
                    reply += f"━━━━━━━━━━━━━━━━━━━━━━\n⚡ *Extracted by Advanced Bot*"
                else:
                    reply = (
                        f"📢 **FORWARDED CHANNEL DETAILS** 📢\n"
                        f"━━━━━━━━━━━━━━━━━━━━━━\n"
                        f"🆔 **Channel ID:** `{details['id']}`\n"
                        f"📛 **Channel Name:** {details['name']}\n"
                        f"🔗 **Username:** @{details['username'] if details['username'] else 'N/A'}\n"
                    )
                    if details['bio']:
                        reply += f"📝 **Description:** {details['bio']}\n"
                    reply += f"━━━━━━━━━━━━━━━━━━━━━━\n⚡ *Extracted by Advanced Bot*"
                await event.reply(reply, parse_mode='markdown')
            except Exception as e:
                await event.reply(f"❌ Error: {str(e)}")
        else:
            await event.reply("❌ Is forward message se original sender nahi mila.")
        return

    # 2️⃣ /resolve COMMAND
    if text.startswith('/resolve '):
        username = text.replace('/resolve ', '').strip().lstrip('@')
        try:
            details = await get_user_details(username)
            if details['type'] == 'user':
                reply = (
                    f"🎯 **USER DETAILS FOUND** 🎯\n"
                    f"━━━━━━━━━━━━━━━━━━━━━━\n"
                    f"🆔 **User ID:** `{details['id']}`\n"
                    f"👤 **Nickname:** {details['name']}\n"
                    f"📛 **Username:** @{details['username'] if details['username'] else 'N/A'}\n"
                )
                if details['bio']:
                    reply += f"📝 **Bio:** {details['bio']}\n"
                reply += f"━━━━━━━━━━━━━━━━━━━━━━\n⚡ *Extracted by Advanced Bot*"
            else:
                reply = (
                    f"📢 **CHANNEL DETAILS** 📢\n"
                    f"━━━━━━━━━━━━━━━━━━━━━━\n"
                    f"🆔 **Channel ID:** `{details['id']}`\n"
                    f"📛 **Channel Name:** {details['name']}\n"
                    f"🔗 **Username:** @{details['username'] if details['username'] else 'N/A'}\n"
                )
                if details['bio']:
                    reply += f"📝 **Description:** {details['bio']}\n"
                reply += f"━━━━━━━━━━━━━━━━━━━━━━\n⚡ *Extracted by Advanced Bot*"
            await event.reply(reply, parse_mode='markdown')
        except Exception as e:
            await event.reply(f"❌ Error: {str(e)}\nMaybe username doesn't exist or is private.")
        return

    # 3️⃣ DIRECT USERNAME AUTO-DETECT (bina command ke)
    if text.startswith('@') or (len(text) < 50 and ' ' not in text and not text.startswith('/')):
        username = text.strip().lstrip('@')
        try:
            details = await get_user_details(username)
            if details['type'] == 'user':
                reply = (
                    f"🎯 **USER DETAILS FOUND** 🎯\n"
                    f"━━━━━━━━━━━━━━━━━━━━━━\n"
                    f"🆔 **User ID:** `{details['id']}`\n"
                    f"👤 **Nickname:** {details['name']}\n"
                    f"📛 **Username:** @{details['username'] if details['username'] else 'N/A'}\n"
                )
                if details['bio']:
                    reply += f"📝 **Bio:** {details['bio']}\n"
                reply += f"━━━━━━━━━━━━━━━━━━━━━━\n⚡ *Extracted by Advanced Bot*"
            else:
                reply = (
                    f"📢 **CHANNEL DETAILS** 📢\n"
                    f"━━━━━━━━━━━━━━━━━━━━━━\n"
                    f"🆔 **Channel ID:** `{details['id']}`\n"
                    f"📛 **Channel Name:** {details['name']}\n"
                    f"🔗 **Username:** @{details['username'] if details['username'] else 'N/A'}\n"
                )
                if details['bio']:
                    reply += f"📝 **Description:** {details['bio']}\n"
                reply += f"━━━━━━━━━━━━━━━━━━━━━━\n⚡ *Extracted by Advanced Bot*"
            await event.reply(reply, parse_mode='markdown')
        except:
            # Agar username invalid hai, silently ignore
            pass
        return

    # 4️⃣ Kisi aur command ke liye help
    if text.startswith('/'):
        await event.reply("🔍 Use /resolve @username ya directly @username bhejo, ya forward karo.", parse_mode='markdown')
        return

# ♾️ Crash-Proof Restart Loop
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
