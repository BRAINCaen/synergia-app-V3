import { BadgingManager } from "../managers/badging-manager.js";
const manager = new BadgingManager();

export async function loadBadgingComponent(containerId, user) {
    const res = await fetch("js/components/badging.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    function renderTable(badges) {
        const tbody = document.getElementById("badging-table-body");
        tbody.innerHTML = "";
        badges.forEach(badge => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${badge.date}</td>
                <td>${badge.name}</td>
                <td>${badge.type === "in" ? "Entrée" : "Sortie"}</td>
                <td>${badge.time}</td>
                <td>
                    <button class="delete-btn" data-id="${badge.id}" style="color:#e53e3e;">Supprimer</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        Array.from(document.getElementsByClassName("delete-btn")).forEach(btn => {
            btn.onclick = async () => {
                await manager.deleteBadge(btn.dataset.id);
            };
        });
    }

    manager.subscribeToBadges(renderTable);

    // Gestion badge in/out
    const badgeInBtn = document.getElementById("badge-in-btn");
    const badgeOutBtn = document.getElementById("badge-out-btn");

    badgeInBtn.onclick = async () => {
        const now = new Date();
        await manager.addBadge({
            date: now.toLocaleDateString(),
            name: user?.email || "Moi",
            type: "in",
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    };

    badgeOutBtn.onclick = async () => {
        const now = new Date();
        await manager.addBadge({
            date: now.toLocaleDateString(),
            name: user?.email || "Moi",
            type: "out",
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    };
}
