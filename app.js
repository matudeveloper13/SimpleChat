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
  getDoc,
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

const emojiBtn = document.getElementById("emoji-btn");
const typingIndicator = document.getElementById("typing-indicator");
const typingText = document.getElementById("typing-text");

// Profile Elements
const topLeftProfile = document.getElementById("top-left-profile");
const myMiniAvatar = document.getElementById("my-mini-avatar");
const myMiniUsername = document.getElementById("my-mini-username");

const profileOverlay = document.getElementById("profile-overlay");
const closeProfileModal = document.getElementById("close-profile-modal");
const editModalAvatar = document.getElementById("edit-modal-avatar");
const profileDisplayUsername = document.getElementById("profile-display-username");
const bioInput = document.getElementById("bio-input");
const bioCharCount = document.getElementById("bio-char-count");
const saveBioBtn = document.getElementById("save-bio-btn");

const avatarSelectorOverlay = document.getElementById("avatar-selector-overlay");
const closeAvatarSelector = document.getElementById("close-avatar-selector");
const openAvatarSelector = document.getElementById("open-avatar-selector");
const presetAvatars = document.querySelectorAll(".preset-avatar");

const viewProfileOverlay = document.getElementById("view-profile-overlay");
const closeViewProfile = document.getElementById("close-view-profile");
const viewUserAvatar = document.getElementById("view-user-avatar");
const viewUserName = document.getElementById("view-user-name");
const viewUserBio = document.getElementById("view-user-bio");

let currentUsername = "";
let currentAvatar = "avatar1.png";
let currentBio = "";

// Global user avatar cache so previous messages dynamically display updated avatars instantly
const userAvatarCache = {};

const makeSecurePass = (pass) => `sc_${pass}_pad123`;
const makeEmail = (username) => `${username.toLowerCase().trim()}@simplechat.com`;

const getRandomAvatar = () => {
  const avatars = ["avatar1.png", "avatar2.png", "avatar3.png", "avatar4.png", "avatar5.png"];
  return avatars[Math.floor(Math.random() * avatars.length)];
};

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

// Profile Modal Toggles
topLeftProfile.addEventListener("click", () => {
  if (!currentUsername) return;
  editModalAvatar.src = currentAvatar;
  profileDisplayUsername.textContent = currentUsername;
  bioInput.value = currentBio;
  updateCharCount();
  profileOverlay.classList.remove("hidden");
});

closeProfileModal.addEventListener("click", () => profileOverlay.classList.add("hidden"));

// Open Avatar Selector
openAvatarSelector.addEventListener("click", () => {
  avatarSelectorOverlay.classList.remove("hidden");
});

closeAvatarSelector.addEventListener("click", () => avatarSelectorOverlay.classList.add("hidden"));

// Preset selection
presetAvatars.forEach(img => {
  img.addEventListener("click", async () => {
    const selected = img.getAttribute("data-avatar");
    currentAvatar = selected;
    editModalAvatar.src = selected;
    myMiniAvatar.src = selected;
    avatarSelectorOverlay.classList.add("hidden");

    if (currentUsername) {
      userAvatarCache[currentUsername] = currentAvatar;
      await setDoc(doc(db, "users", currentUsername), {
        avatar: currentAvatar,
        bio: currentBio
      }, { merge: true });

      // Refresh message feed view so previous chats instantly reflect the new avatar
      triggerRerender();
    }
  });
});

// Bio Counter
bioInput.addEventListener("input", updateCharCount);
function updateCharCount() {
  const remaining = 150 - bioInput.value.length;
  bioCharCount.textContent = `${remaining} characters left`;
}

// Save Bio
saveBioBtn.addEventListener("click", async () => {
  if (!currentUsername) return;
  currentBio = bioInput.value.trim();
  try {
    await setDoc(doc(db, "users", currentUsername), {
      avatar: currentAvatar,
      bio: currentBio
    }, { merge: true });
    profileOverlay.classList.add("hidden");
  } catch (err) {
    console.error("Error saving bio:", err);
  }
});

// View other profile modal
closeViewProfile.addEventListener("click", () => viewProfileOverlay.classList.add("hidden"));

