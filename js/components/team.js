import { TeamManager } from "../managers/team-manager.js";
import { BadgingManager } from "../managers/badging-manager.js";
import { isAdmin } from "../managers/user-manager.js";
import { openPrivateChat } from "./private-chat.js";

const teamManager = new TeamManager();
const badgingManager = new BadgingManager();

export async function loadTeamComponent(containerId, user) {
    const res = await fetch("js/components/team.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    const teamTableDiv = document.getElementById("team-table-div");
    const modal = document.getElementById("member-modal");
    const modalContent = document.getElementById("member-modal-content");

    // Affichage principal
    function renderTable(team) {
        teamTableDiv.innerHTML = `
          <h2 style="margin-bottom: 1rem;">Équipe Synergia</h2>
          <table class="team-table" style="width:100%;border-collapse:separate;border-spacing:0;">
            <thead>
              <tr>
                <th>Photo</th><th>Nom</th><th>Rôle</th><th>Statut</th><th>Quêtes</th><th>Badges</th><th>Actions</th>
              </tr>
            </thead>
            <tbody id="team-table-body">
            ${team.map(m => `
              <tr>
                <td data-label="Photo"><img src="${m.photoURL || m.avatarURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(m.name || m.email)}" class="avatar" style="width:38px;height:38px;border-radius:50%;"></td>
                <td data-label="Nom">${m.name || m.displayName || ""}</td>
                <td data-label="Rôle">${m.role || ""}</td>
                <td data-label="Statut"><span class="status-dot ${m.status || 'inconnu'}"></span> ${m.status || "?"}</td>
                <td data-label="Quêtes">${(m.currentQuests || []).length || 0}</td>
                <td data-label="Badges">${(m.badges || []).map(b => `<img src="${b.img}" alt="${b.name}" title="${b.name}" style="width:20px;">`).join("")}</td>
                <td data-label="Actions">
                  <button class="view-member premium-btn" data-id="${m.id}" style="background: linear-gradient(90deg,#7f74ff 25%,#63e7ff 95%); color:#fff; font-weight:600; border:none; border-radius:1.4em; padding:0.68em 1.5em; font-size:1.12em; box-shadow:0 2px 10px #bbb5;">
                    Voir fiche
                  </button>
                </td>
              </tr>
            `).join("")}
            </tbody>
          </table>
        `;

        Array.from(document.getElementsByClassName("view-member")).forEach(btn => {
            btn.onclick = () => {
                const member = team.find(m => m.id === btn.dataset.id);
                if (!member) {
                    alert("Erreur : membre non trouvé.");
                    return;
                }
                if (!member.email) {
                    alert("Ce membre n’a pas d’email associé (profil incomplet).");
                    return;
                }
                openMemberModal(member);
            };
        });
    }

    // Statut live (dernier pointage du jour)
    async function syncTeamStatus(team) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const minTs = today.getTime();
        const updated = await Promise.all(team.map(async m => {
            let status = "absent";
            try {
                const pres = await badgingManager.getLastPresenceOfUser(m.email, minTs);
                if (pres) {
                    if (pres.type === "Formation") status = "formation";
                    else if (pres.type === "Télétravail" || pres.type === "Teletravail") status = "teletravail";
                    else status = "présent";
                }
            } catch (e) {
                // ignore erreurs
            }
            return { ...m, status };
        }));
        return updated;
    }

    // Modale fiche membre (inchangée, premium, déjà sécurisée)
    async function openMemberModal(member) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastPresence = await badgingManager.getLastPresenceOfUser(member.email, today.getTime());
        const currentQuests = member.currentQuests || [];
        const badges = (member.badges || []);
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
        // Admin actions (optionnel) : à compléter selon ton système
        document.querySelector(".close-modal-btn").onclick = () => { modal.style.display = "none"; };
        document.querySelector(".send-msg-btn").onclick = () => {
            if (!document.getElementById("private-chat-popup")) {
                const chatPopup = document.createElement("div");
                chatPopup.id = "private-chat-popup";
                chatPopup.style.position = "fixed";
                chatPopup.style.bottom = "10px";
                chatPopup.style.right = "10px";
                chatPopup.style.width = "350px";
                chatPopup.style.zIndex = "5000";
                chatPopup.style.background = "#fff";
                chatPopup.style.boxShadow = "0 4px 20px #4442";
                chatPopup.style.borderRadius = "1.2em";
                document.body.appendChild(chatPopup);
            }
            openPrivateChat("private-chat-popup", user, member);
        };
        modal.style.display = "block";
    }

    // Live sync équipe
    teamManager.subscribeToTeam(async team => {
        const teamWithStatus = await syncTeamStatus(team);
        renderTable(teamWithStatus);
    });

    // Fermer modale si clic en dehors
    window.onclick = (e) => {
        if (e.target === modal) modal.style.display = "none";
    };
}
