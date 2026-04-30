# Prime&Co Ops

Prime&Co Ops est une solution applicative pensée pour la gestion logistique des événements. Elle est structurée autour d'une interface Frontend classique (HTML, CSS, JS) et d'une API Backend (Node.js, Express, TypeScript, PostgreSQL via Prisma).

## Fonctionnalités Principales

- **Administration globale** : Tableau de bord et connexion sécurisée.
- **Gestion des événements & Buvettes** : Planification, configuration des espaces de vente (buvettes) lors des événements.
- **Gestion du Staff** : Ajout, modification et assignation des membres de l'équipe aux différents événements.
- **Inventaire** : Suivi des stocks de boissons/produits, configurations des inventaires par buvette.
- **Timesheets** : Pointage et suivi des heures travaillées par le staff.
- **Checklists** : Suivi des tâches opérationnelles sur le terrain.

## Architecture & Technologies

L'application repose sur une **architecture hybride** :

- **Frontend** : Pages web classiques communiquant avec l'API (HTML, CSS, Vanilla JS).
- **Backend (API)** : Serveur Node.js / Express propulsé par TypeScript.
- **Base de données** : PostgreSQL.
- **ORM** : [Prisma](https://www.prisma.io/).
- **Authentification** : Modules de sécurité via JWT (JSON Web Tokens) et `bcrypt`.
- **Validation & Log** : Utilisation de `zod` pour la validation de la donnée entrante et `pino` pour le système de logs.
- **Export/Import** : Support de l'export de données au format Excel via `xlsx`.

> Un guide détaillé du déploiement en production (sur Render.com et Infomaniak) est disponible dans le fichier [`DEPLOYMENT.md`](./DEPLOYMENT.md).

---

## Prérequis

1. [Node.js](https://nodejs.org/) (version 18+ recommandée)
2. [PostgreSQL](https://www.postgresql.org/) (ou accès distant à une base de données PostgreSQL existante)

---

## Installation & Démarrage en Développement

### 1. Cloner ou ouvrir le projet

```bash
cd "/Users/alexandrevavasseur/Library/Mobile Documents/com~apple~CloudDocs/CUI/Master/Projet de Master/app"
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration de l'environnement

Copier le fichier d'exemple pour créer votre configuration locale :

```bash
cp .env.example .env
```

Ouvrez `.env` et assurez-vous de bien renseigner l'URL de la base de données PostgreSQL locale ou distante (`DATABASE_URL`), ainsi que les configurations liées aux clées JWT (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, etc.).

### 4. Initialiser la base de données (Prisma)

Prisma doit être synchronisé avec votre base de données avant de pouvoir lancer le serveur :

```bash
# Générer le client Prisma
npm run prisma:generate

# Appliquer les migrations à la base de données
npm run prisma:migrate

# (Optionnel) Seed : Pré-remplir la base avec des données utiles au débugging
npm run prisma:seed
```

### 5. Lancer l'API en développement

```bash
npm run dev
```

L'API sera disponible (généralement sur le port `3000` ou `8080`, selon votre `.env`). Le serveur se rafraîchira automatiquement lors des modifications de code grâce à `ts-node-dev`.

### 6. Lancer le Frontend en développement

Les fichiers frontend incluent les fichiers `.html`, `.css` et `.js`. Vous pouvez simplement ouvrir l'interface (`index.html`) dans votre navigateur ou uiliser une extension type "Live Server" sur VSCode. 

> *N'oubliez pas d'éditer `config.js` pour qu'il pointe vers l'instance de développement locale (`http://localhost:<PORT>/api`) au lieu de l'URL de production.*

---

## Scripts NPM Disponibles

Voici les commandes configurées dans `package.json` :

- `npm run dev` : Lance le serveur Node.js avec rechargement à chaud (Hot-Reload).
- `npm run build` : Compile le code TypeScript en version JavaScript optimisée dans le répertoire `dist/`.
- `npm start` : Lance le serveur compilé (prêt pour la production).
- `npm run lint` : Vérifie la syntaxe TypeScript via ESLint sur tout le projet.
- `npm run prisma:generate` : Régénère le client TypeScript de Prisma selon votre modèle de données (à faire à chaque modification de `schema.prisma`).
- `npm run prisma:migrate` : Joue les migrations de base de données.
- `npm run prisma:seed` : Instille la base de données PostgreSQL avec les données par défaut trouvées dans `prisma/seed.ts`.
