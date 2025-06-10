import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app } from "../core/firebase-manager.js";

const db = getFirestore(app);
const STORE_COLLECTION = "store-history";

export class StoreManager {
    subscribeToHistory(user, callback) {
        const q = collection(db, STORE_COLLECTION);
        return onSnapshot(q, snapshot => {
            const history = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.user === user.email) {
                    history.push({ id: doc.id, ...data });
                }
            });
            // Tri du plus récent au plus ancien
            history.sort((a, b) => b.timestamp - a.timestamp);
            callback(history);
        });
    }

    async addPurchase(item, user) {
        await addDoc(collection(db, STORE_COLLECTION), {
            ...item,
            user: user.email,
            timestamp: Date.now()
        });
    }
}
