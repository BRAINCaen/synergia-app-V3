// js/utils/constants.js
// Constantes de l'application SYNERGIA v3.0

/**
 * Informations de l'application
 */
export const APP_INFO = {
    NAME: 'SYNERGIA',
    VERSION: '3.0.0',
    DESCRIPTION: 'Gestion d\'équipe gamifiée pour Brain Escape Game',
    AUTHOR: 'Allan Boehme',
    COMPANY: 'SARL BOEHME Brain Escape & Quiz Game',
    LOCATION: 'Caen, Calvados, France',
    EMAIL: 'alan.boehme61@gmail.com'
};

/**
 * URLs et endpoints
 */
export const URLS = {
    PRODUCTION: 'https://synergia-app.netlify.app/',
    REPOSITORY: 'https://github.com/BRAINCaen/synergia-app-V3.git',
    SUPPORT: 'https://support.anthropic.com',
    DOCS: 'https://docs.anthropic.com'
};

/**
 * Configuration Firebase
 */
export const FIREBASE_CONFIG = {
    apiKey: "AIzaSyD7uBuAQaOhZ02owkZEuMKC5Vji6PrB2f8",
    authDomain: "synergia-app-f27e7.firebaseapp.com",
    projectId: "synergia-app-f27e7",
    storageBucket: "synergia-app-f27e7.appspot.com",
    messagingSenderId: "201912738922",
    appId: "1:201912738922:web:2fcc1e49293bb632899613",
    measurementId: "G-EGJ79SCMWX"
};

/**
 * Collections Firestore
 */
export const COLLECTIONS = {
    USERS: 'users',
    TEAM_MEMBERS: 'teamMembers',
    ROLES: 'roles',
    QUESTS: 'quests',
    USER_QUESTS: 'userQuests',
    SHIFTS: 'shifts',
    EVENTS: 'events',
    LEAVES: 'leaves',
    CONVERSATIONS: 'conversations',
    MESSAGES: 'messages',
    NOTIFICATIONS: 'notifications',
    BADGING: 'badging',
    ANALYTICS: 'analytics',
    SETTINGS: 'settings'
};

/**
 * Rôles utilisateurs
 */
export const ROLES = {
    ADMIN: {
        id: 'admin',
        name: 'Administrateur',
        description: 'Accès complet à toutes les fonctionnalités',
        color: '#dc2626',
        icon: 'crown',
        level: 10,
        permissions: ['all']
    },
    MANAGER: {
        id: 'manager',
        name: 'Manager',
        description: 'Gestion d\'équipe et planning',
        color: '#7c3aed',
        icon: 'user-tie',
        level: 8,
        permissions: ['manage_team', 'view_analytics', 'create_quests', 'manage_planning', 'approve_leaves']
    },
    EMPLOYEE: {
        id: 'employee',
        name: 'Employé',
        description: 'Accès standard aux fonctionnalités',
        color: '#059669',
        icon: 'user',
        level: 5,
        permissions: ['view_team', 'complete_quests', 'use_chat', 'view_planning', 'request_leave']
    },
    INTERN: {
        id: 'intern',
        name: 'Stagiaire',
        description: 'Accès limité en formation',
        color: '#0ea5e9',
        icon: 'graduation-cap',
        level: 3,
        permissions: ['view_team', 'complete_quests', 'view_planning']
    },
    ENTRETIEN: {
        id: 'entretien',
        name: 'Entretien',
        description: 'Équipe de maintenance',
        color: '#f59e0b',
        icon: 'tools',
        level: 4,
        permissions: ['view_team', 'complete_quests', 'maintenance_quests', 'view_planning']
    },
    ACCUEIL: {
        id: 'accueil',
        name: 'Accueil',
        description: 'Service clientèle',
        color: '#8b5cf6',
        icon: 'concierge-bell',
        level: 5,
        permissions: ['view_team', 'complete_quests', 'customer_service', 'view_planning']
    },
    ANIMATION: {
        id: 'animation',
        name: 'Animation',
        description: 'Animation et encadrement',
        color: '#ef4444',
        icon: 'masks-theater',
        level: 6,
        permissions: ['view_team', 'complete_quests', 'animation_quests', 'view_planning']
    },
    SECURITE: {
        id: 'securite',
        name: 'Sécurité',
        description: 'Sécurité et surveillance',
        color: '#374151',
        icon: 'shield-alt',
        level: 7,
        permissions: ['view_team', 'complete_quests', 'security_access', 'view_planning']
    }
};

