// js/modules/team/team-manager.js
// Gestionnaire d'équipe complet avec Firebase

class TeamManager {
    constructor() {
        this.members = new Map();
        this.roles = new Map();
        this.unsubscribers = [];
        this.isReady = false;
        this.init();
    }

    async init() {
        // Attendre Firebase
        await window.firebaseManager.waitForReady();
        
        // Charger les rôles par défaut
        await this.initializeRoles();
        
        // Écouter les changements d'équipe
        this.subscribeToTeamUpdates();
        
        this.isReady = true;
        console.log('✅ TeamManager initialisé');
    }

    async initializeRoles() {
        const defaultRoles = [
            { id: 'admin', name: 'Administrateur', level: 5, color: '#ef4444', icon: 'fa-crown', permissions: ['all'] },
            { id: 'manager', name: 'Manager', level: 4, color: '#8b5cf6', icon: 'fa-user-tie', permissions: ['manage_team', 'manage_quests', 'view_analytics'] },
            { id: 'entretien', name: 'Entretien & Maintenance', level: 3, color: '#10b981', icon: 'fa-tools', permissions: ['complete_quests', 'view_team'] },
            { id: 'accueil', name: 'Accueil Client', level: 3, color: '#f59e0b', icon: 'fa-handshake', permissions: ['complete_quests', 'view_team'] },
            { id: 'animation', name: 'Animation', level: 3, color: '#06b6d4', icon: 'fa-theater-masks', permissions: ['complete_quests', 'view_team'] },
            { id: 'securite', name: 'Sécurité', level: 3, color: '#dc2626', icon: 'fa-shield-alt', permissions: ['complete_quests', 'view_team'] },
            { id: 'stagiaire', name: 'Stagiaire', level: 1, color: '#6b7280', icon: 'fa-graduation-cap', permissions: ['complete_quests'] }
        ];

        // Créer les rôles s'ils n'existent pas
        const rolesRef = window.firebaseManager.collection('roles');
        const snapshot = await rolesRef.get();
        
        if (snapshot.empty) {
            console.log('📝 Création des rôles par défaut...');
            for (const role of defaultRoles) {
                await rolesRef.doc(role.id).set(role);
                this.roles.set(role.id, role);
            }
        } else {
            snapshot.forEach(doc => {
                this.roles.set(doc.id, doc.data());
            });
        }
    }

