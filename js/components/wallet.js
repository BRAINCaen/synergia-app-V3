import { WalletManager } from "../managers/wallet-manager.js";
const manager = new WalletManager();

export async function loadWalletComponent(containerId, user) {
    const res = await fetch("js/components/wallet.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    let walletHistory = [];

    manager.subscribeToHistory(user, history => {
        walletHistory = history;
        updateBalance();
        renderHistory();
    });

    function getWalletBalance() {
        let solde = 0;
        for (const op of walletHistory) {
            solde += op.type === "gain" ? op.amount : -op.amount;
        }
        return solde;
    }

    function updateBalance() {
        document.getElementById("wallet-balance-value").textContent = getWalletBalance();
    }

    function renderHistory() {
        const ul = document.getElementById("wallet-history-list");
        ul.innerHTML = "";
        for (const op of walletHistory) {
            const sign = op.type === "gain" ? "+" : "–";
            const color = op.type === "gain" ? "#48bb78" : "#e53e3e";
            const date = new Date(op.timestamp).toLocaleString();
            const li = document.createElement("li");
            li.innerHTML = `<span style="color:${color};font-weight:600;">${sign}${op.amount}</span>
                crédits — <b>${op.desc}</b>
                <span style="color:#888;font-size:0.94em;">(${date})</span>`;
            ul.appendChild(li);
        }
    }

    // Ajout opération
    const form = document.getElementById("wallet-form");
    form.onsubmit = async (e) => {
        e.preventDefault();
        const amount = parseInt(document.getElementById("wallet-amount").value);
        const desc = document.getElementById("wallet-desc").value.trim();
        const type = document.getElementById("wallet-type").value;
        if (!amount || !desc) return;
        await manager.addOp({ amount, desc, type }, user);
        form.reset();
    };
}
