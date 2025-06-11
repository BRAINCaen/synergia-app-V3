import { getFirestore, collection, addDoc, query, orderBy, where, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app } from "../core/firebase-manager.js";

const db = getFirestore(app);

/**
 * Ouvre une popin de chat privé entre l'utilisateur courant et la personne ciblée
 * @param {string} parentDivId - L’ID de la div où afficher le chat (ex: "private-chat-popup")
 * @param {object} currentUser - { email, name, ... }
 * @param {object} otherUser   - { email, name, ... }
 */
export function openPrivateChat(parentDivId, currentUser, otherUser) {
    const chatDiv = document.getElementById(parentDivId);
    if (!chatDiv) return;

    chatDiv.innerHTML = `
      <div class="private-chat">
        <h4>Message privé avec ${otherUser.name || otherUser.email}</h4>
        <div id="private-messages" style="height:210px;overflow-y:auto;border:1px solid #ccc;padding:10px 10px 6px 10px;margin-bottom:0.8em;background:#fafaff;border-radius:0.7em;"></div>
        <input id="private-msg-input" placeholder="Votre message..." style="width:75%;border-radius:1em;border:1px solid #bbb;padding:0.5em;">
        <button id="private-send-btn" style="border-radius:1em;background:#6366f1;color:#fff;padding:0.4em 1.1em;border:none;margin-left:0.5em;">Envoyer</button>
        <button id="close-chat-btn" style="float:right;border-radius:1em;background:#aaa;color:#fff;padding:0.4em 1.1em;border:none;">Fermer</button>
      </div>
    `;

    // Ecoute messages en temps réel
    const messagesDiv = document.getElementById("private-messages");
    const users = [currentUser.email, otherUser.email].sort(); // always same order for 1-to-1 chat

    // Firestore query for private messages between the 2 users
    const q = query(
        collection(db, "chat-messages"),
        where("private", "==", true),
        where("users", "==", users),
        orderBy("timestamp", "asc")
    );
    const unsub = onSnapshot(q, snap => {
        messagesDiv.innerHTML = "";
        snap.forEach(doc => {
            const msg = doc.data();
            const align = msg.sender === currentUser.email ? "right" : "left";
            messagesDiv.innerHTML += `
              <div style="text-align:${align};margin-bottom:0.7em;">
                <span style="display:inline-block;background:${align==='right'?'#d0e6ff':'#eee'};border-radius:1em;padding:0.6em 1.1em;">
                  <b>${msg.sender === currentUser.email ? "Moi" : (otherUser.name || otherUser.email)}</b> :
                  ${escapeHTML(msg.content)}
                </span>
                <div style="font-size:0.9em;color:#aaa;margin-top:2px;">${msg.timestamp && msg.timestamp.toDate().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
              </div>
            `;
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });

    // Envoi message
    document.getElementById("private-send-btn").onclick = async () => {
        const input = document.getElementById("private-msg-input");
        const val = input.value.trim();
        if (!val) return;
        await addDoc(collection(db, "chat-messages"), {
            users,
            private: true,
            sender: currentUser.email,
            recipient: otherUser.email,
            content: val,
            timestamp: serverTimestamp()
        });
        input.value = "";
    };

    // Fermer la popin et unsubscribe Firestore
    document.getElementById("close-chat-btn").onclick = () => {
        unsub();
        chatDiv.innerHTML = "";
    };
}

// Sécurité XSS : échappe les caractères spéciaux
function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, function (m) {
        return ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[m];
    });
}
