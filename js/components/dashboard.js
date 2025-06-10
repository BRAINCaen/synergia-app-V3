import { AuthManager } from "../managers/auth-manager.js";
import { auth } from "../core/firebase-manager.js";
import { loadTeamComponent } from "./team.js";
import { loadPlanningComponent } from "./planning.js";
import { loadBadgingComponent } from "./badging.js";
import { loadQuestsComponent } from "./quests.js";

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
    const badgingBtn = document.getElementById("nav-badging");
    const questsBtn = document.getElementById("nav-quests");
    const content = document.getElementById("dashboard-content");

    // Par défaut : accueil widgets
    function showHome() {
        content.innerHTML = `<div id="dashboard-widgets">
            <div class="widget-card">Statistiques et widgets à venir…</div>
        </div>`;
        homeBtn.classList.add("active");
        teamBtn.classList.remove("active");
        planningBtn.classList.remove("active");
        badgingBtn.classList.remove("active");
        questsBtn.classList.remove("active");
    }

    async function showTeam() {
        content.innerHTML = "";
        await loadTeamComponent("dashboard-content");
        homeBtn.classList.remove("active");
        teamBtn.classList.add("active");
        planningBtn.classList.remove("active");
        badgingBtn.classList.remove("active");
        questsBtn.classList.remove("active");
    }

    async function showPlanning() {
        content.innerHTML = "";
        await loadPlanningComponent("dashboard-content");
        homeBtn.classList.remove("active");
        teamBtn.classList.remove("active");
        planningBtn.classList.add("active");
        badgingBtn.classList.remove("active");
        questsBtn.classList.remove("active");
    }

    async function showBadging() {
        content.innerHTML = "";
        await loadBadgingComponent("dashboard-content", user);
        homeBtn.classList.remove("active");
        teamBtn.classList.remove("active");
        planningBtn.classList.remove("active");
        badgingBtn.classList.add("active");
        questsBtn.classList.remove("active");
    }

    async function showQuests() {
        content.innerHTML = "";
        await loadQuestsComponent("dashboard-content");
        homeBtn.classList.remove("active");
        teamBtn.classList.remove("active");
        planningBtn.classList.remove("active");
        badgingBtn.classList.remove("active");
        questsBtn.classList.add("active");
    }

    // Assignation des événements du menu
    homeBtn.onclick = showHome;
    teamBtn.onclick = showTeam;
    planningBtn.onclick = showPlanning;
    badgingBtn.onclick = showBadging;
    questsBtn.onclick = showQuests;

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