    subscribeToTeamUpdates() {
        // Écouter les membres de l'équipe
        const unsubscribe = window.firebaseManager.collection('teamMembers')
            .where('status', 'in', ['active', 'pending'])
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    const member = { id: change.doc.id, ...change.doc.data() };
                    
                    if (change.type === 'added' || change.type === 'modified') {
                        this.members.set(member.id, member);
                        this.notifyUpdate('member:updated', member);
                    } else if (change.type === 'removed') {
                        this.members.delete(member.id);
                        this.notifyUpdate('member:removed', member);
                    }
                });
                
                this.notifyUpdate('team:updated', this.getTeamArray());
            }, error => {
                console.error('❌ Erreur écoute équipe:', error);
            });

        this.unsubscribers.push(unsubscribe);
    }

    // Gestion des membres
    async addMember(memberData) {
        try {
            // Validation
            if (!memberData.displayName || !memberData.email) {
                throw new Error('Nom et email requis');
            }

            // Préparer les données
            const member = {
                displayName: this.sanitizeInput(memberData.displayName),
                email: this.sanitizeInput(memberData.email).toLowerCase(),
                role: memberData.role || 'stagiaire',
                level: 1,
                xp: 0,
                status: 'active',
                avatar: memberData.avatar || this.generateAvatar(memberData.displayName),
                skills: memberData.skills || [],
                schedule: memberData.schedule || {},
                createdBy: window.firebaseManager.currentUser?.uid || 'system',
                joinedAt: window.firebaseManager.timestamp(),
                stats: {
                    questsCompleted: 0,
                    totalXP: 0,
                    streak: 0,
                    lastActive: window.firebaseManager.timestamp()
                }
            };

            // Vérifier si l'email existe déjà
            const existing = await this.getMemberByEmail(member.email);
            if (existing) {
                throw new Error('Un membre avec cet email existe déjà');
            }

            // Ajouter à Firestore
            const docRef = await window.firebaseManager.collection('teamMembers').add(member);
            member.id = docRef.id;
            
            // Créer un compte utilisateur si demandé
            if (memberData.createAccount) {
                await this.createUserAccount(member);
            }

            // Log analytics
            this.logAnalytics('member_added', { 
                memberId: member.id, 
                role: member.role 
            });

            return member;
        } catch (error) {
            console.error('❌ Erreur ajout membre:', error);
            throw error;
        }
    }

    async updateMember(memberId, updates) {
        try {
            // Validation
            if (!memberId) throw new Error('ID membre requis');

            // Nettoyer les données
            const cleanUpdates = {};
            if (updates.displayName) cleanUpdates.displayName = this.sanitizeInput(updates.displayName);
            if (updates.email) cleanUpdates.email = this.sanitizeInput(updates.email).toLowerCase();
            if (updates.role) cleanUpdates.role = updates.role;
            if (updates.status) cleanUpdates.status = updates.status;
            if (updates.avatar) cleanUpdates.avatar = updates.avatar;
            if (updates.skills) cleanUpdates.skills = updates.skills;
            if (updates.schedule) cleanUpdates.schedule = updates.schedule;

            // Mise à jour Firestore
            await window.firebaseManager.collection('teamMembers').doc(memberId).update({
                ...cleanUpdates,
                updatedAt: window.firebaseManager.timestamp()
            });

            // Log analytics
            this.logAnalytics('member_updated', { 
                memberId, 
                updates: Object.keys(cleanUpdates) 
            });

            return true;
        } catch (error) {
            console.error('❌ Erreur mise à jour membre:', error);
            throw error;
        }
    }

    async deleteMember(memberId) {
        try {
            // Soft delete - on passe juste en inactif
            await this.updateMember(memberId, { status: 'inactive' });
            
            this.logAnalytics('member_deleted', { memberId });
            return true;
        } catch (error) {
            console.error('❌ Erreur suppression membre:', error);
            throw error;
        }
    }

    async getMemberByEmail(email) {
        const snapshot = await window.firebaseManager.collection('teamMembers')
            .where('email', '==', email.toLowerCase())
            .where('status', '==', 'active')
            .limit(1)
            .get();
        
        return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }

    async getMemberById(memberId) {
        const doc = await window.firebaseManager.collection('teamMembers').doc(memberId).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    }

    getTeamArray() {
        return Array.from(this.members.values())
            .sort((a, b) => {
                // Trier par niveau puis par nom
                const roleA = this.roles.get(a.role);
                const roleB = this.roles.get(b.role);
                if (roleA?.level !== roleB?.level) {
                    return (roleB?.level || 0) - (roleA?.level || 0);
                }
                return a.displayName.localeCompare(b.displayName);
            });
    }

    getMembersByRole(roleId) {
        return this.getTeamArray().filter(member => member.role === roleId);
    }

    getActiveMembers() {
        return this.getTeamArray().filter(member => member.status === 'active');
    }

    // Gestion des rôles
    getRole(roleId) {
        return this.roles.get(roleId);
    }

    getRoles() {
        return Array.from(this.roles.values()).sort((a, b) => b.level - a.level);
    }

    async assignRole(memberId, roleId) {
        const role = this.getRole(roleId);
        if (!role) throw new Error('Rôle invalide');

        await this.updateMember(memberId, { role: roleId });
        
        // Mettre à jour les permissions si c'est un utilisateur
        const member = await this.getMemberById(memberId);
        if (member?.userId) {
            await window.firebaseManager.collection('users').doc(member.userId).update({
                role: roleId,
                permissions: role.permissions
            });
        }
    }

    // Permissions
    async checkPermission(memberId, permission) {
        const member = this.members.get(memberId) || await this.getMemberById(memberId);
        if (!member) return false;

        const role = this.getRole(member.role);
        if (!role) return false;

        return role.permissions.includes('all') || role.permissions.includes(permission);
    }

    // Statistiques
    async getTeamStats() {
        const stats = {
            totalMembers: this.members.size,
            activeMembers: 0,
            byRole: {},
            totalXP: 0,
            averageLevel: 0,
            questsCompleted: 0
        };

        this.getTeamArray().forEach(member => {
            if (member.status === 'active') stats.activeMembers++;
            
            stats.byRole[member.role] = (stats.byRole[member.role] || 0) + 1;
            stats.totalXP += member.xp || 0;
            stats.averageLevel += member.level || 1;
            stats.questsCompleted += member.stats?.questsCompleted || 0;
        });

        stats.averageLevel = stats.totalMembers > 0 ? 
            Math.round(stats.averageLevel / stats.totalMembers * 10) / 10 : 0;

        return stats;
    }

    // Utilitaires
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.trim().replace(/[<>]/g, '');
    }

    generateAvatar(name) {
        const colors = ['#ef4444', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#ec4899'];
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // Retourner un data URL SVG
        const svg = `
            <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" fill="${color}"/>
                <text x="50" y="50" text-anchor="middle" dy=".35em" 
                      font-family="Arial" font-size="40" font-weight="bold" fill="white">
                    ${initials}
                </text>
            </svg>
        `;
        
        return `data:image/svg+xml;base64,${btoa(svg)}`;
    }

    async createUserAccount(member) {
        try {
            // Générer un mot de passe temporaire
            const tempPassword = this.generateTempPassword();
            
            // Créer le compte
            const credential = await window.firebaseManager.signUp(
                member.email, 
                tempPassword, 
                member.displayName
            );
            
            // Lier le membre au compte utilisateur
            await window.firebaseManager.collection('teamMembers').doc(member.id).update({
                userId: credential.user.uid
            });

            // Envoyer un email de réinitialisation
            await window.firebaseManager.auth.sendPasswordResetEmail(member.email);
            
            console.log(`✅ Compte créé pour ${member.email} - Email de réinitialisation envoyé`);
            
            return credential.user;
        } catch (error) {
            console.error('❌ Erreur création compte:', error);
            throw error;
        }
    }

    generateTempPassword() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    // Analytics
    logAnalytics(event, data) {
        window.firebaseManager.collection('analytics').add({
            event: `team:${event}`,
            data,
            userId: window.firebaseManager.currentUser?.uid,
            timestamp: window.firebaseManager.timestamp()
        }).catch(console.error);
    }

    // Système de notification
    notifyUpdate(event, data) {
        document.dispatchEvent(new CustomEvent(`team:${event}`, { detail: data }));
    }

    // Nettoyage
    destroy() {
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
        this.members.clear();
        this.roles.clear();
    }
}

// Instance globale
window.teamManager = new TeamManager();

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TeamManager;
}