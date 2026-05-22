#!/usr/bin/env python3
"""
DrGold IA — Bot de Paiement Automatique
Moov Money + Orange Money → Accès canal DrSmart FX
"""

import logging
import asyncio
from datetime import datetime, timedelta
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, CallbackQueryHandler,
    MessageHandler, filters, ContextTypes
)
import json
import os

# ── CONFIG ──────────────────────────────────────────────────────────
BOT_TOKEN     = "8677418887:AAHBQm0LVaHERXj5BxXoE8XmKNzBN2CWt-g"
CANAL_ID      = -1003599366995
ADMIN_ID      = 8172952623

PRIX_MENSUEL  = 5000                       # FCFA
MOOV_NUMBER   = "+22672185894"
OM_NUMBER     = "+22655512355"

# Fichier de stockage des abonnés
SUBSCRIBERS_FILE = "subscribers.json"

# ── LOGGING ─────────────────────────────────────────────────────────
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# ── GESTION ABONNÉS ─────────────────────────────────────────────────
def load_subscribers():
    if os.path.exists(SUBSCRIBERS_FILE):
        with open(SUBSCRIBERS_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_subscribers(data):
    with open(SUBSCRIBERS_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def add_subscriber(user_id, username, expiry_date):
    subs = load_subscribers()
    subs[str(user_id)] = {
        "username": username,
        "expiry": expiry_date.isoformat(),
        "joined": datetime.now().isoformat()
    }
    save_subscribers(subs)

def is_active_subscriber(user_id):
    subs = load_subscribers()
    if str(user_id) not in subs:
        return False
    expiry = datetime.fromisoformat(subs[str(user_id)]["expiry"])
    return datetime.now() < expiry

def get_expiry(user_id):
    subs = load_subscribers()
    if str(user_id) in subs:
        return datetime.fromisoformat(subs[str(user_id)]["expiry"])
    return None

# ── COMMANDES ────────────────────────────────────────────────────────

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    name = user.first_name or "Trader"

    # Vérifier si déjà abonné
    if is_active_subscriber(user.id):
        expiry = get_expiry(user.id)
        await update.message.reply_text(
            f"✅ Bonjour {name} !\n\n"
            f"Tu es déjà abonné à *DrSmart FX*.\n"
            f"📅 Expiration : {expiry.strftime('%d/%m/%Y')}\n\n"
            f"Utilise /dashboard pour accéder au dashboard live.",
            parse_mode='Markdown'
        )
        return

    keyboard = [
        [InlineKeyboardButton("💳 S'abonner — 5 000 FCFA/mois", callback_data="subscribe")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        f"🏆 Bienvenue {name} sur *DrGold IA* !\n\n"
        f"📊 Accède aux signaux de trading en temps réel sur *XAUUSD, EURUSD, US100*\n\n"
        f"✅ Signaux BUY/SELL avec Entry, SL, TP\n"
        f"✅ Dashboard live dans Telegram\n"
        f"✅ Historique des trades\n"
        f"✅ Bilan journalier automatique\n\n"
        f"💰 *Abonnement : 5 000 FCFA/mois*",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def subscribe_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    keyboard = [
        [InlineKeyboardButton("🟡 Moov Money", callback_data="pay_moov")],
        [InlineKeyboardButton("🟠 Orange Money", callback_data="pay_orange")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await query.edit_message_text(
        "💳 *Choisir votre méthode de paiement :*\n\n"
        "💰 Montant : *5 000 FCFA*\n"
        "📅 Durée : *1 mois*",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def pay_moov_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    keyboard = [
        [InlineKeyboardButton("✅ J'ai payé — Envoyer la preuve", callback_data="sent_proof_moov")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await query.edit_message_text(
        "🟡 *Paiement Moov Money*\n\n"
        f"1️⃣ Envoie *5 000 FCFA* au :\n"
        f"📱 `{MOOV_NUMBER}`\n\n"
        f"2️⃣ Motif : *DrSmart FX - {query.from_user.id}*\n\n"
        f"3️⃣ Clique le bouton ci-dessous après paiement",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def pay_orange_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    keyboard = [
        [InlineKeyboardButton("✅ J'ai payé — Envoyer la preuve", callback_data="sent_proof_orange")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await query.edit_message_text(
        "🟠 *Paiement Orange Money*\n\n"
        f"1️⃣ Envoie *5 000 FCFA* au :\n"
        f"📱 `{OM_NUMBER}`\n\n"
        f"2️⃣ Motif : *DrSmart FX - {query.from_user.id}*\n\n"
        f"3️⃣ Clique le bouton ci-dessous après paiement",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def sent_proof_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    method = "Moov Money" if "moov" in query.data else "Orange Money"

    # Stocker méthode en attente
    context.user_data['pending_payment'] = method

    await query.edit_message_text(
        f"📸 *Envoie maintenant la capture d'écran* de ton paiement {method}.\n\n"
        f"Je vais vérifier et activer ton accès.",
        parse_mode='Markdown'
    )

async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    method = context.user_data.get('pending_payment', 'Inconnu')

    # Notifier l'admin
    keyboard = [
        [
            InlineKeyboardButton("✅ Valider", callback_data=f"validate_{user.id}"),
            InlineKeyboardButton("❌ Refuser", callback_data=f"refuse_{user.id}")
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await context.bot.send_photo(
        chat_id=ADMIN_ID,
        photo=update.message.photo[-1].file_id,
        caption=f"💳 *Nouveau paiement à valider*\n\n"
                f"👤 Utilisateur : {user.first_name} (@{user.username or 'N/A'})\n"
                f"🆔 ID : `{user.id}`\n"
                f"💰 Méthode : {method}\n"
                f"💵 Montant : 5 000 FCFA",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

    await update.message.reply_text(
        "⏳ *Preuve reçue !*\n\n"
        "Ton paiement est en cours de vérification.\n"
        "Tu recevras une confirmation dans quelques minutes. 🙏",
        parse_mode='Markdown'
    )

async def validate_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    # Extraire user_id
    user_id = int(query.data.split("_")[1])
    expiry = datetime.now() + timedelta(days=30)

    try:
        # Récupérer infos user
        user_info = await context.bot.get_chat(user_id)
        username = user_info.username or user_info.first_name

        # Ajouter au fichier abonnés
        add_subscriber(user_id, username, expiry)

        # Créer lien d'invitation canal
        invite = await context.bot.create_chat_invite_link(
            chat_id=CANAL_ID,
            member_limit=1,
            expire_date=datetime.now() + timedelta(hours=24)
        )

        # Notifier l'utilisateur
        await context.bot.send_message(
            chat_id=user_id,
            text=f"🎉 *Paiement validé ! Bienvenue dans DrSmart FX !*\n\n"
                 f"✅ Abonnement actif jusqu'au : *{expiry.strftime('%d/%m/%Y')}*\n\n"
                 f"👇 Clique ici pour rejoindre le canal :\n{invite.invite_link}\n\n"
                 f"📊 Dashboard live : /dashboard",
            parse_mode='Markdown'
        )

        # Confirmer à l'admin
        await query.edit_message_caption(
            caption=query.message.caption + f"\n\n✅ *VALIDÉ* — Expire le {expiry.strftime('%d/%m/%Y')}",
            parse_mode='Markdown'
        )

        # Log
        logger.info(f"Abonné ajouté: {user_id} ({username}) jusqu'au {expiry}")

    except Exception as e:
        logger.error(f"Erreur validation: {e}")
        await query.answer(f"Erreur: {e}", show_alert=True)

async def refuse_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    user_id = int(query.data.split("_")[1])

    await context.bot.send_message(
        chat_id=user_id,
        text="❌ *Paiement non confirmé.*\n\n"
             "Nous n'avons pas pu vérifier ton paiement.\n"
             "Contacte-nous ou réessaie avec /start",
        parse_mode='Markdown'
    )
    await query.edit_message_caption(
        caption=query.message.caption + "\n\n❌ *REFUSÉ*",
        parse_mode='Markdown'
    )

async def dashboard(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if not is_active_subscriber(user.id):
        await update.message.reply_text(
            "❌ Tu n'as pas d'abonnement actif.\nUtilise /start pour t'abonner."
        )
        return
    await update.message.reply_text(
        "📊 *Dashboard DrGold IA*\n\n"
        "Ouvre le bot et clique sur le bouton *Menu* en bas à gauche pour accéder au dashboard live !",
        parse_mode='Markdown'
    )

async def stats_admin(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        return
    subs = load_subscribers()
    actifs = sum(1 for s in subs.values()
                 if datetime.now() < datetime.fromisoformat(s["expiry"]))
    total = len(subs)
    revenus = actifs * 5000

    msg = f"📊 *Stats DrSmart FX*\n\n"
    msg += f"👥 Abonnés actifs : *{actifs}*\n"
    msg += f"📋 Total historique : *{total}*\n"
    msg += f"💰 Revenus estimés : *{revenus:,} FCFA/mois*\n\n"

    if subs:
        msg += "*Abonnés actifs :*\n"
        for uid, data in subs.items():
            expiry = datetime.fromisoformat(data["expiry"])
            if datetime.now() < expiry:
                msg += f"• @{data['username']} — expire {expiry.strftime('%d/%m/%Y')}\n"

    await update.message.reply_text(msg, parse_mode='Markdown')

# ── Vérification expiration quotidienne ─────────────────────────────
async def check_expirations(context: ContextTypes.DEFAULT_TYPE):
    subs = load_subscribers()
    for user_id, data in subs.items():
        expiry = datetime.fromisoformat(data["expiry"])
        remaining = (expiry - datetime.now()).days

        # Rappel 3 jours avant
        if remaining == 3:
            try:
                await context.bot.send_message(
                    chat_id=int(user_id),
                    text=f"⚠️ *Ton abonnement DrSmart FX expire dans 3 jours !*\n\n"
                         f"Renouvelle maintenant pour continuer à recevoir les signaux.\n"
                         f"/start",
                    parse_mode='Markdown'
                )
            except:
                pass

        # Expiration
        if remaining < 0:
            try:
                await context.bot.ban_chat_member(
                    chat_id=CANAL_ID,
                    user_id=int(user_id)
                )
                await context.bot.unban_chat_member(
                    chat_id=CANAL_ID,
                    user_id=int(user_id)
                )
                await context.bot.send_message(
                    chat_id=int(user_id),
                    text="❌ *Ton abonnement a expiré.*\n\n"
                         "Renouvelle pour 5 000 FCFA/mois : /start",
                    parse_mode='Markdown'
                )
            except:
                pass

# ── MAIN ─────────────────────────────────────────────────────────────
def main():
    app = Application.builder().token(BOT_TOKEN).build()

    # Handlers
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("dashboard", dashboard))
    app.add_handler(CommandHandler("stats", stats_admin))
    app.add_handler(CallbackQueryHandler(subscribe_callback, pattern="^subscribe$"))
    app.add_handler(CallbackQueryHandler(pay_moov_callback, pattern="^pay_moov$"))
    app.add_handler(CallbackQueryHandler(pay_orange_callback, pattern="^pay_orange$"))
    app.add_handler(CallbackQueryHandler(sent_proof_callback, pattern="^sent_proof_"))
    app.add_handler(CallbackQueryHandler(validate_callback, pattern="^validate_"))
    app.add_handler(CallbackQueryHandler(refuse_callback, pattern="^refuse_"))
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))

    # Vérification expiration toutes les 24h
    app.job_queue.run_repeating(check_expirations, interval=86400, first=10)

    print("✅ DrGold IA Payment Bot — ACTIF")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()
