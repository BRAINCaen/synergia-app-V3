import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";

export async function loadPrivateChatComponent(containerId, currentUser, targetUser) {
  const db = getFirestore();
  const container = document.getElementById(containerId);
  if (!container || !currentUser || !targetUser) return;

  container.innerHTML = `
    <div class="chat-box">
      <div id="messages"></div>
      <input type="text" id="chat-input" placeholder="Écris ton message..." />
      <button id="send-btn">Envoyer</button>
    </div>
  `;

  const messagesDiv = document.getElementById("messages");
  const input = document.getElementById("chat-input");
  const btn = document.getElementById("send-btn");

  const usersKey = [currentUser.email, targetUser.email].sort().join("_");

  const messagesRef = collection(db, "chat-messages");
  const chatQuery = query(
    messagesRef,
    where("private", "==", true),
    where("users", "array-contains", currentUser.email),
    orderBy("timestamp", "asc") // ⚠️ Nécessite index
  );

  try {
    onSnapshot(chatQuery, (snapshot) => {
      messagesDiv.innerHTML = "";
      snapshot.forEach((doc) => {
        const msg = doc.data();
        if (msg.users.includes(targetUser.email)) {
          const div = document.createElement("div");
          div.textContent = `${msg.from === currentUser.email ? "Moi" : targetUser.name} : ${msg.text}`;
          messagesDiv.appendChild(div);
        }
      });
    });
  } catch (error) {
    console.error("Erreur de chat:", error.message);
    messagesDiv.innerHTML = `<p style="color:red;">Erreur de chargement : ${error.message}</p>`;
  }

  btn.onclick = async () => {
    const text = input.value.trim();
    if (!text) return;

    await addDoc(messagesRef, {
      private: true,
      users: [currentUser.email, targetUser.email],
      from: currentUser.email,
      to: targetUser.email,
      text: text,
      timestamp: serverTimestamp(),
    });

    input.value = "";
  };
}
