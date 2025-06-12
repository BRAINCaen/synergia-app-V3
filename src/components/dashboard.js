
import { loadBadgingComponent } from "./badging.js";

export function loadDashboardComponent(containerId, user) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const role = user.role || "inconnu";

  container.innerHTML = `
    <h2>🎮 Dashboard SYNERGIA</h2>
    <p>Bienvenue, <strong>${user.name || user.email}</strong></p>
    <p>Rôle détecté : <code>${role}</code></p>
    <button id="logout">🔒 Se déconnecter</button>

    <hr />
    <div id="module-container">
      ${role === "admin" ? `
        <button onclick="alert('👥 Gérer équipe')">👥 Gérer équipe</button>
        <button onclick="alert('📅 Module Planning')">📅 Planning</button>
        <button onclick="alert('🏪 Boutique interne')">🏪 Boutique</button>
      ` : ""}
      ${role === "gm" ? `
        <button onclick="alert('⏱️ Badging')">⏱️ Badging</button>
        <button onclick="alert('🎯 Quêtes')">🎯 Mes quêtes</button>
      ` : ""}
    </div>
  `;

  document.getElementById("logout").onclick = async () => {
    const { getAuth, signOut } = await import("firebase/auth");
    const auth = getAuth();
    await signOut(auth);
    location.reload();
  };
}

    const badgingZone = document.createElement("div");
    container.appendChild(badgingZone);
    loadBadgingComponent(badgingZone.id = "badging", user);
