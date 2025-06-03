// js/modules/quests/quest-manager.js
// Système de missions gamifié pour SYNERGIA v3.0

class QuestManager {
    constructor() {
        this.quests = new Map();
        this.userQuests = new Map();
        this.dailyQuests = [];
        this.weeklyQuests = [];
        this.specialQuests = [];
        this.completedQuests = new Set();
        
        // Configuration XP et niveaux
        this.xpConfig = {
            baseXP: 100,
            multiplier: 1.2,
            maxLevel: 50,
            bonusStreak: 1.5
        };
        
        // Types de missions
        this.questTypes = {
            daily: { name: 'Quotidienne', icon: 'calendar-day', color: '#3b82f6', baseXP: 50 },
            weekly: { name: 'Hebdomadaire', icon: 'calendar-week', color: '#8b5cf6', baseXP: 200 },
            special: { name: 'Spéciale', icon: 'star', color: '#f59e0b', baseXP: 300 }
        };
        
        this.badges = new Map();
        this.isInitialized = false;
        this.listeners = new Map();
        
        console.log('🎯 Quest Manager créé');
    }

    async init() {
        try {
            console.log('🎯 Initialisation Quest Manager...');
            
            // Charger les quêtes prédéfinies
            this.loadDefaultQuests();
            
            // Charger les badges
            this.loadDefaultBadges();
            
            // Charger les quêtes utilisateur si connecté
            await this.loadUserQuests();
            
            // Générer les quêtes du jour
            this.generateDailyQuests();
            
            // Configurer les événements
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Quest Manager initialisé');
            
            return true;
        } catch (error) {
            console.error('❌ Erreur initialisation Quest Manager:', error);
            throw error;
        }
    }

    loadDefaultQuests() {
        const defaultQuests = [
            // Quêtes quotidiennes
            {
                id: 'daily_checkin',
                type: 'daily',
                title: 'Pointer son arrivée',
                description: 'Effectuer le pointage d\'arrivée avant 9h',
                category: 'attendance',
                xp: 25,
                requirements: { type: 'badging', action: 'checkin' }
            },
            {
                id: 'daily_team_message',
                type: 'daily',
                title: 'Message d\'équipe',
                description: 'Participer à la communication d\'équipe',
                category: 'communication',
                xp: 15,
                requirements: { type: 'chat', action: 'send_message', count: 3 }
            },
            {
                id: 'daily_perfect_day',
                type: 'daily',
                title: 'Journée parfaite',
                description: 'Compléter une journée de travail sans incident',
                category: 'attendance',
                xp: 50,
                requirements: { type: 'attendance', action: 'perfect_day' }
            },
            
            // Quêtes hebdomadaires
            {
                id: 'weekly_early_bird',
                type: 'weekly',
                title: 'Lève-tôt de la semaine',
                description: 'Arriver tôt 4 fois dans la semaine',
                category: 'attendance',
                xp: 100,
                requirements: { type: 'badging', action: 'early_arrival', count: 4 }
            },
            {
                id: 'weekly_team_player',
                type: 'weekly',
                title: 'Esprit d\'équipe',
                description: 'Collaborer efficacement avec l\'équipe',
                category: 'teamwork',
                xp: 150,
                requirements: { type: 'teamwork', action: 'collaborate', count: 5 }
            },
            
            // Quêtes spéciales
            {
                id: 'special_first_week',
                type: 'special',
                title: 'Bienvenue !',
                description: 'Terminer votre première semaine',
                category: 'onboarding',
                xp: 200,
                requirements: { type: 'milestone', action: 'first_week' }
            },
            {
                id: 'special_month_streak',
                type: 'special',
                title: 'Régularité exemplaire',
                description: 'Maintenir un streak de 30 jours',
                category: 'achievement',
                xp: 500,
                requirements: { type: 'streak', count: 30 }
            }
        ];

        // Charger les quêtes
        for (const questData of defaultQuests) {
            const quest = this.createQuest(questData);
            this.quests.set(quest.id, quest);
            
            // Trier par type
            switch (quest.type) {
                case 'daily':
                    this.dailyQuests.push(quest);
                    break;
                case 'weekly':
                    this.weeklyQuests.push(quest);
                    break;
                case 'special':
                    this.specialQuests.push(quest);
                    break;
            }
        }

        console.log(`📜 ${defaultQuests.length} quêtes chargées`);
    }

