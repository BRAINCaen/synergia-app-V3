/**
 * Firebase Service - Gestionnaire Firebase pour SYNERGIA v3.0
 * Fichier: src/js/core/firebase-service.js
 */

class FirebaseService {
    constructor() {
        this.app = null;
        this.auth = null;
        this.db = null;
        this.isInitialized = false;
        this.currentUser = null;
    }

    /**
     * Initialiser Firebase
     */
    async initialize() {
        try {
            // Configuration Firebase - À remplacer par votre config
            const firebaseConfig = {
                apiKey: "your-api-key",
                authDomain: "your-project.firebaseapp.com",
                projectId: "your-project-id",
                storageBucket: "your-project.appspot.com",
                messagingSenderId: "123456789",
                appId: "your-app-id"
            };

            // Initialiser Firebase
            this.app = firebase.initializeApp(firebaseConfig);
            this.auth = firebase.auth();
            this.db = firebase.firestore();

            // Écouter les changements d'authentification
            this.auth.onAuthStateChanged((user) => {
                this.currentUser = user;
                this.handleAuthStateChange(user);
            });

            this.isInitialized = true;
            console.log('✅ Firebase initialisé');

        } catch (error) {
            console.error('❌ Erreur initialisation Firebase:', error);
            throw error;
        }
    }

    /**
     * Gérer les changements d'état d'authentification
     */
    handleAuthStateChange(user) {
        const event = new CustomEvent('auth:stateChanged', {
            detail: {
                isAuthenticated: !!user,
                user: user
            }
        });
        window.dispatchEvent(event);
    }

    /**
     * Obtenir l'utilisateur actuel
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Vérifier si l'utilisateur est connecté
     */
    isAuthenticated() {
        return !!this.currentUser;
    }

    // ==================
    // MÉTHODES FIRESTORE
    // ==================

