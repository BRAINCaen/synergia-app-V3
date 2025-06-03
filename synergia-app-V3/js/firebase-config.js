// Configuration Firebase pour SYNERGIA v3.0
// firebase-config.js

// Configuration Firebase (à remplacer par vos vraies clés)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "synergia-app.firebaseapp.com",
  projectId: "synergia-app",
  storageBucket: "synergia-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456789",
  measurementId: "G-ABCDEF1234"
};

// Collections Firestore
const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  TEAMS: 'teams',
  QUESTS: 'quests',
  PLANNING: 'planning',
  BADGING: 'badging',
  CHAT_ROOMS: 'chatRooms',
  MESSAGES: 'messages',
  NOTIFICATIONS: 'notifications',
  ACHIEVEMENTS: 'achievements',
  SETTINGS: 'settings'
};

// Structure des documents Firestore

// Collection: users
const USER_SCHEMA = {
  id: 'string', // UID Firebase Auth
  email: 'string',
  displayName: 'string',
  avatar: 'string', // URL de l'avatar
  role: 'string', // 'admin', 'manager', 'member'
  status: 'string', // 'online', 'busy', 'away', 'offline'
  lastSeen: 'timestamp',
  teamIds: 'array', // IDs des équipes
  preferences: {
    notifications: 'boolean',
    theme: 'string', // 'light', 'dark', 'auto'
    language: 'string',
    timezone: 'string'
  },
  stats: {
    totalHours: 'number',
    completedQuests: 'number',
    achievementPoints: 'number',
    streakDays: 'number'
  },
  createdAt: 'timestamp',
  updatedAt: 'timestamp'
};

// Collection: teams
const TEAM_SCHEMA = {
  id: 'string',
  name: 'string',
  description: 'string',
  avatar: 'string',
  ownerId: 'string', // ID du propriétaire
  memberIds: 'array', // IDs des membres
  settings: {
    isPublic: 'boolean',
    allowInvites: 'boolean',
    maxMembers: 'number'
  },
  stats: {
    totalMembers: 'number',
    activeQuests: 'number',
    completedQuests: 'number'
  },
  createdAt: 'timestamp',
  updatedAt: 'timestamp'
};

// Collection: quests
const QUEST_SCHEMA = {
  id: 'string',
  title: 'string',
  description: 'string',
  priority: 'string', // 'low', 'medium', 'high', 'urgent'
  status: 'string', // 'todo', 'in-progress', 'review', 'completed'
  type: 'string', // 'task', 'bug', 'feature', 'maintenance'
  assigneeId: 'string', // ID de l'assigné
  teamId: 'string',
  createdBy: 'string',
  tags: 'array',
  estimatedHours: 'number',
  actualHours: 'number',
  dueDate: 'timestamp',
  startDate: 'timestamp',
  completedDate: 'timestamp',
  attachments: 'array', // URLs des fichiers
  comments: 'array', // Sous-collection ou array
  dependencies: 'array', // IDs des quêtes dépendantes
  rewards: {
    points: 'number',
    badges: 'array'
  },
  createdAt: 'timestamp',
  updatedAt: 'timestamp'
};

// Collection: planning
const PLANNING_SCHEMA = {
  id: 'string',
  title: 'string',
  description: 'string',
  type: 'string', // 'shift', 'meeting', 'vacation', 'event'
  userId: 'string',
  teamId: 'string',
  startDate: 'timestamp',
  endDate: 'timestamp',
  isAllDay: 'boolean',
  location: 'string',
  attendees: 'array', // IDs des participants
  recurrence: {
    type: 'string', // 'none', 'daily', 'weekly', 'monthly'
    interval: 'number',
    endDate: 'timestamp'
  },
  reminders: 'array', // Minutes avant l'événement
  color: 'string', // Couleur de l'événement
  isPrivate: 'boolean',
  createdBy: 'string',
  createdAt: 'timestamp',
  updatedAt: 'timestamp'
};

// Collection: badging
const BADGING_SCHEMA = {
  id: 'string',
  userId: 'string',
  type: 'string', // 'in', 'out', 'break-start', 'break-end'
  timestamp: 'timestamp',
  location: {
    latitude: 'number',
    longitude: 'number',
    address: 'string'
  },
  method: 'string', // 'manual', 'qr-code', 'nfc', 'geofence'
  notes: 'string',
  approved: 'boolean',
  approvedBy: 'string',
  workSession: {
    startTime: 'timestamp',
    endTime: 'timestamp',
    totalHours: 'number',
    breaks: 'array'
  },
  createdAt: 'timestamp'
};

