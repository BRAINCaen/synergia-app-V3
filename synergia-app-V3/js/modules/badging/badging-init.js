// js/modules/badging/badging-init.js
// Initialisation et configuration du système de badgeage

document.addEventListener('DOMContentLoaded', () => {
    // Attendre que tous les managers soient chargés
    const initBadgingSystem = () => {
        if (window.badgingManager && window.uiManager && window.dataManager) {
            console.log('🚀 Initialisation du système de badgeage...');
            
            // Configuration des événements spécifiques au badging
            setupBadgingEvents();
            
            // Initialisation de l'interface
            initBadgingInterface();
            
            // Test de fonctionnement
            testBadgingSystem();
            
            console.log('✅ Système de badgeage prêt');
        } else {
            // Réessayer dans 100ms
            setTimeout(initBadgingSystem, 100);
        }
    };
    
    initBadgingSystem();
});

function setupBadgingEvents() {
    // Événements personnalisés pour le badging
    document.addEventListener('badging:status-change', (e) => {
        const { status, previousStatus } = e.detail;
        console.log(`Changement de statut: ${previousStatus} → ${status}`);
        
        // Mettre à jour l'interface
        updateBadgingInterface(status);
        
        // Analytics
        if (window.firebaseManager) {
            window.firebaseManager.logEvent('badging_status_change', {
                new_status: status,
                previous_status: previousStatus,
                timestamp: Date.now()
            });
        }
    });
    
    // Événement de synchronisation
    document.addEventListener('badging:sync-complete', (e) => {
        const { recordsCount } = e.detail;
        console.log(`✅ Synchronisation badging terminée (${recordsCount} enregistrements)`);
        
        if (window.uiManager) {
            window.uiManager.showToast('Données synchronisées', 'success');
        }
    });
    
    // Événement d'erreur
    document.addEventListener('badging:error', (e) => {
        const { error, context } = e.detail;
        console.error('❌ Erreur badging:', error, context);
        
        if (window.uiManager) {
            window.uiManager.showToast('Erreur système de pointage', 'error');
        }
    });
}

function initBadgingInterface() {
    // Initialiser les éléments de l'interface
    initQuickActions();
    initStatusIndicators();
    initProgressBars();
    initTooltips();
}

function initQuickActions() {
    // Ajouter des actions rapides dans le dashboard
    const quickActionsContainer = document.querySelector('.action-grid');
    if (quickActionsContainer) {
        // Vérifier si l'action badging existe déjà
        const existingBadgeAction = quickActionsContainer.querySelector('[data-action="badge-in"]');
        if (!existingBadgeAction) {
            const badgeAction = document.createElement('button');
            badgeAction.className = 'action-btn';
            badgeAction.setAttribute('data-action', 'badge-in');
            badgeAction.innerHTML = `
                <i class="fas fa-sign-in-alt"></i>
                <span>Pointer</span>
            `;
            quickActionsContainer.appendChild(badgeAction);
        }
    }
}

function initStatusIndicators() {
    // Ajouter des indicateurs de statut dans la navigation
    const navItems = document.querySelectorAll('[data-page="badging"]');
    navItems.forEach(navItem => {
        if (!navItem.querySelector('.status-indicator')) {
            const indicator = document.createElement('span');
            indicator.className = 'status-indicator';
            indicator.id = 'nav-badging-status';
            navItem.appendChild(indicator);
        }
    });
}

function initProgressBars() {
    // Initialiser les barres de progression
    const progressBars = document.querySelectorAll('.progress-fill');
    progressBars.forEach(bar => {
        // Animation d'entrée
        bar.style.transition = 'width 1s ease-in-out';
    });
}

function initTooltips() {
    // Ajouter des tooltips aux éléments de badging
    const tooltipElements = [
        { selector: '#btn-clock-in', text: 'Enregistrer votre arrivée au travail' },
        { selector: '#btn-clock-out', text: 'Enregistrer votre départ du travail' },
        { selector: '#btn-break-start', text: 'Commencer une pause' },
        { selector: '#btn-break-end', text: 'Reprendre le travail après la pause' }
    ];
    
    tooltipElements.forEach(({ selector, text }) => {
        const element = document.querySelector(selector);
        if (element) {
            element.setAttribute('title', text);
            element.setAttribute('aria-label', text);
        }
    });
}

