# TechFusion - Gestion d'abonnements digitaux

Application web de gestion des abonnements digitaux avec authentification Firebase et base de données en temps réel.

## 🚀 Déploiement sur Vercel

### Prérequis
- Compte [Vercel](https://vercel.com) gratuit
- Repository GitHub
- Variables d'environnement Firebase

### Étapes de déploiement

#### 1. Préparation Git
```bash
# Initialiser le repository Git (si nécessaire)
git init
git add .
git commit -m "Initial commit: TechFusion app"
```

#### 2. Pousser sur GitHub
```bash
git remote add origin https://github.com/votre-username/techfusion-admin.git
git branch -M main
git push -u origin main
```

#### 3. Déployer sur Vercel
**Option A : Via l'interface Vercel (recommandé)**

1. Allez sur [vercel.com/new](https://vercel.com/new)
2. Connectez-vous avec GitHub
3. Sélectionnez ce repository
4. Configuration du projet :
   - **Framework Preset** : Create React App
   - **Root Directory** : `.` (racine)
5. Ajouter les variables d'environnement :
   - `REACT_APP_FIREBASE_API_KEY`
   - `REACT_APP_FIREBASE_AUTH_DOMAIN`
   - `REACT_APP_FIREBASE_PROJECT_ID`
   - `REACT_APP_FIREBASE_STORAGE_BUCKET`
   - `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
   - `REACT_APP_FIREBASE_APP_ID`
6. Cliquez sur "Deploy"

**Option B : Via la CLI Vercel**
```bash
npm install -g vercel
vercel
```

#### 4. Configurer la sécurité Firebase

⚠️ **Important** : Vos identifiants Firebase sont maintenant en sécurité grâce aux variables d'environnement !

Pour la production, nous recommandons de configurer **Firebase Security Rules** :

1. Allez dans [Firebase Console](https://console.firebase.google.com)
2. Sélectionnez votre projet `techfusion1-48c57`
3. **Firestore Database** → onglet "Rules"
4. Remplacez les règles par ceci :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Authentification requise pour tous les accès
    match /{document=**} {
      allow read, write: if request.auth != null && 
                          exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
  }
}
```

#### 5. Configurer l'authentification Firebase

1. Allez dans **Authentication** → "Sign-in method"
2. Activez "Email/Password"
3. Allez dans **Authentication** → "Users"
4. Ajouter les utilisateurs administrateurs

## 📦 Installation locale

```bash
npm install
npm start
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## 🔐 Sécurité

- ✅ Les identifiants Firebase sont en **variables d'environnement**
- ✅ Jamais committées dans le code (`git`)
- ✅ Seul Vercel a accès en production
- ✅ Protégées par Firebase Security Rules

## 🏗️ Structure du projet

```
/src
  ├── App.jsx          # Composant principal
  ├── firebase.js      # Configuration Firebase
  └── index.js         # Point d'entrée React
/public
  └── index.html       # HTML template
.env.local             # Variables locales (ne pas committer)
.env.example           # Template des variables
package.json           # Dépendances
```

## 🔧 Variables d'environnement

Créez un fichier `.env.local` :

```env
REACT_APP_FIREBASE_API_KEY=your_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

## 📚 Technos utilisées

- **React 18** - UI Framework
- **Firebase 10** - Auth + Firestore
- **Create React App** - Build tool
- **Vercel** - Hosting

## 🐛 Troubleshooting

### Erreur : "Firebase not initialized"
- Vérifier les variables d'environnement dans `.env.local`
- Redémarrer le serveur local

### Erreur : "Unauthorized" sur Firestore
- Vérifier les Firebase Security Rules
- S'assurer que l'utilisateur est dans la collection `admins`

### Build échoue sur Vercel
- Vérifier que les variables d'environnement sont définies dans Vercel dashboard
- Vérifier les logs de build dans Vercel

## 📞 Support

Pour toute question concernant le déploiement, consultez :
- [Docs Vercel](https://vercel.com/docs)
- [Docs Firebase](https://firebase.google.com/docs)
- [Docs Create React App](https://create-react-app.dev/)