/**
 * Permissions système
 */
export const PERMISSIONS = {
    // Permissions globales
    ALL: 'all',
    
    // Gestion équipe
    MANAGE_TEAM: 'manage_team',
    VIEW_TEAM: 'view_team',
    ADD_MEMBER: 'add_member',
    EDIT_MEMBER: 'edit_member',
    DELETE_MEMBER: 'delete_member',
    
    // Quêtes
    CREATE_QUESTS: 'create_quests',
    EDIT_QUESTS: 'edit_quests',
    DELETE_QUESTS: 'delete_quests',
    COMPLETE_QUESTS: 'complete_quests',
    ASSIGN_QUESTS: 'assign_quests',
    
    // Planning
    MANAGE_PLANNING: 'manage_planning',
    VIEW_PLANNING: 'view_planning',
    CREATE_SHIFTS: 'create_shifts',
    EDIT_SHIFTS: 'edit_shifts',
    DELETE_SHIFTS: 'delete_shifts',
    
    // Congés
    APPROVE_LEAVES: 'approve_leaves',
    REQUEST_LEAVE: 'request_leave',
    MANAGE_LEAVES: 'manage_leaves',
    
    // Chat
    USE_CHAT: 'use_chat',
    MODERATE_CHAT: 'moderate_chat',
    
    // Pointage
    MANAGE_BADGING: 'manage_badging',
    VIEW_BADGING_REPORTS: 'view_badging_reports',
    
    // Analytics
    VIEW_ANALYTICS: 'view_analytics',
    EXPORT_DATA: 'export_data',
    
    // Spécialisations
    MAINTENANCE_QUESTS: 'maintenance_quests',
    CUSTOMER_SERVICE: 'customer_service',
    ANIMATION_QUESTS: 'animation_quests',
    SECURITY_ACCESS: 'security_access',
    
    // Administration
    MANAGE_SETTINGS: 'manage_settings',
    MANAGE_ROLES: 'manage_roles',
    VIEW_LOGS: 'view_logs'
};

/**
 * Types de quêtes
 */
export const QUEST_TYPES = {
    DAILY: {
        id: 'daily',
        name: 'Quotidienne',
        description: 'Quête à effectuer chaque jour',
        color: '#3b82f6',
        icon: 'calendar-day',
        duration: 1, // jour
        recurring: true
    },
    WEEKLY: {
        id: 'weekly',
        name: 'Hebdomadaire',
        description: 'Quête à effectuer chaque semaine',
        color: '#8b5cf6',
        icon: 'calendar-week',
        duration: 7, // jours
        recurring: true
    },
    SPECIAL: {
        id: 'special',
        name: 'Spéciale',
        description: 'Quête ponctuelle ou événementielle',
        color: '#f59e0b',
        icon: 'star',
        duration: null,
        recurring: false
    },
    MONTHLY: {
        id: 'monthly',
        name: 'Mensuelle',
        description: 'Quête à effectuer chaque mois',
        color: '#10b981',
        icon: 'calendar',
        duration: 30, // jours
        recurring: true
    },
    TRAINING: {
        id: 'training',
        name: 'Formation',
        description: 'Quête de formation et apprentissage',
        color: '#6366f1',
        icon: 'graduation-cap',
        duration: null,
        recurring: false
    }
};

/**
 * Priorités
 */
export const PRIORITIES = {
    LOW: {
        id: 'low',
        name: 'Faible',
        color: '#10b981',
        icon: 'arrow-down',
        value: 1
    },
    NORMAL: {
        id: 'normal',
        name: 'Normale',
        color: '#6b7280',
        icon: 'minus',
        value: 2
    },
    HIGH: {
        id: 'high',
        name: 'Haute',
        color: '#f59e0b',
        icon: 'arrow-up',
        value: 3
    },
    URGENT: {
        id: 'urgent',
        name: 'Urgente',
        color: '#ef4444',
        icon: 'exclamation',
        value: 4
    },
    CRITICAL: {
        id: 'critical',
        name: 'Critique',
        color: '#dc2626',
        icon: 'exclamation-triangle',
        value: 5
    }
};

/**
 * Statuts
 */
