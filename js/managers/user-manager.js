import { getFirestore, collection, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app } from "../core/firebase-manager.js";

const db = getFirestore(app);

// Cherche le rôle dans user_profiles
export async function isAdmin(email) {
    if (!email) return false;
    const docRef = doc(db, "user_profiles", email);
    const snap = await getDoc(docRef);
    // Pour Firestore, le champ peut s'appeler role, rôle ou autre (adapte si besoin !)
    return snap.exists() && snap.data().role === "admin";
}
