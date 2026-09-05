import os
import asyncio
from telethon import TelegramClient, events
from telethon.tl.functions.users import GetFullUserRequest

# Get these from https://my.telegram.org (API_ID, API_HASH)
API_ID = int(os.environ.get('API_ID'))       # Set in Railway
API_HASH = os.environ.get('API_HASH')        # Set in Railway
BOT_TOKEN = os.environ.get('BOT_TOKEN')      # Bot token from @BotFather

client = TelegramClient('bot_session', API_ID, API_HASH).start(bot_token=BOT_TOKEN)

# Helper: extract user info from a User object
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
        "Just forward any message to me, and I'll extract the original sender's ID.\n"
        "Or reply to a message and I'll extract the original sender's ID."
    )

@client.on(events.NewMessage(pattern='/resolve (.+)'))
async def resolve_username(event):
    username = event.pattern_match.group(1).strip()
    if username.startswith('@'):
        username = username[1:]
    try:
        user = await client.get_entity(username)
        reply = user_info(user)
        # Try to get full user (includes bio, phone if allowed)
        full = await client(GetFullUserRequest(user))
        if full.about:
            reply += f"\nBio: {full.about}"
        if user.phone:
            reply += f"\nPhone: +{user.phone}"
        await event.reply(reply)
    except Exception as e:
        await event.reply(f"Error: {str(e)}\nMaybe that username doesn't exist or is private.")

# Handle any message that is forwarded or has a reply
@client.on(events.NewMessage)
async def extract_forward(event):
    if event.message.forward:
        # If it's a forwarded message
        if event.message.forward.from_id:
            # Can get the original sender
            try:
                user = await client.get_entity(event.message.forward.from_id)
                await event.reply("Forwarded message details:\n" + user_info(user))
            except:
                await event.reply("Forwarded message, but cannot extract user info.")
        elif event.message.forward.chat_id:
            # Forwarded from a channel
            chat = await client.get_entity(event.message.forward.chat_id)
            await event.reply(f"Forwarded from channel:\nChat ID: {chat.id}\nTitle: {chat.title}")
        else:
            await event.reply("Forwarded message but no ID available.")
    elif event.message.reply_to:
        # If it's a reply
        reply_msg = await event.message.get_reply_message()
        if reply_msg and reply_msg.sender_id:
            user = await client.get_entity(reply_msg.sender_id)
            await event.reply("Replied to user details:\n" + user_info(user))
        else:
            await event.reply("Replied to a message but sender not found.")
    # Ignore other messages (like commands)

async def main():
    await client.start()
    await client.run_until_disconnected()

if __name__ == '__main__':
    asyncio.run(main())
