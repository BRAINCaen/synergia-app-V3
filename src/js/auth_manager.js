/**
 * Gestionnaire d'authentification pour SYNERGIA v3.0
 * Fichier: src/js/managers/AuthManager.js
 */
class AuthManager {
    constructor() {
        this.auth = null;
        this.firestore = null;
        this.currentUser = null;
        this.userProfile = null;
        this.listeners = new Map();
        this.eventEmitter = new EventTarget();
        
        this.init();
    }

    /**
     * Initialise le gestionnaire d'authentification
     */
    async init() {
        try {
            // Attendre que Firebase soit prêt
            await firebaseService.waitForInitialization();
            
            this.auth = firebaseService.getAuth();
            this.firestore = firebaseService.getFirestore();
            
            // Écouter les changements d'état d'authentification
            this.auth.onAuthStateChanged((user) => {
                this.handleAuthStateChange(user);
            });
            
            console.log('✅ AuthManager initialisé');
            
        } catch (error) {
            console.error('❌ Erreur AuthManager:', error);
            throw error;
        }
    }

    /**
     * Gère les changements d'état d'authentification
     * @param {firebase.User|null} user 
     */
    async handleAuthStateChange(user) {
        try {
            this.currentUser = user;
            
            if (user) {
                console.log('👤 Utilisateur connecté:', user.email);
                
                // Charger le profil utilisateur
                await this.loadUserProfile(user.uid);
                
                // Mettre à jour la dernière connexion
                await this.updateLastSeen();
                
                // Émettre l'événement de connexion
                this.emit('user:login', {
                    user: this.currentUser,
                    profile: this.userProfile
                });
                
            } else {
                console.log('👤 Utilisateur déconnecté');
                this.userProfile = null;
                
                // Émettre l'événement de déconnexion
                this.emit('user:logout');
            }
            
            // Émettre l'événement de changement d'état
            this.emit('auth:stateChanged', {
                user: this.currentUser,
                profile: this.userProfile,
                isAuthenticated: !!user
            });
            
        } catch (error) {
            console.error('Erreur lors du changement d\'état auth:', error);
            this.handleError(error);
        }
    }

    /**
     * Connexion avec Google
     * @returns {Promise<Object>}
     */
    async signInWithGoogle() {
        try {
            console.log('🔐 Connexion Google...');
            
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');
            
            // Configuration du provider
            provider.setCustomParameters({
                prompt: 'select_account'
            });
            
            const result = await this.auth.signInWithPopup(provider);
            const user = result.user;
            
            console.log('✅ Connexion Google réussie:', user.email);
            
            // Créer ou mettre à jour le profil utilisateur
            await this.createOrUpdateUserProfile(user);
            
            return {
                success: true,
                user: user,
                profile: this.userProfile
            };
            
        } catch (error) {
            console.error('❌ Erreur connexion Google:', error);
            
            // Gestion des erreurs spécifiques
            if (error.code === 'auth/popup-closed-by-user') {
                throw new Error('Connexion annulée par l\'utilisateur');
            } else if (error.code === 'auth/unauthorized-domain') {
                throw new Error('Domaine non autorisé. Contactez l\'administrateur.');
            }
            
            throw error;
        }
    }

    /**
     * Connexion avec email/mot de passe
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<Object>}
     */
    async signInWithEmail(email, password) {
        try {
            console.log('🔐 Connexion email:', email);
            
            const result = await this.auth.signInWithEmailAndPassword(email, password);
            const user = result.user;
            
            console.log('✅ Connexion email réussie:', user.email);
            
            return {
                success: true,
                user: user,
                profile: this.userProfile
            };
            
        } catch (error) {
            console.error('❌ Erreur connexion email:', error);
            
            // Messages d'erreur personnalisés
            const errorMessages = {
                'auth/user-not-found': 'Aucun compte trouvé avec cette adresse email',
                'auth/wrong-password': 'Mot de passe incorrect',
                'auth/invalid-email': 'Adresse email invalide',
                'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard',
                'auth/user-disabled': 'Ce compte a été désactivé'
            };
            
            const message = errorMessages[error.code] || error.message;
            throw new Error(message);
        }
    }

