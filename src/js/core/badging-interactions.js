/* 
 * badging-interactions.js
 * Fonctions d'interaction pour le BadgingManager
 * À ajouter dans la section des interactions de l'index.html
 */

// Variables globales pour les modales de pointage
let pendingBadgeAction = null;
let pendingBadgeNote = '';

// ==================
// FONCTIONS DE POINTAGE
// ==================

function handleCheckIn() {
    pendingBadgeAction = 'checkin';
    openBadgeNoteModal('Pointage d\'arrivée', 'Ajouter une note pour votre arrivée (optionnel)');
}

function handleCheckOut() {
    pendingBadgeAction = 'checkout';
    openBadgeNoteModal('Pointage de sortie', 'Ajouter une note pour votre sortie (optionnel)');
}

function handleBreakStart() {
    pendingBadgeAction = 'breakstart';
    openBadgeNoteModal('Début de pause', 'Motif de la pause (optionnel)');
}

function handleBreakEnd() {
    pendingBadgeAction = 'breakend';
    openBadgeNoteModal('Fin de pause', 'Retour de pause');
}

// ==================
// GESTION DES MODALES
// ==================

function openBadgeNoteModal(title, placeholder = '') {
    const modal = document.getElementById('badgeNoteModal');
    const titleElement = modal.querySelector('.modal-title');
    const noteInput = document.getElementById('badgeNote');
    
    if (titleElement) titleElement.textContent = title;
    if (noteInput) {
        noteInput.value = '';
        noteInput.placeholder = placeholder;
    }
    
    modal.classList.add('show');
    
    // Focus sur le textarea si il existe
    setTimeout(() => {
        if (noteInput) noteInput.focus();
    }, 100);
}

function closeBadgeNoteModal() {
    const modal = document.getElementById('badgeNoteModal');
    modal.classList.remove('show');
    pendingBadgeAction = null;
    pendingBadgeNote = '';
}

