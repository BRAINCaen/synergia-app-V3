/**
 * Configuration Firebase pour SYNERGIA v3.0
 * Fichier: src/js/config.js
 */

// Configuration Firebase - SYNERGIA
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyD7uBuAQaOhZ02owkZEuMKC5Vji6PrB2f8",
    authDomain: "synergia-app-f27e7.firebaseapp.com",
    projectId: "synergia-app-f27e7",
    storageBucket: "synergia-app-f27e7.firebasestorage.app",
    messagingSenderId: "201912738922",
    appId: "1:201912738922:web:2fcc1e49293bb632899613",
    measurementId: "G-EGJ79SCMWX"
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
