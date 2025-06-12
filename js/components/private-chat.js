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
    // Vérification défensive pour éviter tout plantage
    if (!currentUser || !currentUser.email) {
        alert("Utilisateur courant non trouvé (connexion expirée ou bug). Merci de vous reconnecter.");
        return;
    }
    if (!otherUser || !otherUser.email) {
        alert("Impossible d’ouvrir la messagerie : membre cible sans email.");
        return;
    }

    const chatDiv = document.getElementById(parentDivId);
    if (!chatDiv) {
        alert("Div cible pour le chat introuvable.");
        return;
    }

    chatDiv.innerHTML = `
      <div class="private-chat">
        <h4>Message privé avec ${otherUser.name || otherUser.email}</h4>
        <div id="private-messages" style="height:210px;overflow-y:auto;"></div>
        <input id="private-msg-input" placeholder="Votre message..." type="text">
        <button id="private-send-btn">Envoyer</button>
        <button id="close-chat-btn">Fermer</button>
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
            const mine = msg.sender === currentUser.email;
            messagesDiv.innerHTML += `
              <div class="private-msg-${mine ? "me" : "other"}">
                <div class="msg-bubble">${escapeHTML(msg.content)}</div>
                <div class="msg-meta">
                  ${mine ? "Moi" : (otherUser.name || otherUser.email)}
                  • ${msg.timestamp && msg.timestamp.toDate().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                </div>
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
