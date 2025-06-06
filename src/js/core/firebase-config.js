/**
 * Configuration Firebase pour SYNERGIA v3.0
 * Fichier: src/js/config.js
 */

// Configuration Firebase (remplacez par vos vraies clés)
const FIREBASE_CONFIG = {
    apiKey: "votre-api-key",
    authDomain: "synergia-v3.firebaseapp.com",
    projectId: "synergia-v3",
    storageBucket: "synergia-v3.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// Configuration générale de l'app
const APP_CONFIG = {
    name: 'SYNERGIA v3.0',
    version: '3.0.0',
    environment: 'production', // 'development' | 'staging' | 'production'
    debug: false,
    
    // URLs et endpoints
    baseUrl: window.location.origin,
    apiUrl: '', // Si vous avez une API externe
    
    // Paramètres de l'interface
    ui: {
        theme: 'dark',
        language: 'fr',
        animations: true,
        notifications: true
    },
    
    // Paramètres Firebase
    firebase: {
        enableOffline: true,
        enableAnalytics: false,
        enablePerformance: false
    },
    
    // Paramètres de sécurité
    security: {
        sessionTimeout: 24 * 60 * 60 * 1000, // 24h en millisecondes
        maxLoginAttempts: 5,
        requireEmailVerification: false
    }
};

// Export des configurations
window.FIREBASE_CONFIG = FIREBASE_CONFIG;
window.APP_CONFIG = APP_CONFIG;
