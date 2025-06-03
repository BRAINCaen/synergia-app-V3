// js/core/router.js
// Système de routing pour SYNERGIA v3.0

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.previousRoute = null;
        this.middlewares = [];
        this.guards = new Map();
        
        this.init();
    }
    
    init() {
        this.setupDefaultRoutes();
        this.setupEventListeners();
        
        // Démarrer sur la route actuelle
        const initialRoute = this.getCurrentPath();
        this.navigate(initialRoute, { replace: true });
        
        console.log('✅ Router initialisé');
    }
    
    setupDefaultRoutes() {
        // Routes de base
        this.addRoute('/', {
            page: 'dashboard',
            title: 'Tableau de bord',
            requiresAuth: true
        });
        
        this.addRoute('/dashboard', {
            page: 'dashboard',
            title: 'Tableau de bord',
            requiresAuth: true
        });
        
        this.addRoute('/quests', {
            page: 'quests',
            title: 'Quêtes',
            requiresAuth: true,
            onEnter: () => this.loadQuestsData()
        });
        
        this.addRoute('/team', {
            page: 'team',
            title: 'Équipe',
            requiresAuth: true,
            permissions: ['view_team'],
            onEnter: () => this.loadTeamData()
        });
        
        this.addRoute('/planning', {
            page: 'planning',
            title: 'Planning',
            requiresAuth: true,
            onEnter: () => this.loadPlanningData()
        });
        
        this.addRoute('/chat', {
            page: 'chat',
            title: 'Chat',
            requiresAuth: true,
            onEnter: () => this.loadChatData()
        });
        
        this.addRoute('/badging', {
            page: 'badging',
            title: 'Pointage',
            requiresAuth: true,
            onEnter: () => this.loadBadgingData()
        });
        
        this.addRoute('/login', {
            page: 'login',
            title: 'Connexion',
            requiresAuth: false,
            onEnter: () => this.showLoginPage()
        });
        
        this.addRoute('/profile', {
            page: 'profile',
            title: 'Profil',
            requiresAuth: true,
            onEnter: () => this.loadProfileData()
        });
        
        // Route 404
        this.addRoute('*', {
            page: 'dashboard',
            title: 'Page non trouvée',
            requiresAuth: true
        });
    }
    
    setupEventListeners() {
        // Navigation par liens
        document.addEventListener('click', (e) => {
            const link = e.target.closest('[data-route]');
            if (link) {
                e.preventDefault();
                const route = link.dataset.route;
                this.navigate(route);
            }
        });
        
        // Navigation par pages
        document.addEventListener('click', (e) => {
            const pageLink = e.target.closest('[data-page]');
            if (pageLink) {
                e.preventDefault();
                const page = pageLink.dataset.page;
                this.navigateToPage(page);
            }
        });
        
        // Gestion du bouton retour
        window.addEventListener('popstate', (e) => {
            const route = e.state?.route || this.getCurrentPath();
            this.navigate(route, { replace: true, fromHistory: true });
        });
        
        // Authentification
        document.addEventListener('auth:login', () => {
            if (this.currentRoute?.path === '/login') {
                this.navigate('/dashboard');
            }
        });
        
        document.addEventListener('auth:logout', () => {
            this.navigate('/login');
        });
    }
    
    addRoute(path, config) {
        this.routes.set(path, {
            path,
            ...config
        });
    }
    
    addMiddleware(middleware) {
        this.middlewares.push(middleware);
    }
    
    addGuard(name, guardFunction) {
        this.guards.set(name, guardFunction);
    }
    
    async navigate(path, options = {}) {
        try {
            // Nettoyer le path
            const cleanPath = this.cleanPath(path);
            
            // Trouver la route
            const route = this.findRoute(cleanPath);
            if (!route) {
                console.warn(`Route non trouvée: ${cleanPath}`);
                return false;
            }
            
            // Exécuter les middlewares
            for (const middleware of this.middlewares) {
                const result = await middleware(route, this.currentRoute);
                if (result === false) {
                    return false;
                }
            }
            
            // Vérifier l'authentification
            if (route.requiresAuth && !this.isAuthenticated()) {
                this.navigate('/login');
                return false;
            }
            
            // Vérifier les permissions
            if (route.permissions && !this.hasPermissions(route.permissions)) {
                console.warn('Permissions insuffisantes pour', route.path);
                window.uiManager?.showToast('Accès non autorisé', 'error');
                return false;
            }
            
            // Exécuter les guards
            for (const [name, guard] of this.guards) {
                const result = await guard(route, this.currentRoute);
                if (result === false) {
                    console.warn(`Guard ${name} a bloqué la navigation`);
                    return false;
                }
            }
            
            // Sauvegarder la route précédente
            this.previousRoute = this.currentRoute;
            this.currentRoute = route;
            
            // Mettre à jour l'historique
            if (!options.replace && !options.fromHistory) {
                history.pushState({ route: cleanPath }, route.title, cleanPath);
            }
            
            // Mettre à jour le titre
            document.title = `${route.title} - SYNERGIA`;
            
            // Exécuter onLeave de la route précédente
            if (this.previousRoute?.onLeave) {
                await this.previousRoute.onLeave(route);
            }
            
            // Naviguer vers la page
            await this.showPage(route.page);
            
            // Exécuter onEnter de la nouvelle route
            if (route.onEnter) {
                await route.onEnter(this.previousRoute);
            }
            
            // Dispatcher événement
            document.dispatchEvent(new CustomEvent('route:change', {
                detail: {
                    route,
                    previousRoute: this.previousRoute,
                    path: cleanPath
                }
            }));
            
            // Analytics
            if (window.firebaseManager) {
                window.firebaseManager.logEvent('page_view', {
                    page_location: cleanPath,
                    page_title: route.title
                });
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Erreur navigation:', error);
            return false;
        }
    }
    
    navigateToPage(page) {
        const route = Array.from(this.routes.values()).find(r => r.page === page);
        if (route) {
            this.navigate(route.path);
        } else {
            console.warn(`Page non trouvée: ${page}`);
        }
    }
    
    async showPage(page) {
        // Masquer toutes les pages
        const pages = document.querySelectorAll('.page-content');
        pages.forEach(p => {
            p.classList.remove('active');
            p.style.display = 'none';
        });
        
        // Afficher la page cible
        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) {
            targetPage.style.display = 'block';
            
            // Animation d'entrée
            requestAnimationFrame(() => {
                targetPage.classList.add('active');
            });
            
            // Mettre à jour la navigation
            this.updateNavigation(page);
            
        } else {
            console.warn(`Élément page non trouvé: ${page}-page`);
        }
    }
    
    updateNavigation(activePage) {
        const navItems = document.querySelectorAll('.nav-item, [data-page]');
        navItems.forEach(item => {
            const isActive = item.dataset.page === activePage;
            item.classList.toggle('active', isActive);
        });
    }
    
    findRoute(path) {
        // Recherche exacte
        if (this.routes.has(path)) {
            return this.routes.get(path);
        }
        
        // Recherche avec paramètres
        for (const [routePath, route] of this.routes) {
            if (this.matchRoute(routePath, path)) {
                return { ...route, params: this.extractParams(routePath, path) };
            }
        }
        
        // Route 404
        return this.routes.get('*');
    }
    
    matchRoute(routePath, actualPath) {
        if (routePath === '*') return true;
        
        const routeParts = routePath.split('/');
        const actualParts = actualPath.split('/');
        
        if (routeParts.length !== actualParts.length) return false;
        
        return routeParts.every((part, index) => {
            return part.startsWith(':') || part === actualParts[index];
        });
    }
    
    extractParams(routePath, actualPath) {
        const routeParts = routePath.split('/');
        const actualParts = actualPath.split('/');
        const params = {};
        
        routeParts.forEach((part, index) => {
            if (part.startsWith(':')) {
                const paramName = part.slice(1);
                params[paramName] = actualParts[index];
            }
        });
        
        return params;
    }
    
    cleanPath(path) {
        if (!path || path === '') return '/';
        if (!path.startsWith('/')) path = '/' + path;
        return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    }
    
    getCurrentPath() {
        return window.location.pathname;
    }
    
    isAuthenticated() {
        return window.firebaseManager?.isAuthenticated() || false;
    }
    
    hasPermissions(requiredPermissions) {
        // TODO: Implémenter système de permissions
        return true;
    }
    
    // Data loaders pour chaque page
    async loadQuestsData() {
        try {
            if (window.questManager) {
                await window.questManager.loadQuests();
            }
        } catch (error) {
            console.error('❌ Erreur chargement quêtes:', error);
        }
    }
    
    async loadTeamData() {
        try {
            if (window.teamManager) {
                await window.teamManager.loadTeamMembers();
            }
        } catch (error) {
            console.error('❌ Erreur chargement équipe:', error);
        }
    }
    
    async loadPlanningData() {
        try {
            if (window.planningManager) {
                await window.planningManager.loadPlanning();
            }
        } catch (error) {
            console.error('❌ Erreur chargement planning:', error);
        }
    }
    
    async loadChatData() {
        try {
            if (window.chatManager) {
                await window.chatManager.loadConversations();
            }
        } catch (error) {
            console.error('❌ Erreur chargement chat:', error);
        }
    }
    
    async loadBadgingData() {
        try {
            if (window.badgingManager) {
                await window.badgingManager.loadBadgingData();
            }
        } catch (error) {
            console.error('❌ Erreur chargement pointage:', error);
        }
    }
    
    async loadProfileData() {
        try {
            if (window.firebaseManager) {
                const userData = await window.firebaseManager.getCurrentUserData();
                if (userData && window.uiManager) {
                    window.uiManager.updateUserInfo(userData);
                }
            }
        } catch (error) {
            console.error('❌ Erreur chargement profil:', error);
        }
    }
    
    showLoginPage() {
        if (window.uiManager) {
            window.uiManager.showLoginScreen();
            window.uiManager.hideAppContainer();
        }
    }
    
    // Méthodes utilitaires
    go(delta) {
        history.go(delta);
    }
    
    back() {
        history.back();
    }
    
    forward() {
        history.forward();
    }
    
    replace(path) {
        this.navigate(path, { replace: true });
    }
    
    reload() {
        if (this.currentRoute) {
            this.navigate(this.currentRoute.path, { replace: true });
        }
    }
    
    getCurrentRoute() {
        return this.currentRoute;
    }
    
    getPreviousRoute() {
        return this.previousRoute;
    }
    
    // Guards prédéfinis
    setupDefaultGuards() {
        // Guard d'authentification
        this.addGuard('auth', async (route) => {
            if (route.requiresAuth && !this.isAuthenticated()) {
                console.log('🚫 Accès refusé - Authentification requise');
                return false;
            }
            return true;
        });
        
        // Guard de rôle
        this.addGuard('role', async (route) => {
            if (route.roles && window.firebaseManager) {
                const userData = await window.firebaseManager.getCurrentUserData();
                if (!userData || !route.roles.includes(userData.role)) {
                    console.log('🚫 Accès refusé - Rôle insuffisant');
                    return false;
                }
            }
            return true;
        });
        
        // Guard de page en maintenance
        this.addGuard('maintenance', async (route) => {
            if (route.maintenance) {
                window.uiManager?.showToast('Page en maintenance', 'warning');
                return false;
            }
            return true;
        });
    }
    
    // Breadcrumbs
    getBreadcrumbs() {
        const breadcrumbs = [];
        if (this.currentRoute) {
            breadcrumbs.push({
                title: this.currentRoute.title,
                path: this.currentRoute.path,
                active: true
            });
        }
        return breadcrumbs;
    }
    
    // Query parameters
    getQueryParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    }
    
    setQueryParam(key, value) {
        const url = new URL(window.location);
        url.searchParams.set(key, value);
        history.replaceState(null, '', url);
    }
    
    removeQueryParam(key) {
        const url = new URL(window.location);
        url.searchParams.delete(key);
        history.replaceState(null, '', url);
    }
    
    // Hash management
    getHash() {
        return window.location.hash.slice(1);
    }
    
    setHash(hash) {
        window.location.hash = hash;
    }
    
    // Route preloading
    async preloadRoute(path) {
        const route = this.findRoute(path);
        if (route?.preload) {
            try {
                await route.preload();
            } catch (error) {
                console.error('❌ Erreur preload route:', error);
            }
        }
    }
    
    // Lazy loading support
    async loadRouteModule(modulePath) {
        try {
            const module = await import(modulePath);
            return module.default || module;
        } catch (error) {
            console.error('❌ Erreur chargement module:', error);
            throw error;
        }
    }
    
    // Debug utilities
    getRouteInfo() {
        return {
            current: this.currentRoute,
            previous: this.previousRoute,
            allRoutes: Array.from(this.routes.keys()),
            guards: Array.from(this.guards.keys()),
            middlewares: this.middlewares.length,
            path: this.getCurrentPath(),
            queryParams: this.getQueryParams(),
            hash: this.getHash()
        };
    }
    
    printRoutes() {
        console.table(Array.from(this.routes.entries()).map(([path, route]) => ({
            path,
            page: route.page,
            title: route.title,
            requiresAuth: route.requiresAuth,
            permissions: route.permissions?.join(', ') || 'none'
        })));
    }
}

// Initialiser
document.addEventListener('DOMContentLoaded', () => {
    window.router = new Router();
    window.router.setupDefaultGuards();
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Router;
}