// Collection: chatRooms
const CHAT_ROOM_SCHEMA = {
  id: 'string',
  name: 'string',
  description: 'string',
  type: 'string', // 'team', 'direct', 'group', 'public'
  participants: 'array', // IDs des participants
  teamId: 'string', // Si c'est un chat d'équipe
  isArchived: 'boolean',
  lastMessage: {
    id: 'string',
    content: 'string',
    senderId: 'string',
    timestamp: 'timestamp'
  },
  unreadCounts: 'map', // userId -> count
  createdBy: 'string',
  createdAt: 'timestamp',
  updatedAt: 'timestamp'
};

// Collection: messages
const MESSAGE_SCHEMA = {
  id: 'string',
  chatRoomId: 'string',
  senderId: 'string',
  content: 'string',
  type: 'string', // 'text', 'image', 'file', 'system', 'quest-update'
  attachments: 'array', // URLs des fichiers joints
  replyTo: 'string', // ID du message auquel on répond
  reactions: 'map', // emoji -> array of userIds
  isEdited: 'boolean',
  editedAt: 'timestamp',
  isDeleted: 'boolean',
  deletedAt: 'timestamp',
  readBy: 'map', // userId -> timestamp
  metadata: {
    questId: 'string', // Si lié à une mission
    systemType: 'string', // Type de message système
    originalContent: 'string' // Contenu original avant édition
  },
  createdAt: 'timestamp',
  updatedAt: 'timestamp'
};

// Collection: notifications
const NOTIFICATION_SCHEMA = {
  id: 'string',
  userId: 'string',
  type: 'string', // 'quest-assigned', 'message', 'badge-reminder', 'achievement', 'system'
  title: 'string',
  content: 'string',
  icon: 'string',
  isRead: 'boolean',
  isArchived: 'boolean',
  priority: 'string', // 'low', 'medium', 'high', 'urgent'
  actionUrl: 'string', // URL vers l'action à effectuer
  metadata: {
    questId: 'string',
    teamId: 'string',
    senderId: 'string',
    badgeId: 'string',
    achievementId: 'string'
  },
  expiresAt: 'timestamp',
  readAt: 'timestamp',
  createdAt: 'timestamp'
};

// Collection: achievements
const ACHIEVEMENT_SCHEMA = {
  id: 'string',
  userId: 'string',
  type: 'string', // 'quest-master', 'time-keeper', 'team-player', 'early-bird'
  title: 'string',
  description: 'string',
  icon: 'string',
  points: 'number',
  rarity: 'string', // 'common', 'rare', 'epic', 'legendary'
  category: 'string', // 'productivity', 'collaboration', 'attendance'
  progress: {
    current: 'number',
    target: 'number',
    percentage: 'number'
  },
  isUnlocked: 'boolean',
  unlockedAt: 'timestamp',
  conditions: 'map', // Conditions pour débloquer
  rewards: {
    points: 'number',
    badges: 'array',
    privileges: 'array'
  },
  createdAt: 'timestamp'
};

// Collection: settings
const SETTINGS_SCHEMA = {
  id: 'string', // 'global' ou userId
  type: 'string', // 'global', 'user', 'team'
  entityId: 'string', // userId ou teamId
  notifications: {
    email: 'boolean',
    push: 'boolean',
    desktop: 'boolean',
    sound: 'boolean',
    vibration: 'boolean',
    quietHours: {
      enabled: 'boolean',
      start: 'string', // HH:mm
      end: 'string' // HH:mm
    },
    types: {
      questAssigned: 'boolean',
      questCompleted: 'boolean',
      messages: 'boolean',
      badgeReminder: 'boolean',
      achievements: 'boolean',
      planningUpdates: 'boolean'
    }
  },
  appearance: {
    theme: 'string', // 'light', 'dark', 'auto'
    primaryColor: 'string',
    compactMode: 'boolean',
    animations: 'boolean'
  },
  privacy: {
    showOnlineStatus: 'boolean',
    showLastSeen: 'boolean',
    allowDirectMessages: 'boolean',
    showWorkHours: 'boolean'
  },
  working: {
    defaultHours: 'number',
    timezone: 'string',
    workDays: 'array', // [1,2,3,4,5] pour lun-ven
    breakReminders: 'boolean',
    overtimeAlerts: 'boolean'
  },
  updatedAt: 'timestamp'
};

