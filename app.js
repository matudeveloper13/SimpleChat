import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAjrDMHeulPmO-HbZ43-TlD0-sgAcpXFcQ",
  authDomain: "simplechat-e1787.firebaseapp.com",
  projectId: "simplechat-e1787",
  storageBucket: "simplechat-e1787.firebasestorage.app",
  messagingSenderId: "469168057769",
  appId: "1:469168057769:web:d7f37ceae7b6d8227c28b8",
  measurementId: "G-KDWQTRWZSQ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements safely selected
const authModalBtn = document.getElementById("auth-modal-btn");
const logoutBtn = document.getElementById("logout-btn");
const currentUserText = document.getElementById("current-user-text");
const authOverlay = document.getElementById("auth-overlay");
const closeModalBtn = document.getElementById("close-modal-btn");
const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const authError = document.getElementById("auth-error");

const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const messagesContainer = document.getElementById("messages-container");

const emojiBtn = document.getElementById("emoji-btn");
const typingIndicator = document.getElementById("typing-indicator");
const typingText = document.getElementById("typing-text");

let currentUsername = "";

const makeSecurePass = (pass) => `sc_${pass}_pad123`;
const makeEmail = (username) => `${username.toLowerCase().trim()}@simplechat.com`;

const formatTime = (timestamp) => {
  if (!timestamp) return "Just now";
  const date = timestamp.toDate();
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(date);
};

// UI Toggles with safe checks
if (tabRegister && tabLogin && registerForm && loginForm) {
  tabRegister.addEventListener("click", () => {
    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    if (authError) authError.textContent = "";
  });

  tabLogin.addEventListener("click", () => {
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    if (authError) authError.textContent = "";
  });
}

if (authModalBtn && authOverlay) {
  authModalBtn.addEventListener("click", () => authOverlay.classList.remove("hidden"));
}

if (closeModalBtn && authOverlay) {
  closeModalBtn.addEventListener("click", () => authOverlay.classList.add("hidden"));
}

// Authentication
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("register-username").value.trim();
    const password = document.getElementById("register-password").value;

    if (username.length < 2) {
      if (authError) authError.textContent = "Username must be at least 2 characters.";
      return;
    }

    try {
      if (authError) authError.textContent = "Creating account...";
      await createUserWithEmailAndPassword(auth, makeEmail(username), makeSecurePass(password));
      if (authOverlay) authOverlay.classList.add("hidden");
    } catch (err) {
      if (authError) {
        if (err.code === "auth/email-already-in-use") authError.textContent = "Username is already taken.";
        else authError.textContent = "Registration error: " + err.message;
      }
    }
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;

    try {
      if (authError) authError.textContent = "Signing in...";
      await signInWithEmailAndPassword(auth, makeEmail(username), makeSecurePass(password));
      if (authOverlay) authOverlay.classList.add("hidden");
    } catch (err) {
      if (authError) authError.textContent = "Invalid username or password.";
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => signOut(auth));
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUsername = user.email.split("@")[0];
    if (currentUserText) currentUserText.textContent = currentUsername;
    if (authModalBtn) authModalBtn.classList.add("hidden");
    if (logoutBtn) logoutBtn.classList.remove("hidden");
    if (messageInput) {
      messageInput.disabled = false;
      messageInput.placeholder = "Message...";
    }
    if (sendBtn) sendBtn.disabled = false;
    if (emojiBtn) emojiBtn.disabled = false;
  } else {
    currentUsername = "";
    if (currentUserText) currentUserText.textContent = "Guest";
    if (authModalBtn) authModalBtn.classList.remove("hidden");
    if (logoutBtn) logoutBtn.classList.add("hidden");
    if (messageInput) {
      messageInput.disabled = true;
      messageInput.placeholder = "Sign in to chat...";
    }
    if (sendBtn) sendBtn.disabled = true;
    if (emojiBtn) emojiBtn.disabled = true;
  }
});

// Emoji Keyboard Shortcut Trigger
if (emojiBtn && messageInput) {
  emojiBtn.addEventListener("click", () => {
    messageInput.focus();
    if (navigator.platform.indexOf('Mac') > -1) {
      alert("Tip: Press Cmd + Control + Space to open your Mac emoji keyboard!");
    } else {
      alert("Tip: Press Windows Key + . (period) to open your Windows emoji keyboard!");
    }
  });
}

let typingTimeout = null;
if (messageInput) {
  messageInput.addEventListener("input", async () => {
    if (!currentUsername) return;
    const userRef = doc(db, "typing", currentUsername);
    await setDoc(userRef, { isTyping: true });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(async () => {
      await deleteDoc(userRef);
    }, 2000);
  });
}

if (messageForm && messageInput) {
  messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text || !currentUsername) return;

    messageInput.value = "";
    await deleteDoc(doc(db, "typing", currentUsername));
    
    try {
      await addDoc(collection(db, "messages"), {
        text: text,
        username: currentUsername,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  });
}

const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
onSnapshot(q, (snapshot) => {
  if (!messagesContainer) return;
  
  if (snapshot.empty) {
    messagesContainer.innerHTML = `<div class="empty-state">No messages yet. Be the first to say hello!</div>`;
    return;
  }
  
  messagesContainer.innerHTML = "";
  snapshot.forEach((doc) => {
    const msg = doc.data();
    const timeString = formatTime(msg.timestamp);
    const isMe = msg.username === currentUsername;
    const alignClass = isMe ? "sent" : "received";
    
    const msgEl = document.createElement("div");
    msgEl.className = `msg ${alignClass}`;
    msgEl.innerHTML = `
      <div class="msg-header">
        <span class="msg-author">${msg.username || "anonymous"}</span>
        <span class="msg-time">${timeString}</span>
      </div>
      <div class="msg-bubble">${msg.text}</div>
    `;
    messagesContainer.appendChild(msgEl);
  });
  
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

const typingQ = query(collection(db, "typing"));
onSnapshot(typingQ, (snapshot) => {
  if (!typingIndicator || !typingText || !messagesContainer) return;
  
  const typingUsers = [];
  snapshot.forEach(doc => {
    if (doc.id !== currentUsername && doc.data().isTyping) {
      typingUsers.push(doc.id);
    }
  });

  if (typingUsers.length > 0) {
    typingIndicator.classList.remove("hidden");
    if (typingUsers.length === 1) {
      typingText.textContent = `${typingUsers[0]} is typing...`;
    } else {
      typingText.textContent = "Multiple people are typing...";
    }
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  } else {
    typingIndicator.classList.add("hidden");
  }
});