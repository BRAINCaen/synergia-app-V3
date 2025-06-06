/**
 * Router SPA pour SYNERGIA v3.0
 * Gestion de la navigation sans rechargement
 */
class SynergiaRouter {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.middleware = [];
        this.container = null;
        
        // Initialisation
        this.init();
    }

    /**
     * Initialise le router
     */
    init() {
        this.container = document.getElementById('page-container');
        
        // Écoute les changements d'URL
        window.addEventListener('hashchange', () => this.handleRouteChange());
        window.addEventListener('load', () => this.handleRouteChange());
        
        // Gestion des liens internes
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-link]')) {
                e.preventDefault();
                this.navigate(e.target.getAttribute('href') || e.target.dataset.link);
            }
        });
    }

    /**
     * Définit une route
     * @param {string} path - Chemin de la route
     * @param {Object} config - Configuration de la route
     */
    addRoute(path, config) {
        const routePattern = this.pathToRegex(path);
        this.routes.set(path, {
            ...config,
            pattern: routePattern,
            originalPath: path
        });
    }

    /**
     * Convertit un chemin en regex pour la correspondance
     * @param {string} path 
     * @returns {RegExp}
     */
    pathToRegex(path) {
        const paramNames = [];
        const regexPath = path
            .replace(/:([^/]+)/g, (match, paramName) => {
                paramNames.push(paramName);
                return '([^/]+)';
            })
            .replace(/\*/g, '(.*)');
        
        return {
            regex: new RegExp(`^${regexPath}$`),
            paramNames
        };
    }

    /**
     * Ajoute un middleware global
     * @param {Function} fn - Fonction middleware
     */
    use(fn) {
        this.middleware.push(fn);
    }

    /**
     * Navigation vers une route
     * @param {string} path - Chemin de destination
     * @param {Object} options - Options de navigation
     */
    async navigate(path, options = {}) {
        const { replace = false, state = null } = options;
        
        // Mise à jour de l'URL
        if (replace) {
            window.location.replace(`#${path}`);
        } else {
            window.location.hash = path;
        }
        
        // Stockage de l'état si fourni
        if (state) {
            history.replaceState(state, '', window.location.href);
        }
    }

    /**
     * Gère les changements de route
     */
    async handleRouteChange() {
        const hash = window.location.hash.slice(1) || '/';
        const route = this.matchRoute(hash);
        
        if (!route) {
            console.warn(`Route non trouvée: ${hash}`);
            this.navigate('/404', { replace: true });
            return;
        }

        try {
            // Exécution des middlewares
            for (const middleware of this.middleware) {
                const result = await middleware(route);
                if (result === false) {
                    return; // Middleware a bloqué la navigation
                }
            }

            // Chargement de la vue
            await this.loadRoute(route);
            
        } catch (error) {
            console.error('Erreur lors du chargement de la route:', error);
            this.navigate('/error', { replace: true });
        }
    }

    /**
     * Trouve la route correspondante
     * @param {string} path 
     * @returns {Object|null}
     */
    matchRoute(path) {
        for (const [routePath, config] of this.routes) {
            const match = config.pattern.regex.exec(path);
            if (match) {
                const params = {};
                config.pattern.paramNames.forEach((name, index) => {
                    params[name] = match[index + 1];
                });
                
                return {
                    ...config,
                    params,
                    path: routePath,
                    fullPath: path
                };
            }
        }
        return null;
    }

    /**
     * Charge et affiche une route
     * @param {Object} route 
     */
    async loadRoute(route) {
        this.currentRoute = route;
        
        // Loading state
        this.showLoading();
        
        try {
            let content = '';
            
            // Si c'est un composant fonction
            if (typeof route.component === 'function') {
                content = await route.component(route.params);
            }
            // Si c'est une chaîne HTML
            else if (typeof route.component === 'string') {
                content = route.component;
            }
            // Si c'est un chemin vers un template
            else if (route.template) {
                content = await this.loadTemplate(route.template);
            }
            
            // Affichage du contenu
            this.container.innerHTML = content;
            
            // Exécution du callback onLoad
            if (route.onLoad) {
                await route.onLoad(route.params);
            }
            
            // Mise à jour du titre
            if (route.title) {
                document.title = `SYNERGIA - ${route.title}`;
            }
            
            // Mise à jour de la navigation active
            this.updateActiveNavigation(route.path);
            
        } catch (error) {
            console.error('Erreur lors du chargement de la route:', error);
            this.showError(error);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Charge un template depuis un fichier
     * @param {string} templatePath 
     * @returns {Promise<string>}
     */
    async loadTemplate(templatePath) {
        try {
            const response = await fetch(templatePath);
            if (!response.ok) {
                throw new Error(`Template non trouvé: ${templatePath}`);
            }
            return await response.text();
        } catch (error) {
            console.error('Erreur de chargement du template:', error);
            return '<div class="error">Template non disponible</div>';
        }
    }

    /**
     * Affiche l'état de chargement
     */
    showLoading() {
        this.container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Chargement...</p>
            </div>
        `;
    }

    /**
     * Masque l'état de chargement
     */
    hideLoading() {
        // Le contenu remplace automatiquement le loading
    }

    /**
     * Affiche une erreur
     * @param {Error} error 
     */
    showError(error) {
        this.container.innerHTML = `
            <div class="error-container">
                <h2>Une erreur est survenue</h2>
                <p>${error.message}</p>
                <button onclick="router.navigate('/')" class="btn btn-primary">
                    Retour à l'accueil
                </button>
            </div>
        `;
    }

    /**
     * Met à jour la navigation active
     * @param {string} routePath 
     */
    updateActiveNavigation(routePath) {
        // Supprime toutes les classes actives
        document.querySelectorAll('.nav-item.active').forEach(item => {
            item.classList.remove('active');
        });
        
        // Ajoute la classe active à l'élément correspondant
        const navItem = document.querySelector(`[data-route="${routePath}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }
    }

    /**
     * Retour en arrière
     */
    back() {
        window.history.back();
    }

    /**
     * Redirection
     * @param {string} path 
     */
    redirect(path) {
        this.navigate(path, { replace: true });
    }

    /**
     * Récupère la route actuelle
     * @returns {Object|null}
     */
    getCurrentRoute() {
        return this.currentRoute;
    }

    /**
     * Vérifie si on est sur une route spécifique
     * @param {string} path 
     * @returns {boolean}
     */
    isCurrentRoute(path) {
        return this.currentRoute && this.currentRoute.path === path;
    }
}

// Instance globale du router
const router = new SynergiaRouter();

// Export pour les modules
window.SynergiaRouter = router;
