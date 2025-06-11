import { TeamManager } from "../managers/team-manager.js";
import { BadgingManager } from "../managers/badging-manager.js";
import { isAdmin } from "../managers/user-manager.js";
const teamManager = new TeamManager();
const badgingManager = new BadgingManager();

export async function loadTeamComponent(containerId, user) {
    const res = await fetch("js/components/team.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    const teamTableDiv = document.getElementById("team-table-div");
    const modal = document.getElementById("member-modal");
    const modalContent = document.getElementById("member-modal-content");

    let currentTeam = [];

    // Affichage principal
    function renderTable(team) {
        teamTableDiv.innerHTML = `
          <table class="team-table">
            <thead>
              <tr>
                <th>Photo</th><th>Nom</th><th>Rôle</th><th>Statut</th><th>Quêtes</th><th>Badges</th><th>Actions</th>
              </tr>
            </thead>
            <tbody id="team-table-body">
            ${team.map(m => `
              <tr>
                <td><img src="${m.photoURL || m.avatarURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(m.name || m.email)}" class="avatar" style="width:38px;height:38px;border-radius:50%;"></td>
                <td>${m.name || m.displayName || ""}</td>
                <td>${m.role || ""}</td>
                <td><span class="status-dot ${m.status || 'inconnu'}"></span> ${m.status || "?"}</td>
                <td>${(m.currentQuests || []).length || 0}</td>
                <td>${(m.badges || []).map(b => `<img src="${b.img}" alt="${b.name}" title="${b.name}" style="width:20px;">`).join("")}</td>
                <td>
                  <button class="view-member" data-id="${m.id}">Voir fiche</button>
                </td>
              </tr>
            `).join("")}
            </tbody>
          </table>
        `;
        Array.from(document.getElementsByClassName("view-member")).forEach(btn => {
            btn.onclick = () => {
                const member = team.find(m => m.id === btn.dataset.id);
                openMemberModal(member);
            };
        });
    }

    // Statut live = récupère le dernier pointage du jour
    async function syncTeamStatus(team) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const minTs = today.getTime();
        const updated = await Promise.all(team.map(async m => {
            const pres = await badgingManager.getLastPresenceOfUser(m.email, minTs);
            let status = "absent";
            if (pres) {
                if (pres.type === "Formation") status = "formation";
                else if (pres.type === "Télétravail" || pres.type === "Teletravail") status = "teletravail";
                else status = "présent";
            }
            return { ...m, status };
        }));
        return updated;
    }

    // Vue modale fiche membre
    async function openMemberModal(member) {
        // Dernier pointage
        const today = new Date();
        today.setHours(0,0,0,0);
        const lastPresence = await badgingManager.getLastPresenceOfUser(member.email, today.getTime());
        // Quêtes en cours (exemple)
        // A adapter si tu utilises une autre collection ou une logique différente
        const currentQuests = member.currentQuests || [];
        // Badges
        const badges = (member.badges || []);
        // Statut live
        let status = "Absent";
        if (lastPresence) {
            if (lastPresence.type === "Formation") status = "En formation";
            else if (lastPresence.type === "Télétravail" || lastPresence.type === "Teletravail") status = "En télétravail";
            else status = "Présent";
        }

        modalContent.innerHTML = `
          <h3>${member.name || member.displayName || ""}</h3>
          <img src="${member.photoURL || member.avatarURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(member.name || member.email)}" class="avatar" style="width:68px;height:68px;border-radius:50%;">
          <p><b>Email:</b> ${member.email}</p>
          <p><b>Rôle:</b> <span id="role-edit">${member.role || ""}</span></p>
          <p><b>Statut actuel:</b> ${status}</p>
          <p><b>Dernier pointage:</b> ${lastPresence ? (new Date(lastPresence.timestamp).toLocaleString() + " (" + lastPresence.type + ")") : "Aucun"}</p>
          <p><b>Quêtes en cours:</b> ${(currentQuests.length && currentQuests.map(q => `<li>${q.label || q}</li>`).join("")) || "Aucune"}</p>
          <p><b>Badges:</b> ${(badges.length && badges.map(b => `<img src="${b.img}" alt="${b.name}" title="${b.name}" style="width:30px;">`).join("")) || "Aucun"}</p>
          <div style="margin-top:2em;">
            <button class="send-msg-btn" data-email="${member.email}">Message privé</button>
            <button class="close-modal-btn">Fermer</button>
          </div>
          <div id="admin-actions"></div>
        `;
        // Admin : édition directe
        if (await isAdmin(user.email)) {
            document.getElementById("admin-actions").innerHTML = `
              <hr>
              <h4>Actions admin</h4>
              <button id="edit-role-btn">Modifier rôle</button>
              <button id="edit-badges-btn">Gérer badges</button>
              <button id="delete-member-btn" style="color:#e53e3e;">Supprimer</button>
            `;
            document.getElementById("edit-role-btn").onclick = async () => {
                const newRole = prompt("Nouveau rôle ?", member.role || "");
                if (newRole) {
                    await teamManager.updateMember(member.id, { role: newRole });
                    alert("Rôle modifié !");
                    modal.style.display = "none";
                }
            };
            document.getElementById("delete-member-btn").onclick = async () => {
                if (confirm("Supprimer ce membre ?")) {
                    await teamManager.deleteMember(member.id);
                    modal.style.display = "none";
                }
            };
            // Idem pour gestion des badges...
        }

        document.querySelector(".close-modal-btn").onclick = () => { modal.style.display = "none"; };
        document.querySelector(".send-msg-btn").onclick = () => {
            // Ouvre le chat privé avec ce membre (module à implémenter ensuite)
            alert(`Module chat privé à intégrer ici pour ${member.email}`);
        };
        modal.style.display = "block";
    }

    // Live sync équipe
    teamManager.subscribeToTeam(async team => {
        currentTeam = await syncTeamStatus(team);
        renderTable(currentTeam);
    });

    // Fermer modale si clic en dehors
    window.onclick = (e) => {
        if (e.target === modal) modal.style.display = "none";
    };
}
