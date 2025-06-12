
import { showToast } from "../core/utils.js";
import { checkIfAdmin } from "../core/admin.js";

const db = window.firebase.firestore();

export async function loadAdminUsersComponent(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const isAdmin = await checkIfAdmin();
  if (!isAdmin) {
    showToast("⛔ Accès interdit : admin uniquement");
    return;
  }

  const body = document.getElementById("admin-users-body");
  body.innerHTML = "";

  const snapshot = await getDocs(collection(db, "team"));
  snapshot.forEach(docSnap => {
    const user = docSnap.data();
    const tr = document.createElement("tr");

    const roles = ["member", "admin", "superadmin"];
    const select = document.createElement("select");
    roles.forEach(r => {
      const option = document.createElement("option");
      option.value = r;
      option.textContent = r;
      if (r === user.role) option.selected = true;
      select.appendChild(option);
    });

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Enregistrer";
    saveBtn.onclick = async () => {
      try {
        await updateDoc(doc(db, "team", docSnap.id), {
          role: select.value
        });
        showToast("✅ Rôle mis à jour");
      } catch (e) {
        showToast("❌ Erreur : " + e.message);
      }
    };

    tr.innerHTML = `
      <td>${user.name || "-"}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
    `;
    const tdSelect = document.createElement("td");
    tdSelect.appendChild(select);
    const tdBtn = document.createElement("td");
    tdBtn.appendChild(saveBtn);

    tr.appendChild(tdSelect);
    tr.appendChild(tdBtn);
    body.appendChild(tr);
  });
}