class TeamManager {
    constructor() {
        this.members = [];
        this.currentUser = null;
        this.init();
    }

    async init() {
        console.log('✅ Team Manager initialisé');
        await this.loadMembers();
        this.setupEventListeners();
    }

    async loadMembers() {
        try {
            const user = auth.currentUser;
            if (!user) {
                console.log('❌ Utilisateur non connecté pour charger les membres');
                return;
            }

            const membersRef = collection(db, 'teams', user.uid, 'members');
            const snapshot = await getDocs(membersRef);
            
            this.members = [];
            snapshot.forEach(doc => {
                const memberData = doc.data();
                this.members.push({
                    id: doc.id,
                    name: memberData.name || '',
                    email: memberData.email || '',
                    role: memberData.role || 'Membre',
                    avatar: memberData.avatar || 'assets/default-avatar.png',
                    status: memberData.status || 'offline',
                    joinDate: memberData.joinDate || new Date(),
                    xp: memberData.xp || 0,
                    level: memberData.level || 1,
                    badges: memberData.badges || []
                });
            });

            console.log(`✅ ${this.members.length} membres chargés depuis Firebase`);
            this.renderMembers();
        } catch (error) {
            console.error('❌ Erreur lors du chargement des membres:', error);
            // Charger des données de démonstration en cas d'erreur
            this.loadDemoMembers();
        }
    }

    loadDemoMembers() {
        this.members = [
            {
                id: 'demo1',
                name: 'Allan Boehme',
                email: 'alan.boehme61@gmail.com',
                role: 'Manager',
                avatar: 'assets/avatars/alan.jpg',
                status: 'online',
                joinDate: new Date('2024-01-15'),
                xp: 1250,
                level: 5,
                badges: ['early_bird', 'team_player', 'innovator']
            },
            {
                id: 'demo2',
                name: 'Marie Dubois',
                email: 'marie.dubois@synergia.com',
                role: 'Développeur',
                avatar: 'assets/avatars/marie.jpg',
                status: 'online',
                joinDate: new Date('2024-02-01'),
                xp: 980,
                level: 4,
                badges: ['code_master', 'team_player']
            },
            {
                id: 'demo3',
                name: 'Thomas Martin',
                email: 'thomas.martin@synergia.com',
                role: 'Designer',
                avatar: 'assets/avatars/thomas.jpg',
                status: 'away',
                joinDate: new Date('2024-03-10'),
                xp: 750,
                level: 3,
                badges: ['creative', 'perfectionist']
            }
        ];
        console.log('👥 Membres de démonstration chargés');
        this.renderMembers();
    }

    setupEventListeners() {
        // Recherche de membres
        const searchInput = document.getElementById('team-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterAndRenderMembers(e.target.value);
            });
        }

        // Bouton d'ajout de membre
        const addMemberBtn = document.getElementById('add-member-btn');
        if (addMemberBtn) {
            addMemberBtn.addEventListener('click', () => {
                this.showAddMemberModal();
            });
        }

        // Modal d'ajout de membre
        const addMemberModal = document.getElementById('add-member-modal');
        const addMemberForm = document.getElementById('add-member-form');
        const cancelAddBtn = document.getElementById('cancel-add-member');

        if (addMemberForm) {
            addMemberForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addMember();
            });
        }

        if (cancelAddBtn) {
            cancelAddBtn.addEventListener('click', () => {
                this.hideAddMemberModal();
            });
        }

        // Fermer modal en cliquant à l'extérieur
        if (addMemberModal) {
            addMemberModal.addEventListener('click', (e) => {
                if (e.target === addMemberModal) {
                    this.hideAddMemberModal();
                }
            });
        }
    }

   // HOTFIX IMMÉDIAT - Remplacer la méthode filterAndRenderMembers ligne ~5480