// Règles de sécurité Firestore (à copier dans la console Firebase)
const FIRESTORE_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Règles pour les utilisateurs
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && isTeamMember(userId);
    }
    
    // Règles pour les équipes
    match /teams/{teamId} {
      allow read: if request.auth != null && isTeamMember(teamId);
      allow write: if request.auth != null && isTeamOwnerOrAdmin(teamId);
      allow create: if request.auth != null;
    }
    
    // Règles pour les missions
    match /quests/{questId} {
      allow read: if request.auth != null && isTeamMember(resource.data.teamId);
      allow write: if request.auth != null && 
        (isTeamOwnerOrAdmin(resource.data.teamId) || 
         request.auth.uid == resource.data.assigneeId);
      allow create: if request.auth != null && isTeamMember(request.resource.data.teamId);
    }
    
    // Règles pour le planning
    match /planning/{planningId} {
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         isTeamMember(resource.data.teamId));
      allow write: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         isTeamOwnerOrAdmin(resource.data.teamId));
      allow create: if request.auth != null;
    }
    
    // Règles pour le badgeage
    match /badging/{badgingId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow read: if request.auth != null && isManager();
    }
    
    // Règles pour les salles de chat
    match /chatRooms/{roomId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.participants;
    }
    
    // Règles pour les messages
    match /messages/{messageId} {
      allow read: if request.auth != null && canAccessChatRoom(resource.data.chatRoomId);
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.senderId &&
        canAccessChatRoom(request.resource.data.chatRoomId);
      allow update: if request.auth != null && 
        request.auth.uid == resource.data.senderId;
    }
    
    // Règles pour les notifications
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Règles pour les succès
    match /achievements/{achievementId} {
      allow read: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow write: if request.auth != null && isSystemUser();
    }
    
    // Règles pour les paramètres
    match /settings/{settingId} {
      allow read, write: if request.auth != null && 
        (settingId == request.auth.uid || settingId == 'global');
    }
    
    // Fonctions helper
    function isTeamMember(teamId) {
      return teamId in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.teamIds;
    }
    
    function isTeamOwnerOrAdmin(teamId) {
      let user = get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
      let team = get(/databases/$(database)/documents/teams/$(teamId)).data;
      return user.role in ['admin'] || team.ownerId == request.auth.uid;
    }
    
    function isManager() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager'];
    }
    
    function isSystemUser() {
      return request.auth.token.role == 'system';
    }
    
    function canAccessChatRoom(roomId) {
      return request.auth.uid in get(/databases/$(database)/documents/chatRooms/$(roomId)).data.participants;
    }
  }
}
`;

// Fonctions Cloud Functions (exemple)
const CLOUD_FUNCTIONS_EXAMPLES = `
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Fonction pour envoyer des notifications push
exports.sendNotification = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const notification = snap.data();
    const userId = notification.userId;
    
    // Récupérer le token FCM de l'utilisateur
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const fcmToken = userDoc.data().fcmToken;
    
    if (fcmToken) {
      const message = {
        token: fcmToken,
        notification: {
          title: notification.title,
          body: notification.content,
          icon: notification.icon || '/assets/icons/icon-192x192.png'
        },
        data: {
          type: notification.type,
          actionUrl: notification.actionUrl || '/',
          notificationId: context.params.notificationId
        }
      };
      
      try {
        await admin.messaging().send(message);
        console.log('Notification envoyée:', userId);
      } catch (error) {
        console.error('Erreur envoi notification:', error);
      }
    }
  });

