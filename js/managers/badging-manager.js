import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, where, setDoc, doc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app } from "../core/firebase-manager.js";

const db = getFirestore(app);

export class BadgingManager {
    // Types de pointages (admin)
    subscribeToTypes(callback) {
        return onSnapshot(collection(db, "pointage-types"), snapshot => {
            const types = [];
            snapshot.forEach(doc => types.push({ id: doc.id, ...doc.data() }));
            callback(types);
        });
    }
    async addType(type) {
        await addDoc(collection(db, "pointage-types"), type);
    }
    async editType(id, type) {
        await setDoc(doc(db, "pointage-types", id), type, { merge: true });
    }
    async deleteType(id) {
        await deleteDoc(doc(db, "pointage-types", id));
    }

    // Pointages (presences)
    subscribeToUserPresences(email, callback) {
        const q = query(collection(db, "presences"), where("user", "==", email), orderBy("timestamp", "desc"));
        return onSnapshot(q, snapshot => {
            const pres = [];
            snapshot.forEach(doc => pres.push({ id: doc.id, ...doc.data() }));
            callback(pres);
        });
    }
    subscribeToAllPresences(callback) {
        // Pour admin
        const q = query(collection(db, "presences"), orderBy("timestamp", "desc"));
        return onSnapshot(q, snapshot => {
            const pres = [];
            snapshot.forEach(doc => pres.push({ id: doc.id, ...doc.data() }));
            callback(pres);
        });
    }
    async addPresence(data) {
        await addDoc(collection(db, "presences"), data);
    }
    async validatePresence(id, validated=true) {
        await setDoc(doc(db, "presences", id), { validated }, { merge: true });
    }
    async deletePresence(id) {
        await deleteDoc(doc(db, "presences", id));
    }
}
