/**
 * Service Firebase pour SYNERGIA v3.0
 * Fichier: src/js/core/firebase-service.js
 * 
 * Gestion centralisée de Firebase
 */
class FirebaseService {
    constructor() {
        this.app = null;
        this.auth = null;
        this.firestore = null;
        this.analytics = null;
        this.isInitialized = false;
        this.initPromise = null;
        
        // Démarrer l'initialisation immédiatement
        this.initPromise = this.initialize();
    }

    /**
     * Initialise Firebase
     */
    async initialize() {
        try {
            console.log('🔥 Initialisation Firebase...');
            
            // Vérifier que la config est disponible
            if (!window.FIREBASE_CONFIG) {
                throw new Error('Configuration Firebase manquante');
            }

            // Vérifier que Firebase est chargé
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK non chargé');
            }

            // Initialiser l'app Firebase
            this.app = firebase.initializeApp(window.FIREBASE_CONFIG);
            
            // Initialiser les services
            this.auth = firebase.auth();
            this.firestore = firebase.firestore();
            
            // Configurer Firestore
            this.configureFirestore();
            
            // Initialiser Analytics si disponible
            if (typeof firebase.analytics !== 'undefined') {
                try {
                    this.analytics = firebase.analytics();
                    console.log('📊 Firebase Analytics initialisé');
                } catch (analyticsError) {
                    console.warn('⚠️ Analytics non disponible:', analyticsError.message);
                }
            }

            this.isInitialized = true;
            console.log('✅ Firebase initialisé avec succès');
            
            // Émettre événement d'initialisation
            this.emit('firebase:ready');
            
            return true;
            
        } catch (error) {
            console.error('❌ Erreur initialisation Firebase:', error);
            this.handleInitializationError(error);
            throw error;
        }
    }

    /**
     * Configure Firestore avec les paramètres optimaux
     */
    configureFirestore() {
        try {
            // Activer la persistance hors ligne
            this.firestore.enablePersistence({
                synchronizeTabs: true
            }).catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn('⚠️ Persistance Firestore: plusieurs onglets ouverts');
                } else if (err.code === 'unimplemented') {
                    console.warn('⚠️ Persistance Firestore non supportée par ce navigateur');
                }
            });

            // Configuration des paramètres Firestore
            this.firestore.settings({
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
            });

            console.log('⚙️ Firestore configuré');
            
        } catch (error) {
            console.warn('⚠️ Erreur configuration Firestore:', error);
        }
    }

    /**
     * Attend que Firebase soit initialisé
     * @returns {Promise<boolean>}
     */
    async waitForInitialization() {
        if (this.isInitialized) {
            return true;
        }
        
        if (this.initPromise) {
            await this.initPromise;
            return this.isInitialized;
        }
        
        // Si pas de promesse d'init, relancer
        this.initPromise = this.initialize();
        await this.initPromise;
        return this.isInitialized;
    }

    /**
     * Gère les erreurs d'initialisation
     * @param {Error} error 
     */
    handleInitializationError(error) {
        const errorInfo = {
            type: 'initialization',
            code: error.code || 'unknown',
            message: error.message,
            timestamp: new Date()
        };

        // Émettre événement d'erreur
        this.emit('firebase:error', errorInfo);

        // Messages d'erreur personnalisés
        const errorMessages = {
            'app/duplicate-app': 'Firebase déjà initialisé',
            'app/invalid-api-key': 'Clé API Firebase invalide',
            'app/project-not-found': 'Projet Firebase non trouvé',
            'network-request-failed': 'Problème de connexion réseau'
        };

        const userMessage = errorMessages[error.code] || 'Erreur d\'initialisation Firebase';
        console.error('🔥 Firebase Error:', userMessage);
    }

    /**
     * Récupère l'instance Auth
     * @returns {firebase.auth.Auth}
     */
    getAuth() {
        if (!this.isInitialized) {
            throw new Error('Firebase non initialisé');
        }
        return this.auth;
    }

    /**
     * Récupère l'instance Firestore
     * @returns {firebase.firestore.Firestore}
     */
    getFirestore() {
        if (!this.isInitialized) {
            throw new Error('Firebase non initialisé');
        }
        return this.firestore;
    }

    /**
     * Récupère l'instance Analytics
     * @returns {firebase.analytics.Analytics|null}
     */
    getAnalytics() {
        return this.analytics;
    }

    /**
     * Récupère l'instance App
     * @returns {firebase.app.App}
     */
    getApp() {
        return this.app;
    }

    // ==================
    // MÉTHODES UTILITAIRES FIRESTORE
    // ==================

    /**
     * Ajoute un document à une collection
     * @param {string} collection - Nom de la collection
     * @param {Object} data - Données à ajouter
     * @returns {Promise<string>} - ID du document créé
     */
    async addDocument(collection, data) {
        try {
            const docRef = await this.firestore.collection(collection).add({
                ...data,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`📄 Document ajouté: ${collection}/${docRef.id}`);
            return docRef.id;
            
        } catch (error) {
            console.error(`❌ Erreur ajout document ${collection}:`, error);
            throw this.handleError(error);
        }
    }

    /**
     * Met à jour un document
     * @param {string} collection - Nom de la collection
     * @param {string} docId - ID du document
     * @param {Object} data - Données à mettre à jour
     * @returns {Promise<void>}
     */
    async updateDocument(collection, docId, data) {
        try {
            await this.firestore.collection(collection).doc(docId).update({
                ...data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`📝 Document mis à jour: ${collection}/${docId}`);
            
        } catch (error) {
            console.error(`❌ Erreur MAJ document ${collection}/${docId}:`, error);
            throw this.handleError(error);
        }
    }

    /**
     * Supprime un document
     * @param {string} collection - Nom de la collection
     * @param {string} docId - ID du document
     * @returns {Promise<void>}
     */
    async deleteDocument(collection, docId) {
        try {
            await this.firestore.collection(collection).doc(docId).delete();
            console.log(`🗑️ Document supprimé: ${collection}/${docId}`);
            
        } catch (error) {
            console.error(`❌ Erreur suppression document ${collection}/${docId}:`, error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupère un document par ID
     * @param {string} collection - Nom de la collection
     * @param {string} docId - ID du document
     * @returns {Promise<Object|null>}
     */
    async getDocument(collection, docId) {
        try {
            const doc = await this.firestore.collection(collection).doc(docId).get();
            
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            
            return null;
            
        } catch (error) {
            console.error(`❌ Erreur récupération document ${collection}/${docId}:`, error);
            throw this.handleError(error);
        }
    }

    /**
     * Récupère une collection avec options
     * @param {string} collection - Nom de la collection
     * @param {Object} options - Options de requête
     * @returns {Promise<Array>}
     */
    async getCollection(collection, options = {}) {
        try {
            let query = this.firestore.collection(collection);
            
            // Appliquer les filtres
            if (options.where) {
                if (Array.isArray(options.where)) {
                    options.where.forEach(condition => {
                        query = query.where(condition.field, condition.operator, condition.value);
                    });
                } else {
                    query = query.where(options.where.field, options.where.operator, options.where.value);
                }
            }
            
            // Appliquer l'ordre
            if (options.orderBy) {
                query = query.orderBy(options.orderBy.field, options.orderBy.direction || 'asc');
            }
            
            // Appliquer la limite
            if (options.limit) {
                query = query.limit(options.limit);
            }
            
            const snapshot = await query.get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
        } catch (error) {
            console.error(`❌ Erreur récupération collection ${collection}:`, error);
            throw this.handleError(error);
        }
    }

    /**
     * Écoute les changements d'une collection en temps réel
     * @param {string} collection - Nom de la collection
     * @param {Function} callback - Fonction de callback
     * @param {Object} options - Options de requête
     * @returns {Function} - Fonction pour arrêter l'écoute
     */
    onSnapshot(collection, callback, options = {}) {
        try {
            let query = this.firestore.collection(collection);
            
            // Appliquer les options comme pour getCollection
            if (options.where) {
                if (Array.isArray(options.where)) {
                    options.where.forEach(condition => {
                        query = query.where(condition.field, condition.operator, condition.value);
                    });
                } else {
                    query = query.where(options.where.field, options.where.operator, options.where.value);
                }
            }
            
            if (options.orderBy) {
                query = query.orderBy(options.orderBy.field, options.orderBy.direction || 'asc');
            }
            
            if (options.limit) {
                query = query.limit(options.limit);
            }
            
            return query.onSnapshot(
                (snapshot) => {
                    const docs = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    callback(docs);
                },
                (error) => {
                    console.error(`❌ Erreur snapshot ${collection}:`, error);
                    this.handleError(error);
                }
            );
            
        } catch (error) {
            console.error(`❌ Erreur écoute ${collection}:`, error);
            throw this.handleError(error);
        }
    }

    // ==================
    // GESTION DES ERREURS
    // ==================

    /**
     * Gère et formate les erreurs Firebase
     * @param {Error} error 
     * @returns {Object}
     */
    handleError(error) {
        const errorInfo = {
            type: 'firebase',
            code: error.code || 'unknown',
            message: error.message || 'Erreur inconnue',
            timestamp: new Date()
        };

        // Messages d'erreur personnalisés en français
        const errorMessages = {
            'permission-denied': 'Permissions insuffisantes',
            'not-found': 'Document non trouvé',
            'already-exists': 'Document déjà existant',
            'failed-precondition': 'Condition préalable non remplie',
            'aborted': 'Opération annulée',
            'out-of-range': 'Valeur hors limites',
            'unimplemented': 'Fonctionnalité non implémentée',
            'internal': 'Erreur interne du serveur',
            'unavailable': 'Service temporairement indisponible',
            'data-loss': 'Perte de données',
            'unauthenticated': 'Authentification requise',
            'network-request-failed': 'Problème de connexion réseau'
        };

        errorInfo.userMessage = errorMessages[error.code] || error.message;

        // Émettre l'erreur pour les autres composants
        this.emit('firebase:error', errorInfo);

        return errorInfo;
    }

    // ==================
    // ANALYTICS
    // ==================

    /**
     * Enregistre un événement Analytics
     * @param {string} eventName - Nom de l'événement
     * @param {Object} eventParams - Paramètres de l'événement
     */
    logEvent(eventName, eventParams = {}) {
        try {
            if (this.analytics) {
                this.analytics.logEvent(eventName, {
                    ...eventParams,
                    timestamp: Date.now()
                });
                
                console.log(`📊 Analytics: ${eventName}`, eventParams);
            }
        } catch (error) {
            console.warn('⚠️ Erreur Analytics:', error);
        }
    }

    /**
     * Définit les propriétés utilisateur pour Analytics
     * @param {Object} userProperties 
     */
    setUserProperties(userProperties) {
        try {
            if (this.analytics) {
                this.analytics.setUserProperties(userProperties);
                console.log('📊 Propriétés utilisateur Analytics définies');
            }
        } catch (error) {
            console.warn('⚠️ Erreur propriétés utilisateur Analytics:', error);
        }
    }

    // ==================
    // UTILITAIRES
    // ==================

    /**
     * Vérifie l'état de la connexion
     * @returns {Promise<boolean>}
     */
    async checkConnection() {
        try {
            // Essayer de lire les règles Firestore (requête rapide)
            await this.firestore.doc('__connection_test__/test').get();
            return true;
        } catch (error) {
            if (error.code === 'unavailable') {
                return false;
            }
            // Autres erreurs = connexion OK mais autres problèmes
            return true;
        }
    }

    /**
     * Récupère les statistiques de cache Firestore
     * @returns {Object}
     */
    getCacheStats() {
        try {
            return {
                hasCache: true, // Simplified for now
                cacheSize: 'unknown'
            };
        } catch (error) {
            return { hasCache: false, cacheSize: 0 };
        }
    }

    /**
     * Efface le cache Firestore
     * @returns {Promise<void>}
     */
    async clearCache() {
        try {
            await this.firestore.clearPersistence();
            console.log('🧹 Cache Firestore effacé');
        } catch (error) {
            console.warn('⚠️ Impossible d\'effacer le cache:', error);
        }
    }

    /**
     * Émet un événement
     * @param {string} eventName 
     * @param {*} data 
     */
    emit(eventName, data = null) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
        window.dispatchEvent(event);
    }

    /**
     * Nettoyage lors de la destruction
     */
    destroy() {
        try {
            if (this.app) {
                // Note: firebase.app().delete() peut causer des problèmes
                // On se contente de nettoyer les références
                this.auth = null;
                this.firestore = null;
                this.analytics = null;
                this.app = null;
            }
            
            this.isInitialized = false;
            console.log('🧹 Firebase Service nettoyé');
            
        } catch (error) {
            console.error('❌ Erreur nettoyage Firebase:', error);
        }
    }

    // ==================
    // INFORMATIONS DE DIAGNOSTIC
    // ==================

    /**
     * Récupère les informations de diagnostic
     * @returns {Object}
     */
    getDiagnostics() {
        return {
            isInitialized: this.isInitialized,
            hasAuth: !!this.auth,
            hasFirestore: !!this.firestore,
            hasAnalytics: !!this.analytics,
            appName: this.app?.name || 'unknown',
            config: {
                projectId: window.FIREBASE_CONFIG?.projectId || 'unknown',
                authDomain: window.FIREBASE_CONFIG?.authDomain || 'unknown'
            },
            timestamp: new Date()
        };
    }
}

// Export pour utilisation globale
window.FirebaseService = FirebaseService;
