// js/modules/notifications/notification-manager.js
// Gestionnaire de notifications pour SYNERGIA v3.0

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.isVisible = false;
        this.listeners = [];
        this.currentUser = null;
        this.pushSubscription = null;
        this.soundEnabled = true;
        this.vibrationEnabled = true;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupServiceWorker();
        this.loadSettings();
        
        // Attendre Firebase et auth
        document.addEventListener('firebase:ready', () => {
            this.setupFirebaseListeners();
        });
        
        document.addEventListener('auth:login', (e) => {
            this.currentUser = e.detail.user;
            this.loadNotifications();
            this.requestPermission();
        });
        
        document.addEventListener('auth:logout', () => {
            this.clearNotifications();
        });
        
        console.log('✅ Notification Manager initialisé');
    }
    
    setupEventListeners() {
        // Bouton notifications
        document.addEventListener('click', (e) => {
            if (e.target.matches('#notifications-btn') || e.target.closest('#notifications-btn')) {
                e.preventDefault();
                this.toggleNotificationCenter();
            }
            
            if (e.target.matches('#close-notifications')) {
                this.hideNotificationCenter();
            }
            
            // Actions sur notifications
            if (e.target.matches('[data-action="mark-read"]')) {
                const notificationId = e.target.dataset.notificationId;
                this.markAsRead(notificationId);
            }
            
            if (e.target.matches('[data-action="mark-all-read"]')) {
                this.markAllAsRead();
            }
            
            if (e.target.matches('[data-action="delete-notification"]')) {
                const notificationId = e.target.dataset.notificationId;
                this.deleteNotification(notificationId);
            }
            
            if (e.target.matches('[data-action="clear-all"]')) {
                this.clearAllNotifications();
            }
        });
        
        // Fermer avec Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hideNotificationCenter();
            }
        });
        
        // Clic en dehors pour fermer
        document.addEventListener('click', (e) => {
            const notificationCenter = document.getElementById('notifications-center');
            const notificationBtn = document.getElementById('notifications-btn');
            
            if (this.isVisible && 
                notificationCenter && 
                !notificationCenter.contains(e.target) && 
                !notificationBtn.contains(e.target)) {
                this.hideNotificationCenter();
            }
        });
        
        // Écouter les événements système
        document.addEventListener('page:change', () => {
            this.hideNotificationCenter();
        });
        
        // Écouter la visibilité de la page
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.markActiveNotificationsAsRead();
            }
        });
    }
    
    setupServiceWorker() {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.ready.then(registration => {
                this.swRegistration = registration;
                this.checkPushSubscription();
            });
        }
    }
    
    setupFirebaseListeners() {
        if (!window.firebaseManager) return;
        
        // Écouter les notifications pour l'utilisateur actuel
        this.listeners.push(
            window.firebaseManager.onSnapshot('notifications', (notifications) => {
                this.handleNewNotifications(notifications);
            }, {
                where: [
                    { field: 'recipientId', operator: '==', value: this.currentUser?.uid }
                ],
                orderBy: { field: 'createdAt', direction: 'desc' },
                limit: 50
            })
        );
    }
    
    loadSettings() {
        try {
            const settings = localStorage.getItem('synergia_notification_settings');
            if (settings) {
                const parsed = JSON.parse(settings);
                this.soundEnabled = parsed.soundEnabled !== false;
                this.vibrationEnabled = parsed.vibrationEnabled !== false;
            }
        } catch (error) {
            console.error('❌ Erreur chargement paramètres notifications:', error);
        }
    }
    
    saveSettings() {
        try {
            const settings = {
                soundEnabled: this.soundEnabled,
                vibrationEnabled: this.vibrationEnabled
            };
            localStorage.setItem('synergia_notification_settings', JSON.stringify(settings));
        } catch (error) {
            console.error('❌ Erreur sauvegarde paramètres:', error);
        }
    }
    
    async loadNotifications() {
        if (!this.currentUser) return;
        
        try {
            if (window.firebaseManager) {
                const notifications = await window.firebaseManager.getCollection('notifications', 
                    { field: 'createdAt', direction: 'desc' },
                    50
                );
                
                this.notifications = notifications.filter(n => n.recipientId === this.currentUser.uid);
                this.updateUnreadCount();
                this.renderNotifications();
            }
        } catch (error) {
            console.error('❌ Erreur chargement notifications:', error);
        }
    }
    
    // === GESTION DES NOTIFICATIONS ===
    
    async createNotification(notificationData) {
        try {
            const notification = {
                id: this.generateId(),
                ...notificationData,
                read: false,
                createdAt: new Date().toISOString(),
                senderId: this.currentUser?.uid
            };
            
            // Validation
            if (!this.validateNotification(notification)) {
                return false;
            }
            
            // Sauvegarder en base
            if (window.firebaseManager) {
                const docId = await window.firebaseManager.addDocument('notifications', notification);
                notification.id = docId;
            }
            
            // Si c'est pour l'utilisateur actuel, l'ajouter localement
            if (notification.recipientId === this.currentUser?.uid) {
                this.notifications.unshift(notification);
                this.updateUnreadCount();
                this.renderNotifications();
                this.showNotificationPopup(notification);
            }
            
            // Envoyer push notification si nécessaire
            await this.sendPushNotification(notification);
            
            return notification;
            
        } catch (error) {
            console.error('❌ Erreur création notification:', error);
            return false;
        }
    }
    
    validateNotification(notification) {
        if (!notification.recipientId) {
            console.error('RecipientId requis pour la notification');
            return false;
        }
        
        if (!notification.title || notification.title.trim().length === 0) {
            console.error('Titre requis pour la notification');
            return false;
        }
        
        if (!notification.type) {
            notification.type = 'info';
        }
        
        return true;
    }
    
    handleNewNotifications(notifications) {
        const existingIds = new Set(this.notifications.map(n => n.id));
        const newNotifications = notifications.filter(n => !existingIds.has(n.id));
        
        // Ajouter les nouvelles notifications
        newNotifications.forEach(notification => {
            this.notifications.unshift(notification);
            
            // Afficher popup pour les nouvelles notifications non lues
            if (!notification.read && !document.hidden) {
                this.showNotificationPopup(notification);
            }
        });
        
        // Limiter à 100 notifications max
        this.notifications = this.notifications.slice(0, 100);
        
        this.updateUnreadCount();
        this.renderNotifications();
    }
    
    async markAsRead(notificationId) {
        try {
            const notification = this.notifications.find(n => n.id === notificationId);
            if (!notification || notification.read) return;
            
            // Mettre à jour localement
            notification.read = true;
            notification.readAt = new Date().toISOString();
            
            // Mettre à jour en base
            if (window.firebaseManager) {
                await window.firebaseManager.updateDocument('notifications', notificationId, {
                    read: true,
                    readAt: firebase.firestore.Timestamp.now()
                });
            }
            
            this.updateUnreadCount();
            this.renderNotifications();
            
        } catch (error) {
            console.error('❌ Erreur marquage lecture:', error);
        }
    }
    
    async markAllAsRead() {
        try {
            const unreadNotifications = this.notifications.filter(n => !n.read);
            
            if (unreadNotifications.length === 0) return;
            
            // Mettre à jour localement
            unreadNotifications.forEach(notification => {
                notification.read = true;
                notification.readAt = new Date().toISOString();
            });
            
            // Mettre à jour en base (batch update)
            if (window.firebaseManager) {
                const batch = window.firebaseManager.db.batch();
                
                unreadNotifications.forEach(notification => {
                    const notificationRef = window.firebaseManager.db.collection('notifications').doc(notification.id);
                    batch.update(notificationRef, {
                        read: true,
                        readAt: firebase.firestore.Timestamp.now()
                    });
                });
                
                await batch.commit();
            }
            
            this.updateUnreadCount();
            this.renderNotifications();
            
            window.uiManager?.showToast('Toutes les notifications marquées comme lues', 'success');
            
        } catch (error) {
            console.error('❌ Erreur marquage toutes lues:', error);
            window.uiManager?.showToast('Erreur lors du marquage', 'error');
        }
    }
    
    async deleteNotification(notificationId) {
        try {
            // Supprimer localement
            this.notifications = this.notifications.filter(n => n.id !== notificationId);
            
            // Supprimer en base
            if (window.firebaseManager) {
                await window.firebaseManager.deleteDocument('notifications', notificationId);
            }
            
            this.updateUnreadCount();
            this.renderNotifications();
            
        } catch (error) {
            console.error('❌ Erreur suppression notification:', error);
        }
    }
    
    async clearAllNotifications() {
        if (!confirm('Supprimer toutes les notifications ?')) return;
        
        try {
            // Supprimer en base (batch delete)
            if (window.firebaseManager) {
                const batch = window.firebaseManager.db.batch();
                
                this.notifications.forEach(notification => {
                    const notificationRef = window.firebaseManager.db.collection('notifications').doc(notification.id);
                    batch.delete(notificationRef);
                });
                
                await batch.commit();
            }
            
            // Vider localement
            this.notifications = [];
            this.updateUnreadCount();
            this.renderNotifications();
            
            window.uiManager?.showToast('Toutes les notifications supprimées', 'success');
            
        } catch (error) {
            console.error('❌ Erreur suppression toutes notifications:', error);
            window.uiManager?.showToast('Erreur lors de la suppression', 'error');
        }
    }
    
    clearNotifications() {
        this.notifications = [];
        this.unreadCount = 0;
        this.updateBadge();
        this.renderNotifications();
    }
    
    markActiveNotificationsAsRead() {
        // Marquer comme lues les notifications visibles depuis plus de 3 secondes
        setTimeout(() => {
            if (this.isVisible) {
                const unreadVisible = this.notifications
                    .filter(n => !n.read)
                    .slice(0, 5); // Top 5 visibles
                
                unreadVisible.forEach(notification => {
                    this.markAsRead(notification.id);
                });
            }
        }, 3000);
    }
    
    // === INTERFACE UTILISATEUR ===
    
    toggleNotificationCenter() {
        if (this.isVisible) {
            this.hideNotificationCenter();
        } else {
            this.showNotificationCenter();
        }
    }
    
    showNotificationCenter() {
        const notificationCenter = document.getElementById('notifications-center');
        if (!notificationCenter) return;
        
        this.isVisible = true;
        notificationCenter.classList.add('active');
        
        // Marquer automatiquement les notifications visibles comme lues après un délai
        this.markActiveNotificationsAsRead();
        
        // Analytics
        if (window.firebaseManager) {
            window.firebaseManager.logEvent('notification_center_opened', {
                unread_count: this.unreadCount,
                total_notifications: this.notifications.length
            });
        }
    }
    
    hideNotificationCenter() {
        const notificationCenter = document.getElementById('notifications-center');
        if (!notificationCenter) return;
        
        this.isVisible = false;
        notificationCenter.classList.remove('active');
    }
    
    renderNotifications() {
        const container = document.getElementById('notifications-list');
        if (!container) return;
        
        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bell-slash"></i>
                    <h3>Aucune notification</h3>
                    <p>Vous êtes à jour!</p>
                </div>
            `;
            return;
        }
        
        const notificationsHTML = this.notifications.map(notification => 
            this.createNotificationItem(notification)
        ).join('');
        
        container.innerHTML = `
            <div class="notifications-actions">
                <button class="btn btn-sm" data-action="mark-all-read">
                    <i class="fas fa-check-double"></i> Tout marquer comme lu
                </button>
                <button class="btn btn-sm btn-secondary" data-action="clear-all">
                    <i class="fas fa-trash"></i> Tout supprimer
                </button>
            </div>
            <div class="notifications-items">
                ${notificationsHTML}
            </div>
        `;
    }
    
    createNotificationItem(notification) {
        const timeAgo = this.getTimeAgo(notification.createdAt);
        const isUnread = !notification.read;
        
        const typeIcons = {
            'info': 'info-circle',
            'success': 'check-circle',
            'warning': 'exclamation-triangle',
            'error': 'exclamation-circle',
            'message': 'envelope',
            'quest': 'scroll',
            'shift': 'calendar-alt',
            'team': 'users',
            'system': 'cog'
        };
        
        const typeColors = {
            'info': 'var(--info-color)',
            'success': 'var(--success-color)',
            'warning': 'var(--warning-color)',
            'error': 'var(--error-color)',
            'message': 'var(--primary-color)',
            'quest': 'var(--accent-color)',
            'shift': 'var(--secondary-color)',
            'team': 'var(--success-color)',
            'system': 'var(--text-muted)'
        };
        
        return `
            <div class="notification-item ${isUnread ? 'unread' : 'read'}" data-notification-id="${notification.id}">
                <div class="notification-icon" style="color: ${typeColors[notification.type] || typeColors.info}">
                    <i class="fas fa-${typeIcons[notification.type] || typeIcons.info}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-header">
                        <h4 class="notification-title">${notification.title}</h4>
                        <span class="notification-time">${timeAgo}</span>
                    </div>
                    ${notification.message ? `
                        <p class="notification-message">${notification.message}</p>
                    ` : ''}
                    ${notification.actionUrl ? `
                        <a href="${notification.actionUrl}" class="notification-action">
                            ${notification.actionText || 'Voir plus'}
                        </a>
                    ` : ''}
                </div>
                <div class="notification-actions">
                    ${isUnread ? `
                        <button class="btn btn-icon btn-sm" data-action="mark-read" data-notification-id="${notification.id}" title="Marquer comme lu">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-icon btn-sm btn-danger" data-action="delete-notification" data-notification-id="${notification.id}" title="Supprimer">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                ${isUnread ? '<div class="unread-indicator"></div>' : ''}
            </div>
        `;
    }
    
    showNotificationPopup(notification) {
        // Vérifier les permissions et paramètres
        if (!this.shouldShowNotification(notification)) return;
        
        // Créer la popup
        const popup = document.createElement('div');
        popup.className = 'notification-popup';
        popup.innerHTML = `
            <div class="popup-content">
                <div class="popup-icon">
                    <i class="fas fa-${this.getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="popup-text">
                    <h4>${notification.title}</h4>
                    ${notification.message ? `<p>${notification.message}</p>` : ''}
                </div>
                <button class="popup-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Ajouter au DOM
        document.body.appendChild(popup);
        
        // Animation d'entrée
        setTimeout(() => popup.classList.add('show'), 100);
        
        // Auto-suppression
        setTimeout(() => {
            this.removeNotificationPopup(popup);
        }, 5000);
        
        // Bouton fermer
        popup.querySelector('.popup-close').addEventListener('click', () => {
            this.removeNotificationPopup(popup);
        });
        
        // Sons et vibration
        this.playNotificationEffects(notification);
    }
    
    removeNotificationPopup(popup) {
        popup.classList.remove('show');
        setTimeout(() => {
            if (popup.parentNode) {
                popup.parentNode.removeChild(popup);
            }
        }, 300);
    }
    
    shouldShowNotification(notification) {
        // Ne pas afficher si l'onglet n'est pas visible
        if (document.hidden) return false;
        
        // Ne pas afficher les notifications système en mode silencieux
        if (notification.type === 'system' && !this.soundEnabled) return false;
        
        // Ne pas afficher si center ouvert
        if (this.isVisible) return false;
        
        return true;
    }
    
    playNotificationEffects(notification) {
        // Son
        if (this.soundEnabled && notification.type !== 'system') {
            this.playNotificationSound(notification.type);
        }
        
        // Vibration
        if (this.vibrationEnabled && 'vibrate' in navigator) {
            const patterns = {
                'info': [100],
                'success': [100, 50, 100],
                'warning': [200, 100, 200],
                'error': [300, 100, 300, 100, 300],
                'message': [100, 50, 100, 50, 100]
            };
            
            navigator.vibrate(patterns[notification.type] || patterns.info);
        }
    }
    
    playNotificationSound(type) {
        try {
            const soundFiles = {
                'success': '/assets/sounds/success.mp3',
                'message': '/assets/sounds/message.mp3',
                'default': '/assets/sounds/notification.mp3'
            };
            
            const soundFile = soundFiles[type] || soundFiles.default;
            const audio = new Audio(soundFile);
            audio.volume = 0.3;
            audio.play().catch(e => console.log('Audio play failed:', e));
            
        } catch (error) {
            console.log('Son de notification non disponible');
        }
    }
    
    getNotificationIcon(type) {
        const icons = {
            'info': 'info-circle',
            'success': 'check-circle',
            'warning': 'exclamation-triangle',
            'error': 'exclamation-circle',
            'message': 'envelope',
            'quest': 'scroll',
            'shift': 'calendar-alt',
            'team': 'users',
            'system': 'cog'
        };
        
        return icons[type] || icons.info;
    }
    
    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        this.updateBadge();
    }
    
    updateBadge() {
        const badge = document.getElementById('notifications-badge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    }
    
    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMinutes < 1) return 'À l\'instant';
        if (diffMinutes < 60) return `${diffMinutes}min`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}j`;
        
        return date.toLocaleDateString('fr-FR');
    }
    
    // === PUSH NOTIFICATIONS ===
    
    async requestPermission() {
        if (!('Notification' in window)) {
            console.log('Ce navigateur ne supporte pas les notifications');
            return false;
        }
        
        if (Notification.permission === 'granted') {
            await this.subscribeToPush();
            return true;
        }
        
        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                await this.subscribeToPush();
                return true;
            }
        }
        
        return false;
    }
    
    async subscribeToPush() {
        if (!this.swRegistration) return;
        
        try {
            const applicationServerKey = this.urlB64ToUint8Array(
                'BK8X4GUKaKzPdGE8jFhGzW8Vng9b5K3fzwBmjAFpJPZxKh-2bKE5oLmV7dVVZh6WxqGhF3z8vY9xF2rQ-uT0kLM'
            );
            
            this.pushSubscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            });
            
            // Envoyer la subscription au serveur
            await this.sendSubscriptionToServer(this.pushSubscription);
            
            console.log('✅ Abonnement push notifications activé');
            
        } catch (error) {
            console.error('❌ Erreur abonnement push:', error);
        }
    }
    
    async sendSubscriptionToServer(subscription) {
        if (!window.firebaseManager || !this.currentUser) return;
        
        try {
            await window.firebaseManager.updateDocument('users', this.currentUser.uid, {
                pushSubscription: subscription.toJSON(),
                pushSubscriptionDate: firebase.firestore.Timestamp.now()
            });
        } catch (error) {
            console.error('❌ Erreur sauvegarde subscription:', error);
        }
    }
    
    async checkPushSubscription() {
        if (!this.swRegistration) return;
        
        try {
            this.pushSubscription = await this.swRegistration.pushManager.getSubscription();
            if (this.pushSubscription) {
                console.log('✅ Subscription push existante trouvée');
            }
        } catch (error) {
            console.error('❌ Erreur vérification subscription:', error);
        }
    }
    
    async sendPushNotification(notification) {
        // Cette méthode serait appelée côté serveur
        // Ici on simule juste l'envoi
        console.log('📤 Push notification envoyée:', notification.title);
    }
    
    urlB64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
    
    // === MÉTHODES UTILITAIRES ===
    
    // Méthodes de création rapide pour différents types
    async notifyQuest(questData, userId) {
        return await this.createNotification({
            recipientId: userId,
            type: 'quest',
            title: 'Nouvelle quête disponible',
            message: `${questData.title} - ${questData.xp} XP`,
            actionUrl: '/quests',
            actionText: 'Voir les quêtes'
        });
    }
    
    async notifyShift(shiftData, userId) {
        return await this.createNotification({
            recipientId: userId,
            type: 'shift',
            title: 'Nouveau shift assigné',
            message: `${shiftData.date} de ${shiftData.startTime} à ${shiftData.endTime}`,
            actionUrl: '/planning',
            actionText: 'Voir le planning'
        });
    }
    
    async notifyMessage(messageData, userId) {
        return await this.createNotification({
            recipientId: userId,
            type: 'message',
            title: `Message de ${messageData.senderName}`,
            message: messageData.content.substring(0, 100) + (messageData.content.length > 100 ? '...' : ''),
            actionUrl: '/chat',
            actionText: 'Répondre'
        });
    }
    
    async notifyTeamUpdate(updateData, userIds) {
        const promises = userIds.map(userId => 
            this.createNotification({
                recipientId: userId,
                type: 'team',
                title: 'Mise à jour équipe',
                message: updateData.message,
                actionUrl: '/team',
                actionText: 'Voir l\'équipe'
            })
        );
        
        return await Promise.all(promises);
    }
    
    async notifySystem(title, message, userIds = null) {
        if (!userIds) {
            // Notifier tous les utilisateurs actifs
            if (window.teamManager) {
                userIds = window.teamManager.getActiveMembers().map(m => m.id);
            } else {
                userIds = [this.currentUser?.uid].filter(Boolean);
            }
        }
        
        const promises = userIds.map(userId => 
            this.createNotification({
                recipientId: userId,
                type: 'system',
                title: title,
                message: message
            })
        );
        
        return await Promise.all(promises);
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    cleanup() {
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners = [];
    }
    
    // === API PUBLIQUE ===
    
    getNotifications(filters = {}) {
        let filtered = [...this.notifications];
        
        if (filters.type) {
            filtered = filtered.filter(n => n.type === filters.type);
        }
        
        if (filters.unread) {
            filtered = filtered.filter(n => !n.read);
        }
        
        if (filters.limit) {
            filtered = filtered.slice(0, filters.limit);
        }
        
        return filtered;
    }
    
    getUnreadCount() {
        return this.unreadCount;
    }
    
    getSettings() {
        return {
            soundEnabled: this.soundEnabled,
            vibrationEnabled: this.vibrationEnabled,
            pushEnabled: !!this.pushSubscription
        };
    }
    
    async updateSettings(settings) {
        if (settings.soundEnabled !== undefined) {
            this.soundEnabled = settings.soundEnabled;
        }
        
        if (settings.vibrationEnabled !== undefined) {
            this.vibrationEnabled = settings.vibrationEnabled;
        }
        
        this.saveSettings();
        
        if (settings.pushEnabled !== undefined) {
            if (settings.pushEnabled && !this.pushSubscription) {
                await this.requestPermission();
            }
        }
    }
}

// Initialiser
document.addEventListener('DOMContentLoaded', () => {
    window.notificationManager = new NotificationManager();
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}
