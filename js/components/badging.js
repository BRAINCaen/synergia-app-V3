import { BadgingManager } from "../managers/badging-manager.js";
const badgingManager = new BadgingManager();

export async function loadBadgingComponent(containerId, user) {
    const res = await fetch("js/components/badging.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    const typeSelect = document.getElementById("badge-type-select");
    const commentInput = document.getElementById("badge-comment");
    const badgeBtn = document.getElementById("badge-btn");
    const historyDiv = document.getElementById("badge-history");

    // Charge les types de pointage
    badgingManager.subscribeToTypes(types => {
        typeSelect.innerHTML = "";
        types.forEach(t => {
            typeSelect.innerHTML += `<option value="${t.name}">${t.label || t.name}</option>`;
        });
    });

    // Pointage
    badgeBtn.onclick = async () => {
        const type = typeSelect.value;
        const comment = commentInput.value.trim();
        await badgingManager.addPresence({
            user: user.email,
            type,
            timestamp: Date.now(),
            comment,
            validated: false
        });
        commentInput.value = "";
    };

    // Historique de pointage de l'utilisateur
    badgingManager.subscribeToUserPresences(user.email, presences => {
        historyDiv.innerHTML = presences.length ? `
            <table>
                <thead><tr>
                    <th>Date</th><th>Type</th><th>Commentaire</th><th>Statut</th>
                </tr></thead>
                <tbody>
                    ${presences.map(p => `
                        <tr>
                          <td>${new Date(p.timestamp).toLocaleString()}</td>
                          <td>${p.type}</td>
                          <td>${p.comment || ""}</td>
                          <td>${p.validated ? "✅" : "⏳"}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : "<em>Aucun pointage enregistré.</em>";
    });
}
