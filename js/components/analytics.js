export async function loadAnalyticsComponent(containerId) {
    // Charge le HTML
    const res = await fetch("js/components/analytics.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    // Attend que Chart.js soit chargé (par CDN, 1 seule fois)
    if (!window.Chart) {
        await loadScript("https://cdn.jsdelivr.net/npm/chart.js");
    }

    // Exemple XP par mois (fictif, à brancher sur ta vraie data)
    const ctxXP = document.getElementById("xpChart").getContext("2d");
    new Chart(ctxXP, {
        type: "line",
        data: {
            labels: ["Jan", "Fév", "Mars", "Avr", "Mai", "Juin"],
            datasets: [{
                label: "XP cumulée",
                data: [20, 50, 75, 100, 135, 180],
                borderColor: "#667eea",
                backgroundColor: "rgba(102,126,234,0.12)",
                fill: true,
                tension: 0.38,
                pointRadius: 4,
                pointBackgroundColor: "#667eea"
            }]
        },
        options: {
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    // Exemple présence (fictif, à brancher sur data)
    const ctxPresence = document.getElementById("presenceChart").getContext("2d");
    new Chart(ctxPresence, {
        type: "bar",
        data: {
            labels: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
            datasets: [{
                label: "Présence",
                data: [7, 8, 6, 7, 8, 5, 4],
                backgroundColor: "rgba(102,126,234,0.26)",
                borderColor: "#667eea",
                borderWidth: 2
            }]
        },
        options: {
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) return resolve();
            const s = document.createElement("script");
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.body.appendChild(s);
        });
    }
}
