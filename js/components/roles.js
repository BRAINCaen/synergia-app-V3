function getRoles() {
    return JSON.parse(localStorage.getItem("synergia-roles") || '[{"name":"Admin","color":"#e53e3e","perms":"tout"},{"name":"Manager","color":"#667eea","perms":"planning, équipe, boutique"},{"name":"Staff","color":"#48bb78","perms":"badging, quêtes"}]');
}
function saveRoles(roles) {
    localStorage.setItem("synergia-roles", JSON.stringify(roles));
}

export async function loadRolesComponent(containerId) {
    // Charge le HTML
    const res = await fetch("js/components/roles.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    let roles = getRoles();

    function renderTable() {
        const tbody = document.getElementById("roles-table-body");
        tbody.innerHTML = "";
        roles.forEach((role, idx) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>
                    <span class="role-label" style="background:${role.color};color:#fff;border-radius:8px;padding:0.4em 0.85em;">${role.name}</span>
                </td>
                <td>
                    <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:${role.color};border:1.5px solid #ddd;"></span>
                </td>
                <td>
                    ${role.perms ? role.perms.split(",").map(p => `<span class="role-perm">${p.trim()}</span>`).join(", ") : "-"}
                </td>
                <td>
                    <button class="edit-btn" data-idx="${idx}">✏️</button>
                    <button class="delete-btn" data-idx="${idx}" style="color:#e53e3e;">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        // Boutons supprimer
        Array.from(document.getElementsByClassName("delete-btn")).forEach(btn => {
            btn.onclick = () => {
                const idx = +btn.dataset.idx;
                roles.splice(idx, 1);
                saveRoles(roles);
                renderTable();
            };
        });
        // Boutons edit
        Array.from(document.getElementsByClassName("edit-btn")).forEach(btn => {
            btn.onclick = () => openModal(+btn.dataset.idx);
        });
    }

    // Modal add/edit
    const modal = document.getElementById("roles-modal");
    const addBtn = document.getElementById("add-role-btn");
    const cancelBtn = document.getElementById("roles-cancel-btn");
    const form = document.getElementById("roles-form");
    let editingIdx = null;
    addBtn.onclick = () => openModal();
    cancelBtn.onclick = () => { modal.style.display = "none"; editingIdx = null; };
    form.onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById("role-name").value.trim();
        const color = document.getElementById("role-color").value;
        const perms = document.getElementById("role-perms").value.trim();
        if (editingIdx !== null) {
            roles[editingIdx] = { name, color, perms };
        } else {
            roles.push({ name, color, perms });
        }
        saveRoles(roles);
        modal.style.display = "none";
        editingIdx = null;
        renderTable();
    };

    function openModal(idx) {
        form.reset();
        editingIdx = idx ?? null;
        document.getElementById("roles-form-title").textContent = idx !== undefined ? "Modifier un rôle" : "Ajouter un rôle";
        if (idx !== undefined) {
            const role = roles[idx];
            document.getElementById("role-name").value = role.name;
            document.getElementById("role-color").value = role.color;
            document.getElementById("role-perms").value = role.perms || "";
        }
        modal.style.display = "flex";
    }

    renderTable();
}
