/**
 * AuthManager - Gestionnaire d'authentification pour SYNERGIA v3.0
 * Fichier: src/js/managers/AuthManager.js
 */

import firebaseService from '../core/firebase-service.js';
import Logger from '../core/logger.js';

export class AuthManager {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.isInitialized = false;
        this.authListeners = [];
    }

    async initialize() {
        try {
            // Attendre que Firebase soit initialisé
            if (!firebaseService.isInitialized) {
                await firebaseService.initialize();
            }

            // Écouter les changements d'authentification
            this.setupAuthListener();
            
            this.isInitialized = true;
            Logger.info('AuthManager initialized');

        } catch (error) {
            Logger.error('Error initializing AuthManager:', error);
            throw error;
        }
    }

    setupAuthListener() {
        // Écouter les changements d'état d'authentification Firebase
        window.addEventListener('auth:stateChanged', (event) => {
            const { isAuthenticated, user } = event.detail;
            this.handleAuthStateChange(isAuthenticated, user);
        });
    }

    async handleAuthStateChange(isAuthenticated, user) {
        try {
            this.currentUser = user;
            
            if (isAuthenticated && user) {
                // Charger ou créer le profil utilisateur
                await this.loadUserProfile(user);
                Logger.info('User authenticated:', user.email);
            } else {
                // Nettoyer les données utilisateur
                this.currentUser = null;
                this.userProfile = null;
                Logger.info('User signed out');
            }

            // Notifier les autres composants
            this.notifyAuthListeners(isAuthenticated, user);

        } catch (error) {
            Logger.error('Error handling auth state change:', error);
        }
    }

    async loadUserProfile(user) {
        try {
            // Chercher le profil existant
            const profiles = await firebaseService.queryDocuments('user_profiles', [
                ['userId', '==', user.uid]
            ]);

            if (profiles.length > 0) {
                this.userProfile = profiles[0];
                Logger.info('User profile loaded');
            } else {
                // Créer un nouveau profil
                this.userProfile = await this.createUserProfile(user);
                Logger.info('New user profile created');
            }

            // Mettre à jour la dernière connexion
            await this.updateLastSeen();

        } catch (error) {
            Logger.error('Error loading user profile:', error);
            // Créer un profil par défaut en cas d'erreur
            this.userProfile = this.createDefaultProfile(user);
        }
    }

    async createUserProfile(user) {
        try {
            const profileData = {
                userId: user.uid,
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                photoURL: user.photoURL || null,
                role: 'employee', // Rôle par défaut
                department: null,
                position: null,
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lastSeen: new Date().toISOString()
            };

            const profileRef = await firebaseService.addDocument('user_profiles', profileData);
            return { id: profileRef.id, ...profileData };

        } catch (error) {
            Logger.error('Error creating user profile:', error);
            return this.createDefaultProfile(user);
        }
    }

    createDefaultProfile(user) {
        return {
            userId: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL || null,
            role: 'employee',
            department: null,
            position: null,
            status: 'active'
        };
    }

    async updateLastSeen() {
        try {
            if (this.userProfile && this.userProfile.id) {
                await firebaseService.updateDocument('user_profiles', this.userProfile.id, {
                    lastSeen: new Date().toISOString()
                });
            }
        } catch (error) {
            Logger.error('Error updating last seen:', error);
        }
    }

    // ==================
    // MÉTHODES D'AUTHENTIFICATION
    // ==================

    async signInWithGoogle() {
        try {
            const result = await firebaseService.signInWithGoogle();
            Logger.info('Google sign-in successful');
            return result;
        } catch (error) {
            Logger.error('Google sign-in error:', error);
            throw error;
        }
    }

    async signOut() {
        try {
            await firebaseService.signOut();
            Logger.info('Sign out successful');
        } catch (error) {
            Logger.error('Sign out error:', error);
            throw error;
        }
    }

    // ==================
    // MÉTHODES PUBLIQUES
    // ==================

    isAuthenticated() {
        return !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getUserProfile() {
        return this.userProfile;
    }

    getUserRole() {
        return this.userProfile?.role || 'employee';
    }

    isAdmin() {
        return this.getUserRole() === 'admin';
    }

    isManager() {
        return ['admin', 'manager'].includes(this.getUserRole());
    }

    getUserDisplayName() {
        return this.userProfile?.displayName || 
               this.currentUser?.displayName || 
               this.currentUser?.email || 
               'Utilisateur';
    }

    getUserAvatar() {
        return this.userProfile?.photoURL || 
               this.currentUser?.photoURL || 
               null;
    }

    // ==================
    // GESTION DU PROFIL
    // ==================

    async updateProfile(updates) {
        try {
            if (!this.userProfile || !this.userProfile.id) {
                throw new Error('Aucun profil utilisateur à mettre à jour');
            }

            const updateData = {
                ...updates,
                updatedAt: new Date().toISOString()
            };

            await firebaseService.updateDocument('user_profiles', this.userProfile.id, updateData);
            
            // Mettre à jour localement
            Object.assign(this.userProfile, updateData);
            
            Logger.info('Profile updated successfully');
            
            // Notifier les changements
            this.notifyProfileUpdate();

            return this.userProfile;

        } catch (error) {
            Logger.error('Error updating profile:', error);
            throw error;
        }
    }

    async updateRole(userId, newRole) {
        try {
            if (!this.isAdmin()) {
                throw new Error('Seuls les administrateurs peuvent changer les rôles');
            }

            const profiles = await firebaseService.queryDocuments('user_profiles', [
                ['userId', '==', userId]
            ]);

            if (profiles.length === 0) {
                throw new Error('Profil utilisateur non trouvé');
            }

            await firebaseService.updateDocument('user_profiles', profiles[0].id, {
                role: newRole,
                updatedAt: new Date().toISOString(),
                updatedBy: this.currentUser.uid
            });

            Logger.info(`User role updated: ${userId} -> ${newRole}`);

        } catch (error) {
            Logger.error('Error updating user role:', error);
            throw error;
        }
    }

    // ==================
    // ÉVÉNEMENTS
    // ==================

    onAuthStateChanged(callback) {
        if (typeof callback === 'function') {
            this.authListeners.push(callback);
        }
    }

    offAuthStateChanged(callback) {
        const index = this.authListeners.indexOf(callback);
        if (index > -1) {
            this.authListeners.splice(index, 1);
        }
    }

    notifyAuthListeners(isAuthenticated, user) {
        const authState = {
            isAuthenticated,
            user,
            profile: this.userProfile
        };

        this.authListeners.forEach(callback => {
            try {
                callback(authState);
            } catch (error) {
                Logger.error('Error in auth listener:', error);
            }
        });

        // Émettre un événement global
        const event = new CustomEvent('auth:stateChanged', {
            detail: authState
        });
        window.dispatchEvent(event);
    }

    notifyProfileUpdate() {
        const event = new CustomEvent('auth:profileUpdated', {
            detail: {
                user: this.currentUser,
                profile: this.userProfile
            }
        });
        window.dispatchEvent(event);
    }

    // ==================
    // PERMISSIONS
    // ==================

    hasPermission(permission) {
        const rolePermissions = {
            admin: ['*'], // Toutes les permissions
            manager: [
                'view_team',
                'manage_team',
                'view_reports',
                'manage_planning',
                'view_timeclock'
            ],
            employee: [
                'view_own_data',
                'manage_own_profile',
                'use_timeclock'
            ]
        };

        const userRole = this.getUserRole();
        const permissions = rolePermissions[userRole] || [];

        return permissions.includes('*') || permissions.includes(permission);
    }

    requirePermission(permission) {
        if (!this.hasPermission(permission)) {
            throw new Error(`Permission requise: ${permission}`);
        }
    }

    requireAuthentication() {
        if (!this.isAuthenticated()) {
            throw new Error('Authentification requise');
        }
    }

    // ==================
    // UTILITAIRES
    // ==================

    getAuthToken() {
        // Retourner le token Firebase si disponible
        return this.currentUser?.accessToken || null;
    }

    async refreshToken() {
        try {
            if (this.currentUser) {
                const token = await this.currentUser.getIdToken(true);
                return token;
            }
            return null;
        } catch (error) {
            Logger.error('Error refreshing token:', error);
            return null;
        }
    }

    // ==================
    // NETTOYAGE
    // ==================

    destroy() {
        this.authListeners = [];
        this.currentUser = null;
        this.userProfile = null;
        this.isInitialized = false;
        Logger.info('AuthManager destroyed');
    }
}

export default AuthManager;
