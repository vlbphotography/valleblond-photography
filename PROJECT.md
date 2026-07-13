# Valleblond Photography

Développeur : Valentin Buchoux
Assistant technique : ChatGPT

---

# Vision

Créer une galerie d'art photographique haut de gamme permettant la vente de photographies numériques et physiques.

Le site ne doit pas ressembler à une boutique e-commerce classique, mais à une galerie immersive.

Signature :

> Photographies d'instants, de paysages et d'émotions.

---

# Technologies

Frontend

- HTML5
- CSS3
- JavaScript ES6

Backend

- Supabase

Hébergement

- Netlify

Paiement

- PayPal

---

# Architecture

index.html

pages/

- oeuvre.html
- apropos.html
- admin/

assets/

- css/
- js/
- images/
- icons/

---

# Base Supabase

Table principale :

`Artworks` (table existante actuellement utilisée par le site).

La convention cible est `artworks` en minuscules. La migration sera planifiée
avant le Sprint 3, sans interruption de la galerie.

Table technique :

`artwork_uploads`

Conserve les previews envoyées depuis le Studio avant leur association
à une œuvre au Sprint 4.

Contiendra :

- titre
- slug
- description
- lieu
- année
- collection
- image_preview
- image_hd
- prix_numerique
- prix_a4
- prix_a3
- prix_grand
- publié

Chaque œuvre est créée depuis une preview existante et contient aussi :

- slug
- format
- statut de publication

---

# Storage

Bucket public

artworks

Contient :

- previews

Bucket privé

downloads

Contiendra :

- fichiers HD

---

# Studio

Une seule interface d'administration.

Connexion Supabase.

Fonctions :

- Ajouter une œuvre
- Modifier une œuvre
- Supprimer une œuvre
- Upload Preview
- Upload HD
- Gestion collections

---

# Galerie

Page d'accueil :

Défilement infini.

Plusieurs photos visibles.

Style galerie d'art.

Animations douces.

Chaque photo ouvre sa fiche.

---

# Fiche œuvre

Contient :

- Grande image
- Description
- Lieu
- Année

Achat :

- Tirage
- Numérique

---

# Objectifs

Aucun framework.

Projet léger.

Très rapide.

Très bon référencement.

Code maintenable.

100 % gratuit.

---

# Roadmap

v0.2

Connexion Studio et contrôle d'accès administrateur

v0.3

Upload

v0.4

Gestion œuvres

v0.5

Collections

v0.6

Paiement numérique

v0.7

Paiement tirages

v1.0

Production
