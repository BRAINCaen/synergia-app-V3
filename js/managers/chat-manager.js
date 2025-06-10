import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app } from "../core/firebase-manager.js";

const db = getFirestore(app);
const CHAT_COLLECTION = "chat-messages";

export class ChatManager {
    subscribeToMessages(callback) {
        const q = query(collection(db, CHAT_COLLECTION), orderBy("timestamp", "asc"));
        return onSnapshot(q, snapshot => {
            const messages = [];
            snapshot.forEach(doc => messages.push(doc.data()));
            callback(messages);
        });
    }
    async sendMessage(msg) {
        await addDoc(collection(db, CHAT_COLLECTION), msg);
    }
}
