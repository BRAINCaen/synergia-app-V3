import { ChatManager } from "../managers/chat-manager.js";

const chatManager = new ChatManager();

export async function loadChatComponent(containerId, user) {
    // Ajoute le bouton flottant chat si pas déjà là
    if (!document.getElementById("chat-float-btn")) {
        const btn = document.createElement("button");
        btn.id = "chat-float-btn";
        btn.innerHTML = '<span>💬</span>';
        btn.title = "Ouvrir le chat";
        document.body.appendChild(btn);
    }
    // Ajoute le panneau chat si pas déjà là
    if (!document.getElementById("chat-floating-panel")) {
        const panel = document.createElement("div");
        panel.id = "chat-floating-panel";
        panel.innerHTML = `
            <div id="chat-header">
                <span>💬 Chat d'équipe</span>
                <button id="chat-close-btn" title="Fermer">&times;</button>
            </div>
            <div id="chat-messages"></div>
            <form id="chat-form" autocomplete="off">
                <input id="chat-input" type="text" maxlength="300" placeholder="Écrire un message..." autocomplete="off" required>
                <button type="submit" title="Envoyer">Envoyer</button>
            </form>
        `;
        document.body.appendChild(panel);
    }

    // Affiche ou cache le chat
    const floatBtn = document.getElementById("chat-float-btn");
    const panel = document.getElementById("chat-floating-panel");
    const closeBtn = document.getElementById("chat-close-btn");

    floatBtn.onclick = () => {
        panel.classList.toggle("open");
        if (panel.classList.contains("open")) {
            setTimeout(() => {
                const messagesDiv = document.getElementById("chat-messages");
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }, 120);
        }
    };
    closeBtn.onclick = () => panel.classList.remove("open");

    // Charge l'historique et live updates
    function renderMessages(messages) {
        const messagesDiv = document.getElementById("chat-messages");
        messagesDiv.innerHTML = "";
        messages.forEach(msg => {
            messagesDiv.innerHTML += `
                <div class="chat-msg">
                    <div class="chat-avatar">${(msg.avatar || "👤")}</div>
                    <div class="chat-bubble">
                        <div class="chat-meta">
                            <b>${msg.name || msg.email || "Anonyme"}</b>
                            <span>${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div>${msg.text}</div>
                    </div>
                </div>
            `;
        });
        // scroll auto
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    chatManager.subscribeToMessages(renderMessages);

    // Envoi message
    const form = document.getElementById("chat-form");
    const input = document.getElementById("chat-input");
    form.onsubmit = async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        input.value = "";
        await chatManager.sendMessage({
            email: user.email,
            name: user.displayName || user.email.split("@")[0],
            avatar: (user.photoURL ? `<img src="${user.photoURL}" style="width:1.7em;height:1.7em;border-radius:50%">` : user.displayName ? user.displayName[0].toUpperCase() : "👤"),
            text,
            timestamp: Date.now()
        });
    };
    // Enter pour envoyer
    input.onkeydown = e => {
        if (e.key === "Enter" && !e.shiftKey) {
            form.requestSubmit();
            e.preventDefault();
        }
    };

    // (Optionnel) charge aussi un panneau principal si tu veux
    if (containerId && document.getElementById(containerId)) {
        document.getElementById(containerId).innerHTML = "<div style='padding:2em;text-align:center;color:#8b8b8b'>Le chat est accessible en bas à droite 🗨️</div>";
    }
}
