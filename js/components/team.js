import { TeamManager } from "../managers/team-manager.js";
const manager = new TeamManager();

export async function loadTeamComponent(containerId) {
    const res = await fetch("js/components/team.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    let currentTeam = [];

    function renderTable(team) {
        const tbody = document.getElementById("team-table-body");
        tbody.innerHTML = "";
        team.forEach((member, idx) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${member.name}</td>
                <td>${member.email}</td>
                <td>${member.role}</td>
                <td>
                    <button class="delete-btn" data-id="${member.id}" style="color:#e53e3e;">Supprimer</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        Array.from(document.getElementsByClassName("delete-btn")).forEach(btn => {
            btn.onclick = async () => {
                await manager.deleteMember(btn.dataset.id);
            };
        });
    }

    // Live sync avec Firebase
    manager.subscribeToTeam(team => {
        currentTeam = team;
        renderTable(team);
    });

    // Ajout membre (modal)
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

    form.onsubmit = async (e) => {
        e.preventDefault();
        const member = {
            name: document.getElementById("member-name").value,
            email: document.getElementById("member-email").value,
            role: document.getElementById("member-role").value
        };
        await manager.addMember(member);
        modal.style.display = "none";
    };
}
