// js/modules/team/team-manager.js
// Gestionnaire d'équipe pour SYNERGIA v3.0

class TeamManager {
    constructor() {
        this.teamMembers = [];
        this.currentUser = null;
        this.filteredMembers = [];
        this.searchQuery = '';
        this.roleFilter = '';
        this.statusFilter = '';
        this.sortBy = 'name';
        this.sortOrder = 'asc';
        this.isLoading = false;
        
        // Configuration des rôles
        this.roles = {
            'admin': {
                label: 'Administrateur',
                color: '#dc3545',
                icon: 'user-shield',
                permissions: ['all']
            },
            'manager': {
                label: 'Manager',
                color: '#fd7e14',
                icon: 'user-tie',
                permissions: ['manage_team', 'view_reports', 'manage_planning']
            },
            'employee': {
                label: 'Employé',
                color: '#28a745',
                icon: 'user',
                permissions: ['view_team', 'manage_own_data']
            },
            'intern': {
                label: 'Stagiaire',
                color: '#17a2b8',
                icon: 'user-graduate',
                permissions: ['view_team']
            },
            'external': {
                label: 'Externe',
                color: '#6c757d',
                icon: 'user-friends',
                permissions: ['limited_access']
            }
        };
        
        // Configuration des statuts
        this.statuses = {
            'online': {
                label: 'En ligne',
                color: '#28a745',
                icon: 'circle'
            },
            'busy': {
                label: 'Occupé',
                color: '#dc3545',
                icon: 'minus-circle'
            },
            'away': {
                label: 'Absent',
                color: '#ffc107',
                icon: 'clock'
            },
            'offline': {
                label: 'Hors ligne',
                color: '#6c757d',
                icon: 'circle'
            }
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadSampleData();
        console.log('✅ Team Manager initialisé');
    }
    
    setupEventListeners() {
        // Navigation vers la page équipe
        document.addEventListener('page:change', (e) => {
            if (e.detail.page === 'team') {
                this.refreshTeamData();
            }
        });
        
        // Gestion des événements de l'interface
        document.addEventListener('click', (e) => {
            // Ajouter un membre
            if (e.target.matches('#add-member-btn') || e.target.closest('#add-member-btn')) {
                e.preventDefault();
                this.showAddMemberModal();
            }
            
            // Actions sur les membres
            if (e.target.matches('[data-member-action]') || e.target.closest('[data-member-action]')) {
                e.preventDefault();
                const btn = e.target.matches('[data-member-action]') ? e.target : e.target.closest('[data-member-action]');
                const action = btn.dataset.memberAction;
                const memberId = btn.dataset.memberId;
                this.handleMemberAction(action, memberId);
            }
            
            // Filtres et tri
            if (e.target.matches('#sort-members')) {
                this.toggleSort();
            }
            
            if (e.target.matches('#toggle-view')) {
                this.toggleViewMode();
            }
        });
        
        // Recherche en temps réel
        document.addEventListener('input', (e) => {
            if (e.target.matches('#team-search')) {
                this.searchQuery = e.target.value;
                this.filterAndRenderMembers();
            }
        });
        
        // Filtres
        document.addEventListener('change', (e) => {
            if (e.target.matches('#role-filter')) {
                this.roleFilter = e.target.value;
                this.filterAndRenderMembers();
            }
            
            if (e.target.matches('#status-filter')) {
                this.statusFilter = e.target.value;
                this.filterAndRenderMembers();
            }
        });
        
        // Authentification
        document.addEventListener('auth:login', (e) => {
            this.currentUser = e.detail.user;
            this.loadTeamData();
        });
    }
    
    async loadTeamData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingState();
        
        try {
            if (window.dataManager) {
                // Charger depuis DataManager avec cache
                this.teamMembers = await window.dataManager.getTeamMembers() || [];
            } else if (window.firebaseManager && window.firebaseManager.isReady) {
                // Charger depuis Firebase directement
                this.teamMembers = await window.firebaseManager.getCollection('teamMembers', {
                    field: 'displayName',
                    direction: 'asc'
                }) || [];
            }
            
            // Si pas de données, charger les données de démonstration
            if (this.teamMembers.length === 0) {
                this.loadSampleData();
            }
            
            this.filterAndRenderMembers();
            
        } catch (error) {
            console.error('❌ Erreur chargement équipe:', error);
            this.showError('Erreur lors du chargement de l\'équipe');
            this.loadSampleData(); // Fallback sur les données de démo
        } finally {
            this.isLoading = false;
            this.hideLoadingState();
        }
    }
    
