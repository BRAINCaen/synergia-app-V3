/**
 * TeamManager - Gestionnaire d'équipe pour SYNERGIA v3.0
 * Fichier: src/js/managers/TeamManager.js
 */

import firebaseService from '../core/firebase-service.js';
import Logger from '../core/logger.js';

export class TeamManager {
    constructor() {
        this.teamMembers = [];
        this.isInitialized = false;
    }

    async initialize() {
        try {
            this.isInitialized = true;
            Logger.info('TeamManager initialized');
        } catch (error) {
            Logger.error('Error initializing TeamManager:', error);
            throw error;
        }
    }

    // ==================
    // GESTION DES MEMBRES
    // ==================

    async loadTeamMembers() {
        try {
            // Charger tous les profils utilisateurs
            const profiles = await firebaseService.queryDocuments('user_profiles', [], [['displayName', 'asc']]);
            
            this.teamMembers = profiles.map(profile => ({
                id: profile.id,
                userId: profile.userId,
                email: profile.email,
                displayName: profile.displayName,
                photoURL: profile.photoURL,
                role: profile.role,
                department: profile.department,
                position: profile.position,
                status: profile.status,
                lastSeen: profile.lastSeen,
                createdAt: profile.createdAt
            }));

            Logger.info(`Loaded ${this.teamMembers.length} team members`);
            return this.teamMembers;

        } catch (error) {
            Logger.error('Error loading team members:', error);
            return [];
        }
    }

