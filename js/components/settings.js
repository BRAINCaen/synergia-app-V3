function getSettings(user) {
    const key = `synergia-settings-${user?.email || "default"}`;
    return JSON.parse(localStorage.getItem(key) || '{}');
}
function saveSettings(settings, user) {
    const key = `synergia-settings-${user?.email || "default"}`;
    localStorage.setItem(key, JSON.stringify(settings));
}

export async function loadSettingsComponent(containerId, user) {
    const res = await fetch("js/components/settings.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    let settings = getSettings(user) || {};

    const langSelect = document.getElementById("setting-lang");
    const darkCheck = document.getElementById("setting-darkmode");
    const notifCheck = document.getElementById("setting-notifs");
    const form = document.getElementById("settings-form");

    // Initial values
    langSelect.value = settings.lang || "fr";
    darkCheck.checked = !!settings.darkmode;
    notifCheck.checked = !!settings.notifs;

    // Application du mode sombre immédiat
    function applyDarkMode(val) {
        document.body.style.background = val
            ? "linear-gradient(135deg, #232537 0%, #393c57 100%)"
            : "linear-gradient(135deg, #f8fafc 0%, #e9effd 65%, #e5e1fa 100%)";
        document.body.style.color = val ? "#f2f2f6" : "#25283b";
    }
    applyDarkMode(darkCheck.checked);

    // Enregistrer et appliquer paramètres
    form.onsubmit = e => {
        e.preventDefault();
        settings = {
            lang: langSelect.value,
            darkmode: darkCheck.checked,
            notifs: notifCheck.checked,
        };
        saveSettings(settings, user);
        applyDarkMode(settings.darkmode);
        if (settings.notifs) {
            if (window.showToast) showToast("Notifications activées !");
        }
        if (window.showToast) showToast("Paramètres enregistrés.", "success");
    };

    // Mode sombre live toggle
    darkCheck.onchange = () => applyDarkMode(darkCheck.checked);
}