    loadSampleData() {
        // Données de démonstration pour l'équipe
        this.teamMembers = [
            {
                id: '1',
                displayName: 'Marie Dubois',
                email: 'marie.dubois@synergia.com',
                role: 'admin',
                status: 'online',
                avatar: this.generateAvatar('Marie Dubois'),
                phone: '+33 6 12 34 56 78',
                department: 'Direction',
                joinedAt: new Date('2023-01-15'),
                lastSeen: new Date(),
                skills: ['Management', 'Stratégie', 'Leadership'],
                currentTask: 'Planification Q2 2025',
                workingHours: { start: '08:00', end: '18:00' },
                location: 'Bureau principal',
                stats: {
                    tasksCompleted: 156,
                    hoursWorked: 1840,
                    projectsLed: 12
                }
            },
            {
                id: '2',
                displayName: 'Pierre Martin',
                email: 'pierre.martin@synergia.com',
                role: 'manager',
                status: 'busy',
                avatar: this.generateAvatar('Pierre Martin'),
                phone: '+33 6 23 45 67 89',
                department: 'Développement',
                joinedAt: new Date('2023-03-10'),
                lastSeen: new Date(Date.now() - 300000), // 5 min ago
                skills: ['JavaScript', 'React', 'Node.js', 'Management'],
                currentTask: 'Code review - Module Planning',
                workingHours: { start: '09:00', end: '17:30' },
                location: 'Télétravail',
                stats: {
                    tasksCompleted: 234,
                    hoursWorked: 1650,
                    projectsLed: 8
                }
            },
            {
                id: '3',
                displayName: 'Sophie Leroy',
                email: 'sophie.leroy@synergia.com',
                role: 'employee',
                status: 'online',
                avatar: this.generateAvatar('Sophie Leroy'),
                phone: '+33 6 34 56 78 90',
                department: 'Design',
                joinedAt: new Date('2023-06-20'),
                lastSeen: new Date(),
                skills: ['UI/UX', 'Figma', 'Adobe Creative', 'Prototyping'],
                currentTask: 'Design système - Badging Interface',
                workingHours: { start: '08:30', end: '17:00' },
                location: 'Bureau principal',
                stats: {
                    tasksCompleted: 189,
                    hoursWorked: 1420,
                    projectsLed: 5
                }
            },
            {
                id: '4',
                displayName: 'Thomas Petit',
                email: 'thomas.petit@synergia.com',
                role: 'employee',
                status: 'away',
                avatar: this.generateAvatar('Thomas Petit'),
                phone: '+33 6 45 67 89 01',
                department: 'Développement',
                joinedAt: new Date('2023-09-05'),
                lastSeen: new Date(Date.now() - 1800000), // 30 min ago
                skills: ['Python', 'Firebase', 'API', 'DevOps'],
                currentTask: 'Pause déjeuner',
                workingHours: { start: '09:30', end: '18:30' },
                location: 'Bureau principal',
                stats: {
                    tasksCompleted: 98,
                    hoursWorked: 890,
                    projectsLed: 2
                }
            },
            {
                id: '5',
                displayName: 'Emma Garcia',
                email: 'emma.garcia@synergia.com',
                role: 'intern',
                status: 'online',
                avatar: this.generateAvatar('Emma Garcia'),
                phone: '+33 6 56 78 90 12',
                department: 'Marketing',
                joinedAt: new Date('2024-01-08'),
                lastSeen: new Date(),
                skills: ['Marketing Digital', 'Réseaux Sociaux', 'Content'],
                currentTask: 'Campagne Q2 - Réseaux sociaux',
                workingHours: { start: '09:00', end: '16:00' },
                location: 'Bureau principal',
                stats: {
                    tasksCompleted: 45,
                    hoursWorked: 320,
                    projectsLed: 1
                }
            },
            {
                id: '6',
                displayName: 'Lucas Moreau',
                email: 'lucas.moreau@external.com',
                role: 'external',
                status: 'offline',
                avatar: this.generateAvatar('Lucas Moreau'),
                phone: '+33 6 67 89 01 23',
                department: 'Consultant',
                joinedAt: new Date('2024-02-15'),
                lastSeen: new Date(Date.now() - 7200000), // 2h ago
                skills: ['Consulting', 'Process', 'Audit', 'Formation'],
                currentTask: 'Audit sécurité - Finalisation',
                workingHours: { start: '10:00', end: '16:00' },
                location: 'Client',
                stats: {
                    tasksCompleted: 23,
                    hoursWorked: 156,
                    projectsLed: 3
                }
            }
        ];
        
        this.filterAndRenderMembers();
    }
    
