
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  getFirestore
} from "firebase/firestore";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyAaPeNFjFgKUynvYOg0Pm1vY9HmoL94byM",
  authDomain: "brain-team-caen.firebaseapp.com",
  projectId: "brain-team-caen",
  storageBucket: "brain-team-caen.appspot.com",
  messagingSenderId: "1044074925276",
  appId: "1:1044074925276:web:88dfe35b2d6a8d25e53819"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function getBadgingTypes() {
  const q = query(collection(db, "badgingTypes"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
}

export async function getBadgeHistory(userId) {
  const q = query(
    collection(db, "badging"),
    where("userId", "==", userId),
    orderBy("timestamp", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data());
}

export async function submitBadging(userId, type, author) {
  await addDoc(collection(db, "badging"), {
    userId,
    type,
    author,
    timestamp: new Date().toISOString()
  });
}

export async function addBadgingType(label) {
  await addDoc(collection(db, "badgingTypes"), { label });
}
