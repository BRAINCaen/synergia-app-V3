// src/js/core/App.js
// Classe principale de l'application SYNERGIA v3.0

import { FirebaseManager } from './FirebaseManager.js';
import { AuthManager } from '../managers/AuthManager.js';
import { Router } from './Router.js';
import { EventBus } from './EventBus.js';
import { Logger } from '../utils/Logger.js';

// Managers
import { TeamManager } from '../managers/TeamManager.js';
import { BadgingManager } from '../managers/BadgingManager.js';
import { ChatManager } from '../managers/ChatManager.js';
import { PlanningManager } from '../managers/PlanningManager.js';
import { QuestManager } from '../managers/QuestManager.js';
import { NotificationManager } from '../managers/NotificationManager.js';
import { StoreManager } from '../managers/StoreManager.js';

// Components
import { NavigationComponent } from '../components/NavigationComponent.js';
import { ModalManager } from '../components/ModalManager.js';
import { ToastManager } from '../components/ToastManager.js';

export class App {
    constructor(config) {
        this.config = config;
        this.logger = new Logger('App', config.debug);
        this.initialized = false;
        this.currentUser = null;
        
        // Core systems
        this.eventBus = new EventBus();
        this.firebase = null;
        this.auth = null;
        this.router = null;
        
        // Managers
        this.managers = {};
        
        // Components
        this.components = {};
        
        // State
        this.state = {
            isAuthenticated: false,
            currentRoute: null,
            theme: 'dark',
            sidebarCollapsed: false,
            notifications: [],
            connectionStatus: 'disconnected'
        };
        
        this.logger.info('App instance créée');
    }
    
    /**
     * Initialisation de l'application
     */
    async init() {
        try {
            this.logger.info('Initialisation de l\'application...');
            
            // 1. Initialiser Firebase
            await this.initFirebase();
            
            // 2. Initialiser l'authentification
            await this.initAuth();
            
            // 3. Initialiser le routeur
            this.initRouter();
            
            // 4. Initialiser les composants UI
            this.initComponents();
            
            // 5. Initialiser les managers (après auth)
            this.initManagers();
            
            // 6. Setup event listeners
            this.setupEventListeners();
            
            // 7. Démarrer l'application
            await this.start();
            
            this.initialized = true;
            this.logger.info('✅ Application initialisée avec succès');
            
        } catch (error) {
            this.logger.error('❌ Erreur lors de l\'initialisation:', error);
            throw error;
        }
    }
    
    /**
     * Initialisation Firebase
     */
    async initFirebase() {
        this.logger.info('Initialisation Firebase...');
        
        this.firebase = new FirebaseManager(this.config.firebase);
        await this.firebase.init();
        
        // Exposer pour les managers
        window.firebase = this.firebase.getFirebaseInstance();
        window.db = this.firebase.getFirestore();
        window.auth = this.firebase.getAuth();
        window.storage = this.firebase.getStorage();
        
        this.logger.info('✅ Firebase initialisé');
    }
    
    /**
     * Initialisation de l'authentification
     */
    async initAuth() {
        this.logger.info('Initialisation authentification...');
        
        this.auth = new AuthManager(this.firebase, this.eventBus);
        await this.auth.init();
        
        // Écouter les changements d'authentification
        this.eventBus.on('auth:login', (user) => {
            this.handleUserLogin(user);
        });
        
        this.eventBus.on('auth:logout', () => {
            this.handleUserLogout();
        });
        
        this.logger.info('✅ Authentification initialisée');
    }
    
    /**
     * Initialisation du routeur
     */
    initRouter() {
        this.logger.info('Initialisation du routeur...');
        
        this.router = new Router({
            defaultRoute: 'dashboard',
            authRequired: true,
            onRouteChange: (route) => this.handleRouteChange(route)
        });
        
        // Définir les routes
        this.router.addRoute('login', () => import('../views/AuthView.js'));
        this.router.addRoute('dashboard', () => import('../views/DashboardView.js'));
        this.router.addRoute('team', () => import('../views/TeamView.js'));
        this.router.addRoute('badging', () => import('../views/BadgingView.js'));
        this.router.addRoute('chat', () => import('../views/ChatView.js'));
        this.router.addRoute('planning', () => import('../views/PlanningView.js'));
        this.router.addRoute('quests', () => import('../views/QuestsView.js'));
        this.router.addRoute('store', () => import('../views/StoreView.js'));
        this.router.addRoute('wallet', () => import('../views/WalletView.js'));
        this.router.addRoute('settings', () => import('../views/SettingsView.js'));
        
        this.logger.info('✅ Routeur initialisé');
    }
    
