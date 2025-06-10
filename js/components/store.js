import { StoreManager } from "../managers/store-manager.js";
import { QuestsManager } from "../managers/quests-manager.js";

const STORE_ITEMS = [
    { id: 1, label: "Tasse SYNERGIA", xp: 30 },
    { id: 2, label: "Place escape game", xp: 100 },
    { id: 3, label: "Pause sucrée", xp: 15 },
    { id: 4, label: "Prime surprise", xp: 70 }
];

const questsManager = new QuestsManager();

function getXP(user, questsValidated, history) {
    let xp = 0;
    for (const item of questsValidated) {
        if (item.user === user.email) {
            if (item.questId == 1) xp += 10;
            if (item.questId == 2) xp += 20;
            if (item.questId == 3) xp += 15;
            if (item.questId == 4) xp += 5;
        }
    }
    for (const item of history) {
        xp -= item.xp;
    }
    return Math.max(0, xp);
}

export async function loadStoreComponent(containerId, user) {
    const res = await fetch("js/components/store.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    const manager = new StoreManager();

    let storeHistory = [];
    let questsValidated = [];

    // Souscrit à la progression des quêtes
    questsManager.subscribeToProgress(list => {
        questsValidated = list;
        updateAll();
    });
    // Souscrit à l'historique boutique
    manager.subscribeToHistory(user, history => {
        storeHistory = history;
        updateAll();
    });

    function updateAll() {
        updateXP();
        renderStore();
        renderHistory();
    }

    function updateXP() {
        document.getElementById("store-xp-value").textContent = getXP(user, questsValidated, storeHistory);
    }

    function renderStore() {
        const storeDiv = document.getElementById("store-items");
        storeDiv.innerHTML = "";
        const xpSolde = getXP(user, questsValidated, storeHistory);
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
        Array.from(document.getElementsByClassName("buy-btn")).forEach(btn => {
            btn.onclick = async () => {
                const id = +btn.dataset.id;
                const item = STORE_ITEMS.find(i => i.id === id);
                if (!item) return;
                if (getXP(user, questsValidated, storeHistory) < item.xp) return;
                await manager.addPurchase(item, user);
            };
        });
    }

    function renderHistory() {
        const ul = document.getElementById("store-history-list");
        ul.innerHTML = "";
        for (const item of storeHistory) {
            const date = new Date(item.timestamp).toLocaleString();
            const li = document.createElement("li");
            li.innerHTML = `${item.label} — <span style="color:#667eea;">-${item.xp} XP</span> <span style="color:#888;font-size:0.92em;">(${date})</span>`;
            ul.appendChild(li);
        }
    }
}