function updateBadgingInterface(status) {
    // Mettre à jour l'indicateur de navigation
    const navIndicator = document.getElementById('nav-badging-status');
    if (navIndicator) {
        navIndicator.className = 'status-indicator';
        
        switch (status) {
            case 'in':
                navIndicator.classList.add('active');
                navIndicator.textContent = '●';
                break;
            case 'break':
                navIndicator.classList.add('break');
                navIndicator.textContent = '⏸';
                break;
            case 'out':
            default:
                navIndicator.classList.add('inactive');
                navIndicator.textContent = '';
                break;
        }
    }
    
    // Mettre à jour le titre de la page si on est sur badging
    if (document.querySelector('#page-badging.active')) {
        updatePageTitle(status);
    }
}

function updatePageTitle(status) {
    const statusTexts = {
        'in': 'En service',
        'break': 'En pause',
        'out': 'Non pointé'
    };
    
    document.title = `SYNERGIA - Pointage (${statusTexts[status] || 'Statut inconnu'})`;
}

function testBadgingSystem() {
    // Tests de fonctionnement (mode développement)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('🧪 Tests du système de badgeage...');
        
        // Test 1: Vérifier la présence des éléments
        const requiredElements = [
            '#status-card',
            '#btn-clock-in',
            '#btn-clock-out',
            '#btn-break-start',
            '#btn-break-end',
            '#badging-history-list',
            '#clock'
        ];
        
        const missingElements = requiredElements.filter(selector => !document.querySelector(selector));
        
        if (missingElements.length > 0) {
            console.warn('⚠️ Éléments manquants:', missingElements);
        } else {
            console.log('✅ Tous les éléments sont présents');
        }
        
        // Test 2: Vérifier les managers
        const managers = ['badgingManager', 'uiManager', 'dataManager', 'firebaseManager'];
        const missingManagers = managers.filter(manager => !window[manager]);
        
        if (missingManagers.length > 0) {
            console.warn('⚠️ Managers manquants:', missingManagers);
        } else {
            console.log('✅ Tous les managers sont disponibles');
        }
        
        // Test 3: Vérifier les événements
        setTimeout(() => {
            const testButton = document.getElementById('btn-clock-in');
            if (testButton && !testButton.classList.contains('hidden')) {
                console.log('✅ Interface de pointage prête');
            } else {
                console.log('ℹ️ Interface en attente d\'authentification');
            }
        }, 1000);
    }
}

// Fonctions utilitaires pour le badging
window.BadgingUtils = {
    // Formater la durée en heures et minutes
    formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours}h${mins.toString().padStart(2, '0')}`;
    },
    
    // Calculer le pourcentage de progression
    calculateProgress(current, target) {
        if (!target || target === 0) return 0;
        return Math.min(100, Math.max(0, (current / target) * 100));
    },
    
    // Obtenir la couleur selon le statut
    getStatusColor(status) {
        const colors = {
            'in': '#28a745',      // Vert
            'break': '#ffc107',   // Jaune
            'out': '#6c757d'      // Gris
        };
        return colors[status] || colors.out;
    },
    
    // Vérifier si c'est un jour ouvrable
    isWorkingDay(date = new Date()) {
        const day = date.getDay();
        return day >= 1 && day <= 5; // Lundi à Vendredi
    },
    
    // Obtenir les heures de travail standard
    getStandardWorkHours() {
        return {
            daily: 8 * 60,    // 8 heures en minutes
            weekly: 35 * 60,  // 35 heures en minutes
            monthly: 152 * 60 // ~22 jours * 7h en minutes
        };
    }
};

// Exposer les fonctions pour debug
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.BadgingDebug = {
        testBadgingSystem,
        updateBadgingInterface,
        initBadgingInterface
    };
}