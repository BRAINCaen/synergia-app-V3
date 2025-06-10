import { QuestsManager } from "../managers/quests-manager.js";
const QUESTS = [
    { id: 1, label: "Bienvenue sur Synergia !", xp: 10 },
    { id: 2, label: "Renseigner ton profil", xp: 20 },
    { id: 3, label: "Participer à une réunion d’équipe", xp: 15 },
    { id: 4, label: "Valider un badge de présence", xp: 5 }
];
const manager = new QuestsManager();

export async function loadQuestsComponent(containerId, user) {
    const res = await fetch("js/components/quests.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    let validated = [];

    function getXP() {
        let xp = 0;
        for (const q of QUESTS) {
            if (validated.find(val => val.questId == q.id && val.user === user.email)) xp += q.xp;
        }
        return xp;
    }

    function renderTable() {
        const tbody = document.getElementById("quests-table-body");
        tbody.innerHTML = "";
        for (const quest of QUESTS) {
            const isDone = !!validated.find(val => val.questId == quest.id && val.user === user.email);
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
        Array.from(document.getElementsByClassName("validate-btn")).forEach(btn => {
            btn.onclick = async () => {
                const id = +btn.dataset.id;
                await manager.validateQuest({ questId: id, user: user.email, timestamp: Date.now() });
            };
        });
        const xpValue = document.getElementById("xp-value");
        if (xpValue) xpValue.textContent = getXP();
    }

    manager.subscribeToProgress(list => {
        validated = list;
        renderTable();
    });
}
