import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app } from "../core/firebase-manager.js";

const db = getFirestore(app);
const PLANNING_COLLECTION = "planning";

export class PlanningManager {
    subscribeToPlanning(callback) {
        const q = collection(db, PLANNING_COLLECTION);
        return onSnapshot(q, snapshot => {
            const planning = [];
            snapshot.forEach(doc => {
                planning.push({ id: doc.id, ...doc.data() });
            });
            callback(planning);
        });
    }

    async addShift(shift) {
        await addDoc(collection(db, PLANNING_COLLECTION), shift);
    }

    async deleteShift(id) {
        await deleteDoc(doc(db, PLANNING_COLLECTION, id));
    }
}
