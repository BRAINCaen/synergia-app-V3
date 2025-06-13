import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD7uBuAQaOhZ02owkZEuMKC5Vji6PrB2f8",
  authDomain: "synergia-app-f27e7.firebaseapp.com",
  projectId: "synergia-app-f27e7",
  storageBucket: "synergia-app-f27e7.firebasestorage.app",
  messagingSenderId: "201912738922",
  appId: "1:201912738922:web:2fcc1e49293bb632899613",
  measurementId: "G-EGJ79SCMWX"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
