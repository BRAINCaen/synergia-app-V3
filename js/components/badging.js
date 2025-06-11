import { BadgingManager } from "../managers/badging-manager.js";
const badgingManager = new BadgingManager();

export async function loadBadgingComponent(containerId, user) {
    const res = await fetch("js/components/badging.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    // Sélection des types
    const typeSelect = document.getElementById("badging-type-select");
    const commentInput = document.getElementById("badging-comment");
    const badgeBtn = document.getElementById("badging-btn");
    const historyDiv = document.getElementById("badging-history");

    // Charge les types dynamiquement
    function populateTypes(types) {
        typeSelect.innerHTML = "";
        types.forEach(type => {
            const opt = document.createElement("option");
            opt.value = type.name;
            opt.textContent = type.label || type.name;
            typeSelect.appendChild(opt);
        });
    }
    badgingManager.subscribeToTypes(populateTypes);

    // Historique utilisateur
    function renderHistory(presences) {
        historyDiv.innerHTML = presences.length ? `
            <table>
                <thead>
                    <tr><th>Date</th><th>Type</th><th>Commentaire</th><th>Statut</th></tr>
                </thead>
                <tbody>
                    ${presences.map(p => `
                        <tr>
                            <td>${new Date(p.timestamp).toLocaleString()}</td>
                            <td>${p.type}</td>
                            <td>${p.comment || ""}</td>
                            <td>${p.validated ? "✅" : "⏳"}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        ` : "<em>Aucun pointage.</em>";
    }
    badgingManager.subscribeToUserPresences(user.email, renderHistory);

    // Pointage au clic
    badgeBtn.onclick = async () => {
        const type = typeSelect.value;
        const comment = commentInput.value.trim();

        // Charge les types pour trouver le type sélectionné
        badgingManager.subscribeToTypes(types => {
            const t = types.find(tt => tt.name === type);
            if (t && t.rules && t.rules.autoDurationHours) {
                // --- CAS FORMATION : Pointage automatique sur 7h ---
                const now = Date.now();
                const durationMs = t.rules.autoDurationHours * 60 * 60 * 1000;
                const end = now + durationMs;

                // 1. Pointage début
                badgingManager.addPresence({
                    user: user.email,
                    type: t.name,
                    timestamp: now,
                    comment: comment,
                    validated: false,
                    autoEnd: end // Pour traçabilité
                });

                // 2. Pointage fin (optionnel)
                badgingManager.addPresence({
                    user: user.email,
                    type: t.name + "_fin",
                    timestamp: end,
                    comment: "Fin automatique après " + t.rules.autoDurationHours + "h",
                    validated: false,
                    autoStart: now
                });

                alert("Formation enregistrée : " + t.rules.autoDurationHours + "h pointées automatiquement.");
                commentInput.value = "";
            } else {
                // --- CAS CLASSIQUE : pointage standard ---
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
}
