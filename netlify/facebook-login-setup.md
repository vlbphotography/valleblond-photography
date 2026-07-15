# Connexion Facebook pour la synchronisation Instagram

Le Studio utilise Facebook Login pour lire exclusivement les publications du compte Instagram professionnel lié à la Page Facebook de Valleblond.

## Variables Netlify

Dans **Netlify > Project configuration > Environment variables**, ajoute :

- `FACEBOOK_APP_ID` : l’identifiant de l’application Meta principale « Site ».
- `FACEBOOK_APP_SECRET` : la clé secrète de cette même application « Site ».

Ne modifie pas les variables `INSTAGRAM_APP_ID` et `INSTAGRAM_APP_SECRET` : elles peuvent être conservées, mais ne sont plus utilisées par la synchronisation.

## Redirection Facebook

Dans **Meta for Developers > Site > Facebook Login for Business > Paramètres**, ajoute exactement cette URL aux URI de redirection OAuth valides :

`https://vlbphotography.netlify.app/.netlify/functions/instagram-callback`

Ensuite, depuis le Studio, ouvre **Instagram** puis clique sur **Connecter Instagram**. Facebook demandera l’autorisation pour la Page liée au compte Instagram ; la synchronisation reste toujours manuelle et n’importe que les 25 dernières publications image.
