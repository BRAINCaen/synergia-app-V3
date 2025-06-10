const { jsPDF } = window.jspdf;

import { BadgingManager } from "../managers/badging-manager.js";
const badgingManager = new BadgingManager();

export async function loadMonthlyRecapComponent(containerId, user) {
    const res = await fetch("js/components/monthly-recap.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0).getTime();
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

    // Historique du mois
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

    // Signature Pad
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
}
