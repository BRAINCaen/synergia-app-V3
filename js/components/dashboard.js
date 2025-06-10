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
import { AuthManager } from "../managers/auth-manager.js";
import { auth } from "../core/firebase-manager.js";
import { isAdmin } from "../managers/user-manager.js";
import { loadBadgingAdminComponent } from "./badging-admin.js";
// ...autres imports...

// ...autres fonctions...

export async function loadDashboard(containerId, user) {
    // ...chargement du dashboard HTML...
    const badgingAdminBtn = document.getElementById("nav-badging-admin");
    const content = document.getElementById("dashboard-content");

    // (Affichage conditionnel du menu admin)
    if (badgingAdminBtn) {
        badgingAdminBtn.style.display = "none"; // caché par défaut
        isAdmin(user.email).then(admin => {
            if (admin) {
                badgingAdminBtn.style.display = "";
                badgingAdminBtn.onclick = () => {
                    content.innerHTML = "";
                    loadBadgingAdminComponent("dashboard-content");
                    clearActive();
                    badgingAdminBtn.classList.add("active");
                };
            }
        });
    }

    // ...reste du code dashboard.js...
}

export async function loadDashboard(containerId, user) {
    const container = document.getElementById(containerId);
    if (!container) {
        alert("Erreur : container principal non trouvé.");
        return;
    }
    const res = await fetch("js/components/dashboard.html");
    const html = await res.text();
    container.innerHTML = html;

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
    const logoutBtn = document.getElementById("nav-logout");
    const content = document.getElementById("dashboard-content");
    const welcome = document.getElementById("dashboard-welcome");

    if (user && welcome) {
        welcome.innerHTML = `Bienvenue <b>${user.email}</b> 👋`;
    }

    function clearActive() {
        [homeBtn, teamBtn, planningBtn, badgingBtn, questsBtn, chatBtn, storeBtn,
        analyticsBtn, walletBtn, rolesBtn, profileBtn, settingsBtn, leaderboardBtn]
        .forEach(btn => btn?.classList.remove("active"));
    }

    function showHome() {
        content.innerHTML = `<div id="dashboard-widgets">
            <div class="widget-card">Statistiques et widgets à venir…</div>
        </div>`;
        clearActive();
        homeBtn?.classList.add("active");
    }
    async function showTeam() { content.innerHTML = ""; await loadTeamComponent("dashboard-content"); clearActive(); teamBtn?.classList.add("active"); }
    async function showPlanning() { content.innerHTML = ""; await loadPlanningComponent("dashboard-content"); clearActive(); planningBtn?.classList.add("active"); }
    async function showBadging() { content.innerHTML = ""; await loadBadgingComponent("dashboard-content", user); clearActive(); badgingBtn?.classList.add("active"); }
    async function showQuests() { content.innerHTML = ""; await loadQuestsComponent("dashboard-content"); clearActive(); questsBtn?.classList.add("active"); }
    async function showChat() { content.innerHTML = ""; await loadChatComponent("dashboard-content", user); clearActive(); chatBtn?.classList.add("active"); }
    async function showStore() { content.innerHTML = ""; await loadStoreComponent("dashboard-content", user); clearActive(); storeBtn?.classList.add("active"); }
    async function showAnalytics() { content.innerHTML = ""; await loadAnalyticsComponent("dashboard-content"); clearActive(); analyticsBtn?.classList.add("active"); }
    async function showWallet() { content.innerHTML = ""; await loadWalletComponent("dashboard-content", user); clearActive(); walletBtn?.classList.add("active"); }
    async function showRoles() { content.innerHTML = ""; await loadRolesComponent("dashboard-content"); clearActive(); rolesBtn?.classList.add("active"); }
    async function showProfile() { content.innerHTML = ""; await loadProfileComponent("dashboard-content", user); clearActive(); profileBtn?.classList.add("active"); }
    async function showSettings() { content.innerHTML = ""; await loadSettingsComponent("dashboard-content", user); clearActive(); settingsBtn?.classList.add("active"); }
    async function showLeaderboard() { content.innerHTML = ""; await loadLeaderboardComponent("dashboard-content"); clearActive(); leaderboardBtn?.classList.add("active"); }

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

    const manager = new AuthManager(auth);
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await manager.signOut();
        });
    }

    // --- MENU BURGER ---
    const burgerBtn = document.getElementById('dashboard-burger');
    const dashboardMenu = document.getElementById('dashboard-menu');
    function closeMenu() {
        dashboardMenu.classList.remove('open');
        document.body.classList.remove('menu-open');
    }
    if (burgerBtn && dashboardMenu) {
        burgerBtn.onclick = function() {
            dashboardMenu.classList.toggle('open');
            document.body.classList.toggle('menu-open');
        };
        // Ajoute seulement la fermeture, SANS écraser le handler existant
        Array.from(dashboardMenu.querySelectorAll('button')).forEach(btn => {
            btn.addEventListener('click', function() {
                setTimeout(() => {
                    if (window.innerWidth < 900) closeMenu();
                }, 150);
            });
        });
        window.addEventListener('resize', closeMenu);
        window.addEventListener('scroll', closeMenu);
    }

    showHome();
}
