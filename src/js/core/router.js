// src/js/core/Router.js
// Routeur SPA pour SYNERGIA v3.0

import { Logger } from '../utils/Logger.js';

export class Router {
    constructor(options = {}) {
        this.options = {
            defaultRoute: 'dashboard',
            authRequired: true,
            mode: 'hash', // 'hash' ou 'history'
            ...options
        };
        
        this.routes = new Map();
        this.currentRoute = null;
        this.previousRoute = null;
        this.isStarted = false;
        this.logger = new Logger('Router');
        
        // Cache pour les vues chargées
        this.viewCache = new Map();
        this.maxCacheSize = 10;
        
        // Guards et middlewares
        this.beforeEach = null;
        this.afterEach = null;
        this.guards = [];
        
        // Historique de navigation
        this.history = [];
        this.maxHistorySize = 50;
        
        this.logger.info('Router initialisé');
    }
    
    /**
     * Ajouter une route
     */
    addRoute(name, component, options = {}) {
        if (this.routes.has(name)) {
            this.logger.warn(`Route '${name}' déjà définie, remplacement`);
        }
        
        const route = {
            name,
            component,
            path: options.path || `/${name}`,
            authRequired: options.authRequired ?? this.options.authRequired,
            title: options.title || this.capitalizeFirst(name),
            meta: options.meta || {},
            beforeEnter: options.beforeEnter || null,
            afterEnter: options.afterEnter || null,
            ...options
        };
        
        this.routes.set(name, route);
        this.logger.debug(`Route ajoutée: ${name} -> ${route.path}`);
        
        return this;
    }
    
    /**
     * Ajouter plusieurs routes
     */
    addRoutes(routes) {
        Object.entries(routes).forEach(([name, config]) => {
            if (typeof config === 'function') {
                this.addRoute(name, config);
            } else {
                this.addRoute(name, config.component, config);
            }
        });
        
        return this;
    }
    
    /**
     * Démarrer le routeur
     */
    start() {
        if (this.isStarted) {
            this.logger.warn('Router déjà démarré');
            return this;
        }
        
        this.isStarted = true;
        
        // Écouter les changements d'URL
        if (this.options.mode === 'history') {
            window.addEventListener('popstate', (e) => this.handlePopState(e));
        } else {
            window.addEventListener('hashchange', (e) => this.handleHashChange(e));
        }
        
        // Naviguer vers la route initiale
        const initialRoute = this.getCurrentRouteFromURL();
        this.navigate(initialRoute || this.options.defaultRoute, {}, { replace: true });
        
        this.logger.info('Router démarré');
        return this;
    }
    
    /**
     * Arrêter le routeur
     */
    stop() {
        if (!this.isStarted) return this;
        
        this.isStarted = false;
        
        if (this.options.mode === 'history') {
            window.removeEventListener('popstate', this.handlePopState);
        } else {
            window.removeEventListener('hashchange', this.handleHashChange);
        }
        
        this.logger.info('Router arrêté');
        return this;
    }
    
    /**
     * Naviguer vers une route
     */
    async navigate(routeName, params = {}, options = {}) {
        if (!this.isStarted) {
            this.logger.error('Router non démarré');
            return false;
        }
        
        const route = this.routes.get(routeName);
        if (!route) {
            this.logger.error(`Route inconnue: ${routeName}`);
            this.handle404(routeName);
            return false;
        }
        
        this.logger.info(`Navigation: ${this.currentRoute?.name || 'null'} -> ${routeName}`);
        
        try {
            // Exécuter les guards
            const guardResult = await this.executeGuards(route, params);
            if (guardResult !== true) {
                this.logger.warn(`Navigation bloquée par guard: ${guardResult}`);
                return false;
            }
            
            // Exécuter beforeEach global
            if (this.beforeEach) {
                const beforeResult = await this.beforeEach(route, this.currentRoute);
                if (beforeResult === false) {
                    this.logger.warn('Navigation annulée par beforeEach');
                    return false;
                }
            }
            
            // Exécuter beforeEnter de la route
            if (route.beforeEnter) {
                const beforeEnterResult = await route.beforeEnter(route, this.currentRoute);
                if (beforeEnterResult === false) {
                    this.logger.warn('Navigation annulée par beforeEnter');
                    return false;
                }
            }
            
            // Sauvegarder la route précédente
            this.previousRoute = this.currentRoute;
            
            // Charger et exécuter la vue
            await this.loadAndExecuteRoute(route, params);
            
            // Mettre à jour l'URL
            this.updateURL(route, params, options);
            
            // Mettre à jour la route actuelle
            this.currentRoute = {
                ...route,
                params,
                timestamp: Date.now()
            };
            
            // Ajouter à l'historique
            this.addToHistory(this.currentRoute);
            
            // Mettre à jour le titre
            this.updatePageTitle(route);
            
            // Exécuter afterEnter de la route
            if (route.afterEnter) {
                route.afterEnter(route, this.previousRoute);
            }
            
            // Exécuter afterEach global
            if (this.afterEach) {
                this.afterEach(route, this.previousRoute);
            }
            
            // Callback de changement de route
            if (this.options.onRouteChange) {
                this.options.onRouteChange(this.currentRoute);
            }
            
            this.logger.success(`Navigation réussie vers: ${routeName}`);
            return true;
            
        } catch (error) {
            this.logger.error(`Erreur navigation vers ${routeName}:`, error);
            this.handleNavigationError(error, route);
            return false;
        }
    }
    
