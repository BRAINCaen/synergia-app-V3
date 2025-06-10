import { loadDashboard } from './components/dashboard.js';
import { AuthManager } from './managers/auth-manager.js';
import { auth } from './core/firebase-manager.js';

// Charge l’interface au bon moment (après l’auth Firebase)
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

// Auth Firebase (remplace ce qui était avant !)
auth.onAuthStateChanged((user) => {
  if (user) {
    startApp(user);
  } else {
    // Si pas loggé, affiche le formulaire d’auth ou message (adapter si tu as un composant d’auth)
    document.getElementById('app').innerHTML = '<p>Connecte-toi pour accéder au dashboard.</p>';
  }
});