export const STATUSES = {
    // Statuts généraux
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed',
    
    // Statuts de quêtes
    QUEST_AVAILABLE: 'available',
    QUEST_ASSIGNED: 'assigned',
    QUEST_IN_PROGRESS: 'in_progress',
    QUEST_COMPLETED: 'completed',
    QUEST_FAILED: 'failed',
    QUEST_EXPIRED: 'expired',
    
    // Statuts de shifts
    SHIFT_SCHEDULED: 'scheduled',
    SHIFT_CONFIRMED: 'confirmed',
    SHIFT_IN_PROGRESS: 'in_progress',
    SHIFT_COMPLETED: 'completed',
    SHIFT_CANCELLED: 'cancelled',
    SHIFT_NO_SHOW: 'no_show',
    
    // Statuts de congés
    LEAVE_PENDING: 'pending',
    LEAVE_APPROVED: 'approved',
    LEAVE_REJECTED: 'rejected',
    LEAVE_CANCELLED: 'cancelled',
    
    // Statuts de pointage
    BADGING_IN: 'in',
    BADGING_OUT: 'out',
    BADGING_BREAK: 'break'
};

/**
 * Types d'événements
 */
export const EVENT_TYPES = {
    GENERAL: {
        id: 'general',
        name: 'Général',
        color: '#6b7280',
        icon: 'calendar'
    },
    MEETING: {
        id: 'meeting',
        name: 'Réunion',
        color: '#3b82f6',
        icon: 'users'
    },
    TRAINING: {
        id: 'training',
        name: 'Formation',
        color: '#8b5cf6',
        icon: 'graduation-cap'
    },
    MAINTENANCE: {
        id: 'maintenance',
        name: 'Maintenance',
        color: '#f59e0b',
        icon: 'tools'
    },
    EVENT: {
        id: 'event',
        name: 'Événement',
        color: '#10b981',
        icon: 'star'
    },
    HOLIDAY: {
        id: 'holiday',
        name: 'Congé',
        color: '#ef4444',
        icon: 'umbrella-beach'
    }
};

/**
 * Types de congés
 */
export const LEAVE_TYPES = {
    VACATION: {
        id: 'vacation',
        name: 'Congés payés',
        color: '#10b981',
        icon: 'umbrella-beach'
    },
    SICK: {
        id: 'sick',
        name: 'Arrêt maladie',
        color: '#ef4444',
        icon: 'thermometer-half'
    },
    PERSONAL: {
        id: 'personal',
        name: 'Congé personnel',
        color: '#8b5cf6',
        icon: 'user'
    },
    FAMILY: {
        id: 'family',
        name: 'Congé familial',
        color: '#f59e0b',
        icon: 'home'
    },
    MATERNITY: {
        id: 'maternity',
        name: 'Congé maternité',
        color: '#ec4899',
        icon: 'baby'
    },
    PATERNITY: {
        id: 'paternity',
        name: 'Congé paternité',
        color: '#06b6d4',
        icon: 'baby'
    },
    OTHER: {
        id: 'other',
        name: 'Autre',
        color: '#6b7280',
        icon: 'question'
    }
};

/**
 * Types de pauses
 */
export const BREAK_TYPES = {
    LUNCH: {
        id: 'lunch',
        name: 'Déjeuner',
        duration: 60, // minutes
        color: '#f59e0b',
        icon: 'utensils'
    },
    SHORT: {
        id: 'short',
        name: 'Pause courte',
        duration: 15,
        color: '#10b981',
        icon: 'coffee'
    },
    PERSONAL: {
        id: 'personal',
        name: 'Pause personnelle',
        duration: 30,
        color: '#8b5cf6',
        icon: 'user'
    },
    MEETING: {
        id: 'meeting',
        name: 'Réunion',
        duration: null,
        color: '#3b82f6',
        icon: 'users'
    },
    TECHNICAL: {
        id: 'technical',
        name: 'Technique',
        duration: null,
        color: '#6b7280',
        icon: 'tools'
    }
};

/**
 * Types de notifications
 */
