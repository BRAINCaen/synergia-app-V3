import { AuthManager } from "../managers/auth-manager.js";
import { auth } from "../core/firebase-manager.js";

export async function loadDashboard(containerId, user) {
    // Charge le HTML du dashboard
    const res = await fetch("js/components/dashboard.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    // Affiche le mail de l'utilisateur (personnalisation possible)
    const welcome = document.getElementById("dashboard-welcome");
    if (user && welcome) {
        welcome.innerHTML = `Bienvenue <b>${user.email}</b> 👋`;
    }

    // Gère la déconnexion
    const logoutBtn = document.getElementById("nav-logout");
    const manager = new AuthManager(auth);
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await manager.signOut();
            // Le onAuthStateChanged du app-loader.js prendra le relai pour afficher Auth
        });
    }

    // Tu pourras ajouter ici d’autres events pour navigation interne
}
