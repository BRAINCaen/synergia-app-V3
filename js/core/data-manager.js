/* ===== SYNERGIA DATA MANAGER - VERSION CORRIGÉE ===== */

class SynergiaDataManager {
    constructor() {
        this.initDefaultData();
        this.loadUserData();
    }

    // Utility function for sanitizing inputs
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return String(input).replace(/[<>]/g, '');
    }

    // Données par défaut
    initDefaultData() {
        this.defaultUser = {
            name: "Boss",
            avatar: "https://img.icons8.com/color/96/000000/user-male-circle--v1.png", // Fixed missing image
            level: 4,
            levelName: "Expert",
            currentXP: 750,
            requiredXP: 1000,
            role: {
                name: "Entretien & Maintenance",
                icon: "fas fa-tools",
                mastery: 60
            },
            stats: {
                completedQuests: 0,
                totalXP: 750,
                activeStreak: 1,
                teamRank: 1
            },
            status: 'online',
            statusMessage: '',
            lastActivity: new Date().toISOString()
        };

        this.defaultTeam = [
            {
                id: 1,
                name: "Boss",
                role: "Manager",
                avatar: "https://img.icons8.com/color/96/000000/user-male-circle--v1.png", // Fixed missing image
                level: 4,
                xp: 750,
                status: "online",
                completedQuests: 0,
                lastActivity: new Date().toISOString()
            }
        ];

        this.defaultQuests = [
            {
                id: 1,
                title: "Vérifier l'accueil",
                description: "S'assurer que l'espace d'accueil est propre et accueillant",
                xp: 10,
                priority: "normal",
                assignedTo: null,
                completed: false,
                recurring: false,
                deadline: this.getTodayEnd()
            },
            {
                id: 2,
                title: "Contrôle équipements",
                description: "Vérifier le bon fonctionnement des jeux",
                xp: 15,
                priority: "normal",
                assignedTo: null,
                completed: false,
                recurring: true,
                deadline: this.getTodayEnd()
            }
        ];
    }

    // Charger les données
    loadUserData() {
        try {
            this.userData = JSON.parse(localStorage.getItem('synergia_user')) || this.defaultUser;
            this.teamData = JSON.parse(localStorage.getItem('synergia_team')) || this.defaultTeam;
            this.questsData = JSON.parse(localStorage.getItem('synergia_quests')) || this.defaultQuests;
        } catch (error) {
            console.warn('Erreur chargement données:', error);
            this.userData = this.defaultUser;
            this.teamData = this.defaultTeam;
            this.questsData = this.defaultQuests;
        }
    }

    // Sauvegarder les données
    saveData() {
        try {
            localStorage.setItem('synergia_user', JSON.stringify(this.userData));
            localStorage.setItem('synergia_team', JSON.stringify(this.teamData));
            localStorage.setItem('synergia_quests', JSON.stringify(this.questsData));
        } catch (error) {
            console.error('Erreur sauvegarde:', error);
        }
    }

    // Utilitaires
    getTodayEnd() {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return today.toISOString();
    }

    // Getters
    getUser() { return this.userData; }
    getTeam() { return this.teamData; }
    getQuests() { return this.questsData; }

    // Mise à jour utilisateur
    updateUser(newData) {
        this.userData = Object.assign(this.userData, newData);
        this.saveData();
        this.updateUI();
    }

    // Calculer pourcentages
    getXPPercentage() {
        return Math.min((this.userData.currentXP / this.userData.requiredXP) * 100, 100);
    }

    getRoleMasteryPercentage() {
        return this.userData.role.mastery;
    }

    // Mise à jour de l'interface
    updateUI() {
        this.updateUserProfile();
        this.updateProgressBars();
        this.updateStats();
    }

    // Mettre à jour le profil utilisateur
    updateUserProfile() {
        const userNameElements = document.querySelectorAll('.user-name, .user-info h2');
        userNameElements.forEach(element => {
            if (element && element.textContent.includes('Chargement')) {
               element.textContent = this.sanitizeInput(this.userData.name);
            }
        });

        const avatarElements = document.querySelectorAll('.user-info img, .member-avatar');
        avatarElements.forEach(element => {
            if (element) {
                element.src = this.userData.avatar;
                element.alt = this.sanitizeInput(this.userData.name);

                // Add error handler for missing images
                element.onerror = function() {
                    this.src = 'https://img.icons8.com/color/96/000000/user-male-circle--v1.png';
                };
            }
        });
    }

    // Mettre à jour les barres de progression
    updateProgressBars() {
        const levelProgressBars = document.querySelectorAll('.level-progress .xp-progress, .xp-progress, #level-bar');
        levelProgressBars.forEach(bar => {
            if (bar) {
                const percentage = this.getXPPercentage();
                bar.style.width = percentage + '%';
                bar.style.background = 'linear-gradient(90deg, #a78bfa 0%, #8b5cf6 50%, #7c3aed 100%)';
                bar.style.boxShadow = '0 0 15px rgba(139, 92, 246, 0.6)';
            }
        });

        const roleMasteryBars = document.querySelectorAll('.mastery-progress .mastery-bar, #mastery-bar');
        roleMasteryBars.forEach(bar => {
            if (bar) {
                const percentage = this.getRoleMasteryPercentage();
                bar.style.width = percentage + '%';
                bar.style.background = 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
            }
        });
    }

    // Mettre à jour les statistiques
    updateStats() {
        const statElements = document.querySelectorAll('.perf-stat-number');
        const statsData = [
            this.teamData.length,
            this.userData.stats.totalXP,
            this.userData.stats.completedQuests,
            this.userData.level
        ];

        statElements.forEach((element, index) => {
            if (element && statsData[index] !== undefined) {
                element.textContent = statsData[index];
            }
        });
    }

    // Initialiser les features avancées
    initAdvancedFeatures() {
        if (!this.userData.status) {
            this.userData.status = 'online';
            this.userData.statusMessage = '';
            this.userData.lastActivity = new Date().toISOString();
        }

        this.teamData.forEach(function(member, index) {
            if (!member.avatar) {
                member.avatar = 'https://img.icons8.com/color/96/000000/user-male-circle--v1.png';
            }
            if (!member.status) {
                member.status = Math.random() > 0.5 ? 'online' : 'away';
                member.lastActivity = new Date().toISOString();
            }
        });

        this.saveData();
        this.updateUI();
    }

    // Initialisation complète
    init() {
        console.log('🚀 Synergia Data Manager initialisé');
        this.updateUI();

        setInterval(() => {
            this.saveData();
        }, 30000);
    }
}

