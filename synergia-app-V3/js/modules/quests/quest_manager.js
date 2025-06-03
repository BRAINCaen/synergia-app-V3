// js/modules/quests/quest-manager.js
// Gestionnaire de quêtes pour SYNERGIA v3.0

class QuestManager {
    constructor() {
        this.quests = [];
        this.userQuests = [];
        this.currentFilter = 'daily';
        this.isLoading = false;
        this.listeners = [];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        
        // Attendre Firebase
        document.addEventListener('firebase:ready', () => {
            this.loadQuests();
            this.loadUserQuests();
        });
        
        console.log('✅ Quest Manager initialisé');
    }
    
    setupEventListeners() {
        // Formulaire de création de quête
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'create-quest-form') {
                e.preventDefault();
                this.handleCreateQuest(e.target);
            }
        });
        
        // Actions sur les quêtes
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="complete-quest"]')) {
                const questId = e.target.dataset.questId;
                this.completeQuest(questId);
            }
            
            if (e.target.matches('[data-action="start-quest"]')) {
                const questId = e.target.dataset.questId;
                this.startQuest(questId);
            }
            
            if (e.target.matches('[data-action="edit-quest"]')) {
                const questId = e.target.dataset.questId;
                this.editQuest(questId);
            }
            
            if (e.target.matches('[data-action="delete-quest"]')) {
                const questId = e.target.dataset.questId;
                this.deleteQuest(questId);
            }
        });
        
        // Onglets quêtes
        document.addEventListener('click', (e) => {
            if (e.target.matches('.quest-tab')) {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            }
        });
        
        // Data Manager subscriptions
        if (window.dataManager) {
            this.listeners.push(
                window.dataManager.subscribe('quests', (quests) => {
                    this.quests = quests || [];
                    this.renderQuests();
                })
            );
            
            this.listeners.push(
                window.dataManager.subscribe('userQuests', (userQuests) => {
                    this.userQuests = userQuests || [];
                    this.renderQuests();
                })
            );
        }
    }
    
    async loadQuests() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showQuestsLoading();
        
        try {
            if (window.dataManager) {
                this.quests = await window.dataManager.getQuests();
            } else {
                // Fallback localStorage
                this.loadFromLocalStorage();
            }
            
            this.renderQuests();
            this.generateDailyQuests();
            
        } catch (error) {
            console.error('❌ Erreur chargement quêtes:', error);
            window.uiManager?.showToast('Erreur lors du chargement des quêtes', 'error');
        } finally {
            this.isLoading = false;
        }
    }
    
    async loadUserQuests() {
        try {
            if (window.dataManager) {
                this.userQuests = await window.dataManager.getUserQuests?.() || [];
            }
        } catch (error) {
            console.error('❌ Erreur chargement quêtes utilisateur:', error);
        }
    }
    
    async createQuest(questData) {
        try {
            // Validation
            if (!this.validateQuestData(questData)) {
                return false;
            }
            
            // Ajouter données par défaut
            const newQuest = {
                ...questData,
                id: this.generateId(),
                completed: false,
                recurring: questData.type === 'daily' || questData.type === 'weekly',
                createdAt: new Date().toISOString(),
                createdBy: window.firebaseManager?.getUserId() || 'system'
            };
            
            // Calculer deadline
            if (questData.type === 'daily') {
                const tomorrow = new Date();
                tomorrow.setHours(23, 59, 59, 999);
                newQuest.deadline = tomorrow.toISOString();
            } else if (questData.type === 'weekly') {
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                nextWeek.setHours(23, 59, 59, 999);
                newQuest.deadline = nextWeek.toISOString();
            }
            
            // Sauvegarder
            if (window.dataManager) {
                await window.dataManager.addQuest(newQuest);
            } else {
                this.quests.unshift(newQuest);
                this.saveToLocalStorage();
                this.renderQuests();
            }
            
            window.uiManager?.showToast('Quête créée avec succès!', 'success');
            window.uiManager?.closeModal();
            
            // Analytics
            if (window.firebaseManager) {
                window.firebaseManager.logEvent('quest_created', {
                    quest_type: newQuest.type,
                    quest_xp: newQuest.xp,
                    total_quests: this.quests.length
                });
            }
            
            return newQuest;
            
        } catch (error) {
            console.error('❌ Erreur création quête:', error);
            window.uiManager?.showToast('Erreur lors de la création de la quête', 'error');
            return false;
        }
    }
    
    async startQuest(questId) {
        const quest = this.quests.find(q => q.id === questId);
        if (!quest) return;
        
        const user = window.firebaseManager?.getCurrentUser();
        if (!user) return;
        
        try {
            // Vérifier si déjà démarrée
            const existingUserQuest = this.userQuests.find(uq => 
                uq.questId === questId && uq.userId === user.uid && uq.status === 'active'
            );
            
            if (existingUserQuest) {
                window.uiManager?.showToast('Quête déjà démarrée', 'warning');
                return;
            }
            
            // Créer userQuest
            const userQuest = {
                userId: user.uid,
                questId: questId,
                status: 'active',
                progress: 0,
                startedAt: new Date().toISOString()
            };
            
            if (window.firebaseManager) {
                await window.firebaseManager.addDocument('userQuests', userQuest);
            }
            
            this.userQuests.push(userQuest);
            this.renderQuests();
            
            window.uiManager?.showToast('Quête démarrée!', 'success');
            
            // Analytics
            if (window.firebaseManager) {
                window.firebaseManager.logEvent('quest_started', {
                    quest_id: questId,
                    quest_type: quest.type
                });
            }
            
        } catch (error) {
            console.error('❌ Erreur démarrage quête:', error);
            window.uiManager?.showToast('Erreur lors du démarrage', 'error');
        }
    }
    
    async completeQuest(questId) {
        const quest = this.quests.find(q => q.id === questId);
        if (!quest) return;
        
        const user = window.firebaseManager?.getCurrentUser();
        if (!user) return;
        
        try {
            // Trouver la userQuest active
            const userQuest = this.userQuests.find(uq => 
                uq.questId === questId && 
                uq.userId === user.uid && 
                uq.status === 'active'
            );
            
            if (!userQuest) {
                // Démarrer automatiquement si pas encore démarrée
                await this.startQuest(questId);
                const newUserQuest = this.userQuests.find(uq => 
                    uq.questId === questId && 
                    uq.userId === user.uid && 
                    uq.status === 'active'
                );
                if (newUserQuest) {
                    await this.completeUserQuest(newUserQuest, quest);
                }
            } else {
                await this.completeUserQuest(userQuest, quest);
            }
            
        } catch (error) {
            console.error('❌ Erreur completion quête:', error);
            window.uiManager?.showToast('Erreur lors de la completion', 'error');
        }
    }
    
    async completeUserQuest(userQuest, quest) {
        try {
            // Mettre à jour userQuest
            const completionData = {
                status: 'completed',
                progress: 100,
                completedAt: new Date().toISOString(),
                xpGained: quest.xp || 10
            };
            
            if (window.firebaseManager) {
                await window.firebaseManager.updateDocument('userQuests', userQuest.id, completionData);
            }
            
            // Mettre à jour le cache local
            const index = this.userQuests.findIndex(uq => uq.id === userQuest.id);
            if (index !== -1) {
                this.userQuests[index] = { ...this.userQuests[index], ...completionData };
            }
            
            // Ajouter XP à l'utilisateur
            await this.addXPToUser(quest.xp || 10);
            
            this.renderQuests();
            
            // Notifications
            window.uiManager?.showToast(`Quête terminée! +${quest.xp || 10} XP`, 'success');
            this.showQuestCompletionEffect(quest);
            
            // Analytics
            if (window.firebaseManager) {
                window.firebaseManager.logEvent('quest_completed', {
                    quest_id: quest.id,
                    quest_type: quest.type,
                    xp_gained: quest.xp || 10
                });
            }
            
            // Vérifier les achievements
            this.checkAchievements();
            
        } catch (error) {
            console.error('❌ Erreur completion userQuest:', error);
            throw error;
        }
    }
    
    async addXPToUser(xp) {
        try {
            const user = window.firebaseManager?.getCurrentUser();
            if (!user) return;
            
            const userData = await window.firebaseManager.getCurrentUserData();
            if (!userData) return;
            
            const currentXP = userData.xp || 0;
            const currentLevel = userData.level || 1;
            const newXP = currentXP + xp;
            const newLevel = this.calculateLevel(newXP);
            
            const updateData = {
                xp: newXP,
                level: newLevel
            };
            
            // Mettre à jour les stats
            if (!userData.stats) userData.stats = {};
            updateData.stats = {
                ...userData.stats,
                questsCompleted: (userData.stats.questsCompleted || 0) + 1,
                totalXP: newXP
            };
            
            await window.dataManager.updateUser(user.uid, updateData);
            
            // Notification level up
            if (newLevel > currentLevel) {
                window.uiManager?.showToast(`Niveau ${newLevel} atteint!`, 'success');
                this.showLevelUpEffect(newLevel);
            }
            
            // Mettre à jour l'UI
            if (window.uiManager) {
                window.uiManager.updateUserStats({ ...userData, ...updateData });
            }
            
        } catch (error) {
            console.error('❌ Erreur ajout XP:', error);
        }
    }
    
    calculateLevel(xp) {
        return Math.floor(xp / 100) + 1; // 100 XP par niveau
    }
    
    async deleteQuest(questId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette quête ?')) {
            return false;
        }
        
        try {
            if (window.dataManager && window.dataManager.deleteQuest) {
                await window.dataManager.deleteQuest(questId);
            } else if (window.firebaseManager) {
                await window.firebaseManager.deleteDocument('quests', questId);
                this.quests = this.quests.filter(q => q.id !== questId);
                this.renderQuests();
            }
            
            window.uiManager?.showToast('Quête supprimée', 'success');
            
            return true;
            
        } catch (error) {
            console.error('❌ Erreur suppression quête:', error);
            window.uiManager?.showToast('Erreur lors de la suppression', 'error');
            return false;
        }
    }
    
    handleCreateQuest(form) {
        const formData = new FormData(form);
        const questData = {
            title: formData.get('title'),
            description: formData.get('description'),
            type: formData.get('type'),
            xp: parseInt(formData.get('xp')) || 10,
            priority: formData.get('priority') || 'normal'
        };
        
        this.createQuest(questData);
    }
    
    validateQuestData(data) {
        if (!data.title || data.title.trim().length < 3) {
            window.uiManager?.showToast('Le titre doit faire au moins 3 caractères', 'error');
            return false;
        }
        
        if (!data.type || !['daily', 'weekly', 'special'].includes(data.type)) {
            window.uiManager?.showToast('Type de quête invalide', 'error');
            return false;
        }
        
        if (data.xp && (data.xp < 1 || data.xp > 1000)) {
            window.uiManager?.showToast('L\'XP doit être entre 1 et 1000', 'error');
            return false;
        }
        
        return true;
    }
    
    renderQuests() {
        const container = document.getElementById('quests-container');
        if (!container) return;
        
        const filteredQuests = this.getFilteredQuests();
        
        if (filteredQuests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-scroll"></i>
                    <h3>Aucune quête ${this.getFilterLabel()}</h3>
                    <p>Les quêtes apparaîtront ici une fois créées</p>
                </div>
            `;
            return;
        }
        
        const questsHTML = filteredQuests.map(quest => this.createQuestCard(quest)).join('');
        container.innerHTML = questsHTML;
    }
    
    getFilteredQuests() {
        return this.quests.filter(quest => {
            if (this.currentFilter === 'all') return true;
            return quest.type === this.currentFilter;
        });
    }
    
    getFilterLabel() {
        const labels = {
            'daily': 'quotidienne',
            'weekly': 'hebdomadaire',
            'special': 'spéciale',
            'all': ''
        };
        return labels[this.currentFilter] || '';
    }
    
    createQuestCard(quest) {
        const user = window.firebaseManager?.getCurrentUser();
        const userQuest = user ? this.userQuests.find(uq => 
            uq.questId === quest.id && 
            uq.userId === user.uid && 
            uq.status === 'active'
        ) : null;
        
        const isCompleted = user ? this.userQuests.some(uq => 
            uq.questId === quest.id && 
            uq.userId === user.uid && 
            uq.status === 'completed' &&
            this.isCompletedToday(uq.completedAt)
        ) : false;
        
        const isStarted = !!userQuest;
        const canManage = this.canManageQuests();
        
        const priorityColors = {
            low: '#10b981',
            normal: '#6b7280',
            high: '#f59e0b',
            urgent: '#ef4444'
        };
        
        const typeIcons = {
            daily: 'calendar-day',
            weekly: 'calendar-week',
            special: 'star'
        };
        
        return `
            <div class="quest-card ${isCompleted ? 'completed' : ''} ${isStarted ? 'started' : ''}" data-quest-id="${quest.id}">
                <div class="quest-header">
                    <div class="quest-type">
                        <i class="fas fa-${typeIcons[quest.type]}"></i>
                        <span>${this.formatQuestType(quest.type)}</span>
                    </div>
                    <div class="quest-priority" style="color: ${priorityColors[quest.priority]}">
                        <i class="fas fa-circle"></i>
                        ${this.formatPriority(quest.priority)}
                    </div>
                </div>
                
                <div class="quest-content">
                    <h3 class="quest-title">${quest.title}</h3>
                    ${quest.description ? `<p class="quest-description">${quest.description}</p>` : ''}
                    
                    <div class="quest-meta">
                        <div class="quest-xp">
                            <i class="fas fa-star"></i>
                            <span>+${quest.xp || 10} XP</span>
                        </div>
                        ${quest.deadline ? `
                            <div class="quest-deadline">
                                <i class="fas fa-clock"></i>
                                <span>${this.formatDeadline(quest.deadline)}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${userQuest && userQuest.progress > 0 ? `
                        <div class="quest-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${userQuest.progress}%"></div>
                            </div>
                            <span class="progress-text">${userQuest.progress}%</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="quest-actions">
                    ${isCompleted ? `
                        <button class="btn btn-success" disabled>
                            <i class="fas fa-check"></i> Terminé
                        </button>
                    ` : isStarted ? `
                        <button class="btn btn-primary" data-action="complete-quest" data-quest-id="${quest.id}">
                            <i class="fas fa-flag-checkered"></i> Terminer
                        </button>
                    ` : `
                        <button class="btn" data-action="start-quest" data-quest-id="${quest.id}">
                            <i class="fas fa-play"></i> Commencer
                        </button>
                    `}
                    
                    ${canManage ? `
                        <button class="btn btn-icon" data-action="edit-quest" data-quest-id="${quest.id}" title="Modifier">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-icon btn-danger" data-action="delete-quest" data-quest-id="${quest.id}" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    formatQuestType(type) {
        const types = {
            daily: 'Quotidienne',
            weekly: 'Hebdomadaire',
            special: 'Spéciale'
        };
        return types[type] || type;
    }
    
    formatPriority(priority) {
        const priorities = {
            low: 'Faible',
            normal: 'Normale',
            high: 'Haute',
            urgent: 'Urgente'
        };
        return priorities[priority] || priority;
    }
    
    formatDeadline(deadline) {
        const date = new Date(deadline);
        const now = new Date();
        const diffHours = Math.ceil((date - now) / (1000 * 60 * 60));
        
        if (diffHours < 0) return 'Expiré';
        if (diffHours < 24) return `${diffHours}h restantes`;
        
        const diffDays = Math.ceil(diffHours / 24);
        return `${diffDays} jour${diffDays > 1 ? 's' : ''} restant${diffDays > 1 ? 's' : ''}`;
    }
    
    isCompletedToday(completedAt) {
        if (!completedAt) return false;
        
        const completed = new Date(completedAt);
        const today = new Date();
        
        return completed.toDateString() === today.toDateString();
    }
    
    canManageQuests() {
        // TODO: Vérifier les permissions utilisateur
        return true;
    }
    
    switchTab(tab) {
        // Mettre à jour les onglets
        document.querySelectorAll('.quest-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });
        
        this.currentFilter = tab;
        this.renderQuests();
    }
    
    showQuestsLoading() {
        const container = document.getElementById('quests-container');
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Chargement des quêtes...</p>
                </div>
            `;
        }
    }
    
    showQuestCompletionEffect(quest) {
        // Effet visuel de completion
        const effect = document.createElement('div');
        effect.className = 'quest-completion-effect';
        effect.innerHTML = `
            <div class="effect-content">
                <i class="fas fa-trophy"></i>
                <h3>Quête terminée!</h3>
                <p>+${quest.xp || 10} XP</p>
            </div>
        `;
        
        document.body.appendChild(effect);
        
        setTimeout(() => {
            effect.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            effect.classList.remove('show');
            setTimeout(() => effect.remove(), 300);
        }, 2000);
    }
    
    showLevelUpEffect(level) {
        // Effet visuel de level up
        const effect = document.createElement('div');
        effect.className = 'level-up-effect';
        effect.innerHTML = `
            <div class="effect-content">
                <i class="fas fa-arrow-up"></i>
                <h3>Niveau ${level}!</h3>
                <p>Félicitations!</p>
            </div>
        `;
        
        document.body.appendChild(effect);
        
        setTimeout(() => {
            effect.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            effect.classList.remove('show');
            setTimeout(() => effect.remove(), 300);
        }, 3000);
    }
    
    // Génération automatique de quêtes quotidiennes
    async generateDailyQuests() {
        const today = new Date().toDateString();
        const lastGeneration = localStorage.getItem('last_quest_generation');
        
        if (lastGeneration === today) return;
        
        try {
            const dailyQuests = this.getDefaultDailyQuests();
            
            for (const questData of dailyQuests) {
                // Vérifier si la quête existe déjà aujourd'hui
                const existsToday = this.quests.some(q => 
                    q.title === questData.title && 
                    q.type === 'daily' &&
                    new Date(q.createdAt).toDateString() === today
                );
                
                if (!existsToday) {
                    await this.createQuest(questData);
                }
            }
            
            localStorage.setItem('last_quest_generation', today);
            
        } catch (error) {
            console.error('❌ Erreur génération quêtes quotidiennes:', error);
        }
    }
    
    getDefaultDailyQuests() {
        return [
            {
                title: 'Vérifier la propreté des salles',
                description: 'S\'assurer que toutes les salles sont propres et rangées',
                type: 'daily',
                xp: 15,
                priority: 'normal'
            },
            {
                title: 'Accueillir les premiers clients',
                description: 'Faire un accueil chaleureux aux premiers clients de la journée',
                type: 'daily',
                xp: 10,
                priority: 'normal'
            },
            {
                title: 'Vérifier le matériel technique',
                description: 'S\'assurer que tout le matériel fonctionne correctement',
                type: 'daily',
                xp: 20,
                priority: 'high'
            },
            {
                title: 'Briefing équipe',
                description: 'Faire le point avec l\'équipe sur les objectifs du jour',
                type: 'daily',
                xp: 15,
                priority: 'normal'
            }
        ];
    }
    
    checkAchievements() {
        // TODO: Implémenter système d'achievements
        const user = window.firebaseManager?.getCurrentUser();
        if (!user) return;
        
        const completedQuests = this.userQuests.filter(uq => 
            uq.userId === user.uid && uq.status === 'completed'
        ).length;
        
        // Achievement: Première quête
        if (completedQuests === 1) {
            this.unlockAchievement('first_quest', 'Première quête terminée!');
        }
        
        // Achievement: 10 quêtes
        if (completedQuests === 10) {
            this.unlockAchievement('quest_master', 'Maître des quêtes!');
        }
        
        // Achievement: 50 quêtes
        if (completedQuests === 50) {
            this.unlockAchievement('quest_legend', 'Légende des quêtes!');
        }
    }
    
    unlockAchievement(id, title) {
        window.uiManager?.showToast(`🏆 ${title}`, 'success');
        
        if (window.firebaseManager) {
            window.firebaseManager.logEvent('achievement_unlocked', {
                achievement_id: id,
                achievement_title: title
            });
        }
    }
    
    // Local Storage fallback
    saveToLocalStorage() {
        try {
            localStorage.setItem('synergia_quests', JSON.stringify(this.quests));
            localStorage.setItem('synergia_user_quests', JSON.stringify(this.userQuests));
        } catch (error) {
            console.error('❌ Erreur sauvegarde localStorage:', error);
        }
    }
    
    loadFromLocalStorage() {
        try {
            const savedQuests = localStorage.getItem('synergia_quests');
            const savedUserQuests = localStorage.getItem('synergia_user_quests');
            
            if (savedQuests) {
                this.quests = JSON.parse(savedQuests);
            }
            
            if (savedUserQuests) {
                this.userQuests = JSON.parse(savedUserQuests);
            }
        } catch (error) {
            console.error('❌ Erreur chargement localStorage:', error);
            this.quests = [];
            this.userQuests = [];
        }
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // API publique
    getQuests(filter = null) {
        if (filter) {
            return this.quests.filter(quest => quest.type === filter);
        }
        return this.quests;
    }
    
    getQuest(id) {
        return this.quests.find(q => q.id === id);
    }
    
    getUserQuests(userId = null) {
        if (userId) {
            return this.userQuests.filter(uq => uq.userId === userId);
        }
        return this.userQuests;
    }
    
    getActiveQuests(userId = null) {
        const user = userId || window.firebaseManager?.getUserId();
        if (!user) return [];
        
        return this.userQuests.filter(uq => 
            uq.userId === user && uq.status === 'active'
        );
    }
    
    getCompletedQuests(userId = null) {
        const user = userId || window.firebaseManager?.getUserId();
        if (!user) return [];
        
        return this.userQuests.filter(uq => 
            uq.userId === user && uq.status === 'completed'
        );
    }
    
    getTodayQuests() {
        const today = new Date().toDateString();
        return this.quests.filter(quest => {
            if (quest.type === 'daily') return true;
            if (quest.deadline) {
                return new Date(quest.deadline).toDateString() === today;
            }
            return false;
        });
    }
    
    getQuestStats(userId = null) {
        const user = userId || window.firebaseManager?.getUserId();
        if (!user) return {};
        
        const userQuests = this.getUserQuests(user);
        const completed = userQuests.filter(uq => uq.status === 'completed');
        const active = userQuests.filter(uq => uq.status === 'active');
        
        return {
            total: userQuests.length,
            completed: completed.length,
            active: active.length,
            completionRate: userQuests.length > 0 ? (completed.length / userQuests.length) * 100 : 0,
            totalXP: completed.reduce((sum, uq) => sum + (uq.xpGained || 0), 0)
        };
    }
    
    // Recherche et filtrage
    searchQuests(query) {
        const lowerQuery = query.toLowerCase();
        return this.quests.filter(quest => 
            quest.title.toLowerCase().includes(lowerQuery) ||
            (quest.description && quest.description.toLowerCase().includes(lowerQuery))
        );
    }
    
    filterQuestsByPriority(priority) {
        return this.quests.filter(quest => quest.priority === priority);
    }
    
    getExpiredQuests() {
        const now = new Date();
        return this.quests.filter(quest => 
            quest.deadline && new Date(quest.deadline) < now && !quest.completed
        );
    }
    
    getUpcomingDeadlines(days = 7) {
        const now = new Date();
        const future = new Date();
        future.setDate(now.getDate() + days);
        
        return this.quests.filter(quest => 
            quest.deadline && 
            new Date(quest.deadline) > now && 
            new Date(quest.deadline) <= future &&
            !quest.completed
        );
    }
    
    // Utilitaires pour le dashboard
    getDashboardQuests() {
        const user = window.firebaseManager?.getCurrentUser();
        if (!user) return [];
        
        const todayQuests = this.getTodayQuests();
        const userActiveQuests = this.getActiveQuests(user.uid);
        
        // Combiner et dédupliquer
        const dashboardQuests = [];
        const seenIds = new Set();
        
        // Ajouter les quêtes actives de l'utilisateur
        userActiveQuests.forEach(userQuest => {
            const quest = this.getQuest(userQuest.questId);
            if (quest && !seenIds.has(quest.id)) {
                dashboardQuests.push({
                    ...quest,
                    userQuest,
                    isActive: true
                });
                seenIds.add(quest.id);
            }
        });
        
        // Ajouter les quêtes du jour non démarrées
        todayQuests.forEach(quest => {
            if (!seenIds.has(quest.id)) {
                const userQuest = this.userQuests.find(uq => 
                    uq.questId === quest.id && 
                    uq.userId === user.uid
                );
                
                if (!userQuest || userQuest.status !== 'completed') {
                    dashboardQuests.push({
                        ...quest,
                        userQuest,
                        isActive: false
                    });
                    seenIds.add(quest.id);
                }
            }
        });
        
        return dashboardQuests.slice(0, 5); // Limiter à 5 quêtes
    }
    
    renderDashboardQuests() {
        const container = document.getElementById('daily-quests-container');
        if (!container) return;
        
        const dashboardQuests = this.getDashboardQuests();
        
        if (dashboardQuests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <p>Toutes les quêtes sont terminées!</p>
                </div>
            `;
            return;
        }
        
        const questsHTML = dashboardQuests.map(quest => `
            <div class="dashboard-quest ${quest.isActive ? 'active' : ''}" data-quest-id="${quest.id}">
                <div class="quest-icon">
                    <i class="fas fa-${quest.type === 'daily' ? 'calendar-day' : quest.type === 'weekly' ? 'calendar-week' : 'star'}"></i>
                </div>
                <div class="quest-info">
                    <h4>${quest.title}</h4>
                    <span class="quest-xp">+${quest.xp || 10} XP</span>
                </div>
                <div class="quest-action">
                    ${quest.userQuest?.status === 'completed' ? `
                        <i class="fas fa-check-circle text-success"></i>
                    ` : quest.isActive ? `
                        <button class="btn btn-sm btn-primary" data-action="complete-quest" data-quest-id="${quest.id}">
                            Terminer
                        </button>
                    ` : `
                        <button class="btn btn-sm" data-action="start-quest" data-quest-id="${quest.id}">
                            Commencer
                        </button>
                    `}
                </div>
            </div>
        `).join('');
        
        container.innerHTML = questsHTML;
    }
    
    // Nettoyage
    cleanup() {
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners = [];
    }
}

// Initialiser
document.addEventListener('DOMContentLoaded', () => {
    window.questManager = new QuestManager();
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuestManager;
}