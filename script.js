// Firebase Config (Your Keys)
const firebaseConfig = {
  apiKey: "AIzaSyAjrDMHeulPmO-HbZ43-TlD0-sgAcpXFcQ",
  authDomain: "simplechat-e1787.firebaseapp.com",
  projectId: "simplechat-e1787",
  storageBucket: "simplechat-e1787.firebasestorage.app",
  messagingSenderId: "469168057769",
  appId: "1:469168057769:web:d7f37ceae7b6d8227c28b8",
  measurementId: "G-KDWQTRWZSQ"
};

// Start Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Load saved username
let savedUsername = localStorage.getItem("username");
if (savedUsername) {
    document.getElementById("username").value = savedUsername;
}

// Load real-time messages for EVERYONE
db.collection("messages").orderBy("timestamp", "asc")
    .onSnapshot((snapshot) => {
        let box = document.getElementById("messages");
        box.innerHTML = "";

        snapshot.forEach((doc) => {
            let msg = doc.data();
            let p = document.createElement("p");
            
            let bold = document.createElement("b");
            bold.textContent = `${msg.username}: `;
            
            let textSpan = document.createElement("span");
            textSpan.textContent = msg.text;

            p.appendChild(bold);
            p.appendChild(textSpan);
            box.appendChild(p);
        });

        box.scrollTop = box.scrollHeight;
    });

// Send message to shared cloud
function sendMessage() {
    let usernameInput = document.getElementById("username");
    let messageInput = document.getElementById("message");

    let username = usernameInput.value.trim();
    let message = messageInput.value.trim();

    if (username === "" || message === "") return;

    localStorage.setItem("username", username);

    db.collection("messages").add({
        username: username,
        text: message,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    messageInput.value = "";
}

document.getElementById("message").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
});