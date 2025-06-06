// src/js/main.js
// Point d'entrée principal SYNERGIA v3.0 avec Vite

console.log('🚀 Démarrage SYNERGIA avec Vite...')

// Import Firebase ES6 (remplace TOUS les CDN)
import { initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAnalytics } from 'firebase/analytics'

// Configuration Firebase avec variables Vite
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD7uBuAQaOhZ02owkZEuMKC5Vji6PrB2f8",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "synergia-app-f27e7.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "synergia-app-f27e7",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "synergia-app-f27e7.appspot.com",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "201912738922",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:201912738922:web:2fcc1e49293bb632899613",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-EGJ79SCMWX"
}

console.log('🔥 Configuration Firebase:', firebaseConfig)

// Initialiser Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)
const analytics = getAnalytics(app)

console.log('✅ Firebase initialisé avec Vite!')

// Exposer Firebase globalement pour compatibilité avec l'ancien code
window.firebase = {
    app,
    auth: () => auth,
    firestore: () => db,
    storage: () => storage,
    analytics: () => analytics,
    // Ajout des fonctions compat
    initializeApp: () => app,
    getAuth: () => auth,
    getFirestore: () => db
}

// Exposer les instances directement
window.auth = auth
window.db = db
window.storage = storage
window.analytics = analytics

// Logger
const logger = {
    info: (...args) => console.log('📘 INFO:', ...args),
    error: (...args) => console.error('❌ ERROR:', ...args),
    warn: (...args) => console.warn('⚠️ WARN:', ...args)
}

// Animation de chargement
function animateLoadingProgress() {
    const progressBar = document.getElementById('progress-bar')
    if (!progressBar) return
    
    const steps = [
        { percent: 25, duration: 200, label: 'Initialisation Firebase...' },
        { percent: 50, duration: 300, label: 'Configuration Vite...' },
        { percent: 75, duration: 200, label: 'Chargement des modules...' },
        { percent: 100, duration: 300, label: 'Finalisation...' }
    ]
    
    let currentStep = 0
    
    function nextStep() {
        if (currentStep >= steps.length) {
            setTimeout(showApp, 500)
            return
        }
        
        const step = steps[currentStep]
        progressBar.style.width = `${step.percent}%`
        
        const statusElement = document.querySelector('.loading-content p')
        if (statusElement) {
            statusElement.textContent = step.label
        }
        
        currentStep++
        setTimeout(nextStep, step.duration)
    }
    
    nextStep()
}

// Afficher l'application
function showApp() {
    const loadingScreen = document.getElementById('loading-screen')
    const appContainer = document.getElementById('app')
    const firebaseStatus = document.getElementById('firebase-status')
    
    if (firebaseStatus) {
        firebaseStatus.innerHTML = `
            ✅ Firebase initialisé via Vite<br>
            🔥 Auth: ${auth ? 'OK' : 'KO'}<br>
            📄 Firestore: ${db ? 'OK' : 'KO'}<br>
            📊 Analytics: ${analytics ? 'OK' : 'KO'}
        `
    }
    
    if (loadingScreen && appContainer) {
        loadingScreen.style.opacity = '0'
        setTimeout(() => {
            loadingScreen.style.display = 'none'
            appContainer.style.display = 'grid'
            appContainer.style.opacity = '1'
        }, 300)
    }
    
    logger.info('✅ SYNERGIA v3.0 démarré avec Vite!')
}

// Gestion d'erreur
function showError(error) {
    logger.error('Erreur critique:', error)
    
    const loadingScreen = document.getElementById('loading-screen')
    if (loadingScreen) {
        loadingScreen.innerHTML = `
            <div style="text-align: center; color: white; padding: 2rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #ef4444; margin-bottom: 1rem;"></i>
                <h2>Erreur de démarrage</h2>
                <p>Impossible d'initialiser SYNERGIA</p>
                <pre style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; margin: 1rem 0; text-align: left; font-size: 0.8rem;">
${error.message}</pre>
                <button onclick="location.reload()" style="padding: 1rem 2rem; background: #6d28d9; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Recharger
                </button>
            </div>
        `
    }
}

// Écouter l'état d'authentification
onAuthStateChanged(auth, (user) => {
    if (user) {
        logger.info('👤 Utilisateur connecté:', user.email)
        // Émettre l'événement pour compatibilité
        document.dispatchEvent(new CustomEvent('auth:login', { detail: { user } }))
    } else {
        logger.info('👤 Utilisateur déconnecté')
        document.dispatchEvent(new CustomEvent('auth:logout'))
    }
})

// Émettre l'événement firebase:ready pour les anciens managers
document.dispatchEvent(new CustomEvent('firebase:ready', {
    detail: { auth, db, storage, analytics }
}))

// Hot Module Replacement pour le dev
if (import.meta.hot) {
    import.meta.hot.accept()
    logger.info('🔥 Hot Module Replacement activé')
}

// Démarrage
document.addEventListener('DOMContentLoaded', () => {
    logger.info('📄 DOM prêt, démarrage de l\'animation...')
    
    try {
        animateLoadingProgress()
    } catch (error) {
        showError(error)
    }
})

// Exposer pour debug
if (import.meta.env.DEV) {
    window.firebaseConfig = firebaseConfig
    window.logger = logger
    logger.info('🔧 Mode debug - Variables exposées sur window')
}

console.log('🎯 Point d\'entrée Vite chargé - Firebase ready!')
