import { getBadgingTypes, getBadgeHistory } from "../managers/badging-manager.js";
import { delayUntilElementExists } from "../core/utils.js";

export async function loadBadgingComponent(containerId, user) {
  await delayUntilElementExists(`#${containerId}`);

  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div>
      <h2>Badging</h2>
      <div id="badge-types"></div>
      <div id="badge-history"></div>
    </div>
  `;

  populateTypes();
  renderHistory();
}

function populateTypes() {
  const typesContainer = document.getElementById("badge-types");
  if (!typesContainer) return;

  const types = getBadgingTypes();
  typesContainer.innerHTML = types.map(type => `<p>${type.label}</p>`).join("");
}

function renderHistory() {
  const historyContainer = document.getElementById("badge-history");
  if (!historyContainer) return;

  getBadgeHistory().then(history => {
    historyContainer.innerHTML = history.map(h => `<p>${h.date} - ${h.type}</p>`).join("");
  });
}
