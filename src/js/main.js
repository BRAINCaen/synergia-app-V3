// src/js/main.js
// Point d'entrée principal SYNERGIA v3.0 avec Vite

// Import Firebase ES6 avec chemins absolus
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAnalytics } from 'firebase/analytics'

// Import Chart.js ES6
import {
    Chart,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    BarElement
} from 'chart.js'

// Registrer les composants Chart.js
Chart.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
)

// Exposer Chart globalement pour compatibilité
window.Chart = Chart

// Import des styles CSS
import '../styles/main.css'

// Configuration Firebase avec variables Vite
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

// Configuration globale
const CONFIG = {
    version: '3.0.0',
    environment: import.meta.env.DEV ? 'development' : 'production',
    debug: import.meta.env.DEV,
    firebase: firebaseConfig
}

// Initialiser Firebase
console.log('🔥 Initialisation Firebase avec Vite...')
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)
const analytics = getAnalytics(app)

// Exposer Firebase globalement pour compatibilité avec ton code existant
window.firebase = {
    app,
    auth: () => auth,
    firestore: () => db,
    storage: () => storage,
    analytics: () => analytics
}

// Exposer les instances directement aussi
window.auth = auth
window.db = db
window.storage = storage

console.log('✅ Firebase initialisé avec Vite!')

// Logger simple pour remplacer temporairement
const logger = {
    info: (...args) => console.log('📘', ...args),
    error: (...args) => console.error('❌', ...args),
    warn: (...args) => console.warn('⚠️', ...args)
}

// Animation de la barre de progression
function animateLoadingProgress() {
    const progressBar = document.getElementById('progress-bar')
    if (!progressBar) return
    
    const steps = [
        { percent: 20, duration: 300, label: 'Initialisation Firebase...' },
        { percent: 40, duration: 200, label: 'Chargement des modules...' },
        { percent: 60, duration: 300, label: 'Configuration Vite...' },
        { percent: 80, duration: 200, label: 'Préparation de l\'interface...' },
        { percent: 100, duration: 150, label: 'Finalisation...' }
    ]
    
    let currentStep = 0
    
    function nextStep() {
        if (currentStep >= steps.length) return
        
        const step = steps[currentStep]
        progressBar.style.width = `${step.percent}%`
        
        const statusElement = document.querySelector('.loading-content p')
        if (statusElement && step.label) {
            statusElement.textContent = step.label
        }
        
        currentStep++
        
        if (currentStep < steps.length) {
            setTimeout(nextStep, step.duration)
        } else {
            // Quand terminé, charger l'ancienne logique
            setTimeout(loadLegacyApp, 300)
        }
    }
    
    setTimeout(nextStep, 100)
}

// Masquer l'écran de chargement
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen')
    const appContainer = document.getElementById('app')
    
    if (loadingScreen && appContainer) {
        loadingScreen.style.opacity = '0'
        loadingScreen.style.transform = 'scale(0.95)'
        
        setTimeout(() => {
            loadingScreen.style.display = 'none'
            appContainer.style.display = 'grid'
            
            appContainer.style.opacity = '0'
            appContainer.style.transform = 'translateY(20px)'
            
            requestAnimationFrame(() => {
                appContainer.style.transition = 'all 0.5s ease'
                appContainer.style.opacity = '1'
                appContainer.style.transform = 'translateY(0)'
            })
        }, 300)
    }
}

// Charger l'ancienne logique (temporaire, pour migration progressive)
async function loadLegacyApp() {
    try {
        logger.info('🚀 Démarrage SYNERGIA v3.0 avec Vite')
        
        // Émettre l'événement firebase:ready pour les anciens managers
        document.dispatchEvent(new CustomEvent('firebase:ready', { 
            detail: { auth, db, storage, analytics } 
        }))
        
        // Importer et démarrer tes managers existants
        // (On les importera progressivement)
        
        // Pour l'instant, juste afficher l'app
        hideLoadingScreen()
        
        logger.info('✅ SYNERGIA démarré avec Vite!')
        
        // Exposer pour debug
        if (CONFIG.debug) {
            window.CONFIG = CONFIG
            logger.info('🔧 Mode debug - Firebase et Config disponibles sur window')
        }
        
    } catch (error) {
        logger.error('❌ Erreur lors de l\'initialisation:', error)
        showCriticalError(error)
    }
}

// Affichage d'erreur critique
function showCriticalError(error) {
    const loadingScreen = document.getElementById('loading-screen')
    if (loadingScreen) {
        loadingScreen.innerHTML = `
            <div style="text-align: center; color: white; max-width: 500px; padding: 2rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 4rem; margin-bottom: 2rem; color: #ef4444;"></i>
                <h1>Erreur de démarrage</h1>
                <p>Une erreur critique a empêché le démarrage de SYNERGIA.</p>
                ${CONFIG.debug ? `
                    <details style="margin-top: 2rem; text-align: left;">
                        <summary>Détails de l'erreur (mode debug)</summary>
                        <pre style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; overflow: auto; margin-top: 1rem;">${error.stack || error.message}</pre>
                    </details>
                ` : ''}
                <button onclick="location.reload()" style="margin-top: 2rem; padding: 1rem 2rem; background: #6d28d9; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                    Recharger l'application
                </button>
            </div>
        `
    }
}

// Hot Module Replacement pour le développement
if (import.meta.hot) {
    import.meta.hot.accept()
    logger.info('🔥 Hot Module Replacement activé')
}

// Démarrage de l'application
document.addEventListener('DOMContentLoaded', () => {
    logger.info('DOM prêt avec Vite, initialisation Firebase...')
    animateLoadingProgress()
})

// Gestion du rechargement
window.addEventListener('beforeunload', () => {
    logger.info('Nettoyage avant fermeture...')
})

console.log('🚀 SYNERGIA v3.0 avec Vite - Point d\'entrée chargé!')
