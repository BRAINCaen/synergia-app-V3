import { getFirestore, collection, addDoc, query, orderBy, where, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app } from "../core/firebase-manager.js";
const db = getFirestore(app);

// parentDivId : l’id de la div où afficher le tchat
export function openPrivateChat(parentDivId, currentUser, otherUser) {
    const chatDiv = document.getElementById(parentDivId);
    chatDiv.innerHTML = `
      <div class="private-chat">
        <h4>Message privé avec ${otherUser.name || otherUser.email}</h4>
        <div id="private-messages" style="height:200px;overflow-y:auto;border:1px solid #ccc;padding:8px;margin-bottom:0.7em;background:#fafaff;border-radius:0.6em;"></div>
        <input id="private-msg-input" placeholder="Votre message..." style="width:78%;">
        <button id="private-send-btn">Envoyer</button>
        <button id="close-chat-btn" style="float:right;">Fermer</button>
      </div>
    `;

    // Ecoute messages en temps réel
    const messagesDiv = document.getElementById("private-messages");
    const users = [currentUser.email, otherUser.email].sort(); // pour l'ordre unique
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
              <div style="text-align:${align};margin-bottom:0.6em;">
                <span style="display:inline-block;background:${align==='right'?'#d0e6ff':'#eee'};border-radius:1em;padding:0.5em 1em;">
                  <b>${msg.sender === currentUser.email ? "Moi" : otherUser.name || otherUser.email}</b> :
                  ${msg.content}
                </span>
                <div style="font-size:0.88em;color:#aaa;">${msg.timestamp && msg.timestamp.toDate().toLocaleTimeString()}</div>
              </div>
            `;
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });

    // Envoi message
    document.getElementById("private-send-btn").onclick = async () => {
        const val = document.getElementById("private-msg-input").value.trim();
        if (!val) return;
        await addDoc(collection(db, "chat-messages"), {
            users,
            private: true,
            sender: currentUser.email,
            recipient: otherUser.email,
            content: val,
            timestamp: serverTimestamp()
        });
        document.getElementById("private-msg-input").value = "";
    };

    // Fermer
    document.getElementById("close-chat-btn").onclick = () => {
        unsub();
        chatDiv.innerHTML = "";
    };
}
