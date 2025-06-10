import { TeamManager } from "../managers/team-manager.js";

// Utilisation de localStorage pour la démo (remplace par Firebase après si tu veux)
function getTeam() {
    return JSON.parse(localStorage.getItem("synergia-team") || "[]");
}
function saveTeam(team) {
    localStorage.setItem("synergia-team", JSON.stringify(team));
}

export async function loadTeamComponent(containerId) {
    // Charge le HTML
    const res = await fetch("js/components/team.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    let team = getTeam();

    function renderTable() {
        const tbody = document.getElementById("team-table-body");
        tbody.innerHTML = "";
        team.forEach((member, idx) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${member.name}</td>
                <td>${member.email}</td>
                <td>${member.role}</td>
                <td>
                    <button class="delete-btn" data-idx="${idx}" style="color:#e53e3e;">Supprimer</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        // Boutons supprimer
        Array.from(document.getElementsByClassName("delete-btn")).forEach(btn => {
            btn.onclick = (e) => {
                const idx = +btn.dataset.idx;
                team.splice(idx, 1);
                saveTeam(team);
                renderTable();
            };
        });
    }

    renderTable();

    // Gérer modal d'ajout
    const modal = document.getElementById("team-modal");
    const addBtn = document.getElementById("add-member-btn");
    const cancelBtn = document.getElementById("team-cancel-btn");
    const form = document.getElementById("team-form");
    addBtn.onclick = () => {
        form.reset();
        modal.style.display = "block";
        document.getElementById("team-form-title").textContent = "Ajouter un membre";
    };
    cancelBtn.onclick = () => modal.style.display = "none";

    form.onsubmit = (e) => {
        e.preventDefault();
        team.push({
            name: document.getElementById("member-name").value,
            email: document.getElementById("member-email").value,
            role: document.getElementById("member-role").value
        });
        saveTeam(team);
        modal.style.display = "none";
        renderTable();
    };
}
