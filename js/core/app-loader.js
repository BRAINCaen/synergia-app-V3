import { auth } from "./firebase-manager.js";
import { AuthManager } from "../managers/auth-manager.js";
import { initAuthComponent } from "../components/auth.js";
import { loadDashboard } from "../components/dashboard.js";

const appRoot = document.getElementById("app-root");
const loadingScreen = document.getElementById("loading-screen");

window.addEventListener("DOMContentLoaded", async () => {
    const manager = new AuthManager(auth);

    manager.onAuthChange(async (user) => {
        if (!user) {
            appRoot.innerHTML = "";
            await initAuthComponent("app-root");
            loadingScreen.style.display = "none";
            appRoot.style.display = "block";
        } else {
            appRoot.innerHTML = ""; // Vide le root
            await loadDashboard("app-root", user);
            loadingScreen.style.display = "none";
            appRoot.style.display = "block";
        }
    });
});
