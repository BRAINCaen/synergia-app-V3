const { jsPDF } = window.jspdf;

import { BadgingManager } from "../managers/badging-manager.js";
const badgingManager = new BadgingManager();

export async function loadBadgingAdminComponent(containerId) {
    const res = await fetch("js/components/badging-admin.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    // Gestion des types
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
            // Edit
// ...dans renderTypes...
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

            // Delete
            row.querySelector(".admin-type-del").onclick = () => {
                if (confirm("Supprimer ce type de pointage ?")) {
                    badgingManager.deleteType(type.id);
                }
            };
            typesList.appendChild(row);
        });
    }
    addTypeForm.onsubmit = async (e) => {
        e.preventDefault();
        const name = nameInput.value.trim();
        const label = labelInput.value.trim();
        if (!name) return;
        await badgingManager.addType({ name, label });
        nameInput.value = "";
        labelInput.value = "";
    };
    badgingManager.subscribeToTypes(renderTypes);

    // Historique tous salariés
    const tableDiv = document.getElementById("admin-presences-table");
    const filterEmail = document.getElementById("filter-email");
    const exportBtn = document.getElementById("export-csv-btn");
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

        // Actions validation/refus
        Array.from(tableDiv.querySelectorAll(".validate-btn")).forEach(btn => {
            btn.onclick = () => badgingManager.validatePresence(btn.dataset.id, true);
        });
        Array.from(tableDiv.querySelectorAll(".refuse-btn")).forEach(btn => {
            btn.onclick = () => badgingManager.deletePresence(btn.dataset.id);
        });
    }

    // Ecoute présence + filtres
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

    // Export CSV
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
}

exportBtnPdf.onclick = () => {
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
    // Affichage
    doc.autoTable({
        head: headers,
        body: rows,
        startY: 35,
        theme: "grid",
        styles: { fontSize: 10 }
    });

    // Signature/mentions légales
    doc.text("Signature du salarié : ___________________", 15, doc.lastAutoTable.finalY + 16);
    doc.text("Signature RH : ___________________", 120, doc.lastAutoTable.finalY + 16);

    doc.save(`pointages_RH_${(new Date()).toISOString().slice(0,10)}.pdf`);
};
