// js/modules/team/team-manager.js
// Gestionnaire d'équipe pour SYNERGIA v3.0

class TeamManager {
    constructor() {
        this.members = [];
        this.roles = [];
        this.stats = {};
        this.isLoading = false;
        this.listeners = [];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupDefaultRoles();
        
        // Attendre Firebase
        document.addEventListener('firebase:ready', () => {
            this.loadTeamMembers();
            this.loadRoles();
        });
        
        console.log('✅ Team Manager initialisé');
    }
    
    setupEventListeners() {
        // Formulaire d'ajout de membre
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'add-member-form') {
                e.preventDefault();
                this.handleAddMember(e.target);
            }
        });
        
        // Actions sur les membres
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="edit-member"]')) {
                const memberId = e.target.dataset.memberId;
                this.editMember(memberId);
            }
            
            if (e.target.matches('[data-action="delete-member"]')) {
                const memberId = e.target.dataset.memberId;
                this.deleteMember(memberId);
            }
            
            if (e.target.matches('[data-action="toggle-status"]')) {
                const memberId = e.target.dataset.memberId;
                this.toggleMemberStatus(memberId);
            }
        });
        
        // Onglets équipe
        document.addEventListener('click', (e) => {
            if (e.target.matches('.team-tab')) {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            }
        });
        
        // Data Manager events
        if (window.dataManager) {
            this.listeners.push(
                window.dataManager.subscribe('teamMembers', (members) => {
                    this.members = members || [];
                    this.renderMembers();
                    this.updateStats();
                })
            );
        }
    }
    
    setupDefaultRoles() {
        this.roles = [
            {
                id: 'admin',
                name: 'Administrateur',
                description: 'Accès complet à toutes les fonctionnalités',
                color: '#dc2626',
                icon: 'crown',
                level: 10,
                permissions: ['all']
            },
            {
                id: 'manager',
                name: 'Manager',
                description: 'Gestion d\'équipe et planning',
                color: '#7c3aed',
                icon: 'user-tie',
                level: 8,
                permissions: ['manage_team', 'view_analytics', 'create_quests']
            },
            {
                id: 'employee',
                name: 'Employé',
                description: 'Accès standard aux fonctionnalités',
                color: '#059669',
                icon: 'user',
                level: 5,
                permissions: ['view_team', 'complete_quests', 'use_chat']
            },
            {
                id: 'intern',
                name: 'Stagiaire',
                description: 'Accès limité en formation',
                color: '#0ea5e9',
                icon: 'graduation-cap',
                level: 3,
                permissions: ['view_team', 'complete_quests']
            },
            {
                id: 'entretien',
                name: 'Entretien',
                description: 'Équipe de maintenance',
                color: '#f59e0b',
                icon: 'tools',
                level: 4,
                permissions: ['view_team', 'complete_quests', 'maintenance_quests']
            },
            {
                id: 'accueil',
                name: 'Accueil',
                description: 'Service clientèle',
                color: '#8b5cf6',
                icon: 'concierge-bell',
                level: 5,
                permissions: ['view_team', 'complete_quests', 'customer_service']
            },
            {
                id: 'animation',
                name: 'Animation',
                description: 'Animation et encadrement',
                color: '#ef4444',
                icon: 'masks-theater',
                level: 6,
                permissions: ['view_team', 'complete_quests', 'animation_quests']
            },
            {
                id: 'securite',
                name: 'Sécurité',
                description: 'Sécurité et surveillance',
                color: '#374151',
                icon: 'shield-alt',
                level: 7,
                permissions: ['view_team', 'complete_quests', 'security_access']
            }
        ];
    }
    
    async loadTeamMembers() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showMembersLoading();
        
        try {
            if (window.dataManager) {
                this.members = await window.dataManager.getTeamMembers();
            } else {
                // Fallback localStorage
                this.loadFromLocalStorage();
            }
            
            this.renderMembers();
            this.updateStats();
            
        } catch (error) {
            console.error('❌ Erreur chargement équipe:', error);
            window.uiManager?.showToast('Erreur lors du chargement de l\'équipe', 'error');
        } finally {
            this.isLoading = false;
        }
    }
    
    async loadRoles() {
        try {
            if (window.firebaseManager) {
                const rolesFromDB = await window.firebaseManager.getCollection('roles');
                if (rolesFromDB.length > 0) {
                    this.roles = rolesFromDB;
                }
            }
        } catch (error) {
            console.error('❌ Erreur chargement rôles:', error);
        }
    }
    
    async addMember(memberData) {
        try {
            // Validation
            if (!this.validateMemberData(memberData)) {
                return false;
            }
            
            // Vérifier email unique
            if (this.members.some(m => m.email === memberData.email)) {
                window.uiManager?.showToast('Cet email est déjà utilisé', 'error');
                return false;
            }
            
            // Ajouter données par défaut
            const newMember = {
                ...memberData,
                id: this.generateId(),
                status: 'active',
                level: 1,
                xp: 0,
                avatar: `/assets/images/avatars/avatar-${Math.floor(Math.random() * 6) + 1}.jpg`,
                skills: [],
                joinedAt: new Date().toISOString(),
                createdBy: window.firebaseManager?.getUserId() || 'system'
            };
            
            // Sauvegarder
            if (window.dataManager) {
                await window.dataManager.addTeamMember(newMember);
            } else {
                this.members.push(newMember);
                this.saveToLocalStorage();
            }
            
            window.uiManager?.showToast('Membre ajouté avec succès!', 'success');
            window.uiManager?.closeModal();
            
            // Analytics
            if (window.firebaseManager) {
                window.firebaseManager.logEvent('team_member_added', {
                    role: newMember.role,
                    total_members: this.members.length
                });
            }
            
            return newMember;
            
        } catch (error) {
            console.error('❌ Erreur ajout membre:', error);
            window.uiManager?.showToast('Erreur lors de l\'ajout du membre', 'error');
            return false;
        }
    }
    
    async updateMember(memberId, updateData) {
        try {
            const memberIndex = this.members.findIndex(m => m.id === memberId);
            if (memberIndex === -1) {
                throw new Error('Membre non trouvé');
            }
            
            // Validation
            if (updateData.email && updateData.email !== this.members[memberIndex].email) {
                if (this.members.some(m => m.email === updateData.email && m.id !== memberId)) {
                    window.uiManager?.showToast('Cet email est déjà utilisé', 'error');
                    return false;
                }
            }
            
            const updatedData = {
                ...updateData,
                updatedAt: new Date().toISOString()
            };
            
            // Sauvegarder
            if (window.dataManager) {
                await window.dataManager.updateTeamMember(memberId, updatedData);
            } else {
                this.members[memberIndex] = { ...this.members[memberIndex], ...updatedData };
                this.saveToLocalStorage();
                this.renderMembers();
            }
            
            window.uiManager?.showToast('Membre mis à jour!', 'success');
            window.uiManager?.closeModal();
            
            return true;
            
        } catch (error) {
            console.error('❌ Erreur mise à jour membre:', error);
            window.uiManager?.showToast('Erreur lors de la mise à jour', 'error');
            return false;
        }
    }
    
    async deleteMember(memberId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) {
            return false;
        }
        
        try {
            // Sauvegarder
            if (window.dataManager) {
                await window.dataManager.deleteTeamMember(memberId);
            } else {
                this.members = this.members.filter(m => m.id !== memberId);
                this.saveToLocalStorage();
                this.renderMembers();
            }
            
            window.uiManager?.showToast('Membre supprimé', 'success');
            
            return true;
            
        } catch (error) {
            console.error('❌ Erreur suppression membre:', error);
            window.uiManager?.showToast('Erreur lors de la suppression', 'error');
            return false;
        }
    }
    
    async toggleMemberStatus(memberId) {
        const member = this.members.find(m => m.id === memberId);
        if (!member) return;
        
        const newStatus = member.status === 'active' ? 'inactive' : 'active';
        
        try {
            await this.updateMember(memberId, { status: newStatus });
            
            const statusText = newStatus === 'active' ? 'activé' : 'désactivé';
            window.uiManager?.showToast(`Membre ${statusText}`, 'info');
            
        } catch (error) {
            console.error('❌ Erreur changement statut:', error);
        }
    }
    
    editMember(memberId) {
        const member = this.members.find(m => m.id === memberId);
        if (!member) return;
        
        window.uiManager?.openModal('edit-member', member);
    }
    
    handleAddMember(form) {
        const formData = new FormData(form);
        const memberData = {
            displayName: formData.get('name'),
            email: formData.get('email'),
            role: formData.get('role')
        };
        
        this.addMember(memberData);
    }
    
    validateMemberData(data) {
        if (!data.displayName || data.displayName.trim().length < 2) {
            window.uiManager?.showToast('Le nom doit faire au moins 2 caractères', 'error');
            return false;
        }
        
        if (!data.email || !this.isValidEmail(data.email)) {
            window.uiManager?.showToast('Email invalide', 'error');
            return false;
        }
        
        if (!data.role || !this.roles.some(r => r.id === data.role)) {
            window.uiManager?.showToast('Rôle invalide', 'error');
            return false;
        }
        
        return true;
    }
    
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    renderMembers() {
        const container = document.getElementById('team-members-grid');
        if (!container) return;
        
        if (this.members.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>Aucun membre</h3>
                    <p>Commencez par ajouter des membres à votre équipe</p>
                    <button class="btn" data-modal="add-member">
                        <i class="fas fa-plus"></i> Ajouter un membre
                    </button>
                </div>
            `;
            return;
        }
        
        const membersHTML = this.members.map(member => this.createMemberCard(member)).join('');
        container.innerHTML = membersHTML;
    }
    
    createMemberCard(member) {
        const role = this.roles.find(r => r.id === member.role) || this.roles[0];
        const isActive = member.status === 'active';
        const levelProgress = this.calculateLevelProgress(member.xp || 0, member.level || 1);
        
        return `
            <div class="member-card ${!isActive ? 'inactive' : ''}" data-member-id="${member.id}">
                <div class="member-avatar">
                    <img src="${member.avatar || '/assets/images/default-avatar.jpg'}" 
                         alt="${member.displayName}" 
                         onerror="this.src='/assets/images/default-avatar.jpg'">
                    <div class="member-status ${member.status}"></div>
                </div>
                
                <div class="member-info">
                    <h3 class="member-name">${member.displayName}</h3>
                    <span class="member-role" style="color: ${role.color}">
                        <i class="fas fa-${role.icon}"></i>
                        ${role.name}
                    </span>
                    <div class="member-email">${member.email}</div>
                </div>
                
                <div class="member-stats">
                    <div class="stat-item">
                        <span class="stat-value">${member.level || 1}</span>
                        <span class="stat-label">Niveau</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${member.xp || 0}</span>
                        <span class="stat-label">XP</span>
                    </div>
                    <div class="level-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${levelProgress}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="member-actions">
                    <button class="btn btn-icon" data-action="edit-member" data-member-id="${member.id}" title="Modifier">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon ${isActive ? 'btn-warning' : 'btn-success'}" 
                            data-action="toggle-status" data-member-id="${member.id}" 
                            title="${isActive ? 'Désactiver' : 'Activer'}">
                        <i class="fas fa-${isActive ? 'pause' : 'play'}"></i>
                    </button>
                    <button class="btn btn-icon btn-danger" data-action="delete-member" data-member-id="${member.id}" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    calculateLevelProgress(xp, level) {
        const xpForCurrentLevel = this.getXPForLevel(level);
        const xpForNextLevel = this.getXPForLevel(level + 1);
        const progress = ((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;
        return Math.min(100, Math.max(0, progress));
    }
    
    getXPForLevel(level) {
        return (level - 1) * 100; // 100 XP par niveau
    }
    
    showMembersLoading() {
        const container = document.getElementById('team-members-grid');
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Chargement de l'équipe...</p>
                </div>
            `;
        }
    }
    
    updateStats() {
        this.stats = {
            total: this.members.length,
            active: this.members.filter(m => m.status === 'active').length,
            inactive: this.members.filter(m => m.status === 'inactive').length,
            byRole: this.getStatsByRole(),
            averageLevel: this.getAverageLevel(),
            totalXP: this.getTotalXP()
        };
        
        this.renderStats();
    }
    
    getStatsByRole() {
        const stats = {};
        this.roles.forEach(role => {
            stats[role.id] = this.members.filter(m => m.role === role.id).length;
        });
        return stats;
    }
    
    getAverageLevel() {
        if (this.members.length === 0) return 0;
        const totalLevels = this.members.reduce((sum, m) => sum + (m.level || 1), 0);
        return Math.round(totalLevels / this.members.length * 10) / 10;
    }
    
    getTotalXP() {
        return this.members.reduce((sum, m) => sum + (m.xp || 0), 0);
    }
    
    renderStats() {
        const statsContainer = document.getElementById('team-stats-container');
        if (!statsContainer) return;
        
        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <i class="fas fa-users"></i>
                    <span class="stat-value">${this.stats.total}</span>
                    <span class="stat-label">Total membres</span>
                </div>
                <div class="stat-card">
                    <i class="fas fa-user-check"></i>
                    <span class="stat-value">${this.stats.active}</span>
                    <span class="stat-label">Actifs</span>
                </div>
                <div class="stat-card">
                    <i class="fas fa-chart-line"></i>
                    <span class="stat-value">${this.stats.averageLevel}</span>
                    <span class="stat-label">Niveau moyen</span>
                </div>
                <div class="stat-card">
                    <i class="fas fa-star"></i>
                    <span class="stat-value">${this.stats.totalXP}</span>
                    <span class="stat-label">XP Total</span>
                </div>
            </div>
            
            <div class="roles-breakdown">
                <h3>Répartition par rôle</h3>
                <div class="roles-chart">
                    ${this.renderRolesChart()}
                </div>
            </div>
        `;
    }
    
    renderRolesChart() {
        return this.roles.map(role => {
            const count = this.stats.byRole[role.id] || 0;
            const percentage = this.stats.total > 0 ? (count / this.stats.total) * 100 : 0;
            
            return `
                <div class="role-stat">
                    <div class="role-info">
                        <i class="fas fa-${role.icon}" style="color: ${role.color}"></i>
                        <span class="role-name">${role.name}</span>
                    </div>
                    <div class="role-count">${count}</div>
                    <div class="role-bar">
                        <div class="role-fill" style="width: ${percentage}%; background-color: ${role.color}"></div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    switchTab(tab) {
        // Mettre à jour les onglets
        document.querySelectorAll('.team-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });
        
        // Afficher le contenu
        document.querySelectorAll('[id^="team-"][id$="-container"]').forEach(container => {
            container.style.display = 'none';
        });
        
        const targetContainer = document.getElementById(`team-${tab}-container`);
        if (targetContainer) {
            targetContainer.style.display = 'block';
            
            // Charger le contenu spécifique
            if (tab === 'stats') {
                this.updateStats();
            } else if (tab === 'roles') {
                this.renderRoles();
            }
        }
    }
    
    renderRoles() {
        const rolesContainer = document.getElementById('team-roles-container');
        if (!rolesContainer) return;
        
        rolesContainer.innerHTML = `
            <div class="roles-grid">
                ${this.roles.map(role => `
                    <div class="role-card">
                        <div class="role-header">
                            <i class="fas fa-${role.icon}" style="color: ${role.color}"></i>
                            <h3>${role.name}</h3>
                        </div>
                        <p class="role-description">${role.description}</p>
                        <div class="role-stats">
                            <span class="role-level">Niveau ${role.level}</span>
                            <span class="role-count">${this.stats.byRole[role.id] || 0} membres</span>
                        </div>
                        <div class="role-permissions">
                            <h4>Permissions</h4>
                            <ul>
                                ${role.permissions.map(perm => `<li>${this.formatPermission(perm)}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    formatPermission(permission) {
        const permissions = {
            'all': 'Toutes les permissions',
            'manage_team': 'Gérer l\'équipe',
            'view_analytics': 'Voir les analytics',
            'create_quests': 'Créer des quêtes',
            'view_team': 'Voir l\'équipe',
            'complete_quests': 'Compléter des quêtes',
            'use_chat': 'Utiliser le chat',
            'maintenance_quests': 'Quêtes de maintenance',
            'customer_service': 'Service clientèle',
            'animation_quests': 'Quêtes d\'animation',
            'security_access': 'Accès sécurité'
        };
        
        return permissions[permission] || permission;
    }
    
    // Local Storage fallback
    saveToLocalStorage() {
        try {
            localStorage.setItem('synergia_team_members', JSON.stringify(this.members));
        } catch (error) {
            console.error('❌ Erreur sauvegarde localStorage:', error);
        }
    }
    
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('synergia_team_members');
            if (saved) {
                this.members = JSON.parse(saved);
            }
        } catch (error) {
            console.error('❌ Erreur chargement localStorage:', error);
            this.members = [];
        }
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // API publique
    getMembers() {
        return this.members;
    }
    
    getMember(id) {
        return this.members.find(m => m.id === id);
    }
    
    getActiveMembers() {
        return this.members.filter(m => m.status === 'active');
    }
    
    getMembersByRole(role) {
        return this.members.filter(m => m.role === role);
    }
    
    getStats() {
        return this.stats;
    }
    
    getRoles() {
        return this.roles;
    }
    
    getRole(roleId) {
        return this.roles.find(r => r.id === roleId);
    }
}

// Initialiser
document.addEventListener('DOMContentLoaded', () => {
    window.teamManager = new TeamManager();
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TeamManager;
}