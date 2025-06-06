// js/core/firebase-manager.js
// Gestionnaire centralisé Firebase avec détection robuste

class FirebaseManager {
    constructor() {
        this.isReady = false;
        this.auth = null;
        this.db = null;
        this.storage = null;
        this.analytics = null;
        this.currentUser = null;
        this.initPromise = this.init();
        this.listeners = new Map();
    }

    async init() {
        try {
            // Attendre que Firebase soit chargé
            await this.waitForFirebase();
            
            // Configuration Firebase
            const firebaseConfig = {
                apiKey: "AIzaSyD7uBuAQaOhZ02owkZEuMKC5Vji6PrB2f8",
                authDomain: "synergia-app-f27e7.firebaseapp.com",
                projectId: "synergia-app-f27e7",
                storageBucket: "synergia-app-f27e7.appspot.com",
                messagingSenderId: "201912738922",
                appId: "1:201912738922:web:2fcc1e49293bb632899613",
                measurementId: "G-EGJ79SCMWX"
            };

            // Initialiser Firebase
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }

            // Initialiser les services
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            this.storage = firebase.storage();
            this.analytics = firebase.analytics();

            // Exposer globalement pour compatibilité
            window.auth = this.auth;
            window.db = this.db;
            window.storage = this.storage;

            // Écouter les changements d'authentification
            this.auth.onAuthStateChanged((user) => {
                this.currentUser = user;
                this.notifyListeners('authStateChanged', user);
                
                if (user) {
                    console.log('✅ Utilisateur connecté:', user.email);
                    this.updateUserLastSeen(user.uid);
                } else {
                    console.log('❌ Utilisateur déconnecté');
                }
            });

            // Activer la persistence offline
            await this.db.enablePersistence().catch(err => {
                if (err.code === 'unimplemented') {
                    console.warn('Persistence offline non supportée sur ce navigateur');
                }
            });

            this.isReady = true;
            document.dispatchEvent(new CustomEvent('firebase:ready', { detail: { manager: this } }));
            console.log('✅ Firebase Manager initialisé avec succès');
            
            return true;
        } catch (error) {
            console.error('❌ Erreur initialisation Firebase:', error);
            throw error;
        }
    }

    async waitForFirebase() {
        let attempts = 0;
        const maxAttempts = 50; // 5 secondes max
        
        while (!window.firebase && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.firebase) {
            throw new Error('Firebase SDK non chargé après 5 secondes');
        }
    }

    async waitForReady() {
        await this.initPromise;
        return this.isReady;
    }

    // Méthodes d'authentification
    async signIn(email, password) {
        await this.waitForReady();
        return this.auth.signInWithEmailAndPassword(email, password);
    }

    async signUp(email, password, displayName) {
        await this.waitForReady();
        const credential = await this.auth.createUserWithEmailAndPassword(email, password);
        
        if (credential.user) {
            await credential.user.updateProfile({ displayName });
            await this.createUserDocument(credential.user);
        }
        
        return credential;
    }

    async signOut() {
        await this.waitForReady();
        return this.auth.signOut();
    }

    // Gestion des utilisateurs
    async createUserDocument(user) {
        const userRef = this.db.collection('users').doc(user.uid);
        const userData = {
            displayName: user.displayName || 'Nouveau membre',
            email: user.email,
            photoURL: user.photoURL || '',
            role: user.email === 'alan.boehme61@gmail.com' ? 'admin' : 'member',
            level: 1,
            xp: 0,
            joinedAt: firebase.firestore.Timestamp.now(),
            lastSeen: firebase.firestore.Timestamp.now(),
            preferences: {
                notifications: true,
                theme: 'dark'
            },
            stats: {
                questsCompleted: 0,
                totalXP: 0,
                streak: 0
            }
        };

        await userRef.set(userData, { merge: true });
        return userData;
    }

    async updateUserLastSeen(userId) {
        if (!userId) return;
        
        try {
            await this.db.collection('users').doc(userId).update({
                lastSeen: firebase.firestore.Timestamp.now()
            });
        } catch (error) {
            console.error('Erreur mise à jour lastSeen:', error);
        }
    }

    async getCurrentUserData() {
        if (!this.currentUser) return null;
        
        const doc = await this.db.collection('users').doc(this.currentUser.uid).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    }

    // Système de listeners
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    notifyListeners(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Erreur dans listener ${event}:`, error);
                }
            });
        }
    }

    // Méthodes utilitaires
    isAdmin() {
        return this.currentUser?.email === 'alan.boehme61@gmail.com';
    }

    async checkConnection() {
        try {
            await this.db.collection('_ping').doc('test').set({
                timestamp: firebase.firestore.Timestamp.now()
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    // Collections helpers
    collection(name) {
        return this.db.collection(name);
    }

    doc(path) {
        return this.db.doc(path);
    }

    timestamp() {
        return firebase.firestore.Timestamp.now();
    }

    serverTimestamp() {
        return firebase.firestore.FieldValue.serverTimestamp();
    }

    arrayUnion(...elements) {
        return firebase.firestore.FieldValue.arrayUnion(...elements);
    }

    arrayRemove(...elements) {
        return firebase.firestore.FieldValue.arrayRemove(...elements);
    }

    increment(value) {
        return firebase.firestore.FieldValue.increment(value);
    }
}

// Instance globale
window.firebaseManager = new FirebaseManager();

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseManager;
}