    /**
     * Initialisation des composants UI
     */
    initComponents() {
        this.logger.info('Initialisation des composants...');
        
        // Navigation
        this.components.navigation = new NavigationComponent(this.eventBus);
        
        // Gestionnaire de modales
        this.components.modal = new ModalManager();
        
        // Gestionnaire de notifications toast
        this.components.toast = new ToastManager();
        
        // Exposer globalement pour faciliter l'usage
        window.showModal = (id, options) => this.components.modal.show(id, options);
        window.closeModal = (id) => this.components.modal.hide(id);
        window.showToast = (message, type, options) => this.components.toast.show(message, type, options);
        
        this.logger.info('✅ Composants initialisés');
    }
    
    /**
     * Initialisation des managers
     */
    initManagers() {
        this.logger.info('Initialisation des managers...');
        
        // Attendre l'authentification pour initialiser les managers
        this.eventBus.on('auth:ready', async () => {
            try {
                // Initialiser tous les managers
                this.managers.team = new TeamManager(this.firebase, this.eventBus);
                this.managers.badging = new BadgingManager(this.firebase, this.eventBus);
                this.managers.chat = new ChatManager(this.firebase, this.eventBus);
                this.managers.planning = new PlanningManager(this.firebase, this.eventBus);
                this.managers.quest = new QuestManager(this.firebase, this.eventBus);
                this.managers.notification = new NotificationManager(this.firebase, this.eventBus);
                this.managers.store = new StoreManager(this.firebase, this.eventBus);
                
                // Initialiser tous les managers
                await Promise.all(
                    Object.values(this.managers).map(manager => manager.init())
                );
                
                // Exposer globalement pour debug et intégration
                Object.entries(this.managers).forEach(([name, manager]) => {
                    window[`${name}Manager`] = manager;
                });
                
                this.logger.info('✅ Tous les managers initialisés');
                this.eventBus.emit('app:managers-ready');
                
            } catch (error) {
                this.logger.error('❌ Erreur initialisation managers:', error);
            }
        });
    }
    
    /**
     * Configuration des événements globaux
     */
    setupEventListeners() {
        // Changements de connexion
        window.addEventListener('online', () => {
            this.updateConnectionStatus('online');
        });
        
        window.addEventListener('offline', () => {
            this.updateConnectionStatus('offline');
        });
        
        // Changements de taille d'écran
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Raccourcis clavier
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
        
        // Gestion des erreurs de chargement d'images
        document.addEventListener('error', (e) => {
            if (e.target.tagName === 'IMG') {
                e.target.src = '/assets/images/placeholder.png';
            }
        }, true);
        
        // Événements de l'app
        this.eventBus.on('app:theme-change', (theme) => {
            this.changeTheme(theme);
        });
        
        this.eventBus.on('app:sidebar-toggle', () => {
            this.toggleSidebar();
        });
    }
    
    /**
     * Démarrage de l'application
     */
    async start() {
        this.logger.info('Démarrage de l\'application...');
        
        // Vérifier l'état de l'authentification
        const user = this.auth.getCurrentUser();
        if (user) {
            await this.handleUserLogin(user);
        } else {
            this.router.navigate('login');
        }
        
        // Démarrer le routeur
        this.router.start();
        
        // Initialiser l'interface
        this.components.navigation.render();
        
        // Analytics de démarrage
        this.trackAppStart();
        
        this.logger.info('✅ Application démarrée');
    }
    
    /**
     * Gestion de la connexion utilisateur
     */
    async handleUserLogin(user) {
        this.logger.info(`Connexion utilisateur: ${user.email}`);
        
        this.currentUser = user;
        this.state.isAuthenticated = true;
        
        // Émettre événement pour les managers
        this.eventBus.emit('auth:ready', user);
        
        // Rediriger vers le dashboard si on est sur login
        if (this.router.getCurrentRoute() === 'login') {
            this.router.navigate('dashboard');
        }
        
        // Initialiser les données utilisateur
        await this.loadUserData();
        
        // Démarrer les services temps réel
        this.startRealtimeServices();
    }
    
    /**
     * Gestion de la déconnexion utilisateur
     */
    handleUserLogout() {
        this.logger.info('Déconnexion utilisateur');
        
        this.currentUser = null;
        this.state.isAuthenticated = false;
        
        // Nettoyer les données
        this.cleanup();
        
        // Rediriger vers login
        this.router.navigate('login');
    }
    
    /**
     * Chargement des données utilisateur
     */
    async loadUserData() {
        try {
            // Charger le profil utilisateur
            const userData = await this.firebase.getUserData(this.currentUser.uid);
            
            if (userData) {
                this.currentUser.profile = userData;
                this.eventBus.emit('user:profile-loaded', userData);
            }
            
        } catch (error) {
            this.logger.error('Erreur chargement données utilisateur:', error);
        }
    }
    
