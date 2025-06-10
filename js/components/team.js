import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app } from "../core/firebase-manager.js";

const db = getFirestore(app);
const TEAM_COLLECTION = "team";

export class TeamManager {
    // Lire en temps réel toute l’équipe
    subscribeToTeam(callback) {
        const q = collection(db, TEAM_COLLECTION);
        return onSnapshot(q, snapshot => {
            const team = [];
            snapshot.forEach(doc => {
                team.push({ id: doc.id, ...doc.data() });
            });
            callback(team);
        });
    }

    // Ajouter un membre
    async addMember(member) {
        await addDoc(collection(db, TEAM_COLLECTION), member);
    }

    // Supprimer un membre
    async deleteMember(id) {
        await deleteDoc(doc(db, TEAM_COLLECTION, id));
    }

    // Modifier un membre (optionnel)
    async updateMember(id, data) {
        await setDoc(doc(db, TEAM_COLLECTION, id), data, { merge: true });
    }
}
