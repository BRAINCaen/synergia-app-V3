import { ChatManager } from "../managers/chat-manager.js";
const manager = new ChatManager();

export async function loadChatComponent(containerId, user) {
    const res = await fetch("js/components/chat.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    const messagesUl = document.getElementById("chat-messages");
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById("chat-input");

    function renderMessages(messages) {
        messagesUl.innerHTML = "";
        messages.slice(-50).forEach(msg => {
            const li = document.createElement("li");
            li.innerHTML = `<b style="color:#667eea">${msg.author}</b> : ${msg.text} <span style="color:#aaa;font-size:0.8em;float:right">${msg.time}</span>`;
            messagesUl.appendChild(li);
        });
        messagesUl.parentNode.scrollTop = messagesUl.parentNode.scrollHeight;
    }

    manager.subscribeToMessages(renderMessages);

    chatForm.onsubmit = async (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;
        const now = new Date();
        await manager.sendMessage({
            author: user?.email || "Anonyme",
            text,
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        });
        chatInput.value = "";
    };
}
