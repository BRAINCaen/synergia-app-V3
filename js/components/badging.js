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
badgeBtn.onclick = async () => {
    const type = typeSelect.value;
    const comment = commentInput.value.trim();
    // Charge les types pour récupérer la règle
    badgingManager.subscribeToTypes(types => {
        const t = types.find(tt => tt.name === type);
        if (t && t.rules) {
            // Récupère la journée courante
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(startOfDay);
            endOfDay.setHours(23, 59, 59, 999);

            badgingManager.getPresencesByUserAndDate(user.email, startOfDay.getTime(), endOfDay.getTime())
                .then(jourPresences => {
                    // Calcule la durée totale, pauses, etc.
                    // Exemple simplifié :
                    const nbPres = jourPresences.length + 1;
                    if (t.rules.maxPointagesPerDay && nbPres > t.rules.maxPointagesPerDay) {
                        alert("⚠️ Tu as dépassé le nombre de pointages max pour ce type aujourd’hui !");
                        return;
                    }
                    // Ajoute la présence
                    badgingManager.addPresence({
                        user: user.email,
                        type,
                        timestamp: Date.now(),
                        comment,
                        validated: false
                    });
                    commentInput.value = "";
                });
        } else {
            // Pas de règles : badge normalement
            badgingManager.addPresence({
                user: user.email,
                type,
                timestamp: Date.now(),
                comment,
                validated: false
            });
            commentInput.value = "";
        }
    });
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
