/* 
 * router-badging.js
 * Intégration des routes et méthodes pour le BadgingManager
 * À ajouter dans src/js/core/router.js
 */

// ==================
// MÉTHODES À AJOUTER AU ROUTER
// ==================

// Dans la méthode render() du Router, ajouter ce case :
/*
case '/badging':
    if (isAuthenticated) {
        app.innerHTML = this.renderBadging();
        this.loadBadgingData();
    } else {
        this.navigate('/login');
    }
    break;
*/

// Méthodes à ajouter à la classe Router :

async loadBadgingData() {
    try {
        // Attendre que BadgingManager soit initialisé
        while (!window.badgingManager || !window.badgingManager.isInitialized) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        await badgingManager.loadTodaysTimesheet();
        await badgingManager.loadTimesheets();
        this.updateBadgingView();
    } catch (error) {
        console.error('Erreur chargement badging:', error);
    }
}

updateBadgingView() {
    const stats = badgingManager.getTodaysStats();
    this.updateBadgingStats(stats);
    this.updateBadgingButtons();
    this.updateTimesheetsTable();
}

updateBadgingStats(stats) {
    const elements = {
        checkinTime: document.getElementById('checkinTime'),
        checkoutTime: document.getElementById('checkoutTime'),
        totalHours: document.getElementById('totalHours'),
        breakDuration: document.getElementById('breakDuration')
    };

    if (elements.checkinTime) {
        elements.checkinTime.textContent = stats.checkIn ? 
            stats.checkIn.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    }
    
    if (elements.checkoutTime) {
        elements.checkoutTime.textContent = stats.checkOut ? 
            stats.checkOut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    }
    
    if (elements.totalHours) {
        elements.totalHours.textContent = stats.totalHours ? 
            `${stats.totalHours}h` : '0h';
    }
    
    if (elements.breakDuration) {
        elements.breakDuration.textContent = stats.breakDuration ? 
            `${stats.breakDuration}min` : '0min';
    }
}

updateBadgingButtons() {
    const status = badgingManager.getCurrentStatus();
    const buttons = {
        checkin: document.getElementById('checkinBtn'),
        checkout: document.getElementById('checkoutBtn'),
        breakStart: document.getElementById('breakStartBtn'),
        breakEnd: document.getElementById('breakEndBtn')
    };

    // Reset all buttons
    Object.values(buttons).forEach(btn => {
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('btn-success', 'btn-warning', 'btn-danger');
            btn.classList.add('btn-secondary');
        }
    });

    switch(status) {
        case 'not-started':
            if (buttons.checkin) {
                buttons.checkin.disabled = false;
                buttons.checkin.classList.remove('btn-secondary');
                buttons.checkin.classList.add('btn-success');
            }
            if (buttons.checkout) buttons.checkout.disabled = true;
            if (buttons.breakStart) buttons.breakStart.disabled = true;
            if (buttons.breakEnd) buttons.breakEnd.disabled = true;
            break;
            
        case 'working':
            if (buttons.checkin) buttons.checkin.disabled = true;
            if (buttons.checkout) {
                buttons.checkout.disabled = false;
                buttons.checkout.classList.remove('btn-secondary');
                buttons.checkout.classList.add('btn-danger');
            }
            if (buttons.breakStart) {
                buttons.breakStart.disabled = false;
                buttons.breakStart.classList.remove('btn-secondary');
                buttons.breakStart.classList.add('btn-warning');
            }
            if (buttons.breakEnd) buttons.breakEnd.disabled = true;
            break;
            
        case 'on-break':
            if (buttons.checkin) buttons.checkin.disabled = true;
            if (buttons.checkout) buttons.checkout.disabled = true;
            if (buttons.breakStart) buttons.breakStart.disabled = true;
            if (buttons.breakEnd) {
                buttons.breakEnd.disabled = false;
                buttons.breakEnd.classList.remove('btn-secondary');
                buttons.breakEnd.classList.add('btn-success');
            }
            break;
            
        case 'finished':
            Object.values(buttons).forEach(btn => {
                if (btn) btn.disabled = true;
            });
            break;
    }
}

