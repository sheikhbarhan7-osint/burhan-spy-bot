import os
import asyncio
from telethon import TelegramClient, events
from telethon.tl.functions.users import GetFullUserRequest

# Get these from https://my.telegram.org (API_ID, API_HASH)
API_ID = int(os.environ.get('API_ID'))       # Set in Railway
API_HASH = os.environ.get('API_HASH')        # Set in Railway
BOT_TOKEN = os.environ.get('BOT_TOKEN')      # Bot token from @BotFather

client = TelegramClient('bot_session', API_ID, API_HASH).start(bot_token=BOT_TOKEN)

@client.on(events.NewMessage(pattern='/resolve (.*)'))
async def resolve_user(event):
    username = event.pattern_match.group(1).strip()
    # Remove @ if present
    if username.startswith('@'):
        username = username[1:]
    
    try:
        # Resolve username to User object
        user = await client.get_entity(username)
        # Get full user info (includes about, phone if allowed)
        full = await client(GetFullUserRequest(user))
        
        reply = f"Username: @{username}\n"
        reply += f"User ID: {user.id}\n"
        reply += f"First Name: {user.first_name}\n"
        reply += f"Last Name: {user.last_name if user.last_name else 'N/A'}\n"
        reply += f"Bot: {user.bot}\n"
        if full.about:
            reply += f"Bio: {full.about}\n"
        # If user is a contact, we can get phone, but usually not; attempt anyway
        if user.phone:
            reply += f"Phone: +{user.phone}\n"
        
        await event.reply(reply)
    except Exception as e:
        await event.reply(f"Error: {str(e)}\nMaybe that username doesn't exist or is private.")

@client.on(events.NewMessage(pattern='/start'))
async def start(event):
    await event.reply("Send /resolve @username to get the user ID of any public username.")

@client.on(events.NewMessage(pattern='/help'))
async def help(event):
    await event.reply("Usage: /resolve @username\nExample: /resolve @someuser")

async def main():
    await client.start()
    await client.run_until_disconnected()

if __name__ == '__main__':
    asyncio.run(main())
