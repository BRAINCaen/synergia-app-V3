// Utilisation localStorage pour la démo, branchement Firebase possible plus tard
function getBadges() {
    return JSON.parse(localStorage.getItem("synergia-badging") || "[]");
}
function saveBadges(badges) {
    localStorage.setItem("synergia-badging", JSON.stringify(badges));
}

export async function loadBadgingComponent(containerId, user) {
    // Charge le HTML
    const res = await fetch("js/components/badging.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    let badges = getBadges();

    function renderTable() {
        const tbody = document.getElementById("badging-table-body");
        tbody.innerHTML = "";
        badges.forEach((badge, idx) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${badge.date}</td>
                <td>${badge.name}</td>
                <td>${badge.type === "in" ? "Entrée" : "Sortie"}</td>
                <td>${badge.time}</td>
                <td>
                    <button class="delete-btn" data-idx="${idx}" style="color:#e53e3e;">Supprimer</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        // Boutons supprimer
        Array.from(document.getElementsByClassName("delete-btn")).forEach(btn => {
            btn.onclick = () => {
                const idx = +btn.dataset.idx;
                badges.splice(idx, 1);
                saveBadges(badges);
                renderTable();
            };
        });
    }

    renderTable();

    // Gestion badge in/out
    const badgeInBtn = document.getElementById("badge-in-btn");
    const badgeOutBtn = document.getElementById("badge-out-btn");

    badgeInBtn.onclick = () => {
        const now = new Date();
        badges.push({
            date: now.toLocaleDateString(),
            name: user?.email || "Moi",
            type: "in",
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        saveBadges(badges);
        renderTable();
    };

    badgeOutBtn.onclick = () => {
        const now = new Date();
        badges.push({
            date: now.toLocaleDateString(),
            name: user?.email || "Moi",
            type: "out",
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        saveBadges(badges);
        renderTable();
    };
}
