import { AuthManager } from "../managers/auth-manager.js";
import { auth } from "../core/firebase-manager.js";
import { loadTeamComponent } from "./team.js";

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

    // Navigation entre sections
    const homeBtn = document.getElementById("nav-home");
    const teamBtn = document.getElementById("nav-team");
    const planningBtn = document.getElementById("nav-planning");
    const content = document.getElementById("dashboard-content");

    // Par défaut : accueil widgets
    function showHome() {
        content.innerHTML = `<div id="dashboard-widgets">
            <div class="widget-card">Statistiques et widgets à venir…</div>
        </div>`;
        homeBtn.classList.add("active");
        teamBtn.classList.remove("active");
        planningBtn.classList.remove("active");
    }

    async function showTeam() {
        content.innerHTML = "";
        await loadTeamComponent("dashboard-content");
        homeBtn.classList.remove("active");
        teamBtn.classList.add("active");
        planningBtn.classList.remove("active");
    }

    homeBtn.onclick = showHome;
    teamBtn.onclick = showTeam;

    // Optionnel : planning à venir
    if (planningBtn) {
        planningBtn.onclick = () => {
            content.innerHTML = `<div class="widget-card">Module planning à venir…</div>`;
            homeBtn.classList.remove("active");
            teamBtn.classList.remove("active");
            planningBtn.classList.add("active");
        };
    }

    // Déconnexion
    const logoutBtn = document.getElementById("nav-logout");
    const manager = new AuthManager(auth);
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await manager.signOut();
        });
    }

    // Affiche l'accueil par défaut
    showHome();
}
import { loadPlanningComponent } from "./planning.js";
// ...déjà existant...

export async function loadDashboard(containerId, user) {
    // ...code existant...

    async function showPlanning() {
        content.innerHTML = "";
        await loadPlanningComponent("dashboard-content");
        homeBtn.classList.remove("active");
        teamBtn.classList.remove("active");
        planningBtn.classList.add("active");
    }
    // ...déjà existant...
    planningBtn.onclick = showPlanning;
    // ...déjà existant...
}
