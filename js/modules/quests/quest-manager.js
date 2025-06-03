// js/modules/quests/quest-manager.js
// Système de missions gamifié complet pour SYNERGIA v3.0

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
            baseXP: 100,        // XP pour niveau 1
            multiplier: 1.2,    // Multiplicateur par niveau
            maxLevel: 50,       // Niveau maximum
            bonusStreak: 1.5    // Bonus pour les streaks
        };
        
        // Types de missions avec configuration
        this.questTypes = {
            daily: {
                name: 'Quotidienne',
                icon: 'calendar-day',
                color: '#3b82f6',
                baseXP: 50,
                duration: 24 * 60 * 60 * 1000, // 24h
                recurring: true
            },
            weekly: {
                name: 'Hebdomadaire', 
                icon: 'calendar-week',
                color: '#8b5cf6',
                baseXP: 200,
                duration: 7 * 24 * 60 * 60 * 1000, // 7 jours
                recurring: true
            },
            special: {
                name: 'Spéciale',
                icon: 'star',
                color: '#f59e0b',
                baseXP: 300,
                duration: null,
                recurring: false
            },
            training: {
                name: 'Formation',
                icon: 'graduation-cap',
                color: '#10b981',
                baseXP: 150,
                duration: null,
                recurring: false
            },
            team: {
                name: 'Équipe',
                icon: 'users',
                color: '#ef4444',
                baseXP: 100,
                duration: null,
                recurring: false
            }
        };
        
        // Badges et achievements
        this.badges = new Map();
        this.achievements = new Map();
        
        this.isInitialized = false;
        this.listeners = new Map();
    }

    async init() {
        try {
            console.log('🎯 Initialisation Quest Manager...');
            
            // Charger les quêtes prédéfinies
            await this.loadDefaultQuests();
            
            // Charger les quêtes utilisateur
            await this.loadUserQuests();
            
            // Charger les badges et achievements
            await this.loadBadges();
            
            // Générer les quêtes quotidiennes/hebdomadaires
            await this.generateRecurringQuests();
            
            // Configurer les événements
            this.setupEventListeners();
            
            // Démarrer les vérifications automatiques
            this.startAutoChecks();
            
            this.isInitialized = true;
            console.log('✅ Quest Manager initialisé');
            
            return true;
        } catch (error) {
            console.error('❌ Erreur initialisation Quest Manager:', error);
            throw error;
        }
    }

    async loadDefaultQuests() {
        const defaultQuests = [
            // Quêtes quotidiennes
            {
                id: 'daily_checkin',
                type: 'daily',
                title: 'Pointer son arrivée',
                description: 'Effectuer le pointage d\'arrivée avant 9h',
                category: 'attendance',
                xp: 25,
                requirements: {
                    type: 'badging',
                    action: 'checkin',
                    timeLimit: '09:00'
                },
                recurring: {
                    type: 'daily',
                    daysOfWeek: [1, 2, 3, 4, 5] // Lun-Ven
                }
            },
            {
                id: 'daily_team_message',
                type: 'daily',
                title: 'Message d\'équipe',
                description: 'Envoyer au moins 3 messages dans le chat d\'équipe',
                category: 'communication',
                xp: 15,
                requirements: {
                    type: 'chat',
                    action: 'send_message',
                    count: 3
                },
                recurring: {
                    type: 'daily',
                    daysOfWeek: [1, 2, 3, 4, 5, 6, 7]
                }
            },
            {
                id: 'daily_perfect_attendance',
                type: 'daily',
                title: 'Présence parfaite',
                description: 'Être présent toute la journée sans retard',
                category: 'attendance',
                xp: 50,
                requirements: {
                    type: 'attendance',
                    action: 'perfect_day',
                    conditions: ['no_late', 'full_day', 'proper_breaks']
                },
                recurring: {
                    type: 'daily',
                    daysOfWeek: [1, 2, 3, 4, 5]
                }
            },

            // Quêtes hebdomadaires
            {
                id: 'weekly_early_bird',
                type: 'weekly',
                title: 'Lève-tôt de la semaine',
                description: 'Arriver avant 8h30 pendant 4 jours',
                category: 'attendance',
                xp: 100,
                requirements: {
                    type: 'badging',
                    action: 'early_arrival',
                    count: 4,
                    timeLimit: '08:30'
                },
                recurring: {
                    type: 'weekly',
                    startDay: 1 // Lundi
                }
            },
            {
                id: 'weekly_team_player',
                type: 'weekly',
                title: 'Joueur d\'équipe',
                description: 'Compléter 3 missions d\'équipe',
                category: 'teamwork',
                xp: 150,
                requirements: {
                    type: 'quest',
                    action: 'complete_team_quests',
                    count: 3
                },
                recurring: {
                    type: 'weekly',
                    startDay: 1
                }
            },

            // Quêtes spéciales (événementielles)
            {
                id: 'special_new_member',
                type: 'special',
                title: 'Bienvenue dans l\'équipe !',
                description: 'Compléter votre première semaine chez SYNERGIA',
                category: 'onboarding',
                xp: 200,
                requirements: {
                    type: 'milestone',
                    action: 'first_week_complete'
                },
                conditions: {
                    newMember: true,
                    maxDaysWorked: 7
                }
            },
            {
                id: 'special_streak_master',
                type: 'special',
                title: 'Maître de la régularité',
                description: 'Maintenir un streak de 30 jours',
                category: 'achievement',
                xp: 500,
                requirements: {
                    type: 'streak',
                    action: 'maintain_streak',
                    count: 30
                }
            },

            // Quêtes de formation
            {
                id: 'training_safety_course',
                type: 'training',
                title: 'Formation sécurité',
                description: 'Compléter le module de formation sécurité',
                category: 'training',
                xp: 100,
                requirements: {
                    type: 'training',
                    action: 'complete_module',
                    moduleId: 'safety_basics'
                }
            },
            {
                id: 'training_customer_service',
                type: 'training',
                title: 'Excellence client',
                description: 'Suivre la formation service client',
                category: 'training',
                xp: 120,
                requirements: {
                    type: 'training',
                    action: 'complete_module',
                    moduleId: 'customer_service'
                }
            },

            // Quêtes spécifiques par rôle
            {
                id: 'role_manager_review',
                type: 'weekly',
                title: 'Évaluation équipe',
                description: 'Effectuer l\'évaluation hebdomadaire de l\'équipe',
                category: 'management',
                xp: 80,
                requirements: {
                    type: 'management',
                    action: 'team_review'
                },
                roleRestriction: ['manager', 'admin'],
                recurring: {
                    type: 'weekly',
                    startDay: 1
                }
            },
            {
                id: 'role_security_patrol',
                type: 'daily',
                title: 'Ronde de sécurité',
                description: 'Effectuer la ronde de sécurité complète',
                category: 'security',
                xp: 40,
                requirements: {
                    type: 'security',
                    action: 'complete_patrol'
                },
                roleRestriction: ['securite'],
                recurring: {
                    type: 'daily',
                    daysOfWeek: [1, 2, 3, 4, 5, 6, 7]
                }
            }
        ];

        // Charger les quêtes dans le système
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

        console.log(`📜 ${defaultQuests.length} quêtes par défaut chargées`);
    }

    createQuest(questData) {
        const quest = {
            id: questData.id,
            type: questData.type,
            title: questData.title,
            description: questData.description,
            category: questData.category || 'general',
            xp: questData.xp || this.questTypes[questData.type]?.baseXP || 50,
            requirements: questData.requirements || {},
            conditions: questData.conditions || {},
            roleRestriction: questData.roleRestriction || null,
            recurring: questData.recurring || null,
            createdAt: new Date(),
            isActive: true,
            priority: questData.priority || 'normal',
            difficulty: this.calculateDifficulty(questData),
            estimatedTime: questData.estimatedTime || this.estimateTime(questData),
            rewards: {
                xp: questData.xp || this.questTypes[questData.type]?.baseXP || 50,
                badges: questData.badges || [],
                achievements: questData.achievements || []
            }
        };

        return quest;
    }

    calculateDifficulty(questData) {
        let difficulty = 1;
        
        // Basé sur l'XP
        if (questData.xp > 200) difficulty += 2;
        else if (questData.xp > 100) difficulty += 1;
        
        // Basé sur les requirements
        if (questData.requirements.count > 5) difficulty += 1;
        if (questData.requirements.timeLimit) difficulty += 1;
        if (questData.requirements.conditions?.length > 2) difficulty += 1;
        
        return Math.min(difficulty, 5); // Max 5
    }

    estimateTime(questData) {
        const baseTime = {
            daily: 15,      // 15 minutes
            weekly: 60,     // 1 heure
            special: 30,    // 30 minutes
            training: 45    // 45 minutes
        };
        
        return questData.estimatedTime || baseTime[questData.type] || 20;
    }

    async loadUserQuests() {
        const userId = window.firebaseManager?.currentUser?.uid;
        if (!userId) {
            console.log('👤 Pas d\'utilisateur connecté - mode démo');
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

    async loadBadges() {
        const defaultBadges = [
            {
                id: 'first_quest',
                name: 'Premier pas',
                description: 'Première mission complétée',
                icon: 'trophy',
                color: '#f59e0b',
                rarity: 'common',
                requirements: {
                    type: 'quest_count',
                    count: 1
                }
            },
            {
                id: 'quest_master',
                name: 'Maître des missions',
                description: '10 missions complétées',
                icon: 'crown',
                color: '#8b5cf6',
                rarity: 'rare',
                requirements: {
                    type: 'quest_count',
                    count: 10
                }
            },
            {
                id: 'early_bird',
                name: 'Lève-tôt',
                description: '7 arrivées avant 8h',
                icon: 'sun',
                color: '#f97316',
                rarity: 'uncommon',
                requirements: {
                    type: 'early_arrival',
                    count: 7,
                    timeLimit: '08:00'
                }
            },
            {
                id: 'team_player',
                name: 'Esprit d\'équipe',
                description: '5 missions d\'équipe complétées',
                icon: 'users',
                color: '#10b981',
                rarity: 'uncommon',
                requirements: {
                    type: 'team_quest_count',
                    count: 5
                }
            },
            {
                id: 'streak_week',
                name: 'Semaine parfaite',
                description: '7 jours de streak consécutifs',
                icon: 'fire',
                color: '#ef4444',
                rarity: 'rare',
                requirements: {
                    type: 'streak',
                    count: 7
                }
            },
            {
                id: 'legend',
                name: 'Légende SYNERGIA',
                description: '100 missions complétées',
                icon: 'star',
                color: '#6366f1',
                rarity: 'legendary',
                requirements: {
                    type: 'quest_count',
                    count: 100
                }
            }
        ];

        for (const badgeData of defaultBadges) {
            this.badges.set(badgeData.id, badgeData);
        }

        console.log(`🏆 ${defaultBadges.length} badges chargés`);
    }

    async generateRecurringQuests() {
        const now = new Date();
        const today = now.getDay(); // 0 = Dimanche, 1 = Lundi, etc.

        // Générer les quêtes quotidiennes
        for (const quest of this.dailyQuests) {
            if (this.shouldGenerateQuest(quest, 'daily', today)) {
                await this.assignQuestToUser(quest.id);
            }
        }

        // Générer les quêtes hebdomadaires (le lundi)
        if (today === 1) { // Lundi
            for (const quest of this.weeklyQuests) {
                if (this.shouldGenerateQuest(quest, 'weekly', today)) {
                    await this.assignQuestToUser(quest.id);
                }
            }
        }

        console.log('🔄 Quêtes récurrentes générées');
    }

    shouldGenerateQuest(quest, type, today) {
        // Vérifier les restrictions de rôle
        if (quest.roleRestriction) {
            const userRole = this.getCurrentUserRole();
            if (!quest.roleRestriction.includes(userRole)) {
                return false;
            }
        }

        // Vérifier si déjà assignée aujourd'hui/cette semaine
        const userQuest = this.userQuests.get(quest.id);
        if (userQuest) {
            const assignedDate = new Date(userQuest.assignedAt);
            const now = new Date();
            
            if (type === 'daily') {
                // Même jour
                if (assignedDate.toDateString() === now.toDateString()) {
                    return false;
                }
            } else if (type === 'weekly') {
                // Même semaine
                const weekStart = this.getWeekStart(now);
                if (assignedDate >= weekStart) {
                    return false;
                }
            }
        }

        // Vérifier les conditions spéciales
        if (quest.conditions) {
            if (quest.conditions.newMember && !this.isNewMember()) {
                return false;
            }
            if (quest.conditions.maxDaysWorked && this.getDaysWorked() > quest.conditions.maxDaysWorked) {
                return false;
            }
        }

        return true;
    }

    async assignQuestToUser(questId, userId = null) {
        userId = userId || window.firebaseManager?.currentUser?.uid;
        if (!userId) {
            console.log('❌ Impossible d\'assigner la quête - pas d\'utilisateur');
            return null;
        }

        const quest = this.quests.get(questId);
        if (!quest) {
            console.error(`❌ Quête ${questId} non trouvée`);
            return null;
        }

        // Vérifier si déjà assignée
        const existingUserQuest = this.userQuests.get(questId);
        if (existingUserQuest && existingUserQuest.status !== 'completed') {
            return existingUserQuest;
        }

        const userQuest = {
            id: this.generateId(),
            questId: questId,
            userId: userId,
            status: 'assigned',
            progress: 0,
            maxProgress: this.getQuestMaxProgress(quest),
            assignedAt: new Date(),
            expiresAt: this.calculateExpiration(quest),
            attempts: 0,
            metadata: {}
        };

        // Sauvegarder
        this.userQuests.set(questId, userQuest);
        
        try {
            if (window.dataManager) {
                await window.dataManager.saveToFirebase('userQuests', userQuest);
            }
        } catch (error) {
            console.error('❌ Erreur sauvegarde userQuest:', error);
        }

        // Dispatcher événement
        this.dispatchEvent('quest:assigned', { quest, userQuest });

        console.log(`✅ Quête "${quest.title}" assignée à l'utilisateur`);
        return userQuest;
    }

    getQuestMaxProgress(quest) {
        if (quest.requirements.count) {
            return quest.requirements.count;
        }
        return 1; // Mission simple on/off
    }

    calculateExpiration(quest) {
        const now = new Date();
        const duration = this.questTypes[quest.type]?.duration;
        
        if (!duration) return null; // Pas d'expiration

        return new Date(now.getTime() + duration);
    }

    async updateQuestProgress(questId, progress = 1, metadata = {}) {
        const userQuest = this.userQuests.get(questId);
        if (!userQuest || userQuest.status === 'completed') {
            return false;
        }

        // Mettre à jour le progrès
        userQuest.progress = Math.min(userQuest.progress + progress, userQuest.maxProgress);
        userQuest.metadata = { ...userQuest.metadata, ...metadata };
        userQuest.lastUpdated = new Date();

        // Vérifier si complétée
        if (userQuest.progress >= userQuest.maxProgress) {
            return await this.completeQuest(questId);
        }

        // Sauvegarder
        try {
            if (window.dataManager) {
                await window.dataManager.saveToFirebase('userQuests', userQuest, userQuest.id);
            }
        } catch (error) {
            console.error('❌ Erreur sauvegarde progress:', error);
        }

        // Dispatcher événement
        this.dispatchEvent('quest:progress', { questId, progress: userQuest.progress, maxProgress: userQuest.maxProgress });

        return true;
    }

    async completeQuest(questId, userId = null) {
        userId = userId || window.firebaseManager?.currentUser?.uid;
        if (!userId) return false;

        const quest = this.quests.get(questId);
        const userQuest = this.userQuests.get(questId);
        
        if (!quest || !userQuest) {
            console.error(`❌ Impossible de compléter la quête ${questId}`);
            return false;
        }

        // Marquer comme complétée
        userQuest.status = 'completed';
        userQuest.completedAt = new Date();
        userQuest.progress = userQuest.maxProgress;
        this.completedQuests.add(questId);

        // Calculer l'XP avec bonus
        const baseXP = quest.rewards.xp;
        const bonusXP = this.calculateBonusXP(quest, userQuest);
        const totalXP = baseXP + bonusXP;

        // Donner l'XP à l'utilisateur
        await this.awardXP(userId, totalXP);

        // Vérifier les badges
        await this.checkBadges(userId);

        // Vérifier les achievements
        await this.checkAchievements(userId);

        // Sauvegarder
        try {
            if (window.dataManager) {
                await window.dataManager.saveToFirebase('userQuests', userQuest, userQuest.id);
            }
        } catch (error) {
            console.error('❌ Erreur sauvegarde completion:', error);
        }

        // Dispatcher événements
        this.dispatchEvent('quest:completed', { quest, userQuest, xpGained: totalXP });

        console.log(`🎉 Quête "${quest.title}" complétée ! +${totalXP} XP`);
        return totalXP;
    }

    calculateBonusXP(quest, userQuest) {
        let bonus = 0;

        // Bonus de rapidité (complétée rapidement)
        if (userQuest.expiresAt) {
            const timeUsed = userQuest.completedAt - userQuest.assignedAt;
            const timeAvailable = userQuest.expiresAt - userQuest.assignedAt;
            const timeRatio = timeUsed / timeAvailable;

            if (timeRatio < 0.5) { // Complétée en moins de 50% du temps
                bonus += Math.round(quest.rewards.xp * 0.2); // +20%
            }
        }

        // Bonus de streak
        const streak = this.getCurrentStreak();
        if (streak >= 7) {
            bonus += Math.round(quest.rewards.xp * 0.1 * Math.min(streak / 7, 3)); // Max 30%
        }

        // Bonus de difficulté
        if (quest.difficulty >= 4) {
            bonus += Math.round(quest.rewards.xp * 0.15); // +15% pour missions difficiles
        }

        return bonus;
    }

    async awardXP(userId, xp) {
        try {
            const userData = await window.dataManager?.getUser(userId);
            if (!userData) return false;

            const oldLevel = this.getLevel(userData.xp || 0);
            const newXP = (userData.xp || 0) + xp;
            const newLevel = this.getLevel(newXP);

            // Mettre à jour l'utilisateur
            const updatedData = {
                xp: newXP,
                level: newLevel,
                totalXPEarned: (userData.totalXPEarned || 0) + xp,
                lastXPGain: new Date()
            };

            await window.dataManager.saveUser(updatedData, userId);

            // Level up ?
            if (newLevel > oldLevel) {
                this.dispatchEvent('user:levelUp', { 
                    userId, 
                    oldLevel, 
                    newLevel, 
                    totalXP: newXP 
                });
                console.log(`🎉 Level Up ! Niveau ${newLevel} atteint !`);
            }

            return { oldLevel, newLevel, totalXP: newXP };
        } catch (error) {
            console.error('❌ Erreur attribution XP:', error);
            return false;
        }
    }

    getLevel(xp) {
        if (xp < this.xpConfig.baseXP) return 1;

        let level = 1;
        let requiredXP = this.xpConfig.baseXP;

        while (xp >= requiredXP && level < this.xpConfig.maxLevel) {
            level++;
            requiredXP += Math.round(this.xpConfig.baseXP * Math.pow(this.xpConfig.multiplier, level - 1));
        }

        return level;
    }

    getXPForLevel(level) {
        if (level <= 1) return 0;

        let totalXP = 0;
        for (let i = 1; i < level; i++) {
            totalXP += Math.round(this.xpConfig.baseXP * Math.pow(this.xpConfig.multiplier, i - 1));
        }
        return totalXP;
    }

    getXPProgress(currentXP) {
        const currentLevel = this.getLevel(currentXP);
        const currentLevelXP = this.getXPForLevel(currentLevel);
        const nextLevelXP = this.getXPForLevel(currentLevel + 1);
        
        const progress = currentXP - currentLevelXP;
        const needed = nextLevelXP - currentLevelXP;
        
        return {
            level: currentLevel,
            progress,
            needed,
            percentage: Math.round((progress / needed) * 100)
        };
    }

    async checkBadges(userId) {
        const userData = await window.dataManager?.getUser(userId);
        if (!userData) return;

        const userBadges = userData.badges || [];
        const newBadges = [];

        for (const [badgeId, badge] of this.badges) {
            if (userBadges.includes(badgeId)) continue; // Déjà obtenu

            if (await this.checkBadgeRequirements(badge, userId)) {
                newBadges.push(badgeId);
                userBadges.push(badgeId);

                this.dispatchEvent('badge:earned', { badge, userId });
                console.log(`🏆 Badge "${badge.name}" débloqué !`);
            }
        }

        if (newBadges.length > 0) {
            await window.dataManager.saveUser({ badges: userBadges }, userId);
        }

        return newBadges;
    }

    async checkBadgeRequirements(badge, userId) {
        const requirements = badge.requirements;

        switch (requirements.type) {
            case 'quest_count':
                const completedCount = this.getCompletedQuestCount(userId);
                return completedCount >= requirements.count;

            case 'team_quest_count':
                const teamQuestCount = this.getCompletedQuestsByCategory(userId, 'teamwork');
                return teamQuestCount >= requirements.count;

            case 'early_arrival':
                const earlyArrivals = await this.getEarlyArrivals(userId, requirements.timeLimit);
                return earlyArrivals >= requirements.count;

            case 'streak':
                const streak = this.getCurrentStreak(userId);
                return streak >= requirements.count;

            default:
                return false;
        }
    }

    // API publique pour les autres modules

    /**
     * Obtenir les quêtes disponibles pour un utilisateur
     */
    getAvailableQuests(userId = null) {
        const userRole = this.getCurrentUserRole();
        const available = [];

        for (const [questId, quest] of this.quests) {
            // Vérifier les restrictions de rôle
            if (quest.roleRestriction && !quest.roleRestriction.includes(userRole)) {
                continue;
            }

            // Vérifier si déjà assignée/complétée
            const userQuest = this.userQuests.get(questId);
            if (userQuest && ['assigned', 'in_progress'].includes(userQuest.status)) {
                continue;
            }

            available.push({
                ...quest,
                isAssigned: !!userQuest,
                isCompleted: this.completedQuests.has(questId)
            });
        }

        return available;
    }

    /**
     * Obtenir les quêtes actives de l'utilisateur
     */
    getActiveQuests(userId = null) {
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

        return active.sort((a, b) => new Date(b.userQuest.assignedAt) - new Date(a.userQuest.assignedAt));
    }

    /**
     * Obtenir les quêtes par type
     */
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

    /**
     * Créer une nouvelle quête personnalisée
     */
    async createCustomQuest(questData) {
        const quest = this.createQuest({
            id: this.generateId(),
            ...questData,
            type: questData.type || 'special'
        });

        this.quests.set(quest.id, quest);

        // Sauvegarder
        try {
            if (window.dataManager) {
                await window.dataManager.saveToFirebase('quests', quest);
            }
        } catch (error) {
            console.error('❌ Erreur création quête:', error);
        }

        this.dispatchEvent('quest:created', { quest });
        return quest;
    }

    /**
     * Événements automatiques (appelés par d'autres modules)
     */
    
    // Appelé lors d'un pointage
    async handleBadging(badgingData) {
        const { type, timestamp, userId } = badgingData;

        if (type === 'in') {
            const hour = new Date(timestamp).getHours();
            
            // Quête arrivée matinale
            if (hour < 9) {
                await this.updateQuestProgress('daily_checkin', 1, { arrivalTime: timestamp });
            }
            
            // Quête lève-tôt
            if (hour < 8.5) { // 8h30
                await this.updateQuestProgress('weekly_early_bird', 1, { arrivalTime: timestamp });
            }
        }

        // Vérifier les quêtes de présence parfaite
        if (type === 'out') {
            const isFullDay = await this.checkFullDayAttendance(userId, timestamp);
            if (isFullDay) {
                await this.updateQuestProgress('daily_perfect_attendance', 1);
            }
        }
    }

    // Appelé lors d'envoi de message
    async handleMessage(messageData) {
        const { userId, chatRoomId } = messageData;
        
        // Quête messages d'équipe
        if (chatRoomId && chatRoomId.includes('team')) {
            await this.updateQuestProgress('daily_team_message', 1);
        }
    }

    // Appelé lors de completion d'une formation
    async handleTrainingComplete(trainingData) {
        const { moduleId, userId } = trainingData;
        
        // Trouver les quêtes de formation correspondantes
        for (const [questId, quest] of this.quests) {
            if (quest.requirements.type === 'training' && 
                quest.requirements.moduleId === moduleId) {
                await this.updateQuestProgress(questId, 1);
            }
        }
    }

    // Méthodes utilitaires
    
    setupEventListeners() {
        // Écouter les événements de badging
        document.addEventListener('badging:record', (e) => {
            this.handleBadging(e.detail);
        });

        // Écouter les messages
        document.addEventListener('chat:message:sent', (e) => {
            this.handleMessage(e.detail);
        });

        // Écouter les formations
        document.addEventListener('training:complete', (e) => {
            this.handleTrainingComplete(e.detail);
        });

        // Régénérer les quêtes quotidiennes/hebdomadaires
        this.scheduleQuestGeneration();
    }

    scheduleQuestGeneration() {
        // Vérifier toutes les heures si de nouvelles quêtes doivent être générées
        setInterval(() => {
            this.generateRecurringQuests();
        }, 60 * 60 * 1000); // 1 heure

        // Régénération à minuit
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        
        const timeToMidnight = midnight - now;
        setTimeout(() => {
            this.generateRecurringQuests();
            // Puis toutes les 24h
            setInterval(() => {
                this.generateRecurringQuests();
            }, 24 * 60 * 60 * 1000);
        }, timeToMidnight);
    }

    startAutoChecks() {
        // Vérifier les expirations toutes les 10 minutes
        setInterval(() => {
            this.checkExpiredQuests();
        }, 10 * 60 * 1000);
    }

    checkExpiredQuests() {
        const now = new Date();
        const expired = [];

        for (const [questId, userQuest] of this.userQuests) {
            if (userQuest.expiresAt && now > userQuest.expiresAt && userQuest.status !== 'completed') {
                userQuest.status = 'expired';
                expired.push(questId);
            }
        }

        if (expired.length > 0) {
            console.log(`⏰ ${expired.length} quêtes expirées`);
            this.dispatchEvent('quests:expired', { expired });
        }
    }

    // Helpers
    
    getCurrentUserRole() {
        return window.firebaseManager?.currentUser?.role || 'employee';
    }

    isNewMember() {
        const userData = window.firebaseManager?.currentUser;
        if (!userData?.joinedAt) return false;
        
        const daysSinceJoin = (Date.now() - userData.joinedAt) / (1000 * 60 * 60 * 24);
        return daysSinceJoin <= 7;
    }

    getDaysWorked() {
        // TODO: Calculer depuis les données de badging
        return 1;
    }

    getCurrentStreak(userId = null) {
        // TODO: Calculer le streak depuis les données
        return 1;
    }

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lundi
        return new Date(d.setDate(diff));
    }

    getCompletedQuestCount(userId) {
        return this.completedQuests.size;
    }

    getCompletedQuestsByCategory(userId, category) {
        let count = 0;
        for (const questId of this.completedQuests) {
            const quest = this.quests.get(questId);
            if (quest && quest.category === category) {
                count++;
            }
        }
        return count;
    }

    async getEarlyArrivals(userId, timeLimit) {
        // TODO: Interroger les données de badging
        return 0;
    }

    async checkFullDayAttendance(userId, timestamp) {
        // TODO: Vérifier les données de pointage
        return true;
    }

    generateId() {
        return 'quest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Système d'événements
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        
        return () => {
            this.listeners.get(event)?.delete(callback);
        };
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

        // Dispatcher aussi sur document
        document.dispatchEvent(new CustomEvent(`quest:${event}`, { detail }));
    }

    // API de debug
    getStats() {
        return {
            totalQuests: this.quests.size,
            activeUserQuests: Array.from(this.userQuests.values()).filter(q => ['assigned', 'in_progress'].includes(q.status)).length,
            completedQuests: this.completedQuests.size,
            availableBadges: this.badges.size,
            isInitialized: this.isInitialized
        };
    }

    exportData() {
        return {
            quests: Array.from(this.quests.entries()),
            userQuests: Array.from(this.userQuests.entries()),
            completedQuests: Array.from(this.completedQuests),
            badges: Array.from(this.badges.entries())
        };
    }
}

// Instance globale
window.questManager = new QuestManager();

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuestManager;
}
