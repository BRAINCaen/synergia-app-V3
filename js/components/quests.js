// Données de missions (à adapter ou à rendre dynamiques/Firebase plus tard)
const QUESTS = [
    { id: 1, label: "Bienvenue sur Synergia !", xp: 10 },
    { id: 2, label: "Renseigner ton profil", xp: 20 },
    { id: 3, label: "Participer à une réunion d’équipe", xp: 15 },
    { id: 4, label: "Valider un badge de présence", xp: 5 },
    // ...ajoute ici d'autres missions...
];

function getProgress() {
    return JSON.parse(localStorage.getItem("synergia-quests-progress") || "{}");
}
function saveProgress(progress) {
    localStorage.setItem("synergia-quests-progress", JSON.stringify(progress));
}

function getXP(progress) {
    let xp = 0;
    for (const q of QUESTS) {
        if (progress[q.id]) xp += q.xp;
    }
    return xp;
}

export async function loadQuestsComponent(containerId) {
    // Charge le HTML
    const res = await fetch("js/components/quests.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    let progress = getProgress();

    function renderTable() {
        const tbody = document.getElementById("quests-table-body");
        tbody.innerHTML = "";
        for (const quest of QUESTS) {
            const isDone = !!progress[quest.id];
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${quest.label}</td>
                <td>${quest.xp}</td>
                <td>${isDone ? "Validée" : "À faire"}</td>
                <td>
                    <button class="validate-btn" data-id="${quest.id}" ${isDone ? "disabled" : ""}>
                        Valider
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        }
        // Ajout events
        Array.from(document.getElementsByClassName("validate-btn")).forEach(btn => {
            btn.onclick = () => {
                const id = +btn.dataset.id;
                progress[id] = true;
                saveProgress(progress);
                renderTable();
                updateXP();
            };
        });
    }

    function updateXP() {
        const xpValue = document.getElementById("xp-value");
        if (xpValue) xpValue.textContent = getXP(progress);
    }

    renderTable();
    updateXP();
}
