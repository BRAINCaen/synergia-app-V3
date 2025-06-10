import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app } from "../core/firebase-manager.js";

const db = getFirestore(app);
const WALLET_COLLECTION = "wallet";

export class WalletManager {
    subscribeToHistory(user, callback) {
        const q = collection(db, WALLET_COLLECTION);
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

    async addOp(op, user) {
        await addDoc(collection(db, WALLET_COLLECTION), {
            ...op,
            user: user.email,
            timestamp: Date.now()
        });
    }
}
