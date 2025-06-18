/* ===== SYNERGIA UI MANAGER ===== */

class SynergiaUIManager {
    constructor() {
        this.elements = {};
        this.initialized = false;
    }

    // Initialiser
    init() {
        this.cacheElements();
        this.setupEventListeners();
        this.initialized = true;
        console.log('🎨 UI Manager initialisé');
    }

    // Mettre en cache les éléments DOM
    cacheElements() {
        this.elements = {
            header: document.querySelector('header'),
            nav: document.querySelector('nav'),
            main: document.querySelector('main'),
            userInfo: document.querySelector('.user-info')
        };
    }

    // Configurer les event listeners
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleNavigation(e.target.closest('.nav-btn'));
            });
        });

        // Responsive
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    // Configurer le header
    setupHeader() {
        if (!this.elements.header || !this.elements.userInfo) return;

        // Supprimer ancien header actions
        const existingActions = this.elements.header.querySelector('.header-actions');
        if (existingActions) {
            existingActions.remove();
        }

        // Créer nouveau header actions
        const actionsContainer = this.createHeaderActions();
        this.elements.userInfo.parentNode.insertBefore(
            actionsContainer, 
            this.elements.userInfo.nextSibling
        );

        console.log('✅ Header configuré');
    }

    // Créer les actions du header
    createHeaderActions() {
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'header-actions';
        
        // Bouton admin
        const adminBtn = this.createAdminButton();
        actionsContainer.appendChild(adminBtn);

        return actionsContainer;
    }

    // Créer le bouton admin
    createAdminButton() {
        const adminBtn = document.createElement('button');
        adminBtn.className = 'admin-btn-header';
        adminBtn.innerHTML = '<i class="fas fa-cog"></i><span class="admin-badge">!</span>';
        adminBtn.title = 'Administration';
        
        adminBtn.addEventListener('click', () => {
            this.handleAdminClick();
        });

        return adminBtn;
    }

    // Gérer clic admin
    handleAdminClick() {
        const adminModule = window.synergiaApp?.getModule('admin');
        if (adminModule) {
            adminModule.openModal();
        } else if (typeof openAdminModal === 'function') {
            openAdminModal();
        } else {
            showNotification('⚙️ Panel admin en développement', 'info');
        }
    }

    // Configurer la navigation
    setupNavigation() {
        // Activer l'onglet par défaut
        const activeTab = document.querySelector('.nav-btn.active');
        if (!activeTab) {
            const firstTab = document.querySelector('.nav-btn');
            if (firstTab) {
                firstTab.classList.add('active');
            }
        }

        console.log('✅ Navigation configurée');
    }

    // Gérer la navigation
    handleNavigation(btn) {
        if (!btn) return;

        // Désactiver tous les onglets
        document.querySelectorAll('.nav-btn').forEach(navBtn => {
            navBtn.classList.remove('active');
        });

        // Activer l'onglet cliqué
        btn.classList.add('active');

        // Émettre événement de navigation
        const event = new CustomEvent('synergia:navigation', {
            detail: { tab: btn.dataset.tab || btn.textContent.trim() }
        });
        document.dispatchEvent(event);
    }

    // Nettoyer l'interface
    cleanupInterface() {
        // Supprimer les éléments dupliqués
        this.removeDuplicateElements('.welcome-card');
        this.removeDuplicateElements('.admin-fab');
        
        // Nettoyer les textes
        this.cleanupTexts();

        console.log('✅ Interface nettoyée');
    }

    // Supprimer les éléments dupliqués
    removeDuplicateElements(selector) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 1) {
            for (let i = 1; i < elements.length; i++) {
                elements[i].remove();
            }
        }
    }

    // Nettoyer les textes
    cleanupTexts() {
        document.querySelectorAll('h1, h2, .page-title').forEach(element => {
            if (element.textContent.includes('Bienvenue Boss')) {
                element.textContent = element.textContent.replace('Bienvenue Boss', '').trim();
                if (element.textContent === '' || element.textContent === '!') {
                    element.remove();
                }
            }
        });
    }

    // Gérer le redimensionnement
    handleResize() {
        // Adaptations responsive si nécessaire
        const isMobile = window.innerWidth <= 768;
        document.body.classList.toggle('mobile', isMobile);
    }

    // Mettre à jour l'UI
    updateUI() {
        if (this.initialized) {
            // Déléguer aux modules appropriés
            const dataManager = window.synergiaApp?.getModule('dataManager');
            if (dataManager) {
                dataManager.updateUI();
            }
        }
    }
}

// Export global
window.SynergiaUIManager = SynergiaUIManager;

