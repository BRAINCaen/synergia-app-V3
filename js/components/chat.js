// Pour la démo : stockage localStorage. Peut être branché sur Firebase après.
function getMessages() {
    return JSON.parse(localStorage.getItem("synergia-chat-messages") || "[]");
}
function saveMessages(messages) {
    localStorage.setItem("synergia-chat-messages", JSON.stringify(messages));
}

export async function loadChatComponent(containerId, user) {
    // Charge le HTML
    const res = await fetch("js/components/chat.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    let messages = getMessages();

    const messagesUl = document.getElementById("chat-messages");
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById("chat-input");

    function renderMessages() {
        messagesUl.innerHTML = "";
        messages.slice(-50).forEach(msg => {
            const li = document.createElement("li");
            li.innerHTML = `<b style="color:#667eea">${msg.author}</b> : ${msg.text} <span style="color:#aaa;font-size:0.8em;float:right">${msg.time}</span>`;
            messagesUl.appendChild(li);
        });
        // Scroll auto en bas
        messagesUl.parentNode.scrollTop = messagesUl.parentNode.scrollHeight;
    }

    renderMessages();

    chatForm.onsubmit = (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;
        const now = new Date();
        const message = {
            author: user?.email || "Anonyme",
            text,
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        messages.push(message);
        saveMessages(messages);
        chatInput.value = "";
        renderMessages();
    };

    // Rafraîchissement auto si plusieurs onglets
    window.addEventListener("storage", function (event) {
        if (event.key === "synergia-chat-messages") {
            messages = getMessages();
            renderMessages();
        }
    });
}
