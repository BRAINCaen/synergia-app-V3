class QuestManager {
    constructor() {
        this.quests = [];
        this.userQuests = [];
        this.badges = [];
        this.currentUser = null;
        this.questsLoaded = false;
        
        console.log('🎯 Quest Manager créé');
    }

    async init() {
        console.log('🎯 Initialisation Quest Manager...');
        
        // Attendre que l'authentification soit prête
        await this.waitForAuth();
        
        // Charger les données
        await this.loadQuests();
        await this.loadBadges();
        await this.loadUserQuests();
        
        // Générer les quêtes quotidiennes si nécessaire
        this.generateDailyQuests();
        
        // Configurer les événements
        this.setupEventListeners();
        
        console.log('✅ Quest Manager initialisé');
    }

    async waitForAuth() {
        return new Promise((resolve) => {
            if (auth.currentUser) {
                this.currentUser = auth.currentUser;
                resolve();
            } else {
                const unsubscribe = onAuthStateChanged(auth, (user) => {
                    this.currentUser = user;
                    unsubscribe();
                    resolve();
                });
            }
        });
    }

    async loadQuests() {
        try {
            // Quêtes par défaut du système
            this.quests = [
                {
                    id: 'daily_checkin',
                    title: 'Pointer son arrivée',
                    description: 'Pointer votre arrivée avant 9h30',
                    type: 'daily',
                    xp: 50,
                    icon: '⏰',
                    category: 'attendance',
                    requirements: { action: 'checkin', time_before: '09:30' }
                },
                {
                    id: 'daily_team_message',
                    title: 'Message d\'équipe',
                    description: 'Envoyer un message dans le chat d\'équipe',
                    type: 'daily',
                    xp: 30,
                    icon: '💬',
                    category: 'communication',
                    requirements: { action: 'send_message', target: 'team' }
                },
                {
                    id: 'daily_perfect_day',
                    title: 'Journée parfaite',
                    description: 'Pointer arrivée et départ à l\'heure',
                    type: 'daily',
                    xp: 100,
                    icon: '⭐',
                    category: 'attendance',
                    requirements: { action: 'perfect_attendance' }
                },
                {
                    id: 'weekly_team_player',
                    title: 'Esprit d\'équipe',
                    description: 'Participer à 5 conversations d\'équipe cette semaine',
                    type: 'weekly',
                    xp: 150,
                    icon: '🤝',
                    category: 'teamwork',
                    requirements: { action: 'team_messages', count: 5, period: 'week' }
                },
                {
                    id: 'weekly_punctual',
                    title: 'Ponctualité',
                    description: 'Arriver à l\'heure 5 jours de suite',
                    type: 'weekly',
                    xp: 200,
                    icon: '🎯',
                    category: 'attendance',
                    requirements: { action: 'punctual_streak', count: 5 }
                },
                {
                    id: 'monthly_leader',
                    title: 'Leader du mois',
                    description: 'Aider 10 collègues ce mois-ci',
                    type: 'monthly',
                    xp: 500,
                    icon: '👑',
                    category: 'leadership',
                    requirements: { action: 'help_colleagues', count: 10, period: 'month' }
                },
                {
                    id: 'special_innovator',
                    title: 'Innovateur',
                    description: 'Proposer une amélioration acceptée',
                    type: 'special',
                    xp: 300,
                    icon: '💡',
                    category: 'innovation',
                    requirements: { action: 'innovation_accepted' }
                }
            ];

            console.log(`📜 ${this.quests.length} quêtes chargées`);
        } catch (error) {
            console.error('❌ Erreur chargement quêtes:', error);
        }
    }

    async loadBadges() {
        try {
            this.badges = [
                {
                    id: 'early_bird',
                    name: 'Lève-tôt',
                    description: 'Arriver avant 8h30 pendant 5 jours',
                    icon: '🌅',
                    rarity: 'common',
                    requirements: { action: 'early_arrival', count: 5 }
                },
                {
                    id: 'team_player',
                    name: 'Équipier',
                    description: 'Envoyer 50 messages d\'équipe',
                    icon: '🤝',
                    rarity: 'common',
                    requirements: { action: 'team_messages', count: 50 }
                },
                {
                    id: 'perfectionist',
                    name: 'Perfectionniste',
                    description: 'Compléter 20 quêtes sans échec',
                    icon: '⭐',
                    rarity: 'rare',
                    requirements: { action: 'perfect_quests', count: 20 }
                },
                {
                    id: 'mentor',
                    name: 'Mentor',
                    description: 'Aider 25 collègues',
                    icon: '🎓',
                    rarity: 'epic',
                    requirements: { action: 'help_colleagues', count: 25 }
                },
                {
                    id: 'innovator',
                    name: 'Innovateur',
                    description: 'Proposer 3 améliorations acceptées',
                    icon: '💡',
                    rarity: 'legendary',
                    requirements: { action: 'innovations_accepted', count: 3 }
                }
            ];

            console.log(`🏆 ${this.badges.length} badges chargés`);
        } catch (error) {
            console.error('❌ Erreur chargement badges:', error);
        }
    }

    async loadUserQuests() {
        try {
            if (!this.currentUser) {
                console.log('👤 Mode démo - pas d\'utilisateur connecté');
                this.userQuests = [];
                return;
            }

            const userQuestsRef = collection(db, 'users', this.currentUser.uid, 'quests');
            const snapshot = await getDocs(userQuestsRef);
            
            this.userQuests = [];
            snapshot.forEach(doc => {
                this.userQuests.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`✅ ${this.userQuests.length} quêtes utilisateur chargées`);
        } catch (error) {
            console.error('❌ Erreur chargement quêtes utilisateur:', error);
            this.userQuests = [];
        }
    }

    generateDailyQuests() {
        if (!this.currentUser) {
            console.log('👤 Utilisateur requis pour générer les quêtes');
            return;
        }

        const today = new Date().toDateString();
        const existingDailyQuests = this.userQuests.filter(q => 
            q.type === 'daily' && q.assignedDate === today
        );

        if (existingDailyQuests.length === 0) {
            // Générer les quêtes quotidiennes
            const dailyQuests = this.quests.filter(q => q.type === 'daily');
            
            dailyQuests.forEach(quest => {
                this.assignQuestToUser(quest.id, 'daily', today);
            });

            console.log('🔄 Quêtes quotidiennes générées');
        }
    }

    async assignQuestToUser(questId, type = 'daily', assignedDate = null) {
        if (!this.currentUser) {
            console.log('❌ Pas d\'utilisateur pour assigner la quête');
            return;
        }

        try {
            const quest = this.quests.find(q => q.id === questId);
            if (!quest) {
                console.error('❌ Quête non trouvée:', questId);
                return;
            }

            const userQuest = {
                questId: questId,
                title: quest.title,
                description: quest.description,
                type: type,
                xp: quest.xp,
                icon: quest.icon,
                category: quest.category,
                status: 'assigned',
                progress: 0,
                maxProgress: quest.requirements.count || 1,
                assignedDate: assignedDate || new Date().toDateString(),
                assignedAt: new Date(),
                requirements: quest.requirements
            };

            // Sauvegarder en Firebase
            const userQuestsRef = collection(db, 'users', this.currentUser.uid, 'quests');
            const docRef = await addDoc(userQuestsRef, userQuest);
            
            // Ajouter à la liste locale
            userQuest.id = docRef.id;
            this.userQuests.push(userQuest);

            console.log(`✅ Quête "${quest.title}" assignée`);
            return userQuest;

        } catch (error) {
            console.error('❌ Erreur assignation quête:', error);
        }
    }

    async acceptQuest(questId) {
        try {
            const userQuest = this.userQuests.find(q => q.questId === questId);
            if (!userQuest) {
                console.error('❌ Quête utilisateur non trouvée:', questId);
                return;
            }

            // Mettre à jour le statut
            userQuest.status = 'active';
            userQuest.acceptedAt = new Date();

            // Sauvegarder en Firebase
            if (this.currentUser) {
                const questRef = doc(db, 'users', this.currentUser.uid, 'quests', userQuest.id);
                await updateDoc(questRef, {
                    status: 'active',
                    acceptedAt: userQuest.acceptedAt
                });
            }

            console.log(`✅ Acceptation de la quête: ${questId}`);
            
            // Notifier l'interface
            this.notifyQuestAccepted(userQuest);
            
            return userQuest;

        } catch (error) {
            console.error('❌ Erreur acceptation quête:', error);
        }
    }

    async completeQuest(questId, progressIncrement = 1) {
        try {
            const userQuest = this.userQuests.find(q => q.questId === questId && q.status === 'active');
            if (!userQuest) {
                console.log(`⚠️ Quête active non trouvée: ${questId}`);
                return;
            }

            // Mettre à jour le progrès
            userQuest.progress = Math.min(userQuest.progress + progressIncrement, userQuest.maxProgress);

            // Vérifier si la quête est complète
            if (userQuest.progress >= userQuest.maxProgress) {
                userQuest.status = 'completed';
                userQuest.completedAt = new Date();

                // Récompenser l'utilisateur
                await this.rewardUser(userQuest);

                console.log(`🎉 Quête complétée: ${userQuest.title}`);
            }

            // Sauvegarder en Firebase
            if (this.currentUser) {
                const questRef = doc(db, 'users', this.currentUser.uid, 'quests', userQuest.id);
                await updateDoc(questRef, {
                    progress: userQuest.progress,
                    status: userQuest.status,
                    completedAt: userQuest.completedAt
                });
            }

            // Notifier l'interface
            this.notifyQuestProgress(userQuest);
            
            return userQuest;

        } catch (error) {
            console.error('❌ Erreur complétion quête:', error);
        }
    }

    async rewardUser(userQuest) {
        if (!this.currentUser) return;

        try {
            // Donner de l'XP
            await this.giveXP(userQuest.xp);

            // Vérifier les badges
            await this.checkBadgeProgress(userQuest);

            // Notifier l'équipe si disponible
            if (window.teamManager) {
                window.teamManager.updateMemberXP(this.currentUser.uid, userQuest.xp);
            }

            console.log(`🏆 Récompenses données: ${userQuest.xp} XP`);

        } catch (error) {
            console.error('❌ Erreur récompense:', error);
        }
    }

    async giveXP(amount) {
        if (!this.currentUser) return;

        try {
            const userRef = doc(db, 'users', this.currentUser.uid);
            const userDoc = await getDoc(userRef);
            
            let currentXP = 0;
            let currentLevel = 1;
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                currentXP = userData.xp || 0;
                currentLevel = userData.level || 1;
            }

            const newXP = currentXP + amount;
            const newLevel = Math.floor(newXP / 250) + 1;

            // Mettre à jour Firebase
            await setDoc(userRef, {
                xp: newXP,
                level: newLevel,
                lastActivity: new Date()
            }, { merge: true });

            // Vérifier montée de niveau
            if (newLevel > currentLevel) {
                this.notifyLevelUp(newLevel);
            }

            console.log(`✨ +${amount} XP (Total: ${newXP})`);

        } catch (error) {
            console.error('❌ Erreur attribution XP:', error);
        }
    }

    async checkBadgeProgress(userQuest) {
        // Logique pour vérifier si l'utilisateur mérite des badges
        const category = userQuest.category;
        const action = userQuest.requirements.action;

        // Exemple: badge équipier
        if (action === 'send_message' && category === 'communication') {
            await this.checkTeamPlayerBadge();
        }

        // Exemple: badge lève-tôt
        if (action === 'checkin' && category === 'attendance') {
            await this.checkEarlyBirdBadge();
        }
    }

    async checkTeamPlayerBadge() {
        // Compter les messages d'équipe envoyés
        const teamMessages = this.userQuests.filter(q => 
            q.requirements.action === 'send_message' && 
            q.requirements.target === 'team' && 
            q.status === 'completed'
        ).length;

        if (teamMessages >= 50) {
            await this.awardBadge('team_player');
        }
    }

    async checkEarlyBirdBadge() {
        // Compter les arrivées matinales
        const earlyArrivals = this.userQuests.filter(q => 
            q.requirements.action === 'checkin' && 
            q.requirements.time_before === '08:30' && 
            q.status === 'completed'
        ).length;

        if (earlyArrivals >= 5) {
            await this.awardBadge('early_bird');
        }
    }

    async awardBadge(badgeId) {
        if (!this.currentUser) return;

        try {
            const userRef = doc(db, 'users', this.currentUser.uid);
            const userDoc = await getDoc(userRef);
            
            let badges = [];
            if (userDoc.exists()) {
                badges = userDoc.data().badges || [];
            }

            if (!badges.includes(badgeId)) {
                badges.push(badgeId);
                
                await updateDoc(userRef, { badges });
                
                const badge = this.badges.find(b => b.id === badgeId);
                if (badge) {
                    this.notifyBadgeEarned(badge);
                    console.log(`🏆 Badge obtenu: ${badge.name}`);
                }

                // Notifier l'équipe
                if (window.teamManager) {
                    window.teamManager.addBadgeToMember(this.currentUser.uid, badgeId);
                }
            }

        } catch (error) {
            console.error('❌ Erreur attribution badge:', error);
        }
    }

    // Méthodes pour les actions spécifiques
    async handleCheckin(time) {
        const now = new Date();
        const timeString = now.toTimeString().substring(0, 5);

        // Quête: Pointer son arrivée
        await this.completeQuest('daily_checkin');

        // Vérifier arrivée matinale
        if (timeString <= '08:30') {
            await this.completeQuest('early_arrival');
        }

        // Vérifier ponctualité (avant 9h30)
        if (timeString <= '09:30') {
            await this.completeQuest('punctual_arrival');
        }

        console.log('✅ Pointage d\'arrivée traité par Quest Manager');
    }

    async handleTeamMessage() {
        // Quête: Message d'équipe
        await this.completeQuest('daily_team_message');
        
        console.log('💬 Message d\'équipe traité par Quest Manager');
    }

    async handlePerfectDay() {
        // Quête: Journée parfaite
        await this.completeQuest('daily_perfect_day');
        
        console.log('⭐ Journée parfaite détectée par Quest Manager');
    }

    // Méthodes d'interface
    setupEventListeners() {
        // Événements depuis d'autres managers
        document.addEventListener('synergia:checkin', (e) => {
            this.handleCheckin(e.detail.time);
        });

        document.addEventListener('synergia:team_message', () => {
            this.handleTeamMessage();
        });

        document.addEventListener('synergia:perfect_day', () => {
            this.handlePerfectDay();
        });
    }

    notifyQuestAccepted(userQuest) {
        // Émettre événement pour l'interface
        document.dispatchEvent(new CustomEvent('synergia:quest_accepted', {
            detail: { quest: userQuest }
        }));
    }

    notifyQuestProgress(userQuest) {
        // Émettre événement pour l'interface
        document.dispatchEvent(new CustomEvent('synergia:quest_progress', {
            detail: { quest: userQuest }
        }));
    }

    notifyLevelUp(newLevel) {
        document.dispatchEvent(new CustomEvent('synergia:level_up', {
            detail: { level: newLevel }
        }));
    }

    notifyBadgeEarned(badge) {
        document.dispatchEvent(new CustomEvent('synergia:badge_earned', {
            detail: { badge: badge }
        }));
    }

    // API pour l'interface
    getAvailableQuests() {
        return this.quests.filter(q => q.type === 'daily' || q.type === 'weekly');
    }

    getUserQuests() {
        return this.userQuests;
    }

    getDailyQuests() {
        const today = new Date().toDateString();
        return this.userQuests.filter(q => q.type === 'daily' && q.assignedDate === today);
    }

    getWeeklyQuests() {
        return this.userQuests.filter(q => q.type === 'weekly');
    }

    getActiveQuests() {
        return this.userQuests.filter(q => q.status === 'active');
    }

    getCompletedQuests() {
        return this.userQuests.filter(q => q.status === 'completed');
    }

    getUserBadges() {
        return this.badges;
    }

    // Méthodes utilitaires
    getQuestById(questId) {
        return this.quests.find(q => q.id === questId);
    }

    getBadgeById(badgeId) {
        return this.badges.find(b => b.id === badgeId);
    }

    async refreshUserQuests() {
        await this.loadUserQuests();
        document.dispatchEvent(new CustomEvent('synergia:quests_refreshed'));
    }

    // Modal d'assignation de quête (pour TeamManager)
    showAssignQuestModal(memberId) {
        const modal = document.createElement('div');
        modal.className = 'quest-assign-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Assigner une quête</h3>
                <div class="quest-list">
                    ${this.quests.map(quest => `
                        <div class="quest-item" data-quest-id="${quest.id}">
                            <span class="quest-icon">${quest.icon}</span>
                            <div class="quest-info">
                                <h4>${quest.title}</h4>
                                <p>${quest.description}</p>
                                <span class="quest-xp">${quest.xp} XP</span>
                            </div>
                            <button onclick="questManager.assignQuestToMember('${memberId}', '${quest.id}')">
                                Assigner
                            </button>
                        </div>
                    `).join('')}
                </div>
                <button onclick="this.parentElement.parentElement.remove()">Fermer</button>
            </div>
        `;

        document.body.appendChild(modal);
    }

    async assignQuestToMember(memberId, questId) {
        // Logique pour assigner une quête à un membre spécifique
        console.log(`🎯 Assignation quête ${questId} au membre ${memberId}`);
        
        // Implémenter selon les besoins
        // Cela nécessiterait des modifications dans la structure Firebase
    }
}

// Initialisation globale
window.questManager = new QuestManager();
