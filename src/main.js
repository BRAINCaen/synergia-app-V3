
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { loadDashboardComponent } from "./components/dashboard.js";

const firebaseConfig = {'apiKey': 'AIzaSyAaPeNFjFgKUynvYOg0Pm1vY9HmoL94byM', 'authDomain': 'brain-team-caen.firebaseapp.com', 'projectId': 'brain-team-caen', 'storageBucket': 'brain-team-caen.appspot.com', 'messagingSenderId': '1044074925276', 'appId': '1:1044074925276:web:88dfe35b2d6a8d25e53819'};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

onAuthStateChanged(auth, async (user) => {
  const root = document.getElementById("app");
  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  const userRef = doc(db, "team", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      id: user.uid,
      email: user.email,
      name: user.displayName || "Utilisateur",
      role: "gm",
      createdAt: new Date().toISOString()
    });
  }

  const profile = userSnap.exists() ? userSnap.data() : {
    id: user.uid,
    email: user.email,
    name: user.displayName || "Utilisateur",
    role: "gm"
  };

  root.innerHTML = `<p>Chargement du tableau de bord...</p>`;
  loadDashboardComponent("app", profile);
});
