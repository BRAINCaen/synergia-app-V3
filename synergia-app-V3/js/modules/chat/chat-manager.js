// js/modules/chat/chat-manager.js
// Gestionnaire de chat temps réel avec Firebase

class ChatManager {
    constructor() {
        this.conversations = new Map();
        this.messages = new Map();
        this.unsubscribers = [];
        this.currentConversationId = null;
        this.typingUsers = new Map();
        this.isReady = false;
        this.init();
    }

    async init() {
        await window.firebaseManager.waitForReady();
        
        // Écouter les conversations de l'utilisateur
        if (window.firebaseManager.currentUser) {
            this.subscribeToConversations();
        }
        
        // Écouter les changements d'authentification
        window.firebaseManager.on('authStateChanged', (user) => {
            if (user) {
                this.subscribeToConversations();
            } else {
                this.cleanup();
            }
        });
        
        this.isReady = true;
        console.log('✅ ChatManager initialisé');
    }

    // Gestion des conversations
    subscribeToConversations() {
        const userId = window.firebaseManager.currentUser.uid;
        
        // Écouter les conversations où l'utilisateur est participant
        const unsubscribe = window.firebaseManager.collection('conversations')
            .where('participants', 'array-contains', userId)
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    const conversation = { id: change.doc.id, ...change.doc.data() };
                    
                    if (change.type === 'added' || change.type === 'modified') {
                        this.conversations.set(conversation.id, conversation);
                        this.notifyUpdate('conversation:updated', conversation);
                    } else if (change.type === 'removed') {
                        this.conversations.delete(conversation.id);
                        this.notifyUpdate('conversation:removed', conversation);
                    }
                });
                
                this.notifyUpdate('conversations:updated', this.getConversations());
            });
        
        this.unsubscribers.push(unsubscribe);
    }

    // Créer une nouvelle conversation
    async createConversation(participantIds, name = null, type = 'direct') {
        try {
            const userId = window.firebaseManager.currentUser.uid;
            
            // Toujours inclure l'utilisateur actuel
            if (!participantIds.includes(userId)) {
                participantIds.push(userId);
            }
            
            // Pour les conversations directes, vérifier si elle existe déjà
            if (type === 'direct' && participantIds.length === 2) {
                const existing = await this.findDirectConversation(participantIds);
                if (existing) {
                    return existing;
                }
            }
            
            // Créer la conversation
            const conversationData = {
                participants: participantIds,
                participantsData: {},
                name: name || await this.generateConversationName(participantIds),
                type: type, // 'direct', 'group', 'channel'
                lastMessage: null,
                lastMessageTime: null,
                unreadCount: {},
                createdBy: userId,
                createdAt: window.firebaseManager.timestamp()
            };
            
            // Initialiser le compteur de non-lus pour chaque participant
            participantIds.forEach(id => {
                conversationData.unreadCount[id] = 0;
            });
            
            // Récupérer les données des participants
            for (const participantId of participantIds) {
                const userData = await this.getUserData(participantId);
                if (userData) {
                    conversationData.participantsData[participantId] = {
                        displayName: userData.displayName,
                        photoURL: userData.photoURL || '',
                        role: userData.role
                    };
                }
            }
            
            const docRef = await window.firebaseManager.collection('conversations').add(conversationData);
            
            this.logAnalytics('conversation_created', { 
                conversationId: docRef.id, 
                type: type,
                participantCount: participantIds.length 
            });
            
            return { id: docRef.id, ...conversationData };
        } catch (error) {
            console.error('❌ Erreur création conversation:', error);
            throw error;
        }
    }

    // Trouver une conversation directe existante
    async findDirectConversation(participantIds) {
        const conversations = Array.from(this.conversations.values());
        
        return conversations.find(conv => 
            conv.type === 'direct' && 
            conv.participants.length === 2 &&
            conv.participants.includes(participantIds[0]) &&
            conv.participants.includes(participantIds[1])
        );
    }

    // Générer un nom de conversation basé sur les participants
    async generateConversationName(participantIds) {
        const userId = window.firebaseManager.currentUser.uid;
        const otherIds = participantIds.filter(id => id !== userId);
        
        if (otherIds.length === 0) {
            return 'Moi';
        }
        
        const names = [];
        for (const id of otherIds.slice(0, 3)) {
            const userData = await this.getUserData(id);
            if (userData) {
                names.push(userData.displayName);
            }
        }
        
        if (otherIds.length > 3) {
            names.push(`+${otherIds.length - 3} autres`);
        }
        
        return names.join(', ');
    }

    // Récupérer les données d'un utilisateur
    async getUserData(userId) {
        try {
            // Chercher d'abord dans users
            const userDoc = await window.firebaseManager.collection('users').doc(userId).get();
            if (userDoc.exists) {
                return userDoc.data();
            }
            
            // Sinon chercher dans teamMembers
            const teamMemberQuery = await window.firebaseManager.collection('teamMembers')
                .where('userId', '==', userId)
                .limit(1)
                .get();
            
            if (!teamMemberQuery.empty) {
                return teamMemberQuery.docs[0].data();
            }
            
            return null;
        } catch (error) {
            console.error('❌ Erreur récupération utilisateur:', error);
            return null;
        }
    }

    // Charger les messages d'une conversation
    async loadMessages(conversationId, limit = 50) {
        if (this.currentConversationId === conversationId) {
            return; // Déjà chargé
        }
        
        // Nettoyer l'ancienne souscription
        if (this.messageUnsubscriber) {
            this.messageUnsubscriber();
        }
        
        this.currentConversationId = conversationId;
        this.messages.clear();
        
        // Marquer comme lu
        await this.markAsRead(conversationId);
        
        // Écouter les messages
        this.messageUnsubscriber = window.firebaseManager.collection('messages')
            .where('conversationId', '==', conversationId)
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    const message = { id: change.doc.id, ...change.doc.data() };
                    
                    if (change.type === 'added') {
                        this.messages.set(message.id, message);
                        this.notifyUpdate('message:added', message);
                        
                        // Marquer automatiquement comme lu si la conversation est ouverte
                        if (message.senderId !== window.firebaseManager.currentUser.uid) {
                            this.markAsRead(conversationId);
                        }
                    } else if (change.type === 'modified') {
                        this.messages.set(message.id, message);
                        this.notifyUpdate('message:updated', message);
                    } else if (change.type === 'removed') {
                        this.messages.delete(message.id);
                        this.notifyUpdate('message:removed', message);
                    }
                });
                
                this.notifyUpdate('messages:updated', this.getMessages());
            });
    }

    // Envoyer un message
    async sendMessage(conversationId, content, type = 'text', attachments = []) {
        try {
            const userId = window.firebaseManager.currentUser.uid;
            const userData = await window.firebaseManager.getCurrentUserData();
            
            const messageData = {
                conversationId,
                senderId: userId,
                senderData: {
                    displayName: userData.displayName,
                    photoURL: userData.photoURL || '',
                    role: userData.role
                },
                content: this.sanitizeInput(content),
                type: type, // 'text', 'image', 'file', 'system'
                attachments: attachments,
                timestamp: window.firebaseManager.timestamp(),
                edited: false,
                editedAt: null,
                reactions: {},
                readBy: {
                    [userId]: window.firebaseManager.timestamp()
                }
            };
            
            // Ajouter le message
            const messageRef = await window.firebaseManager.collection('messages').add(messageData);
            
            // Mettre à jour la conversation
            await this.updateConversationLastMessage(conversationId, {
                id: messageRef.id,
                content: content,
                senderId: userId,
                timestamp: messageData.timestamp
            });
            
            // Envoyer des notifications aux autres participants
            await this.sendNotifications(conversationId, messageData);
            
            this.logAnalytics('message_sent', { 
                conversationId, 
                type,
                hasAttachments: attachments.length > 0
            });
            
            return { id: messageRef.id, ...messageData };
        } catch (error) {
            console.error('❌ Erreur envoi message:', error);
            throw error;
        }
    }

    // Mettre à jour le dernier message de la conversation
    async updateConversationLastMessage(conversationId, messageInfo) {
        try {
            const conversation = this.conversations.get(conversationId);
            if (!conversation) return;
            
            const userId = window.firebaseManager.currentUser.uid;
            const updates = {
                lastMessage: messageInfo,
                lastMessageTime: messageInfo.timestamp
            };
            
            // Incrémenter le compteur de non-lus pour tous sauf l'expéditeur
            const unreadUpdates = {};
            conversation.participants.forEach(participantId => {
                if (participantId !== userId) {
                    unreadUpdates[`unreadCount.${participantId}`] = window.firebaseManager.increment(1);
                }
            });
            
            await window.firebaseManager.collection('conversations').doc(conversationId).update({
                ...updates,
                ...unreadUpdates
            });
        } catch (error) {
            console.error('❌ Erreur mise à jour conversation:', error);
        }
    }

    // Marquer une conversation comme lue
    async markAsRead(conversationId) {
        try {
            const userId = window.firebaseManager.currentUser.uid;
            
            // Réinitialiser le compteur de non-lus
            await window.firebaseManager.collection('conversations').doc(conversationId).update({
                [`unreadCount.${userId}`]: 0
            });
            
            // Marquer tous les messages comme lus
            const batch = window.firebaseManager.db.batch();
            const unreadMessages = await window.firebaseManager.collection('messages')
                .where('conversationId', '==', conversationId)
                .where('senderId', '!=', userId)
                .get();
            
            unreadMessages.forEach(doc => {
                if (!doc.data().readBy || !doc.data().readBy[userId]) {
                    batch.update(doc.ref, {
                        [`readBy.${userId}`]: window.firebaseManager.timestamp()
                    });
                }
            });
            
            await batch.commit();
        } catch (error) {
            console.error('❌ Erreur marquage lu:', error);
        }
    }

    // Modifier un message
    async editMessage(messageId, newContent) {
        try {
            await window.firebaseManager.collection('messages').doc(messageId).update({
                content: this.sanitizeInput(newContent),
                edited: true,
                editedAt: window.firebaseManager.timestamp()
            });
            
            return true;
        } catch (error) {
            console.error('❌ Erreur modification message:', error);
            throw error;
        }
    }

    // Supprimer un message
    async deleteMessage(messageId) {
        try {
            await window.firebaseManager.collection('messages').doc(messageId).delete();
            return true;
        } catch (error) {
            console.error('❌ Erreur suppression message:', error);
            throw error;
        }
    }

    // Ajouter une réaction
    async addReaction(messageId, emoji) {
        try {
            const userId = window.firebaseManager.currentUser.uid;
            
            await window.firebaseManager.collection('messages').doc(messageId).update({
                [`reactions.${emoji}.${userId}`]: window.firebaseManager.timestamp()
            });
            
            return true;
        } catch (error) {
            console.error('❌ Erreur ajout réaction:', error);
            throw error;
        }
    }

    // Retirer une réaction
    async removeReaction(messageId, emoji) {
        try {
            const userId = window.firebaseManager.currentUser.uid;
            
            await window.firebaseManager.collection('messages').doc(messageId).update({
                [`reactions.${emoji}.${userId}`]: window.firebaseManager.db.FieldValue.delete()
            });
            
            return true;
        } catch (error) {
            console.error('❌ Erreur suppression réaction:', error);
            throw error;
        }
    }

    // Indicateur de frappe
    async setTyping(conversationId, isTyping) {
        try {
            const userId = window.firebaseManager.currentUser.uid;
            
            if (isTyping) {
                // Ajouter l'utilisateur comme en train de taper
                await window.firebaseManager.collection('conversations').doc(conversationId).update({
                    [`typing.${userId}`]: window.firebaseManager.timestamp()
                });
                
                // Retirer automatiquement après 3 secondes
                setTimeout(() => {
                    this.setTyping(conversationId, false);
                }, 3000);
            } else {
                // Retirer l'utilisateur
                await window.firebaseManager.collection('conversations').doc(conversationId).update({
                    [`typing.${userId}`]: window.firebaseManager.db.FieldValue.delete()
                });
            }
        } catch (error) {
            console.error('❌ Erreur indicateur frappe:', error);
        }
    }

    // Envoyer des notifications
    async sendNotifications(conversationId, message) {
        try {
            const conversation = this.conversations.get(conversationId);
            if (!conversation) return;
            
            const userId = window.firebaseManager.currentUser.uid;
            const recipients = conversation.participants.filter(id => id !== userId);
            
            for (const recipientId of recipients) {
                await window.firebaseManager.collection('notifications').add({
                    userId: recipientId,
                    type: 'new_message',
                    title: `Nouveau message de ${message.senderData.displayName}`,
                    content: message.content.substring(0, 100),
                    data: {
                        conversationId,
                        messageId: message.id,
                        senderId: message.senderId
                    },
                    read: false,
                    createdAt: window.firebaseManager.timestamp()
                });
            }
        } catch (error) {
            console.error('❌ Erreur envoi notifications:', error);
        }
    }

    // Upload de fichier
    async uploadAttachment(file, conversationId) {
        try {
            const userId = window.firebaseManager.currentUser.uid;
            const timestamp = Date.now();
            const fileName = `${timestamp}_${file.name}`;
            const path = `chat/${conversationId}/${userId}/${fileName}`;
            
            // Upload vers Firebase Storage
            const storageRef = window.firebaseManager.storage.ref(path);
            const snapshot = await storageRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            return {
                name: file.name,
                size: file.size,
                type: file.type,
                url: downloadURL,
                path: path
            };
        } catch (error) {
            console.error('❌ Erreur upload fichier:', error);
            throw error;
        }
    }

    // Récupérer les conversations
    getConversations() {
        return Array.from(this.conversations.values())
            .sort((a, b) => {
                // Trier par dernier message
                const timeA = a.lastMessageTime?.toMillis() || 0;
                const timeB = b.lastMessageTime?.toMillis() || 0;
                return timeB - timeA;
            });
    }

    // Récupérer les messages
    getMessages() {
        return Array.from(this.messages.values())
            .sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());
    }

    // Rechercher dans les messages
    async searchMessages(query, conversationId = null) {
        try {
            let searchQuery = window.firebaseManager.collection('messages');
            
            if (conversationId) {
                searchQuery = searchQuery.where('conversationId', '==', conversationId);
            }
            
            const snapshot = await searchQuery.get();
            const results = [];
            
            snapshot.forEach(doc => {
                const message = doc.data();
                if (message.content && message.content.toLowerCase().includes(query.toLowerCase())) {
                    results.push({ id: doc.id, ...message });
                }
            });
            
            return results;
        } catch (error) {
            console.error('❌ Erreur recherche messages:', error);
            return [];
        }
    }

    // Obtenir le nombre total de non-lus
    getUnreadCount() {
        const userId = window.firebaseManager.currentUser?.uid;
        if (!userId) return 0;
        
        let total = 0;
        this.conversations.forEach(conv => {
            total += conv.unreadCount?.[userId] || 0;
        });
        
        return total;
    }

    // Créer un canal d'équipe
    async createTeamChannel(name, description, memberIds) {
        try {
            const channelData = {
                name: this.sanitizeInput(name),
                description: this.sanitizeInput(description),
                type: 'channel',
                isPrivate: false,
                members: memberIds
            };
            
            const conversation = await this.createConversation(memberIds, name, 'channel');
            
            // Ajouter les métadonnées du canal
            await window.firebaseManager.collection('conversations').doc(conversation.id).update({
                channelData
            });
            
            // Envoyer un message système
            await this.sendMessage(conversation.id, `Canal "${name}" créé`, 'system');
            
            return conversation;
        } catch (error) {
            console.error('❌ Erreur création canal:', error);
            throw error;
        }
    }

    // Utilitaires
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.trim().replace(/[<>]/g, '');
    }

    // Analytics
    logAnalytics(event, data) {
        window.firebaseManager.collection('analytics').add({
            event: `chat:${event}`,
            data,
            userId: window.firebaseManager.currentUser?.uid,
            timestamp: window.firebaseManager.timestamp()
        }).catch(console.error);
    }

    // Notifications
    notifyUpdate(event, data) {
        document.dispatchEvent(new CustomEvent(`chat:${event}`, { detail: data }));
    }

    // Nettoyage
    cleanup() {
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
        
        if (this.messageUnsubscriber) {
            this.messageUnsubscriber();
        }
        
        this.conversations.clear();
        this.messages.clear();
        this.currentConversationId = null;
    }

    destroy() {
        this.cleanup();
    }
}

// Instance globale
window.chatManager = new ChatManager();

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatManager;
}