async function openUserProfileModal(username) {
  try {
    const userSnap = await getDoc(doc(db, "users", username));
    if (userSnap.exists()) {
      const data = userSnap.data();
      viewUserAvatar.src = data.avatar || "avatar1.png";
      viewUserName.textContent = username;
      viewUserBio.textContent = data.bio ? data.bio : "No bio available.";
    } else {
      viewUserAvatar.src = "avatar1.png";
      viewUserName.textContent = username;
      viewUserBio.textContent = "No bio available.";
    }
    viewProfileOverlay.classList.remove("hidden");
  } catch (err) {
    console.error("Error fetching user profile:", err);
  }
}

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
    
    // Assign a random default avatar upon registration
    const assignedAvatar = getRandomAvatar();
    await setDoc(doc(db, "users", username), {
      avatar: assignedAvatar,
      bio: ""
    });

    authOverlay.classList.add("hidden");
  } catch (err) {
    if (err.code === "auth/email-already-in-use") authError.textContent = "Username is already taken.";
    else authError.textContent = "Registration error: " + err.message;
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

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUsername = user.email.split("@")[0];
    currentUserText.textContent = currentUsername;
    myMiniUsername.textContent = currentUsername;
    authModalBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    topLeftProfile.classList.remove("hidden");

    try {
      const userSnap = await getDoc(doc(db, "users", currentUsername));
      if (userSnap.exists()) {
        const data = userSnap.data();
        currentAvatar = data.avatar || getRandomAvatar();
        currentBio = data.bio || "";
      } else {
        currentAvatar = getRandomAvatar();
        currentBio = "";
        await setDoc(doc(db, "users", currentUsername), { avatar: currentAvatar, bio: currentBio });
      }
      userAvatarCache[currentUsername] = currentAvatar;
      myMiniAvatar.src = currentAvatar;
    } catch (err) {
      console.error("Error loading profile:", err);
    }

    messageInput.disabled = false;
    messageInput.placeholder = "Message...";
    sendBtn.disabled = false;
    emojiBtn.disabled = false;
  } else {
    currentUsername = "";
    currentAvatar = "avatar1.png";
    currentBio = "";
    currentUserText.textContent = "Guest";
    authModalBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    topLeftProfile.classList.add("hidden");
    messageInput.disabled = true;
    messageInput.placeholder = "Sign in to start typing...";
    sendBtn.disabled = true;
    emojiBtn.disabled = true;
  }
});

// Emoji Button Shortcut
emojiBtn.addEventListener("click", () => {
  messageInput.focus();
  if (navigator.platform.indexOf('Mac') > -1) {
    alert("Tip: Press Cmd + Control + Space to open your Mac emoji keyboard!");
  } else {
    alert("Tip: Press Windows Key + . (period) to open your Windows emoji keyboard!");
  }
});

let typingTimeout = null;
messageInput.addEventListener("input", async () => {
  if (!currentUsername) return;
  const userRef = doc(db, "typing", currentUsername);
  await setDoc(userRef, { isTyping: true });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(async () => {
    await deleteDoc(userRef);
  }, 2000);
});

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

let lastSnapshot = null;
function renderMessages(snapshot) {
  lastSnapshot = snapshot;
  if (snapshot.empty) {
    messagesContainer.innerHTML = `<div class="empty-state">No messages yet. Be the first to say hello!</div>`;
    return;
  }
  
  messagesContainer.innerHTML = "";
  snapshot.forEach(async (docSnap) => {
    const msg = docSnap.data();
    const timeString = formatTime(msg.timestamp);
    const isMe = msg.username === currentUsername;
    const alignClass = isMe ? "sent" : "received";
    
    // Resolve user avatar dynamically from cache or fetch from Firestore so previous chats update instantly
    let userAvatar = userAvatarCache[msg.username];
    if (!userAvatar) {
      try {
        const uSnap = await getDoc(doc(db, "users", msg.username));
        if (uSnap.exists() && uSnap.data().avatar) {
          userAvatar = uSnap.data().avatar;
        } else {
          userAvatar = "avatar1.png";
        }
        userAvatarCache[msg.username] = userAvatar;
      } catch (e) {
        userAvatar = "avatar1.png";
      }
    }
    
    const msgEl = document.createElement("div");
    msgEl.className = `msg ${alignClass}`;
    msgEl.innerHTML = `
      <img src="${userAvatar}" class="msg-avatar-img profile-circle" alt="avatar" data-username="${msg.username}" />
      <div class="msg-content">
        <div class="msg-header">
          <span class="msg-author" data-username="${msg.username}">${msg.username || "anonymous"}</span>
          <span class="msg-time">${timeString}</span>
        </div>
        <div class="msg-bubble">${msg.text}</div>
      </div>
    `;

    msgEl.querySelectorAll("[data-username]").forEach(el => {
      el.addEventListener("click", () => {
        openUserProfileModal(el.getAttribute("data-username"));
      });
    });

    messagesContainer.appendChild(msgEl);
  });
  
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function triggerRerender() {
  if (lastSnapshot) {
    renderMessages(lastSnapshot);
  }
}

const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
onSnapshot(q, (snapshot) => {
  renderMessages(snapshot);
});

const typingQ = query(collection(db, "typing"));
onSnapshot(typingQ, (snapshot) => {
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