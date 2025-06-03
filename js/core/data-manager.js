// js/core/data-manager.js
// Gestionnaire centralisé des données pour SYNERGIA v3.0

/**
 * Gestionnaire centralisé pour toutes les opérations de données
 * Cache, synchronisation, persistence offline
 */
class DataManager {
    constructor() {
        this.cache = new Map();
        this.syncQueue = [];
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;
        this.lastSync = null;
        
        // Configuration du cache
        this.cacheConfig = {
            // TTL par type de données (en millisecondes)
            users: 30 * 60 * 1000,        // 30 minutes
            teams: 15 * 60 * 1000,        // 15 minutes  
            quests: 10 * 60 * 1000,       // 10 minutes
            planning: 5 * 60 * 1000,      // 5 minutes
            messages: 2 * 60 * 1000,      // 2 minutes
            notifications: 1 * 60 * 1000, // 1 minute
            badging: 5 * 60 * 1000        // 5 minutes
        };
        
        this.subscribers = new Map();
        this.isInitialized = false;
    }

    async init() {
        try {
            // Charger le cache depuis localStorage
            await this.loadCacheFromStorage();
            
            // Charger la queue de sync
            await this.loadSyncQueue();
            
            // Configurer les listeners
            this.setupEventListeners();
            
            // Démarrer la synchronisation automatique
            this.startAutoSync();
            
            this.isInitialized = true;
            console.log('✅ DataManager initialisé');
            
            return true;
        } catch (error) {
            console.error('❌ Erreur initialisation DataManager:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Écouter les changements de connexion
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🌐 Connexion rétablie - Synchronisation...');
            this.syncOfflineData();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📡 Mode hors ligne activé');
        });
        
        // Écouter les changements Firebase si disponible
        if (window.firebaseManager) {
            window.firebaseManager.on('authStateChanged', (user) => {
                if (user) {
                    this.setupRealtimeListeners();
                } else {
                    this.clearUserData();
                }
            });
        }
        
        // Nettoyer le cache périodiquement
        setInterval(() => this.cleanExpiredCache(), 5 * 60 * 1000); // 5 minutes
    }

    startAutoSync() {
        // Synchronisation automatique toutes les 30 secondes si en ligne
        setInterval(() => {
            if (this.isOnline && !this.syncInProgress) {
                this.syncOfflineData();
            }
        }, 30 * 1000);
    }

    /**
     * OPÉRATIONS DE CACHE
     */
    
    set(key, data, type = 'default') {
        const ttl = this.cacheConfig[type] || this.cacheConfig.default || 10 * 60 * 1000;
        const cacheEntry = {
            data,
            timestamp: Date.now(),
            ttl,
            type
        };
        
        this.cache.set(key, cacheEntry);
        
        // Sauvegarder en localStorage si critique
        if (['users', 'teams', 'badging'].includes(type)) {
            this.saveCacheToStorage(key, cacheEntry);
        }
        
        // Notifier les subscribers
        this.notifySubscribers(key, data);
        
        return data;
    }

    get(key, defaultValue = null) {
        const cacheEntry = this.cache.get(key);
        
        if (!cacheEntry) {
            return defaultValue;
        }
        
        // Vérifier l'expiration
        if (Date.now() - cacheEntry.timestamp > cacheEntry.ttl) {
            this.cache.delete(key);
            this.removeFromStorage(key);
            return defaultValue;
        }
        
        return cacheEntry.data;
    }

    has(key) {
        const cacheEntry = this.cache.get(key);
        if (!cacheEntry) return false;
        
        // Vérifier l'expiration
        if (Date.now() - cacheEntry.timestamp > cacheEntry.ttl) {
            this.cache.delete(key);
            this.removeFromStorage(key);
            return false;
        }
        
        return true;
    }

    delete(key) {
        this.cache.delete(key);
        this.removeFromStorage(key);
        this.notifySubscribers(key, null);
    }

    clear(type = null) {
        if (type) {
            // Supprimer seulement un type spécifique
            for (const [key, entry] of this.cache.entries()) {
                if (entry.type === type) {
                    this.cache.delete(key);
                    this.removeFromStorage(key);
                }
            }
        } else {
            // Supprimer tout le cache
            this.cache.clear();
            this.clearStorage();
        }
    }

