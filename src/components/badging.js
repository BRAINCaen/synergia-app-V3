
import {
  getBadgingTypes,
  getBadgeHistory,
  submitBadging,
  addBadgingType
} from "../managers/badging-manager.js";

export async function loadBadgingComponent(containerId, user) {
  const container = document.getElementById(containerId);
  if (!container || !user) return;

  const isAdmin = user.role === "admin";

  container.innerHTML = `
    <section class="badging">
      <h2>🕓 Badging de ${user.name || user.email}</h2>
      <div id="badge-types" class="badge-types"></div>
      ${isAdmin ? `<button id="add-type-btn">➕ Ajouter un type</button>` : ""}
      <div id="badge-history" class="badge-history"></div>
    </section>
  `;

  await renderTypes(user);
  await renderHistory(user);

  if (isAdmin) {
    document.getElementById("add-type-btn").onclick = async () => {
      const newLabel = prompt("Nom du nouveau type :");
      if (newLabel && newLabel.length > 2) {
        await addBadgingType(newLabel);
        await renderTypes(user);
      }
    };
  }
}

async function renderTypes(user) {
  const types = await getBadgingTypes();
  const zone = document.getElementById("badge-types");
  zone.innerHTML = types.map(type => `
    <button class="badge-btn" data-type="${type.label}">
      ${type.label}
    </button>
  `).join("");

  document.querySelectorAll(".badge-btn").forEach(btn => {
    btn.onclick = async () => {
      const type = btn.dataset.type;
      await submitBadging(user.id, type, user.email);
      await renderHistory(user);
    };
  });
}

async function renderHistory(user) {
  const history = await getBadgeHistory(user.id);
  const zone = document.getElementById("badge-history");
  if (!history.length) {
    zone.innerHTML = "<p>Aucun badging enregistré.</p>";
    return;
  }
  zone.innerHTML = history.map(b => `
    <div class="badge-line">
      <strong>${b.type}</strong> — ${new Date(b.timestamp).toLocaleString()}
      <em style="font-size:0.8em;">par ${b.author}</em>
    </div>
  `).join("");
}