// Instance globale
const synergiaData = new SynergiaDataManager();

// Fonction pour les notifications
window.showNotification = function(message, type) {
    type = type || 'info';

    document.querySelectorAll('.notification').forEach(function(n) {
        n.remove();
    });

    const notification = document.createElement('div');
    notification.className = 'notification notification-' + type;

    const sanitizedMessage = typeof message === 'string' ? 
        message.replace(/[<>]/g, '') : 
        'Notification';

    notification.innerHTML = '<i class="fas fa-info-circle"></i><span>' + 
        sanitizedMessage + 
        '</span><button class="notification-close">&times;</button>';

    document.body.appendChild(notification);

    setTimeout(function() {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);

    notification.querySelector('.notification-close').addEventListener('click', function() {
        notification.remove();
    });
};

// API globale
window.SynergiaAPI = {
    addXP: function(amount) {
        const user = synergiaData.getUser();
        user.currentXP += amount;
        user.stats.totalXP += amount;

        if (user.currentXP >= user.requiredXP) {
            user.level++;
            user.currentXP = user.currentXP - user.requiredXP;
            user.requiredXP = Math.floor(user.requiredXP * 1.2);
            showNotification('🎉 Level Up ! Niveau ' + user.level + ' atteint !', 'success');
        }

        synergiaData.updateUser(user);
    },

    getUserData: function() { return synergiaData.getUser(); },
    getTeamData: function() { return synergiaData.getTeam(); },
    getQuestsData: function() { return synergiaData.getQuests(); }
};

// Initialize on document load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        synergiaData.init();
        synergiaData.initAdvancedFeatures();
        console.log('🚀 Synergia Data Manager démarré');
    }, 1500);
});

// Export global
window.SynergiaDataManager = SynergiaDataManager;