export const NOTIFICATION_TYPES = {
    INFO: {
        id: 'info',
        name: 'Information',
        color: '#3b82f6',
        icon: 'info-circle'
    },
    SUCCESS: {
        id: 'success',
        name: 'Succès',
        color: '#10b981',
        icon: 'check-circle'
    },
    WARNING: {
        id: 'warning',
        name: 'Avertissement',
        color: '#f59e0b',
        icon: 'exclamation-triangle'
    },
    ERROR: {
        id: 'error',
        name: 'Erreur',
        color: '#ef4444',
        icon: 'exclamation-circle'
    },
    MESSAGE: {
        id: 'message',
        name: 'Message',
        color: '#8b5cf6',
        icon: 'envelope'
    },
    QUEST: {
        id: 'quest',
        name: 'Quête',
        color: '#f59e0b',
        icon: 'scroll'
    },
    SHIFT: {
        id: 'shift',
        name: 'Shift',
        color: '#3b82f6',
        icon: 'calendar-alt'
    },
    TEAM: {
        id: 'team',
        name: 'Équipe',
        color: '#10b981',
        icon: 'users'
    },
    SYSTEM: {
        id: 'system',
        name: 'Système',
        color: '#6b7280',
        icon: 'cog'
    }
};

/**
 * Badges et achievements
 */
export const BADGES = {
    FIRST_QUEST: {
        id: 'first_quest',
        name: 'Première quête',
        description: 'Première quête terminée',
        icon: 'trophy',
        color: '#f59e0b',
        xp: 10
    },
    QUEST_MASTER: {
        id: 'quest_master',
        name: 'Maître des quêtes',
        description: '10 quêtes terminées',
        icon: 'crown',
        color: '#8b5cf6',
        xp: 50
    },
    QUEST_LEGEND: {
        id: 'quest_legend',
        name: 'Légende des quêtes',
        description: '50 quêtes terminées',
        icon: 'star',
        color: '#ef4444',
        xp: 200
    },
    TEAM_PLAYER: {
        id: 'team_player',
        name: 'Joueur d\'équipe',
        description: '5 collaborations réussies',
        icon: 'handshake',
        color: '#10b981',
        xp: 30
    },
    PUNCTUAL: {
        id: 'punctual',
        name: 'Ponctuel',
        description: '7 jours de pointage parfait',
        icon: 'clock',
        color: '#3b82f6',
        xp: 25
    },
    COMMUNICATOR: {
        id: 'communicator',
        name: 'Communicateur',
        description: '100 messages envoyés',
        icon: 'comments',
        color: '#8b5cf6',
        xp: 20
    }
};

/**
 * Paramètres de gamification
 */
export const GAMIFICATION = {
    XP_PER_LEVEL: 100,
    MAX_LEVEL: 50,
    
    XP_REWARDS: {
        QUEST_DAILY: 10,
        QUEST_WEEKLY: 25,
        QUEST_SPECIAL: 50,
        PERFECT_DAY: 20,
        TEAM_COLLABORATION: 15,
        PUNCTUALITY: 5,
        MESSAGE_SENT: 1,
        SHIFT_COMPLETED: 30
    },
    
    STREAK_MULTIPLIERS: {
        3: 1.1,   // +10% après 3 jours
        7: 1.2,   // +20% après 1 semaine
        14: 1.3,  // +30% après 2 semaines
        30: 1.5   // +50% après 1 mois
    }
};

/**
 * Limites et contraintes
 */
export const LIMITS = {
    MAX_TEAM_MEMBERS: 50,
    MAX_QUESTS_PER_USER: 10,
    MAX_MESSAGE_LENGTH: 1000,
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_AVATAR_SIZE: 2 * 1024 * 1024, // 2MB
    
    CACHE_TTL: {
        SHORT: 5 * 60 * 1000,      // 5 minutes
        MEDIUM: 30 * 60 * 1000,    // 30 minutes
        LONG: 60 * 60 * 1000,      // 1 heure
        VERY_LONG: 24 * 60 * 60 * 1000 // 24 heures
    },
    
    PAGINATION: {
        DEFAULT_SIZE: 20,
        MAX_SIZE: 100
    }
};

/**
 * Messages d'erreur
 */
export const ERROR_MESSAGES = {
    NETWORK: 'Erreur de connexion réseau',
    PERMISSION_DENIED: 'Permission refusée',
    NOT_FOUND: 'Élément non trouvé',
    VALIDATION_ERROR: 'Erreur de validation des données',
    SERVER_ERROR: 'Erreur serveur',
    TIMEOUT: 'Délai d\'attente dépassé',
    OFFLINE: 'Mode hors ligne - fonctionnalités limitées',
    
    AUTH: {
        INVALID_CREDENTIALS: 'Identifiants invalides',
        USER_NOT_FOUND: 'Utilisateur non trouvé',
        EMAIL_ALREADY_EXISTS: 'Email déjà utilisé',
        WEAK_PASSWORD: 'Mot de passe trop faible',
        SESSION_EXPIRED: 'Session expirée'
    },
    
    VALIDATION: {
        REQUIRED_FIELD: 'Ce champ est obligatoire',
        INVALID_EMAIL: 'Email invalide',
        INVALID_PASSWORD: 'Mot de passe invalide',
        INVALID_PHONE: 'Numéro de téléphone invalide',
        INVALID_DATE: 'Date invalide',
        INVALID_TIME: 'Heure invalide',
        TOO_LONG: 'Texte trop long',
        TOO_SHORT: 'Texte trop court'
    }
};

