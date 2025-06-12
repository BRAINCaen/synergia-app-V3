import { getFirestore, collection, doc, getDocs, getDoc, setDoc, addDoc, Timestamp } from "firebase/firestore";

const db = getFirestore();

/**
 * Récupère la liste des types de badging disponibles.
 * Exemple : Retard, Absence, Mission, etc.
 */
export async function getBadgingTypes() {
  const ref = collection(db, "badging-types");
  const snapshot = await getDocs(ref);
  const types = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    types.push({
      id: doc.id,
      label: data.label || doc.id
    });
  });

  return types;
}

/**
 * Récupère l’historique des badgings d’un utilisateur donné.
 * @param {string} userId - ID Firestore du user (dans "team")
 */
export async function getBadgeHistory(userId) {
  if (!userId) return [];

  const ref = collection(db, `badging/${userId}/history`);
  const snapshot = await getDocs(ref);
  const history = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    history.push({
      id: doc.id,
      type: data.type,
      timestamp: data.timestamp?.toDate() || new Date(),
      author: data.author || "Inconnu"
    });
  });

  return history.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Enregistre un badging dans Firestore pour un user donné.
 * @param {string} userId - ID Firestore de l'utilisateur
 * @param {string} typeId - Type de badging (ex : "retard")
 * @param {string} authorEmail - Email de l’émetteur
 */
export async function submitBadging(userId, typeId, authorEmail) {
  if (!userId || !typeId || !authorEmail) {
    throw new Error("Champs requis manquants pour enregistrer un badging.");
  }

  const ref = collection(db, `badging/${userId}/history`);
  await addDoc(ref, {
    type: typeId,
    timestamp: Timestamp.now(),
    author: authorEmail
  });
}
