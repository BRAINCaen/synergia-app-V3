import { AuthManager } from "../managers/auth-manager.js";
import { auth } from "../core/firebase-manager.js";
import { isAdmin } from "../managers/user-manager.js";
import { loadTeamComponent } from "./team.js";
import { loadPlanningComponent } from "./planning.js";
import { loadBadgingAllComponent } from "./badging-all.js"; // unique page pointage !
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
    const container = document.getElementById(containerId);
    if (!container) {
        alert("Erreur : container principal non trouvé.");
        return;
    }
    const res = await fetch("js/components/dashboard.html");
    const html = await res.text();
    container.innerHTML = html;

    // Boutons du menu
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
    async function showBadging() { content.innerHTML = ""; await loadBadgingAllComponent("dashboard-content", user); clearActive(); badgingBtn?.classList.add("active"); }
    async function showQuests() { content.innerHTML = ""; await loadQuestsComponent("dashboard-content"); clearActive(); questsBtn?.classList.add("active"); }
    async function showChat() { content.innerHTML = ""; await loadChatComponent("dashboard-content", user); clearActive(); chatBtn?.classList.add("active"); }
    async function showStore() { content.innerHTML = ""; await loadStoreComponent("dashboard-content", user); clearActive(); storeBtn?.classList.add("active"); }
    async function showAnalytics() { content.innerHTML = ""; await loadAnalyticsComponent("dashboard-content"); clearActive(); analyticsBtn?.classList.add("active"); }
    async function showWallet() { content.innerHTML = ""; await loadWalletComponent("dashboard-content", user); clearActive(); walletBtn?.classList.add("active"); }
    async function showRoles() { content.innerHTML = ""; await loadRolesComponent("dashboard-content"); clearActive(); rolesBtn?.classList.add("active"); }
    async function showProfile() { content.innerHTML = ""; await loadProfileComponent("dashboard-content", user); clearActive(); profileBtn?.classList.add("active"); }
    async function showSettings() { content.innerHTML = ""; await loadSettingsComponent("dashboard-content", user); clearActive(); settingsBtn?.classList.add("active"); }
    async function showLeaderboard() { content.innerHTML = ""; await loadLeaderboardComponent("dashboard-content"); clearActive(); leaderboardBtn?.classList.add("active"); }

    // Affecte chaque bouton à la bonne fonction
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

    // BURGER & ICÔNES (premium) — code identique à plus haut
    if (window.lucide) lucide.createIcons();
    const burgerBtn = document.getElementById('dashboard-burger');
    const dashboardMenu = document.getElementById('dashboard-menu');
    if (burgerBtn && dashboardMenu) {
        burgerBtn.innerHTML = `
          <svg width="32" height="32" viewBox="0 0 24 24" style="display:block;"><g>
          <rect y="4" width="24" height="3" rx="1.5" fill="#7e8fff"></rect>
          <rect y="10.5" width="24" height="3" rx="1.5" fill="#7e8fff"></rect>
          <rect y="17" width="24" height="3" rx="1.5" fill="#7e8fff"></rect>
          </g></svg>
        `;
        burgerBtn.onclick = function() {
            dashboardMenu.classList.toggle('open');
            document.body.classList.toggle('menu-open');
            burgerBtn.classList.toggle('open');
        };
        Array.from(dashboardMenu.querySelectorAll('button')).forEach(btn => {
            btn.addEventListener('click', function() {
                setTimeout(() => {
                    if (window.innerWidth < 900) {
                      dashboardMenu.classList.remove('open');
                      document.body.classList.remove('menu-open');
                      burgerBtn.classList.remove('open');
                    }
                }, 130);
            });
        });
        window.addEventListener('resize', () => {
            dashboardMenu.classList.remove('open');
            burgerBtn.classList.remove('open');
            document.body.classList.remove('menu-open');
        });
        window.addEventListener('scroll', () => {
            dashboardMenu.classList.remove('open');
            burgerBtn.classList.remove('open');
            document.body.classList.remove('menu-open');
        });
    }

    // Accueil par défaut
    showHome();

    // Déconnexion
    const manager = new AuthManager(auth);
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await manager.signOut();
        });
    }
}
