// src/js/controllers/timeclock-controller.js
import { TimeClockManager } from '../managers/TimeClockManager.js';
import { EventBus } from '../core/eventbus.js';
import { Logger } from '../core/logger.js';

export class TimeClockController {
    constructor() {
        this.timeClockManager = new TimeClockManager();
        this.currentAction = null;
        this.workTimer = null;
        this.currentLocation = null;
        this.selectedEntryId = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.updateDisplay();
        this.startTimers();
    }

    initializeElements() {
        // Status elements
        this.statusIcon = document.getElementById('status-icon');
        this.statusTitle = document.getElementById('status-title');
        this.statusSubtitle = document.getElementById('status-subtitle');
        this.sessionTimer = document.getElementById('current-session-timer');
        this.workTimerEl = document.getElementById('work-timer');
        this.breakIndicator = document.getElementById('break-indicator');

        // Action buttons
        this.clockInBtn = document.getElementById('clock-in-btn');
        this.clockOutBtn = document.getElementById('clock-out-btn');
        this.trainingBtn = document.getElementById('training-btn');
        this.startBreakBtn = document.getElementById('start-break-btn');
        this.endBreakBtn = document.getElementById('end-break-btn');
        this.breakActions = document.getElementById('break-actions');

        // Options
        this.remoteCheckbox = document.getElementById('remote-work-checkbox');
        this.locationBtn = document.getElementById('location-btn');

        // Comment section
        this.commentSection = document.getElementById('comment-section');
        this.commentTitle = document.getElementById('comment-title');
        this.commentInput = document.getElementById('comment-input');
        this.commentCancel = document.getElementById('comment-cancel');
        this.commentConfirm = document.getElementById('comment-confirm');

        // Stats
        this.todayWorkTime = document.getElementById('today-work-time');
        this.todayBreakTime = document.getElementById('today-break-time');
        this.todayOvertime = document.getElementById('today-overtime');

        // History
        this.periodSelect = document.getElementById('period-select');
        this.customPeriod = document.getElementById('custom-period');
        this.startDateInput = document.getElementById('start-date');
        this.endDateInput = document.getElementById('end-date');
        this.applyFilterBtn = document.getElementById('apply-filter');
        this.exportBtn = document.getElementById('export-btn');
        this.entriesList = document.getElementById('entries-list');

        // Period summary
        this.periodTotalTime = document.getElementById('period-total-time');
        this.periodDaysWorked = document.getElementById('period-days-worked');
        this.periodOvertime = document.getElementById('period-overtime');
        this.periodTrainingDays = document.getElementById('period-training-days');

        // Modals
        this.exportModal = document.getElementById('export-modal');
        this.adminEditModal = document.getElementById('admin-edit-modal');

        // Templates
        this.entryTemplate = document.getElementById('entry-template');
    }

