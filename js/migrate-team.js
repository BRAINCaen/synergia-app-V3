import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app } from "./core/firebase-manager.js";

// Change "user_profiles" si besoin (ex : "users" ou autre collection source)
const SOURCE_COLLECTION = "users";
const DEST_COLLECTION = "team";

const db = getFirestore(app);

async function migrateTeam() {
    const sourceSnap = await getDocs(collection(db, SOURCE_COLLECTION));
    let count = 0;
    for (const docSnap of sourceSnap.docs) {
        const data = docSnap.data();
        // Vérifie qu'il y a bien name, email, role (sinon adapte !)
        if (data.email) {
            await addDoc(collection(db, DEST_COLLECTION), {
                name: data.name || data.displayName || "",
                email: data.email,
                role: data.role || ""
            });
            count++;
        }
    }
    alert(`Migration terminée : ${count} membres copiés dans "${DEST_COLLECTION}".`);
    console.log(`Migration terminée : ${count} membres copiés dans "${DEST_COLLECTION}".`);
}
migrateTeam();
