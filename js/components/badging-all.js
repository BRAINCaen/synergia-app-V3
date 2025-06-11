import { BadgingManager } from "../managers/badging-manager.js";
import { isAdmin } from "../managers/user-manager.js";
const badgingManager = new BadgingManager();

export async function loadBadgingAllComponent(containerId, user) {
    const res = await fetch("js/components/badging-all.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    // 1️⃣ — Bloc utilisateur (pointage classique + auto-formation)
    const userSection = document.getElementById("badging-user-section");
    userSection.innerHTML = `
      <h3>Mon pointage</h3>
      <select id="badging-type-select"></select>
      <input id="badging-comment" placeholder="Commentaire (optionnel)">
      <button id="badging-btn">Pointer</button>
      <div id="badging-history" style="margin-top:1.7em;"></div>
    `;
    const typeSelect = document.getElementById("badging-type-select");
    const commentInput = document.getElementById("badging-comment");
    const badgeBtn = document.getElementById("badging-btn");
    const historyDiv = document.getElementById("badging-history");

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

    badgeBtn.onclick = async () => {
        const type = typeSelect.value;
        const comment = commentInput.value.trim();
        badgingManager.subscribeToTypes(types => {
            const t = types.find(tt => tt.name === type);
            if (t && t.rules && t.rules.autoDurationHours) {
                const now = Date.now();
                const durationMs = t.rules.autoDurationHours * 60 * 60 * 1000;
                const end = now + durationMs;
                badgingManager.addPresence({
                    user: user.email,
                    type: t.name,
                    timestamp: now,
                    comment: comment,
                    validated: false,
                    autoEnd: end
                });
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

    // 2️⃣ — Bloc récap + signature
    const recapSection = document.getElementById("badging-recap-section");
    recapSection.innerHTML = `
      <h3>Récap mensuel & signature</h3>
      <div id="recap-table"></div>
      <div style="margin:2em 0 1em 0;">
        <b>Signature numérique du salarié :</b>
        <br>
        <canvas id="signature-pad" width="320" height="90" style="border:1.4px solid #888;background:#fff;border-radius:1em;"></canvas>
        <br>
        <button id="clear-signature" style="margin-right:1.2em;">Effacer la signature</button>
        <button id="sign-btn">Valider la signature</button>
        <button id="download-pdf-btn" disabled>Télécharger PDF signé</button>
      </div>
    `;
    // Recap et signature logic ici (reprend monthly-recap.js)
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0).getTime();
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

    const recapDiv = document.getElementById("recap-table");
    const signBtn = document.getElementById("sign-btn");
    const downloadBtn = document.getElementById("download-pdf-btn");
    const canvas = document.getElementById("signature-pad");
    const signaturePad = new window.SignaturePad(canvas);

    let allPresences = [];

    badgingManager.getPresencesByUserAndDate(user.email, startOfMonth, endOfMonth).then(presences => {
        allPresences = presences;
        recapDiv.innerHTML = presences.length ? `
            <table>
                <thead>
                    <tr><th>Date</th><th>Type</th><th>Commentaire</th><th>Statut</th></tr>
                </thead>
                <tbody>
                    ${presences.map(p => `
                        <tr>
                            <td>${new Date(p.timestamp).toLocaleDateString()}</td>
                            <td>${p.type}</td>
                            <td>${p.comment || ""}</td>
                            <td>${p.validated ? "✅" : "⏳"}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        ` : "<em>Aucun pointage enregistré ce mois-ci.</em>";
    });

    document.getElementById("clear-signature").onclick = () => signaturePad.clear();

    signBtn.onclick = () => {
        if (signaturePad.isEmpty()) {
            alert("Veuillez signer avant de valider !");
            return;
        }
        alert("Signature enregistrée. Vous pouvez maintenant télécharger le PDF signé.");
        downloadBtn.disabled = false;
    };

    downloadBtn.onclick = () => {
        if (!allPresences.length || signaturePad.isEmpty()) {
            alert("Vous devez signer et avoir des pointages pour générer le PDF.");
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(`Récapitulatif pointages - ${user.email}`, 15, 15);
        doc.setFontSize(12);
        doc.text(`Mois : ${("0"+(month+1)).slice(-2)}/${year}`, 15, 24);

        // Tableau
        const headers = [["Date", "Type", "Commentaire", "Statut"]];
        const rows = allPresences.map(p => [
            new Date(p.timestamp).toLocaleDateString(),
            p.type,
            p.comment || "",
            p.validated ? "Validé" : "En attente"
        ]);
        doc.autoTable({
            head: headers,
            body: rows,
            startY: 35,
            theme: "grid",
            styles: { fontSize: 10 }
        });

        // Signature
        const imageData = signaturePad.toDataURL();
        doc.text("Signature du salarié :", 15, doc.lastAutoTable.finalY + 16);
        doc.addImage(imageData, "PNG", 70, doc.lastAutoTable.finalY + 3, 60, 20);

        doc.text(`Date de signature : ${(new Date()).toLocaleDateString()}`, 15, doc.lastAutoTable.finalY + 30);

        doc.save(`synergia-recap-pointages-${year}-${("0"+(month+1)).slice(-2)}.pdf`);
    };

    // 3️⃣ — Bloc admin (types, validation, export) si admin
    if (await isAdmin(user.email)) {
        const adminSection = document.getElementById("badging-admin-section");
        // ...ici, tu peux soit importer ton badging-admin.js, soit copier/coller la logique...
        // (Si besoin, je t’intègre tout le bloc admin dans ce fichier à la demande)
        adminSection.innerHTML = `
          <h3>Admin pointage (gestion des types, validation, export)</h3>
          <!-- Ajoute ici l’interface admin selon tes besoins, ou dis-le moi pour la version clé-en-main -->
        `;
        // ...code admin...
    }
}