filterAndRenderMembers(searchTerm = '') {
    try {
        // Protection contre les données undefined/null
        if (!this.members || !Array.isArray(this.members)) {
            console.warn('⚠️ Aucun membre à filtrer');
            this.renderMembers([]);
            return;
        }

        const filteredMembers = this.members.filter(member => {
            // Vérification que member existe
            if (!member) return false;
            
            // Protection contre toutes les propriétés undefined
            const name = (member.name || '').toString().toLowerCase();
            const email = (member.email || '').toString().toLowerCase();
            const role = (member.role || '').toString().toLowerCase();
            
            const search = (searchTerm || '').toString().toLowerCase();
            
            return name.includes(search) ||
                   email.includes(search) ||
                   role.includes(search);
        });
        
        this.renderMembers(filteredMembers);
        
    } catch (error) {
        console.error('❌ Erreur lors du filtrage des membres:', error);
        // En cas d'erreur, afficher tous les membres sans filtrage
        this.renderMembers(this.members || []);
    }
}

    renderMembers(membersToRender = this.members) {
        const container = document.getElementById('team-members-list');
        if (!container) {
            console.warn('⚠️ Container team-members-list non trouvé');
            return;
        }

        container.innerHTML = '';

        if (membersToRender.length === 0) {
            container.innerHTML = `
                <div class="no-members">
                    <i class="fas fa-users"></i>
                    <p>Aucun membre trouvé</p>
                </div>
            `;
            return;
        }

        membersToRender.forEach(member => {
            const memberCard = this.createMemberCard(member);
            container.appendChild(memberCard);
        });

        console.log(`👥 ${membersToRender.length} membres d'équipe chargés`);
    }

    createMemberCard(member) {
        const card = document.createElement('div');
        card.className = 'team-member-card';
        card.dataset.memberId = member.id;

        const statusClass = member.status === 'online' ? 'online' : 
                           member.status === 'away' ? 'away' : 'offline';

        card.innerHTML = `
            <div class="member-avatar">
                <img src="${member.avatar}" alt="${member.name}" onerror="this.src='assets/default-avatar.png'">
                <div class="status-indicator ${statusClass}"></div>
            </div>
            <div class="member-info">
                <h3>${member.name}</h3>
                <p class="member-role">${member.role}</p>
                <p class="member-email">${member.email}</p>
                <div class="member-stats">
                    <span class="member-level">Niveau ${member.level}</span>
                    <span class="member-xp">${member.xp} XP</span>
                </div>
                <div class="member-badges">
                    ${member.badges.map(badge => `<span class="badge ${badge}">${this.getBadgeName(badge)}</span>`).join('')}
                </div>
            </div>
            <div class="member-actions">
                <button class="btn-icon" onclick="teamManager.sendMessage('${member.id}')" title="Envoyer un message">
                    <i class="fas fa-envelope"></i>
                </button>
                <button class="btn-icon" onclick="teamManager.showMemberOptions('${member.id}')" title="Plus d'options">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </div>
        `;

        return card;
    }

    getBadgeName(badgeId) {
        const badges = {
            'early_bird': 'Lève-tôt',
            'team_player': 'Équipier',
            'innovator': 'Innovateur',
            'code_master': 'Maître du Code',
            'creative': 'Créatif',
            'perfectionist': 'Perfectionniste',
            'leader': 'Leader',
            'mentor': 'Mentor'
        };
        return badges[badgeId] || badgeId;
    }

    showAddMemberModal() {
        console.log('INFO: Fonctionnalité d\'ajout de membre - En développement');
        const modal = document.getElementById('add-member-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    hideAddMemberModal() {
        const modal = document.getElementById('add-member-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Reset form
        const form = document.getElementById('add-member-form');
        if (form) {
            form.reset();
        }
    }

    async addMember() {
        try {
            const name = document.getElementById('member-name').value.trim();
            const email = document.getElementById('member-email').value.trim();
            const role = document.getElementById('member-role').value;

            if (!name || !email) {
                alert('Veuillez remplir tous les champs requis');
                return;
            }

            const user = auth.currentUser;
            if (!user) {
                alert('Vous devez être connecté pour ajouter un membre');
                return;
            }

            const newMember = {
                name,
                email,
                role,
                avatar: 'assets/default-avatar.png',
                status: 'offline',
                joinDate: new Date(),
                xp: 0,
                level: 1,
                badges: []
            };

            // Ajouter à Firebase
            const membersRef = collection(db, 'teams', user.uid, 'members');
            const docRef = await addDoc(membersRef, newMember);
            
            // Ajouter à la liste locale
            newMember.id = docRef.id;
            this.members.push(newMember);

            // Rafraîchir l'affichage
            this.renderMembers();
            this.hideAddMemberModal();

            console.log('✅ Nouveau membre ajouté:', name);
            alert(`Membre ${name} ajouté avec succès !`);

        } catch (error) {
            console.error('❌ Erreur lors de l\'ajout du membre:', error);
            alert('Erreur lors de l\'ajout du membre');
        }
    }

    sendMessage(memberId) {
        const member = this.members.find(m => m.id === memberId);
        if (member) {
            console.log(`INFO: Message à ${member.name}`);
            // Intégration avec le Chat Manager
            if (window.chatManager) {
                window.chatManager.startPrivateChat(memberId);
            }
        }
    }

    showMemberOptions(memberId) {
        const member = this.members.find(m => m.id === memberId);
        if (member) {
            console.log(`INFO: Options pour ${member.name}`);
            // Afficher un menu contextuel avec les options
            this.showMemberContextMenu(member);
        }
    }

    showMemberContextMenu(member) {
        // Créer un menu contextuel dynamique
        const existingMenu = document.querySelector('.member-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement('div');
        menu.className = 'member-context-menu';
        menu.innerHTML = `
            <div class="context-menu-item" onclick="teamManager.viewMemberProfile('${member.id}')">
                <i class="fas fa-user"></i> Voir le profil
            </div>
            <div class="context-menu-item" onclick="teamManager.sendMessage('${member.id}')">
                <i class="fas fa-envelope"></i> Envoyer un message
            </div>
            <div class="context-menu-item" onclick="teamManager.assignTask('${member.id}')">
                <i class="fas fa-tasks"></i> Assigner une tâche
            </div>
            <div class="context-menu-item" onclick="teamManager.viewMemberStats('${member.id}')">
                <i class="fas fa-chart-bar"></i> Voir les statistiques
            </div>
        `;

        document.body.appendChild(menu);

        // Positionner le menu
        const event = window.event;
        if (event) {
            menu.style.left = event.pageX + 'px';
            menu.style.top = event.pageY + 'px';
        }

        // Fermer le menu en cliquant ailleurs
        setTimeout(() => {
            document.addEventListener('click', function closeMenu() {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            });
        }, 100);
    }

    viewMemberProfile(memberId) {
        const member = this.members.find(m => m.id === memberId);
        if (member) {
            console.log(`INFO: Profil de ${member.name}`);
            // Afficher le profil détaillé du membre
            this.showMemberProfileModal(member);
        }
    }

    showMemberProfileModal(member) {
        // Créer une modal de profil dynamique
        const modalHtml = `
            <div id="member-profile-modal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="document.getElementById('member-profile-modal').remove()">&times;</span>
                    <div class="member-profile">
                        <div class="profile-header">
                            <img src="${member.avatar}" alt="${member.name}" class="profile-avatar">
                            <div class="profile-info">
                                <h2>${member.name}</h2>
                                <p class="profile-role">${member.role}</p>
                                <p class="profile-email">${member.email}</p>
                            </div>
                        </div>
                        <div class="profile-stats">
                            <div class="stat">
                                <h3>Niveau</h3>
                                <p>${member.level}</p>
                            </div>
                            <div class="stat">
                                <h3>Expérience</h3>
                                <p>${member.xp} XP</p>
                            </div>
                            <div class="stat">
                                <h3>Date d'arrivée</h3>
                                <p>${new Date(member.joinDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div class="profile-badges">
                            <h3>Badges obtenus</h3>
                            <div class="badges-list">
                                ${member.badges.map(badge => `
                                    <span class="badge ${badge}">${this.getBadgeName(badge)}</span>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    assignTask(memberId) {
        const member = this.members.find(m => m.id === memberId);
        if (member) {
            console.log(`INFO: Assigner une tâche à ${member.name}`);
            // Intégration avec le système de tâches/quêtes
            if (window.questManager) {
                window.questManager.showAssignQuestModal(memberId);
            }
        }
    }

    viewMemberStats(memberId) {
        const member = this.members.find(m => m.id === memberId);
        if (member) {
            console.log(`INFO: Statistiques de ${member.name}`);
            // Intégration avec Analytics Manager
            if (window.analyticsManager) {
                window.analyticsManager.showMemberAnalytics(memberId);
            }
        }
    }

    // Méthodes pour l'intégration avec d'autres managers
    updateMemberXP(memberId, xpGained) {
        const member = this.members.find(m => m.id === memberId);
        if (member) {
            member.xp += xpGained;
            
            // Vérifier si le membre monte de niveau
            const newLevel = Math.floor(member.xp / 250) + 1;
            if (newLevel > member.level) {
                member.level = newLevel;
                console.log(`🎉 ${member.name} monte au niveau ${newLevel}!`);
                this.showLevelUpNotification(member);
            }

            // Sauvegarder en Firebase
            this.saveMemberToFirebase(member);
            
            // Rafraîchir l'affichage
            this.renderMembers();
        }
    }

    addBadgeToMember(memberId, badgeId) {
        const member = this.members.find(m => m.id === memberId);
        if (member && !member.badges.includes(badgeId)) {
            member.badges.push(badgeId);
            console.log(`🏆 ${member.name} obtient le badge: ${this.getBadgeName(badgeId)}`);
            
            // Sauvegarder en Firebase
            this.saveMemberToFirebase(member);
            
            // Rafraîchir l'affichage
            this.renderMembers();

            // Afficher notification
            this.showBadgeNotification(member, badgeId);
        }
    }

    showLevelUpNotification(member) {
        // Afficher une notification de montée de niveau
        const notification = document.createElement('div');
        notification.className = 'level-up-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-star"></i>
                <h3>Niveau supérieur !</h3>
                <p>${member.name} atteint le niveau ${member.level}</p>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    showBadgeNotification(member, badgeId) {
        // Afficher une notification de nouveau badge
        const notification = document.createElement('div');
        notification.className = 'badge-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-trophy"></i>
                <h3>Nouveau badge !</h3>
                <p>${member.name} obtient: ${this.getBadgeName(badgeId)}</p>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    async saveMemberToFirebase(member) {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const memberRef = doc(db, 'teams', user.uid, 'members', member.id);
            await updateDoc(memberRef, {
                name: member.name,
                email: member.email,
                role: member.role,
                avatar: member.avatar,
                status: member.status,
                xp: member.xp,
                level: member.level,
                badges: member.badges
            });

            console.log(`✅ Membre ${member.name} sauvegardé`);
        } catch (error) {
            console.error('❌ Erreur sauvegarde membre:', error);
        }
    }

    // Méthode pour obtenir un membre par ID
    getMemberById(memberId) {
        return this.members.find(m => m.id === memberId);
    }

    // Méthode pour obtenir tous les membres
    getAllMembers() {
        return this.members;
    }

    // Méthode pour rafraîchir la liste des membres
    async refreshMembers() {
        await this.loadMembers();
    }
}
