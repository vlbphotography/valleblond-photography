# Valleblond Monitor sur le NAS

Le script `valleblond_monitor.py` reçoit les boutons Telegram des demandes de
livraison locale et vérifie que le site reste accessible toutes les cinq
minutes. Il n'utilise aucune dépendance Python externe.

## Variables nécessaires

Définir ces variables dans le service Python du NAS, jamais dans le code :

- `TELEGRAM_BOT_TOKEN` : jeton du bot créé avec BotFather.
- `TELEGRAM_CHAT_ID` : identifiant numérique du compte Telegram autorisé.
- `NAS_MONITOR_API_KEY` : même secret long et aléatoire que dans Netlify.
- `VALLEBLOND_SITE_URL` : facultatif, par défaut `https://vlbphotography.netlify.app/`.
- `VALLEBLOND_HEALTH_INTERVAL_SECONDS` : facultatif, par défaut `300`.

## Démarrage manuel

```sh
python3 valleblond_monitor.py
```

Le processus doit rester lancé en permanence. Sur un NAS, le plus robuste est
de le déclarer comme tâche de démarrage ou service Docker/Python déjà utilisé
pour les autres bots Telegram.

## Variable Netlify supplémentaire

Créer `NAS_MONITOR_API_KEY` dans les variables d'environnement Netlify, avec
exactement la même valeur que sur le NAS. Cette clé permet uniquement les
transitions autorisées des demandes de livraison locale ; elle ne donne jamais
accès à Supabase ni au Studio.
