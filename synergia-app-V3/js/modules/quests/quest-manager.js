// js/modules/quests/quest-manager.js
// Gestionnaire de quêtes complet avec gamification

class QuestManager {
    constructor() {
        this.quests = new Map();
        this.userQuests = new Map();
        this.unsubscribers = [];
        this.isReady = false;
        this.init();
    }

    async init() {
        await window.firebaseManager.waitForReady();
        
        // Écouter les quêtes
        this.subscribeToQuests();
        
        // Écouter les quêtes utilisateur si connecté
        window.firebaseManager.on('authStateChanged', (user) => {
            if (user) {
                this.subscribeToUserQuests(user.uid);
            } else {
                this.unsubscribeFromUserQuests();
            }
        });

        // Vérifier les quêtes récurrentes chaque jour
        this.scheduleRecurringQuests();
        
        this.isReady = true;
        console.log('✅ QuestManager initialisé');
    }

    subscribeToQuests() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Écouter toutes les quêtes actives
        const unsubscribe = window.firebaseManager.collection('quests')
            .where('completed', '==', false)
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    const quest = { id: change.doc.id, ...change.doc.data() };
                    
                    if (change.type === 'added' || change.type === 'modified') {
                        this.quests.set(quest.id, quest);
                        this.notifyUpdate('quest:updated', quest);
                    } else if (change.type === 'removed') {
                        this.quests.delete(quest.id);
                        this.notifyUpdate('quest:removed', quest);
                    }
                });
                
                this.notifyUpdate('quests:updated', this.getAllQuests());
            }, error => {
                console.error('❌ Erreur écoute quêtes:', error);
            });

        this.unsubscribers.push(unsubscribe);
    }

    subscribeToUserQuests(userId) {
        this.unsubscribeFromUserQuests();

        const unsubscribe = window.firebaseManager.collection('userQuests')
            .where('userId', '==', userId)
            .where('status', 'in', ['active', 'completed'])
            .onSnapshot(snapshot => {
                this.userQuests.clear();
                snapshot.forEach(doc => {
                    const userQuest = { id: doc.id, ...doc.data() };
                    this.userQuests.set(userQuest.questId, userQuest);
                });
                
                this.notifyUpdate('userQuests:updated', Array.from(this.userQuests.values()));
            });

        this.unsubscribers.push(unsubscribe);
    }

    unsubscribeFromUserQuests() {
        // Retirer le dernier listener (userQuests)
        if (this.unsubscribers.length > 1) {
            const unsub = this.unsubscribers.pop();
            unsub();
        }
        this.userQuests.clear();
    }

    // Création et gestion des quêtes
    async createQuest(questData) {
        try {
            // Validation
            if (!questData.title || !questData.type) {
                throw new Error('Titre et type requis');
            }

            // Préparer les données
            const quest = {
                title: this.sanitizeInput(questData.title),
                description: this.sanitizeInput(questData.description || ''),
                xp: parseInt(questData.xp) || 100,
                type: questData.type, // daily, weekly, special
                priority: questData.priority || 'normal', // low, normal, high, urgent
                category: questData.category || 'general',
                assignedTo: questData.assignedTo || null,
                assignedRole: questData.assignedRole || null,
                completed: false,
                recurring: questData.recurring || false,
                recurringDays: questData.recurringDays || [], // [1,2,3,4,5] pour lun-ven
                deadline: questData.deadline || this.getDefaultDeadline(questData.type),
                requirements: questData.requirements || [],
                rewards: {
                    xp: parseInt(questData.xp) || 100,
                    badges: questData.badges || [],
                    bonus: questData.bonus || null
                },
                createdBy: window.firebaseManager.currentUser?.uid || 'system',
                createdAt: window.firebaseManager.timestamp()
            };

            // Ajouter à Firestore
            const docRef = await window.firebaseManager.collection('quests').add(quest);
            quest.id = docRef.id;

            // Si assignée, créer les userQuests
            if (quest.assignedTo) {
                await this.assignQuestToUser(quest.id, quest.assignedTo);
            } else if (quest.assignedRole) {
                await this.assignQuestToRole(quest.id, quest.assignedRole);
            }

            // Analytics
            this.logAnalytics('quest_created', {
                questId: quest.id,
                type: quest.type,
                xp: quest.xp
            });

            return quest;
        } catch (error) {
            console.error('❌ Erreur création quête:', error);
            throw error;
        }
    }

    async updateQuest(questId, updates) {
        try {
            const cleanUpdates = {};
            
            if (updates.title) cleanUpdates.title = this.sanitizeInput(updates.title);
            if (updates.description) cleanUpdates.description = this.sanitizeInput(updates.description);
            if (updates.xp !== undefined) cleanUpdates.xp = parseInt(updates.xp);
            if (updates.deadline) cleanUpdates.deadline = updates.deadline;
            if (updates.priority) cleanUpdates.priority = updates.priority;
            if (updates.requirements) cleanUpdates.requirements = updates.requirements;

            await window.firebaseManager.collection('quests').doc(questId).update({
                ...cleanUpdates,
                updatedAt: window.firebaseManager.timestamp()
            });

            return true;
        } catch (error) {
            console.error('❌ Erreur mise à jour quête:', error);
            throw error;
        }
    }

    async deleteQuest(questId) {
        try {
            // Supprimer les userQuests associées
            const userQuestsSnapshot = await window.firebaseManager.collection('userQuests')
                .where('questId', '==', questId)
                .get();
            
            const batch = window.firebaseManager.db.batch();
            userQuestsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // Supprimer la quête
            batch.delete(window.firebaseManager.collection('quests').doc(questId));
            
            await batch.commit();
            
            this.logAnalytics('quest_deleted', { questId });
            return true;
        } catch (error) {
            console.error('❌ Erreur suppression quête:', error);
            throw error;
        }
    }

    // Assignation des quêtes
    async assignQuestToUser(questId, userId) {
        try {
            const quest = await this.getQuestById(questId);
            if (!quest) throw new Error('Quête introuvable');

            const userQuest = {
                userId,
                questId,
                questTitle: quest.title,
                questXP: quest.xp,
                status: 'active',
                progress: 0,
                startedAt: window.firebaseManager.timestamp(),
                deadline: quest.deadline
            };

            await window.firebaseManager.collection('userQuests').add(userQuest);
            
            // Notification
            this.notifyUpdate('quest:assigned', { questId, userId });
            
            return userQuest;
        } catch (error) {
            console.error('❌ Erreur assignation quête:', error);
            throw error;
        }
    }

    async assignQuestToRole(questId, roleId) {
        try {
            // Récupérer tous les membres avec ce rôle
            const members = await window.teamManager.getMembersByRole(roleId);
            
            for (const member of members) {
                if (member.userId) {
                    await this.assignQuestToUser(questId, member.userId);
                }
            }
            
            return members.length;
        } catch (error) {
            console.error('❌ Erreur assignation quête par rôle:', error);
            throw error;
        }
    }

    // Completion des quêtes
    async completeQuest(questId, userId, evidence = null) {
        try {
            const userQuest = this.userQuests.get(questId);
            if (!userQuest) throw new Error('Quête non assignée à cet utilisateur');
            
            if (userQuest.status === 'completed') {
                throw new Error('Quête déjà complétée');
            }

            const quest = this.quests.get(questId);
            if (!quest) throw new Error('Quête introuvable');

            // Mettre à jour userQuest
            await window.firebaseManager.collection('userQuests').doc(userQuest.id).update({
                status: 'completed',
                progress: 100,
                completedAt: window.firebaseManager.timestamp(),
                evidence: evidence || null,
                xpGained: quest.xp
            });

            // Ajouter XP à l'utilisateur
            await this.rewardUser(userId, quest.xp, quest.rewards);

            // Si c'est la dernière completion, marquer la quête comme complétée
            const remainingActive = await this.checkRemainingActiveQuests(questId);
            if (remainingActive === 0 && !quest.recurring) {
                await window.firebaseManager.collection('quests').doc(questId).update({
                    completed: true,
                    completedAt: window.firebaseManager.timestamp()
                });
            }

            // Analytics
            this.logAnalytics('quest_completed', {
                questId,
                userId,
                xpGained: quest.xp,
                type: quest.type
            });

            // Notification
            this.notifyUpdate('quest:completed', { questId, userId, xp: quest.xp });

            return quest.xp;
        } catch (error) {
            console.error('❌ Erreur completion quête:', error);
            throw error;
        }
    }

    async updateQuestProgress(questId, userId, progress) {
        try {
            const userQuest = this.userQuests.get(questId);
            if (!userQuest) throw new Error('Quête non assignée');

            await window.firebaseManager.collection('userQuests').doc(userQuest.id).update({
                progress: Math.min(100, Math.max(0, progress)),
                updatedAt: window.firebaseManager.timestamp()
            });

            if (progress >= 100) {
                await this.completeQuest(questId, userId);
            }

            return true;
        } catch (error) {
            console.error('❌ Erreur mise à jour progression:', error);
            throw error;
        }
    }

    // Récompenses
    async rewardUser(userId, xp, rewards) {
        try {
            const userRef = window.firebaseManager.collection('users').doc(userId);
            const userData = (await userRef.get()).data();
            
            const updates = {
                xp: window.firebaseManager.increment(xp),
                'stats.totalXP': window.firebaseManager.increment(xp),
                'stats.questsCompleted': window.firebaseManager.increment(1)
            };

            // Calculer le nouveau niveau
            const newTotalXP = (userData.xp || 0) + xp;
            const newLevel = Math.floor(Math.sqrt(newTotalXP / 100)) + 1;
            
            if (newLevel > (userData.level || 1)) {
                updates.level = newLevel;
                
                // Notification niveau supérieur
                this.notifyUpdate('user:levelUp', { userId, newLevel, oldLevel: userData.level });
            }

            // Ajouter les badges si présents
            if (rewards.badges && rewards.badges.length > 0) {
                updates.badges = window.firebaseManager.arrayUnion(...rewards.badges);
            }

            await userRef.update(updates);

            // Mettre à jour aussi dans teamMembers si lié
            const teamMember = await window.firebaseManager.collection('teamMembers')
                .where('userId', '==', userId)
                .limit(1)
                .get();
            
            if (!teamMember.empty) {
                await teamMember.docs[0].ref.update({
                    xp: newTotalXP,
                    level: newLevel,
                    'stats.questsCompleted': window.firebaseManager.increment(1),
                    'stats.totalXP': newTotalXP,
                    'stats.lastActive': window.firebaseManager.timestamp()
                });
            }

            return { xp: newTotalXP, level: newLevel };
        } catch (error) {
            console.error('❌ Erreur récompense utilisateur:', error);
            throw error;
        }
    }

    // Quêtes récurrentes
    async scheduleRecurringQuests() {
        // Vérifier toutes les heures
        setInterval(async () => {
            await this.createRecurringQuests();
        }, 3600000); // 1 heure

        // Créer immédiatement au démarrage
        await this.createRecurringQuests();
    }

    async createRecurringQuests() {
        try {
            const now = new Date();
            const dayOfWeek = now.getDay(); // 0 = dimanche, 1 = lundi, etc.
            
            // Récupérer les quêtes récurrentes
            const recurringQuests = await window.firebaseManager.collection('quests')
                .where('recurring', '==', true)
                .where('completed', '==', false)
                .get();

            for (const doc of recurringQuests.docs) {
                const quest = doc.data();
                
                // Vérifier si on doit créer cette quête aujourd'hui
                if (quest.recurringDays && quest.recurringDays.includes(dayOfWeek)) {
                    // Vérifier si elle n'existe pas déjà pour aujourd'hui
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);
                    const todayEnd = new Date();
                    todayEnd.setHours(23, 59, 59, 999);

                    const existingToday = await window.firebaseManager.collection('quests')
                        .where('title', '==', quest.title)
                        .where('createdAt', '>=', todayStart)
                        .where('createdAt', '<=', todayEnd)
                        .limit(1)
                        .get();

                    if (existingToday.empty) {
                        // Créer une nouvelle instance de la quête
                        await this.createQuest({
                            ...quest,
                            recurring: false, // La nouvelle instance n'est pas récurrente
                            parentQuestId: doc.id,
                            deadline: this.getDefaultDeadline(quest.type)
                        });
                    }
                }
            }
        } catch (error) {
            console.error('❌ Erreur création quêtes récurrentes:', error);
        }
    }

    // Récupération des quêtes
    getAllQuests() {
        return Array.from(this.quests.values()).sort((a, b) => {
            // Trier par priorité puis par deadline
            const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            return a.deadline - b.deadline;
        });
    }

    getQuestsByType(type) {
        return this.getAllQuests().filter(quest => quest.type === type);
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

    async getQuestById(questId) {
        if (this.quests.has(questId)) {
            return this.quests.get(questId);
        }
        
        const doc = await window.firebaseManager.collection('quests').doc(questId).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    }

    getUserQuest(questId) {
        return this.userQuests.get(questId);
    }

    getUserQuests() {
        return Array.from(this.userQuests.values());
    }

    getActiveUserQuests() {
        return this.getUserQuests().filter(uq => uq.status === 'active');
    }

    getCompletedUserQuests() {
        return this.getUserQuests().filter(uq => uq.status === 'completed');
    }

    // Statistiques
    async getQuestStats(userId = null) {
        const stats = {
            totalQuests: this.quests.size,
            completedQuests: 0,
            activeQuests: 0,
            totalXPAvailable: 0,
            totalXPEarned: 0,
            completionRate: 0,
            byType: {
                daily: { total: 0, completed: 0 },
                weekly: { total: 0, completed: 0 },
                special: { total: 0, completed: 0 }
            }
        };

        // Stats globales
        this.getAllQuests().forEach(quest => {
            if (quest.completed) stats.completedQuests++;
            else stats.activeQuests++;
            
            stats.totalXPAvailable += quest.xp;
            stats.byType[quest.type].total++;
            if (quest.completed) stats.byType[quest.type].completed++;
        });

        // Stats utilisateur si spécifié
        if (userId) {
            const userQuests = await window.firebaseManager.collection('userQuests')
                .where('userId', '==', userId)
                .get();
            
            userQuests.forEach(doc => {
                const uq = doc.data();
                if (uq.status === 'completed') {
                    stats.totalXPEarned += uq.xpGained || 0;
                }
            });
        }

        stats.completionRate = stats.totalQuests > 0 
            ? Math.round((stats.completedQuests / stats.totalQuests) * 100) 
            : 0;

        return stats;
    }

    // Utilitaires
    getDefaultDeadline(type) {
        const now = new Date();
        
        switch (type) {
            case 'daily':
                now.setHours(23, 59, 59, 999);
                break;
            case 'weekly':
                now.setDate(now.getDate() + (7 - now.getDay())); // Fin de semaine
                now.setHours(23, 59, 59, 999);
                break;
            case 'special':
                now.setDate(now.getDate() + 30); // 30 jours par défaut
                break;
        }
        
        return firebase.firestore.Timestamp.fromDate(now);
    }

    async checkRemainingActiveQuests(questId) {
        const snapshot = await window.firebaseManager.collection('userQuests')
            .where('questId', '==', questId)
            .where('status', '==', 'active')
            .get();
        
        return snapshot.size;
    }

    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.trim().replace(/[<>]/g, '');
    }

    // Analytics
    logAnalytics(event, data) {
        window.firebaseManager.collection('analytics').add({
            event: `quest:${event}`,
            data,
            userId: window.firebaseManager.currentUser?.uid,
            timestamp: window.firebaseManager.timestamp()
        }).catch(console.error);
    }

    // Notifications
    notifyUpdate(event, data) {
        document.dispatchEvent(new CustomEvent(`quest:${event}`, { detail: data }));
    }

    // Nettoyage
    destroy() {
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
        this.quests.clear();
        this.userQuests.clear();
    }
}

// Instance globale
window.questManager = new QuestManager();

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuestManager;
}