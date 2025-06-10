import { AuthManager } from "../managers/auth-manager.js";
import { auth } from "../core/firebase-manager.js";
import { loadTeamComponent } from "./team.js";
import { loadPlanningComponent } from "./planning.js";
import { loadBadgingComponent } from "./badging.js";
import { loadQuestsComponent } from "./quests.js";
import { loadChatComponent } from "./chat.js";
import { loadStoreComponent } from "./store.js";
import { loadAnalyticsComponent } from "./analytics.js";

export async function loadDashboard(containerId, user) {
    const res = await fetch("js/components/dashboard.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    const welcome = document.getElementById("dashboard-welcome");
    if (user && welcome) {
        welcome.innerHTML = `Bienvenue <b>${user.email}</b> 👋`;
    }

    const homeBtn = document.getElementById("nav-home");
    const teamBtn = document.getElementById("nav-team");
    const planningBtn = document.getElementById("nav-planning");
    const badgingBtn = document.getElementById("nav-badging");
    const questsBtn = document.getElementById("nav-quests");
    const chatBtn = document.getElementById("nav-chat");
    const storeBtn = document.getElementById("nav-store");
    const analyticsBtn = document.getElementById("nav-analytics");
    const content = document.getElementById("dashboard-content");

    function clearActive() {
        [homeBtn, teamBtn, planningBtn, badgingBtn, questsBtn, chatBtn, storeBtn, analyticsBtn].forEach(btn => btn?.classList.remove("active"));
    }

    function showHome() {
        content.innerHTML = `<div id="dashboard-widgets">
            <div class="widget-card">Statistiques et widgets à venir…</div>
        </div>`;
        clearActive();
        homeBtn.classList.add("active");
    }

    async function showTeam() {
        content.innerHTML = "";
        await loadTeamComponent("dashboard-content");
        clearActive();
        teamBtn.classList.add("active");
    }

    async function showPlanning() {
        content.innerHTML = "";
        await loadPlanningComponent("dashboard-content");
        clearActive();
        planningBtn.classList.add("active");
    }

    async function showBadging() {
        content.innerHTML = "";
        await loadBadgingComponent("dashboard-content", user);
        clearActive();
        badgingBtn.classList.add("active");
    }

    async function showQuests() {
        content.innerHTML = "";
        await loadQuestsComponent("dashboard-content");
        clearActive();
        questsBtn.classList.add("active");
    }

    async function showChat() {
        content.innerHTML = "";
        await loadChatComponent("dashboard-content", user);
        clearActive();
        chatBtn.classList.add("active");
    }

    async function showStore() {
        content.innerHTML = "";
        await loadStoreComponent("dashboard-content");
        clearActive();
        storeBtn.classList.add("active");
    }

    async function showAnalytics() {
        content.innerHTML = "";
        await loadAnalyticsComponent("dashboard-content");
        clearActive();
        analyticsBtn.classList.add("active");
    }

    homeBtn.onclick = showHome;
    teamBtn.onclick = showTeam;
    planningBtn.onclick = showPlanning;
    badgingBtn.onclick = showBadging;
    questsBtn.onclick = showQuests;
    chatBtn.onclick = showChat;
    storeBtn.onclick = showStore;
    analyticsBtn.onclick = showAnalytics;

    const logoutBtn = document.getElementById("nav-logout");
    const manager = new AuthManager(auth);
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await manager.signOut();
        });
    }

    showHome();
}
