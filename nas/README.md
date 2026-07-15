# Valleblond Monitor sur le NAS

Le script `valleblond_monitor.py` reçoit les boutons Telegram des demandes de
livraison locale et vérifie que le site reste accessible toutes les cinq
minutes. Il n'utilise aucune dépendance Python externe.

## Installation sur ton Synology

1. Créer le dossier `Documents/Bots Telegram/Valleblond`.
2. Y copier `valleblond_monitor.py` et `valleblond_config.example.json`.
3. Renommer la copie de configuration en `valleblond_config.json`.
4. Ouvrir ce fichier et remplir les trois premières valeurs. Il reste
   uniquement sur le NAS : ne jamais l'envoyer sur GitHub ni ici.

Le bot est alors autonome et compatible avec ton organisation actuelle :
le watchdog peut surveiller son processus, comme tes autres bots Python.

## Vérification sans commande

Dans le Studio, ouvrir `Alertes` puis cliquer sur `Tester le bot Telegram`.
Le message reçu contient le bouton `Tester le bot NAS`. Une fois ce bouton
pressé, le NAS répond par une confirmation. Ce test ne crée jamais de client,
commande, paiement ou écriture comptable.

## Variables nécessaires

Dans `valleblond_config.json`, définir :

- `telegram_bot_token` : jeton du bot créé avec BotFather.
- `telegram_chat_id` : identifiant numérique du compte Telegram autorisé.
- `nas_monitor_api_key` : même secret long et aléatoire que dans Netlify.
- `site_url` : facultatif, par défaut `https://vlbphotography.netlify.app/`.
- `health_interval_seconds` : facultatif, par défaut `300`.

## Démarrage manuel

```sh
python3 valleblond_monitor.py
```

Le processus doit rester lancé en permanence. Dans ta tâche de démarrage
Synology, il faudra ajouter cette ligne complète :

```sh
nohup python3 "/volume1/homes/valentin/Documents/Bots Telegram/Valleblond/valleblond_monitor.py" > /dev/null 2>&1 &
```

Dans `watchdog.py`, ajouter aussi cette entrée dans le dictionnaire `BOTS` :

```python
"📷 Valleblond": "/volume1/homes/valentin/Documents/Bots Telegram/Valleblond/valleblond_monitor.py",
```

## Variable Netlify supplémentaire

Créer `NAS_MONITOR_API_KEY` dans les variables d'environnement Netlify, avec
exactement la même valeur que dans le fichier du NAS. Cette clé permet
uniquement les transitions autorisées des demandes de livraison locale ; elle
ne donne jamais accès à Supabase ni au Studio.
