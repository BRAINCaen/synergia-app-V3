import { AuthManager } from "../managers/auth-manager.js";
import { auth } from "../core/firebase-manager.js";

export async function initAuthComponent(containerId) {
    const res = await fetch("js/components/auth.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    const manager = new AuthManager(auth);

    const form = document.getElementById("auth-form");
    const errorDisplay = document.getElementById("auth-error");

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
}
