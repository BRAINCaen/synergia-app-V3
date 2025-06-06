/**
 * Router pour SYNERGIA v3.0
 * Fichier: src/js/core/router.js
 */

class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.isInitialized = false;
        this.currentController = null;
        this.timeClockModuleLoaded = false;
        
        this.init();
    }

    async init() {
        this.setupRoutes();
        this.setupEventListeners();
        
        this.isInitialized = true;
        console.log('🧭 Router initialisé');
        
        this.handleInitialRoute();
    }

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
                requiresAuth: true,
                onLoad: () => this.loadDashboardData()
            },
            '/badging': {
                title: 'Pointage',
                render: () => this.renderBadging(),
                requiresAuth: true,
                onLoad: () => this.loadBadgingData()
            },
            '/pointage': {
                title: 'Pointage Avancé',
                render: () => this.renderTimeClock(),
                requiresAuth: true,
                onLoad: () => this.loadTimeClockData()
            },
            '/timeclock': {
                title: 'Pointage Avancé',
                render: () => this.renderTimeClock(),
                requiresAuth: true,
                onLoad: () => this.loadTimeClockData()
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
                requiresAuth: true
            },
            '/chat': {
                title: 'Chat',
                render: () => this.renderChat(),
                requiresAuth: true
            },
            '/quests': {
                title: 'Quêtes',
                render: () => this.renderQuests(),
                requiresAuth: true
            }
        };
    }

    setupEventListeners() {
        window.addEventListener('hashchange', () => {
            this.handleRoute();
        });

        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.route) {
                this.navigate(e.state.route, false);
            } else {
                this.handleRoute();
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-route]')) {
                e.preventDefault();
                const route = e.target.getAttribute('data-route');
                this.navigate(route);
            }
        });

        window.addEventListener('auth:stateChanged', (e) => {
            this.handleAuthStateChange(e.detail);
        });

        // Raccourcis clavier globaux
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey) {
                switch (e.key) {
                    case 'P':
                        e.preventDefault();
                        this.navigate('/pointage');
                        break;
                    case 'D':
                        e.preventDefault();
                        this.navigate('/dashboard');
                        break;
                    case 'B':
                        e.preventDefault();
                        this.navigate('/badging');
                        break;
                }
            }
        });
    }

    handleInitialRoute() {
        const hash = window.location.hash.slice(1) || '/';
        this.navigate(hash, false);
    }

    handleRoute() {
        const hash = window.location.hash.slice(1) || '/';
        this.navigate(hash, false);
    }

    navigate(path, pushState = true) {
        try {
            const route = this.routes[path];
            
            if (!route) {
                console.warn(`Route non trouvée: ${path}`);
                this.navigate('/dashboard');
                return;
            }

            if (route.requiresAuth && !this.isAuthenticated()) {
                console.log('🔒 Authentification requise, redirection vers login');
                this.navigate('/login');
                return;
            }

            if (this.currentRoute === path) {
                return;
            }

            console.log(`🧭 Navigation vers: ${path}`);

            this.cleanup();
            this.currentRoute = path;
            
            if (pushState) {
                window.history.pushState({ route: path }, route.title, `#${path}`);
            }
            window.location.hash = path;

            document.title = `${route.title} - SYNERGIA v3.0`;

            route.render();

            if (route.onLoad) {
                route.onLoad();
            }

            this.updateNavigation();
            this.emit('route:changed', { path, route, title: route.title });

        } catch (error) {
            console.error('❌ Erreur navigation:', error);
            this.renderError('Erreur de navigation');
        }
    }

    isAuthenticated() {
        return window.authManager && window.authManager.isAuthenticated();
    }

    handleAuthStateChange(authState) {
        if (authState.isAuthenticated) {
            if (this.currentRoute === '/login' || this.currentRoute === '/') {
                this.navigate('/dashboard');
            }
        } else {
            if (this.currentRoute !== '/login' && this.currentRoute !== '/') {
                this.navigate('/login');
            }
        }
    }

    updateNavigation() {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            const route = tab.getAttribute('data-route');
            tab.classList.toggle('active', route === this.currentRoute);
        });

        document.querySelectorAll('[data-route]').forEach(link => {
            const route = link.getAttribute('data-route');
            link.classList.toggle('active', route === this.currentRoute);
        });
    }

    cleanup() {
        if (this.currentController && typeof this.currentController.destroy === 'function') {
            this.currentController.destroy();
            this.currentController = null;
        }

        if (window.badgingManager) {
            window.badgingManager.stopClock();
        }

        document.querySelectorAll('.modal.show').forEach(modal => {
            modal.classList.remove('show');
        });

        document.querySelectorAll('[data-temp-listener]').forEach(el => {
            el.remove();
        });
    }

    // Chargement dynamique du module de pointage
    async loadTimeClockModule() {
        if (this.timeClockModuleLoaded) {
            return;
        }

        try {
            console.log('🕐 Chargement du module de pointage...');
            
            // Import dynamique pour éviter les erreurs de dépendances circulaires
            const timeClockModule = await import('../modules/timeclock-init.js').then(m => m.timeClockModule);
            await timeClockModule.initialize();
            
            this.timeClockModuleLoaded = true;
            console.log('✅ Module de pointage chargé');
            
        } catch (error) {
            console.error('❌ Erreur chargement module pointage:', error);
        }
    }

    // ==================
    // RENDU DES PAGES
    // ==================

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
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

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
                                <button class="btn btn-primary" data-route="/pointage">
                                    <i class="fas fa-clock"></i>
                                    Pointage Avancé
                                </button>
                                <button class="btn btn-secondary" data-route="/badging">
                                    <i class="fas fa-stopwatch"></i>
                                    Pointage Simple
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
    }

    renderBadging() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container">
                ${this.renderHeader()}
                ${this.renderNavigation()}
                
                <div class="badging-content">
                    <div class="card" style="margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                        <div style="text-align: center;">
                            <h3 style="margin: 0 0 10px 0;">💡 Nouveau !</h3>
                            <p style="margin: 0 0 15px 0;">Découvrez notre nouveau module de pointage avancé avec historique complet et exports.</p>
                            <button class="btn" style="background: white; color: #667eea; border: none; font-weight: 600;" data-route="/pointage">
                                <i class="fas fa-rocket"></i>
                                Essayer le pointage avancé
                            </button>
                        </div>
                    </div>
                    
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

    async renderTimeClock() {
        try {
            console.log('🕐 Chargement du module de pointage avancé...');
            
            // Charger le module si pas déjà fait
            await this.loadTimeClockModule();
            
            // Charger le CSS
            this.loadStylesheet('./src/styles/modules/timeclock.css');
            
            // Charger le template
            const response = await fetch('./src/templates/timeclock.html');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const html = await response.text();
            const app = document.getElementById('app');
            
            app.innerHTML = `
                <div class="container">
                    ${this.renderHeader()}
                    ${this.renderNavigation()}
                    ${html}
                </div>
            `;
            
            console.log('✅ Template de pointage chargé');
            
        } catch (error) {
            console.error('❌ Erreur chargement template pointage:', error);
            this.renderError('Impossible de charger le module de pointage avancé');
        }
    }

    async loadTimeClockData() {
        try {
            console.log('📊 Initialisation du contrôleur de pointage...');
            
            const { TimeClockController } = await import('../controllers/timeclock-controller.js');
            this.currentController = new TimeClockController();
            
            window.timeClockController = this.currentController;
            console.log('✅ Contrôleur de pointage initialisé');
            
        } catch (error) {
            console.error('❌ Erreur chargement contrôleur pointage:', error);
            this.showError('Erreur d\'initialisation du module de pointage');
        }
    }

    loadStylesheet(href) {
        if (!document.querySelector(`link[href="${href}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => console.log(`✅ Stylesheet chargé: ${href}`);
            link.onerror = () => console.error(`❌ Erreur chargement stylesheet: ${href}`);
            document.head.appendChild(link);
        }
    }

    showError(message) {
        this.emit('notification:show', {
            title: 'Erreur',
            message: message,
            type: 'error',
            duration: 5000
        });
    }

    // Autres méthodes de rendu existantes...
    renderTeam() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container">
                ${this.renderHeader()}
                ${this.renderNavigation()}
                
                <div class="team-content">
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>Équipe</h3>
                        <p>Fonctionnalité en développement</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderPlanning() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container">
                ${this.renderHeader()}
                ${this.renderNavigation()}
                
                <div class="planning-content">
                    <div class="empty-state">
                        <i class="fas fa-calendar"></i>
                        <h3>Planning</h3>
                        <p>Fonctionnalité en développement</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderChat() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container">
                ${this.renderHeader()}
                ${this.renderNavigation()}
                
                <div class="chat-content">
                    <div class="empty-state">
                        <i class="fas fa-comments"></i>
                        <h3>Chat</h3>
                        <p>Fonctionnalité en développement</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderQuests() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container">
                ${this.renderHeader()}
                ${this.renderNavigation()}
                
                <div class="quests-content">
                    <div class="empty-state">
                        <i class="fas fa-scroll"></i>
                        <h3>Quêtes</h3>
                        <p>Fonctionnalité en développement</p>
                    </div>
                </div>
            </div>
        `;
    }

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
                                    (userProfile?.displayName?.charAt(0) || user.email.charAt(0)).toUpperCase()
                                }
                            </div>
                            <div class="user-info">
                                <span class="user-name">${userProfile?.displayName || user.email}</span>
                                <span class="user-role status-badge status-${userProfile?.role || 'employee'}">${this.formatRole(userProfile?.role)}</span>
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

    renderNavigation() {
        return `
            <div class="nav-tabs">
                <a href="#/dashboard" class="nav-tab" data-route="/dashboard">
                    <i class="fas fa-tachometer-alt"></i>
                    Dashboard
                </a>
                <a href="#/pointage" class="nav-tab" data-route="/pointage">
                    <i class="fas fa-clock"></i>
                    Pointage
                    <span class="nav-badge new">Nouveau!</span>
                </a>
                <a href="#/badging" class="nav-tab" data-route="/badging">
                    <i class="fas fa-stopwatch"></i>
                    Pointage Simple
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

    // Méthodes utilitaires existantes...
    async loadDashboardData() {
        try {
            document.getElementById('dashboard-members').textContent = '5';
            document.getElementById('dashboard-present').textContent = '3';
            document.getElementById('dashboard-hours').textContent = '32h';
            document.getElementById('dashboard-quests').textContent = '2';

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
                </div>
            `;
        } catch (error) {
            console.error('❌ Erreur chargement dashboard:', error);
        }
    }

    async loadBadgingData() {
        try {
            if (window.badgingManager) {
                window.badgingManager.startClock();
            }
        } catch (error) {
            console.error('❌ Erreur chargement pointage:', error);
        }
    }

    async loadTeamData() {
        console.log('📊 Chargement données équipe...');
    }

    formatRole(role) {
        const roles = {
            'admin': 'Administrateur',
            'manager': 'Manager',
            'employee': 'Employé'
        };
        return roles[role] || 'Employé';
    }

    emit(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        window.dispatchEvent(event);
    }

    getCurrentRoute() {
        return this.currentRoute;
    }

    getRoutes() {
        return { ...this.routes };
    }

    destroy() {
        this.cleanup();
        this.routes = {};
        this.currentRoute = null;
        console.log('🧹 Router nettoyé');
    }
}

// Export pour utilisation globale
window.Router = Router;