    /**
     * Charger et exécuter une route
     */
    async loadAndExecuteRoute(route, params) {
        // Vérifier le cache
        const cacheKey = `${route.name}_${JSON.stringify(params)}`;
        
        if (this.viewCache.has(cacheKey) && !route.noCache) {
            this.logger.debug(`Vue chargée depuis le cache: ${route.name}`);
            return this.viewCache.get(cacheKey);
        }
        
        // Charger la vue
        let ViewClass;
        
        if (typeof route.component === 'function') {
            try {
                // Si c'est une fonction qui retourne une promesse (import dynamique)
                const module = await route.component();
                ViewClass = module.default || module;
            } catch (error) {
                if (route.component.toString().includes('import(')) {
                    // Erreur de chargement dynamique
                    throw new Error(`Erreur chargement vue dynamique: ${error.message}`);
                } else {
                    // C'est probablement une classe/fonction directe
                    ViewClass = route.component;
                }
            }
        } else {
            ViewClass = route.component;
        }
        
        // Mettre en cache si autorisé
        if (!route.noCache && this.viewCache.size < this.maxCacheSize) {
            this.viewCache.set(cacheKey, ViewClass);
        }
        
        return ViewClass;
    }
    
    /**
     * Naviguer en arrière
     */
    back() {
        if (this.history.length > 1) {
            const previousRoute = this.history[this.history.length - 2];
            this.navigate(previousRoute.name, previousRoute.params);
        } else {
            this.navigate(this.options.defaultRoute);
        }
        
        return this;
    }
    
    /**
     * Recharger la route actuelle
     */
    reload() {
        if (this.currentRoute) {
            // Vider le cache pour cette route
            this.clearRouteCache(this.currentRoute.name);
            this.navigate(this.currentRoute.name, this.currentRoute.params, { replace: true });
        }
        
        return this;
    }
    
    /**
     * Ajouter un guard
     */
    addGuard(guard) {
        if (typeof guard !== 'function') {
            this.logger.error('Guard invalide');
            return this;
        }
        
        this.guards.push(guard);
        this.logger.debug('Guard ajouté');
        
        return this;
    }
    
    /**
     * Définir beforeEach global
     */
    setBeforeEach(callback) {
        this.beforeEach = callback;
        return this;
    }
    
    /**
     * Définir afterEach global
     */
    setAfterEach(callback) {
        this.afterEach = callback;
        return this;
    }
    
    /**
     * Exécuter les guards
     */
    async executeGuards(route, params) {
        for (const guard of this.guards) {
            try {
                const result = await guard(route, params, this.currentRoute);
                if (result !== true) {
                    return result;
                }
            } catch (error) {
                this.logger.error('Erreur dans guard:', error);
                return `Erreur guard: ${error.message}`;
            }
        }
        
        return true;
    }
    
    /**
     * Gestion des événements de navigation
     */
    handlePopState(event) {
        const route = this.getCurrentRouteFromURL();
        if (route && route !== this.currentRoute?.name) {
            this.navigate(route);
        }
    }
    
    handleHashChange(event) {
        const route = this.getCurrentRouteFromURL();
        if (route && route !== this.currentRoute?.name) {
            this.navigate(route);
        }
    }
    
    /**
     * Obtenir la route actuelle depuis l'URL
     */
    getCurrentRouteFromURL() {
        if (this.options.mode === 'history') {
            const path = window.location.pathname.slice(1) || this.options.defaultRoute;
            return path;
        } else {
            const hash = window.location.hash.slice(1) || this.options.defaultRoute;
            return hash;
        }
    }
    
    /**
     * Mettre à jour l'URL
     */
    updateURL(route, params, options = {}) {
        const url = this.buildURL(route, params);
        
        if (this.options.mode === 'history') {
            if (options.replace) {
                window.history.replaceState({ route: route.name, params }, route.title, url);
            } else {
                window.history.pushState({ route: route.name, params }, route.title, url);
            }
        } else {
            if (options.replace) {
                window.location.replace(`#${route.name}`);
            } else {
                window.location.hash = route.name;
            }
        }
    }
    
