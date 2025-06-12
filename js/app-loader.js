import { loadDashboard } from './components/dashboard.js';
import { auth } from './core/firebase-manager.js';

// Affiche le dashboard si connecté, sinon la page de connexion
function startApp(user) {
  if (document.getElementById('app')) {
    loadDashboard('app', user);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      if (document.getElementById('app')) {
        loadDashboard('app', user);
      }
    });
  }
}

// Ecoute l’état de connexion Firebase (auth)
auth.onAuthStateChanged(async (user) => {
  if (user) {
    startApp(user);
  } else {
    // Affiche le formulaire d’auth (email/mot de passe + Google)
    const { initAuthComponent } = await import('./components/auth.js');
    initAuthComponent('app');
  }
});

import { setupAuthUI } from './components/auth-ui.js';
setupAuthUI();