updateTimesheetsTable() {
    const tbody = document.getElementById('timesheetsTableBody');
    if (!tbody) return;
    
    const timesheets = badgingManager.getTimesheets().slice(0, 10);
    
    if (timesheets.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    Aucun pointage enregistré
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = timesheets.map(timesheet => `
        <tr>
            <td>${new Date(timesheet.date).toLocaleDateString('fr-FR')}</td>
            <td>${timesheet.checkIn ? timesheet.checkIn.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
            <td>${timesheet.checkOut ? timesheet.checkOut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
            <td>${timesheet.totalHours ? `${timesheet.totalHours}h` : '-'}</td>
            <td><span class="status-badge status-${timesheet.status}">${this.getStatusLabel(timesheet.status)}</span></td>
            <td>${timesheet.notes || '-'}</td>
        </tr>
    `).join('');
}

renderBadging() {
    return `
        <div class="container">
            ${this.renderHeader()}
            ${this.renderNavigation('/badging')}
            
            <div class="grid grid-2">
                <!-- Widget Horloge et Pointage -->
                <div class="clock-widget">
                    <div class="current-time" id="currentTime">--:--:--</div>
                    <div class="current-date" id="currentDate">Chargement...</div>
                    
                    <div class="badge-buttons">
                        <button id="checkinBtn" onclick="handleCheckIn()" class="btn btn-lg btn-success">
                            🟢 Arrivée
                        </button>
                        <button id="checkoutBtn" onclick="handleCheckOut()" class="btn btn-lg btn-danger">
                            🔴 Sortie
                        </button>
                    </div>
                    
                    <div class="badge-buttons" style="margin-top: 16px;">
                        <button id="breakStartBtn" onclick="handleBreakStart()" class="btn btn-lg btn-warning">
                            ⏸️ Pause
                        </button>
                        <button id="breakEndBtn" onclick="handleBreakEnd()" class="btn btn-lg btn-success">
                            ▶️ Reprise
                        </button>
                    </div>
                </div>
                
                <!-- Statistiques du jour -->
                <div class="card">
                    <h3>📊 Aujourd'hui</h3>
                    
                    <div class="badge-status">
                        <div class="time-label">Arrivée</div>
                        <div class="time-display" id="checkinTime">--:--</div>
                    </div>
                    
                    <div class="badge-status">
                        <div class="time-label">Sortie</div>
                        <div class="time-display" id="checkoutTime">--:--</div>
                    </div>
                    
                    <div class="hours-summary">
                        <div>
                            <div class="time-label">Heures travaillées</div>
                            <div class="time-display" id="totalHours">0h</div>
                        </div>
                        <div>
                            <div class="time-label">Temps de pause</div>
                            <div class="time-display" id="breakDuration">0min</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Historique des pointages -->
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2>📋 Historique des pointages</h2>
                    <button onclick="badgingManager.loadTimesheets()" class="btn btn-secondary">
                        🔄 Actualiser
                    </button>
                </div>
                
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Arrivée</th>
                                <th>Sortie</th>
                                <th>Heures</th>
                                <th>Statut</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody id="timesheetsTableBody">
                            <tr>
                                <td colspan="6" style="text-align: center; padding: 40px;">
                                    <div class="loading-spinner"></div>
                                    <p style="margin-top: 16px;">Chargement de l'historique...</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// Mise à jour de renderNavigation pour inclure le lien Badging actif
renderNavigation(activePath) {
    return `
        <div class="nav-tabs">
            <a href="#/dashboard" class="nav-tab ${activePath === '/dashboard' ? 'active' : ''}">📊 Dashboard</a>
            <a href="#/profile" class="nav-tab ${activePath === '/profile' ? 'active' : ''}">👤 Profil</a>
            <a href="#/team" class="nav-tab ${activePath === '/team' ? 'active' : ''}">👥 Équipe</a>
            <a href="#/badging" class="nav-tab ${activePath === '/badging' ? 'active' : ''}">⏰ Pointage</a>
            <button class="nav-tab" onclick="alert('Bientôt disponible!')">💬 Chat</button>
            <button class="nav-tab" onclick="alert('Bientôt disponible!')">📅 Planning</button>
        </div>
    `;
}

// Event listeners à ajouter dans la méthode init() du Router
setupBadgingListeners() {
    if (window.badgingManager && window.badgingManager.isInitialized) {
        window.addEventListener('timesheet:loaded', () => {
            if (window.location.hash.includes('/badging')) {
                this.updateBadgingView();
            }
        });

        window.addEventListener('badge:checkin', () => {
            if (window.location.hash.includes('/badging')) {
                this.updateBadgingView();
            }
        });

        window.addEventListener('badge:checkout', () => {
            if (window.location.hash.includes('/badging')) {
                this.updateBadgingView();
            }
        });

        window.addEventListener('badge:breakstart', () => {
            if (window.location.hash.includes('/badging')) {
                this.updateBadgingView();
            }
        });

        window.addEventListener('badge:breakend', () => {
            if (window.location.hash.includes('/badging')) {
                this.updateBadgingView();
            }
        });
    } else {
        setTimeout(() => this.setupBadgingListeners(), 100);
    }
}
/* 
 * router-badging.js
 * Intégration des routes et méthodes pour le BadgingManager
 * À ajouter dans src/js/core/router.js
 */

// ==================
// MÉTHODES À AJOUTER AU ROUTER
// ==================

// Dans la méthode render() du Router, ajouter ce case :
/*
case '/badging':
    if (isAuthenticated) {
        app.innerHTML = this.renderBadging();
        this.loadBadgingData();
    } else {
        this.navigate('/login');
    }
    break;
*/

// Méthodes à ajouter à la classe Router :

async loadBadgingData() {
    try {
        // Attendre que BadgingManager soit initialisé
        while (!window.badgingManager || !window.badgingManager.isInitialized) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        await badgingManager.loadTodaysTimesheet();
        await badgingManager.loadTimesheets();
        this.updateBadgingView();
    } catch (error) {
        console.error('Erreur chargement badging:', error);
    }
}

updateBadgingView() {
    const stats = badgingManager.getTodaysStats();
    this.updateBadgingStats(stats);
    this.updateBadgingButtons();
    this.updateTimesheetsTable();
}

updateBadgingStats(stats) {
    const elements = {
        checkinTime: document.getElementById('checkinTime'),
        checkoutTime: document.getElementById('checkoutTime'),
        totalHours: document.getElementById('totalHours'),
        breakDuration: document.getElementById('breakDuration')
    };

    if (elements.checkinTime) {
        elements.checkinTime.textContent = stats.checkIn ? 
            stats.checkIn.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    }
    
    if (elements.checkoutTime) {
        elements.checkoutTime.textContent = stats.checkOut ? 
            stats.checkOut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    }
    
    if (elements.totalHours) {
        elements.totalHours.textContent = stats.totalHours ? 
            `${stats.totalHours}h` : '0h';
    }
    
    if (elements.breakDuration) {
        elements.breakDuration.textContent = stats.breakDuration ? 
            `${stats.breakDuration}min` : '0min';
    }
}

updateBadgingButtons() {
    const status = badgingManager.getCurrentStatus();
    const buttons = {
        checkin: document.getElementById('checkinBtn'),
        checkout: document.getElementById('checkoutBtn'),
        breakStart: document.getElementById('breakStartBtn'),
        breakEnd: document.getElementById('breakEndBtn')
    };

    // Reset all buttons
    Object.values(buttons).forEach(btn => {
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('btn-success', 'btn-warning', 'btn-danger');
            btn.classList.add('btn-secondary');
        }
    });

    switch(status) {
        case 'not-started':
            if (buttons.checkin) {
                buttons.checkin.disabled = false;
                buttons.checkin.classList.remove('btn-secondary');
                buttons.checkin.classList.add('btn-success');
            }
            if (buttons.checkout) buttons.checkout.disabled = true;
            if (buttons.breakStart) buttons.breakStart.disabled = true;
            if (buttons.breakEnd) buttons.breakEnd.disabled = true;
            break;
            
        case 'working':
            if (buttons.checkin) buttons.checkin.disabled = true;
            if (buttons.checkout) {
                buttons.checkout.disabled = false;
                buttons.checkout.classList.remove('btn-secondary');
                buttons.checkout.classList.add('btn-danger');
            }
            if (buttons.breakStart) {
                buttons.breakStart.disabled = false;
                buttons.breakStart.classList.remove('btn-secondary');
                buttons.breakStart.classList.add('btn-warning');
            }
            if (buttons.breakEnd) buttons.breakEnd.disabled = true;
            break;
            
        case 'on-break':
            if (buttons.checkin) buttons.checkin.disabled = true;
            if (buttons.checkout) buttons.checkout.disabled = true;
            if (buttons.breakStart) buttons.breakStart.disabled = true;
            if (buttons.breakEnd) {
                buttons.breakEnd.disabled = false;
                buttons.breakEnd.classList.remove('btn-secondary');
                buttons.breakEnd.classList.add('btn-success');
            }
            break;
            
        case 'finished':
            Object.values(buttons).forEach(btn => {
                if (btn) btn.disabled = true;
            });
            break;
    }
}

updateTimesheetsTable() {
    const tbody = document.getElementById('timesheetsTableBody');
    if (!tbody) return;
    
    const timesheets = badgingManager.getTimesheets().slice(0, 10);
    
    if (timesheets.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    Aucun pointage enregistré
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = timesheets.map(timesheet => `
        <tr>
            <td>${new Date(timesheet.date).toLocaleDateString('fr-FR')}</td>
            <td>${timesheet.checkIn ? timesheet.checkIn.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
            <td>${timesheet.checkOut ? timesheet.checkOut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
            <td>${timesheet.totalHours ? `${timesheet.totalHours}h` : '-'}</td>
            <td><span class="status-badge status-${timesheet.status}">${this.getStatusLabel(timesheet.status)}</span></td>
            <td>${timesheet.notes || '-'}</td>
        </tr>
    `).join('');
}

renderBadging() {
    return `
        <div class="container">
            ${this.renderHeader()}
            ${this.renderNavigation('/badging')}
            
            <div class="grid grid-2">
                <!-- Widget Horloge et Pointage -->
                <div class="clock-widget">
                    <div class="current-time" id="currentTime">--:--:--</div>
                    <div class="current-date" id="currentDate">Chargement...</div>
                    
                    <div class="badge-buttons">
                        <button id="checkinBtn" onclick="handleCheckIn()" class="btn btn-lg btn-success">
                            🟢 Arrivée
                        </button>
                        <button id="checkoutBtn" onclick="handleCheckOut()" class="btn btn-lg btn-danger">
                            🔴 Sortie
                        </button>
                    </div>
                    
                    <div class="badge-buttons" style="margin-top: 16px;">
                        <button id="breakStartBtn" onclick="handleBreakStart()" class="btn btn-lg btn-warning">
                            ⏸️ Pause
                        </button>
                        <button id="breakEndBtn" onclick="handleBreakEnd()" class="btn btn-lg btn-success">
                            ▶️ Reprise
                        </button>
                    </div>
                </div>
                
                <!-- Statistiques du jour -->
                <div class="card">
                    <h3>📊 Aujourd'hui</h3>
                    
                    <div class="badge-status">
                        <div class="time-label">Arrivée</div>
                        <div class="time-display" id="checkinTime">--:--</div>
                    </div>
                    
                    <div class="badge-status">
                        <div class="time-label">Sortie</div>
                        <div class="time-display" id="checkoutTime">--:--</div>
                    </div>
                    
                    <div class="hours-summary">
                        <div>
                            <div class="time-label">Heures travaillées</div>
                            <div class="time-display" id="totalHours">0h</div>
                        </div>
                        <div>
                            <div class="time-label">Temps de pause</div>
                            <div class="time-display" id="breakDuration">0min</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Historique des pointages -->
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2>📋 Historique des pointages</h2>
                    <button onclick="badgingManager.loadTimesheets()" class="btn btn-secondary">
                        🔄 Actualiser
                    </button>
                </div>
                
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Arrivée</th>
                                <th>Sortie</th>
                                <th>Heures</th>
                                <th>Statut</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody id="timesheetsTableBody">
                            <tr>
                                <td colspan="6" style="text-align: center; padding: 40px;">
                                    <div class="loading-spinner"></div>
                                    <p style="margin-top: 16px;">Chargement de l'historique...</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// Mise à jour de renderNavigation pour inclure le lien Badging actif
renderNavigation(activePath) {
    return `
        <div class="nav-tabs">
            <a href="#/dashboard" class="nav-tab ${activePath === '/dashboard' ? 'active' : ''}">📊 Dashboard</a>
            <a href="#/profile" class="nav-tab ${activePath === '/profile' ? 'active' : ''}">👤 Profil</a>
            <a href="#/team" class="nav-tab ${activePath === '/team' ? 'active' : ''}">👥 Équipe</a>
            <a href="#/badging" class="nav-tab ${activePath === '/badging' ? 'active' : ''}">⏰ Pointage</a>
            <button class="nav-tab" onclick="alert('Bientôt disponible!')">💬 Chat</button>
            <button class="nav-tab" onclick="alert('Bientôt disponible!')">📅 Planning</button>
        </div>
    `;
}

// Event listeners à ajouter dans la méthode init() du Router
setupBadgingListeners() {
    if (window.badgingManager && window.badgingManager.isInitialized) {
        window.addEventListener('timesheet:loaded', () => {
            if (window.location.hash.includes('/badging')) {
                this.updateBadgingView();
            }
        });

        window.addEventListener('badge:checkin', () => {
            if (window.location.hash.includes('/badging')) {
                this.updateBadgingView();
            }
        });

        window.addEventListener('badge:checkout', () => {
            if (window.location.hash.includes('/badging')) {
                this.updateBadgingView();
            }
        });

        window.addEventListener('badge:breakstart', () => {
            if (window.location.hash.includes('/badging')) {
                this.updateBadgingView();
            }
        });

        window.addEventListener('badge:breakend', () => {
            if (window.location.hash.includes('/badging')) {
                this.updateBadgingView();
            }
        });
    } else {
        setTimeout(() => this.setupBadgingListeners(), 100);
    }
}
