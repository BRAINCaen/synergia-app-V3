/**
 * Router pour SYNERGIA v3.0
 * Fichier: src/js/core/router.js
 */
class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.isInitialized = false;
        
        this.init();
    }

    init() {
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
    }

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

    // ==================
    // COMPOSANTS COMMUNS
    // ==================

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

    async loadBadgingData() {
        try {
            if (window.badgingManager) {
                window.badgingManager.startClock();
                await window.badgingManager.loadTodaysTimesheet();
                this.updateBadgingStatus();
                
                window.addEventListener('badge:checkin', () => this.updateBadgingStatus());
                window.addEventListener('badge:checkout', () => this.updateBadgingStatus());
                window.addEventListener('badge:breakstart', () => this.updateBadgingStatus());
                window.addEventListener('badge:breakend', () => this.updateBadgingStatus());
            }
        } catch (error) {
            console.error('❌ Erreur chargement pointage:', error);
        }
    }

    updateBadgingStatus() {
        const statusContainer = document.getElementById('today-status');
        if (!statusContainer) return;

        if (!window.badgingManager) {
            statusContainer.innerHTML = `
                <div class="text-center">
                    <p class="text-muted">Service de pointage non disponible</p>
                </div>
            `;
            return;
        }

        const stats = window.badgingManager.getTodaysStats();
        const currentStatus = window.badgingManager.getCurrentStatus();

        let statusColor = '';
        let statusText = '';

        switch (currentStatus) {
            case 'not-started':
                statusColor = 'text-muted';
                statusText = 'Pas encore pointé';
                break;
            case 'working':
                statusColor = 'text-success';
                statusText = 'Au travail';
                break;
            case 'on-break':
                statusColor = 'text-warning';
                statusText = 'En pause';
                break;
            case 'finished':
                statusColor = 'text-info';
                statusText = 'Journée terminée';
                break;
            case 'pointage':
                case 'timeclock':
                EventBus.emit('router:beforeNavigate', 'timeclock');
                break;
        }

        const statusHTML = `
            <div class="status-overview">
                <div class="current-status">
                    <h4>Statut actuel</h4>
                    <p class="${statusColor}">
                        <i class="fas fa-circle"></i>
                        ${statusText}
                    </p>
                </div>
                
                ${stats.checkIn ? `
                    <div class="time-info">
                        <div class="time-label">Arrivée</div>
                        <div class="time-display">${this.formatTime(stats.checkIn)}</div>
                    </div>
                ` : ''}
                
                ${stats.checkOut ? `
                    <div class="time-info">
                        <div class="time-label">Sortie</div>
                        <div class="time-display">${this.formatTime(stats.checkOut)}</div>
                    </div>
                ` : ''}
                
                ${stats.totalHours > 0 ? `
                    <div class="time-info">
                        <div class="time-label">Temps total</div>
                        <div class="time-display">${this.formatHours(stats.totalHours)}</div>
                    </div>
                ` : ''}
                
                ${stats.breakDuration > 0 ? `
                    <div class="time-info">
                        <div class="time-label">Pause total</div>
                        <div class="time-display">${stats.breakDuration} min</div>
                    </div>
                ` : ''}
            </div>
        `;

        statusContainer.innerHTML = statusHTML;
    }

    async loadTeamData() {
        try {
            if (window.teamManager) {
                const members = await window.teamManager.loadTeamMembers();
                this.renderTeamList(members);
                this.updateTeamStats(members);
            }
        } catch (error) {
            console.error('❌ Erreur chargement équipe:', error);
            const teamList = document.getElementById('team-list');
            if (teamList) {
                teamList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Erreur de chargement</h3>
                        <p>Impossible de charger les membres de l'équipe</p>
                        <button onclick="window.router.loadTeamData()" class="btn btn-primary">
                            Réessayer
                        </button>
                    </div>
                `;
            }
        }
    }

    renderTeamList(members) {
        const teamList = document.getElementById('team-list');
        if (!teamList) return;

        if (members.length === 0) {
            teamList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>Aucun membre</h3>
                    <p>Commencez par ajouter des membres à votre équipe</p>
                    <button onclick="openAddMemberModal()" class="btn btn-primary">
                        <i class="fas fa-plus"></i>
                        Ajouter un membre
                    </button>
                </div>
            `;
            return;
        }

        const membersHTML = members.map(member => {
            const presenceStatus = this.getPresenceStatus(member.lastSeen);
            const avatar = member.photoURL || this.getDefaultAvatar(member.displayName, member.email);
            
            return `
                <div class="team-member">
                    <div class="member-avatar">
                        <img src="${avatar}" alt="${member.displayName || member.email}" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">
                            ${(member.displayName || member.email).charAt(0).toUpperCase()}
                        </div>
                    </div>
                    <div class="member-info">
                        <div class="member-name">${member.displayName || 'Nom non défini'}</div>
                        <div class="member-email">${member.email}</div>
                        <div class="member-meta">
                            <span class="status-badge status-${member.role || 'employee'}">${this.formatRole(member.role)}</span>
                            ${member.department ? `<span class="text-muted"><i class="fas fa-building"></i> ${member.department}</span>` : ''}
                            ${member.position ? `<span class="text-muted"><i class="fas fa-briefcase"></i> ${member.position}</span>` : ''}
                            <span class="status-dot ${presenceStatus}"></span>
                            <span class="text-muted">${this.formatPresenceStatus(presenceStatus)}</span>
                        </div>
                    </div>
                    <div class="member-actions">
                        <button onclick="editMember('${member.id}')" class="btn btn-icon btn-sm" title="Modifier">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteMemberConfirm('${member.id}')" class="btn btn-icon btn-sm btn-danger" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        teamList.innerHTML = membersHTML;
    }

    updateTeamStats(members) {
        const stats = this.calculateTeamStats(members);
        
        const elements = {
            'team-total': stats.total,
            'team-active': stats.active,
            'team-departments': stats.departments,
            'team-online': stats.online
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    calculateTeamStats(members) {
        const total = members.length;
        const active = members.filter(m => m.status !== 'inactive').length;
        const departments = [...new Set(members.map(m => m.department).filter(d => d))].length;
        const online = members.filter(m => this.getPresenceStatus(m.lastSeen) === 'online').length;

        return { total, active, departments, online };
    }

    // ==================
    // UTILITAIRES
    // ==================

    formatRole(role) {
        const roles = {
            'admin': 'Administrateur',
            'manager': 'Manager',
            'employee': 'Employé'
        };
        return roles[role] || 'Employé';
    }

    formatPresenceStatus(status) {
        const statuses = {
            'online': 'En ligne',
            'away': 'Absent',
            'offline': 'Hors ligne'
        };
        return statuses[status] || 'Hors ligne';
    }

    getPresenceStatus(lastSeen) {
        if (!lastSeen) return 'offline';
        
        const now = new Date();
        const lastSeenDate = new Date(lastSeen);
        const diff = now - lastSeenDate;
        
        if (diff < 5 * 60 * 1000) return 'online';
        if (diff < 30 * 60 * 1000) return 'away';
        
        return 'offline';
    }

    getDefaultAvatar(name, email) {
        const initial = name ? name.charAt(0).toUpperCase() : email.charAt(0).toUpperCase();
        const colors = ['#e94560', '#f39c12', '#3498db', '#9b59b6', '#2ecc71', '#e74c3c'];
        const color = colors[Math.abs(email.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length];
        
        return `data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50">
                <rect width="50" height="50" fill="${color}" rx="25"/>
                <text x="25" y="32" font-family="Arial" font-size="20" font-weight="bold" fill="white" text-anchor="middle">${initial}</text>
            </svg>
        `)}`;
    }

    formatTime(date) {
        if (!date) return '';
        if (typeof date === 'string') date = new Date(date);
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }

    formatHours(hours) {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h${m.toString().padStart(2, '0')}`;
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

<!-- Page Pointage - À intégrer dans votre router -->
<div id="timeclock-page" class="page-content">
    <!-- En-tête avec statut actuel -->
    <div class="timeclock-header">
        <div class="current-status" id="current-status">
            <div class="status-icon" id="status-icon">⏰</div>
            <div class="status-info">
                <h2 id="status-title">Non pointé</h2>
                <p id="status-subtitle">Cliquez pour pointer votre arrivée</p>
                <div id="current-session-timer" class="session-timer" style="display: none;">
                    <span id="work-timer">00:00</span>
                    <span id="break-indicator" style="display: none;">📱 En pause</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Actions de pointage -->
    <div class="timeclock-actions">
        <!-- Pointage principal -->
        <div class="main-actions">
            <button id="clock-in-btn" class="action-btn primary" style="display: none;">
                <i class="icon">🕐</i>
                <span>Pointer l'arrivée</span>
            </button>
            
            <button id="clock-out-btn" class="action-btn danger" style="display: none;">
                <i class="icon">🏠</i>
                <span>Pointer la sortie</span>
            </button>
            
            <button id="training-btn" class="action-btn secondary">
                <i class="icon">📚</i>
                <span>En formation</span>
            </button>
        </div>

        <!-- Actions de pause -->
        <div class="break-actions" id="break-actions" style="display: none;">
            <button id="start-break-btn" class="action-btn secondary">
                <i class="icon">⏸️</i>
                <span>Commencer une pause</span>
            </button>
            
            <button id="end-break-btn" class="action-btn success" style="display: none;">
                <i class="icon">▶️</i>
                <span>Terminer la pause</span>
            </button>
        </div>

        <!-- Options distanciel -->
        <div class="remote-options">
            <label class="checkbox-container">
                <input type="checkbox" id="remote-work-checkbox">
                <span class="checkmark"></span>
                Travail à distance
            </label>
            <button id="location-btn" class="icon-btn" title="Localisation actuelle">📍</button>
        </div>
    </div>

    <!-- Zone de commentaires -->
    <div class="comment-section" id="comment-section" style="display: none;">
        <h3 id="comment-title">Commentaire</h3>
        <textarea id="comment-input" placeholder="Ajouter un commentaire (optionnel)..." rows="3"></textarea>
        <div class="comment-actions">
            <button id="comment-cancel" class="btn secondary">Annuler</button>
            <button id="comment-confirm" class="btn primary">Confirmer</button>
        </div>
    </div>

    <!-- Statistiques du jour -->
    <div class="daily-stats">
        <h3>Aujourd'hui</h3>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value" id="today-work-time">00:00</div>
                <div class="stat-label">Temps travaillé</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="today-break-time">00:00</div>
                <div class="stat-label">Temps pause</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="today-overtime">00:00</div>
                <div class="stat-label">Heures sup.</div>
            </div>
        </div>
    </div>

    <!-- Historique -->
    <div class="timeclock-history">
        <div class="history-header">
            <h3>Historique des pointages</h3>
            <div class="history-controls">
                <select id="period-select">
                    <option value="week">Cette semaine</option>
                    <option value="month">Ce mois</option>
                    <option value="custom">Période personnalisée</option>
                </select>
                <button id="export-btn" class="btn secondary">📥 Exporter</button>
            </div>
        </div>

        <!-- Filtres personnalisés -->
        <div class="custom-period" id="custom-period" style="display: none;">
            <div class="date-inputs">
                <input type="date" id="start-date">
                <span>à</span>
                <input type="date" id="end-date">
                <button id="apply-filter" class="btn primary">Appliquer</button>
            </div>
        </div>

        <!-- Résumé de la période -->
        <div class="period-summary">
            <div class="summary-stats">
                <div class="summary-item">
                    <span class="summary-label">Temps total:</span>
                    <span class="summary-value" id="period-total-time">00:00</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Jours travaillés:</span>
                    <span class="summary-value" id="period-days-worked">0</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Heures sup.:</span>
                    <span class="summary-value" id="period-overtime">00:00</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Jours formation:</span>
                    <span class="summary-value" id="period-training-days">0</span>
                </div>
            </div>
        </div>

        <!-- Liste des entrées -->
        <div class="entries-list" id="entries-list">
            <!-- Les entrées seront chargées ici -->
        </div>
    </div>

    <!-- Modal d'export -->
    <div id="export-modal" class="modal" style="display: none;">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Exporter les données</h3>
                <button class="modal-close" id="export-modal-close">×</button>
            </div>
            <div class="modal-body">
                <div class="export-options">
                    <label>Format:</label>
                    <select id="export-format">
                        <option value="csv">CSV (Excel)</option>
                        <option value="json">JSON</option>
                    </select>
                </div>
                <div class="export-period">
                    <label>Période:</label>
                    <input type="date" id="export-start-date">
                    <span>à</span>
                    <input type="date" id="export-end-date">
                </div>
            </div>
            <div class="modal-footer">
                <button id="export-cancel" class="btn secondary">Annuler</button>
                <button id="export-download" class="btn primary">Télécharger</button>
            </div>
        </div>
    </div>

    <!-- Modal de confirmation admin -->
    <div id="admin-edit-modal" class="modal" style="display: none;">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Modifier le pointage</h3>
                <button class="modal-close" id="admin-modal-close">×</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="admin-clock-in">Heure d'arrivée:</label>
                    <input type="datetime-local" id="admin-clock-in">
                </div>
                <div class="form-group">
                    <label for="admin-clock-out">Heure de sortie:</label>
                    <input type="datetime-local" id="admin-clock-out">
                </div>
                <div class="form-group">
                    <label for="admin-comment">Commentaire de modification:</label>
                    <textarea id="admin-comment" rows="3" placeholder="Raison de la modification..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button id="admin-cancel" class="btn secondary">Annuler</button>
                <button id="admin-save" class="btn primary">Sauvegarder</button>
            </div>
        </div>
    </div>
</div>

<!-- Template pour les entrées d'historique -->
<template id="entry-template">
    <div class="entry-item" data-entry-id="">
        <div class="entry-header">
            <div class="entry-date"></div>
            <div class="entry-badges">
                <span class="badge remote" style="display: none;">📱 Distanciel</span>
                <span class="badge training" style="display: none;">📚 Formation</span>
                <span class="badge late" style="display: none;">⏰ Retard</span>
            </div>
            <div class="entry-actions">
                <button class="admin-edit-btn" style="display: none;" title="Modifier (Admin)">✏️</button>
            </div>
        </div>
        <div class="entry-details">
            <div class="time-info">
                <span class="clock-in">
                    <strong>Arrivée:</strong> <span class="time-value"></span>
                </span>
                <span class="clock-out">
                    <strong>Sortie:</strong> <span class="time-value"></span>
                </span>
            </div>
            <div class="duration-info">
                <span class="work-duration">
                    <strong>Travaillé:</strong> <span class="duration-value"></span>
                </span>
                <span class="break-duration">
                    <strong>Pauses:</strong> <span class="duration-value"></span>
                </span>
            </div>
            <div class="comments" style="display: none;">
                <div class="comment-in"></div>
                <div class="comment-out"></div>
            </div>
            <div class="breaks-list" style="display: none;">
                <strong>Détail des pauses:</strong>
                <div class="breaks-content"></div>
            </div>
        </div>
    </div>
</template>
// Export pour utilisation globale
window.Router = Router;