    loadDefaultBadges() {
        const defaultBadges = [
            {
                id: 'first_quest',
                name: 'Premier pas',
                description: 'Première mission complétée',
                icon: 'trophy',
                color: '#f59e0b',
                rarity: 'common',
                requirements: { type: 'quest_count', count: 1 }
            },
            {
                id: 'quest_master',
                name: 'Maître des missions',
                description: '10 missions complétées',
                icon: 'crown',
                color: '#8b5cf6',
                rarity: 'rare',
                requirements: { type: 'quest_count', count: 10 }
            },
            {
                id: 'early_bird',
                name: 'Lève-tôt',
                description: '7 arrivées matinales',
                icon: 'sun',
                color: '#f97316',
                rarity: 'uncommon',
                requirements: { type: 'early_arrival', count: 7 }
            },
            {
                id: 'team_player',
                name: 'Esprit d\'équipe',
                description: '5 collaborations réussies',
                icon: 'users',
                color: '#10b981',
                rarity: 'uncommon',
                requirements: { type: 'team_quest_count', count: 5 }
            },
            {
                id: 'streak_master',
                name: 'Maître du streak',
                description: '7 jours consécutifs',
                icon: 'fire',
                color: '#ef4444',
                rarity: 'rare',
                requirements: { type: 'streak', count: 7 }
            }
        ];

        for (const badgeData of defaultBadges) {
            this.badges.set(badgeData.id, badgeData);
        }

        console.log(`🏆 ${defaultBadges.length} badges chargés`);
    }

    createQuest(questData) {
        return {
            id: questData.id,
            type: questData.type,
            title: questData.title,
            description: questData.description,
            category: questData.category || 'general',
            xp: questData.xp || this.questTypes[questData.type]?.baseXP || 50,
            requirements: questData.requirements || {},
            conditions: questData.conditions || {},
            roleRestriction: questData.roleRestriction || null,
            createdAt: new Date(),
            isActive: true,
            priority: questData.priority || 'normal',
            difficulty: this.calculateDifficulty(questData),
            rewards: {
                xp: questData.xp || this.questTypes[questData.type]?.baseXP || 50,
                badges: questData.badges || []
            }
        };
    }

    calculateDifficulty(questData) {
        let difficulty = 1;
        if (questData.xp > 200) difficulty += 2;
        else if (questData.xp > 100) difficulty += 1;
        if (questData.requirements.count > 5) difficulty += 1;
        return Math.min(difficulty, 5);
    }

    async loadUserQuests() {
        const userId = window.firebaseManager?.currentUser?.uid;
        if (!userId) {
            console.log('👤 Mode démo - pas d\'utilisateur connecté');
            return;
        }

        try {
            const userQuests = await window.dataManager?.getUserQuests(userId) || [];
            
            for (const userQuest of userQuests) {
                this.userQuests.set(userQuest.questId, userQuest);
                if (userQuest.status === 'completed') {
                    this.completedQuests.add(userQuest.questId);
                }
            }
            
            console.log(`👤 ${userQuests.length} quêtes utilisateur chargées`);
        } catch (error) {
            console.error('❌ Erreur chargement quêtes utilisateur:', error);
        }
    }

    generateDailyQuests() {
        const today = new Date().getDay();
        
        // Assigner les quêtes quotidiennes pour les jours de semaine
        if (today >= 1 && today <= 5) { // Lun-Ven
            for (const quest of this.dailyQuests) {
                if (!this.userQuests.has(quest.id) || this.isQuestExpired(quest.id)) {
                    this.assignQuestToUser(quest.id);
                }
            }
        }
        
        console.log('🔄 Quêtes quotidiennes générées');
    }

