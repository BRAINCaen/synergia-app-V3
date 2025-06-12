import { getBadgingTypes, getBadgeHistory } from "../managers/badging-manager.js";
import { delayUntilElementExists } from "../core/utils.js";

export async function loadBadgingComponent(containerId, user) {
  await delayUntilElementExists(`#${containerId}`);

  const container = document.getElementById(containerId);
  if (!container || !user) return;

  container.innerHTML = `
    <section class="badging">
      <h2>Historique de badging de ${user.name || user.email}</h2>
      <div id="badge-types"></div>
      <div id="badge-history"></div>
    </section>
  `;

  try {
    await populateTypes(user);
    await renderHistory(user);
  } catch (err) {
    console.error("Erreur de chargement des badges :", err);
    document.getElementById("badge-history").innerHTML = `<p style="color:red;">Erreur : ${err.message}</p>`;
  }
}

async function populateTypes(user) {
  const typesContainer = document.getElementById("badge-types");
  if (!typesContainer) return;

  const types = await getBadgingTypes();
  typesContainer.innerHTML = types.map(type => `
    <button class="badge-type-btn" data-type="${type.id}">
      ${type.label}
    </button>
  `).join("");

  // Ajouter les événements onclick
  document.querySelectorAll(".badge-type-btn").forEach(btn => {
    btn.onclick = () => handleTypeClick(btn.dataset.type, user);
  });
}

async function renderHistory(user) {
  const historyContainer = document.getElementById("badge-history");
  if (!historyContainer) return;

  const history = await getBadgeHistory(user.id);
  if (!history.length) {
    historyContainer.innerHTML = `<p>Aucun badging enregistré.</p>`;
    return;
  }

  historyContainer.innerHTML = history.map(entry => `
    <div class="badge-entry">
      <strong>${entry.type}</strong> — ${new Date(entry.timestamp).toLocaleString()}
    </div>
  `).join("");
}

function handleTypeClick(typeId, user) {
  alert(`Action de badging pour ${user.name || user.email} avec le type ${typeId}`);
  // TODO: Implémenter appel vers le manager pour enregistrer le badging
}
