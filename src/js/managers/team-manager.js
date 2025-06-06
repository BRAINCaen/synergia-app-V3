/**
 * TeamManager pour SYNERGIA v3.0
 * Fichier: src/js/managers/TeamManager.js
 * 
 * Gestion complète des équipes avec CRUD, rôles et statistiques
 */
class TeamManager {
    constructor() {
        this.firestore = null;
        this.members = [];
        this.listeners = new Set();
        this.eventEmitter = new EventTarget();
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Initialise le TeamManager
     */
    async init() {
        try {
            // Attendre que Firebase soit disponible
            await this.waitForFirebase();
            this.firestore = window.firebaseService.getFirestore();
            
            this.isInitialized = true;
            console.log('✅ TeamManager initialisé');
            
            this.emit('team:ready');
            
        } catch (error) {
            console.error('❌ Erreur TeamManager:', error);
            throw error;
        }
    }

    /**
     * Attend que Firebase soit disponible
     */
    async waitForFirebase() {
        return new Promise((resolve) => {
            const check = () => {
                if (window.firebaseService && window.firebaseService.isInitialized) {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    /**
     * Charge tous les membres de l'équipe
     * @returns {Promise<Array>}
     */
    async loadTeamMembers() {
        try {
            console.log('📄 Chargement des membres...');
            
            const snapshot = await this.firestore.collection('users')
                .orderBy('displayName')
                .get();
            
            this.members = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Convertir les timestamps Firestore
                createdAt: doc.data().createdAt?.toDate(),
                updatedAt: doc.data().updatedAt?.toDate(),
                lastSeen: doc.data().lastSeen?.toDate()
            }));
            
            console.log(`✅ ${this.members.length} membres chargés`);
            this.emit('team:loaded', this.members);
            
            return this.members;
        } catch (error) {
            console.error('❌ Erreur chargement équipe:', error);
            this.handleError(error);
            throw error;
        }
    }

    /**
     * Ajoute un nouveau membre à l'équipe
     * @param {Object} memberData - Données du membre
     * @returns {Promise<Object>}
     */
    async addMember(memberData) {
        try {
            console.log('➕ Ajout membre:', memberData.email);
            
            // Validation des données
            this.validateMemberData(memberData);
            
            // Vérifier si l'email existe déjà
            const existingUser = await this.findMemberByEmail(memberData.email);
            if (existingUser) {
                throw new Error('Un utilisateur avec cet email existe déjà');
            }

            // Préparer les données du nouveau membre
            const newMemberData = {
                email: memberData.email.toLowerCase().trim(),
                displayName: memberData.displayName?.trim() || '',
                role: memberData.role || 'employee',
                department: memberData.department?.trim() || '',
                position: memberData.position?.trim() || '',
                status: 'invited', // invited, active, inactive
                
                // Gamification
                xp: 0,
                level: 1,
                badges: [],
                
                // Métadonnées
                photoURL: '',
                phone: memberData.phone?.trim() || '',
                
                // Timestamps
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                invitedAt: firebase.firestore.FieldValue.serverTimestamp(),
                invitedBy: window.authManager?.getCurrentUser()?.uid || null,
                
                // Préférences par défaut
                preferences: {
                    theme: 'dark',
                    notifications: true,
                    language: 'fr'
                }
            };

            // Ajouter en base
            const docRef = await this.firestore.collection('users').add(newMemberData);
            
            // Ajouter à la liste locale
            const newMember = { 
                id: docRef.id, 
                ...newMemberData,
                createdAt: new Date(),
                updatedAt: new Date(),
                invitedAt: new Date()
            };
            
            this.members.push(newMember);
            
            console.log('✅ Membre ajouté:', newMember.email);
            this.emit('member:added', newMember);
            
            return newMember;
            
        } catch (error) {
            console.error('❌ Erreur ajout membre:', error);
            this.handleError(error);
            throw error;
        }
    }

    /**
     * Met à jour un membre existant
     * @param {string} memberId - ID du membre
     * @param {Object} updates - Données à mettre à jour
     * @returns {Promise<Object>}
     */
    async updateMember(memberId, updates) {
        try {
            console.log('🔄 Mise à jour membre:', memberId);
            
            // Validation
            if (!memberId) {
                throw new Error('ID du membre requis');
            }

            // Préparer les données de mise à jour
            const updateData = {
                ...updates,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Nettoyer les données
            if (updateData.email) {
                updateData.email = updateData.email.toLowerCase().trim();
            }
            if (updateData.displayName) {
                updateData.displayName = updateData.displayName.trim();
            }
            if (updateData.department) {
                updateData.department = updateData.department.trim();
            }
            if (updateData.position) {
                updateData.position = updateData.position.trim();
            }

            // Mettre à jour en base
            await this.firestore.collection('users').doc(memberId).update(updateData);
            
            // Mettre à jour localement
            const memberIndex = this.members.findIndex(m => m.id === memberId);
            if (memberIndex !== -1) {
                this.members[memberIndex] = { 
                    ...this.members[memberIndex], 
                    ...updates,
                    updatedAt: new Date()
                };
                
                console.log('✅ Membre mis à jour:', this.members[memberIndex].email);
                this.emit('member:updated', this.members[memberIndex]);
                
                return this.members[memberIndex];
            }
            
            throw new Error('Membre non trouvé localement');
            
        } catch (error) {
            console.error('❌ Erreur mise à jour membre:', error);
            this.handleError(error);
            throw error;
        }
    }

    /**
     * Supprime un membre de l'équipe
     * @param {string} memberId - ID du membre à supprimer
     * @returns {Promise<boolean>}
     */
    async deleteMember(memberId) {
        try {
            console.log('🗑️ Suppression membre:', memberId);
            
            if (!memberId) {
                throw new Error('ID du membre requis');
            }

            // Vérifier que ce n'est pas l'utilisateur actuel
            const currentUser = window.authManager?.getCurrentUser();
            if (currentUser && currentUser.uid === memberId) {
                throw new Error('Impossible de supprimer votre propre compte');
            }

            // Supprimer de la base
            await this.firestore.collection('users').doc(memberId).delete();
            
            // Supprimer localement
            const memberIndex = this.members.findIndex(m => m.id === memberId);
            if (memberIndex !== -1) {
                const deletedMember = this.members[memberIndex];
                this.members.splice(memberIndex, 1);
                
                console.log('✅ Membre supprimé:', deletedMember.email);
                this.emit('member:deleted', { id: memberId, member: deletedMember });
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Erreur suppression membre:', error);
            this.handleError(error);
            throw error;
        }
    }

    /**
     * Recherche des membres par nom ou email
     * @param {string} query - Terme de recherche
     * @returns {Promise<Array>}
     */
    async searchMembers(query) {
        try {
            if (!query || query.length < 2) {
                return this.members;
            }

            const searchTerm = query.toLowerCase().trim();
            
            // Recherche locale d'abord
            const localResults = this.members.filter(member => 
                member.email.toLowerCase().includes(searchTerm) ||
                member.displayName?.toLowerCase().includes(searchTerm) ||
                member.department?.toLowerCase().includes(searchTerm) ||
                member.position?.toLowerCase().includes(searchTerm)
            );

            // Si pas assez de résultats, recherche en base
            if (localResults.length < 5) {
                const snapshot = await this.firestore.collection('users')
                    .where('email', '>=', searchTerm)
                    .where('email', '<=', searchTerm + '\uf8ff')
                    .limit(10)
                    .get();
                
                const dbResults = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Fusionner et dédoublonner
                const allResults = [...localResults];
                dbResults.forEach(dbResult => {
                    if (!allResults.find(r => r.id === dbResult.id)) {
                        allResults.push(dbResult);
                    }
                });

                return allResults;
            }

            return localResults;
            
        } catch (error) {
            console.error('❌ Erreur recherche membres:', error);
            return this.members.filter(member => 
                member.email.toLowerCase().includes(query.toLowerCase()) ||
                member.displayName?.toLowerCase().includes(query.toLowerCase())
            );
        }
    }

    /**
     * Trouve un membre par email
     * @param {string} email 
     * @returns {Promise<Object|null>}
     */
    async findMemberByEmail(email) {
        try {
            const snapshot = await this.firestore.collection('users')
                .where('email', '==', email.toLowerCase().trim())
                .limit(1)
                .get();
            
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                return { id: doc.id, ...doc.data() };
            }
            
            return null;
        } catch (error) {
            console.error('❌ Erreur recherche par email:', error);
            return null;
        }
    }

    /**
     * Valide les données d'un membre
     * @param {Object} memberData 
     */
    validateMemberData(memberData) {
        if (!memberData.email) {
            throw new Error('Email requis');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(memberData.email)) {
            throw new Error('Format d\'email invalide');
        }

        const validRoles = ['admin', 'manager', 'employee'];
        if (memberData.role && !validRoles.includes(memberData.role)) {
            throw new Error('Rôle invalide');
        }
    }

    /**
     * Récupère tous les membres
     * @returns {Array}
     */
    getMembers() {
        return [...this.members];
    }

    /**
     * Récupère les membres par rôle
     * @param {string} role 
     * @returns {Array}
     */
    getMembersByRole(role) {
        return this.members.filter(member => member.role === role);
    }

    /**
     * Récupère les membres par département
     * @param {string} department 
     * @returns {Array}
     */
    getMembersByDepartment(department) {
        return this.members.filter(member => member.department === department);
    }

    /**
     * Récupère les membres actifs
     * @returns {Array}
     */
    getActiveMembers() {
        return this.members.filter(member => member.status === 'active');
    }

    /**
     * Récupère les statistiques de l'équipe
     * @returns {Object}
     */
    getTeamStats() {
        const total = this.members.length;
        const active = this.members.filter(m => m.status === 'active').length;
        const invited = this.members.filter(m => m.status === 'invited').length;
        const inactive = this.members.filter(m => m.status === 'inactive').length;
        
        const departments = [...new Set(
            this.members
                .map(m => m.department)
                .filter(d => d && d.trim())
        )];
        
        const roles = {
            admin: this.members.filter(m => m.role === 'admin').length,
            manager: this.members.filter(m => m.role === 'manager').length,
            employee: this.members.filter(m => m.role === 'employee').length
        };
        
        return {
            total,
            active,
            invited,
            inactive,
            departments: departments.length,
            departmentsList: departments,
            roles
        };
    }

    /**
     * Récupère un membre par ID
     * @param {string} memberId 
     * @returns {Object|null}
     */
    getMemberById(memberId) {
        return this.members.find(member => member.id === memberId) || null;
    }

    /**
     * Vérifie si un utilisateur peut gérer l'équipe
     * @param {Object} user - Utilisateur à vérifier
     * @returns {boolean}
     */
    canManageTeam(user) {
        if (!user) return false;
        
        const userProfile = window.authManager?.getUserProfile();
        if (!userProfile) return false;
        
        return ['admin', 'manager'].includes(userProfile.role);
    }

    /**
     * Gestion des erreurs
     * @param {Error} error 
     */
    handleError(error) {
        const errorInfo = {
            type: 'team',
            code: error.code || 'unknown',
            message: error.message,
            timestamp: new Date()
        };
        
        this.emit('team:error', errorInfo);
    }

    /**
     * Émet un événement
     * @param {string} eventName 
     * @param {*} data 
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
        this.members = [];
        this.listeners.clear();
        console.log('🧹 TeamManager nettoyé');
    }
}

// Export pour utilisation globale
window.TeamManager = TeamManager;