    isQuestExpired(questId) {
        const userQuest = this.userQuests.get(questId);
        if (!userQuest || !userQuest.expiresAt) return false;
        return new Date() > new Date(userQuest.expiresAt);
    }

    async assignQuestToUser(questId, userId = null) {
        userId = userId || window.firebaseManager?.currentUser?.uid;
        if (!userId) {
            console.log('❌ Pas d\'utilisateur pour assigner la quête');
            return null;
        }

        const quest = this.quests.get(questId);
        if (!quest) return null;

        const userQuest = {
            id: this.generateId(),
            questId: questId,
            userId: userId,
            status: 'assigned',
            progress: 0,
            maxProgress: quest.requirements.count || 1,
            assignedAt: new Date(),
            expiresAt: this.calculateExpiration(quest),
            metadata: {}
        };

        this.userQuests.set(questId, userQuest);
        
        // Sauvegarder si possible
        try {
            if (window.dataManager) {
                await window.dataManager.saveToFirebase('userQuests', userQuest);
            }
        } catch (error) {
            console.error('❌ Erreur sauvegarde userQuest:', error);
        }

        this.dispatchEvent('assigned', { quest, userQuest });
        console.log(`✅ Quête "${quest.title}" assignée`);
        return userQuest;
    }

    calculateExpiration(quest) {
        const now = new Date();
        switch (quest.type) {
            case 'daily':
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0);
                return tomorrow;
            case 'weekly':
                const nextWeek = new Date(now);
                nextWeek.setDate(nextWeek.getDate() + 7);
                return nextWeek;
            default:
                return null; // Pas d'expiration
        }
    }

    async updateQuestProgress(questId, progress = 1, metadata = {}) {
        const userQuest = this.userQuests.get(questId);
        if (!userQuest || userQuest.status === 'completed') return false;

        userQuest.progress = Math.min(userQuest.progress + progress, userQuest.maxProgress);
        userQuest.metadata = { ...userQuest.metadata, ...metadata };
        userQuest.lastUpdated = new Date();

        if (userQuest.progress >= userQuest.maxProgress) {
            return await this.completeQuest(questId);
        }

        this.dispatchEvent('progress', { questId, progress: userQuest.progress, maxProgress: userQuest.maxProgress });
        return true;
    }

    async completeQuest(questId, userId = null) {
        userId = userId || window.firebaseManager?.currentUser?.uid;
        if (!userId) return false;

        const quest = this.quests.get(questId);
        const userQuest = this.userQuests.get(questId);
        
        if (!quest || !userQuest) return false;

        // Marquer comme complétée
        userQuest.status = 'completed';
        userQuest.completedAt = new Date();
        userQuest.progress = userQuest.maxProgress;
        this.completedQuests.add(questId);

        // Calculer l'XP
        const xpGained = quest.rewards.xp;
        await this.awardXP(userId, xpGained);

        // Vérifier les badges
        await this.checkBadges(userId);

        this.dispatchEvent('completed', { quest, userQuest, xpGained });
        console.log(`🎉 Quête "${quest.title}" complétée ! +${xpGained} XP`);
        
        return xpGained;
    }

    async awardXP(userId, xp) {
        try {
            // Simuler l'attribution d'XP en mode démo
            if (!window.firebaseManager?.currentUser) {
                console.log(`🎯 +${xp} XP gagné (mode démo)`);
                return { newLevel: 1, totalXP: xp };
            }

            const userData = await window.dataManager?.getUser(userId);
            if (!userData) return false;

            const oldLevel = this.getLevel(userData.xp || 0);
            const newXP = (userData.xp || 0) + xp;
            const newLevel = this.getLevel(newXP);

            await window.dataManager.saveUser({ xp: newXP, level: newLevel }, userId);

            if (newLevel > oldLevel) {
                this.dispatchEvent('levelUp', { userId, oldLevel, newLevel, totalXP: newXP });
                console.log(`🎉 Level Up ! Niveau ${newLevel}`);
            }

            return { oldLevel, newLevel, totalXP: newXP };
        } catch (error) {
            console.error('❌ Erreur attribution XP:', error);
            return false;
        }
    }

    getLevel(xp) {
        if (xp < this.xpConfig.baseXP) return 1;
        return Math.floor(Math.log(xp / this.xpConfig.baseXP) / Math.log(this.xpConfig.multiplier)) + 1;
    }

    async checkBadges(userId) {
        // TODO: Vérifier et débloquer les badges
        console.log('🏆 Vérification des badges...');
    }

    setupEventListeners() {
        // Écouter les événements de badging
        document.addEventListener('badging:record', (e) => {
            this.handleBadging(e.detail);
        });

        // Auto-génération quotidienne
        this.scheduleQuestGeneration();
    }

    scheduleQuestGeneration() {
        // Vérifier toutes les heures
        setInterval(() => {
            this.generateDailyQuests();
        }, 60 * 60 * 1000);
    }

    async handleBadging(badgingData) {
        const { type, timestamp } = badgingData;

        if (type === 'in') {
            const hour = new Date(timestamp).getHours();
            
            // Quête arrivée
            if (hour < 9) {
                await this.updateQuestProgress('daily_checkin', 1);
            }
            
            // Quête lève-tôt
            if (hour < 8.5) {
                await this.updateQuestProgress('weekly_early_bird', 1);
            }
        }
    }

    // API publique
    getAvailableQuests() {
        const available = [];
        for (const [questId, quest] of this.quests) {
            const userQuest = this.userQuests.get(questId);
            available.push({
                ...quest,
                userQuest,
                isAssigned: !!userQuest,
                isCompleted: this.completedQuests.has(questId),
                progressPercentage: userQuest ? Math.round((userQuest.progress / userQuest.maxProgress) * 100) : 0
            });
        }
        return available;
    }

    getActiveQuests() {
        const active = [];
        for (const [questId, userQuest] of this.userQuests) {
            if (['assigned', 'in_progress'].includes(userQuest.status)) {
                const quest = this.quests.get(questId);
                if (quest) {
                    active.push({
                        ...quest,
                        userQuest,
                        progressPercentage: Math.round((userQuest.progress / userQuest.maxProgress) * 100)
                    });
                }
            }
        }
        return active;
    }

    getDailyQuests() {
        return this.getQuestsByType('daily');
    }

    getWeeklyQuests() {
        return this.getQuestsByType('weekly');
    }

    getSpecialQuests() {
        return this.getQuestsByType('special');
    }

    getQuestsByType(type) {
        const quests = [];
        for (const [questId, quest] of this.quests) {
            if (quest.type === type) {
                const userQuest = this.userQuests.get(questId);
                quests.push({
                    ...quest,
                    userQuest,
                    isAssigned: !!userQuest,
                    isCompleted: this.completedQuests.has(questId),
                    progressPercentage: userQuest ? Math.round((userQuest.progress / userQuest.maxProgress) * 100) : 0
                });
            }
        }
        return quests;
    }

    getUserQuest(questId) {
        return this.userQuests.get(questId);
    }

    // Événements
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    dispatchEvent(event, detail) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(detail);
                } catch (error) {
                    console.error(`❌ Erreur callback ${event}:`, error);
                }
            });
        }
        document.dispatchEvent(new CustomEvent(`quest:${event}`, { detail }));
    }

    // Debug
    getStats() {
        return {
            totalQuests: this.quests.size,
            activeUserQuests: Array.from(this.userQuests.values()).filter(q => ['assigned', 'in_progress'].includes(q.status)).length,
            completedQuests: this.completedQuests.size,
            availableBadges: this.badges.size,
            isInitialized: this.isInitialized
        };
    }

    // Utilitaires
    generateId() {
        return 'quest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Initialiser automatiquement
document.addEventListener('DOMContentLoaded', () => {
    if (!window.questManager) {
        window.questManager = new QuestManager();
        
        // Auto-init si Firebase est prêt
        if (window.firebaseManager?.isReady) {
            window.questManager.init();
        } else {
            // Attendre Firebase
            document.addEventListener('firebase:ready', () => {
                window.questManager.init();
            });
        }
    }
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuestManager;
}
