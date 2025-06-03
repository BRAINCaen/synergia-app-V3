// js/core/ui-manager.js
// Gestionnaire d'interface unifié pour SYNERGIA

class UIManager {
    constructor() {
        this.currentPage = 'dashboard';
        this.isInitialized = false;
        this.components = new Map();
        this.eventListeners = new Map();
        this.toastQueue = [];
        this.init();
    }

    async init() {
        // Attendre que le DOM soit prêt
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }

        // Initialiser les composants de base
        this.initializeNavigation();
        this.initializeHeader();
        this.initializeModals();
        this.initializeToasts();
        
        // Écouter les événements globaux
        this.setupGlobalListeners();
        
        // Charger la page initiale
        this.navigateTo('dashboard');
        
        this.isInitialized = true;
        console.log('✅ UIManager initialisé');
    }

    // Navigation
    initializeNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) {
                    this.navigateTo(page);
                }
            });
        });
    }

    navigateTo(page) {
        // Cacher toutes les pages
        document.querySelectorAll('.page-content').forEach(p => {
            p.classList.remove('active');
        });

        // Afficher la page demandée
        const pageElement = document.getElementById(`${page}-page`);
        if (pageElement) {
            pageElement.classList.add('active');
            this.currentPage = page;
            
            // Mettre à jour la navigation
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.toggle('active', item.dataset.page === page);
            });

            // Charger le contenu de la page
            this.loadPageContent(page);
            
            // Analytics
            this.trackPageView(page);
        }
    }

    async loadPageContent(page) {
        switch (page) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'quests':
                await this.loadQuests();
                break;
            case 'team':
                await this.loadTeam();
                break;
            case 'planning':
                await this.loadPlanning();
                break;
            case 'chat':
                await this.loadChat();
                break;
        }
    }

    // Header
    initializeHeader() {
        // Écouter les changements d'utilisateur
        document.addEventListener('user:updated', (e) => {
            this.updateUserHeader(e.detail);
        });

        // Bouton déconnexion
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.confirmLogout();
            });
        }
    }

    updateUserHeader(userData) {
        const elements = {
            avatar: document.getElementById('user-avatar'),
            name: document.getElementById('user-name'),
            role: document.getElementById('user-role'),
            level: document.getElementById('user-level'),
            xp: document.getElementById('user-xp'),
            xpBar: document.getElementById('user-xp-bar')
        };

        if (elements.avatar) {
            elements.avatar.src = userData.photoURL || this.getDefaultAvatar(userData.displayName);
        }
        if (elements.name) {
            elements.name.textContent = userData.displayName || 'Utilisateur';
        }
        if (elements.role) {
            const role = window.teamManager?.getRole(userData.role);
            elements.role.textContent = role?.name || userData.role || 'Membre';
            elements.role.style.color = role?.color || '#8b5cf6';
        }
        if (elements.level) {
            elements.level.textContent = `Niveau ${userData.level || 1}`;
        }
        if (elements.xp) {
            const currentLevelXP = Math.pow(userData.level - 1, 2) * 100;
            const nextLevelXP = Math.pow(userData.level, 2) * 100;
            const progressXP = userData.xp - currentLevelXP;
            const neededXP = nextLevelXP - currentLevelXP;
            
            elements.xp.textContent = `${progressXP} / ${neededXP} XP`;
            
            if (elements.xpBar) {
                const percentage = (progressXP / neededXP) * 100;
                elements.xpBar.style.width = `${percentage}%`;
            }
        }
    }

    // Dashboard
    async loadDashboard() {
        try {
            // Charger les stats utilisateur
            const userData = await window.firebaseManager.getCurrentUserData();
            if (userData) {
                this.updateDashboardStats(userData);
            }

            // Charger les quêtes du jour
            const dailyQuests = window.questManager?.getDailyQuests() || [];
            this.updateDailyQuests(dailyQuests);

            // Charger l'activité équipe
            const teamStats = await window.teamManager?.getTeamStats();
            if (teamStats) {
                this.updateTeamActivity(teamStats);
            }
        } catch (error) {
            console.error('❌ Erreur chargement dashboard:', error);
            this.showToast('Erreur lors du chargement du dashboard', 'error');
        }
    }

    updateDashboardStats(userData) {
        const stats = {
            questsCompleted: userData.stats?.questsCompleted || 0,
            totalXP: userData.stats?.totalXP || userData.xp || 0,
            streak: userData.stats?.streak || 0,
            badges: userData.badges?.length || 0
        };

        // Mettre à jour les éléments
        Object.entries(stats).forEach(([key, value]) => {
            const element = document.querySelector(`[data-stat="${key}"]`);
            if (element) {
                element.textContent = value;
            }
        });
    }

    updateDailyQuests(quests) {
        const container = document.getElementById('daily-quests-container');
        if (!container) return;

        container.innerHTML = '';
        
        if (quests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <p>Aucune quête quotidienne pour aujourd'hui</p>
                </div>
            `;
            return;
        }

        quests.slice(0, 3).forEach(quest => {
            const questCard = this.createQuestCard(quest, true);
            container.appendChild(questCard);
        });
    }

    updateTeamActivity(stats) {
        const container = document.getElementById('team-activity-container');
        if (!container) return;

        container.innerHTML = `
            <div class="team-stats-grid">
                <div class="stat-card">
                    <i class="fas fa-users"></i>
                    <div class="stat-info">
                        <span class="stat-value">${stats.activeMembers}</span>
                        <span class="stat-label">Membres actifs</span>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-star"></i>
                    <div class="stat-info">
                        <span class="stat-value">${stats.totalXP}</span>
                        <span class="stat-label">XP total équipe</span>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-trophy"></i>
                    <div class="stat-info">
                        <span class="stat-value">${stats.questsCompleted}</span>
                        <span class="stat-label">Quêtes complétées</span>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-chart-line"></i>
                    <div class="stat-info">
                        <span class="stat-value">${stats.averageLevel}</span>
                        <span class="stat-label">Niveau moyen</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Quêtes
    async loadQuests() {
        // Écouter les mises à jour des quêtes
        document.addEventListener('quest:quests:updated', (e) => {
            this.updateQuestsDisplay(e.detail);
        });

        // Charger l'onglet actif
        const activeTab = document.querySelector('.quest-tab.active')?.dataset.tab || 'daily';
        this.loadQuestTab(activeTab);

        // Gérer les onglets
        document.querySelectorAll('.quest-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.quest-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.loadQuestTab(tab.dataset.tab);
            });
        });

        // Bouton création quête
        const createBtn = document.getElementById('create-quest-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.showCreateQuestModal();
            });
        }
    }

    loadQuestTab(type) {
        const container = document.getElementById('quests-container');
        if (!container) return;

        let quests = [];
        switch (type) {
            case 'daily':
                quests = window.questManager?.getDailyQuests() || [];
                break;
            case 'weekly':
                quests = window.questManager?.getWeeklyQuests() || [];
                break;
            case 'special':
                quests = window.questManager?.getSpecialQuests() || [];
                break;
        }

        this.displayQuests(quests, container);
    }

    displayQuests(quests, container) {
        container.innerHTML = '';
        
        if (quests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-scroll"></i>
                    <p>Aucune quête dans cette catégorie</p>
                </div>
            `;
            return;
        }

        quests.forEach(quest => {
            const questCard = this.createQuestCard(quest);
            container.appendChild(questCard);
        });
    }

    createQuestCard(quest, compact = false) {
        const userQuest = window.questManager?.getUserQuest(quest.id);
        const isAssigned = !!userQuest;
        const isCompleted = userQuest?.status === 'completed';
        
        const card = document.createElement('div');
        card.className = `quest-card ${compact ? 'compact' : ''} ${isCompleted ? 'completed' : ''}`;
        card.innerHTML = `
            <div class="quest-header">
                <h3 class="quest-title">${quest.title}</h3>
                <span class="quest-xp">${quest.xp} XP</span>
            </div>
            ${!compact ? `
                <p class="quest-description">${quest.description || 'Aucune description'}</p>
                <div class="quest-meta">
                    <span class="quest-type ${quest.type}">${this.getQuestTypeLabel(quest.type)}</span>
                    <span class="quest-priority ${quest.priority}">${this.getPriorityLabel(quest.priority)}</span>
                    ${quest.deadline ? `<span class="quest-deadline">
                        <i class="far fa-clock"></i> ${this.formatDeadline(quest.deadline)}
                    </span>` : ''}
                </div>
            ` : ''}
            ${userQuest ? `
                <div class="quest-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${userQuest.progress || 0}%"></div>
                    </div>
                    <span class="progress-text">${userQuest.progress || 0}%</span>
                </div>
            ` : ''}
            <div class="quest-actions">
                ${!isAssigned && !isCompleted ? `
                    <button class="btn btn-primary btn-sm" onclick="uiManager.acceptQuest('${quest.id}')">
                        <i class="fas fa-plus"></i> Accepter
                    </button>
                ` : ''}
                ${isAssigned && !isCompleted ? `
                    <button class="btn btn-success btn-sm" onclick="uiManager.completeQuest('${quest.id}')">
                        <i class="fas fa-check"></i> Terminer
                    </button>
                ` : ''}
                ${isCompleted ? `
                    <span class="quest-completed-badge">
                        <i class="fas fa-check-circle"></i> Complétée
                    </span>
                ` : ''}
            </div>
        `;
        
        return card;
    }

    async acceptQuest(questId) {
        try {
            const userId = window.firebaseManager.currentUser?.uid;
            if (!userId) {
                this.showToast('Vous devez être connecté', 'error');
                return;
            }

            await window.questManager.assignQuestToUser(questId, userId);
            this.showToast('Quête acceptée !', 'success');
            this.loadQuestTab(document.querySelector('.quest-tab.active')?.dataset.tab || 'daily');
        } catch (error) {
            this.showToast('Erreur lors de l\'acceptation de la quête', 'error');
        }
    }

    async completeQuest(questId) {
        try {
            const userId = window.firebaseManager.currentUser?.uid;
            if (!userId) {
                this.showToast('Vous devez être connecté', 'error');
                return;
            }

            const xpGained = await window.questManager.completeQuest(questId, userId);
            this.showToast(`Quête complétée ! +${xpGained} XP`, 'success');
            
            // Recharger les données utilisateur
            const userData = await window.firebaseManager.getCurrentUserData();
            if (userData) {
                this.updateUserHeader(userData);
                document.dispatchEvent(new CustomEvent('user:updated', { detail: userData }));
            }
            
            this.loadQuestTab(document.querySelector('.quest-tab.active')?.dataset.tab || 'daily');
        } catch (error) {
            this.showToast('Erreur lors de la complétion de la quête', 'error');
        }
    }

    // Équipe
    async loadTeam() {
        // Écouter les mises à jour de l'équipe
        document.addEventListener('team:team:updated', (e) => {
            this.updateTeamDisplay(e.detail);
        });

        // Charger les membres
        const members = window.teamManager?.getTeamArray() || [];
        this.updateTeamDisplay(members);

        // Gérer les onglets
        document.querySelectorAll('.team-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.team-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.loadTeamTab(tab.dataset.tab);
            });
        });

        // Bouton ajout membre
        const addBtn = document.getElementById('add-member-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.showAddMemberModal();
            });
        }
    }

    loadTeamTab(tab) {
        const containers = {
            members: document.getElementById('team-members-container'),
            roles: document.getElementById('team-roles-container'),
            stats: document.getElementById('team-stats-container')
        };

        // Cacher tous les conteneurs
        Object.values(containers).forEach(c => {
            if (c) c.style.display = 'none';
        });

        // Afficher le conteneur actif
        if (containers[tab]) {
            containers[tab].style.display = 'block';
            
            switch (tab) {
                case 'members':
                    this.loadTeamMembers();
                    break;
                case 'roles':
                    this.loadTeamRoles();
                    break;
                case 'stats':
                    this.loadTeamStats();
                    break;
            }
        }
    }

    updateTeamDisplay(members) {
        const container = document.getElementById('team-members-grid');
        if (!container) return;

        container.innerHTML = '';
        
        if (members.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>Aucun membre dans l'équipe</p>
                </div>
            `;
            return;
        }

        members.forEach(member => {
            const memberCard = this.createMemberCard(member);
            container.appendChild(memberCard);
        });
    }

    createMemberCard(member) {
        const role = window.teamManager?.getRole(member.role);
        const card = document.createElement('div');
        card.className = 'member-card';
        card.innerHTML = `
            <div class="member-avatar">
                <img src="${member.avatar || this.getDefaultAvatar(member.displayName)}" alt="${member.displayName}">
                <span class="member-status ${member.status}"></span>
            </div>
            <div class="member-info">
                <h4 class="member-name">${member.displayName}</h4>
                <span class="member-role" style="color: ${role?.color || '#8b5cf6'}">
                    <i class="fas ${role?.icon || 'fa-user'}"></i> ${role?.name || member.role}
                </span>
            </div>
            <div class="member-stats">
                <div class="stat">
                    <span class="stat-value">${member.level || 1}</span>
                    <span class="stat-label">Niveau</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${member.xp || 0}</span>
                    <span class="stat-label">XP</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${member.stats?.questsCompleted || 0}</span>
                    <span class="stat-label">Quêtes</span>
                </div>
            </div>
            <div class="member-actions">
                ${window.firebaseManager.isAdmin() ? `
                    <button class="btn btn-icon" onclick="uiManager.editMember('${member.id}')" title="Modifier">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon btn-danger" onclick="uiManager.deleteMember('${member.id}')" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        `;
        
        return card;
    }

    async loadTeamRoles() {
        const container = document.getElementById('team-roles-container');
        if (!container) return;

        const roles = window.teamManager?.getRoles() || [];
        
        container.innerHTML = `
            <div class="roles-grid">
                ${roles.map(role => `
                    <div class="role-card" style="border-color: ${role.color}">
                        <div class="role-header" style="background: ${role.color}20">
                            <i class="fas ${role.icon}" style="color: ${role.color}"></i>
                            <h3>${role.name}</h3>
                        </div>
                        <p class="role-description">${role.description || 'Aucune description'}</p>
                        <div class="role-meta">
                            <span>Niveau ${role.level}</span>
                            <span>${window.teamManager?.getMembersByRole(role.id).length || 0} membres</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async loadTeamStats() {
        const container = document.getElementById('team-stats-container');
        if (!container) return;

        const stats = await window.teamManager?.getTeamStats();
        if (!stats) return;

        container.innerHTML = `
            <div class="stats-overview">
                <div class="stats-grid">
                    <div class="stat-box">
                        <i class="fas fa-users"></i>
                        <div class="stat-content">
                            <span class="stat-value">${stats.totalMembers}</span>
                            <span class="stat-label">Membres total</span>
                        </div>
                    </div>
                    <div class="stat-box">
                        <i class="fas fa-user-check"></i>
                        <div class="stat-content">
                            <span class="stat-value">${stats.activeMembers}</span>
                            <span class="stat-label">Membres actifs</span>
                        </div>
                    </div>
                    <div class="stat-box">
                        <i class="fas fa-star"></i>
                        <div class="stat-content">
                            <span class="stat-value">${stats.totalXP}</span>
                            <span class="stat-label">XP total</span>
                        </div>
                    </div>
                    <div class="stat-box">
                        <i class="fas fa-layer-group"></i>
                        <div class="stat-content">
                            <span class="stat-value">${stats.averageLevel}</span>
                            <span class="stat-label">Niveau moyen</span>
                        </div>
                    </div>
                </div>
                
                <div class="roles-distribution">
                    <h3>Répartition par rôle</h3>
                    <div class="distribution-chart">
                        ${Object.entries(stats.byRole).map(([roleId, count]) => {
                            const role = window.teamManager?.getRole(roleId);
                            const percentage = (count / stats.totalMembers) * 100;
                            return `
                                <div class="distribution-item">
                                    <div class="distribution-label">
                                        <span style="color: ${role?.color}">${role?.name || roleId}</span>
                                        <span>${count}</span>
                                    </div>
                                    <div class="distribution-bar">
                                        <div class="distribution-fill" style="width: ${percentage}%; background: ${role?.color}"></div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Planning (placeholder)
    async loadPlanning() {
        const container = document.getElementById('planning-page');
        if (!container) return;

        container.innerHTML = `
            <div class="page-header">
                <h1>Planning & Calendrier</h1>
                <button class="btn btn-primary">
                    <i class="fas fa-plus"></i> Ajouter un événement
                </button>
            </div>
            
            <div class="coming-soon">
                <i class="fas fa-calendar-alt"></i>
                <h2>Fonctionnalité en cours de développement</h2>
                <p>Le système de planning et calendrier sera bientôt disponible.</p>
                <p>Vous pourrez gérer les shifts, les congés et les événements de l'équipe.</p>
            </div>
        `;
    }

    // Chat (placeholder)
    async loadChat() {
        const container = document.getElementById('chat-page');
        if (!container) return;

        container.innerHTML = `
            <div class="page-header">
                <h1>Chat d'Équipe</h1>
            </div>
            
            <div class="coming-soon">
                <i class="fas fa-comments"></i>
                <h2>Fonctionnalité en cours de développement</h2>
                <p>Le chat d'équipe en temps réel sera bientôt disponible.</p>
                <p>Vous pourrez communiquer avec votre équipe et partager des fichiers.</p>
            </div>
        `;
    }

    // Modals
    initializeModals() {
        // Fermeture des modals
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') || e.target.classList.contains('modal-close')) {
                this.closeAllModals();
            }
        });

        // Escape pour fermer
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }

    showCreateQuestModal() {
        const modal = document.getElementById('create-quest-modal');
        if (!modal) {
            this.createQuestModal();
        }
        this.showModal('create-quest-modal');
    }

    createQuestModal() {
        const modal = document.createElement('div');
        modal.id = 'create-quest-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Créer une nouvelle quête</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <form id="create-quest-form" class="modal-body">
                    <div class="form-group">
                        <label for="quest-title">Titre de la quête</label>
                        <input type="text" id="quest-title" name="title" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="quest-description">Description</label>
                        <textarea id="quest-description" name="description" rows="3"></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="quest-type">Type</label>
                            <select id="quest-type" name="type" required>
                                <option value="daily">Quotidienne</option>
                                <option value="weekly">Hebdomadaire</option>
                                <option value="special">Spéciale</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="quest-xp">Points XP</label>
                            <input type="number" id="quest-xp" name="xp" min="10" max="1000" value="100" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="quest-priority">Priorité</label>
                            <select id="quest-priority" name="priority">
                                <option value="low">Basse</option>
                                <option value="normal" selected>Normale</option>
                                <option value="high">Haute</option>
                                <option value="urgent">Urgente</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="quest-assignee">Assigner à</label>
                            <select id="quest-assignee" name="assignedTo">
                                <option value="">Tous les membres</option>
                                ${window.teamManager?.getTeamArray().map(member => 
                                    `<option value="${member.userId || member.id}">${member.displayName}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" name="recurring" id="quest-recurring">
                            Quête récurrente
                        </label>
                    </div>
                    
                    <div id="recurring-options" style="display: none">
                        <label>Jours de récurrence</label>
                        <div class="recurring-days">
                            ${['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, i) => `
                                <label class="day-checkbox">
                                    <input type="checkbox" name="recurringDays" value="${i === 6 ? 0 : i + 1}">
                                    ${day}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </form>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="uiManager.closeModal('create-quest-modal')">Annuler</button>
                    <button class="btn btn-primary" onclick="uiManager.submitCreateQuest()">Créer la quête</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Gérer l'affichage des options récurrentes
        document.getElementById('quest-recurring').addEventListener('change', (e) => {
            document.getElementById('recurring-options').style.display = e.target.checked ? 'block' : 'none';
        });
    }

    async submitCreateQuest() {
        const form = document.getElementById('create-quest-form');
        const formData = new FormData(form);
        
        const questData = {
            title: formData.get('title'),
            description: formData.get('description'),
            type: formData.get('type'),
            xp: parseInt(formData.get('xp')),
            priority: formData.get('priority'),
            assignedTo: formData.get('assignedTo') || null,
            recurring: formData.get('recurring') === 'on',
            recurringDays: []
        };
        
        // Récupérer les jours de récurrence si nécessaire
        if (questData.recurring) {
            formData.getAll('recurringDays').forEach(day => {
                questData.recurringDays.push(parseInt(day));
            });
        }
        
        try {
            await window.questManager.createQuest(questData);
            this.showToast('Quête créée avec succès !', 'success');
            this.closeModal('create-quest-modal');
            form.reset();
        } catch (error) {
            this.showToast('Erreur lors de la création de la quête', 'error');
        }
    }

    showAddMemberModal() {
        const modal = document.getElementById('add-member-modal');
        if (!modal) {
            this.createAddMemberModal();
        }
        this.showModal('add-member-modal');
    }

    createAddMemberModal() {
        const modal = document.createElement('div');
        modal.id = 'add-member-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Ajouter un membre à l'équipe</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <form id="add-member-form" class="modal-body">
                    <div class="form-group">
                        <label for="member-name">Nom complet</label>
                        <input type="text" id="member-name" name="displayName" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="member-email">Email</label>
                        <input type="email" id="member-email" name="email" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="member-role">Rôle</label>
                        <select id="member-role" name="role" required>
                            ${window.teamManager?.getRoles().map(role => 
                                `<option value="${role.id}">${role.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" name="createAccount" id="member-create-account">
                            Créer un compte utilisateur (envoi d'email avec mot de passe)
                        </label>
                    </div>
                </form>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="uiManager.closeModal('add-member-modal')">Annuler</button>
                    <button class="btn btn-primary" onclick="uiManager.submitAddMember()">Ajouter le membre</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    async submitAddMember() {
        const form = document.getElementById('add-member-form');
        const formData = new FormData(form);
        
        const memberData = {
            displayName: formData.get('displayName'),
            email: formData.get('email'),
            role: formData.get('role'),
            createAccount: formData.get('createAccount') === 'on'
        };
        
        try {
            await window.teamManager.addMember(memberData);
            this.showToast('Membre ajouté avec succès !', 'success');
            this.closeModal('add-member-modal');
            form.reset();
        } catch (error) {
            this.showToast(error.message || 'Erreur lors de l\'ajout du membre', 'error');
        }
    }

    async editMember(memberId) {
        // TODO: Implémenter l'édition de membre
        this.showToast('Fonctionnalité en cours de développement', 'info');
    }

    async deleteMember(memberId) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) {
            try {
                await window.teamManager.deleteMember(memberId);
                this.showToast('Membre supprimé', 'success');
            } catch (error) {
                this.showToast('Erreur lors de la suppression', 'error');
            }
        }
    }

    confirmLogout() {
        if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
            window.firebaseManager.signOut().then(() => {
                window.location.reload();
            });
        }
    }

    // Toasts
    initializeToasts() {
        // Créer le conteneur de toasts s'il n'existe pas
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
    }

    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        }[type] || 'fa-info-circle';
        
        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;
        
        const container = document.getElementById('toast-container');
        container.appendChild(toast);
        
        // Animation d'entrée
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Suppression automatique
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // Utilitaires
    getDefaultAvatar(name) {
        return window.teamManager?.generateAvatar(name) || '/assets/images/default-avatar.jpg';
    }

    formatDeadline(deadline) {
        if (!deadline) return '';
        
        const date = deadline.toDate ? deadline.toDate() : new Date(deadline);
        const now = new Date();
        const diff = date - now;
        
        if (diff < 0) return 'Expiré';
        if (diff < 86400000) return 'Aujourd\'hui';
        if (diff < 172800000) return 'Demain';
        
        return date.toLocaleDateString('fr-FR');
    }

    getQuestTypeLabel(type) {
        const labels = {
            daily: 'Quotidienne',
            weekly: 'Hebdomadaire',
            special: 'Spéciale'
        };
        return labels[type] || type;
    }

    getPriorityLabel(priority) {
        const labels = {
            low: 'Basse',
            normal: 'Normale',
            high: 'Haute',
            urgent: 'Urgente'
        };
        return labels[priority] || priority;
    }

    // Analytics
    trackPageView(page) {
        if (window.firebaseManager?.analytics) {
            window.firebaseManager.analytics.logEvent('page_view', {
                page_name: page,
                user_id: window.firebaseManager.currentUser?.uid
            });
        }
    }

    // Listeners globaux
    setupGlobalListeners() {
        // Niveau up
        document.addEventListener('user:levelUp', (e) => {
            const { newLevel, oldLevel } = e.detail;
            this.showToast(`🎉 Félicitations ! Vous êtes passé au niveau ${newLevel} !`, 'success', 5000);
        });

        // Quête complétée
        document.addEventListener('quest:quest:completed', (e) => {
            const { xp } = e.detail;
            this.showToast(`✅ Quête complétée ! +${xp} XP`, 'success');
        });

        // Erreurs Firebase
        window.addEventListener('unhandledrejection', (e) => {
            if (e.reason?.code?.includes('firebase')) {
                console.error('Erreur Firebase:', e.reason);
                this.showToast('Erreur de connexion au serveur', 'error');
            }
        });
    }
}

// Instance globale
window.uiManager = new UIManager();

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}