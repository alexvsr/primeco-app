# Guide de Déploiement - Prime&Co Ops

Ce guide explique comment déployer l'application Prime&Co Ops avec une architecture hybride :
- **Frontend** (HTML/CSS/JS) → Hébergé sur **Infomaniak** (gratuit avec le programme étudiant)
- **Backend** (Node.js/Express) → Hébergé sur **Render.com** (gratuit)
- **Base de données** (PostgreSQL) → Hébergé sur **Render.com** (gratuit)

## Prérequis

- Compte Infomaniak avec le programme étudiant activé
- Compte GitHub pour le déploiement automatique sur Render
- Git installé sur votre machine

---

## Étape 1 : Préparer le Repository GitHub

1. **Créez un nouveau repository GitHub** (privé ou public)

2. **Initialisez Git dans votre projet** (si ce n'est pas déjà fait) :
   ```bash
   cd "/Users/alexandrevavasseur/Library/Mobile Documents/com~apple~CloudDocs/CUI/Master/Projet de Master/app"
   git init
   git add .
   git commit -m "Initial commit"
   ```

3. **Liez le repository distant** :
   ```bash
   git remote add origin https://github.com/VOTRE_USERNAME/primeco-app.git
   git branch -M main
   git push -u origin main
   ```

---

## Étape 2 : Déployer le Backend sur Render.com

### 2.1 Configuration de la Base de Données

1. Allez sur [dashboard.render.com](https://dashboard.render.com)
2. Cliquez sur **New** → **PostgreSQL**
3. Configurez :
   - **Name** : `primeco-db`
   - **Region** : Frankfurt (proche de la Suisse)
   - **Plan** : Free
4. Cliquez sur **Create Database**
5. **Copiez l'Internal Database URL** (commençant par `postgres://...`)

### 2.2 Configuration du Web Service

1. Sur Render, cliquez sur **New** → **Web Service**
2. Connectez votre repository GitHub
3. Configurez :
   - **Name** : `primeco-api`
   - **Region** : Frankfurt
   - **Branch** : `main`
   - **Runtime** : Node
   - **Build Command** : 
     ```bash
     npm install && npx prisma generate && npm run build
     ```
   - **Start Command** : 
     ```bash
     npx prisma migrate deploy && npm start
     ```
   - **Plan** : Free

4. Ajoutez les **Variables d'environnement** :
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | (collez l'Internal Database URL de l'étape 2.1) |
   | `JWT_ACCESS_SECRET` | (générez une chaîne aléatoire de 32+ caractères) |
   | `JWT_REFRESH_SECRET` | (générez une autre chaîne aléatoire de 32+ caractères) |
   | `JWT_ACCESS_EXPIRES_IN` | `1h` |
   | `JWT_REFRESH_EXPIRES_IN` | `7d` |
   | `NODE_ENV` | `production` |

5. Cliquez sur **Create Web Service**

### 2.3 Initialiser la Base de Données

Une fois déployé, vous devez initialiser les données :

1. Sur Render, allez dans votre Web Service
2. Cliquez sur **Shell** (onglet en haut)
3. Exécutez :
   ```bash
   npx prisma db push
   npx ts-node prisma/seed.ts
   ```

### 2.4 Vérifier le Déploiement

Votre API sera accessible à : `https://primeco-api.onrender.com`

Testez avec :
```bash
curl https://primeco-api.onrender.com/api/buvettes
```

---

## Étape 3 : Configurer le Frontend pour Production

1. **Modifiez le fichier `config.js`** avec votre URL Render :

   ```javascript
   const CONFIG = {
       API_URL: "https://primeco-api.onrender.com/api",  // ← Votre URL Render
       IS_PRODUCTION: true
   };
   ```

2. **Testez localement** en ouvrant `index.html` dans votre navigateur

---

## Étape 4 : Déployer le Frontend sur Infomaniak

### 4.1 Créer l'Hébergement Web

1. Connectez-vous à [manager.infomaniak.com](https://manager.infomaniak.com)
2. Dans "Avantages étudiants", cliquez sur **Utiliser** pour "Hébergements Web"
3. Créez un nouveau site :
   - **Nom du site** : `primeco-app` (ou un nom de votre choix)
   - **Domaine** : utilisez le sous-domaine gratuit ou ajoutez un domaine personnalisé

### 4.2 Uploader les Fichiers Frontend

**Méthode 1 : Via le File Manager Infomaniak**

1. Allez dans **Web** → **Hébergement** → **Gestionnaire de fichiers**
2. Naviguez dans le dossier `web/` ou `public_html/`
3. Supprimez les fichiers par défaut (sauf `.htaccess`)
4. Uploadez les fichiers suivants :
   - `index.html`
   - `admin.html`
   - `admin-event.html`
   - `admin-event-detail.html`
   - `admin-staff.html`
   - `admin-staff-management.html`
   - `admin-inventory-config.html`
   - `responsable.html`
   - `timesheets.html`
   - `inventory.html`
   - `checklist.html`
   - `shared.css`
   - `shared.js`
   - `config.js`
   - `primeco_branding_2550x1440_logo_1-1500x847.jpg`

**Méthode 2 : Via FTP**

1. Obtenez vos identifiants FTP dans le manager Infomaniak
2. Utilisez FileZilla ou un autre client FTP
3. Connectez-vous et uploadez les mêmes fichiers

### 4.3 Configurer HTTPS

Infomaniak configure automatiquement un certificat SSL Let's Encrypt. Vérifiez que :
- Votre site est accessible en `https://`
- La redirection HTTP → HTTPS est activée

---

## Étape 5 : Vérification Finale

1. **Ouvrez votre site** : `https://votre-site.infomaniak.com`

2. **Testez le login** avec les identifiants créés lors du seed :
   - Vérifiez que l'appel API fonctionne
   - Vérifiez que la navigation fonctionne

3. **Testez les fonctionnalités principales** :
   - [ ] Connexion admin
   - [ ] Création d'événement
   - [ ] Affichage des buvettes
   - [ ] Gestion du staff
   - [ ] Inventaire
   - [ ] Timesheets

---

## Troubleshooting

### Le backend ne démarre pas sur Render

- Vérifiez les logs dans Render Dashboard
- Assurez-vous que `DATABASE_URL` est correctement défini
- Vérifiez que le build command inclut `prisma generate`

### Erreur CORS

Le backend permet déjà CORS avec `cors()`. Si vous avez des problèmes, vérifiez que l'URL dans `config.js` est correcte (avec `https://` et sans slash final).

### Les données ne s'affichent pas

1. Vérifiez la console du navigateur (F12)
2. Vérifiez que `config.js` pointe vers la bonne URL
3. Testez l'API directement avec curl ou dans le navigateur

### Render Free Tier - Cold Starts

Le tier gratuit de Render met le service en veille après 15 minutes d'inactivité. Le premier appel peut prendre 30-60 secondes. C'est normal.

---

## Architecture Finale

```
┌────────────────────────────────────┐
│         Utilisateur                │
│        (Navigateur Web)            │
└────────────────┬───────────────────┘
                 │
         HTTPS Requests
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌──────────────────┐   ┌──────────────────┐
│   INFOMANIAK     │   │   RENDER.COM     │
│   (Frontend)     │   │   (Backend)      │
│                  │   │                  │
│  - HTML pages    │──▶│  - Node.js API   │
│  - CSS/JS        │   │  - Express       │
│  - config.js     │   │  - Prisma ORM    │
└──────────────────┘   └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   RENDER.COM     │
                       │   (PostgreSQL)   │
                       │                  │
                       │  - Base de       │
                       │    données       │
                       └──────────────────┘
```

---

## Mise à Jour Future

Pour mettre à jour l'application :

**Backend** : Faites un `git push` vers GitHub, Render redéploie automatiquement.

**Frontend** : Uploadez les fichiers modifiés via FTP ou File Manager Infomaniak.

---

## Coûts

| Service | Coût |
|---------|------|
| Infomaniak (Programme étudiant) | **Gratuit** |
| Render Web Service (Free) | **Gratuit** |
| Render PostgreSQL (Free) | **Gratuit** |
| **Total** | **0 CHF/mois** |

> ⚠️ **Note** : Le tier gratuit de Render a des limitations (750h/mois, cold starts, 100GB bandwidth). Pour une utilisation en production intensive, considérez les tiers payants.
