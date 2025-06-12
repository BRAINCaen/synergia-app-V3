
import { showToast } from "../core/utils.js";
import {
  getBadgingTypes,
  getBadgeHistory,
  submitBadging,
  addBadgingType
} from "../managers/badging-manager-module.js";

import { delayUntilElementExists } from "../core/utils.js";

export async function loadBadgingComponent(containerId, user) {
  await delayUntilElementExists(`#${containerId}`);

  const container = document.getElementById(containerId);
  if (!container || !user) return;

  const currentUser = JSON.parse(localStorage.getItem("synergia-user"));
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "superadmin";

  container.innerHTML = `
    <section class="badging">
      <h2>Historique de badging de ${user.name || user.email}</h2>
      <div id="badge-types" class="badge-types"></div>
      ${isAdmin ? `<button id="add-type-btn" class="add-type-btn">+ Ajouter un type</button>` : ""}
      <div id="badge-history" class="badge-history"></div>
    </section>
  `;

  try {
    await populateTypes(user);
    await renderHistory(user);
  } catch (err) {
    console.error("Erreur de chargement des badges :", err);
    document.getElementById("badge-history").innerHTML =
      `<p style="color:red;">Erreur : ${err.message}</p>`;
  }

if (isAdmin) {
  document.getElementById("submit-type-btn").onclick = async () => {
    const label = document.getElementById("new-type-label").value.trim();
    if (label.length < 2) return showToast("❌ Nom invalide");

    try {
      await addBadgingType(label);
      showToast("✅ Type ajouté !");
      await populateTypes(user);
    } catch (err) {
      showToast("❌ Erreur : " + err.message);
    }
  };
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
      <em style="font-size: 0.8em;">par ${entry.author}</em>
    </div>
  `).join("");
}

async function handleTypeClick(typeId, user) {
  const currentUser = JSON.parse(localStorage.getItem("synergia-user"));
  if (!currentUser) {
    alert("Utilisateur connecté non identifié.");
    return;
  }

  try {
    await submitBadging(user.id, typeId, currentUser.email);
    alert("✅ Badging enregistré !");
    await renderHistory(user);
  } catch (err) {
    alert("❌ Erreur : " + err.message);
  }
}
