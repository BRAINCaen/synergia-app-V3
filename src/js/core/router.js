/**
 * Router pour SYNERGIA v3.0
 * Fichier: src/js/core/router.js
 * 
 * Gestion de la navigation et des routes
 */
class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Initialise le routeur
     */
    init() {
        this.setupRoutes();
        this.setupEventListeners();
        this.isInitialized = true;
        
        console.log('🧭 Router initialisé');
        
        // Naviguer vers la route initiale
        this.handleInitialRoute();
    }

    /**
     * Configure les routes de l'application
     */
    setupRoutes() {
        this.routes = {
            '/': {
                title: 'Accueil',
                render: () => this.renderHome(),
                requiresAuth: false
            },
            '/login': {
                title: 'Connexion',
                render: () => this.renderLogin(),
                requiresAuth: false
            },
            '/dashboard': {
                title: 'Tableau de bord',
                render: () => this.renderDashboard(),
                requiresAuth: true
            },
            '/badging': {
                title: 'Pointage',
                render: () => this.renderBadging(),
                requiresAuth: true,
                onLoad: () => this.loadBadgingData()
            },
            '/team': {
                title: 'Équipe',
                render: () => this.renderTeam(),
                requiresAuth: true,
                onLoad: () => this.loadTeamData()
            },
            '/planning': {
                title: 'Planning',
                render: () => this.renderPlanning(),
                requiresAuth: true,
                onLoad: () => this.loadPlanningData()
            },
            '/chat': {
                title: 'Chat',
                render: () => this.renderChat(),
                requiresAuth: true,
                onLoad: () => this.loadChatData()
            },
            '/quests': {
                title: 'Quêtes',
                render: () => this.renderQuests(),
                requiresAuth: true,
                onLoad: () => this.loadQuestsData()
            },
            '/profile': {
                title: 'Profil',
                render: () => this.renderProfile(),
                requiresAuth: true
            }
        };
    }

    /**
     * Configure les écouteurs d'événements
     */
    setupEventListeners() {
        // Navigation par hash
        window.addEventListener('hashchange', () => {
            this.handleRoute();
        });

        // Navigation par popstate (historique)
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.route) {
                this.navigate(e.state.route, false);
            } else {
                this.handleRoute();
            }
        });

        // Liens de navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-route]')) {
                e.preventDefault();
                const route = e.target.getAttribute('data-route');
                this.navigate(route);
            }
        });

        // Écouter les changements d'authentification
        window.addEventListener('auth:stateChanged', (e) => {
            this.handleAuthStateChange(e.detail);
        });
    }

    /**
     * Gère la route initiale au chargement
     */
    handleInitialRoute() {
        const hash = window.location.hash.slice(1) || '/';
        this.navigate(hash, false);
    }

    /**
     * Gère les changements de route
     */
    handleRoute() {
        const hash = window.location.hash.slice(1) || '/';
        this.navigate(hash, false);
    }

    /**
     * Navigue vers une route
     * @param {string} path - Chemin de la route
     * @param {boolean} pushState - Ajouter à l'historique
     */
    navigate(path, pushState = true) {
        try {
            const route = this.routes[path];
            
            if (!route) {
                console.warn(`Route non trouvée: ${path}`);
                this.navigate('/dashboard');
                return;
            }

            // Vérifier l'authentification
            if (route.requiresAuth && !this.isAuthenticated()) {
                console.log('🔒 Authentification requise, redirection vers login');
                this.navigate('/login');
                return;
            }

            // Éviter la navigation inutile
            if (this.currentRoute === path) {
                return;
            }

            console.log(`🧭 Navigation vers: ${path}`);

            // Nettoyer la route précédente
            this.cleanup();

            // Mettre à jour l'état
            this.currentRoute = path;
            
            // Mettre à jour l'URL
            if (pushState) {
                window.history.pushState({ route: path }, route.title, `#${path}`);
            }
            window.location.hash = path;

            // Mettre à jour le titre
            document.title = `${route.title} - SYNERGIA v3.0`;

            // Rendre la page
            route.render();

            // Charger les données spécifiques
            if (route.onLoad) {
                route.onLoad();
            }

            // Mettre à jour la navigation
            this.updateNavigation();

            // Émettre événement
            this.emit('route:changed', { 
                path, 
                route,
                title: route.title 
            });

        } catch (error) {
            console.error('❌ Erreur navigation:', error);
            this.renderError('Erreur de navigation');
        }
    }

    /**
     * Vérifie si l'utilisateur est authentifié
     * @returns {boolean}
     */
    isAuthenticated() {
        return window.authManager && window.authManager.isAuthenticated();
    }

    /**
     * Gère les changements d'état d'authentification
     * @param {Object} authState 
     */
    handleAuthStateChange(authState) {
        if (authState.isAuthenticated) {
            // Utilisateur connecté
            if (this.currentRoute === '/login' || this.currentRoute === '/') {
                this.navigate('/dashboard');
            }
        } else {
            // Utilisateur déconnecté
            if (this.currentRoute !== '/login' && this.currentRoute !== '/') {
                this.navigate('/login');
            }
        }
    }

    /**
     * Met à jour la navigation active
     */
    updateNavigation() {
        // Mettre à jour les onglets actifs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            const route = tab.getAttribute('data-route');
            tab.classList.toggle('active', route === this.currentRoute);
        });

        // Mettre à jour les liens de navigation
        document.querySelectorAll('[data-route]').forEach(link => {
            const route = link.getAttribute('data-route');
            link.classList.toggle('active', route === this.currentRoute);
        });
    }

    /**
     * Nettoie la route précédente
     */
    cleanup() {
        // Arrêter les timers ou processus en cours
        if (window.badgingManager) {
            window.badgingManager.stopClock();
        }

        // Fermer les modales ouvertes
        document.querySelectorAll('.modal.show').forEach(modal => {
            modal.classList.remove('show');
        });

        // Nettoyer les écouteurs temporaires
        document.querySelectorAll('[data-temp-listener]').forEach(el => {
            el.remove();
        });
    }

    // ==================
    // RENDU DES PAGES
    // ==================

    /**
     * Rend la page d'accueil
     */
    renderHome() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container">
                <div class="hero-section">
                    <h1>Bienvenue sur SYNERGIA v3.0</h1>
                    <p>Votre plateforme de gestion d'équipe nouvelle génération</p>
                    <div class="hero-actions">
                        <button class="btn btn-primary btn-lg" data-route="/login">
                            Se connecter
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Rend la page de connexion
     */
    renderLogin() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container">
                <div class="login-container">
                    <div class="card" style="max-width: 400px; margin: 50px auto;">
                        <div class="login-header">
                            <h2>Connexion SYNERGIA</h2>
                            <p>Connectez-vous pour accéder à votre espace</p>
                        </div>
                        
                        <div class="login-methods">
                            <button onclick="handleGoogleLogin()" class="btn btn-primary btn-lg" style="width: 100%; margin-bottom: 20px;">
                                <i class="fab fa-google"></i>
                                Continuer avec Google
                            </button>
                            
                            <div class="divider">
                                <span>ou</span>
                            </div>
                            
                            <form id="loginForm" style="margin-top: 20px;">
                                <div class="form-group">
                                    <label class="form-label">Email</label>
                                    <input type="email" class="form-control" placeholder="votre.email@entreprise.com" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Mot de passe</label>
                                    <input type="password" class="form-control" placeholder="••••••••" required>
                                </div>
                                <button type="submit" class="btn btn-secondary" style="width: 100%;">
                                    Se connecter
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Rend le tableau de bord
     */
    renderDashboard() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container">
                ${this.renderHeader()}
                ${this.renderNavigation()}
                
                <div class="dashboard-content">
                    <div class="grid grid-4">
                        <div class="stats-card">
                            <div class="stats-number" id="dashboard-members">-</div>
                            <div class="stats-label">Membres actifs</div>
                        </div>
                        <div class="stats-card">
                            <div class="stats-number" id="dashboard-present">-</div>
                            <div class="stats-label">Présents aujourd'hui</div>
                        </div>
                        <div class="stats-card">
                            <div class="stats-number" id="dashboard-hours">-</div>
                            <div class="stats-label">Heures cette semaine</div>
                        </div>
                        <div class="stats-card">
                            <div class="stats-number" id="dashboard-quests">-</div>
                            <div class="stats-label">Quêtes en cours</div>
                        </div>
                    </div>
                    
                    <div class="grid grid-2">
                        <div class="card">
                            <h3>Activité récente</h3>
                            <div id="recent-activity">
                                <div class="loading-spinner"></div>
                            </div>
                        </div>
                        <div class="card">
                            <h3>Actions rapides</h3>
                            <div class="quick-actions">
                                <button class="btn btn-primary" data-route="/badging">
                                    <i class="fas fa-clock"></i>
                                    Pointage
                                </button>
                                <button class="btn btn-success" data-route="/team">
                                    <i class="fas fa-users"></i>
                                    Équipe
                                </button>
                                <button class="btn btn-info" data-route="/planning">
                                    <i class="fas fa-calendar"></i>
                                    Planning
                                </button>
                                <button class="btn btn-warning" data-route="/quests">
                                    <i class="fas fa-scroll"></i>
                                    Quêtes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.loadDashboardData();
    }

    /**
     * Rend la page de pointage
     */
    renderBadging() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container">
                ${this.renderHeader()}
                ${this.renderNavigation()}
                
                <div class="badging-content">
                    <div class="grid grid-2">
                        <div class="clock-widget">
                            <div class="current-time" id="currentTime">--:--:--</div>
                            <div class="current-date" id="currentDate">Chargement...</div>
                            <div class="badge-buttons">
                                <button onclick="handleCheckIn()" class="btn btn-success btn-lg">
                                    <i class="fas fa-sign-in-alt"></i> Arrivée
                                </button>
                                <button onclick="handleCheckOut()" class="btn btn-danger btn-lg">
                                    <i class="fas fa-sign-out-alt"></i> Sortie
                                </button>
                                <button onclick="handleBreakStart()" class="btn btn-warning btn-lg">
                                    <i class="fas fa-pause"></i> Pause
                                </button>
                                <button onclick="handleBreakEnd()" class="btn btn-info btn-lg">
                                    <i class="fas fa-play"></i> Reprise
                                </button>
                            </div>
                        </div>
                        
                        <div class="badge-status">
                            <h3>Statut du jour</h3>
                            <div id="today-status">
                                <div class="loading-spinner"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3>Historique des pointages</h3>
                        <div id="badging-history">
                            <div class="loading-spinner"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Rend la page équipe
     */
    renderTeam() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container">
                ${this.renderHeader()}
                ${this.renderNavigation()}
                
                <div class="team-content">
                    <div class="team-header">
                        <h2>Gestion de l'équipe</h2>
                        <button onclick="openAddMemberModal()" class="btn btn-primary">
                            <i class="fas fa-plus"></i>
                            Ajouter un membre
                        </button>
                    </div>
                    
                    <div class="team-stats">
                        <div class="grid grid-4">
                            <div class="stats-card">
                                <div class="stats-number" id="team-total">-</div>
                                <div class="stats-label">Membres total</div>
                            </div>
                            <div class="stats-card">
                                <div class="stats-number" id="team-active">-</div>
                                <div class="stats-label">Actifs</div>
                            </div>
                            <div class="stats-card">
                                <div class="stats-number" id="team-departments">-</div>
                                <div class="stats-label">Départements</div>
                            </div>
                            <div class="stats-card">
                                <div class="stats-number" id="team-online">-</div>
                                <div class="stats-label">En ligne</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="team-list" id="team-list">
                            <div class="loading-spinner"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Rend la page planning
     */
    renderPlanning() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container">
                ${this.renderHeader()}
                ${this.renderNavigation()}
                
                <div class="planning-content">
                    <div class="planning-header">
                        <div class="planning-nav">
                            <button id="prev-period" class="btn btn-secondary">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <h2 id="current-period">Chargement...</h2>
                            <button id="next-period" class="btn btn-secondary">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        
                        <div class="planning-views">
                            <button class="view-btn btn btn-sm" data-view="day">Jour</button>
                            <button class="view-btn btn btn-sm active" data-view="week">Semaine</button>
                            <button class="view-btn btn btn-sm" data-view="month">Mois</button>
                        </div>
                        
                        <div class="planning-actions">
                            <button id="add-shift-btn" class="btn btn-primary">
                                <i class="fas fa-plus"></i> Shift
                            </button>
                            <button id="add-event-btn" class="btn btn-success">
                                <i class="fas fa-calendar-plus"></i> Événement
                            </button>
                        </div>
                    </div>
                    
                    <div id="planning-container">
                        <div class="loading-spinner"></div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Rend la page chat
     */
    renderChat() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container">
                ${this.renderHeader()}
                ${this.renderNavigation()}
                
                <div class="chat-content">
                    <p>Chat en développement...</p>
                </div>
            </div>
        `;
    }

    /**
     * Rend la page quêtes
     */
    renderQuests() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container">
                ${this.renderHeader()}
                ${this.renderNavigation()}
                
                <div class="quests-content">
                    <p>Quêtes en développement...</p>
                </div>
            </div>
        `;
    }

    /**
     * Rend la page profil
     */
    renderProfile() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container">
                ${this.renderHeader()}
                ${this.renderNavigation()}
                
                <div class="profile-content">
                    <p>Profil en développement...</p>
                </div>
            </div>
        `;
    }

    /**
     * Rend une page d'erreur
     */
    renderError(message) {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container">
                <div class="error-page">
                    <h2>Erreur</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn btn-primary">
                        Recharger la page
                    </button>
                </div>
            </div>
        `;
    }

    // ==================
    // COMPOSANTS COMMUNS
    // ==================

    /**
     * Rend l'en-tête de l'application
     */
    renderHeader() {
        const user = window.authManager?.getCurrentUser();
        const userProfile = window.authManager?.getUserProfile();
        
        return `
            <div class="header">
                <div class="header-left">
                    <h1>SYNERGIA v3.0</h1>
                </div>
                <div class="header-right">
                    ${user ? `
                        <div class="user-profile">
                            <div class="user-avatar">
                                ${userProfile?.photoURL ? 
                                    `<img src="${userProfile.photoURL}" alt="Avatar">` : 
                                    userProfile?.displayName?.charAt(0) || user.email.charAt(0)
                                }
                            </div>
                            <div class="user-info">
                                <span class="user-name">${userProfile?.displayName || user.email}</span>
                                <span class="user-role status-badge status-${userProfile?.role || 'employee'}">${userProfile?.role || 'employee'}</span>
                            </div>
                        </div>
                        <button onclick="handleSignOut()" class="btn btn-secondary btn-sm">
                            <i class="fas fa-sign-out-alt"></i>
                            Déconnexion
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Rend la navigation principale
     */
    renderNavigation() {
        return `
            <div class="nav-tabs">
                <a href="#/dashboard" class="nav-tab" data-route="/dashboard">
                    <i class="fas fa-tachometer-alt"></i>
                    Dashboard
                </a>
                <a href="#/badging" class="nav-tab" data-route="/badging">
                    <i class="fas fa-clock"></i>
                    Pointage
                </a>
                <a href="#/team" class="nav-tab" data-route="/team">
                    <i class="fas fa-users"></i>
                    Équipe
                </a>
                <a href="#/planning" class="nav-tab" data-route="/planning">
                    <i class="fas fa-calendar"></i>
                    Planning
                </a>
                <a href="#/chat" class="nav-tab" data-route="/chat">
                    <i class="fas fa-comments"></i>
                    Chat
                </a>
                <a href="#/quests" class="nav-tab" data-route="/quests">
                    <i class="fas fa-scroll"></i>
                    Quêtes
                </a>
            </div>
        `;
    }

    // ==================
    // CHARGEMENT DES DONNÉES
    // ==================

    /**
     * Charge les données du tableau de bord
     */
    async loadDashboardData() {
        try {
            // Statistiques de base
            document.getElementById('dashboard-members').textContent = '5';
            document.getElementById('dashboard-present').textContent = '3';
            document.getElementById('dashboard-hours').textContent = '32h';
            document.getElementById('dashboard-quests').textContent = '2';

            // Activité récente (exemple)
            const recentActivity = document.getElementById('recent-activity');
            recentActivity.innerHTML = `
                <div class="activity-list">
                    <div class="activity-item">
                        <i class="fas fa-clock text-success"></i>
                        <span>Pointage d'arrivée - 09:00</span>
                        <small>Il y a 2h</small>
                    </div>
                    <div class="activity-item">
                        <i class="fas fa-users text-info"></i>
                        <span>Nouveau membre ajouté</span>
                        <small>Hier</small>
                    </div>
                    <div class="activity-item">
                        <i class="fas fa-scroll text-warning"></i>
                        <span>Quête "Équipier" complétée</span>
                        <small>Avant-hier</small>
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('❌ Erreur chargement dashboard:', error);
        }
    }

    /**
     * Charge les données de pointage
     */
    async loadBadgingData() {
        try {
            if (window.badgingManager) {
                window.badgingManager.startClock();
                await window.badgingManager.loadTodaysTimesheet();
            }
        } catch (error) {
            console.error('❌ Erreur chargement pointage:', error);
        }
    }

    /**
     * Charge les données de l'équipe
     */
    async loadTeamData() {
        try {
            if (window.teamManager) {
                await window.teamManager.loadTeamMembers();
            }
        } catch (error) {
            console.error('❌ Erreur chargement équipe:', error);
        }
    }

    /**
     * Charge les données du planning
     */
    async loadPlanningData() {
        try {
            if (window.planningManager) {
                await window.planningManager.loadPlanningData();
            }
        } catch (error) {
            console.error('❌ Erreur chargement planning:', error);
        }
    }

    /**
     * Charge les données du chat
     */
    async loadChatData() {
        try {
            if (window.chatManager) {
                await window.chatManager.loadConversations();
            }
        } catch (error) {
            console.error('❌ Erreur chargement chat:', error);
        }
    }

    /**
     * Charge les données des quêtes
     */
    async loadQuestsData() {
        try {
            if (window.questManager) {
                await window.questManager.refreshUserQuests();
            }
        } catch (error) {
            console.error('❌ Erreur chargement quêtes:', error);
        }
    }

    // ==================
    // UTILITAIRES
    // ==================

    /**
     * Émet un événement
     * @param {string} eventName 
     * @param {*} data 
     */
    emit(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        window.dispatchEvent(event);
    }

    /**
     * Récupère la route actuelle
     * @returns {string}
     */
    getCurrentRoute() {
        return this.currentRoute;
    }

    /**
     * Récupère toutes les routes
     * @returns {Object}
     */
    getRoutes() {
        return { ...this.routes };
    }

    /**
     * Nettoyage lors de la destruction
     */
    destroy() {
        this.cleanup();
        this.routes = {};
        this.currentRoute = null;
        console.log('🧹 Router nettoyé');
    }
}

// Export pour utilisation globale
window.Router = Router;
