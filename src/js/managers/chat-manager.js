// js/modules/chat/chat-manager.js
// Gestionnaire de chat temps réel pour SYNERGIA v3.0

class ChatManager {
    constructor() {
        this.conversations = [];
        this.currentConversation = null;
        this.messages = new Map();
        this.unreadCounts = new Map();
        this.isTyping = new Map();
        this.listeners = [];
        this.currentUser = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        
        // Attendre Firebase et auth
        document.addEventListener('firebase:ready', () => {
            this.setupFirebaseListeners();
        });
        
        document.addEventListener('auth:login', (e) => {
            this.currentUser = e.detail.user;
            this.loadConversations();
        });
        
        console.log('✅ Chat Manager initialisé');
    }
    
    setupEventListeners() {
        // Formulaire de message
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'message-form') {
                e.preventDefault();
                this.handleSendMessage(e.target);
            }
        });
        
        // Actions chat
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="select-conversation"]')) {
                const conversationId = e.target.dataset.conversationId;
                this.selectConversation(conversationId);
            }
            
            if (e.target.matches('[data-action="new-conversation"]')) {
                this.showNewConversationModal();
            }
            
            if (e.target.matches('[data-action="delete-message"]')) {
                const messageId = e.target.dataset.messageId;
                this.deleteMessage(messageId);
            }
        });
        
        // Détection de frappe
        document.addEventListener('input', (e) => {
            if (e.target.id === 'message-input') {
                this.handleTyping();
            }
        });
        
        // Recherche conversations
        document.addEventListener('input', (e) => {
            if (e.target.id === 'chat-search') {
                this.searchConversations(e.target.value);
            }
        });
    }
    
    setupFirebaseListeners() {
        if (!window.firebaseManager) return;
        
        // Écouter les conversations
        this.listeners.push(
            window.firebaseManager.onSnapshot('conversations', (conversations) => {
                this.conversations = conversations.filter(conv => 
                    conv.participants.includes(this.currentUser?.uid)
                );
                this.renderConversations();
            }, {
                where: [
                    { field: 'participants', operator: 'array-contains', value: this.currentUser?.uid }
                ]
            })
        );
    }
    
    async loadConversations() {
        if (!this.currentUser || !window.firebaseManager) return;
        
        try {
            const conversations = await window.firebaseManager.getCollection('conversations');
            this.conversations = conversations.filter(conv => 
                conv.participants.includes(this.currentUser.uid)
            );
            
            this.renderConversations();
            
            // Charger les messages non lus
            await this.loadUnreadCounts();
            
        } catch (error) {
            console.error('❌ Erreur chargement conversations:', error);
        }
    }
    
    async createConversation(participantIds, title = null, type = 'private') {
        if (!this.currentUser) return null;
        
        try {
            // Ajouter l'utilisateur actuel aux participants
            const participants = [...new Set([this.currentUser.uid, ...participantIds])];
            
            // Générer un titre si non fourni
            if (!title) {
                if (type === 'private' && participants.length === 2) {
                    const otherUserId = participants.find(id => id !== this.currentUser.uid);
                    const otherUser = await this.getUserInfo(otherUserId);
                    title = otherUser ? otherUser.displayName : 'Conversation privée';
                } else {
                    title = 'Nouvelle conversation';
                }
            }
            
            const conversationData = {
                title,
                type,
                participants,
                lastMessage: null,
                lastMessageAt: null,
                createdAt: firebase.firestore.Timestamp.now(),
                createdBy: this.currentUser.uid
            };
            
            const conversationId = await window.firebaseManager.addDocument('conversations', conversationData);
            
            // Ajouter à la liste locale
            const newConversation = { id: conversationId, ...conversationData };
            this.conversations.unshift(newConversation);
            this.renderConversations();
            
            // Sélectionner la nouvelle conversation
            this.selectConversation(conversationId);
            
            return newConversation;
            
        } catch (error) {
            console.error('❌ Erreur création conversation:', error);
            window.uiManager?.showToast('Erreur lors de la création de la conversation', 'error');
            return null;
        }
    }
    
    async selectConversation(conversationId) {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (!conversation) return;
        
        this.currentConversation = conversation;
        
        // Mettre à jour l'UI
        this.renderConversationHeader(conversation);
        this.showChatView();
        
        // Charger les messages
        await this.loadMessages(conversationId);
        
        // Marquer comme lu
        await this.markAsRead(conversationId);
        
        // Écouter les nouveaux messages
        this.listenToMessages(conversationId);
        
        // Mettre à jour la sélection
        this.updateConversationSelection(conversationId);
    }
    
    async loadMessages(conversationId) {
        if (!window.firebaseManager) return;
        
        try {
            const messages = await window.firebaseManager.getCollection('messages', 
                { field: 'timestamp', direction: 'asc' },
                50 // Limiter à 50 messages récents
            );
            
            const conversationMessages = messages.filter(msg => msg.conversationId === conversationId);
            this.messages.set(conversationId, conversationMessages);
            
            this.renderMessages(conversationMessages);
            this.scrollToBottom();
            
        } catch (error) {
            console.error('❌ Erreur chargement messages:', error);
        }
    }
    
    listenToMessages(conversationId) {
        // Nettoyer l'ancien listener
        this.cleanupMessageListener();
        
        // Nouveau listener pour les messages en temps réel
        this.messageListener = window.firebaseManager.onSnapshot('messages', (messages) => {
            const conversationMessages = messages.filter(msg => msg.conversationId === conversationId);
            this.messages.set(conversationId, conversationMessages);
            this.renderMessages(conversationMessages);
            this.scrollToBottom();
        }, {
            where: [
                { field: 'conversationId', operator: '==', value: conversationId }
            ],
            orderBy: { field: 'timestamp', direction: 'asc' }
        });
    }
    
    async sendMessage(content, type = 'text', attachments = []) {
        if (!this.currentConversation || !this.currentUser || !content.trim()) return;
        
        try {
            const messageData = {
                conversationId: this.currentConversation.id,
                senderId: this.currentUser.uid,
                senderName: this.currentUser.displayName || this.currentUser.email,
                content: content.trim(),
                type,
                attachments,
                timestamp: firebase.firestore.Timestamp.now(),
                edited: false,
                deleted: false
            };
            
            // Envoyer le message
            const messageId = await window.firebaseManager.addDocument('messages', messageData);
            
            // Mettre à jour la conversation
            await this.updateConversationLastMessage(this.currentConversation.id, {
                content: content.trim(),
                senderId: this.currentUser.uid,
                timestamp: firebase.firestore.Timestamp.now()
            });
            
            // Envoyer des notifications aux autres participants
            await this.sendNotifications(this.currentConversation, messageData);
            
            // Analytics
            if (window.firebaseManager) {
                window.firebaseManager.logEvent('message_sent', {
                    conversation_id: this.currentConversation.id,
                    message_type: type,
                    participant_count: this.currentConversation.participants.length
                });
            }
            
            return messageId;
            
        } catch (error) {
            console.error('❌ Erreur envoi message:', error);
            window.uiManager?.showToast('Erreur lors de l\'envoi du message', 'error');
        }
    }
    
    async updateConversationLastMessage(conversationId, lastMessage) {
        try {
            await window.firebaseManager.updateDocument('conversations', conversationId, {
                lastMessage,
                lastMessageAt: lastMessage.timestamp
            });
        } catch (error) {
            console.error('❌ Erreur mise à jour conversation:', error);
        }
    }
    
    async deleteMessage(messageId) {
        if (!confirm('Supprimer ce message ?')) return;
        
        try {
            await window.firebaseManager.updateDocument('messages', messageId, {
                deleted: true,
                deletedAt: firebase.firestore.Timestamp.now()
            });
            
            window.uiManager?.showToast('Message supprimé', 'success');
            
        } catch (error) {
            console.error('❌ Erreur suppression message:', error);
            window.uiManager?.showToast('Erreur lors de la suppression', 'error');
        }
    }
    
    async markAsRead(conversationId) {
        if (!this.currentUser) return;
        
        try {
            // Marquer tous les messages non lus comme lus
            const messages = this.messages.get(conversationId) || [];
            const unreadMessages = messages.filter(msg => 
                msg.senderId !== this.currentUser.uid && 
                !msg.readBy?.includes(this.currentUser.uid)
            );
            
            for (const message of unreadMessages) {
                const readBy = message.readBy || [];
                if (!readBy.includes(this.currentUser.uid)) {
                    readBy.push(this.currentUser.uid);
                    await window.firebaseManager.updateDocument('messages', message.id, {
                        readBy,
                        [`readAt.${this.currentUser.uid}`]: firebase.firestore.Timestamp.now()
                    });
                }
            }
            
            // Mettre à jour le compteur non lu
            this.unreadCounts.set(conversationId, 0);
            this.updateChatBadge();
            
        } catch (error) {
            console.error('❌ Erreur marquage lecture:', error);
        }
    }
    
    handleSendMessage(form) {
        const input = form.querySelector('#message-input');
        const content = input.value.trim();
        
        if (content) {
            this.sendMessage(content);
            input.value = '';
        }
    }
    
    handleTyping() {
        if (!this.currentConversation || !this.currentUser) return;
        
        // Débounce pour éviter trop d'appels
        clearTimeout(this.typingTimeout);
        
        // Indiquer qu'on tape
        this.setTypingStatus(true);
        
        // Arrêter après 3 secondes d'inactivité
        this.typingTimeout = setTimeout(() => {
            this.setTypingStatus(false);
        }, 3000);
    }
    
    async setTypingStatus(isTyping) {
        if (!this.currentConversation || !this.currentUser) return;
        
        try {
            const typingRef = window.firebaseManager.db
                .collection('typing')
                .doc(`${this.currentConversation.id}_${this.currentUser.uid}`);
            
            if (isTyping) {
                await typingRef.set({
                    conversationId: this.currentConversation.id,
                    userId: this.currentUser.uid,
                    userName: this.currentUser.displayName || this.currentUser.email,
                    timestamp: firebase.firestore.Timestamp.now()
                });
            } else {
                await typingRef.delete();
            }
        } catch (error) {
            console.error('❌ Erreur statut typing:', error);
        }
    }
    
    renderConversations() {
        const container = document.getElementById('conversations-list');
        if (!container) return;
        
        if (this.conversations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <p>Aucune conversation</p>
                    <button class="btn btn-sm" data-action="new-conversation">
                        Nouvelle conversation
                    </button>
                </div>
            `;
            return;
        }
        
        const conversationsHTML = this.conversations.map(conv => this.createConversationItem(conv)).join('');
        container.innerHTML = conversationsHTML;
    }
    
    createConversationItem(conversation) {
        const unreadCount = this.unreadCounts.get(conversation.id) || 0;
        const lastMessage = conversation.lastMessage;
        const isSelected = this.currentConversation?.id === conversation.id;
        
        return `
            <div class="conversation-item ${isSelected ? 'selected' : ''}" 
                 data-conversation-id="${conversation.id}"
                 data-action="select-conversation">
                <div class="conversation-avatar">
                    <img src="${this.getConversationAvatar(conversation)}" alt="${conversation.title}">
                    ${unreadCount > 0 ? `<div class="unread-indicator">${unreadCount}</div>` : ''}
                </div>
                <div class="conversation-info">
                    <h4 class="conversation-title">${conversation.title}</h4>
                    ${lastMessage ? `
                        <p class="last-message">
                            ${lastMessage.senderId === this.currentUser?.uid ? 'Vous: ' : ''}
                            ${this.truncateMessage(lastMessage.content)}
                        </p>
                        <span class="last-message-time">${this.formatMessageTime(lastMessage.timestamp)}</span>
                    ` : `
                        <p class="last-message">Nouvelle conversation</p>
                    `}
                </div>
            </div>
        `;
    }
    
    getConversationAvatar(conversation) {
        if (conversation.type === 'group') {
            return '/assets/images/group-avatar.jpg';
        }
        
        // Pour conversation privée, utiliser l'avatar de l'autre participant
        const otherParticipantId = conversation.participants.find(id => id !== this.currentUser?.uid);
        return `/assets/images/avatars/avatar-${Math.floor(Math.random() * 6) + 1}.jpg`;
    }
    
    truncateMessage(content, maxLength = 50) {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    }
    
    formatMessageTime(timestamp) {
        if (!timestamp) return '';
        
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffMinutes < 1) return 'À l\'instant';
        if (diffMinutes < 60) return `${diffMinutes}min`;
        
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours}h`;
        
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}j`;
        
        return date.toLocaleDateString('fr-FR');
    }
    
    renderConversationHeader(conversation) {
        const chatTitle = document.getElementById('chat-title');
        const chatStatus = document.getElementById('chat-status');
        const chatAvatar = document.getElementById('chat-avatar');
        
        if (chatTitle) chatTitle.textContent = conversation.title;
        if (chatAvatar) chatAvatar.src = this.getConversationAvatar(conversation);
        if (chatStatus) {
            const participantCount = conversation.participants.length;
            chatStatus.textContent = conversation.type === 'group' 
                ? `${participantCount} participants`
                : 'En ligne';
        }
    }
    
    showChatView() {
        const welcome = document.getElementById('chat-welcome');
        const chatView = document.getElementById('chat-view');
        
        if (welcome) welcome.style.display = 'none';
        if (chatView) chatView.style.display = 'flex';
    }
    
    renderMessages(messages) {
        const container = document.getElementById('messages-container');
        if (!container) return;
        
        if (messages.length === 0) {
            container.innerHTML = `
                <div class="empty-messages">
                    <i class="fas fa-comment"></i>
                    <p>Aucun message</p>
                    <p>Commencez la conversation!</p>
                </div>
            `;
            return;
        }
        
        const messagesHTML = messages
            .filter(msg => !msg.deleted)
            .map((msg, index) => this.createMessageElement(msg, messages[index - 1]))
            .join('');
        
        container.innerHTML = messagesHTML;
    }
    
    createMessageElement(message, previousMessage) {
        const isOwn = message.senderId === this.currentUser?.uid;
        const showAvatar = !previousMessage || previousMessage.senderId !== message.senderId;
        const timestamp = message.timestamp?.toDate() || new Date(message.timestamp);
        
        return `
            <div class="message ${isOwn ? 'own' : 'other'} ${showAvatar ? 'show-avatar' : ''}">
                ${!isOwn && showAvatar ? `
                    <div class="message-avatar">
                        <img src="/assets/images/default-avatar.jpg" alt="${message.senderName}">
                    </div>
                ` : ''}
                <div class="message-content">
                    ${!isOwn && showAvatar ? `
                        <div class="message-sender">${message.senderName}</div>
                    ` : ''}
                    <div class="message-bubble">
                        ${this.renderMessageContent(message)}
                        ${message.edited ? `<span class="message-edited">modifié</span>` : ''}
                    </div>
                    <div class="message-time">
                        ${this.formatMessageTime(timestamp)}
                        ${isOwn ? `
                            <div class="message-actions">
                                <button class="btn btn-icon btn-sm" data-action="delete-message" data-message-id="${message.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    renderMessageContent(message) {
        switch (message.type) {
            case 'text':
                return this.renderTextMessage(message.content);
            case 'image':
                return this.renderImageMessage(message);
            case 'file':
                return this.renderFileMessage(message);
            default:
                return message.content;
        }
    }
    
    renderTextMessage(content) {
        // Convertir les URLs en liens
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return content.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
    }
    
    renderImageMessage(message) {
        return `
            <div class="message-image">
                <img src="${message.content}" alt="Image" onclick="this.requestFullscreen()">
            </div>
        `;
    }
    
    renderFileMessage(message) {
        return `
            <div class="message-file">
                <i class="fas fa-file"></i>
                <a href="${message.content}" download="${message.fileName || 'fichier'}">
                    ${message.fileName || 'Télécharger le fichier'}
                </a>
            </div>
        `;
    }
    
    scrollToBottom() {
        const container = document.getElementById('messages-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }
    
    updateConversationSelection(conversationId) {
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.conversationId === conversationId);
        });
    }
    
    async loadUnreadCounts() {
        // Calculer les messages non lus pour chaque conversation
        for (const conversation of this.conversations) {
            const messages = await this.loadMessages(conversation.id);
            const unreadCount = messages?.filter(msg => 
                msg.senderId !== this.currentUser?.uid && 
                !msg.readBy?.includes(this.currentUser?.uid)
            ).length || 0;
            
            this.unreadCounts.set(conversation.id, unreadCount);
        }
        
        this.updateChatBadge();
    }
    
    updateChatBadge() {
        const totalUnread = Array.from(this.unreadCounts.values()).reduce((sum, count) => sum + count, 0);
        const badge = document.getElementById('chat-badge');
        
        if (badge) {
            if (totalUnread > 0) {
                badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    }
    
    searchConversations(query) {
        const items = document.querySelectorAll('.conversation-item');
        const lowerQuery = query.toLowerCase();
        
        items.forEach(item => {
            const title = item.querySelector('.conversation-title').textContent.toLowerCase();
            const match = title.includes(lowerQuery);
            item.style.display = match ? 'flex' : 'none';
        });
    }
    
    showNewConversationModal() {
        // TODO: Implémenter modal de nouvelle conversation
        window.uiManager?.showToast('Fonctionnalité en développement', 'info');
    }
    
    async getUserInfo(userId) {
        try {
            return await window.firebaseManager.getDocument('users', userId);
        } catch (error) {
            console.error('❌ Erreur récupération utilisateur:', error);
            return null;
        }
    }
    
    async sendNotifications(conversation, message) {
        // TODO: Implémenter notifications push
        console.log('Notification à envoyer pour:', conversation.title);
    }
    
    cleanupMessageListener() {
        if (this.messageListener) {
            this.messageListener();
            this.messageListener = null;
        }
    }
    
    cleanup() {
        this.cleanupMessageListener();
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners = [];
        
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
    }
    
    // API publique
    getConversations() {
        return this.conversations;
    }
    
    getCurrentConversation() {
        return this.currentConversation;
    }
    
    getMessages(conversationId) {
        return this.messages.get(conversationId) || [];
    }
    
    getUnreadCount(conversationId = null) {
        if (conversationId) {
            return this.unreadCounts.get(conversationId) || 0;
        }
        return Array.from(this.unreadCounts.values()).reduce((sum, count) => sum + count, 0);
    }
}

// Initialiser
document.addEventListener('DOMContentLoaded', () => {
    window.chatManager = new ChatManager();
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatManager;
}
