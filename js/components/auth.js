import { AuthManager } from "../managers/auth-manager.js";
import { auth } from "../core/firebase-manager.js";

export async function initAuthComponent(containerId) {
    // Charge le HTML du formulaire
    const res = await fetch("js/components/auth.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    const manager = new AuthManager(auth);

    const form = document.getElementById("auth-form");
    const errorDisplay = document.getElementById("auth-error");

    // Connexion email/mot de passe
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();
        errorDisplay.textContent = "";
        try {
            await manager.signIn(email, password);
        } catch (err) {
            errorDisplay.textContent = err.message;
        }
    });

    // Connexion Google
    const googleBtn = document.getElementById("google-signin-btn");
    if (googleBtn) {
        googleBtn.addEventListener("click", async () => {
            errorDisplay.textContent = "";
            try {
                await manager.signInWithGoogle();
            } catch (err) {
                errorDisplay.textContent = err.message;
            }
        });
    }
}
