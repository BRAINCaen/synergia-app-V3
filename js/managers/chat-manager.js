import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app } from "../core/firebase-manager.js";

const db = getFirestore(app);
const CHAT_COLLECTION = "chat";

export class ChatManager {
    subscribeToMessages(callback) {
        const q = collection(db, CHAT_COLLECTION);
        return onSnapshot(q, snapshot => {
            const messages = [];
            snapshot.forEach(doc => {
                messages.push({ id: doc.id, ...doc.data() });
            });
            // Tri par timestamp croissant
            messages.sort((a, b) => (a.timestamp||0)-(b.timestamp||0));
            callback(messages);
        });
    }

    async sendMessage(message) {
        await addDoc(collection(db, CHAT_COLLECTION), message);
    }
}
