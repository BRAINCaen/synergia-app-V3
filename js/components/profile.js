function getProfile(user) {
    // Perso par email, prêt pour Firebase si besoin
    const key = `synergia-profile-${user?.email || "default"}`;
    return JSON.parse(localStorage.getItem(key) || '{}');
}
function saveProfile(profile, user) {
    const key = `synergia-profile-${user?.email || "default"}`;
    localStorage.setItem(key, JSON.stringify(profile));
}

export async function loadProfileComponent(containerId, user) {
    const res = await fetch("js/components/profile.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    // Données de base
    let profile = getProfile(user) || {};

    // Avatar par défaut (initiales)
    function getInitials(email, name) {
        if (name) return name.trim().split(" ").map(w=>w[0]).join("").toUpperCase();
        if (email) return email[0].toUpperCase();
        return "?";
    }

    function renderProfile() {
        document.getElementById("profile-email").textContent = user.email;
        document.getElementById("profile-name").textContent = profile.name || "";
        document.getElementById("profile-role").textContent = profile.role || "";
        // Avatar
        document.getElementById("profile-avatar").innerHTML = `<span style="background:#667eea;color:#fff;font-size:2rem;width:64px;height:64px;display:flex;align-items:center;justify-content:center;border-radius:50%;box-shadow:0 2px 12px #667eea14;">${getInitials(user.email, profile.name)}</span>`;
    }

    // Gérer modal edit
    const modal = document.getElementById("profile-modal");
    const editBtn = document.getElementById("edit-profile-btn");
    const cancelBtn = document.getElementById("profile-cancel-btn");
    const form = document.getElementById("profile-form");

    editBtn.onclick = () => {
        form.reset();
        document.getElementById("edit-name").value = profile.name || "";
        document.getElementById("edit-role").value = profile.role || "";
        modal.style.display = "flex";
    };
    cancelBtn.onclick = () => modal.style.display = "none";

    form.onsubmit = (e) => {
        e.preventDefault();
        profile.name = document.getElementById("edit-name").value.trim();
        profile.role = document.getElementById("edit-role").value.trim();
        saveProfile(profile, user);
        modal.style.display = "none";
        renderProfile();
    };

    renderProfile();
}
