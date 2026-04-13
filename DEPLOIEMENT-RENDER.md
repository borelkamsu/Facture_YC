# Guide de Déploiement — Render.com

Application : **Youmbi Concept — Gestion de Facturation**  
Stack : Node.js + Express + React + MongoDB Atlas + Puppeteer

---

## Prérequis

- [ ] Compte GitHub : https://github.com
- [ ] Compte Render : https://render.com
- [ ] Compte MongoDB Atlas configuré (URI de connexion disponible)

---

## Étape 1 — Pousser le projet sur GitHub

### 1.1 Créer un dépôt GitHub

1. Aller sur https://github.com/new
2. Nom du dépôt : `facture-youmbiconcept`
3. Visibilité : **Privé** (recommandé — vos données d'entreprise)
4. Cliquer **Create repository**

### 1.2 Initialiser et pousser le code

Ouvrir un terminal dans le dossier du projet :

```bash
cd "c:/projet perso/FactureYoumbiconcept"

git init
git add .
git commit -m "Initial commit — FactureYoumbiconcept"
git branch -M main
git remote add origin https://github.com/VOTRE_USERNAME/facture-youmbiconcept.git
git push -u origin main
```

> Remplacer `VOTRE_USERNAME` par votre nom d'utilisateur GitHub.

---

## Étape 2 — Créer le service sur Render

### 2.1 Nouveau Web Service

1. Se connecter sur https://render.com
2. Cliquer **New +** → **Web Service**
3. Choisir **Connect a repository** → sélectionner `facture-youmbiconcept`

### 2.2 Configurer le service

Remplir les champs comme suit :

| Champ | Valeur |
|-------|--------|
| **Name** | `facture-youmbiconcept` |
| **Region** | `Oregon (US West)` ou `Frankfurt (EU)` |
| **Branch** | `main` |
| **Root Directory** | *(laisser vide)* |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build && cd server && npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` (ou `Starter` à 7$/mois pour éviter la mise en veille) |

### 2.3 Variables d'environnement

Descendre jusqu'à la section **Environment Variables** et ajouter :

| Clé | Valeur |
|-----|--------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | `mongodb+srv://lama:lama@cluster0.xn0ura2.mongodb.net/FactureYC` |
| `PORT` | `5000` |

> ⚠️ **Important** : Ne jamais committer le fichier `.env` sur GitHub.  
> Vérifier que `.env` est bien dans le fichier `.gitignore`.

### 2.4 Lancer le déploiement

Cliquer **Create Web Service**.

Render va :
1. Cloner votre dépôt
2. Installer les dépendances (`npm install`)
3. Compiler le frontend React (`npm run build` → génère `client/dist/`)
4. Installer les dépendances serveur (`cd server && npm install`)
5. Démarrer l'application (`npm start`)

Le déploiement prend environ **5 à 10 minutes** la première fois (téléchargement de Chromium pour Puppeteer).

---

## Étape 3 — Vérification post-déploiement

Une fois déployé, Render vous donne une URL du type :  
`https://facture-youmbiconcept.onrender.com`

### Checklist de vérification

- [ ] La page d'accueil s'affiche (liste des factures)
- [ ] La sidebar affiche le logo et le nom de l'entreprise
- [ ] Créer un article de test dans **Base Articles**
- [ ] Créer une facture de test dans **Créer une Facture**
- [ ] Télécharger le PDF de la facture → vérifier que Puppeteer fonctionne
- [ ] Aller dans **Mes Infos** → vérifier que les infos s'affichent

---

## Étape 4 — Autoriser Render dans MongoDB Atlas

MongoDB Atlas bloque les connexions par défaut. Vous devez autoriser les IP de Render.

1. Aller sur https://cloud.mongodb.com
2. Votre projet → **Network Access**
3. Cliquer **Add IP Address**
4. Choisir **Allow Access from Anywhere** : `0.0.0.0/0`
5. Cliquer **Confirm**

> Cette option est acceptable pour un usage personnel. Pour une app publique, utiliser les IP fixes de Render (disponibles sur le plan payant).

---

## Mises à jour (re-déploiement)

À chaque modification du code, il suffit de pousser sur GitHub :

```bash
git add .
git commit -m "Description des modifications"
git push origin main
```

Render détecte automatiquement le push et redéploie l'application.

---

## Résolution de problèmes courants

### Le PDF ne se génère pas
Puppeteer nécessite Chromium. Si l'erreur persiste, ajouter cette variable d'environnement sur Render :

| Clé | Valeur |
|-----|--------|
| `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` | `false` |

### L'app met 30 secondes à démarrer
Normal sur le **tier gratuit** — Render met le service en veille après 15 min d'inactivité.  
Solution : passer au **Starter ($7/mois)** pour une disponibilité permanente.

### Erreur de connexion MongoDB
- Vérifier que `MONGODB_URI` est bien défini dans les variables d'environnement Render
- Vérifier que l'IP `0.0.0.0/0` est autorisée dans MongoDB Atlas Network Access

### Page blanche après déploiement
Vérifier dans les logs Render que le build React s'est terminé sans erreur :  
`Dashboard → Service → Logs`

---

## Architecture de production

```
Navigateur
    │
    ▼
Render Web Service (Node.js — port 5000)
    ├── GET /             → client/dist/index.html  (React)
    ├── GET /assets/*     → client/dist/assets/     (JS, CSS)
    ├── GET /api/articles → MongoDB Atlas
    ├── GET /api/factures → MongoDB Atlas
    ├── GET /api/factures/:id/pdf → Puppeteer → PDF
    └── GET /api/company  → MongoDB Atlas

MongoDB Atlas (Cloud — cluster0.xn0ura2.mongodb.net)
    └── Base : FactureYC
        ├── articles
        ├── factures
        └── companyinfos
```

---

*Guide rédigé pour FactureYoumbiconcept — Youmbi Concept © 2025*