    /**
     * Ajouter un document
     * @param {string} collection - Nom de la collection
     * @param {object} data - Données à ajouter
     * @returns {Promise<DocumentReference>}
     */
    async addDocument(collection, data) {
        try {
            if (!this.isInitialized) {
                throw new Error('Firebase non initialisé');
            }

            const docRef = await this.db.collection(collection).add({
                ...data,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log('📝 Document ajouté:', docRef.id);
            return docRef;

        } catch (error) {
            console.error('❌ Erreur ajout document:', error);
            throw error;
        }
    }

    /**
     * Obtenir un document
     * @param {string} collection - Nom de la collection
     * @param {string} docId - ID du document
     * @returns {Promise<object>}
     */
    async getDocument(collection, docId) {
        try {
            if (!this.isInitialized) {
                throw new Error('Firebase non initialisé');
            }

            const doc = await this.db.collection(collection).doc(docId).get();
            
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            } else {
                throw new Error('Document non trouvé');
            }

        } catch (error) {
            console.error('❌ Erreur récupération document:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour un document
     * @param {string} collection - Nom de la collection
     * @param {string} docId - ID du document
     * @param {object} data - Données à mettre à jour
     * @returns {Promise<void>}
     */
    async updateDocument(collection, docId, data) {
        try {
            if (!this.isInitialized) {
                throw new Error('Firebase non initialisé');
            }

            await this.db.collection(collection).doc(docId).update({
                ...data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log('📝 Document mis à jour:', docId);

        } catch (error) {
            console.error('❌ Erreur mise à jour document:', error);
            throw error;
        }
    }

    /**
     * Supprimer un document
     * @param {string} collection - Nom de la collection
     * @param {string} docId - ID du document
     * @returns {Promise<void>}
     */
    async deleteDocument(collection, docId) {
        try {
            if (!this.isInitialized) {
                throw new Error('Firebase non initialisé');
            }

            await this.db.collection(collection).doc(docId).delete();
            console.log('🗑️ Document supprimé:', docId);

        } catch (error) {
            console.error('❌ Erreur suppression document:', error);
            throw error;
        }
    }

    /**
     * Requête sur une collection
     * @param {string} collection - Nom de la collection
     * @param {array} conditions - Conditions de la requête [[field, operator, value], ...]
     * @param {array} orderBy - Tri [['field', 'direction'], ...]
     * @param {number} limit - Limite de résultats
     * @returns {Promise<array>}
     */
    async queryDocuments(collection, conditions = [], orderBy = [], limit = null) {
        try {
            if (!this.isInitialized) {
                throw new Error('Firebase non initialisé');
            }

            let query = this.db.collection(collection);

            // Appliquer les conditions
            conditions.forEach(([field, operator, value]) => {
                query = query.where(field, operator, value);
            });

            // Appliquer le tri
            orderBy.forEach(([field, direction]) => {
                query = query.orderBy(field, direction);
            });

            // Appliquer la limite
            if (limit) {
                query = query.limit(limit);
            }

            const snapshot = await query.get();
            const documents = [];

            snapshot.forEach(doc => {
                documents.push({ id: doc.id, ...doc.data() });
            });

            return documents;

        } catch (error) {
            console.error('❌ Erreur requête documents:', error);
            throw error;
        }
    }

    /**
     * Écouter les changements d'une collection
     * @param {string} collection - Nom de la collection
     * @param {function} callback - Fonction appelée lors des changements
     * @param {array} conditions - Conditions de la requête
     * @returns {function} - Fonction pour annuler l'écoute
     */
    listenToCollection(collection, callback, conditions = []) {
        try {
            if (!this.isInitialized) {
                throw new Error('Firebase non initialisé');
            }

            let query = this.db.collection(collection);

            // Appliquer les conditions
            conditions.forEach(([field, operator, value]) => {
                query = query.where(field, operator, value);
            });

            return query.onSnapshot((snapshot) => {
                const documents = [];
                snapshot.forEach(doc => {
                    documents.push({ id: doc.id, ...doc.data() });
                });
                callback(documents);
            }, (error) => {
                console.error('❌ Erreur écoute collection:', error);
            });

        } catch (error) {
            console.error('❌ Erreur configuration écoute:', error);
            throw error;
        }
    }

    /**
     * Écouter les changements d'un document
     * @param {string} collection - Nom de la collection
     * @param {string} docId - ID du document
     * @param {function} callback - Fonction appelée lors des changements
     * @returns {function} - Fonction pour annuler l'écoute
     */
    listenToDocument(collection, docId, callback) {
        try {
            if (!this.isInitialized) {
                throw new Error('Firebase non initialisé');
            }

            return this.db.collection(collection).doc(docId).onSnapshot((doc) => {
                if (doc.exists) {
                    callback({ id: doc.id, ...doc.data() });
                } else {
                    callback(null);
                }
            }, (error) => {
                console.error('❌ Erreur écoute document:', error);
            });

        } catch (error) {
            console.error('❌ Erreur configuration écoute document:', error);
            throw error;
        }
    }

    // ==================
    // MÉTHODES AUTH
    // ==================

    /**
     * Connexion avec Google
     * @returns {Promise<UserCredential>}
     */
    async signInWithGoogle() {
        try {
            if (!this.isInitialized) {
                throw new Error('Firebase non initialisé');
            }

            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');

            const result = await this.auth.signInWithPopup(provider);
            console.log('✅ Connexion Google réussie:', result.user.email);
            
            return result;

        } catch (error) {
            console.error('❌ Erreur connexion Google:', error);
            throw error;
        }
    }

    /**
     * Déconnexion
     * @returns {Promise<void>}
     */
    async signOut() {
        try {
            if (!this.isInitialized) {
                throw new Error('Firebase non initialisé');
            }

            await this.auth.signOut();
            console.log('✅ Déconnexion réussie');

        } catch (error) {
            console.error('❌ Erreur déconnexion:', error);
            throw error;
        }
    }

    // ==================
    // UTILITAIRES
    // ==================

    /**
     * Obtenir un timestamp serveur
     * @returns {FieldValue}
     */
    getServerTimestamp() {
        return firebase.firestore.FieldValue.serverTimestamp();
    }

    /**
     * Créer une référence de document
     * @param {string} collection
     * @param {string} docId
     * @returns {DocumentReference}
     */
    getDocumentRef(collection, docId = null) {
        if (docId) {
            return this.db.collection(collection).doc(docId);
        } else {
            return this.db.collection(collection).doc();
        }
    }

    /**
     * Transaction Firestore
     * @param {function} updateFunction
     * @returns {Promise<any>}
     */
    async runTransaction(updateFunction) {
        try {
            if (!this.isInitialized) {
                throw new Error('Firebase non initialisé');
            }

            return await this.db.runTransaction(updateFunction);

        } catch (error) {
            console.error('❌ Erreur transaction:', error);
            throw error;
        }
    }

    /**
     * Batch d'écriture
     * @returns {WriteBatch}
     */
    createBatch() {
        if (!this.isInitialized) {
            throw new Error('Firebase non initialisé');
        }
        return this.db.batch();
    }

    /**
     * Nettoyer le service
     */
    destroy() {
        if (this.app) {
            this.app.delete();
        }
        this.isInitialized = false;
        console.log('🧹 Firebase Service nettoyé');
    }
}

// Créer une instance singleton
const firebaseServiceInstance = new FirebaseService();

// Export pour utilisation en module
export { FirebaseService, firebaseServiceInstance };
export default firebaseServiceInstance;

// Export global pour compatibilité
window.FirebaseService = firebaseServiceInstance;
