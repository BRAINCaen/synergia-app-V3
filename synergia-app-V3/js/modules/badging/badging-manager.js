// js/modules/badging/badging-manager.js
// Gestionnaire de pointage pour SYNERGIA v3.0

class BadgingManager {
    constructor() {
        this.currentStatus = 'out'; // out, in, break
        this.todayRecords = [];
        this.shifts = [];
        this.breakTypes = ['lunch', 'short', 'personal', 'meeting'];
        this.isLoading = false;
        this.clockInterval = null;
        this.currentUser = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.startClock();
        
        // Attendre Firebase et auth
        document.addEventListener('firebase:ready', () => {
            this.setupFirebaseListeners();
        });
        
        document.addEventListener('auth:login', (e) => {
            this.currentUser = e.detail.user;
            this.loadBadgingData();
        });
        
        console.log('✅ Badging Manager initialisé');
    }
    
    setupEventListeners() {
        // Boutons de pointage
        document.addEventListener('click', (e) => {
            if (e.target.matches('#btn-clock-in')) {
                this.clockIn();
            }
            
            if (e.target.matches('#btn-clock-out')) {
                this.clockOut();
            }
            
            if (e.target.matches('#btn-break-start')) {
                this.startBreak();
            }
            
            if (e.target.matches('#btn-break-end')) {
                this.endBreak();
            }
        });
        
        // Navigation vers la page badging
        document.addEventListener('page:change', (e) => {
            if (e.detail.page === 'badging') {
                this.refreshBadgingData();
            }
        });
    }
    
    setupFirebaseListeners() {
        if (!window.firebaseManager) return;
        
        // Écouter les enregistrements de pointage
        // TODO: Implémenter listeners temps réel
    }
    
    async loadBadgingData() {
        if (!this.currentUser || this.isLoading) return;
        
        this.isLoading = true;
        
        try {
            await Promise.all([
                this.loadTodayRecords(),
                this.loadTodayShift(),
                this.updateCurrentStatus()
            ]);
            
            this.renderBadgingUI();
            
        } catch (error) {
            console.error('❌ Erreur chargement données pointage:', error);
            window.uiManager?.showToast('Erreur lors du chargement des données', 'error');
        } finally {
            this.isLoading = false;
        }
    }
    