    /**
     * Inscription avec email/mot de passe
     * @param {string} email 
     * @param {string} password 
     * @param {Object} userData 
     * @returns {Promise<Object>}
     */
    async signUpWithEmail(email, password, userData = {}) {
        try {
            console.log('📝 Inscription email:', email);
            
            const result = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = result.user;
            
            // Mettre à jour le profil Firebase
            if (userData.displayName) {
                await user.updateProfile({
                    displayName: userData.displayName
                });
            }
            
            // Créer le profil utilisateur en base
            await this.createUserProfile(user, userData);
            
            console.log('✅ Inscription réussie:', user.email);
            
            return {
                success: true,
                user: user,
                profile: this.userProfile
            };
            
        } catch (error) {
            console.error('❌ Erreur inscription:', error);
            
            const errorMessages = {
                'auth/email-already-in-use': 'Cette adresse email est déjà utilisée',
                'auth/weak-password': 'Le mot de passe est trop faible',
                'auth/invalid-email': 'Adresse email invalide'
            };
            
            const message = errorMessages[error.code] || error.message;
            throw new Error(message);
        }
    }

    /**
     * Déconnexion
     * @returns {Promise<void>}
     */
    async signOut() {
        try {
            console.log('🚪 Déconnexion...');
            
            // Nettoyer les données locales
            this.clearLocalData();
            
            // Déconnexion Firebase
            await this.auth.signOut();
            
            console.log('✅ Déconnexion réussie');
            
        } catch (error) {
            console.error('❌ Erreur déconnexion:', error);
            throw error;
        }
    }

    /**
     * Charge le profil utilisateur depuis Firestore
     * @param {string} uid 
     */
    async loadUserProfile(uid) {
        try {
            const docRef = this.firestore.collection('users').doc(uid);
            const doc = await docRef.get();
            
            if (doc.exists) {
                this.userProfile = {
                    id: uid,
                    ...doc.data()
                };
                console.log('📄 Profil utilisateur chargé');
            } else {
                console.log('📄 Aucun profil trouvé, création...');
                await this.createUserProfile(this.currentUser);
            }
            
        } catch (error) {
            console.error('Erreur chargement profil:', error);
        }
    }