async function executeBadgeAction() {
    if (!pendingBadgeAction) return;

    try {
        const note = document.getElementById('badgeNote').value.trim();
        let result;

        // Afficher un indicateur de chargement sur le bouton
        const submitBtn = document.querySelector('#badgeNoteForm button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Enregistrement...';
        submitBtn.disabled = true;

        switch(pendingBadgeAction) {
            case 'checkin':
                result = await badgingManager.checkIn(note);
                break;
            case 'checkout':
                result = await badgingManager.checkOut(note);
                break;
            case 'breakstart':
                result = await badgingManager.startBreak(note);
                break;
            case 'breakend':
                result = await badgingManager.endBreak(note);
                break;
        }

        if (result) {
            closeBadgeNoteModal();
            
            // Afficher message de succès avec notification native si disponible
            const messages = {
                'checkin': 'Arrivée enregistrée avec succès !',
                'checkout': 'Sortie enregistrée avec succès !',
                'breakstart': 'Début de pause enregistré !',
                'breakend': 'Fin de pause enregistrée !'
            };
            
            showNotification(messages[pendingBadgeAction], 'success');
            
            // Démarrer l'horloge si on arrive
            if (pendingBadgeAction === 'checkin' && window.badgingManager) {
                badgingManager.startClock();
            }
        }

        // Restaurer le bouton
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;

    } catch (error) {
        console.error('Erreur lors du pointage:', error);
        showNotification('Erreur: ' + error.message, 'error');
        
        // Restaurer le bouton en cas d'erreur
        const submitBtn = document.querySelector('#badgeNoteForm button[type="submit"]');
        submitBtn.textContent = 'Confirmer';
        submitBtn.disabled = false;
    }
}

// ==================
// FONCTIONS UTILITAIRES
// ==================

function showNotification(message, type = 'info') {
    // Utiliser les notifications natives du navigateur si disponibles
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('SYNERGIA - Pointage', {
            body: message,
            icon: '/favicon.ico'
        });
    }
    
    // Fallback : simple alert
    alert(message);
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// ==================
// FONCTIONS DE GESTION DES HORAIRES
// ==================

function formatTime(date) {
    if (!date) return '--:--';
    return date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function formatDuration(minutes) {
    if (!minutes || minutes <= 0) return '0min';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
        return `${hours}h${mins > 0 ? mins + 'min' : ''}`;
    }
    return `${mins}min`;
}

function calculateWorkingTime(checkIn, checkOut, breakDuration = 0) {
    if (!checkIn || !checkOut) return 0;
    
    const totalMs = checkOut.getTime() - checkIn.getTime();
    const totalMinutes = totalMs / (1000 * 60);
    const workingMinutes = totalMinutes - breakDuration;
    
    return Math.max(0, workingMinutes);
}

// ==================
// EXPORT FUNCTIONS
// ==================

async function exportTimesheets(format = 'csv') {
    try {
        const timesheets = badgingManager.getTimesheets();
        
        if (timesheets.length === 0) {
            alert('Aucune donnée à exporter');
            return;
        }
        
        let content = '';
        let filename = '';
        
        if (format === 'csv') {
            content = generateCSV(timesheets);
            filename = `pointages_${new Date().toISOString().split('T')[0]}.csv`;
        } else if (format === 'json') {
            content = JSON.stringify(timesheets, null, 2);
            filename = `pointages_${new Date().toISOString().split('T')[0]}.json`;
        }
        
        downloadFile(content, filename, format === 'csv' ? 'text/csv' : 'application/json');
        
    } catch (error) {
        console.error('Erreur export:', error);
        alert('Erreur lors de l\'export: ' + error.message);
    }
}

function generateCSV(timesheets) {
    const headers = ['Date', 'Arrivée', 'Sortie', 'Heures', 'Statut', 'Notes'];
    const rows = timesheets.map(ts => [
        ts.date,
        formatTime(ts.checkIn),
        formatTime(ts.checkOut),
        ts.totalHours || 0,
        ts.status || '',
        ts.notes || ''
    ]);
    
    return [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
}

// ==================
// INITIALISATION
// ==================

// Fonction d'initialisation à appeler au chargement
function initBadgingInteractions() {
    console.log('🔧 Initialisation des interactions BadgingManager');
    
    // Demander permission pour les notifications
    requestNotificationPermission();
    
    // Gestionnaire du formulaire de note de pointage
    const badgeNoteForm = document.getElementById('badgeNoteForm');
    if (badgeNoteForm) {
        badgeNoteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await executeBadgeAction();
        });
    }
    
    // Fermer la modale en cliquant à côté
    const badgeNoteModal = document.getElementById('badgeNoteModal');
    if (badgeNoteModal) {
        badgeNoteModal.addEventListener('click', (e) => {
            if (e.target.id === 'badgeNoteModal') {
                closeBadgeNoteModal();
            }
        });
    }
    
    // Raccourcis clavier
    document.addEventListener('keydown', (e) => {
        // Échap pour fermer les modales
        if (e.key === 'Escape') {
            closeBadgeNoteModal();
        }
        
        // Raccourcis pour le pointage (Ctrl + touches)
        if (e.ctrlKey && window.location.hash.includes('/badging')) {
            switch(e.key.toLowerCase()) {
                case 'i': // Ctrl+I pour arrivée (In)
                    e.preventDefault();
                    handleCheckIn();
                    break;
                case 'o': // Ctrl+O pour sortie (Out)
                    e.preventDefault();
                    handleCheckOut();
                    break;
                case 'p': // Ctrl+P pour pause
                    e.preventDefault();
                    const status = badgingManager?.getCurrentStatus();
                    if (status === 'working') {
                        handleBreakStart();
                    } else if (status === 'on-break') {
                        handleBreakEnd();
                    }
                    break;
            }
        }
    });
    
    console.log('✅ Interactions BadgingManager initialisées');
}

// Auto-initialisation quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBadgingInteractions);
} else {
    initBadgingInteractions();
}