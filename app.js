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

// Firebase Config Block (Filled with your project details)
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "simplechat-e1787.firebaseapp.com",
  projectId: "simplechat-e1787",
  storageBucket: "simplechat-e1787.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID_HERE",
  appId: "PASTE_YOUR_APP_ID_HERE"
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

// Helper: Maps plain usernames to standard Firebase format behind the scenes
const makeEmail = (username) => `${username.toLowerCase().trim()}@chat.com`;

// Modal Tab Switchers
tabRegister.addEventListener("click", () => {
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  authError.textContent = "";
});

tabLogin.addEventListener("click", () => {
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
  authError.textContent = "";
});

// Modal Open / Close
authModalBtn.addEventListener("click", () => authOverlay.classList.remove("hidden"));
closeModalBtn.addEventListener("click", () => authOverlay.classList.add("hidden"));

// Account Registration
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("register-username").value.trim();
  const password = document.getElementById("register-password").value;

  if (username.length < 4 || username.length > 17) {
    authError.textContent = "Username must be between 4 and 17 characters!";
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, makeEmail(username), password);
    currentUsername = username;
    authOverlay.classList.add("hidden");
  } catch (err) {
    authError.textContent = "Registration failed. Username may already be taken.";
  }
});

// Account Login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    await signInWithEmailAndPassword(auth, makeEmail(username), password);
    currentUsername = username;
    authOverlay.classList.add("hidden");
  } catch (err) {
    authError.textContent = "Invalid username or password.";
  }
});

// Logout
logoutBtn.addEventListener("click", () => signOut(auth));

// Auth State Listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUsername = user.email.split("@")[0];
    currentUserText.textContent = `@${currentUsername}`;
    authModalBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    messageInput.disabled = false;
    messageInput.placeholder = "Type a message...";
    sendBtn.disabled = false;
  } else {
    currentUsername = "";
    currentUserText.textContent = "Browsing as Guest";
    authModalBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    messageInput.disabled = true;
    messageInput.placeholder = "Type a message... (Register required)";
    sendBtn.disabled = true;
  }
});

// Send Message
messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !currentUsername) return;

  try {
    await addDoc(collection(db, "messages"), {
      text: text,
      username: currentUsername,
      timestamp: serverTimestamp()
    });
    messageInput.value = "";
  } catch (err) {
    console.error("Error sending message:", err);
  }
});

// Realtime Messages Feed
const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
onSnapshot(q, (snapshot) => {
  messagesContainer.innerHTML = "";
  snapshot.forEach((doc) => {
    const msg = doc.data();
    const msgEl = document.createElement("div");
    msgEl.className = "msg";
    msgEl.innerHTML = `
      <div class="msg-author">@${msg.username || "anonymous"}</div>
      <div class="msg-text">${msg.text}</div>
    `;
    messagesContainer.appendChild(msgEl);
  });
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
});