# SYNERGIA v3.0 - Gestion d'équipe gamifiée

Application complète de gestion d'équipe avec gamification pour Brain Escape Game.

## Fonctionnalités

- ✅ **Système de connexion** sécurisé avec Firebase Auth
- ✅ **Gestion d'équipe** complète avec rôles et permissions
- ✅ **Système de quêtes** gamifié avec XP et niveaux
- ✅ **Chat temps réel** avec partage de fichiers
- ✅ **Planning et calendrier** avec gestion des shifts
- ✅ **Système de pointage** avec QR codes et géolocalisation
- ✅ **Notifications** push et centre de notifications
- ✅ **Progressive Web App** installable
- ✅ **Mode hors ligne** avec synchronisation

## Installation

1. Clonez ce repository
2. Déployez sur Netlify
3. Configurez Firebase (voir ci-dessous)

## Configuration Firebase

1. Créez un projet Firebase
2. Activez Authentication, Firestore, Storage
3. Ajoutez votre configuration dans `/js/core/firebase-manager.js`
4. Configurez les règles de sécurité Firestore

## Technologies

- Firebase (Auth, Firestore, Storage)
- JavaScript ES6+ vanilla
- CSS3 avec variables CSS
- PWA avec Service Worker
- Font Awesome pour les icônes

## Auteur

Allan Boehme - Brain Escape Game

## Licence

Propriétaire - Tous droits réservés

=== INSTRUCTIONS D'INSTALLATION ===

1. Créez un nouveau repository GitHub vide
2. Téléchargez tous les fichiers dans la structure indiquée
3. Initialisez git et poussez vers GitHub :
   ```bash
   git init
   git add .
   git commit -m "Initial commit - SYNERGIA v3.0"
   git branch -M main
   git remote add origin https://github.com/VOTRE-USERNAME/synergia-app.git
   git push -u origin main
   ```

4. Connectez Netlify à votre repository GitHub
5. Déployez automatiquement

IMPORTANT : Vous devez créer tous les fichiers JavaScript mentionnés dans la structure.
Les contenus des managers sont déjà fournis dans les artifacts précédents.

Pour les fichiers manquants (CSS, images, etc.), créez-les vides ou avec un contenu minimal pour commencer.