    /**
     * Crée ou met à jour le profil utilisateur
     * @param {firebase.User} user 
     * @param {Object} additionalData 
     */
    async createOrUpdateUserProfile(user, additionalData = {}) {
        try {
            const userRef = this.firestore.collection('users').doc(user.uid);
            const doc = await userRef.get();
            
            const baseData = {
                email: user.email,
                displayName: user.displayName || '',
                photoURL: user.photoURL || '',
                emailVerified: user.emailVerified,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            if (doc.exists) {
                // Mise à jour
                await userRef.update({
                    ...baseData,
                    ...additionalData
                });
                console.log('📝 Profil utilisateur mis à jour');
            } else {
                // Création
                await this.createUserProfile(user, additionalData);
            }
            
            // Recharger le profil
            await this.loadUserProfile(user.uid);
            
        } catch (error) {
            console.error('Erreur création/MAJ profil:', error);
        }
    }

    /**
     * Crée un nouveau profil utilisateur
     * @param {firebase.User} user 
     * @param {Object} additionalData 
     */
    async createUserProfile(user, additionalData = {}) {
        try {
            const userData = {
                email: user.email,
                displayName: user.displayName || additionalData.displayName || '',
                photoURL: user.photoURL || '',
                emailVerified: user.emailVerified,
                
                // Données SYNERGIA
                role: additionalData.role || 'employee',
                department: additionalData.department || '',
                position: additionalData.position || '',
                startDate: additionalData.startDate || firebase.firestore.FieldValue.serverTimestamp(),
                
                // Gamification
                xp: 0,
                level: 1,
                badges: [],
                quests: [],
                
                // Préférences
                preferences: {
                    theme: 'dark',
                    notifications: true,
                    language: 'fr'
                },
                
                // Timestamps
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await this.firestore.collection('users').doc(user.uid).set(userData);
            
            this.userProfile = {
                id: user.uid,
                ...userData
            };
            
            console.log('✅ Profil utilisateur créé');
            
        } catch (error) {
            console.error('Erreur création profil:', error);
            throw error;
        }
    }

    /**
     * Met à jour la dernière activité
     */
    async updateLastSeen() {
        try {
            if (this.currentUser) {
                await this.firestore.collection('users').doc(this.currentUser.uid).update({
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Erreur mise à jour lastSeen:', error);
        }
    }

    /**
     * Met à jour le profil utilisateur
     * @param {Object} updates 
     */
    async updateProfile(updates) {
        try {
            if (!this.currentUser) {
                throw new Error('Aucun utilisateur connecté');
            }
            
            const userRef = this.firestore.collection('users').doc(this.currentUser.uid);
            
            await userRef.update({
                ...updates,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Recharger le profil
            await this.loadUserProfile(this.currentUser.uid);
            
            this.emit('profile:updated', this.userProfile);
            
            console.log('✅ Profil mis à jour');
            
        } catch (error) {
            console.error('Erreur mise à jour profil:', error);
            throw error;
        }
    }

    /**
     * Réinitialisation mot de passe
     * @param {string} email 
     */
    async resetPassword(email) {
        try {
            await this.auth.sendPasswordResetEmail(email);
            console.log('📧 Email de réinitialisation envoyé');
        } catch (error) {
            console.error('Erreur réinitialisation:', error);
            throw error;
        }
    }

    /**
     * Vérifie si l'utilisateur est connecté
     * @returns {boolean}
     */
    isAuthenticated() {
        return !!this.currentUser;
    }

    /**
     * Récupère l'utilisateur actuel
     * @returns {firebase.User|null}
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Récupère le profil utilisateur
     * @returns {Object|null}
     */
    getUserProfile() {
        return this.userProfile;
    }

    /**
     * Vérifie les permissions utilisateur
     * @param {string} permission 
     * @returns {boolean}
     */
    hasPermission(permission) {
        if (!this.userProfile) return false;
        
        const permissions = {
            'admin': ['admin'],
            'manager': ['admin', 'manager'],
            'employee': ['admin', 'manager', 'employee']
        };
        
        const userRole = this.userProfile.role || 'employee';
        return permissions[permission]?.includes(userRole) || false;
    }

    /**
     * Nettoie les données locales
     */
    clearLocalData() {
        this.userProfile = null;
        // Nettoyer localStorage si nécessaire
    }

    /**
     * Gestion des erreurs
     * @param {Error} error 
     */
    handleError(error) {
        const errorInfo = firebaseService.handleError(error);
        this.emit('auth:error', errorInfo);
    }

    /**
     * Émet un événement
     * @param {string} eventName 
     * @param {Object} data 
     */
    emit(eventName, data = null) {
        const event = new CustomEvent(eventName, { detail: data });
        this.eventEmitter.dispatchEvent(event);
        
        // Aussi émettre sur window pour compatibilité
        window.dispatchEvent(event);
    }

    /**
     * Écoute un événement
     * @param {string} eventName 
     * @param {Function} callback 
     */
    on(eventName, callback) {
        this.eventEmitter.addEventListener(eventName, callback);
    }

    /**
     * Supprime un écouteur d'événement
     * @param {string} eventName 
     * @param {Function} callback 
     */
    off(eventName, callback) {
        this.eventEmitter.removeEventListener(eventName, callback);
    }

    /**
     * Nettoyage lors de la destruction
     */
    destroy() {
        this.clearLocalData();
        this.listeners.clear();
    }
}

// Export pour utilisation globale
window.AuthManager = AuthManager;