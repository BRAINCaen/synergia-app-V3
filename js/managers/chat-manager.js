import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app } from "../core/firebase-manager.js";

const db = getFirestore(app);
const ROOMS_COLLECTION = "chat-rooms";
const MESSAGES_COLLECTION = "chat-messages";

export class ChatManager {
    // Liste des salons
    subscribeToRooms(callback) {
        return onSnapshot(collection(db, ROOMS_COLLECTION), snapshot => {
            const rooms = [];
            snapshot.forEach(doc => rooms.push({ id: doc.id, ...doc.data() }));
            callback(rooms);
        });
    }
    // Ajouter un salon
    async createRoom(name) {
        await addDoc(collection(db, ROOMS_COLLECTION), { name, createdAt: Date.now() });
    }
    // Supprimer un salon
    async deleteRoom(id) {
        await deleteDoc(doc(db, ROOMS_COLLECTION, id));
        // (Optionnel) tu peux aussi supprimer les messages du salon ici
    }
    // Messages d'un salon
    subscribeToMessages(roomId, callback) {
        const q = query(
            collection(db, MESSAGES_COLLECTION, roomId, "messages"),
            orderBy("timestamp", "asc")
        );
        return onSnapshot(q, snapshot => {
            const messages = [];
            snapshot.forEach(doc => messages.push(doc.data()));
            callback(messages);
        });
    }
    // Envoyer message dans un salon
    async sendMessage(roomId, msg) {
        await addDoc(collection(db, MESSAGES_COLLECTION, roomId, "messages"), msg);
    }
}