    /**
     * Démarrage des services temps réel
     */
    startRealtimeServices() {
        this.logger.info('Démarrage des services temps réel...');
        
        // Démarrer les listeners Firebase pour chaque manager
        Object.values(this.managers).forEach(manager => {
            if (manager.startRealtimeListeners) {
                manager.startRealtimeListeners();
            }
        });
    }
    
    /**
     * Gestion des changements de route
     */
    async handleRouteChange(route) {
        this.logger.info(`Changement de route: ${route.name}`);
        
        this.state.currentRoute = route;
        
        // Vérifier l'authentification si nécessaire
        if (route.authRequired && !this.state.isAuthenticated) {
            this.router.navigate('login');
            return;
        }
        
        // Mettre à jour la navigation
        this.components.navigation.setActiveRoute(route.name);
        
        // Charger et afficher la vue
        try {
            const viewModule = await route.component();
            const ViewClass = viewModule.default || viewModule;
            
            const view = new ViewClass({
                firebase: this.firebase,
                eventBus: this.eventBus,
                managers: this.managers
            });
            
            // Rendre la vue
            const container = document.getElementById('view-container');
            if (container) {
                container.innerHTML = '';
                await view.render(container);
            }
            
            // Analytics
            this.trackPageView(route.name);
            
        } catch (error) {
            this.logger.error(`Erreur chargement vue ${route.name}:`, error);
            this.components.toast.show('Erreur de chargement de la page', 'error');
        }
    }
    
    /**
     * Raccourcis clavier
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + K : Recherche globale
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.eventBus.emit('app:show-search');
        }
        
        // Échapper : Fermer modales/sidebar
        if (e.key === 'Escape') {
            this.components.modal.hideAll();
            this.eventBus.emit('app:close-overlays');
        }
        
        // Ctrl/Cmd + B : Toggle sidebar
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            this.toggleSidebar();
        }
    }
    
    /**
     * Gestion du redimensionnement
     */
    handleResize() {
        const width = window.innerWidth;
        
        // Auto-collapse sidebar sur mobile
        if (width < 768 && !this.state.sidebarCollapsed) {
            this.toggleSidebar();
        }
        
        // Émettre événement pour les composants
        this.eventBus.emit('app:resize', { width, height: window.innerHeight });
    }
    
    /**
     * Changement de thème
     */
    changeTheme(theme) {
        this.state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('synergia-theme', theme);
        
        this.eventBus.emit('theme:changed', theme);
    }
    
    /**
     * Toggle sidebar
     */
    toggleSidebar() {
        this.state.sidebarCollapsed = !this.state.sidebarCollapsed;
        
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.classList.toggle('nav-collapsed', this.state.sidebarCollapsed);
        }
        
        localStorage.setItem('synergia-sidebar-collapsed', this.state.sidebarCollapsed);
        this.eventBus.emit('sidebar:toggled', this.state.sidebarCollapsed);
    }
    
    /**
     * Mise à jour du statut de connexion
     */
    updateConnectionStatus(status) {
        this.state.connectionStatus = status;
        this.eventBus.emit('connection:status-changed', status);
        
        if (status === 'online') {
            this.components.toast.show('Connexion rétablie', 'success');
        } else {
            this.components.toast.show('Connexion perdue - Mode hors ligne', 'warning');
        }
    }
    
    /**
     * Analytics
     */
    trackAppStart() {
        if (this.firebase.analytics) {
            this.firebase.analytics.logEvent('app_start', {
                version: this.config.version,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    trackPageView(pageName) {
        if (this.firebase.analytics) {
            this.firebase.analytics.logEvent('page_view', {
                page_title: pageName,
                page_location: window.location.href
            });
        }
    }
    
    /**
     * Nettoyage
     */
    cleanup() {
        this.logger.info('Nettoyage de l\'application...');
        
        // Arrêter les services temps réel
        Object.values(this.managers).forEach(manager => {
            if (manager.cleanup) {
                manager.cleanup();
            }
        });
        
        // Nettoyer les composants
        Object.values(this.components).forEach(component => {
            if (component.cleanup) {
                component.cleanup();
            }
        });
        
        // Nettoyer les listeners
        this.eventBus.removeAllListeners();
    }
    
    /**
     * API publique
     */
    
    getState() {
        return { ...this.state };
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    getManager(name) {
        return this.managers[name];
    }
    
    getComponent(name) {
        return this.components[name];
    }
    
    isInitialized() {
        return this.initialized;
    }
    
    navigate(route, params = {}) {
        this.router.navigate(route, params);
    }
    
    showModal(id, options = {}) {
        return this.components.modal.show(id, options);
    }
    
    showToast(message, type = 'info', options = {}) {
        return this.components.toast.show(message, type, options);
    }
    
    emit(event, data) {
        this.eventBus.emit(event, data);
    }
    
    on(event, callback) {
        this.eventBus.on(event, callback);
    }
}