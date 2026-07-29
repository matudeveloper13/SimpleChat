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
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your Firebase Config
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

// DOM Elements
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

let currentUsername = "";

// Security and Formatting Helpers
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

// UI Toggles
const switchTab = (activeTab, inactiveTab, activeForm, inactiveForm) => {
  activeTab.classList.add("active");
  inactiveTab.classList.remove("active");
  activeForm.classList.remove("hidden");
  inactiveForm.classList.add("hidden");
  authError.textContent = "";
};

tabRegister.addEventListener("click", () => switchTab(tabRegister, tabLogin, registerForm, loginForm));
tabLogin.addEventListener("click", () => switchTab(tabLogin, tabRegister, loginForm, registerForm));

authModalBtn.addEventListener("click", () => authOverlay.classList.remove("hidden"));
closeModalBtn.addEventListener("click", () => authOverlay.classList.add("hidden"));

// Authentication
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("register-username").value.trim();
  const password = document.getElementById("register-password").value;

  if (username.length < 2) {
    authError.textContent = "Username must be at least 2 characters.";
    return;
  }

  try {
    authError.textContent = "Creating account...";
    await createUserWithEmailAndPassword(auth, makeEmail(username), makeSecurePass(password));
    authOverlay.classList.add("hidden");
  } catch (err) {
    console.error("Firebase Auth Error:", err);
    if (err.code === "auth/email-already-in-use") {
      authError.textContent = "Username is already taken.";
    } else {
      authError.textContent = "Registration error: " + err.message;
    }
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    authError.textContent = "Signing in...";
    await signInWithEmailAndPassword(auth, makeEmail(username), makeSecurePass(password));
    authOverlay.classList.add("hidden");
  } catch (err) {
    authError.textContent = "Invalid username or password.";
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

// Auth State Listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUsername = user.email.split("@")[0];
    currentUserText.textContent = currentUsername;
    authModalBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    messageInput.disabled = false;
    messageInput.placeholder = "Type your message...";
    sendBtn.disabled = false;
  } else {
    currentUsername = "";
    currentUserText.textContent = "Guest";
    authModalBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    messageInput.disabled = true;
    messageInput.placeholder = "Sign in to start typing...";
    sendBtn.disabled = true;
  }
});

// Messaging
messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !currentUsername) return;

  messageInput.value = "";
  
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

// Realtime Feed
const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
onSnapshot(q, (snapshot) => {
  if (snapshot.empty) {
    messagesContainer.innerHTML = `<div class="empty-state">No messages yet. Be the first to say hello!</div>`;
    return;
  }
  
  messagesContainer.innerHTML = "";
  snapshot.forEach((doc) => {
    const msg = doc.data();
    const timeString = formatTime(msg.timestamp);
    
    const msgEl = document.createElement("div");
    msgEl.className = "msg";
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