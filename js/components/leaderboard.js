import { TeamManager } from "../managers/team-manager.js";
import { QuestsManager } from "../managers/quests-manager.js";
import { BadgesManager } from "../managers/badges-manager.js";

const RANKS = [
    { xp: 0, label: "Débutant", color: "#a3bffa" },
    { xp: 50, label: "Explorateur", color: "#63b3ed" },
    { xp: 120, label: "Ambassadeur", color: "#48bb78" },
    { xp: 250, label: "Légende", color: "#f6ad55" }
];

const teamManager = new TeamManager();
const questsManager = new QuestsManager();
const badgesManager = new BadgesManager();

export async function loadLeaderboardComponent(containerId) {
    const res = await fetch("js/components/leaderboard.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    let team = [];
    let progress = [];
    let allBadges = [];

    // Récupère tous les badges (pour tous les users) à jour
    badgesManager.subscribeToUserBadges({ email: null }, badges => {
        allBadges = badges;
        renderLeaderboard();
    });

    teamManager.subscribeToTeam(users => {
        team = users;
        renderLeaderboard();
    });

    questsManager.subscribeToProgress(list => {
        progress = list;
        renderLeaderboard();
    });

    function getXP(member) {
        return progress.filter(p => p.user === member.email).reduce((acc, q) => {
            if (q.questId == 1) acc += 10;
            if (q.questId == 2) acc += 20;
            if (q.questId == 3) acc += 15;
            if (q.questId == 4) acc += 5;
            return acc;
        }, 0);
    }
    function getRank(xp) {
        let current = RANKS[0];
        for (const r of RANKS) if (xp >= r.xp) current = r;
        return current;
    }
    function getRareBadge(email) {
        // Renvoie l’icône du premier badge “rare” trouvé pour ce user (ou "")
        const badge = allBadges.find(b => b.user === email && b.type === "rare");
        return badge ? badge.icon : "";
    }

    function renderLeaderboard() {
        const users = team.map(m => {
            const xp = getXP(m);
            const rank = getRank(xp);
            return { ...m, xp, rank };
        }).sort((a, b) => b.xp - a.xp);

        const table = document.getElementById("leaderboard-table-body");
        table.innerHTML = "";
        users.forEach((user, idx) => {
            const rareBadgeIcon = getRareBadge(user.email);
            table.innerHTML += `
                <tr>
                  <td><span style="font-weight:600;">#${idx+1}</span></td>
                  <td>
                    <span class="leaderboard-avatar">${user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"}</span>
                    ${rareBadgeIcon ? `<span class="rare-badge-icon" title="Badge rare">${rareBadgeIcon}</span>` : ""}
                  </td>
                  <td>${user.name || user.email}</td>
                  <td><span class="leaderboard-rank" style="background:${user.rank.color};">${user.rank.label}</span></td>
                  <td><b>${user.xp}</b> XP</td>
                </tr>
            `;
        });
    }
}
