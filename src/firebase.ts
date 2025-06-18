import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// Ajoute d'autres imports si besoin

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

console.log("VITE ENV VARS:", import.meta.env); // DEBUG

// Pour éviter les initialisations multiples si tu utilises hot reload (optionnel)
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error("Erreur d'initialisation Firebase :", error);
}

const auth = getAuth(app);

export { auth };
