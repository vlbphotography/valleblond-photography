#!/usr/bin/env python3
"""Valleblond Monitor — bot Telegram pour NAS.

Pré-requis : Python 3.9+ et les quatre variables d'environnement décrites
dans nas/README.md. Le script utilise uniquement la bibliothèque standard.
"""

import json
import logging
import os
import time
import urllib.error
import urllib.request

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")
MONITOR_KEY = os.environ.get("NAS_MONITOR_API_KEY", "")
SITE_URL = os.environ.get("VALLEBLOND_SITE_URL", "https://vlbphotography.netlify.app/")
ACTION_URL = os.environ.get("VALLEBLOND_ACTION_URL", "https://vlbphotography.netlify.app/.netlify/functions/telegram-local-delivery-action")
HEALTH_INTERVAL_SECONDS = int(os.environ.get("VALLEBLOND_HEALTH_INTERVAL_SECONDS", "300"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def require_configuration():
    missing = [name for name, value in {
        "TELEGRAM_BOT_TOKEN": BOT_TOKEN,
        "TELEGRAM_CHAT_ID": CHAT_ID,
        "NAS_MONITOR_API_KEY": MONITOR_KEY,
    }.items() if not value]
    if missing:
        raise RuntimeError(f"Variables manquantes : {', '.join(missing)}")


def telegram(method, payload=None):
    data = json.dumps(payload or {}).encode("utf-8")
    request = urllib.request.Request(
        f"https://api.telegram.org/bot{BOT_TOKEN}/{method}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=35) as response:
        result = json.load(response)
    if not result.get("ok"):
        raise RuntimeError(f"Telegram : {result}")
    return result.get("result")


def send(text, reply_markup=None):
    payload = {"chat_id": CHAT_ID, "text": text, "disable_web_page_preview": True}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    return telegram("sendMessage", payload)


def answer_callback(callback_id, text):
    telegram("answerCallbackQuery", {"callback_query_id": callback_id, "text": text, "show_alert": False})


def action_label(status):
    return {
        "approved": "✅ Zone validée — paiement à la remise.",
        "rejected": "❌ Demande refusée.",
        "paid_in_person": "💶 Paiement en main propre enregistré.",
        "delivered": "📦 Livraison marquée comme effectuée.",
    }.get(status, "✅ Action enregistrée.")


def next_action_keyboard(request_id, status):
    """Propose uniquement l'étape locale qui peut suivre l'action validée."""
    actions = {
        "approved": ("💶 Paiement remis reçu", "mark_paid_in_person"),
        "paid_in_person": ("📦 Marquer comme livrée", "mark_delivered"),
    }
    next_action = actions.get(status)
    if not next_action:
        return None

    label, action = next_action
    return {"inline_keyboard": [[
        {"text": label, "callback_data": f"local:{request_id}:{action}"}
    ]]}


def process_callback(callback):
    message = callback.get("message", {})
    if str(message.get("chat", {}).get("id", "")) != str(CHAT_ID):
        logging.warning("Callback Telegram ignoré : discussion non autorisée.")
        return

    payload = callback.get("data", "")
    parts = payload.split(":")
    if len(parts) != 3 or parts[0] != "local":
        answer_callback(callback["id"], "Commande inconnue.")
        return

    request_id, action = parts[1], parts[2]
    body = json.dumps({"requestId": request_id, "action": action}).encode("utf-8")
    request = urllib.request.Request(
        ACTION_URL,
        data=body,
        headers={"Content-Type": "application/json", "x-valleblond-monitor-key": MONITOR_KEY},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            result = json.load(response)
        if not result.get("success"):
            raise RuntimeError(result.get("error", "Action refusée."))
        status = result.get("status")
        label = action_label(status)
        answer_callback(callback["id"], label)
        send(label, next_action_keyboard(request_id, status))
    except (urllib.error.URLError, urllib.error.HTTPError, RuntimeError, ValueError) as error:
        logging.exception("Action Telegram impossible")
        answer_callback(callback["id"], f"Erreur : {error}")


def check_site(previous_state):
    try:
        request = urllib.request.Request(SITE_URL, method="HEAD")
        with urllib.request.urlopen(request, timeout=20) as response:
            healthy = 200 <= response.status < 400
    except (urllib.error.URLError, urllib.error.HTTPError):
        healthy = False

    if healthy != previous_state:
        send("✅ Valleblond est de nouveau accessible." if healthy else "⚠️ Valleblond semble indisponible. Vérifie Netlify et Supabase.")
    return healthy


def main():
    require_configuration()
    logging.info("Valleblond Monitor démarré.")
    offset = None
    last_health_check = 0
    site_healthy = True

    while True:
        now = time.monotonic()
        if now - last_health_check >= HEALTH_INTERVAL_SECONDS:
            site_healthy = check_site(site_healthy)
            last_health_check = now

        try:
            updates = telegram("getUpdates", {"offset": offset, "timeout": 25, "allowed_updates": ["callback_query"]})
            for update in updates:
                offset = update["update_id"] + 1
                if "callback_query" in update:
                    process_callback(update["callback_query"])
        except (urllib.error.URLError, urllib.error.HTTPError, RuntimeError, ValueError):
            logging.exception("Boucle Telegram interrompue ; nouvelle tentative dans 10 secondes.")
            time.sleep(10)


if __name__ == "__main__":
    main()
