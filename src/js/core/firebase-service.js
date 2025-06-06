/**
 * Module Firebase pour SYNERGIA v3.0
 * Configuration et initialisation centralisée
 */
class FirebaseService {
    constructor() {
        this.app = null;
        this.auth = null;
        this.firestore = null;
        this.isInitialized = false;
        this.config = null;
    }

    /**
     * Initialise Firebase avec la configuration
     * @param {Object} config - Configuration Firebase
     */
    async initialize(config) {
        try {
            this.config = config;
            
            // Initialisation de l'app Firebase
            this.app = firebase.initializeApp(config);
            
            // Initialisation des services
            this.auth = firebase.auth();
            this.firestore = firebase.firestore();
            
            // Initialisation d'Analytics si activé
            if (config.measurementId && typeof firebase.analytics !== 'undefined') {
                this.analytics = firebase.analytics();
                console.log('Firebase Analytics activé');
            }
            
            // Configuration de persistance
            await this.configurePersistence();
            
            // Configuration Firestore
            this.configureFirestore();
            
            this.isInitialized = true;
            console.log('Firebase initialisé avec succès');
            
            // Émission d'un événement global
            window.dispatchEvent(new CustomEvent('firebase:initialized'));
            
        } catch (error) {
            console.error('Erreur lors de l\'initialisation Firebase:', error);
            throw error;
        }
    }

    /**
     * Configure la persistance de l'authentification
     */
    async configurePersistence() {
        try {
            await this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        } catch (error) {
            console.warn('Impossible de configurer la persistance:', error);
        }
    }

    /**
     * Configure les paramètres Firestore
     */
    configureFirestore() {
        // Configuration pour une meilleure performance
        this.firestore.enableNetwork();
        
        // Configuration du cache hors ligne
        this.firestore.enablePersistence({
            synchronizeTabs: true
        }).catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('Persistance refusée: plusieurs onglets ouverts');
            } else if (err.code === 'unimplemented') {
                console.warn('Persistance non supportée par ce navigateur');
            }
        });
    }

    /**
     * Vérifie si Firebase est initialisé
     * @returns {boolean}
     */
    isReady() {
        return this.isInitialized;
    }

    /**
     * Attend que Firebase soit initialisé
     * @returns {Promise<void>}
     */
    waitForInitialization() {
        return new Promise((resolve) => {
            if (this.isInitialized) {
                resolve();
            } else {
                window.addEventListener('firebase:initialized', resolve, { once: true });
            }
        });
    }

    /**
     * Récupère l'instance Auth
     * @returns {firebase.auth.Auth}
     */
    getAuth() {
        if (!this.isInitialized) {
            throw new Error('Firebase n\'est pas encore initialisé');
        }
        return this.auth;
    }

    /**
     * Récupère l'instance Firestore
     * @returns {firebase.firestore.Firestore}
     */
    getFirestore() {
        if (!this.isInitialized) {
            throw new Error('Firebase n\'est pas encore initialisé');
        }
        return this.firestore;
    }

    /**
     * Récupère l'app Firebase
     * @returns {firebase.app.App}
     */
    getApp() {
        if (!this.isInitialized) {
            throw new Error('Firebase n\'est pas encore initialisé');
        }
        return this.app;
    }

    /**
     * Utilitaires pour Firestore
     */
    get utils() {
        return {
            // Référence à une collection
            collection: (path) => this.firestore.collection(path),
            
            // Référence à un document
            doc: (path) => this.firestore.doc(path),
            
            // Timestamp serveur
            serverTimestamp: () => firebase.firestore.FieldValue.serverTimestamp(),
            
            // Increment
            increment: (value) => firebase.firestore.FieldValue.increment(value),
            
            // Array union
            arrayUnion: (...elements) => firebase.firestore.FieldValue.arrayUnion(...elements),
            
            // Array remove
            arrayRemove: (...elements) => firebase.firestore.FieldValue.arrayRemove(...elements),
            
            // Delete field
            deleteField: () => firebase.firestore.FieldValue.delete(),
            
            // Batch operations
            batch: () => this.firestore.batch(),
            
            // Transaction
            runTransaction: (callback) => this.firestore.runTransaction(callback)
        };
    }

    /**
     * Utilitaires pour l'authentification
     */
    get authUtils() {
        return {
            // Google Auth Provider
            googleProvider: () => {
                const provider = new firebase.auth.GoogleAuthProvider();
                provider.addScope('email');
                provider.addScope('profile');
                return provider;
            },
            
            // Email Auth Provider
            emailProvider: firebase.auth.EmailAuthProvider,
            
            // Current user
            currentUser: () => this.auth.currentUser,
            
            // Sign out
            signOut: () => this.auth.signOut(),
            
            // Auth state observer
            onAuthStateChanged: (callback) => this.auth.onAuthStateChanged(callback)
        };
    }

    /**
     * Méthodes de debugging et monitoring
     */
    enableDebug() {
        if (this.isInitialized) {
            // Active les logs détaillés
            firebase.firestore.setLogLevel('debug');
        }
    }

    /**
     * Gestion des erreurs Firebase
     * @param {Error} error 
     * @returns {Object}
     */
    handleError(error) {
        const errorInfo = {
            code: error.code,
            message: error.message,
            type: 'firebase'
        };

        // Messages d'erreur personnalisés en français
        const errorMessages = {
            'auth/user-not-found': 'Utilisateur non trouvé',
            'auth/wrong-password': 'Mot de passe incorrect',
            'auth/email-already-in-use': 'Cette adresse email est déjà utilisée',
            'auth/weak-password': 'Le mot de passe est trop faible',
            'auth/invalid-email': 'Adresse email invalide',
            'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard',
            'permission-denied': 'Permissions insuffisantes',
            'unavailable': 'Service temporairement indisponible',
            'cancelled': 'Opération annulée',
            'deadline-exceeded': 'Délai d\'attente dépassé'
        };

        errorInfo.userMessage = errorMessages[error.code] || error.message;
        
        console.error('Erreur Firebase:', errorInfo);
        return errorInfo;
    }

    /**
     * Nettoyage des listeners
     */
    cleanup() {
        if (this.isInitialized) {
            // Déconnexion des listeners si nécessaire
            // this.auth.signOut();
        }
    }
}

// Instance globale du service Firebase
const firebaseService = new FirebaseService();

// Export pour les autres modules
window.firebaseService = firebaseService;