    async loadTodayRecords() {
        try {
            const today = new Date().toDateString();
            
            if (window.firebaseManager) {
                const records = await window.firebaseManager.getCollection('badging');
                this.todayRecords = records.filter(record => 
                    record.userId === this.currentUser.uid &&
                    new Date(record.timestamp.toDate()).toDateString() === today
                ).sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate());
            } else {
                // Fallback localStorage
                const saved = localStorage.getItem(`badging_${this.currentUser.uid}_${today}`);
                this.todayRecords = saved ? JSON.parse(saved) : [];
            }
            
        } catch (error) {
            console.error('❌ Erreur chargement enregistrements:', error);
            this.todayRecords = [];
        }
    }
    
    async loadTodayShift() {
        try {
            const today = new Date().toDateString();
            
            if (window.firebaseManager) {
                const shifts = await window.firebaseManager.getCollection('shifts');
                const todayShift = shifts.find(shift => 
                    shift.userId === this.currentUser.uid &&
                    new Date(shift.date).toDateString() === today
                );
                
                this.todayShift = todayShift;
            } else {
                // Pas de shift programmé en mode hors ligne
                this.todayShift = null;
            }
            
        } catch (error) {
            console.error('❌ Erreur chargement shift:', error);
            this.todayShift = null;
        }
    }
    
    updateCurrentStatus() {
        if (this.todayRecords.length === 0) {
            this.currentStatus = 'out';
            return;
        }
        
        const lastRecord = this.todayRecords[this.todayRecords.length - 1];
        
        switch (lastRecord.type) {
            case 'clock_in':
                this.currentStatus = 'in';
                break;
            case 'clock_out':
                this.currentStatus = 'out';
                break;
            case 'break_start':
                this.currentStatus = 'break';
                break;
            case 'break_end':
                this.currentStatus = 'in';
                break;
            default:
                this.currentStatus = 'out';
        }
    }
    
    async clockIn() {
        try {
            const record = await this.createBadgingRecord('clock_in');
            if (record) {
                this.currentStatus = 'in';
                this.todayRecords.push(record);
                this.renderBadgingUI();
                this.playNotificationSound();
                window.uiManager?.showToast('Pointage d\'arrivée enregistré', 'success');
                
                // Analytics
                this.logBadgingEvent('clock_in');
            }
        } catch (error) {
            console.error('❌ Erreur pointage arrivée:', error);
            window.uiManager?.showToast('Erreur lors du pointage', 'error');
        }
    }
    
    async clockOut() {
        if (this.currentStatus === 'break') {
            window.uiManager?.showToast('Vous devez terminer votre pause avant de pointer la sortie', 'warning');
            return;
        }
        
        try {
            const record = await this.createBadgingRecord('clock_out');
            if (record) {
                this.currentStatus = 'out';
                this.todayRecords.push(record);
                this.renderBadgingUI();
                this.playNotificationSound();
                window.uiManager?.showToast('Pointage de départ enregistré', 'success');
                
                // Calculer le temps travaillé
                const timeWorked = this.calculateTimeWorked();
                if (timeWorked > 0) {
                    window.uiManager?.showToast(`Temps travaillé: ${this.formatDuration(timeWorked)}`, 'info');
                }
                
                // Analytics
                this.logBadgingEvent('clock_out', { time_worked: timeWorked });
            }
        } catch (error) {
            console.error('❌ Erreur pointage départ:', error);
            window.uiManager?.showToast('Erreur lors du pointage', 'error');
        }
    }
    
    async startBreak(breakType = 'short') {
        if (this.currentStatus !== 'in') {
            window.uiManager?.showToast('Vous devez d\'abord pointer votre arrivée', 'warning');
            return;
        }
        
        try {
            const record = await this.createBadgingRecord('break_start', { breakType });
            if (record) {
                this.currentStatus = 'break';
                this.todayRecords.push(record);
                this.renderBadgingUI();
                this.playNotificationSound();
                window.uiManager?.showToast('Pause commencée', 'info');
                
                // Analytics
                this.logBadgingEvent('break_start', { break_type: breakType });
            }
        } catch (error) {
            console.error('❌ Erreur début pause:', error);
            window.uiManager?.showToast('Erreur lors du début de pause', 'error');
        }
    }
    
    async endBreak() {
        if (this.currentStatus !== 'break') {
            window.uiManager?.showToast('Aucune pause en cours', 'warning');
            return;
        }
        
        try {
            const record = await this.createBadgingRecord('break_end');
            if (record) {
                this.currentStatus = 'in';
                this.todayRecords.push(record);
                this.renderBadgingUI();
                this.playNotificationSound();
                
                // Calculer la durée de la pause
                const breakDuration = this.calculateLastBreakDuration();
                window.uiManager?.showToast(`Pause terminée (${this.formatDuration(breakDuration)})`, 'success');
                
                // Analytics
                this.logBadgingEvent('break_end', { break_duration: breakDuration });
            }
        } catch (error) {
            console.error('❌ Erreur fin pause:', error);
            window.uiManager?.showToast('Erreur lors de la fin de pause', 'error');
        }
    }
    
    async createBadgingRecord(type, metadata = {}) {
        if (!this.currentUser) return null;
        
        const record = {
            userId: this.currentUser.uid,
            userName: this.currentUser.displayName || this.currentUser.email,
            type,
            timestamp: firebase.firestore.Timestamp.now(),
            location: await this.getCurrentLocation(),
            metadata,
            validated: false
        };
        
        try {
            if (window.firebaseManager) {
                const recordId = await window.firebaseManager.addDocument('badging', record);
                return { id: recordId, ...record };
            } else {
                // Fallback localStorage
                const recordWithId = { id: this.generateId(), ...record };
                this.saveTodayRecordsToLocal();
                return recordWithId;
            }
        } catch (error) {
            console.error('❌ Erreur création enregistrement:', error);
            throw error;
        }
    }
    
    async getCurrentLocation() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve(null);
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => {
                    console.warn('Géolocalisation échouée:', error);
                    resolve(null);
                },
                { timeout: 5000, enableHighAccuracy: false }
            );
        });
    }
    
    renderBadgingUI() {
        this.updateStatusCard();
        this.updateActionButtons();
        this.renderTodayShiftInfo();
        this.renderBadgingHistory();
        this.updateBadgingStats();
    }
    
    updateStatusCard() {
        const statusCard = document.getElementById('status-card');
        const statusText = document.getElementById('status-text');
        
        if (!statusCard || !statusText) return;
        
        // Nettoyer les classes
        statusCard.className = 'status-card';
        
        switch (this.currentStatus) {
            case 'in':
                statusCard.classList.add('active');
                statusText.textContent = 'Présent';
                break;
            case 'break':
                statusCard.classList.add('break');
                statusText.textContent = 'En pause';
                break;
            case 'out':
            default:
                statusCard.classList.add('inactive');
                statusText.textContent = 'Non pointé';
                break;
        }
    }
    
    updateActionButtons() {
        const clockInBtn = document.getElementById('btn-clock-in');
        const clockOutBtn = document.getElementById('btn-clock-out');
        const breakStartBtn = document.getElementById('btn-break-start');
        const breakEndBtn = document.getElementById('btn-break-end');
        
        // Cacher tous les boutons
        [clockInBtn, clockOutBtn, breakStartBtn, breakEndBtn].forEach(btn => {
            if (btn) btn.classList.add('hidden');
        });
        
        // Afficher les boutons appropriés
        switch (this.currentStatus) {
            case 'out':
                if (clockInBtn) clockInBtn.classList.remove('hidden');
                break;
            case 'in':
                if (clockOutBtn) clockOutBtn.classList.remove('hidden');
                if (breakStartBtn) breakStartBtn.classList.remove('hidden');
                break;
            case 'break':
                if (breakEndBtn) breakEndBtn.classList.remove('hidden');
                break;
        }
    }
    
    renderTodayShiftInfo() {
        const container = document.getElementById('today-shift-info');
        if (!container) return;
        
        if (this.todayShift) {
            container.innerHTML = `
                <div class="shift-info">
                    <div class="shift-time">
                        <i class="fas fa-clock"></i>
                        <span>${this.formatTime(this.todayShift.startTime)} - ${this.formatTime(this.todayShift.endTime)}</span>
                    </div>
                    <div class="shift-role">
                        <i class="fas fa-user-tag"></i>
                        <span>${this.todayShift.role || 'Non spécifié'}</span>
                    </div>
                    ${this.todayShift.location ? `
                        <div class="shift-location">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${this.todayShift.location}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            container.innerHTML = `
                <p class="text-muted">
                    <i class="fas fa-calendar-times"></i>
                    Aucun shift programmé
                </p>
            `;
        }
    }
    
    renderBadgingHistory() {
        const container = document.getElementById('badging-history-list');
        if (!container) return;
        
        if (this.todayRecords.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>Aucun pointage aujourd'hui</p>
                </div>
            `;
            return;
        }
        
        const historyHTML = this.todayRecords.map(record => this.createHistoryItem(record)).join('');
        container.innerHTML = historyHTML;
    }
    
    createHistoryItem(record) {
        const timestamp = record.timestamp.toDate ? record.timestamp.toDate() : new Date(record.timestamp);
        const typeLabels = {
            'clock_in': 'Arrivée',
            'clock_out': 'Départ',
            'break_start': 'Début pause',
            'break_end': 'Fin pause'
        };
        
        const typeIcons = {
            'clock_in': 'sign-in-alt',
            'clock_out': 'sign-out-alt',
            'break_start': 'coffee',
            'break_end': 'play-circle'
        };
        
        const typeColors = {
            'clock_in': 'success',
            'clock_out': 'danger',
            'break_start': 'warning',
            'break_end': 'info'
        };
        
        return `
            <div class="history-item ${typeColors[record.type]}">
                <div class="history-icon">
                    <i class="fas fa-${typeIcons[record.type]}"></i>
                </div>
                <div class="history-info">
                    <span class="history-type">${typeLabels[record.type]}</span>
                    <span class="history-time">${this.formatTime(timestamp)}</span>
                    ${record.metadata?.breakType ? `
                        <span class="history-meta">(${this.formatBreakType(record.metadata.breakType)})</span>
                    ` : ''}
                </div>
                <div class="history-status">
                    ${record.validated ? `
                        <i class="fas fa-check-circle text-success"></i>
                    ` : `
                        <i class="fas fa-clock text-warning" title="En attente de validation"></i>
                    `}
                </div>
            </div>
        `;
    }
    
    updateBadgingStats() {
        const totalHours = this.calculateTotalHours();
        const workHours = this.calculateWorkHours();
        const breakHours = this.calculateBreakHours();
        
        this.updateStatElement('total-hours', this.formatDuration(totalHours));
        this.updateStatElement('work-hours', this.formatDuration(workHours));
        this.updateStatElement('break-hours', this.formatDuration(breakHours));
    }
    
    updateStatElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }
    
    calculateTotalHours() {
        if (this.todayRecords.length === 0) return 0;
        
        const firstClockIn = this.todayRecords.find(r => r.type === 'clock_in');
        const lastClockOut = [...this.todayRecords].reverse().find(r => r.type === 'clock_out');
        
        if (!firstClockIn) return 0;
        
        const startTime = firstClockIn.timestamp.toDate ? firstClockIn.timestamp.toDate() : new Date(firstClockIn.timestamp);
        const endTime = lastClockOut ? 
            (lastClockOut.timestamp.toDate ? lastClockOut.timestamp.toDate() : new Date(lastClockOut.timestamp)) :
            new Date();
        
        return Math.max(0, endTime - startTime) / (1000 * 60); // en minutes
    }
    
    calculateWorkHours() {
        return this.calculateTotalHours() - this.calculateBreakHours();
    }
    
    calculateBreakHours() {
        let totalBreakTime = 0;
        let breakStart = null;
        
        for (const record of this.todayRecords) {
            if (record.type === 'break_start') {
                breakStart = record.timestamp.toDate ? record.timestamp.toDate() : new Date(record.timestamp);
            } else if (record.type === 'break_end' && breakStart) {
                const breakEnd = record.timestamp.toDate ? record.timestamp.toDate() : new Date(record.timestamp);
                totalBreakTime += breakEnd - breakStart;
                breakStart = null;
            }
        }
        
        // Si pause en cours
        if (breakStart && this.currentStatus === 'break') {
            totalBreakTime += new Date() - breakStart;
        }
        
        return totalBreakTime / (1000 * 60); // en minutes
    }
    
    calculateTimeWorked() {
        return this.calculateWorkHours();
    }
    
    calculateLastBreakDuration() {
        const breaks = this.todayRecords.filter(r => r.type === 'break_start' || r.type === 'break_end');
        if (breaks.length < 2) return 0;
        
        const lastBreakStart = breaks[breaks.length - 2];
        const lastBreakEnd = breaks[breaks.length - 1];
        
        if (lastBreakStart.type !== 'break_start' || lastBreakEnd.type !== 'break_end') return 0;
        
        const startTime = lastBreakStart.timestamp.toDate ? lastBreakStart.timestamp.toDate() : new Date(lastBreakStart.timestamp);
        const endTime = lastBreakEnd.timestamp.toDate ? lastBreakEnd.timestamp.toDate() : new Date(lastBreakEnd.timestamp);
        
        return (endTime - startTime) / (1000 * 60); // en minutes
    }
    
    formatTime(date) {
        return date.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours}h${mins.toString().padStart(2, '0')}`;
    }
    
    formatBreakType(type) {
        const types = {
            'lunch': 'Déjeuner',
            'short': 'Pause courte',
            'personal': 'Pause personnelle',
            'meeting': 'Réunion'
        };
        return types[type] || type;
    }
    
    startClock() {
        this.updateClock();
        this.clockInterval = setInterval(() => this.updateClock(), 1000);
    }
    
    updateClock() {
        const clockElement = document.getElementById('clock');
        if (clockElement) {
            const now = new Date();
            clockElement.textContent = now.toLocaleTimeString('fr-FR');
        }
    }
    
    playNotificationSound() {
        try {
            const audio = new Audio('/assets/sounds/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(e => console.log('Audio play failed:', e));
        } catch (error) {
            console.log('Audio not available');
        }
    }
    
    logBadgingEvent(eventType, metadata = {}) {
        if (window.firebaseManager) {
            window.firebaseManager.logEvent('badging_action', {
                action_type: eventType,
                current_status: this.currentStatus,
                records_today: this.todayRecords.length,
                ...metadata
            });
        }
    }
    
    refreshBadgingData() {
        if (this.currentUser) {
            this.loadBadgingData();
        }
    }
    
    saveTodayRecordsToLocal() {
        try {
            const today = new Date().toDateString();
            const key = `badging_${this.currentUser.uid}_${today}`;
            localStorage.setItem(key, JSON.stringify(this.todayRecords));
        } catch (error) {
            console.error('❌ Erreur sauvegarde localStorage:', error);
        }
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    cleanup() {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }
    }
    
    // API publique
    getCurrentStatus() {
        return this.currentStatus;
    }
    
    getTodayRecords() {
        return this.todayRecords;
    }
    
    getTodayShift() {
        return this.todayShift;
    }
    
    getBadgingStats() {
        return {
            totalHours: this.calculateTotalHours(),
            workHours: this.calculateWorkHours(),
            breakHours: this.calculateBreakHours(),
            recordsCount: this.todayRecords.length
        };
    }
    
    isUserPresent() {
        return this.currentStatus === 'in' || this.currentStatus === 'break';
    }
    
    isOnBreak() {
        return this.currentStatus === 'break';
    }
}

// Initialiser
document.addEventListener('DOMContentLoaded', () => {
    window.badgingManager = new BadgingManager();
});

// Cleanup avant fermeture
window.addEventListener('beforeunload', () => {
    if (window.badgingManager) {
        window.badgingManager.cleanup();
    }
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BadgingManager;
}
