import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app } from "../core/firebase-manager.js";
const db = getFirestore(app);
const QUESTS_COLLECTION = "quests";

export class QuestsManager {
    subscribeToProgress(callback) {
        const q = collection(db, QUESTS_COLLECTION);
        return onSnapshot(q, snapshot => {
            const progress = [];
            snapshot.forEach(doc => {
                progress.push({ id: doc.id, ...doc.data() });
            });
            callback(progress);
        });
    }

    async validateQuest(data) {
        await addDoc(collection(db, QUESTS_COLLECTION), data);
    }

    async removeQuest(id) {
        await deleteDoc(doc(db, QUESTS_COLLECTION, id));
    }
}
