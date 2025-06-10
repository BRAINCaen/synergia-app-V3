console.log("App Loader lancé");

async function loadComponent(path, containerId) {
    const res = await fetch(path);
    const html = await res.text();
    document.getElementById(containerId).innerHTML += html;
}

window.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("loading-screen").style.display = "none";
    const appRoot = document.getElementById("app-root");
    appRoot.style.display = "block";

    // Exemple : charger la navigation
    await loadComponent("js/components/navigation.js", "app-root");
    console.log("Composants chargés.");
});
