// Utilisation de localStorage pour la démo (remplace par Firebase plus tard)
function getPlanning() {
    return JSON.parse(localStorage.getItem("synergia-planning") || "[]");
}
function savePlanning(planning) {
    localStorage.setItem("synergia-planning", JSON.stringify(planning));
}

export async function loadPlanningComponent(containerId) {
    // Charge le HTML
    const res = await fetch("js/components/planning.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    let planning = getPlanning();

    function renderTable() {
        const tbody = document.getElementById("planning-table-body");
        tbody.innerHTML = "";
        planning.forEach((shift, idx) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${shift.date}</td>
                <td>${shift.name}</td>
                <td>${shift.start}</td>
                <td>${shift.end}</td>
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
                planning.splice(idx, 1);
                savePlanning(planning);
                renderTable();
            };
        });
    }

    renderTable();

    // Gérer modal d'ajout
    const modal = document.getElementById("planning-modal");
    const addBtn = document.getElementById("add-shift-btn");
    const cancelBtn = document.getElementById("planning-cancel-btn");
    const form = document.getElementById("planning-form");
    addBtn.onclick = () => {
        form.reset();
        modal.style.display = "block";
        document.getElementById("planning-form-title").textContent = "Ajouter un shift";
    };
    cancelBtn.onclick = () => modal.style.display = "none";

    form.onsubmit = (e) => {
        e.preventDefault();
        planning.push({
            date: document.getElementById("shift-date").value,
            name: document.getElementById("shift-name").value,
            start: document.getElementById("shift-start").value,
            end: document.getElementById("shift-end").value
        });
        savePlanning(planning);
        modal.style.display = "none";
        renderTable();
    };
}
