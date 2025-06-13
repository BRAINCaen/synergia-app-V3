
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { auth } from "../auth/AuthService";

const db = getFirestore();

export const getShifts = async () => {
  const querySnapshot = await getDocs(collection(db, "planning"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addShift = async (day: string, time: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Utilisateur non connecté");

  return await addDoc(collection(db, "planning"), {
    userId: user.uid,
    day,
    time
  });
};

export const deleteShift = async (id: string) => {
  return await deleteDoc(doc(db, "planning", id));
};
