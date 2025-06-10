import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app } from "../core/firebase-manager.js";

const db = getFirestore(app);
const BADGING_COLLECTION = "badging";

export class BadgingManager {
    subscribeToBadges(callback) {
        const q = collection(db, BADGING_COLLECTION);
        return onSnapshot(q, snapshot => {
            const badges = [];
            snapshot.forEach(doc => {
                badges.push({ id: doc.id, ...doc.data() });
            });
            callback(badges);
        });
    }

    async addBadge(badge) {
        await addDoc(collection(db, BADGING_COLLECTION), badge);
    }

    async deleteBadge(id) {
        await deleteDoc(doc(db, BADGING_COLLECTION, id));
    }
}