    /**
     * Construire l'URL pour une route
     */
    buildURL(route, params = {}) {
        let url = route.path;
        
        // Remplacer les paramètres dans l'URL
        Object.entries(params).forEach(([key, value]) => {
            url = url.replace(`:${key}`, encodeURIComponent(value));
        });
        
        return url;
    }
    
    /**
     * Mettre à jour le titre de la page
     */
    updatePageTitle(route) {
        if (route.title) {
            document.title = `${route.title} - SYNERGIA`;
        }
    }
    
    /**
     * Ajouter à l'historique
     */
    addToHistory(route) {
        this.history.push({
            name: route.name,
            params: route.params,
            timestamp: route.timestamp
        });
        
        // Limiter la taille de l'historique
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(-this.maxHistorySize);
        }
    }
    
    /**
     * Gestion erreur 404
     */
    handle404(routeName) {
        this.logger.error(`Route 404: ${routeName}`);
        
        // Rediriger vers la route par défaut
        this.navigate(this.options.defaultRoute, {}, { replace: true });
        
        // Émettre événement 404
        if (window.eventBus) {
            window.eventBus.emit('router:404', { routeName });
        }
    }
    
    /**
     * Gestion des erreurs de navigation
     */
    handleNavigationError(error, route) {
        this.logger.error(`Erreur navigation:`, error);
        
        // Émettre événement d'erreur
        if (window.eventBus) {
            window.eventBus.emit('router:error', { error, route });
        }
        
        // Rediriger vers route de secours
        if (route.name !== this.options.defaultRoute) {
            this.navigate(this.options.defaultRoute, {}, { replace: true });
        }
    }
    
    /**
     * Vider le cache des vues
     */
    clearCache() {
        this.viewCache.clear();
        this.logger.info('Cache des vues vidé');
    }
    
    /**
     * Vider le cache d'une route spécifique
     */
    clearRouteCache(routeName) {
        const keysToDelete = [];
        
        this.viewCache.forEach((value, key) => {
            if (key.startsWith(`${routeName}_`)) {
                keysToDelete.push(key);
            }
        });
        
        keysToDelete.forEach(key => this.viewCache.delete(key));
        
        if (keysToDelete.length > 0) {
            this.logger.debug(`Cache vidé pour la route: ${routeName}`);
        }
    }
    
    /**
     * Obtenir les informations du routeur
     */
    getInfo() {
        return {
            isStarted: this.isStarted,
            currentRoute: this.currentRoute,
            previousRoute: this.previousRoute,
            totalRoutes: this.routes.size,
            cacheSize: this.viewCache.size,
            historySize: this.history.length,
            mode: this.options.mode
        };
    }
    
    /**
     * Obtenir toutes les routes
     */
    getRoutes() {
        return Array.from(this.routes.entries()).map(([name, route]) => ({
            name,
            path: route.path,
            title: route.title,
            authRequired: route.authRequired
        }));
    }
    
    /**
     * Obtenir la route actuelle
     */
    getCurrentRoute() {
        return this.currentRoute?.name || null;
    }
    
    /**
     * Vérifier si une route existe
     */
    hasRoute(routeName) {
        return this.routes.has(routeName);
    }
    
    /**
     * Capitaliser la première lettre
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    /**
     * Debug du routeur
     */
    debug() {
        console.group('%c[Router] État actuel', 'color: #6d28d9; font-weight: bold;');
        console.log('📊 Informations:', this.getInfo());
        console.log('🗺️ Routes:', this.getRoutes());
        console.log('📚 Historique:', this.history.slice(-10));
        console.groupEnd();
    }
    
    /**
     * Nettoyage
     */
    cleanup() {
        this.stop();
        this.clearCache();
        this.routes.clear();
        this.history = [];
        this.guards = [];
        this.beforeEach = null;
        this.afterEach = null;
        
        this.logger.info('Router nettoyé');
    }
}

// Export des guards prédéfinis
export const guards = {
    /**
     * Guard d'authentification
     */
    auth: (route, params, currentRoute) => {
        if (route.authRequired && !window.auth?.currentUser) {
            return 'login'; // Rediriger vers login
        }
        return true;
    },
    
    /**
     * Guard de rôle
     */
    role: (requiredRole) => (route, params, currentRoute) => {
        const user = window.auth?.currentUser;
        if (!user || !user.role || user.role !== requiredRole) {
            return 'unauthorized';
        }
        return true;
    },
    
    /**
     * Guard de permissions
     */
    permission: (requiredPermission) => (route, params, currentRoute) => {
        const user = window.auth?.currentUser;
        if (!user || !user.permissions?.includes(requiredPermission)) {
            return 'unauthorized';
        }
        return true;
    }
};

// Instance par défaut
export const router = new Router();

// Exposer globalement en mode debug
if (import.meta.env?.DEV) {
    window.router = router;
    window.routerGuards = guards;
}