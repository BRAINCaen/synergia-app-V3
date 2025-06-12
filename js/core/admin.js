
import { showToast } from "../core/utils.js";

/**
 * Vérifie si l'utilisateur connecté est admin
 * @returns {Promise<boolean>}
 */
export async function checkIfAdmin() {
  const user = window.firebase.auth().currentUser;
  if (!user) return false;

  const token = await user.getIdTokenResult();
  return token?.claims?.role === "admin" || token?.claims?.role === "superadmin";
}

/**
 * Affiche ou masque les éléments admin selon les droits
 */
export async function handleAdminElements() {
  const isAdmin = await checkIfAdmin();

  document.querySelectorAll(".admin-only").forEach(el => {
    el.style.display = isAdmin ? "block" : "none";
  });

  if (!isAdmin) {
    showToast("🔒 Accès limité : admin requis");
  }
}