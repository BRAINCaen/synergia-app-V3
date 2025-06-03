// js/modules/planning/planning-manager.js
// Gestionnaire de planning et calendrier pour SYNERGIA v3.0

class PlanningManager {
    constructor() {
        this.currentView = 'week'; // week, month, day
        this.currentDate = new Date();
        this.shifts = [];
        this.events = [];
        this.leaves = [];
        this.teamMembers = [];
        this.isLoading = false;
        this.listeners = [];
        this.calendarInstance = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupCalendarViews();
        
        // Attendre Firebase et auth
        document.addEventListener('firebase:ready', () => {
            this.setupFirebaseListeners();
        });
        
        document.addEventListener('auth:login', (e) => {
            this.currentUser = e.detail.user;
            this.loadPlanningData();
        });
        
        console.log('✅ Planning Manager initialisé');
    }
    
    setupEventListeners() {
        // Boutons de navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('#prev-period')) {
                this.navigatePrevious();
            }
            
            if (e.target.matches('#next-period')) {
                this.navigateNext();
            }
            
            if (e.target.matches('[data-action="today"]')) {
                this.navigateToToday();
            }
        });
        
        // Changement de vue
        document.addEventListener('click', (e) => {
            if (e.target.matches('.view-btn')) {
                const view = e.target.dataset.view;
                this.changeView(view);
            }
        });
        
        // Actions planning
        document.addEventListener('click', (e) => {
            if (e.target.matches('#add-shift-btn')) {
                this.showAddShiftModal();
            }
            
            if (e.target.matches('#add-event-btn')) {
                this.showAddEventModal();
            }
            
            if (e.target.matches('[data-action="edit-shift"]')) {
                const shiftId = e.target.dataset.shiftId;
                this.editShift(shiftId);
            }
            
            if (e.target.matches('[data-action="delete-shift"]')) {
                const shiftId = e.target.dataset.shiftId;
                this.deleteShift(shiftId);
            }
            
            if (e.target.matches('[data-action="request-leave"]')) {
                this.showRequestLeaveModal();
            }
        });
        
        // Formulaires
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'add-shift-form') {
                e.preventDefault();
                this.handleAddShift(e.target);
            }
            
            if (e.target.id === 'add-event-form') {
                e.preventDefault();
                this.handleAddEvent(e.target);
            }
            
            if (e.target.id === 'request-leave-form') {
                e.preventDefault();
                this.handleRequestLeave(e.target);
            }
        });
        
        // Navigation page
        document.addEventListener('page:change', (e) => {
            if (e.detail.page === 'planning') {
                this.refreshPlanning();
            }
        });
    }
    
    setupCalendarViews() {
        // Configuration des vues calendrier
        this.viewConfig = {
            week: {
                startHour: 6,
                endHour: 24,
                slotDuration: 30, // minutes
                daysToShow: 7
            },
            month: {
                weeksToShow: 6,
                showWeekNumbers: true
            },
            day: {
                startHour: 6,
                endHour: 24,
                slotDuration: 15 // minutes
            }
        };
    }
    
    setupFirebaseListeners() {
        if (!window.firebaseManager) return;
        
        // Écouter les shifts
        this.listeners.push(
            window.firebaseManager.onSnapshot('shifts', (shifts) => {
                this.shifts = shifts;
                this.renderCalendar();
            })
        );
        
        // Écouter les événements
        this.listeners.push(
            window.firebaseManager.onSnapshot('events', (events) => {
                this.events = events;
                this.renderCalendar();
            })
        );
        
        // Écouter les congés
        this.listeners.push(
            window.firebaseManager.onSnapshot('leaves', (leaves) => {
                this.leaves = leaves;
                this.renderCalendar();
            })
        );
    }
    
    async loadPlanningData() {
        if (!this.currentUser || this.isLoading) return;
        
        this.isLoading = true;
        this.showPlanningLoading();
        
        try {
            await Promise.all([
                this.loadShifts(),
                this.loadEvents(),
                this.loadLeaves(),
                this.loadTeamMembers()
            ]);
            
            this.renderCalendar();
            this.updateNavigationInfo();
            
        } catch (error) {
            console.error('❌ Erreur chargement planning:', error);
            window.uiManager?.showToast('Erreur lors du chargement du planning', 'error');
        } finally {
            this.isLoading = false;
        }
    }
    
    async loadShifts() {
        try {
            if (window.firebaseManager) {
                const allShifts = await window.firebaseManager.getCollection('shifts');
                
                // Filtrer par période visible
                const startDate = this.getViewStartDate();
                const endDate = this.getViewEndDate();
                
                this.shifts = allShifts.filter(shift => {
                    const shiftDate = new Date(shift.date);
                    return shiftDate >= startDate && shiftDate <= endDate;
                });
            } else {
                // Fallback localStorage
                this.loadShiftsFromLocal();
            }
        } catch (error) {
            console.error('❌ Erreur chargement shifts:', error);
            this.shifts = [];
        }
    }
    
    async loadEvents() {
        try {
            if (window.firebaseManager) {
                const allEvents = await window.firebaseManager.getCollection('events');
                
                // Filtrer par période visible
                const startDate = this.getViewStartDate();
                const endDate = this.getViewEndDate();
                
                this.events = allEvents.filter(event => {
                    const eventStart = new Date(event.startDate);
                    const eventEnd = new Date(event.endDate || event.startDate);
                    return (eventStart <= endDate && eventEnd >= startDate);
                });
            } else {
                this.events = [];
            }
        } catch (error) {
            console.error('❌ Erreur chargement événements:', error);
            this.events = [];
        }
    }
    
    async loadLeaves() {
        try {
            if (window.firebaseManager) {
                const allLeaves = await window.firebaseManager.getCollection('leaves');
                
                // Filtrer par période visible
                const startDate = this.getViewStartDate();
                const endDate = this.getViewEndDate();
                
                this.leaves = allLeaves.filter(leave => {
                    const leaveStart = new Date(leave.startDate);
                    const leaveEnd = new Date(leave.endDate);
                    return (leaveStart <= endDate && leaveEnd >= startDate);
                });
            } else {
                this.leaves = [];
            }
        } catch (error) {
            console.error('❌ Erreur chargement congés:', error);
            this.leaves = [];
        }
    }
    
    async loadTeamMembers() {
        try {
            if (window.teamManager) {
                this.teamMembers = window.teamManager.getActiveMembers();
            } else if (window.dataManager) {
                this.teamMembers = await window.dataManager.getTeamMembers();
            }
        } catch (error) {
            console.error('❌ Erreur chargement équipe:', error);
            this.teamMembers = [];
        }
    }
    
    // === GESTION DES SHIFTS ===
    
    async addShift(shiftData) {
        try {
            // Validation
            if (!this.validateShiftData(shiftData)) {
                return false;
            }
            
            // Vérifier les conflits
            const conflicts = this.checkShiftConflicts(shiftData);
            if (conflicts.length > 0) {
                const proceed = confirm(`Conflit détecté avec ${conflicts.length} shift(s) existant(s). Continuer ?`);
                if (!proceed) return false;
            }
            
            const newShift = {
                ...shiftData,
                id: this.generateId(),
                status: 'scheduled',
                createdAt: new Date().toISOString(),
                createdBy: this.currentUser?.uid || 'system'
            };
            
            // Sauvegarder
            if (window.firebaseManager) {
                const shiftId = await window.firebaseManager.addDocument('shifts', newShift);
                newShift.id = shiftId;
            }
            
            this.shifts.push(newShift);
            this.renderCalendar();
            
            window.uiManager?.showToast('Shift ajouté avec succès!', 'success');
            window.uiManager?.closeModal();
            
            // Notifications aux membres concernés
            if (shiftData.assignedTo) {
                await this.notifyShiftAssignment(newShift);
            }
            
            // Analytics
            if (window.firebaseManager) {
                window.firebaseManager.logEvent('shift_created', {
                    shift_type: newShift.type,
                    duration: this.calculateShiftDuration(newShift),
                    assigned_to: shiftData.assignedTo
                });
            }
            
            return newShift;
            
        } catch (error) {
            console.error('❌ Erreur ajout shift:', error);
            window.uiManager?.showToast('Erreur lors de l\'ajout du shift', 'error');
            return false;
        }
    }
    
    async updateShift(shiftId, updateData) {
        try {
            const shiftIndex = this.shifts.findIndex(s => s.id === shiftId);
            if (shiftIndex === -1) {
                throw new Error('Shift non trouvé');
            }
            
            // Validation
            const updatedShift = { ...this.shifts[shiftIndex], ...updateData };
            if (!this.validateShiftData(updatedShift)) {
                return false;
            }
            
            // Vérifier les conflits (exclure le shift actuel)
            const conflicts = this.checkShiftConflicts(updatedShift, shiftId);
            if (conflicts.length > 0) {
                const proceed = confirm(`Conflit détecté avec ${conflicts.length} shift(s). Continuer ?`);
                if (!proceed) return false;
            }
            
            const finalUpdateData = {
                ...updateData,
                updatedAt: new Date().toISOString(),
                updatedBy: this.currentUser?.uid
            };
            
            // Sauvegarder
            if (window.firebaseManager) {
                await window.firebaseManager.updateDocument('shifts', shiftId, finalUpdateData);
            }
            
            this.shifts[shiftIndex] = { ...this.shifts[shiftIndex], ...finalUpdateData };
            this.renderCalendar();
            
            window.uiManager?.showToast('Shift mis à jour!', 'success');
            window.uiManager?.closeModal();
            
            return true;
            
        } catch (error) {
            console.error('❌ Erreur mise à jour shift:', error);
            window.uiManager?.showToast('Erreur lors de la mise à jour', 'error');
            return false;
        }
    }
    
    async deleteShift(shiftId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce shift ?')) {
            return false;
        }
        
        try {
            // Sauvegarder
            if (window.firebaseManager) {
                await window.firebaseManager.deleteDocument('shifts', shiftId);
            }
            
            this.shifts = this.shifts.filter(s => s.id !== shiftId);
            this.renderCalendar();
            
            window.uiManager?.showToast('Shift supprimé', 'success');
            
            return true;
            
        } catch (error) {
            console.error('❌ Erreur suppression shift:', error);
            window.uiManager?.showToast('Erreur lors de la suppression', 'error');
            return false;
        }
    }
    
    checkShiftConflicts(shiftData, excludeShiftId = null) {
        const shiftStart = new Date(`${shiftData.date} ${shiftData.startTime}`);
        const shiftEnd = new Date(`${shiftData.date} ${shiftData.endTime}`);
        
        return this.shifts.filter(existingShift => {
            if (excludeShiftId && existingShift.id === excludeShiftId) {
                return false;
            }
            
            if (existingShift.assignedTo !== shiftData.assignedTo) {
                return false;
            }
            
            const existingStart = new Date(`${existingShift.date} ${existingShift.startTime}`);
            const existingEnd = new Date(`${existingShift.date} ${existingShift.endTime}`);
            
            // Vérifier chevauchement
            return (shiftStart < existingEnd && shiftEnd > existingStart);
        });
    }
    
    validateShiftData(data) {
        if (!data.date || !data.startTime || !data.endTime) {
            window.uiManager?.showToast('Date et heures sont obligatoires', 'error');
            return false;
        }
        
        const startTime = new Date(`${data.date} ${data.startTime}`);
        const endTime = new Date(`${data.date} ${data.endTime}`);
        
        if (endTime <= startTime) {
            window.uiManager?.showToast('L\'heure de fin doit être après l\'heure de début', 'error');
            return false;
        }
        
        if (!data.assignedTo) {
            window.uiManager?.showToast('Vous devez assigner le shift à un membre', 'error');
            return false;
        }
        
        return true;
    }
    
    calculateShiftDuration(shift) {
        const startTime = new Date(`${shift.date} ${shift.startTime}`);
        const endTime = new Date(`${shift.date} ${shift.endTime}`);
        return Math.round((endTime - startTime) / (1000 * 60)); // en minutes
    }
    
    // === GESTION DES ÉVÉNEMENTS ===
    
    async addEvent(eventData) {
        try {
            if (!this.validateEventData(eventData)) {
                return false;
            }
            
            const newEvent = {
                ...eventData,
                id: this.generateId(),
                createdAt: new Date().toISOString(),
                createdBy: this.currentUser?.uid || 'system'
            };
            
            // Sauvegarder
            if (window.firebaseManager) {
                const eventId = await window.firebaseManager.addDocument('events', newEvent);
                newEvent.id = eventId;
            }
            
            this.events.push(newEvent);
            this.renderCalendar();
            
            window.uiManager?.showToast('Événement ajouté!', 'success');
            window.uiManager?.closeModal();
            
            return newEvent;
            
        } catch (error) {
            console.error('❌ Erreur ajout événement:', error);
            window.uiManager?.showToast('Erreur lors de l\'ajout de l\'événement', 'error');
            return false;
        }
    }
    
    validateEventData(data) {
        if (!data.title || data.title.trim().length < 3) {
            window.uiManager?.showToast('Le titre doit faire au moins 3 caractères', 'error');
            return false;
        }
        
        if (!data.startDate) {
            window.uiManager?.showToast('Date de début obligatoire', 'error');
            return false;
        }
        
        if (data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
            window.uiManager?.showToast('Date de fin doit être après le début', 'error');
            return false;
        }
        
        return true;
    }
    
    // === GESTION DES CONGÉS ===
    
    async requestLeave(leaveData) {
        try {
            if (!this.validateLeaveData(leaveData)) {
                return false;
            }
            
            const newLeave = {
                ...leaveData,
                id: this.generateId(),
                status: 'pending',
                requestedAt: new Date().toISOString(),
                requestedBy: this.currentUser?.uid
            };
            
            // Sauvegarder
            if (window.firebaseManager) {
                const leaveId = await window.firebaseManager.addDocument('leaves', newLeave);
                newLeave.id = leaveId;
            }
            
            this.leaves.push(newLeave);
            this.renderCalendar();
            
            window.uiManager?.showToast('Demande de congé envoyée!', 'success');
            window.uiManager?.closeModal();
            
            // Notifier les managers
            await this.notifyLeaveRequest(newLeave);
            
            return newLeave;
            
        } catch (error) {
            console.error('❌ Erreur demande congé:', error);
            window.uiManager?.showToast('Erreur lors de la demande', 'error');
            return false;
        }
    }
    
    validateLeaveData(data) {
        if (!data.startDate || !data.endDate) {
            window.uiManager?.showToast('Dates de début et fin obligatoires', 'error');
            return false;
        }
        
        if (new Date(data.endDate) < new Date(data.startDate)) {
            window.uiManager?.showToast('Date de fin doit être après le début', 'error');
            return false;
        }
        
        if (!data.reason || data.reason.trim().length < 5) {
            window.uiManager?.showToast('Raison obligatoire (min 5 caractères)', 'error');
            return false;
        }
        
        return true;
    }
    
    // === NAVIGATION CALENDRIER ===
    
    navigatePrevious() {
        switch (this.currentView) {
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() - 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() - 7);
                break;
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                break;
        }
        
        this.refreshView();
    }
    
    navigateNext() {
        switch (this.currentView) {
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() + 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() + 7);
                break;
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                break;
        }
        
        this.refreshView();
    }
    
    navigateToToday() {
        this.currentDate = new Date();
        this.refreshView();
    }
    
    changeView(view) {
        if (this.currentView === view) return;
        
        this.currentView = view;
        
        // Mettre à jour les boutons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        this.refreshView();
    }
    
    refreshView() {
        this.updateNavigationInfo();
        this.loadPlanningData();
    }
    
    updateNavigationInfo() {
        const periodElement = document.getElementById('current-period');
        if (!periodElement) return;
        
        const options = { 
            year: 'numeric', 
            month: 'long',
            day: 'numeric'
        };
        
        switch (this.currentView) {
            case 'day':
                periodElement.textContent = this.currentDate.toLocaleDateString('fr-FR', options);
                break;
            case 'week':
                const weekStart = this.getWeekStart(this.currentDate);
                const weekEnd = this.getWeekEnd(this.currentDate);
                periodElement.textContent = `${weekStart.getDate()} - ${weekEnd.getDate()} ${weekEnd.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
                break;
            case 'month':
                periodElement.textContent = this.currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                break;
        }
    }
    
    getViewStartDate() {
        switch (this.currentView) {
            case 'day':
                return new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), this.currentDate.getDate());
            case 'week':
                return this.getWeekStart(this.currentDate);
            case 'month':
                return new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        }
    }
    
    getViewEndDate() {
        switch (this.currentView) {
            case 'day':
                return new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), this.currentDate.getDate(), 23, 59, 59);
            case 'week':
                return this.getWeekEnd(this.currentDate);
            case 'month':
                return new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0, 23, 59, 59);
        }
    }
    
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lundi = début de semaine
        return new Date(d.setDate(diff));
    }
    
    getWeekEnd(date) {
        const weekStart = this.getWeekStart(date);
        return new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6, 23, 59, 59);
    }
    
    // === RENDU CALENDRIER ===
    
    renderCalendar() {
        const container = document.getElementById('planning-container');
        if (!container) return;
        
        switch (this.currentView) {
            case 'day':
                this.renderDayView(container);
                break;
            case 'week':
                this.renderWeekView(container);
                break;
            case 'month':
                this.renderMonthView(container);
                break;
        }
    }
    
    renderWeekView(container) {
        const weekStart = this.getWeekStart(this.currentDate);
        const days = [];
        
        // Générer les 7 jours de la semaine
        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStart);
            day.setDate(weekStart.getDate() + i);
            days.push(day);
        }
        
        const weekHTML = `
            <div class="calendar-week-view">
                <div class="week-header">
                    <div class="time-column"></div>
                    ${days.map(day => `
                        <div class="day-header ${this.isToday(day) ? 'today' : ''}">
                            <div class="day-name">${this.getDayName(day)}</div>
                            <div class="day-date">${day.getDate()}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="week-body">
                    ${this.generateTimeSlots().map(timeSlot => `
                        <div class="time-row">
                            <div class="time-label">${timeSlot}</div>
                            ${days.map(day => `
                                <div class="day-column" data-date="${this.formatDate(day)}" data-time="${timeSlot}">
                                    ${this.renderDayEvents(day, timeSlot)}
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        container.innerHTML = weekHTML;
    }
    
    renderMonthView(container) {
        const monthStart = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const monthEnd = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        
        // Commencer au lundi de la première semaine
        const calendarStart = this.getWeekStart(monthStart);
        
        // Finir au dimanche de la dernière semaine
        const calendarEnd = new Date(this.getWeekEnd(monthEnd));
        
        const weeks = [];
        let currentWeek = [];
        let currentDate = new Date(calendarStart);
        
        while (currentDate <= calendarEnd) {
            currentWeek.push(new Date(currentDate));
            
            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        const monthHTML = `
            <div class="calendar-month-view">
                <div class="month-header">
                    ${['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => `
                        <div class="day-name">${day}</div>
                    `).join('')}
                </div>
                <div class="month-body">
                    ${weeks.map(week => `
                        <div class="week-row">
                            ${week.map(day => this.renderMonthDay(day)).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        container.innerHTML = monthHTML;
    }
    
    renderMonthDay(day) {
        const isCurrentMonth = day.getMonth() === this.currentDate.getMonth();
        const isToday = this.isToday(day);
        const dayShifts = this.getShiftsForDay(day);
        const dayEvents = this.getEventsForDay(day);
        const dayLeaves = this.getLeavesForDay(day);
        
        return `
            <div class="month-day ${isCurrentMonth ? 'current-month' : 'other-month'} ${isToday ? 'today' : ''}" 
                 data-date="${this.formatDate(day)}">
                <div class="day-number">${day.getDate()}</div>
                <div class="day-content">
                    ${dayShifts.map(shift => this.renderShiftItem(shift, 'mini')).join('')}
                    ${dayEvents.map(event => this.renderEventItem(event, 'mini')).join('')}
                    ${dayLeaves.map(leave => this.renderLeaveItem(leave, 'mini')).join('')}
                </div>
            </div>
        `;
    }
    
    renderDayView(container) {
        const timeSlots = this.generateTimeSlots();
        const dayShifts = this.getShiftsForDay(this.currentDate);
        const dayEvents = this.getEventsForDay(this.currentDate);
        
        const dayHTML = `
            <div class="calendar-day-view">
                <div class="day-header">
                    <h2>${this.currentDate.toLocaleDateString('fr-FR', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</h2>
                </div>
                <div class="day-timeline">
                    ${timeSlots.map(timeSlot => `
                        <div class="time-slot" data-time="${timeSlot}">
                            <div class="time-label">${timeSlot}</div>
                            <div class="slot-content">
                                ${this.renderDayEvents(this.currentDate, timeSlot)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        container.innerHTML = dayHTML;
    }
    
    renderDayEvents(day, timeSlot) {
        const dayShifts = this.getShiftsForDay(day);
        const dayEvents = this.getEventsForDay(day);
        const events = [];
        
        // Filtrer par heure si mode détaillé
        if (timeSlot) {
            const slotHour = parseInt(timeSlot.split(':')[0]);
            
            dayShifts.forEach(shift => {
                const startHour = parseInt(shift.startTime.split(':')[0]);
                const endHour = parseInt(shift.endTime.split(':')[0]);
                
                if (slotHour >= startHour && slotHour < endHour) {
                    events.push(this.renderShiftItem(shift));
                }
            });
            
            dayEvents.forEach(event => {
                if (event.allDay || this.eventInTimeSlot(event, timeSlot)) {
                    events.push(this.renderEventItem(event));
                }
            });
        } else {
            events.push(...dayShifts.map(shift => this.renderShiftItem(shift)));
            events.push(...dayEvents.map(event => this.renderEventItem(event)));
        }
        
        return events.join('');
    }
    
    renderShiftItem(shift, size = 'normal') {
        const member = this.teamMembers.find(m => m.id === shift.assignedTo);
        const duration = this.calculateShiftDuration(shift);
        
        const sizeClass = size === 'mini' ? 'shift-mini' : 'shift-normal';
        const statusClass = `shift-${shift.status}`;
        
        return `
            <div class="shift-item ${sizeClass} ${statusClass}" data-shift-id="${shift.id}">
                <div class="shift-header">
                    <span class="shift-title">${shift.title || 'Shift'}</span>
                    ${size === 'normal' ? `
                        <div class="shift-actions">
                            <button class="btn btn-icon btn-sm" data-action="edit-shift" data-shift-id="${shift.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-icon btn-sm btn-danger" data-action="delete-shift" data-shift-id="${shift.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
                <div class="shift-details">
                    <div class="shift-time">
                        <i class="fas fa-clock"></i>
                        ${shift.startTime} - ${shift.endTime}
                    </div>
                    ${member ? `
                        <div class="shift-member">
                            <i class="fas fa-user"></i>
                            ${member.displayName}
                        </div>
                    ` : ''}
                    ${size === 'normal' ? `
                        <div class="shift-duration">
                            <i class="fas fa-hourglass-half"></i>
                            ${this.formatDuration(duration)}
                        </div>
                    ` : ''}
                </div>
                ${shift.description && size === 'normal' ? `
                    <div class="shift-description">${shift.description}</div>
                ` : ''}
            </div>
        `;
    }
    
    renderEventItem(event, size = 'normal') {
        const sizeClass = size === 'mini' ? 'event-mini' : 'event-normal';
        const typeClass = `event-${event.type || 'general'}`;
        
        return `
            <div class="event-item ${sizeClass} ${typeClass}" data-event-id="${event.id}">
                <div class="event-header">
                    <span class="event-title">${event.title}</span>
                    ${event.priority === 'high' ? '<i class="fas fa-exclamation-triangle event-priority"></i>' : ''}
                </div>
                ${size === 'normal' && event.description ? `
                    <div class="event-description">${event.description}</div>
                ` : ''}
                ${size === 'normal' && !event.allDay ? `
                    <div class="event-time">
                        <i class="fas fa-clock"></i>
                        ${event.startTime || 'Toute la journée'}
                        ${event.endTime ? ` - ${event.endTime}` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderLeaveItem(leave, size = 'normal') {
        const sizeClass = size === 'mini' ? 'leave-mini' : 'leave-normal';
        const statusClass = `leave-${leave.status}`;
        
        return `
            <div class="leave-item ${sizeClass} ${statusClass}" data-leave-id="${leave.id}">
                <div class="leave-header">
                    <span class="leave-title">Congé</span>
                    <span class="leave-status">${this.formatLeaveStatus(leave.status)}</span>
                </div>
                ${size === 'normal' ? `
                    <div class="leave-details">
                        <div class="leave-reason">${leave.reason}</div>
                        <div class="leave-duration">
                            ${this.formatDate(leave.startDate)} - ${this.formatDate(leave.endDate)}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // === UTILITAIRES ===
    
    generateTimeSlots() {
        const slots = [];
        const config = this.viewConfig[this.currentView];
        const startHour = config.startHour || 6;
        const endHour = config.endHour || 24;
        const slotDuration = config.slotDuration || 30;
        
        for (let hour = startHour; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += slotDuration) {
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                slots.push(timeString);
            }
        }
        
        return slots;
    }
    
    getShiftsForDay(day) {
        const dayString = this.formatDate(day);
        return this.shifts.filter(shift => shift.date === dayString);
    }
    
    getEventsForDay(day) {
        return this.events.filter(event => {
            const eventStart = new Date(event.startDate);
            const eventEnd = new Date(event.endDate || event.startDate);
            const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
            const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
            
            return (eventStart <= dayEnd && eventEnd >= dayStart);
        });
    }
    
    getLeavesForDay(day) {
        return this.leaves.filter(leave => {
            const leaveStart = new Date(leave.startDate);
            const leaveEnd = new Date(leave.endDate);
            const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
            const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
            
            return (leaveStart <= dayEnd && leaveEnd >= dayStart);
        });
    }
    
    eventInTimeSlot(event, timeSlot) {
        if (event.allDay) return true;
        
        const slotHour = parseInt(timeSlot.split(':')[0]);
        const eventStartHour = event.startTime ? parseInt(event.startTime.split(':')[0]) : 0;
        const eventEndHour = event.endTime ? parseInt(event.endTime.split(':')[0]) : 23;
        
        return slotHour >= eventStartHour && slotHour < eventEndHour;
    }
    
    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }
    
    getDayName(date) {
        return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    }
    
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    
    formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h${mins.toString().padStart(2, '0')}`;
    }
    
    formatLeaveStatus(status) {
        const statuses = {
            'pending': 'En attente',
            'approved': 'Approuvé',
            'rejected': 'Refusé'
        };
        return statuses[status] || status;
    }
    
    // === MODALS ===
    
    showAddShiftModal() {
        const modalHTML = `
            <div class="modal-header">
                <h3>Ajouter un shift</h3>
                <button type="button" class="btn btn-icon" data-close-modal>
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="add-shift-form" class="modal-body">
                <div class="form-row">
                    <div class="form-group">
                        <label for="shift-date">Date</label>
                        <input type="date" id="shift-date" name="date" required value="${this.formatDate(this.currentDate)}">
                    </div>
                    <div class="form-group">
                        <label for="shift-assigned">Assigné à</label>
                        <select id="shift-assigned" name="assignedTo" required>
                            <option value="">Sélectionner un membre</option>
                            ${this.teamMembers.map(member => `
                                <option value="${member.id}">${member.displayName}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="shift-start">Heure de début</label>
                        <input type="time" id="shift-start" name="startTime" required>
                    </div>
                    <div class="form-group">
                        <label for="shift-end">Heure de fin</label>
                        <input type="time" id="shift-end" name="endTime" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="shift-title">Titre (optionnel)</label>
                    <input type="text" id="shift-title" name="title" placeholder="Shift du matin, Fermeture...">
                </div>
                <div class="form-group">
                    <label for="shift-description">Description (optionnel)</label>
                    <textarea id="shift-description" name="description" rows="3" placeholder="Instructions spéciales..."></textarea>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-close-modal>Annuler</button>
                    <button type="submit" class="btn btn-primary">Ajouter</button>
                </div>
            </form>
        `;
        
        window.uiManager?.openModal('add-shift', { content: modalHTML });
    }
    
    showAddEventModal() {
        const modalHTML = `
            <div class="modal-header">
                <h3>Ajouter un événement</h3>
                <button type="button" class="btn btn-icon" data-close-modal>
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="add-event-form" class="modal-body">
                <div class="form-group">
                    <label for="event-title">Titre</label>
                    <input type="text" id="event-title" name="title" required placeholder="Réunion équipe, Formation...">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="event-start-date">Date de début</label>
                        <input type="date" id="event-start-date" name="startDate" required value="${this.formatDate(this.currentDate)}">
                    </div>
                    <div class="form-group">
                        <label for="event-end-date">Date de fin</label>
                        <input type="date" id="event-end-date" name="endDate">
                    </div>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="event-all-day" name="allDay" checked>
                        Toute la journée
                    </label>
                </div>
                <div id="event-time-fields" style="display: none;">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="event-start-time">Heure de début</label>
                            <input type="time" id="event-start-time" name="startTime">
                        </div>
                        <div class="form-group">
                            <label for="event-end-time">Heure de fin</label>
                            <input type="time" id="event-end-time" name="endTime">
                        </div>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="event-type">Type</label>
                        <select id="event-type" name="type">
                            <option value="general">Général</option>
                            <option value="meeting">Réunion</option>
                            <option value="training">Formation</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="event">Événement</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="event-priority">Priorité</label>
                        <select id="event-priority" name="priority">
                            <option value="normal">Normale</option>
                            <option value="high">Haute</option>
                            <option value="urgent">Urgente</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label for="event-description">Description</label>
                    <textarea id="event-description" name="description" rows="3" placeholder="Détails de l'événement..."></textarea>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-close-modal>Annuler</button>
                    <button type="submit" class="btn btn-primary">Ajouter</button>
                </div>
            </form>
        `;
        
        window.uiManager?.openModal('add-event', { content: modalHTML });
        
        // Gérer l'affichage des champs d'heure
        document.getElementById('event-all-day').addEventListener('change', (e) => {
            const timeFields = document.getElementById('event-time-fields');
            timeFields.style.display = e.target.checked ? 'none' : 'block';
        });
    }
    
    showRequestLeaveModal() {
        const modalHTML = `
            <div class="modal-header">
                <h3>Demander un congé</h3>
                <button type="button" class="btn btn-icon" data-close-modal>
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="request-leave-form" class="modal-body">
                <div class="form-row">
                    <div class="form-group">
                        <label for="leave-start">Date de début</label>
                        <input type="date" id="leave-start" name="startDate" required>
                    </div>
                    <div class="form-group">
                        <label for="leave-end">Date de fin</label>
                        <input type="date" id="leave-end" name="endDate" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="leave-type">Type de congé</label>
                    <select id="leave-type" name="type" required>
                        <option value="vacation">Congés payés</option>
                        <option value="sick">Arrêt maladie</option>
                        <option value="personal">Congé personnel</option>
                        <option value="family">Congé familial</option>
                        <option value="other">Autre</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="leave-reason">Raison</label>
                    <textarea id="leave-reason" name="reason" rows="3" required placeholder="Motif de la demande..."></textarea>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-close-modal>Annuler</button>
                    <button type="submit" class="btn btn-primary">Envoyer la demande</button>
                </div>
            </form>
        `;
        
        window.uiManager?.openModal('request-leave', { content: modalHTML });
    }
    
    // === HANDLERS ===
    
    handleAddShift(form) {
        const formData = new FormData(form);
        const shiftData = {
            date: formData.get('date'),
            startTime: formData.get('startTime'),
            endTime: formData.get('endTime'),
            assignedTo: formData.get('assignedTo'),
            title: formData.get('title'),
            description: formData.get('description')
        };
        
        this.addShift(shiftData);
    }
    
    handleAddEvent(form) {
        const formData = new FormData(form);
        const eventData = {
            title: formData.get('title'),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate') || formData.get('startDate'),
            allDay: formData.has('allDay'),
            startTime: formData.get('startTime'),
            endTime: formData.get('endTime'),
            type: formData.get('type'),
            priority: formData.get('priority'),
            description: formData.get('description')
        };
        
        this.addEvent(eventData);
    }
    
    handleRequestLeave(form) {
        const formData = new FormData(form);
        const leaveData = {
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            type: formData.get('type'),
            reason: formData.get('reason')
        };
        
        this.requestLeave(leaveData);
    }
    
    editShift(shiftId) {
        const shift = this.shifts.find(s => s.id === shiftId);
        if (!shift) return;
        
        // TODO: Implémenter modal d'édition
        console.log('Édition shift:', shift);
    }
    
    // === NOTIFICATIONS ===
    
    async notifyShiftAssignment(shift) {
        // TODO: Implémenter notifications
        console.log('Notification shift assigné:', shift);
    }
    
    async notifyLeaveRequest(leave) {
        // TODO: Implémenter notifications aux managers
        console.log('Notification demande congé:', leave);
    }
    
    // === LOCAL STORAGE FALLBACK ===
    
    loadShiftsFromLocal() {
        try {
            const saved = localStorage.getItem('synergia_shifts');
            this.shifts = saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('❌ Erreur chargement shifts localStorage:', error);
            this.shifts = [];
        }
    }
    
    saveShiftsToLocal() {
        try {
            localStorage.setItem('synergia_shifts', JSON.stringify(this.shifts));
        } catch (error) {
            console.error('❌ Erreur sauvegarde shifts localStorage:', error);
        }
    }
    
    showPlanningLoading() {
        const container = document.getElementById('planning-container');
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Chargement du planning...</p>
                </div>
            `;
        }
    }
    
    refreshPlanning() {
        if (this.currentUser) {
            this.loadPlanningData();
        }
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    cleanup() {
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners = [];
    }
    
    // === API PUBLIQUE ===
    
    getCurrentView() {
        return this.currentView;
    }
    
    getCurrentDate() {
        return this.currentDate;
    }
    
    getShifts(filters = {}) {
        let filteredShifts = [...this.shifts];
        
        if (filters.assignedTo) {
            filteredShifts = filteredShifts.filter(s => s.assignedTo === filters.assignedTo);
        }
        
        if (filters.date) {
            filteredShifts = filteredShifts.filter(s => s.date === filters.date);
        }
        
        if (filters.status) {
            filteredShifts = filteredShifts.filter(s => s.status === filters.status);
        }
        
        return filteredShifts;
    }
    
    getEvents(filters = {}) {
        let filteredEvents = [...this.events];
        
        if (filters.type) {
            filteredEvents = filteredEvents.filter(e => e.type === filters.type);
        }
        
        if (filters.date) {
            filteredEvents = filteredEvents.filter(e => {
                const eventStart = new Date(e.startDate);
                const eventEnd = new Date(e.endDate || e.startDate);
                const filterDate = new Date(filters.date);
                return eventStart <= filterDate && eventEnd >= filterDate;
            });
        }
        
        return filteredEvents;
    }
    
    getLeaves(filters = {}) {
        let filteredLeaves = [...this.leaves];
        
        if (filters.status) {
            filteredLeaves = filteredLeaves.filter(l => l.status === filters.status);
        }
        
        if (filters.userId) {
            filteredLeaves = filteredLeaves.filter(l => l.requestedBy === filters.userId);
        }
        
        return filteredLeaves;
    }
    
    getPlanningStats() {
        return {
            totalShifts: this.shifts.length,
            todayShifts: this.getShiftsForDay(new Date()).length,
            upcomingEvents: this.events.filter(e => new Date(e.startDate) > new Date()).length,
            pendingLeaves: this.leaves.filter(l => l.status === 'pending').length
        };
    }
}

// Initialiser
document.addEventListener('DOMContentLoaded', () => {
    window.planningManager = new PlanningManager();
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlanningManager;
}
