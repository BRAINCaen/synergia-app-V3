import { PlanningManager } from "../managers/planning-manager.js";
const manager = new PlanningManager();

export async function loadPlanningComponent(containerId) {
    const res = await fetch("js/components/planning.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    function renderTable(planning) {
        const tbody = document.getElementById("planning-table-body");
        tbody.innerHTML = "";
        planning.forEach(shift => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${shift.date}</td>
                <td>${shift.name}</td>
                <td>${shift.start}</td>
                <td>${shift.end}</td>
                <td>
                    <button class="delete-btn" data-id="${shift.id}" style="color:#e53e3e;">Supprimer</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        Array.from(document.getElementsByClassName("delete-btn")).forEach(btn => {
            btn.onclick = async () => {
                await manager.deleteShift(btn.dataset.id);
            };
        });
    }

    manager.subscribeToPlanning(renderTable);

    // Ajout shift
    const modal = document.getElementById("planning-modal");
    const addBtn = document.getElementById("add-shift-btn");
    const cancelBtn = document.getElementById("planning-cancel-btn");
    const form = document.getElementById("planning-form");

    addBtn.onclick = () => { form.reset(); modal.style.display = "block"; };
    cancelBtn.onclick = () => modal.style.display = "none";

    form.onsubmit = async (e) => {
        e.preventDefault();
        await manager.addShift({
            date: document.getElementById("shift-date").value,
            name: document.getElementById("shift-name").value,
            start: document.getElementById("shift-start").value,
            end: document.getElementById("shift-end").value
        });
        modal.style.display = "none";
    };
}