    filterAndRenderMembers() {
        let filtered = [...this.teamMembers];
        
        // Filtrage par recherche
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(member => 
                member.displayName.toLowerCase().includes(query) ||
                member.email.toLowerCase().includes(query) ||
                member.department.toLowerCase().includes(query) ||
                member.skills.some(skill => skill.toLowerCase().includes(query))
            );
        }
        
        // Filtrage par rôle
        if (this.roleFilter) {
            filtered = filtered.filter(member => member.role === this.roleFilter);
        }
        
        // Filtrage par statut
        if (this.statusFilter) {
            filtered = filtered.filter(member => member.status === this.statusFilter);
        }
        
        // Tri
        filtered.sort((a, b) => {
            let aValue, bValue;
            
            switch (this.sortBy) {
                case 'name':
                    aValue = a.displayName.toLowerCase();
                    bValue = b.displayName.toLowerCase();
                    break;
                case 'role':
                    aValue = a.role;
                    bValue = b.role;
                    break;
                case 'department':
                    aValue = a.department.toLowerCase();
                    bValue = b.department.toLowerCase();
                    break;
                case 'joined':
                    aValue = a.joinedAt;
                    bValue = b.joinedAt;
                    break;
                case 'status':
                    aValue = a.status;
                    bValue = b.status;
                    break;
                default:
                    aValue = a.displayName.toLowerCase();
                    bValue = b.displayName.toLowerCase();
            }
            
            if (aValue < bValue) return this.sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        
        this.filteredMembers = filtered;
        this.renderTeamMembers();
        this.updateTeamStats();
    }
    
    renderTeamMembers() {
        const container = document.getElementById('team-grid');
        if (!container) return;
        
        if (this.filteredMembers.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-users fa-3x"></i>
                    <h3>Aucun membre trouvé</h3>
                    <p>Aucun membre ne correspond à vos critères de recherche</p>
                    <button class="btn btn-primary" onclick="window.teamManager.clearFilters()">
                        <i class="fas fa-times"></i>
                        Effacer les filtres
                    </button>
                </div>
            `;
            return;
        }
        
        const membersHTML = this.filteredMembers.map(member => this.createMemberCard(member)).join('');
        container.innerHTML = membersHTML;
        
        // Animation d'entrée
        setTimeout(() => {
            const cards = container.querySelectorAll('.member-card');
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 50);
            });
        }, 10);
    }
    
    createMemberCard(member) {
        const role = this.roles[member.role];
        const status = this.statuses[member.status];
        const timeAgo = this.getTimeAgo(member.lastSeen);
        
        return `
            <div class="member-card" style="opacity: 0; transform: translateY(20px); transition: all 0.3s ease;">
                <div class="member-header">
                    <div class="member-avatar-container">
                        <img src="${member.avatar}" alt="${member.displayName}" class="member-avatar">
                        <div class="status-indicator status-${member.status}" title="${status.label}">
                            <i class="fas fa-${status.icon}"></i>
                        </div>
                    </div>
                    <div class="member-actions">
                        <button class="action-btn" data-member-action="message" data-member-id="${member.id}" title="Envoyer un message">
                            <i class="fas fa-comment"></i>
                        </button>
                        <button class="action-btn" data-member-action="call" data-member-id="${member.id}" title="Appeler">
                            <i class="fas fa-phone"></i>
                        </button>
                        <button class="action-btn" data-member-action="more" data-member-id="${member.id}" title="Plus d'options">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                </div>
                
                <div class="member-info">
                    <h3 class="member-name">${member.displayName}</h3>
                    <div class="member-role" style="color: ${role.color};">
                        <i class="fas fa-${role.icon}"></i>
                        <span>${role.label}</span>
                    </div>
                    <div class="member-department">
                        <i class="fas fa-building"></i>
                        <span>${member.department}</span>
                    </div>
                </div>
                
                <div class="member-status-info">
                    <div class="current-task">
                        <i class="fas fa-tasks"></i>
                        <span>${member.currentTask}</span>
                    </div>
                    <div class="last-seen">
                        <i class="fas fa-clock"></i>
                        <span>${timeAgo}</span>
                    </div>
                </div>
                
                <div class="member-details">
                    <div class="contact-info">
                        <div class="contact-item">
                            <i class="fas fa-envelope"></i>
                            <span>${member.email}</span>
                        </div>
                        <div class="contact-item">
                            <i class="fas fa-phone"></i>
                            <span>${member.phone}</span>
                        </div>
                        <div class="contact-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${member.location}</span>
                        </div>
                    </div>
                    
                    <div class="skills-container">
                        <div class="skills-label">Compétences:</div>
                        <div class="skills-list">
                            ${member.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                        </div>
                    </div>
                    
                    <div class="member-stats">
                        <div class="stat-item">
                            <span class="stat-number">${member.stats.tasksCompleted}</span>
                            <span class="stat-label">Tâches</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${Math.round(member.stats.hoursWorked / 8)}</span>
                            <span class="stat-label">Jours</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${member.stats.projectsLed}</span>
                            <span class="stat-label">Projets</span>
                        </div>
                    </div>
                </div>
                
                <div class="member-actions-extended">
                    <button class="btn btn-sm btn-primary" data-member-action="view-profile" data-member-id="${member.id}">
                        <i class="fas fa-user"></i>
                        Profil
                    </button>
                    <button class="btn btn-sm btn-secondary" data-member-action="view-schedule" data-member-id="${member.id}">
                        <i class="fas fa-calendar"></i>
                        Planning
                    </button>
                </div>
            </div>
        `;
    }
    
    updateTeamStats() {
        // Statistiques globales de l'équipe
        const totalMembers = this.teamMembers.length;
        const onlineMembers = this.teamMembers.filter(m => m.status === 'online').length;
        const activeProjects = this.teamMembers.reduce((sum, m) => sum + m.stats.projectsLed, 0);
        const totalTasks = this.teamMembers.reduce((sum, m) => sum + m.stats.tasksCompleted, 0);
        
        // Mise à jour des compteurs dans le header si ils existent
        const teamCountEl = document.getElementById('team-count');
        if (teamCountEl) {
            teamCountEl.textContent = totalMembers;
        }
        
        // Mise à jour des stats dans le dashboard
        this.updateDashboardStats(totalMembers, onlineMembers, activeProjects, totalTasks);
        
        // Affichage des stats dans la page équipe
        this.renderTeamStatsCard(totalMembers, onlineMembers, activeProjects, totalTasks);
    }
    
    renderTeamStatsCard(total, online, projects, tasks) {
        const statsContainer = document.getElementById('team-stats');
        if (!statsContainer) return;
        
        statsContainer.innerHTML = `
            <div class="team-stats-grid">
                <div class="team-stat-card">
                    <div class="stat-icon" style="background: var(--primary-color);">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-content">
                        <h3>${total}</h3>
                        <p>Membres total</p>
                    </div>
                </div>
                
                <div class="team-stat-card">
                    <div class="stat-icon" style="background: var(--success-color);">
                        <i class="fas fa-circle"></i>
                    </div>
                    <div class="stat-content">
                        <h3>${online}</h3>
                        <p>En ligne</p>
                    </div>
                </div>
                
                <div class="team-stat-card">
                    <div class="stat-icon" style="background: var(--info-color);">
                        <i class="fas fa-project-diagram"></i>
                    </div>
                    <div class="stat-content">
                        <h3>${projects}</h3>
                        <p>Projets actifs</p>
                    </div>
                </div>
                
                <div class="team-stat-card">
                    <div class="stat-icon" style="background: var(--warning-color);">
                        <i class="fas fa-tasks"></i>
                    </div>
                    <div class="stat-content">
                        <h3>${tasks}</h3>
                        <p>Tâches réalisées</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    handleMemberAction(action, memberId) {
        const member = this.teamMembers.find(m => m.id === memberId);
        if (!member) return;
        
        switch (action) {
            case 'message':
                this.openChat(member);
                break;
            case 'call':
                this.initiateCall(member);
                break;
            case 'view-profile':
                this.showMemberProfile(member);
                break;
            case 'view-schedule':
                this.showMemberSchedule(member);
                break;
            case 'edit':
                this.editMember(member);
                break;
            case 'delete':
                this.deleteMember(member);
                break;
            case 'more':
                this.showMemberMenu(member);
                break;
        }
    }
    
    showAddMemberModal() {
        // Créer et afficher la modale d'ajout de membre
        const modal = this.createModal('add-member', 'Ajouter un membre d\'équipe', this.getAddMemberForm());
        this.showModal(modal);
    }
    
    getAddMemberForm() {
        const roleOptions = Object.entries(this.roles).map(([key, role]) => 
            `<option value="${key}">${role.label}</option>`
        ).join('');
        
        return `
            <form id="add-member-form" class="member-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="member-name" class="form-label">Nom complet *</label>
                        <input type="text" id="member-name" name="displayName" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="member-email" class="form-label">Email *</label>
                        <input type="email" id="member-email" name="email" class="form-input" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="member-phone" class="form-label">Téléphone</label>
                        <input type="tel" id="member-phone" name="phone" class="form-input">
                    </div>
                    <div class="form-group">
                        <label for="member-role" class="form-label">Rôle *</label>
                        <select id="member-role" name="role" class="form-select" required>
                            <option value="">Sélectionner un rôle</option>
                            ${roleOptions}
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="member-department" class="form-label">Département</label>
                        <input type="text" id="member-department" name="department" class="form-input">
                    </div>
                    <div class="form-group">
                        <label for="member-location" class="form-label">Localisation</label>
                        <select id="member-location" name="location" class="form-select">
                            <option value="Bureau principal">Bureau principal</option>
                            <option value="Télétravail">Télétravail</option>
                            <option value="Client">Chez le client</option>
                            <option value="Terrain">Terrain</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="member-skills" class="form-label">Compétences (séparées par des virgules)</label>
                    <textarea id="member-skills" name="skills" class="form-textarea" rows="2" 
                              placeholder="JavaScript, React, Management, etc."></textarea>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="window.teamManager.closeModal()">
                        Annuler
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-plus"></i>
                        Ajouter le membre
                    </button>
                </div>
            </form>
        `;
    }
    
    async addMember(memberData) {
        try {
            const newMember = {
                id: this.generateId(),
                displayName: memberData.displayName,
                email: memberData.email,
                phone: memberData.phone || '',
                role: memberData.role,
                department: memberData.department || 'Non spécifié',
                location: memberData.location || 'Bureau principal',
                status: 'offline',
                avatar: this.generateAvatar(memberData.displayName),
                skills: memberData.skills ? memberData.skills.split(',').map(s => s.trim()) : [],
                joinedAt: new Date(),
                lastSeen: new Date(),
                currentTask: 'Nouveau membre',
                workingHours: { start: '09:00', end: '17:00' },
                stats: {
                    tasksCompleted: 0,
                    hoursWorked: 0,
                    projectsLed: 0
                }
            };
            
            // Ajouter à Firebase si disponible
            if (window.dataManager) {
                await window.dataManager.addTeamMember(newMember);
            }
            
            // Ajouter localement
            this.teamMembers.push(newMember);
            this.filterAndRenderMembers();
            
            this.closeModal();
            this.showToast(`${newMember.displayName} a été ajouté à l'équipe`, 'success');
            
        } catch (error) {
            console.error('❌ Erreur ajout membre:', error);
            this.showToast('Erreur lors de l\'ajout du membre', 'error');
        }
    }
    
    // Utilitaires
    generateAvatar(name) {
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'];
        const color = colors[name.length % colors.length];
        
        return `data:image/svg+xml,${encodeURIComponent(`
            <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="50" fill="${color}"/>
                <text x="50" y="50" text-anchor="middle" dy="0.35em" 
                      font-family="Arial, sans-serif" font-size="36" fill="white" font-weight="bold">
                    ${initials}
                </text>
            </svg>
        `)}`;
    }
    
    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'À l\'instant';
        if (minutes < 60) return `Il y a ${minutes} min`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Il y a ${hours}h`;
        
        const days = Math.floor(hours / 24);
        if (days < 7) return `Il y a ${days}j`;
        
        return date.toLocaleDateString('fr-FR');
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // Interface helpers
    showLoadingState() {
        const container = document.getElementById('team-grid');
        if (container) {
            container.innerHTML = `
                <div class="loading-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                    <div class="spinner" style="margin: 0 auto 1rem;"></div>
                    <p>Chargement de l'équipe...</p>
                </div>
            `;
        }
    }
    
    hideLoadingState() {
        // Le loading sera remplacé par le contenu réel
    }
    
    showError(message) {
        this.showToast(message, 'error');
    }
    
    showToast(message, type = 'info') {
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // Utiliser le système de toast existant ou créer un simple
        if (window.badgingManager && window.badgingManager.showToast) {
            window.badgingManager.showToast(message, type);
        } else {
            alert(message);
        }
    }
    
    refreshTeamData() {
        this.loadTeamData();
    }
    
    clearFilters() {
        this.searchQuery = '';
        this.roleFilter = '';
        this.statusFilter = '';
        
        // Reset UI
        const searchInput = document.getElementById('team-search');
        const roleSelect = document.getElementById('role-filter');
        const statusSelect = document.getElementById('status-filter');
        
        if (searchInput) searchInput.value = '';
        if (roleSelect) roleSelect.value = '';
        if (statusSelect) statusSelect.value = '';
        
        this.filterAndRenderMembers();
    }
    
    // API publique
    getTeamMembers() {
        return this.teamMembers;
    }
    
    getMemberById(id) {
        return this.teamMembers.find(m => m.id === id);
    }
    
    getOnlineMembers() {
        return this.teamMembers.filter(m => m.status === 'online');
    }
    
    getMembersByRole(role) {
        return this.teamMembers.filter(m => m.role === role);
    }
}

// Initialiser le Team Manager
document.addEventListener('DOMContentLoaded', () => {
    window.teamManager = new TeamManager();
});

// Export pour les modules ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TeamManager;
}
