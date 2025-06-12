import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  Timestamp
} from "firebase/firestore";

const db = getFirestore();

/**
 * Récupère tous les types de badging depuis Firestore
 */
export async function getBadgingTypes() {
  const colRef = collection(db, "badging-types");
  const snapshot = await getDocs(colRef);
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
 * Récupère l’historique de badging d’un utilisateur depuis Firestore
 * @param {string} userId - ID Firestore de l'utilisateur
 */
export async function getBadgeHistory(userId) {
  if (!userId) return [];

  const historyRef = collection(db, `badging/${userId}/history`);
  const snapshot = await getDocs(historyRef);
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
 * Soumet un nouvel événement de badging dans Firestore
 * @param {string} userId
 * @param {string} typeId
 * @param {string} authorEmail
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

/**
 * Ajoute un nouveau type de badging dans Firestore
 * @param {string} label
 */
export async function addBadgingType(label) {
  const colRef = collection(db, "badging-types");
  await addDoc(colRef, {
    label: label,
    createdAt: Timestamp.now()
  });
}