    async addTeamMember(memberData) {
        try {
            const newMember = {
                ...memberData,
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const memberRef = await firebaseService.addDocument('user_profiles', newMember);
            const member = { id: memberRef.id, ...newMember };
            
            this.teamMembers.push(member);
            Logger.info('Team member added:', member.email);
            
            return member;

        } catch (error) {
            Logger.error('Error adding team member:', error);
            throw error;
        }
    }

    async updateTeamMember(memberId, updates) {
        try {
            const updateData = {
                ...updates,
                updatedAt: new Date().toISOString()
            };

            await firebaseService.updateDocument('user_profiles', memberId, updateData);
            
            // Mettre à jour localement
            const memberIndex = this.teamMembers.findIndex(m => m.id === memberId);
            if (memberIndex > -1) {
                Object.assign(this.teamMembers[memberIndex], updateData);
            }

            Logger.info('Team member updated:', memberId);
            return this.teamMembers[memberIndex];

        } catch (error) {
            Logger.error('Error updating team member:', error);
            throw error;
        }
    }

    async removeTeamMember(memberId) {
        try {
            // Marquer comme inactif plutôt que supprimer
            await this.updateTeamMember(memberId, { status: 'inactive' });
            
            Logger.info('Team member deactivated:', memberId);

        } catch (error) {
            Logger.error('Error removing team member:', error);
            throw error;
        }
    }

    // ==================
    // RECHERCHE ET FILTRES
    // ==================

    getTeamMembers() {
        return this.teamMembers.filter(member => member.status === 'active');
    }

    getTeamMemberById(memberId) {
        return this.teamMembers.find(member => member.id === memberId);
    }

    getTeamMemberByUserId(userId) {
        return this.teamMembers.find(member => member.userId === userId);
    }

    getTeamMembersByRole(role) {
        return this.teamMembers.filter(member => 
            member.role === role && member.status === 'active'
        );
    }

    getTeamMembersByDepartment(department) {
        return this.teamMembers.filter(member => 
            member.department === department && member.status === 'active'
        );
    }

    searchTeamMembers(query) {
        const searchTerm = query.toLowerCase();
        return this.teamMembers.filter(member => 
            member.status === 'active' && (
                member.displayName?.toLowerCase().includes(searchTerm) ||
                member.email?.toLowerCase().includes(searchTerm) ||
                member.department?.toLowerCase().includes(searchTerm) ||
                member.position?.toLowerCase().includes(searchTerm)
            )
        );
    }

    // ==================
    // STATISTIQUES
    // ==================

    getTeamStats() {
        const activeMembers = this.getTeamMembers();
        
        const stats = {
            totalMembers: activeMembers.length,
            byRole: {},
            byDepartment: {},
            onlineMembers: 0,
            recentlyActive: 0
        };

        // Compter par rôle
        activeMembers.forEach(member => {
            const role = member.role || 'employee';
            stats.byRole[role] = (stats.byRole[role] || 0) + 1;
        });

        // Compter par département
        activeMembers.forEach(member => {
            const dept = member.department || 'Non défini';
            stats.byDepartment[dept] = (stats.byDepartment[dept] || 0) + 1;
        });

        // Calculer les membres en ligne et récemment actifs
        const now = new Date();
        activeMembers.forEach(member => {
            if (member.lastSeen) {
                const lastSeen = new Date(member.lastSeen);
                const diffMinutes = (now - lastSeen) / (1000 * 60);
                
                if (diffMinutes < 5) {
                    stats.onlineMembers++;
                } else if (diffMinutes < 30) {
                    stats.recentlyActive++;
                }
            }
        });

        return stats;
    }

    getDepartments() {
        const departments = new Set();
        this.teamMembers.forEach(member => {
            if (member.department && member.status === 'active') {
                departments.add(member.department);
            }
        });
        return Array.from(departments).sort();
    }

    getRoles() {
        const roles = new Set();
        this.teamMembers.forEach(member => {
            if (member.role && member.status === 'active') {
                roles.add(member.role);
            }
        });
        return Array.from(roles).sort();
    }

    // ==================
    // PRÉSENCE ET ACTIVITÉ
    // ==================

    async updateMemberPresence(userId, status = 'online') {
        try {
            const member = this.getTeamMemberByUserId(userId);
            if (member) {
                await this.updateTeamMember(member.id, {
                    lastSeen: new Date().toISOString(),
                    presenceStatus: status
                });
            }
        } catch (error) {
            Logger.error('Error updating member presence:', error);
        }
    }

    getMemberPresenceStatus(member) {
        if (!member.lastSeen) return 'offline';
        
        const now = new Date();
        const lastSeen = new Date(member.lastSeen);
        const diffMinutes = (now - lastSeen) / (1000 * 60);
        
        if (diffMinutes < 5) return 'online';
        if (diffMinutes < 30) return 'away';
        return 'offline';
    }

    getOnlineMembers() {
        return this.teamMembers.filter(member => 
            member.status === 'active' && 
            this.getMemberPresenceStatus(member) === 'online'
        );
    }

    // ==================
    // PERMISSIONS ET RÔLES
    // ==================

    async assignRole(memberId, newRole, assignedBy) {
        try {
            await this.updateTeamMember(memberId, {
                role: newRole,
                roleAssignedBy: assignedBy,
                roleAssignedAt: new Date().toISOString()
            });

            Logger.info(`Role ${newRole} assigned to member ${memberId} by ${assignedBy}`);

        } catch (error) {
            Logger.error('Error assigning role:', error);
            throw error;
        }
    }

    canManageMember(currentUserRole, targetMemberRole) {
        const roleHierarchy = {
            admin: 3,
            manager: 2,
            employee: 1
        };

        const currentLevel = roleHierarchy[currentUserRole] || 0;
        const targetLevel = roleHierarchy[targetMemberRole] || 0;

        return currentLevel > targetLevel;
    }

    // ==================
    // ACTIVITÉ RÉCENTE
    // ==================

    async getRecentActivity(limit = 10) {
        try {
            // Récupérer les activités récentes de l'équipe
            const activities = await firebaseService.queryDocuments(
                'team_activities', 
                [], 
                [['createdAt', 'desc']], 
                limit
            );

            return activities;

        } catch (error) {
            Logger.error('Error getting recent activity:', error);
            return [];
        }
    }

    async logActivity(activityType, description, userId = null) {
        try {
            const activityData = {
                type: activityType,
                description: description,
                userId: userId,
                createdAt: new Date().toISOString()
            };

            await firebaseService.addDocument('team_activities', activityData);
            Logger.info('Team activity logged:', activityType);

        } catch (error) {
            Logger.error('Error logging team activity:', error);
        }
    }

    // ==================
    // EXPORT ET RAPPORTS
    // ==================

    exportTeamData(format = 'csv') {
        const activeMembers = this.getTeamMembers();
        
        if (format === 'csv') {
            return this.exportToCSV(activeMembers);
        } else if (format === 'json') {
            return this.exportToJSON(activeMembers);
        }
    }

    exportToCSV(members) {
        const headers = [
            'Nom', 'Email', 'Rôle', 'Département', 'Poste', 
            'Statut', 'Dernière connexion', 'Date de création'
        ];
        
        const rows = members.map(member => [
            member.displayName || '',
            member.email || '',
            member.role || '',
            member.department || '',
            member.position || '',
            member.status || '',
            member.lastSeen ? new Date(member.lastSeen).toLocaleString('fr-FR') : '',
            member.createdAt ? new Date(member.createdAt).toLocaleDateString('fr-FR') : ''
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        return csvContent;
    }

    exportToJSON(members) {
        return JSON.stringify(members, null, 2);
    }

    // ==================
    // NETTOYAGE
    // ==================

    destroy() {
        this.teamMembers = [];
        this.isInitialized = false;
        Logger.info('TeamManager destroyed');
    }
}

export default TeamManager;