// Fonction pour calculer les statistiques d'équipe
exports.updateTeamStats = functions.firestore
  .document('quests/{questId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    
    // Si le statut de la mission a changé
    if (beforeData.status !== afterData.status) {
      const teamId = afterData.teamId;
      
      // Recalculer les stats de l'équipe
      const questsRef = admin.firestore().collection('quests');
      const teamQuests = await questsRef.where('teamId', '==', teamId).get();
      
      let activeQuests = 0;
      let completedQuests = 0;
      
      teamQuests.forEach(doc => {
        const quest = doc.data();
        if (quest.status === 'completed') {
          completedQuests++;
        } else if (['todo', 'in-progress', 'review'].includes(quest.status)) {
          activeQuests++;
        }
      });
      
      // Mettre à jour les stats de l'équipe
      await admin.firestore().collection('teams').doc(teamId).update({
        'stats.activeQuests': activeQuests,
        'stats.completedQuests': completedQuests,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });

// Fonction pour débloquer des succès
exports.checkAchievements = functions.firestore
  .document('badging/{badgingId}')
  .onCreate(async (snap, context) => {
    const badging = snap.data();
    const userId = badging.userId;
    
    // Vérifier le succès "Early Bird" (arrivée avant 8h)
    if (badging.type === 'in') {
      const arrivalTime = badging.timestamp.toDate();
      const hour = arrivalTime.getHours();
      
      if (hour < 8) {
        // Compter les arrivées matinales
        const earlyArrivals = await admin.firestore()
          .collection('badging')
          .where('userId', '==', userId)
          .where('type', '==', 'in')
          .get();
        
        let earlyCount = 0;
        earlyArrivals.forEach(doc => {
          const data = doc.data();
          const time = data.timestamp.toDate();
          if (time.getHours() < 8) {
            earlyCount++;
          }
        });
        
        // Débloquer le succès après 10 arrivées matinales
        if (earlyCount >= 10) {
          await admin.firestore().collection('achievements').add({
            userId: userId,
            type: 'early-bird',
            title: 'Lève-tôt',
            description: '10 arrivées avant 8h',
            icon: '🌅',
            points: 100,
            rarity: 'rare',
            category: 'attendance',
            isUnlocked: true,
            unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          // Envoyer une notification
          await admin.firestore().collection('notifications').add({
            userId: userId,
            type: 'achievement',
            title: 'Nouveau succès débloqué !',
            content: 'Vous avez débloqué le succès "Lève-tôt"',
            icon: '🏆',
            isRead: false,
            isArchived: false,
            priority: 'medium',
            actionUrl: '/#achievements',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
    }
  });
`;

// Instructions de déploiement
const DEPLOYMENT_INSTRUCTIONS = `
# Instructions de déploiement SYNERGIA v3.0

## 1. Configuration Firebase

### Créer un projet Firebase
1. Aller sur https://console.firebase.google.com
2. Créer un nouveau projet "synergia-app"
3. Activer Authentication (Email/Password)
4. Activer Firestore Database
5. Activer Storage
6. Activer Cloud Messaging
7. Configurer les règles de sécurité

### Configuration Web App
1. Ajouter une application Web dans le projet
2. Copier la configuration dans firebase-config.js
3. Remplacer les valeurs d'exemple par les vraies clés

## 2. Structure Firestore

### Créer les collections avec les indexes suivants :
- users: index composite sur (teamIds, status)
- quests: index composite sur (teamId, status, priority)
- planning: index composite sur (teamId, startDate, endDate)
- badging: index composite sur (userId, timestamp)
- messages: index composite sur (chatRoomId, createdAt)

## 3. Déploiement

### Option 1: Netlify (Recommandé)
1. Fork le repository GitHub
2. Connecter Netlify au repository
3. Configurer les variables d'environnement
4. Déployer automatiquement

### Option 2: Firebase Hosting
\`\`\`bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
\`\`\`

### Option 3: Autre hébergeur
1. Uploader tous les fichiers
2. Configurer le serveur web
3. Activer HTTPS (obligatoire pour PWA)

## 4. Configuration finale

### Service Worker
1. Vérifier que sw.js est accessible
2. Enregistrer le Service Worker
3. Tester les notifications push

### PWA
1. Vérifier le manifest.json
2. Générer les icônes manquantes
3. Tester l'installation PWA

### Tests
1. Tester sur différents navigateurs
2. Vérifier le mode hors ligne
3. Tester les notifications
4. Valider la sécurité Firestore
\`\`\`

export {
  firebaseConfig,
  FIRESTORE_COLLECTIONS,
  USER_SCHEMA,
  TEAM_SCHEMA,
  QUEST_SCHEMA,
  PLANNING_SCHEMA,
  BADGING_SCHEMA,
  CHAT_ROOM_SCHEMA,
  MESSAGE_SCHEMA,
  NOTIFICATION_SCHEMA,
  ACHIEVEMENT_SCHEMA,
  SETTINGS_SCHEMA
}; 