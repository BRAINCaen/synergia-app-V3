import { auth } from "./firebase-manager.js";
import { AuthManager } from "../managers/auth-manager.js";
import { initAuthComponent } from "../components/auth.js";

const appRoot = document.getElementById("app-root");
const loadingScreen = document.getElementById("loading-screen");

window.addEventListener("DOMContentLoaded", async () => {
    // Abonne-toi à l’état d’auth pour afficher le login si pas connecté
    const manager = new AuthManager(auth);

    manager.onAuthChange(async (user) => {
        if (!user) {
            appRoot.innerHTML = ""; // clean
            await initAuthComponent("app-root");
            loadingScreen.style.display = "none";
            appRoot.style.display = "block";
        } else {
            // Connexion réussie, on pourra charger la suite ici
            loadingScreen.style.display = "none";
            appRoot.style.display = "block";
            appRoot.innerHTML = `<h2 style='text-align:center;margin-top:80px;color:#667eea'>Bienvenue ${user.email} !<br><span style="font-size:1.5rem;">(Module dashboard à venir)</span></h2>`;
        }
    });
});