    setupEventListeners() {
        // Action buttons
        this.clockInBtn.addEventListener('click', () => this.handleClockIn());
        this.clockOutBtn.addEventListener('click', () => this.handleClockOut());
        this.trainingBtn.addEventListener('click', () => this.handleTraining());
        this.startBreakBtn.addEventListener('click', () => this.handleStartBreak());
        this.endBreakBtn.addEventListener('click', () => this.handleEndBreak());

        // Location
        this.locationBtn.addEventListener('click', () => this.getCurrentLocation());

        // Comment section
        this.commentCancel.addEventListener('click', () => this.hideCommentSection());
        this.commentConfirm.addEventListener('click', () => this.confirmAction());

        // History controls
        this.periodSelect.addEventListener('change', () => this.handlePeriodChange());
        this.applyFilterBtn.addEventListener('click', () => this.applyCustomFilter());
        this.exportBtn.addEventListener('click', () => this.showExportModal());

        // Export modal
        document.getElementById('export-modal-close').addEventListener('click', () => this.hideExportModal());
        document.getElementById('export-cancel').addEventListener('click', () => this.hideExportModal());
        document.getElementById('export-download').addEventListener('click', () => this.downloadExport());

        // Admin modal
        document.getElementById('admin-modal-close').addEventListener('click', () => this.hideAdminModal());
        document.getElementById('admin-cancel').addEventListener('click', () => this.hideAdminModal());
        document.getElementById('admin-save').addEventListener('click', () => this.saveAdminChanges());

        // EventBus listeners
        EventBus.on('timeclock:clockedIn', () => this.updateDisplay());
        EventBus.on('timeclock:clockedOut', () => this.updateDisplay());
        EventBus.on('timeclock:breakStarted', () => this.updateDisplay());
        EventBus.on('timeclock:breakEnded', () => this.updateDisplay());
        EventBus.on('timeclock:trainingClocked', () => this.updateDisplay());
        EventBus.on('timeclock:entriesLoaded', () => this.renderEntries());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    async updateDisplay() {
        const currentSession = this.timeClockManager.getCurrentSession();
        const isOnBreak = this.timeClockManager.isCurrentlyOnBreak();

        // Update status
        if (currentSession && !currentSession.clockOut) {
            // Session active
            this.statusIcon.textContent = isOnBreak ? '⏸️' : '🟢';
            this.statusTitle.textContent = isOnBreak ? 'En pause' : 'En cours';
            this.statusSubtitle.textContent = isOnBreak ? 
                'Pause en cours depuis ' + this.formatTime(this.timeClockManager.getCurrentBreakDuration()) :
                `Pointé depuis ${new Date(currentSession.clockIn).toLocaleTimeString('fr-FR')}`;
            
            this.sessionTimer.style.display = 'block';
            this.breakIndicator.style.display = isOnBreak ? 'inline' : 'none';
            
            // Show/hide buttons
            this.clockInBtn.style.display = 'none';
            this.clockOutBtn.style.display = 'block';
            this.breakActions.style.display = 'block';
            this.startBreakBtn.style.display = isOnBreak ? 'none' : 'block';
            this.endBreakBtn.style.display = isOnBreak ? 'block' : 'none';
        } else {
            // Pas de session active
            this.statusIcon.textContent = '⏰';
            this.statusTitle.textContent = 'Non pointé';
            this.statusSubtitle.textContent = 'Cliquez pour pointer votre arrivée';
            
            this.sessionTimer.style.display = 'none';
            
            // Show/hide buttons
            this.clockInBtn.style.display = 'block';
            this.clockOutBtn.style.display = 'none';
            this.breakActions.style.display = 'none';
        }

        // Update today's stats
        await this.updateTodayStats();
        
        // Load and display history
        await this.loadHistoryForPeriod();
    }

    async updateTodayStats() {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        
        await this.timeClockManager.loadTimeEntries(startOfDay, endOfDay);
        const todayEntries = this.timeClockManager.getTimeEntries();
        const stats = this.timeClockManager.calculateStats(todayEntries);

        this.todayWorkTime.textContent = this.formatDuration(stats.totalWorkTime);
        this.todayBreakTime.textContent = this.formatDuration(stats.totalBreakTime);
        this.todayOvertime.textContent = this.formatDuration(stats.totalOvertime);
    }

    startTimers() {
        this.workTimer = setInterval(() => {
            const currentSession = this.timeClockManager.getCurrentSession();
            if (currentSession && !currentSession.clockOut) {
                const startTime = new Date(currentSession.clockIn);
                const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000 / 60);
                const workTime = elapsed - this.timeClockManager.getCurrentBreakDuration();
                this.workTimerEl.textContent = this.formatDuration(workTime);
            }
        }, 1000);
    }

    // Actions handlers
    handleClockIn() {
        this.currentAction = 'clockIn';
        this.showCommentSection('Commentaire d\'arrivée (optionnel)');
    }

    handleClockOut() {
        this.currentAction = 'clockOut';
        this.showCommentSection('Commentaire de sortie (optionnel)');
    }

    handleTraining() {
        this.currentAction = 'training';
        this.showCommentSection('Commentaire de formation (optionnel)');
    }

    handleStartBreak() {
        this.currentAction = 'startBreak';
        this.showCommentSection('Raison de la pause (optionnel)');
    }

