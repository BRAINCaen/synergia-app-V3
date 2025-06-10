import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app } from "../core/firebase-manager.js";

const db = getFirestore(app);

export async function isAdmin(email) {
    if (!email) return false;
    const docRef = doc(db, "users", email);
    const snap = await getDoc(docRef);
    return snap.exists() && snap.data().role === "admin";
}
