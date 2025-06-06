/**
 * Point d'entrée principal de SYNERGIA v3.0
 * Fichier: src/js/main.js
 */

class SynergiaApp {
    constructor() {
        this.isInitialized = false;
        this.modules = new Map();
    }

    /**
     * Initialise l'application
     */
    async init() {
        try {
            console.log('🚀 Initialisation de SYNERGIA v3.0...');
            
            // 1. Initialisation Firebase
            await this.initFirebase();
            
            // 2. Initialisation du router
            await this.initRouter();
            
            // 3. Initialisation des managers
            await this.initManagers();
            
            // 4. Initialisation de l'interface
            await this.initUI();
            
            // 5. Démarrage de l'application
            await this.start();
            
            this.isInitialized = true;
            console.log('✅ SYNERGIA v3.0 initialisé avec succès');
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
            this.showInitError(error);
        }
    }

    /**
     * Initialise Firebase
     */
    async initFirebase() {
        console.log('🔥 Initialisation Firebase...');
        
        // Attendre que les scripts Firebase soient chargés
        await this.waitForFirebase();
        
        // Initialiser le service Firebase
        await firebaseService.initialize(FIREBASE_CONFIG);
        
        console.log('✅ Firebase initialisé');
    }

    /**
     * Attend que Firebase soit disponible
     */
    waitForFirebase() {
        return new Promise((resolve, reject) => {
            const checkFirebase = () => {
                if (typeof firebase !== 'undefined') {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            
            checkFirebase();
            
            // Timeout après 10 secondes
            setTimeout(() => {
                reject(new Error('Firebase non disponible après 10 secondes'));
            }, 10000);
        });
    }

    /**
     * Initialise le système de routing
     */
    async initRouter() {
        console.log('🧭 Initialisation du router...');
        
        // Middleware d'authentification
        router.use(async (route) => {
            // Vérifier si la route nécessite une authentification
            if (route.requireAuth && !this.isUserAuthenticated()) {
                router.navigate('/login', { replace: true });
                return false;
            }
            return true;
        });

        // Définition des routes
        this.defineRoutes();
        
        console.log('✅ Router initialisé');
    }

    /**
     * Définit toutes les routes de l'application
     */
    defineRoutes() {
        // Route d'accueil
        router.addRoute('/', {
            title: 'Accueil',
            component: () => this.getModule('Dashboard').render(),
            requireAuth: true,
            onLoad: () => this.getModule('Dashboard').init()
        });

        // Dashboard
        router.addRoute('/dashboard', {
            title: 'Tableau de bord',
            component: () => this.getModule('Dashboard').render(),
            requireAuth: true,
            onLoad: () => this.getModule('Dashboard').init()
        });

        // Équipe
        router.addRoute('/team', {
            title: 'Gestion d\'équipe',
            component: () => this.getModule('Team').render(),
            requireAuth: true,
            onLoad: () => this.getModule('Team').init()
        });

        // Badging
        router.addRoute('/badging', {
            title: 'Pointage',
            component: () => this.getModule('Badging').render(),
            requireAuth: true,
            onLoad: () => this.getModule('Badging').init()
        });

        // Chat
        router.addRoute('/chat', {
            title: 'Messages',
            component: () => this.getModule('Chat').render(),
            requireAuth: true,
            onLoad: () => this.getModule('Chat').init()
        });

        // Planning
        router.addRoute('/planning', {
            title: 'Planning',
            component: () => this.getModule('Planning').render(),
            requireAuth: true,
            onLoad: () => this.getModule('Planning').init()
        });

        // Quêtes
        router.addRoute('/quests', {
            title: 'Quêtes',
            component: () => this.getModule('Quests').render(),
            requireAuth: true,
            onLoad: () => this.getModule('Quests').init()
        });

        // Boutique
        router.addRoute('/store', {
            title: 'Boutique',
            component: () => this.getModule('Store').render(),
            requireAuth: true,
            onLoad: () => this.getModule('Store').init()
        });

        // Paramètres
        router.addRoute('/settings', {
            title: 'Paramètres',
            component: () => this.getModule('Settings').render(),
            requireAuth: true,
            onLoad: () => this.getModule('Settings').init()
        });

        // Authentification
        router.addRoute('/login', {
            title: 'Connexion',
            component: () => this.getModule('Auth').renderLogin(),
            requireAuth: false,
            onLoad: () => this.getModule('Auth').initLogin()
        });

        // Pages d'erreur
        router.addRoute('/404', {
            title: 'Page non trouvée',
            component: () => '<div class="error-page"><h1>404 - Page non trouvée</h1></div>',
            requireAuth: false
        });

        router.addRoute('/error', {
            title: 'Erreur',
            component: () => '<div class="error-page"><h1>Une erreur est survenue</h1></div>',
            requireAuth: false
        });
    }

    /**
     * Initialise tous les managers
     */
    async initManagers() {
        console.log('👥 Initialisation des managers...');
        
        // Attendre que Firebase soit prêt
        await firebaseService.waitForInitialization();
        
        // Initialisation des managers dans l'ordre de dépendance
        this.modules.set('Auth', new AuthManager());
        this.modules.set('Team', new TeamManager());
        this.modules.set('Badging', new BadgingManager());
        this.modules.set('Chat', new ChatManager());
        this.modules.set('Planning', new PlanningManager());
        this.modules.set('Quest', new QuestManager());
        this.modules.set('Store', new StoreManager());
        this.modules.set('Notification', new NotificationManager());
        
        // Initialisation des vues
        this.modules.set('Dashboard', new Dashboard());
        this.modules.set('Settings', new Settings());
        
        console.log('✅ Managers initialisés');
    }

    /**
     * Initialise l'interface utilisateur
     */
    async initUI() {
        console.log('🎨 Initialisation de l\'interface...');
        
        // Initialisation de la navigation
        const navigation = new Navigation();
        await navigation.init();
        
        // Initialisation des composants globaux
        window.Modal = new Modal();
        window.Toast = new Toast();
        
        console.log('✅ Interface initialisée');
    }

    /**
     * Démarre l'application
     */
    async start() {
        console.log('🎯 Démarrage de l\'application...');
        
        // Vérification de l'état d'authentification
        firebaseService.authUtils.onAuthStateChanged((user) => {
            if (user) {
                console.log('👤 Utilisateur connecté:', user.email);
                // Rediriger vers le dashboard si on est sur login
                if (window.location.hash === '#/login') {
                    router.navigate('/dashboard');
                }
            } else {
                console.log('👤 Utilisateur non connecté');
                // Rediriger vers login si pas connecté
                if (!window.location.hash.includes('/login')) {
                    router.navigate('/login');
                }
            }
        });
        
        // Démarrage initial du router
        if (!window.location.hash) {
            router.navigate('/dashboard');
        }
        
        console.log('✅ Application démarrée');
    }

    /**
     * Récupère un module/manager
     * @param {string} name 
     * @returns {Object}
     */
    getModule(name) {
        const module = this.modules.get(name);
        if (!module) {
            throw new Error(`Module '${name}' non trouvé`);
        }
        return module;
    }

    /**
     * Vérifie si l'utilisateur est authentifié
     * @returns {boolean}
     */
    isUserAuthenticated() {
        return firebaseService.authUtils.currentUser() !== null;
    }

    /**
     * Affiche une erreur d'initialisation
     * @param {Error} error 
     */
    showInitError(error) {
        document.body.innerHTML = `
            <div class="init-error">
                <div class="error-container">
                    <h1>❌ Erreur d'initialisation</h1>
                    <p>Une erreur est survenue lors du démarrage de l'application.</p>
                    <details>
                        <summary>Détails de l'erreur</summary>
                        <pre>${error.message}</pre>
                    </details>
                    <button onclick="window.location.reload()" class="btn btn-primary">
                        Recharger la page
                    </button>
                </div>
            </div>
        `;
    }
}

// Initialisation automatique quand le DOM est prêt
document.addEventListener('DOMContentLoaded', async () => {
    window.app = new SynergiaApp();
    await window.app.init();
});
