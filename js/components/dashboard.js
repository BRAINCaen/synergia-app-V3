import { AuthManager } from "../managers/auth-manager.js";
import { auth } from "../core/firebase-manager.js";
import { loadTeamComponent } from "./team.js";
import { loadPlanningComponent } from "./planning.js";
import { loadBadgingComponent } from "./badging.js";
import { loadQuestsComponent } from "./quests.js";
import { loadChatComponent } from "./chat.js";
import { loadStoreComponent } from "./store.js";
import { loadAnalyticsComponent } from "./analytics.js";
import { loadWalletComponent } from "./wallet.js";
import { loadRolesComponent } from "./roles.js";
import { loadProfileComponent } from "./profile.js";
import { loadSettingsComponent } from "./settings.js";
import { loadLeaderboardComponent } from "./leaderboard.js";

export async function loadDashboard(containerId, user) {
    // Protection : utilisateur requis
    if (!user || !user.email) {
        document.getElementById(containerId).innerHTML = `<div style="padding:2em;text-align:center;font-size:1.4em;color:#e53e3e;">Erreur : utilisateur non connecté. Veuillez vous reconnecter.</div>`;
        return;
    }

    // Charge le HTML du dashboard
    const res = await fetch("js/components/dashboard.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    // Affiche le mail de l'utilisateur
    const welcome = document.getElementById("dashboard-welcome");
    if (welcome) {
        welcome.innerHTML = `Bienvenue <b>${user.email}</b> 👋`;
    }

    // Navigation entre sections
    const homeBtn = document.getElementById("nav-home");
    const teamBtn = document.getElementById("nav-team");
    const planningBtn = document.getElementById("nav-planning");
    const badgingBtn = document.getElementById("nav-badging");
    const questsBtn = document.getElementById("nav-quests");
    const chatBtn = document.getElementById("nav-chat");
    const storeBtn = document.getElementById("nav-store");
    const analyticsBtn = document.getElementById("nav-analytics");
    const walletBtn = document.getElementById("nav-wallet");
    const rolesBtn = document.getElementById("nav-roles");
    const profileBtn = document.getElementById("nav-profile");
    const settingsBtn = document.getElementById("nav-settings");
    const leaderboardBtn = document.getElementById("nav-leaderboard");
    const content = document.getElementById("dashboard-content");

    // Par défaut : accueil widgets
    function showHome() {
        content.innerHTML = `<div id="dashboard-widgets">
            <div class="widget-card">Statistiques et widgets à venir…</div>
        </div>`;
        setActive(homeBtn);
    }

    async function showTeam() {
        content.innerHTML = "";
        await loadTeamComponent("dashboard-content", user);
        setActive(teamBtn);
    }

    async function showPlanning() {
        content.innerHTML = "";
        await loadPlanningComponent("dashboard-content", user);
        setActive(planningBtn);
    }

    async function showBadging() {
        content.innerHTML = "";
        await loadBadgingComponent("dashboard-content", user);
        setActive(badgingBtn);
    }

    async function showQuests() {
        content.innerHTML = "";
        await loadQuestsComponent("dashboard-content", user);
        setActive(questsBtn);
    }

    async function showChat() {
        content.innerHTML = "";
        await loadChatComponent("dashboard-content", user);
        setActive(chatBtn);
    }

    async function showStore() {
        content.innerHTML = "";
        await loadStoreComponent("dashboard-content", user);
        setActive(storeBtn);
    }

    async function showAnalytics() {
        content.innerHTML = "";
        await loadAnalyticsComponent("dashboard-content", user);
        setActive(analyticsBtn);
    }

    async function showWallet() {
        content.innerHTML = "";
        await loadWalletComponent("dashboard-content", user);
        setActive(walletBtn);
    }

    async function showRoles() {
        content.innerHTML = "";
        await loadRolesComponent("dashboard-content", user);
        setActive(rolesBtn);
    }

    async function showProfile() {
        content.innerHTML = "";
        await loadProfileComponent("dashboard-content", user);
        setActive(profileBtn);
    }

    async function showSettings() {
        content.innerHTML = "";
        await loadSettingsComponent("dashboard-content", user);
        setActive(settingsBtn);
    }

    async function showLeaderboard() {
        content.innerHTML = "";
        await loadLeaderboardComponent("dashboard-content", user);
        setActive(leaderboardBtn);
    }

    // Active le bouton courant dans le menu
    function setActive(activeBtn) {
        [
            homeBtn, teamBtn, planningBtn, badgingBtn, questsBtn,
            chatBtn, storeBtn, analyticsBtn, walletBtn, rolesBtn,
            profileBtn, settingsBtn, leaderboardBtn
        ].forEach(btn => { if (btn) btn.classList.remove("active"); });
        if (activeBtn) activeBtn.classList.add("active");
    }

    // Assigne tous les handlers du menu
    if (homeBtn) homeBtn.onclick = showHome;
    if (teamBtn) teamBtn.onclick = showTeam;
    if (planningBtn) planningBtn.onclick = showPlanning;
    if (badgingBtn) badgingBtn.onclick = showBadging;
    if (questsBtn) questsBtn.onclick = showQuests;
    if (chatBtn) chatBtn.onclick = showChat;
    if (storeBtn) storeBtn.onclick = showStore;
    if (analyticsBtn) analyticsBtn.onclick = showAnalytics;
    if (walletBtn) walletBtn.onclick = showWallet;
    if (rolesBtn) rolesBtn.onclick = showRoles;
    if (profileBtn) profileBtn.onclick = showProfile;
    if (settingsBtn) settingsBtn.onclick = showSettings;
    if (leaderboardBtn) leaderboardBtn.onclick = showLeaderboard;

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