    async handleEndBreak() {
        try {
            await this.timeClockManager.endBreak();
            this.showNotification('Pause terminée', 'success');
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    async confirmAction() {
        const comment = this.commentInput.value.trim();
        
        try {
            switch (this.currentAction) {
                case 'clockIn':
                    await this.timeClockManager.clockIn(
                        comment, 
                        this.remoteCheckbox.checked, 
                        this.currentLocation
                    );
                    this.showNotification('Pointage d\'arrivée enregistré', 'success');
                    break;
                    
                case 'clockOut':
                    await this.timeClockManager.clockOut(comment);
                    this.showNotification('Pointage de sortie enregistré', 'success');
                    break;
                    
                case 'training':
                    await this.timeClockManager.clockTraining(comment);
                    this.showNotification('Journée de formation enregistrée', 'success');
                    break;
                    
                case 'startBreak':
                    await this.timeClockManager.startBreak(comment);
                    this.showNotification('Pause commencée', 'success');
                    break;
            }
            
            this.hideCommentSection();
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    showCommentSection(title) {
        this.commentTitle.textContent = title;
        this.commentInput.value = '';
        this.commentSection.style.display = 'block';
        this.commentInput.focus();
    }

    hideCommentSection() {
        this.commentSection.style.display = 'none';
        this.currentAction = null;
    }

    async getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showNotification('Géolocalisation non supportée', 'error');
            return;
        }

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000
                });
            });

            this.currentLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: new Date().toISOString()
            };

            this.showNotification('Position enregistrée', 'success');
        } catch (error) {
            this.showNotification('Impossible d\'obtenir la position', 'error');
        }
    }

    // History management
    handlePeriodChange() {
        const period = this.periodSelect.value;
        
        if (period === 'custom') {
            this.customPeriod.style.display = 'block';
            this.setDefaultDateRange();
        } else {
            this.customPeriod.style.display = 'none';
            this.loadHistoryForPeriod();
        }
    }

    setDefaultDateRange() {
        const today = new Date();
        const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        
        this.startDateInput.value = oneMonthAgo.toISOString().split('T')[0];
        this.endDateInput.value = today.toISOString().split('T')[0];
    }

    async applyCustomFilter() {
        const startDate = new Date(this.startDateInput.value);
        const endDate = new Date(this.endDateInput.value);
        
        if (startDate > endDate) {
            this.showNotification('La date de début doit être antérieure à la date de fin', 'error');
            return;
        }
        
        await this.timeClockManager.loadTimeEntries(startDate, endDate);
        this.renderEntries();
        this.updatePeriodSummary();
    }

    async loadHistoryForPeriod() {
        const period = this.periodSelect.value;
        let startDate, endDate;
        
        const today = new Date();
        
        switch (period) {
            case 'week':
                startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
                endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (6 - today.getDay()));
                break;
            case 'month':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            default:
                return;
        }
        
        await this.timeClockManager.loadTimeEntries(startDate, endDate);
        this.renderEntries();
        this.updatePeriodSummary();
    }

    updatePeriodSummary() {
        const entries = this.timeClockManager.getTimeEntries();
        const stats = this.timeClockManager.calculateStats(entries);
        
        this.periodTotalTime.textContent = this.formatDuration(stats.totalWorkTime);
        this.periodDaysWorked.textContent = stats.daysWorked.toString();
        this.periodOvertime.textContent = this.formatDuration(stats.totalOvertime);
        this.periodTrainingDays.textContent = stats.trainingDays.toString();
    }

    renderEntries() {
        const entries = this.timeClockManager.getTimeEntries();
        this.entriesList.innerHTML = '';
        
        entries.forEach(entry => {
            const entryEl = this.createEntryElement(entry);
            this.entriesList.appendChild(entryEl);
        });
    }

    createEntryElement(entry) {
        const template = this.entryTemplate.content.cloneNode(true);
        const entryEl = template.querySelector('.entry-item');
        
        entryEl.dataset.entryId = entry.id;
        
        // Date
        const date = new Date(entry.createdAt);
        entryEl.querySelector('.entry-date').textContent = date.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
        
        // Badges
        if (entry.isRemote) {
            entryEl.querySelector('.badge.remote').style.display = 'inline-block';
        }
        if (entry.isTraining) {
            entryEl.querySelector('.badge.training').style.display = 'inline-block';
        }
        
        // Times
        entryEl.querySelector('.clock-in .time-value').textContent = 
            new Date(entry.clockIn).toLocaleTimeString('fr-FR');
        entryEl.querySelector('.clock-out .time-value').textContent = 
            entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString('fr-FR') : 'En cours';
        
        // Durations
        entryEl.querySelector('.work-duration .duration-value').textContent = 
            this.formatDuration(entry.totalWorkTime || 0);
        entryEl.querySelector('.break-duration .duration-value').textContent = 
            this.formatDuration(entry.totalBreakTime || 0);
        
        // Comments
        if (entry.clockInComment || entry.clockOutComment) {
            const commentsEl = entryEl.querySelector('.comments');
            commentsEl.style.display = 'block';
            
            if (entry.clockInComment) {
                commentsEl.querySelector('.comment-in').textContent = 
                    `Arrivée: ${entry.clockInComment}`;
            }
            if (entry.clockOutComment) {
                commentsEl.querySelector('.comment-out').textContent = 
                    `Sortie: ${entry.clockOutComment}`;
            }
        }
        
        // Breaks details
        if (entry.breaks && entry.breaks.length > 0) {
            const breaksEl = entryEl.querySelector('.breaks-list');
            breaksEl.style.display = 'block';
            
            const breaksContent = entryEl.querySelector('.breaks-content');
            breaksContent.innerHTML = entry.breaks.map(breakItem => {
                const start = new Date(breakItem.startTime).toLocaleTimeString('fr-FR');
                const end = breakItem.endTime ? 
                    new Date(breakItem.endTime).toLocaleTimeString('fr-FR') : 'En cours';
                const duration = this.formatDuration(breakItem.duration || 0);
                return `${start} - ${end} (${duration})${breakItem.reason ? ': ' + breakItem.reason : ''}`;
            }).join('<br>');
        }
        
        // Admin edit button
        const user = this.getCurrentUser();
        if (user && user.isAdmin) {
            entryEl.querySelector('.admin-edit-btn').style.display = 'inline-block';
            entryEl.querySelector('.admin-edit-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.showAdminEditModal(entry);
            });
        }
        
        // Toggle details
        entryEl.querySelector('.entry-header').addEventListener('click', () => {
            entryEl.classList.toggle('expanded');
        });
        
        return entryEl;
    }

    // Export functionality
    showExportModal() {
        const today = new Date();
        const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        
        document.getElementById('export-start-date').value = oneMonthAgo.toISOString().split('T')[0];
        document.getElementById('export-end-date').value = today.toISOString().split('T')[0];
        
        this.exportModal.style.display = 'flex';
    }

    hideExportModal() {
        this.exportModal.style.display = 'none';
    }

    downloadExport() {
        const format = document.getElementById('export-format').value;
        const startDate = new Date(document.getElementById('export-start-date').value);
        const endDate = new Date(document.getElementById('export-end-date').value);
        
        if (startDate > endDate) {
            this.showNotification('Dates invalides', 'error');
            return;
        }
        
        try {
            const data = this.timeClockManager.exportData(startDate, endDate, format);
            const filename = `pointages_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.${format}`;
            
            this.downloadFile(data, filename, format === 'csv' ? 'text/csv' : 'application/json');
            this.hideExportModal();
            this.showNotification('Export téléchargé', 'success');
        } catch (error) {
            this.showNotification('Erreur lors de l\'export', 'error');
        }
    }

    downloadFile(data, filename, mimeType) {
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    // Admin functionality
    showAdminEditModal(entry) {
        this.selectedEntryId = entry.id;
        
        document.getElementById('admin-clock-in').value = 
            this.formatDateForInput(new Date(entry.clockIn));
        document.getElementById('admin-clock-out').value = 
            entry.clockOut ? this.formatDateForInput(new Date(entry.clockOut)) : '';
        document.getElementById('admin-comment').value = '';
        
        this.adminEditModal.style.display = 'flex';
    }

    hideAdminModal() {
        this.adminEditModal.style.display = 'none';
        this.selectedEntryId = null;
    }

    async saveAdminChanges() {
        if (!this.selectedEntryId) return;
        
        const clockIn = document.getElementById('admin-clock-in').value;
        const clockOut = document.getElementById('admin-clock-out').value;
        const comment = document.getElementById('admin-comment').value;
        
        if (!clockIn) {
            this.showNotification('Heure d\'arrivée requise', 'error');
            return;
        }
        
        if (!comment.trim()) {
            this.showNotification('Commentaire de modification requis', 'error');
            return;
        }
        
        try {
            const updateData = {
                clockIn: new Date(clockIn).toISOString(),
                adminComment: comment,
                lastModified: new Date().toISOString()
            };
            
            if (clockOut) {
                updateData.clockOut = new Date(clockOut).toISOString();
                
                // Recalculate work time
                const clockInTime = new Date(clockIn);
                const clockOutTime = new Date(clockOut);
                const entry = this.timeClockManager.getTimeEntries().find(e => e.id === this.selectedEntryId);
                updateData.totalWorkTime = this.timeClockManager.calculateWorkTime(
                    clockInTime, 
                    clockOutTime, 
                    entry.breaks || []
                );
            }
            
            await this.timeClockManager.updateTimeEntry(this.selectedEntryId, updateData);
            await this.loadHistoryForPeriod();
            
            this.hideAdminModal();
            this.showNotification('Pointage modifié avec succès', 'success');
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    // Keyboard shortcuts
    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'i':
                    e.preventDefault();
                    if (this.clockInBtn.style.display !== 'none') {
                        this.handleClockIn();
                    }
                    break;
                case 'o':
                    e.preventDefault();
                    if (this.clockOutBtn.style.display !== 'none') {
                        this.handleClockOut();
                    }
                    break;
                case 'p':
                    e.preventDefault();
                    if (this.startBreakBtn.style.display !== 'none') {
                        this.handleStartBreak();
                    } else if (this.endBreakBtn.style.display !== 'none') {
                        this.handleEndBreak();
                    }
                    break;
                case 'e':
                    e.preventDefault();
                    this.showExportModal();
                    break;
            }
        }
        
        if (e.key === 'Escape') {
            if (this.commentSection.style.display !== 'none') {
                this.hideCommentSection();
            }
            if (this.exportModal.style.display !== 'none') {
                this.hideExportModal();
            }
            if (this.adminEditModal.style.display !== 'none') {
                this.hideAdminModal();
            }
        }
    }

    // Utility methods
    formatDuration(minutes) {
        if (!minutes || minutes < 0) return '00:00';
        
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    formatTime(minutes) {
        if (!minutes || minutes < 0) return '0 min';
        
        if (minutes < 60) {
            return `${minutes} min`;
        } else {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return mins > 0 ? `${hours}h${mins.toString().padStart(2, '0')}` : `${hours}h`;
        }
    }

    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    showNotification(message, type = 'info') {
        EventBus.emit('notification:show', {
            message: message,
            type: type,
            duration: 3000
        });
    }

    getCurrentUser() {
        // À adapter selon votre système d'authentification
        return {
            uid: 'current-user-id',
            isAdmin: false // Récupérer depuis AuthManager
        };
    }

    // Cleanup
    destroy() {
        if (this.workTimer) {
            clearInterval(this.workTimer);
        }
        
        // Remove event listeners
        EventBus.off('timeclock:clockedIn');
        EventBus.off('timeclock:clockedOut');
        EventBus.off('timeclock:breakStarted');
        EventBus.off('timeclock:breakEnded');
        EventBus.off('timeclock:trainingClocked');
        EventBus.off('timeclock:entriesLoaded');
    }
}
