import { BadgingManager } from "../managers/badging-manager.js";
import { isAdmin } from "../managers/user-manager.js";
const badgingManager = new BadgingManager();

export async function loadBadgingAllComponent(containerId, user) {
    const res = await fetch("js/components/badging-all.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    // Gestion des onglets
    const tabBtns = Array.from(document.querySelectorAll(".tab-btn"));
    const tabContents = Array.from(document.querySelectorAll(".tab-content"));
    tabBtns.forEach(btn => btn.onclick = () => {
        tabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        tabContents.forEach(tc => tc.style.display = "none");
        const tab = btn.getAttribute("data-tab");
        document.getElementById(`badging-${tab}-section`).style.display = "block";
    });

    // 1️⃣ POINTAGE UTILISATEUR
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

    // 2️⃣ RECAP & SIGNATURE
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

    // 3️⃣ ADMIN POINTAGE
    if (await isAdmin(user.email)) {
        document.querySelector(".tab-btn[data-tab='admin']").style.display = "";
        const adminSection = document.getElementById("badging-admin-section");
        adminSection.innerHTML = `
        <h3>Admin pointage (types, validation, export)</h3>
        <div style="display:flex;gap:3em;flex-wrap:wrap;">
            <div>
                <b>Types de pointage</b>
                <form id="admin-add-type-form" style="margin:0.6em 0;">
                  <input id="admin-type-name" placeholder="name" required style="width:7em;">
                  <input id="admin-type-label" placeholder="label" required style="width:7em;">
                  <button type="submit">Ajouter</button>
                </form>
                <div id="admin-types-list"></div>
            </div>
            <div style="flex:1;min-width:340px;">
                <b>Historique tous salariés</b>
                <input id="filter-email" placeholder="Filtrer par email" style="width:70%;margin-bottom:0.7em;">
                <button id="export-csv-btn">Exporter CSV</button>
                <button id="export-pdf-btn">Exporter PDF</button>
                <div id="admin-presences-table" style="margin-top:0.7em;"></div>
            </div>
        </div>
        `;
        // Admin logic — types
        const typesList = document.getElementById("admin-types-list");
        const addTypeForm = document.getElementById("admin-add-type-form");
        const nameInput = document.getElementById("admin-type-name");
        const labelInput = document.getElementById("admin-type-label");

        function renderTypes(types) {
            typesList.innerHTML = "";
            types.forEach(type => {
                const row = document.createElement("div");
                row.className = "admin-type-row";
                row.innerHTML = `
                    <span><b>${type.label || type.name}</b> <em style="color:#999;font-size:0.97em;">(${type.name})</em></span>
                    <button class="admin-type-edit" title="Éditer">✏️</button>
                    <button class="admin-type-del" title="Supprimer">🗑️</button>
                `;
                row.querySelector(".admin-type-edit").onclick = () => {
                    const currentRules = type.rules ? JSON.stringify(type.rules, null, 2) : "";
                    const newLabel = prompt("Nouveau label pour ce type ?", type.label || type.name);
                    const newRules = prompt("Règles (JSON, optionnel)", currentRules || '{\n  "minHoursPerDay": 7,\n  "maxHoursPerDay": 10,\n  "minPauseMinutes": 20\n}');
                    let rules = undefined;
                    try {
                        rules = newRules ? JSON.parse(newRules) : undefined;
                    } catch (e) {
                        alert("Format de règles invalide !");
                        return;
                    }
                    if (newLabel !== null && newLabel.trim()) {
                        badgingManager.editType(type.id, { ...type, label: newLabel.trim(), rules });
                    }
                };
                row.querySelector(".admin-type-del").onclick = () => {
                    if (confirm("Supprimer ce type de pointage ?")) {
                        badgingManager.deleteType(type.id);
                    }
                };
                typesList.appendChild(row);
            });
        }
        badgingManager.subscribeToTypes(renderTypes);

        addTypeForm.onsubmit = async (e) => {
            e.preventDefault();
            const name = nameInput.value.trim();
            const label = labelInput.value.trim();
            if (!name) return;
            await badgingManager.addType({ name, label });
            nameInput.value = "";
            labelInput.value = "";
        };

        // Historique tous salariés
        const tableDiv = document.getElementById("admin-presences-table");
        const filterEmail = document.getElementById("filter-email");
        const exportBtn = document.getElementById("export-csv-btn");
        const exportBtnPdf = document.getElementById("export-pdf-btn");
        let allPresences = [];

        function renderTable(presences) {
            tableDiv.innerHTML = presences.length ? `
                <table>
                  <thead>
                    <tr>
                      <th>Email</th><th>Date</th><th>Type</th><th>Commentaire</th><th>Statut</th><th>Valider</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${presences.map(p => `
                      <tr>
                        <td>${p.user}</td>
                        <td>${new Date(p.timestamp).toLocaleString()}</td>
                        <td>${p.type}</td>
                        <td>${p.comment || ""}</td>
                        <td>${p.validated ? "✅" : "⏳"}</td>
                        <td>
                          ${p.validated
                            ? ""
                            : `<button class="validate-btn" data-id="${p.id}">✅</button>
                               <button class="refuse-btn" data-id="${p.id}">❌</button>`
                          }
                          </td>
                        </tr>
                    `).join('')}
                  </tbody>
                </table>
            ` : "<em>Aucun pointage enregistré.</em>";

            Array.from(tableDiv.querySelectorAll(".validate-btn")).forEach(btn => {
                btn.onclick = () => badgingManager.validatePresence(btn.dataset.id, true);
            });
            Array.from(tableDiv.querySelectorAll(".refuse-btn")).forEach(btn => {
                btn.onclick = () => badgingManager.deletePresence(btn.dataset.id);
            });
        }

        badgingManager.subscribeToAllPresences(pres => {
            allPresences = pres;
            filterAndRender();
        });

        function filterAndRender() {
            let filtered = allPresences;
            const emailVal = filterEmail.value.trim().toLowerCase();
            if (emailVal) filtered = filtered.filter(p => p.user.toLowerCase().includes(emailVal));
            renderTable(filtered);
        }
        filterEmail.oninput = filterAndRender;

        exportBtn.onclick = () => {
            let csv = "Email,Date,Type,Commentaire,Statut\n";
            allPresences.forEach(p => {
                csv += `"${p.user}","${new Date(p.timestamp).toLocaleString()}","${p.type}","${p.comment || ""}","${p.validated ? "Validé" : "En attente"}"\n`;
            });
            const blob = new Blob([csv], { type: "text/csv" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `pointages_${(new Date()).toISOString().slice(0,10)}.csv`;
            link.click();
        };

        exportBtnPdf.onclick = () => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.setFontSize(17);
            doc.text("Tableau de pointage RH - Synergia", 15, 17);
            doc.setFontSize(12);
            doc.text("Généré le : " + (new Date()).toLocaleString(), 15, 26);

            // Colonnes
            const headers = [["Nom", "Email", "Date", "Type", "Commentaire", "Statut"]];
            const rows = allPresences.map(p => [
                p.user.split("@")[0],
                p.user,
                new Date(p.timestamp).toLocaleString(),
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

            doc.text("Signature du salarié : ___________________", 15, doc.lastAutoTable.finalY + 16);
            doc.text("Signature RH : ___________________", 120, doc.lastAutoTable.finalY + 16);

            doc.save(`pointages_RH_${(new Date()).toISOString().slice(0,10)}.pdf`);
        };
    }
}
