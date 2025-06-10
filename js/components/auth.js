import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { AuthManager } from "../managers/auth-manager.js";

const auth = getAuth();
const manager = new AuthManager(auth);

export async function initAuthComponent(containerId) {
    const res = await fetch("js/components/auth.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML += html;

    const form = document.getElementById("auth-form");
    const errorDisplay = document.getElementById("auth-error");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        try {
            await manager.signIn(email, password);
            errorDisplay.textContent = "";
        } catch (err) {
            errorDisplay.textContent = err.message;
        }
    });
}
