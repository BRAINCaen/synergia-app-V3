import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app } from "../core/firebase-manager.js";

const db = getFirestore(app);
const BADGES_COLLECTION = "badges";

export class BadgesManager {
    // Synchro live des badges pour 1 user
    subscribeToUserBadges(user, callback) {
        const q = collection(db, BADGES_COLLECTION);
        return onSnapshot(q, snapshot => {
            const badges = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.user === user.email) {
                    badges.push({ id: doc.id, ...data });
                }
            });
            callback(badges);
        });
    }

    // Pour ajouter un badge à un utilisateur
    async addBadgeForUser(user, badge) {
        await addDoc(collection(db, BADGES_COLLECTION), {
            ...badge,
            user: user.email,
            date: Date.now()
        });
    }
}
