// App Loader - centralise l'initialisation
import('../managers/team-manager.js').then(({ default: TeamManager }) => {
  const teamManager = new TeamManager();
  teamManager.init();
});
// TODO : charger les autres managers progressivement
// TODO : afficher un écran de loading ou d’erreur si besoin
