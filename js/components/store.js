const STORE_ITEMS = [
    { id: 1, label: "Tasse SYNERGIA", xp: 30 },
    { id: 2, label: "Place escape game", xp: 100 },
    { id: 3, label: "Pause sucrée", xp: 15 },
    { id: 4, label: "Prime surprise", xp: 70 }
];

function getStoreProgress() {
    return JSON.parse(localStorage.getItem("synergia-quests-progress") || "{}");
}
function getXP(progress) {
    let xp = 0;
    for (const id in progress) {
        if (progress[id]) {
            // Récupère le XP des quêtes validées (voir quests.js)
            const quest = window.QUESTS?.find(q => q.id == id);
            if (quest) xp += quest.xp;
        }
    }
    // Soustrait les XP dépensés
    const history = getHistory();
    for (const item of history) {
        xp -= item.xp;
    }
    return Math.max(xp, 0);
}

function getHistory() {
    return JSON.parse(localStorage.getItem("synergia-store-history") || "[]");
}
function saveHistory(history) {
    localStorage.setItem("synergia-store-history", JSON.stringify(history));
}

export async function loadStoreComponent(containerId) {
    // Charge le HTML
    const res = await fetch("js/components/store.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    // Pour récupérer le XP
    let progress = getStoreProgress();

    function updateXP() {
        const xpValue = document.getElementById("store-xp-value");
        if (xpValue) xpValue.textContent = getXP(progress);
    }

    function renderStore() {
        const storeDiv = document.getElementById("store-items");
        storeDiv.innerHTML = "";
        const xpSolde = getXP(progress);
        for (const item of STORE_ITEMS) {
            const disabled = xpSolde < item.xp;
            const div = document.createElement("div");
            div.className = "store-item";
            div.innerHTML = `
                <b>${item.label}</b> <span style="margin:0 8px;">—</span>
                <span>${item.xp} XP</span>
                <button class="buy-btn" data-id="${item.id}" ${disabled ? "disabled" : ""}>Acheter</button>
            `;
            storeDiv.appendChild(div);
        }
        // Boutons achat
        Array.from(document.getElementsByClassName("buy-btn")).forEach(btn => {
            btn.onclick = () => {
                const id = +btn.dataset.id;
                const item = STORE_ITEMS.find(i => i.id === id);
                if (!item) return;
                if (getXP(progress) < item.xp) return;
                // Ajoute à l'historique
                const history = getHistory();
                history.push({
                    label: item.label,
                    xp: item.xp,
                    date: new Date().toLocaleString()
                });
                saveHistory(history);
                updateXP();
                renderStore();
                renderHistory();
            };
        });
    }

    function renderHistory() {
        const ul = document.getElementById("store-history-list");
        const history = getHistory();
        ul.innerHTML = "";
        for (const item of history.reverse()) {
            const li = document.createElement("li");
            li.innerHTML = `${item.label} — <span style="color:#667eea;">-${item.xp} XP</span> <span style="color:#888;font-size:0.92em;">(${item.date})</span>`;
            ul.appendChild(li);
        }
    }

    // On doit "exposer" la variable globale QUESTS (quests.js) pour que le solde XP soit cohérent
    window.QUESTS = window.QUESTS || [
        { id: 1, label: "Bienvenue sur Synergia !", xp: 10 },
        { id: 2, label: "Renseigner ton profil", xp: 20 },
        { id: 3, label: "Participer à une réunion d’équipe", xp: 15 },
        { id: 4, label: "Valider un badge de présence", xp: 5 }
    ];

    renderStore();
    renderHistory();
    updateXP();
}
