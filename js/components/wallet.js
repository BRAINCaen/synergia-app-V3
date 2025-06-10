function getWalletHistory(user) {
    // Perso par utilisateur, à brancher sur Firebase plus tard si besoin
    const key = `synergia-wallet-history-${user?.email || "default"}`;
    return JSON.parse(localStorage.getItem(key) || "[]");
}
function saveWalletHistory(history, user) {
    const key = `synergia-wallet-history-${user?.email || "default"}`;
    localStorage.setItem(key, JSON.stringify(history));
}
function getWalletBalance(user) {
    const history = getWalletHistory(user);
    let solde = 0;
    for (const op of history) {
        solde += op.type === "gain" ? op.amount : -op.amount;
    }
    return solde;
}

export async function loadWalletComponent(containerId, user) {
    // Charge le HTML
    const res = await fetch("js/components/wallet.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    function updateBalance() {
        document.getElementById("wallet-balance-value").textContent = getWalletBalance(user);
    }

    function renderHistory() {
        const ul = document.getElementById("wallet-history-list");
        const history = getWalletHistory(user);
        ul.innerHTML = "";
        for (const op of history.slice().reverse()) {
            const sign = op.type === "gain" ? "+" : "–";
            const color = op.type === "gain" ? "#48bb78" : "#e53e3e";
            const li = document.createElement("li");
            li.innerHTML = `<span style="color:${color};font-weight:600;">${sign}${op.amount}</span>
                crédits — <b>${op.desc}</b>
                <span style="color:#888;font-size:0.94em;">(${op.date})</span>`;
            ul.appendChild(li);
        }
    }

    // Gérer ajout opération
    const form = document.getElementById("wallet-form");
    form.onsubmit = (e) => {
        e.preventDefault();
        const amount = parseInt(document.getElementById("wallet-amount").value);
        const desc = document.getElementById("wallet-desc").value.trim();
        const type = document.getElementById("wallet-type").value;
        if (!amount || !desc) return;
        const history = getWalletHistory(user);
        history.push({
            amount,
            desc,
            type,
            date: new Date().toLocaleString()
        });
        saveWalletHistory(history, user);
        form.reset();
        updateBalance();
        renderHistory();
    };

    updateBalance();
    renderHistory();
}
