/* ===== SYNERGIA APP - POINT D'ENTRÉE PRINCIPAL ===== */

// Configuration globale
window.SYNERGIA_CONFIG = {
    version: '2.0.0',
    debug: true,
    autoSave: true,
    saveInterval: 30000
};

// Initialisation de l'application
class SynergiaApp {
    constructor() {
        this.modules = {};
        this.initialized = false;
    }

    // Enregistrer un module
    registerModule(name, module) {
        this.modules[name] = module;
        console.log(`📦 Module ${name} enregistré`);
    }

    // Initialiser l'application
    async init() {
        if (this.initialized) return;

        console.log('🚀 Initialisation Synergia v' + window.SYNERGIA_CONFIG.version);

        try {
            // Initialiser les modules core
            await this.initCoreModules();
            
            // Initialiser les features
            await this.initFeatureModules();
            
            // Initialiser l'UI
            await this.initUI();
            
            this.initialized = true;
            console.log('✅ Synergia initialisé avec succès');
            
            // Notification de succès
            if (typeof showNotification === 'function') {
                showNotification('✨ Application initialisée !', 'success');
            }
            
        } catch (error) {
            console.error('❌ Erreur initialisation:', error);
            if (typeof showNotification === 'function') {
                showNotification('❌ Erreur lors de l\'initialisation', 'error');
            }
        }
    }

    // Initialiser les modules core
    async initCoreModules() {
        // Data Manager
        if (window.SynergiaDataManager) {
            this.registerModule('dataManager', new SynergiaDataManager());
            if (this.modules.dataManager.init) {
                await this.modules.dataManager.init();
            }
        }

        // UI Manager
        if (window.SynergiaUIManager) {
            this.registerModule('uiManager', new SynergiaUIManager());
            if (this.modules.uiManager.init) {
                this.modules.uiManager.init();
            }
        }
    }

    // Initialiser les modules features
    async initFeatureModules() {
        // Quests
        if (window.SynergiaQuests) {
            this.registerModule('quests', new SynergiaQuests());
        }

        // Quest UI
        if (window.SynergiaQuestUI) {
            this.registerModule('questUI', new SynergiaQuestUI());
        }

        // Auth
        if (window.SynergiaAuth) {
            this.registerModule('auth', new SynergiaAuth());
        }

        // Team
        if (window.SynergiaTeam) {
            this.registerModule('team', new SynergiaTeam());
        }

        // Admin
        if (window.SynergiaAdmin) {
            this.registerModule('admin', new SynergiaAdmin());
        }
    }

    // Initialiser l'UI
    async initUI() {
        if (this.modules.uiManager) {
            if (this.modules.uiManager.setupHeader) {
                this.modules.uiManager.setupHeader();
            }
            if (this.modules.uiManager.setupNavigation) {
                this.modules.uiManager.setupNavigation();
            }
            if (this.modules.uiManager.cleanupInterface) {
                this.modules.uiManager.cleanupInterface();
            }
        }
    }

    // Obtenir un module
    getModule(name) {
        return this.modules[name];
    }
}

// Instance globale
window.synergiaApp = new SynergiaApp();

// Auto-initialisation
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        if (window.synergiaApp && window.synergiaApp.init) {
            window.synergiaApp.init();
        }
    }, 1000);
});
