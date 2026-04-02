import requests
import threading
import logging
from config import Config


def send_discord(title, description, color=0x667eea, fields=None):
    url = Config.DISCORD_WEBHOOK_URL
    if not url:
        return

    embed = {
        "title": title,
        "description": description,
        "color": color,
    }
    if fields:
        embed["fields"] = fields

    def _send():
        try:
            requests.post(url, json={"embeds": [embed]}, timeout=5)
        except Exception as e:
            logging.warning(f"Discord webhook failed: {e}")

    threading.Thread(target=_send, daemon=True).start()
