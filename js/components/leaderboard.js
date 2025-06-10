import { TeamManager } from "../managers/team-manager.js";
import { QuestsManager } from "../managers/quests-manager.js";

const RANKS = [
    { xp: 0, label: "Débutant", color: "#a3bffa" },
    { xp: 50, label: "Explorateur", color: "#63b3ed" },
    { xp: 120, label: "Ambassadeur", color: "#48bb78" },
    { xp: 250, label: "Légende", color: "#f6ad55" }
];

export async function loadLeaderboardComponent(containerId) {
    const res = await fetch("js/components/leaderboard.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    // Managers déjà existants (en Firebase)
    const teamManager = new TeamManager();
    const questsManager = new QuestsManager();

    let team = [];
    let progress = [];

    function getRank(xp) {
        let current = RANKS[0];
        for (const r of RANKS) if (xp >= r.xp) current = r;
        return current;
    }

    function getXP(member) {
        // Calcule le XP total d’un membre en croisant team/email et progress Firebase
        return progress.filter(p => p.user === member.email).reduce((acc, q) => {
            if (q.questId == 1) acc += 10;
            if (q.questId == 2) acc += 20;
            if (q.questId == 3) acc += 15;
            if (q.questId == 4) acc += 5;
            // Ajoute ici les XP si missions saisonnières, etc.
            return acc;
        }, 0);
    }

    function renderLeaderboard() {
        // Trie les membres par XP décroissant
        const users = team.map(m => {
            const xp = getXP(m);
            const rank = getRank(xp);
            return { ...m, xp, rank };
        }).sort((a, b) => b.xp - a.xp);

        const table = document.getElementById("leaderboard-table-body");
        table.innerHTML = "";
        users.forEach((user, idx) => {
            table.innerHTML += `
                <tr>
                  <td><span style="font-weight:600;">#${idx+1}</span></td>
                  <td>
                    <span class="leaderboard-avatar">${user.name?.[0] || "?"}</span>
                  </td>
                  <td>${user.name || user.email}</td>
                  <td><span class="leaderboard-rank" style="background:${user.rank.color};">${user.rank.label}</span></td>
                  <td><b>${user.xp}</b> XP</td>
                </tr>
            `;
        });
    }

    teamManager.subscribeToTeam(users => { team = users; renderLeaderboard(); });
    questsManager.subscribeToProgress(list => { progress = list; renderLeaderboard(); });
}
