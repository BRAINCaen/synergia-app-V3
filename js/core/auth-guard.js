
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = window.firebase.auth();
const provider = new GoogleAuthProvider();

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const googleBtn = document.getElementById("google-btn");

// Login with email/password
if (loginBtn) {
  loginBtn.onclick = async () => {
    try {
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "/index.html";
    } catch (e) {
      alert("Erreur : " + e.message);
    }
  };
}

// Login with Google
if (googleBtn) {
  googleBtn.onclick = async () => {
    try {
      await signInWithPopup(auth, provider);
      window.location.href = "/index.html";
    } catch (e) {
      alert("Erreur Google : " + e.message);
    }
  };
}

// Redirection automatique depuis pages protégées
if (window.location.pathname.endsWith("index.html")) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "/login.html";
    }
  });
}
