
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from '../auth/AuthService';

const db = getFirestore();

export const punchIn = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Utilisateur non connecté");

  return await addDoc(collection(db, 'timetracking'), {
    userId: user.uid,
    timestamp: serverTimestamp(),
    type: 'in'
  });
};

export const punchOut = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Utilisateur non connecté");

  return await addDoc(collection(db, 'timetracking'), {
    userId: user.uid,
    timestamp: serverTimestamp(),
    type: 'out'
  });
};
