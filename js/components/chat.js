import { ChatManager } from "../managers/chat-manager.js";
const chatManager = new ChatManager();

export async function loadChatComponent(containerId, user) {
    // Charge le HTML du chat multi-salons
    const res = await fetch("js/components/chat.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    const roomsList = document.getElementById("chat-rooms-list");
    const createRoomForm = document.getElementById("chat-create-room-form");
    const createRoomInput = document.getElementById("chat-new-room");
    const messagesDiv = document.getElementById("chat-messages");
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById("chat-input");

    let currentRoomId = null;
    let roomUnsub = null;

    // Affiche la liste des salons
    function renderRooms(rooms) {
        roomsList.innerHTML = "";
        rooms.forEach(room => {
            const btn = document.createElement("button");
            btn.className = "chat-room-btn";
            btn.textContent = `#${room.name}`;
            btn.onclick = () => switchRoom(room.id, room.name);
            roomsList.appendChild(btn);
        });
    }

    // Passer à un salon (et charger les messages)
    function switchRoom(roomId, roomName) {
        if (roomUnsub) { roomUnsub(); }
        currentRoomId = roomId;
        document.getElementById("chat-current-room").textContent = "#" + roomName;
        messagesDiv.innerHTML = "<em>Chargement…</em>";
        roomUnsub = chatManager.subscribeToMessages(roomId, renderMessages);
    }

    // Affiche messages d'un salon
    function renderMessages(messages) {
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
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // Envoi message
    chatForm.onsubmit = async (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text || !currentRoomId) return;
        chatInput.value = "";
        await chatManager.sendMessage(currentRoomId, {
            email: user.email,
            name: user.displayName || user.email.split("@")[0],
            avatar: (user.photoURL ? `<img src="${user.photoURL}" style="width:1.7em;height:1.7em;border-radius:50%">` : user.displayName ? user.displayName[0].toUpperCase() : "👤"),
            text,
            timestamp: Date.now()
        });
    };

    // Créer salon
    createRoomForm.onsubmit = async (e) => {
        e.preventDefault();
        const name = createRoomInput.value.trim();
        if (!name) return;
        await chatManager.createRoom(name);
        createRoomInput.value = "";
    };

    // Affiche les salons en live
    chatManager.subscribeToRooms(rooms => {
        renderRooms(rooms);
        // Par défaut, sélectionne le 1er salon s’il y en a
        if (!currentRoomId && rooms.length) {
            switchRoom(rooms[0].id, rooms[0].name);
        }
    });
}
