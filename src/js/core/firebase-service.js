/**
 * Service Firebase pour SYNERGIA v3.0
 * Fichier: src/js/core/firebase-service.js
 */
class FirebaseService {
    constructor() {
        this.app = null;
        this.auth = null;
        this.firestore = null;
        this.isInitialized = false;
        this.initPromise = null;
        
        this.init();
    }

    /**
     * Initialise Firebase
     */
    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._initialize();
        return this.initPromise;
    }

    async _initialize() {
        try {
            console.log('🔥 Initialisation Firebase...');

            // Vérifier que Firebase est disponible
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK non chargé');
            }

            // Vérifier la configuration
            if (!window.FIREBASE_CONFIG) {
                throw new Error('Configuration Firebase manquante');
            }

            // Initialiser Firebase App
            if (!firebase.apps.length) {
                this.app = firebase.initializeApp(window.FIREBASE_CONFIG);
            } else {
                this.app = firebase.app();
            }

            // Initialiser les services
            this.auth = firebase.auth();
            this.firestore = firebase.firestore();

            // Configuration Firestore
            this.firestore.settings({
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
            });

            // Activer la persistance offline
            try {
                await this.firestore.enablePersistence({
                    synchronizeTabs: true
                });
                console.log('✅ Persistance Firestore activée');
            } catch (persistenceError) {
                if (persistenceError.code === 'failed-precondition') {
                    console.warn('⚠️ Persistance échouée: plusieurs onglets ouverts');
                } else if (persistenceError.code === 'unimplemented') {
                    console.warn('⚠️ Persistance non supportée par ce navigateur');
                } else {
                    console.warn('⚠️ Erreur persistance:', persistenceError);
                }
            }

            this.isInitialized = true;
            console.log('✅ Firebase Service initialisé');

            // Émettre l'événement
            this.emit('firebase:ready');

            return this;

        } catch (error) {
            console.error('❌ Erreur initialisation Firebase:', error);
            throw error;
        }
    }

    /**
     * Attend que Firebase soit initialisé
     */
    async waitForInitialization() {
        if (this.isInitialized) {
            return this;
        }

        if (this.initPromise) {
            return this.initPromise;
        }

        return this.init();
    }

    /**
     * Récupère l'instance Auth
     */
    getAuth() {
        if (!this.isInitialized) {
            throw new Error('Firebase non initialisé');
        }
        return this.auth;
    }

    /**
     * Récupère l'instance Firestore
     */
    getFirestore() {
        if (!this.isInitialized) {
            throw new Error('Firebase non initialisé');
        }
        return this.firestore;
    }

    /**
     * Récupère l'instance App
     */
    getApp() {
        return this.app;
    }

    /**
     * Gestion des erreurs Firebase
     */
    handleError(error) {
        const errorInfo = {
            code: error.code || 'unknown',
            message: error.message || 'Erreur inconnue',
            type: 'firebase',
            timestamp: new Date()
        };

        // Messages d'erreur personnalisés
        const errorMessages = {
            'auth/network-request-failed': 'Problème de connexion réseau',
            'auth/too-many-requests': 'Trop de tentatives, réessayez plus tard',
            'auth/user-disabled': 'Compte utilisateur désactivé',
            'auth/user-not-found': 'Utilisateur non trouvé',
            'auth/wrong-password': 'Mot de passe incorrect',
            'auth/invalid-email': 'Adresse email invalide',
            'auth/email-already-in-use': 'Cette adresse email est déjà utilisée',
            'auth/weak-password': 'Mot de passe trop faible',
            'auth/popup-closed-by-user': 'Popup fermée par l\'utilisateur',
            'auth/unauthorized-domain': 'Domaine non autorisé',
            'firestore/permission-denied': 'Permission refusée',
            'firestore/unavailable': 'Service temporairement indisponible',
            'firestore/unauthenticated': 'Authentification requise'
        };

        errorInfo.userMessage = errorMessages[error.code] || error.message;

        console.error('❌ Erreur Firebase:', errorInfo);
        return errorInfo;
    }

    /**
     * Vérifie la connectivité
     */
    async checkConnectivity() {
        try {
            // Tenter une opération simple
            await this.firestore.collection('_connectivity').limit(1).get();
            return true;
        } catch (error) {
            console.warn('⚠️ Connectivité Firebase limitée');
            return false;
        }
    }

    /**
     * Émet un événement
     */
    emit(eventName, data = null) {
        const event = new CustomEvent(eventName, { detail: data });
        window.dispatchEvent(event);
    }

    /**
     * État de l'initialisation
     */
    getInitializationState() {
        return {
            isInitialized: this.isInitialized,
            hasAuth: !!this.auth,
            hasFirestore: !!this.firestore,
            hasApp: !!this.app
        };
    }

    /**
     * Nettoyage
     */
    destroy() {
        this.isInitialized = false;
        this.auth = null;
        this.firestore = null;
        this.app = null;
        this.initPromise = null;
        console.log('🧹 Firebase Service nettoyé');
    }
}

// Créer l'instance globale
window.FirebaseService = FirebaseService;

// Auto-initialisation si la configuration est disponible
if (typeof window !== 'undefined' && window.FIREBASE_CONFIG) {
    window.firebaseService = new FirebaseService();
}
