import { ChatManager } from "../managers/chat-manager.js";
const chatManager = new ChatManager();

export async function loadChatComponent(containerId, user) {
    const res = await fetch("js/components/chat.html");
    const html = await res.text();
    document.getElementById(containerId).innerHTML = html;

    const roomsList = document.getElementById("chat-rooms-list");
    const createRoomForm = document.getElementById("chat-create-room-form");
    const createRoomInput = document.getElementById("chat-new-room");
    const messagesDiv = document.getElementById("chat-messages");
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById("chat-input");
    const currentRoomElem = document.getElementById("chat-current-room");
    const actionsElem = document.getElementById("chat-room-actions");
    const editRoomBtn = document.getElementById("edit-room-btn");
    const deleteRoomBtn = document.getElementById("delete-room-btn");
    const editModal = document.getElementById("chat-edit-modal");
    const editForm = document.getElementById("chat-edit-form");
    const editInput = document.getElementById("edit-room-input");
    const cancelEditBtn = document.getElementById("cancel-edit-room");

    let currentRoomId = null;
    let currentRoomName = "";
    let roomUnsub = null;
    let roomsState = [];

    // Affiche la liste des salons à gauche
    function renderRooms(rooms) {
        roomsList.innerHTML = "";
        roomsState = rooms;
        rooms.forEach(room => {
            const div = document.createElement("div");
            div.className = "chat-room-row";
            // Salon cliquable + actions si sélectionné
            div.innerHTML = `
                <button class="chat-room-btn${currentRoomId === room.id ? " active" : ""}">#${room.name}</button>
            `;
            const btn = div.querySelector(".chat-room-btn");
            btn.onclick = () => switchRoom(room.id, room.name);
            roomsList.appendChild(div);
        });
    }

    // Passer à un salon (et charger les messages)
    function switchRoom(roomId, roomName) {
        if (roomUnsub) { roomUnsub(); }
        currentRoomId = roomId;
        currentRoomName = roomName;
        currentRoomElem.textContent = "#" + roomName;
        actionsElem.style.display = "inline-block";
        messagesDiv.innerHTML = "<em>Chargement…</em>";
        roomUnsub = chatManager.subscribeToMessages(roomId, renderMessages);
        // met à jour la liste pour highlight
        renderRooms(roomsState);
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

    // --- MODAL ÉDITION/SUPPRESSION ---
    editRoomBtn.onclick = () => {
        editInput.value = currentRoomName;
        editModal.style.display = "flex";
        editInput.focus();
    };
    cancelEditBtn.onclick = () => editModal.style.display = "none";
    editForm.onsubmit = async (e) => {
        e.preventDefault();
        const newName = editInput.value.trim();
        if (!newName || !currentRoomId) return;
        await chatManager.editRoom(currentRoomId, newName);
        editModal.style.display = "none";
    };

    deleteRoomBtn.onclick = async () => {
        if (!currentRoomId) return;
        if (confirm("Supprimer ce salon et tous ses messages ?")) {
            await chatManager.deleteRoom(currentRoomId);
            actionsElem.style.display = "none";
        }
    };

    // Affiche les salons en live
    chatManager.subscribeToRooms(rooms => {
        renderRooms(rooms);
        // Par défaut, sélectionne le 1er salon s’il y en a
        if (!currentRoomId && rooms.length) {
            switchRoom(rooms[0].id, rooms[0].name);
        } else if (currentRoomId) {
            const found = rooms.find(r => r.id === currentRoomId);
            if (!found && rooms.length) switchRoom(rooms[0].id, rooms[0].name);
        }
    });
}