    cleanExpiredCache() {
        const now = Date.now();
        const expiredKeys = [];
        
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                expiredKeys.push(key);
            }
        }
        
        expiredKeys.forEach(key => {
            this.cache.delete(key);
            this.removeFromStorage(key);
        });
        
        if (expiredKeys.length > 0) {
            console.log(`🧹 Cache nettoyé: ${expiredKeys.length} entrées expirées`);
        }
    }

    /**
     * OPÉRATIONS FIREBASE
     */
    
    async fetchFromFirebase(collection, docId = null, useCache = true) {
        const cacheKey = docId ? `${collection}/${docId}` : collection;
        
        // Vérifier le cache d'abord
        if (useCache && this.has(cacheKey)) {
            return this.get(cacheKey);
        }
        
        if (!window.firebaseManager?.isReady) {
            throw new Error('Firebase non initialisé');
        }
        
        try {
            let data;
            
            if (docId) {
                // Document unique
                const docRef = window.firebaseManager.doc(`${collection}/${docId}`);
                const doc = await docRef.get();
                data = doc.exists ? { id: doc.id, ...doc.data() } : null;
            } else {
                // Collection complète
                const collectionRef = window.firebaseManager.collection(collection);
                const snapshot = await collectionRef.get();
                data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }
            
            // Mettre en cache
            if (data !== null) {
                this.set(cacheKey, data, collection);
            }
            
            return data;
            
        } catch (error) {
            console.error(`❌ Erreur fetch Firebase ${collection}:`, error);
            
            // Retourner les données en cache si disponibles
            if (this.has(cacheKey)) {
                console.log(`🔄 Utilisation du cache pour ${cacheKey}`);
                return this.get(cacheKey);
            }
            
            throw error;
        }
    }

    async saveToFirebase(collection, data, docId = null) {
        if (!window.firebaseManager?.isReady) {
            // Mode hors ligne - ajouter à la queue
            this.addToSyncQueue('save', collection, data, docId);
            return { id: docId || this.generateTempId(), offline: true };
        }
        
        try {
            let result;
            
            if (docId) {
                // Mise à jour
                const docRef = window.firebaseManager.doc(`${collection}/${docId}`);
                await docRef.update({
                    ...data,
                    updatedAt: window.firebaseManager.serverTimestamp()
                });
                result = { id: docId };
            } else {
                // Création
                const collectionRef = window.firebaseManager.collection(collection);
                const docRef = await collectionRef.add({
                    ...data,
                    createdAt: window.firebaseManager.serverTimestamp(),
                    updatedAt: window.firebaseManager.serverTimestamp()
                });
                result = { id: docRef.id };
            }
            
            // Mettre à jour le cache
            const cacheKey = `${collection}/${result.id}`;
            this.set(cacheKey, { id: result.id, ...data }, collection);
            
            // Invalider le cache de la collection
            this.delete(collection);
            
            return result;
            
        } catch (error) {
            console.error(`❌ Erreur save Firebase ${collection}:`, error);
            
            // Mode hors ligne - ajouter à la queue
            this.addToSyncQueue('save', collection, data, docId);
            return { id: docId || this.generateTempId(), offline: true };
        }
    }

    async deleteFromFirebase(collection, docId) {
        if (!window.firebaseManager?.isReady) {
            // Mode hors ligne - ajouter à la queue
            this.addToSyncQueue('delete', collection, null, docId);
            return { offline: true };
        }
        
        try {
            const docRef = window.firebaseManager.doc(`${collection}/${docId}`);
            await docRef.delete();
            
            // Supprimer du cache
            this.delete(`${collection}/${docId}`);
            
            // Invalider le cache de la collection
            this.delete(collection);
            
            return { success: true };
            
        } catch (error) {
            console.error(`❌ Erreur delete Firebase ${collection}:`, error);
            
            // Mode hors ligne - ajouter à la queue
            this.addToSyncQueue('delete', collection, null, docId);
            return { offline: true };
        }
    }

    /**
     * GESTION HORS LIGNE
     */
    
    addToSyncQueue(operation, collection, data, docId) {
        const syncItem = {
            id: this.generateTempId(),
            operation,
            collection,
            data,
            docId,
            timestamp: Date.now(),
            retries: 0,
            maxRetries: 3
        };
        
        this.syncQueue.push(syncItem);
        this.saveSyncQueue();
        
        console.log(`📤 Ajouté à la queue de sync: ${operation} ${collection}/${docId || 'new'}`);
    }

    async syncOfflineData() {
        if (!this.isOnline || this.syncInProgress || this.syncQueue.length === 0) {
            return;
        }
        
        this.syncInProgress = true;
        console.log(`🔄 Synchronisation de ${this.syncQueue.length} éléments...`);
        
        const failed = [];
        
        for (const item of [...this.syncQueue]) {
            try {
                await this.syncItem(item);
                
                // Supprimer de la queue si succès
                const index = this.syncQueue.findIndex(i => i.id === item.id);
                if (index > -1) {
                    this.syncQueue.splice(index, 1);
                }
                
            } catch (error) {
                console.error(`❌ Erreur sync item ${item.id}:`, error);
                
                item.retries++;
                if (item.retries >= item.maxRetries) {
                    console.error(`❌ Abandon sync item ${item.id} après ${item.maxRetries} tentatives`);
                    failed.push(item);
                    
                    // Supprimer de la queue
                    const index = this.syncQueue.findIndex(i => i.id === item.id);
                    if (index > -1) {
                        this.syncQueue.splice(index, 1);
                    }
                }
            }
        }
        
        this.saveSyncQueue();
        this.lastSync = Date.now();
        this.syncInProgress = false;
        
        if (failed.length > 0) {
            console.warn(`⚠️ ${failed.length} éléments n'ont pas pu être synchronisés`);
        }
        
        console.log(`✅ Synchronisation terminée`);
        
        // Dispatcher un événement
        document.dispatchEvent(new CustomEvent('data:sync', {
            detail: { 
                synced: this.syncQueue.length === 0, 
                failed: failed.length,
                timestamp: this.lastSync
            }
        }));
    }

    async syncItem(item) {
        switch (item.operation) {
            case 'save':
                if (item.docId) {
                    await this.saveToFirebase(item.collection, item.data, item.docId);
                } else {
                    await this.saveToFirebase(item.collection, item.data);
                }
                break;
                
            case 'delete':
                await this.deleteFromFirebase(item.collection, item.docId);
                break;
                
            default:
                throw new Error(`Opération inconnue: ${item.operation}`);
        }
    }

    /**
     * STOCKAGE LOCAL
     */
    
    async loadCacheFromStorage() {
        try {
            const cacheData = localStorage.getItem('synergia_cache');
            if (cacheData) {
                const parsed = JSON.parse(cacheData);
                for (const [key, entry] of Object.entries(parsed)) {
                    // Vérifier que l'entrée n'est pas expirée
                    if (Date.now() - entry.timestamp <= entry.ttl) {
                        this.cache.set(key, entry);
                    }
                }
                console.log(`📦 Cache chargé: ${this.cache.size} entrées`);
            }
        } catch (error) {
            console.error('❌ Erreur chargement cache:', error);
        }
    }

    saveCacheToStorage(key, entry) {
        try {
            let storedCache = {};
            const cacheData = localStorage.getItem('synergia_cache');
            if (cacheData) {
                storedCache = JSON.parse(cacheData);
            }
            
            storedCache[key] = entry;
            localStorage.setItem('synergia_cache', JSON.stringify(storedCache));
        } catch (error) {
            console.error('❌ Erreur sauvegarde cache:', error);
        }
    }

    removeFromStorage(key) {
        try {
            const cacheData = localStorage.getItem('synergia_cache');
            if (cacheData) {
                const storedCache = JSON.parse(cacheData);
                delete storedCache[key];
                localStorage.setItem('synergia_cache', JSON.stringify(storedCache));
            }
        } catch (error) {
            console.error('❌ Erreur suppression cache:', error);
        }
    }

    clearStorage() {
        try {
            localStorage.removeItem('synergia_cache');
        } catch (error) {
            console.error('❌ Erreur clear cache:', error);
        }
    }

    async loadSyncQueue() {
        try {
            const queueData = localStorage.getItem('synergia_sync_queue');
            if (queueData) {
                this.syncQueue = JSON.parse(queueData);
                console.log(`📤 Queue de sync chargée: ${this.syncQueue.length} éléments`);
            }
        } catch (error) {
            console.error('❌ Erreur chargement sync queue:', error);
            this.syncQueue = [];
        }
    }

    saveSyncQueue() {
        try {
            localStorage.setItem('synergia_sync_queue', JSON.stringify(this.syncQueue));
        } catch (error) {
            console.error('❌ Erreur sauvegarde sync queue:', error);
        }
    }

    /**
     * SYSTÈME DE SUBSCRIPTIONS
     */
    
    subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }
        this.subscribers.get(key).add(callback);
        
        // Retourner une fonction de désabonnement
        return () => {
            const callbacks = this.subscribers.get(key);
            if (callbacks) {
                callbacks.delete(callback);
                if (callbacks.size === 0) {
                    this.subscribers.delete(key);
                }
            }
        };
    }

    notifySubscribers(key, data) {
        const callbacks = this.subscribers.get(key);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Erreur callback subscriber ${key}:`, error);
                }
            });
        }
    }

    /**
     * MÉTHODES DE HAUT NIVEAU POUR LES MODULES
     */
    
    // Utilisateurs
    async getUser(userId) {
        return this.fetchFromFirebase('users', userId);
    }

    async saveUser(userData, userId = null) {
        return this.saveToFirebase('users', userData, userId);
    }

    async getUsers() {
        return this.fetchFromFirebase('users');
    }

    // Équipe
    async getTeamMembers() {
        return this.fetchFromFirebase('teamMembers');
    }

    async saveTeamMember(memberData, memberId = null) {
        return this.saveToFirebase('teamMembers', memberData, memberId);
    }

    async deleteTeamMember(memberId) {
        return this.deleteFromFirebase('teamMembers', memberId);
    }

    // Quêtes
    async getQuests() {
        return this.fetchFromFirebase('quests');
    }

    async saveQuest(questData, questId = null) {
        return this.saveToFirebase('quests', questData, questId);
    }

    async getUserQuests(userId) {
        const cacheKey = `userQuests/${userId}`;
        
        if (this.has(cacheKey)) {
            return this.get(cacheKey);
        }
        
        try {
            const userQuestsRef = window.firebaseManager
                .collection('userQuests')
                .where('userId', '==', userId);
            
            const snapshot = await userQuestsRef.get();
            const userQuests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            this.set(cacheKey, userQuests, 'quests');
            return userQuests;
            
        } catch (error) {
            console.error('❌ Erreur getUserQuests:', error);
            return this.get(cacheKey, []);
        }
    }

    // Pointage
    async getBadgingRecords(userId, date = null) {
        const cacheKey = date ? `badging/${userId}/${date}` : `badging/${userId}`;
        
        if (this.has(cacheKey)) {
            return this.get(cacheKey);
        }
        
        try {
            let query = window.firebaseManager
                .collection('badging')
                .where('userId', '==', userId);
            
            if (date) {
                const startOfDay = new Date(date);
                startOfDay.setHours(0, 0, 0, 0);
                
                const endOfDay = new Date(date);
                endOfDay.setHours(23, 59, 59, 999);
                
                query = query
                    .where('timestamp', '>=', startOfDay)
                    .where('timestamp', '<=', endOfDay);
            }
            
            const snapshot = await query.orderBy('timestamp', 'desc').get();
            const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            this.set(cacheKey, records, 'badging');
            return records;
            
        } catch (error) {
            console.error('❌ Erreur getBadgingRecords:', error);
            return this.get(cacheKey, []);
        }
    }

    async saveBadgingRecord(recordData) {
        return this.saveToFirebase('badging', recordData);
    }

    /**
     * UTILITAIRES
     */
    
    generateTempId() {
        return 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    setupRealtimeListeners() {
        if (!window.firebaseManager?.isReady) return;
        
        // Écouter les changements d'équipe
        const teamRef = window.firebaseManager.collection('teamMembers');
        teamRef.onSnapshot((snapshot) => {
            const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.set('teamMembers', members, 'teams');
        });
        
        // Écouter les nouvelles notifications
        const userId = window.firebaseManager.currentUser?.uid;
        if (userId) {
            const notificationsRef = window.firebaseManager
                .collection('notifications')
                .where('userId', '==', userId)
                .where('isRead', '==', false);
                
            notificationsRef.onSnapshot((snapshot) => {
                const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.set(`notifications/${userId}`, notifications, 'notifications');
                
                // Dispatcher événement pour nouvelles notifications
                document.dispatchEvent(new CustomEvent('data:notifications', {
                    detail: { notifications, userId }
                }));
            });
        }
    }

    clearUserData() {
        // Supprimer les données utilisateur du cache
        const userKeys = [];
        for (const [key] of this.cache.entries()) {
            if (key.includes('userQuests/') || key.includes('badging/') || key.includes('notifications/')) {
                userKeys.push(key);
            }
        }
        
        userKeys.forEach(key => this.delete(key));
        console.log('🧹 Données utilisateur supprimées du cache');
    }

    // Debug et diagnostics
    getStats() {
        return {
            cacheSize: this.cache.size,
            syncQueueSize: this.syncQueue.length,
            isOnline: this.isOnline,
            lastSync: this.lastSync,
            isInitialized: this.isInitialized,
            syncInProgress: this.syncInProgress
        };
    }

    exportCache() {
        const cacheData = {};
        for (const [key, entry] of this.cache.entries()) {
            cacheData[key] = {
                ...entry,
                age: Date.now() - entry.timestamp,
                expires: entry.timestamp + entry.ttl
            };
        }
        return cacheData;
    }
}

// Instance globale
window.dataManager = new DataManager();

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
}