/**
 * Messages de succès
 */
export const SUCCESS_MESSAGES = {
    SAVED: 'Sauvegardé avec succès',
    CREATED: 'Créé avec succès',
    UPDATED: 'Mis à jour avec succès',
    DELETED: 'Supprimé avec succès',
    SENT: 'Envoyé avec succès',
    
    QUEST_COMPLETED: 'Quête terminée!',
    LEVEL_UP: 'Niveau supérieur atteint!',
    BADGE_EARNED: 'Badge obtenu!',
    SHIFT_ASSIGNED: 'Shift assigné',
    LEAVE_REQUESTED: 'Demande de congé envoyée',
    MESSAGE_SENT: 'Message envoyé'
};

/**
 * Configuration des vues
 */
export const VIEW_CONFIG = {
    CALENDAR: {
        DEFAULT_VIEW: 'week',
        START_HOUR: 6,
        END_HOUR: 24,
        SLOT_DURATION: 30, // minutes
        WEEK_START: 1 // Lundi
    },
    
    PAGINATION: {
        NOTIFICATIONS: 20,
        MESSAGES: 50,
        QUESTS: 25,
        TEAM_MEMBERS: 20
    }
};

/**
 * Thèmes et couleurs
 */
export const THEME = {
    PRIMARY: '#6d28d9',
    SECONDARY: '#7c3aed',
    ACCENT: '#a78bfa',
    
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    INFO: '#3b82f6',
    
    BACKGROUND: {
        PRIMARY: '#0a0a0f',
        SECONDARY: 'rgba(10, 10, 20, 0.98)',
        CARD: 'rgba(15, 15, 25, 0.95)'
    },
    
    TEXT: {
        PRIMARY: '#ffffff',
        SECONDARY: 'rgba(255, 255, 255, 0.7)',
        MUTED: 'rgba(255, 255, 255, 0.4)'
    }
};

/**
 * Clés de stockage local
 */
export const STORAGE_KEYS = {
    USER_PREFERENCES: 'synergia_user_preferences',
    NOTIFICATION_SETTINGS: 'synergia_notification_settings',
    CACHE: 'synergia_cache',
    SYNC_QUEUE: 'synergia_sync_queue',
    LAST_SYNC: 'synergia_last_sync',
    THEME: 'synergia_theme',
    LANGUAGE: 'synergia_language'
};

/**
 * Événements personnalisés
 */
export const EVENTS = {
    // Firebase
    FIREBASE_READY: 'firebase:ready',
    
    // Auth
    AUTH_LOGIN: 'auth:login',
    AUTH_LOGOUT: 'auth:logout',
    AUTH_ERROR: 'auth:error',
    
    // Navigation
    PAGE_CHANGE: 'page:change',
    ROUTE_CHANGE: 'route:change',
    
    // Data
    DATA_LOADED: 'data:loaded',
    DATA_ERROR: 'data:error',
    DATA_SYNC: 'data:sync',
    
    // UI
    MODAL_OPEN: 'modal:open',
    MODAL_CLOSE: 'modal:close',
    TOAST_SHOW: 'toast:show',
    
    // Notifications
    NOTIFICATION_RECEIVED: 'notification:received',
    NOTIFICATION_READ: 'notification:read',
    
    // Responsive
    RESPONSIVE_CHANGE: 'responsive:change'
};

/**
 * Export par défaut de toutes les constantes
 */
export default {
    APP_INFO,
    URLS,
    FIREBASE_CONFIG,
    COLLECTIONS,
    ROLES,
    PERMISSIONS,
    QUEST_TYPES,
    PRIORITIES,
    STATUSES,
    EVENT_TYPES,
    LEAVE_TYPES,
    BREAK_TYPES,
    NOTIFICATION_TYPES,
    BADGES,
    GAMIFICATION,
    LIMITS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    VIEW_CONFIG,
    THEME,
    STORAGE_KEYS,
    EVENTS
};
