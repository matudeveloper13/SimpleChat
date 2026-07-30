/* ==========================================================================
   FIREBASE IMPORTS & MODULE INITIALIZATION
   ========================================================================== */
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
  deleteDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* ==========================================================================
   FIREBASE CONFIGURATION
   ========================================================================== */
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

/* ==========================================================================
   DOM ELEMENT REFERENCES & CACHE MAPS
   ========================================================================== */
// Header Controls & Media Elements
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const musicToggleBtn = document.getElementById("music-toggle-btn");
const searchToggleBtn = document.getElementById("search-toggle-btn");
const searchBarContainer = document.getElementById("search-bar-container");
const messageSearchInput = document.getElementById("message-search-input");
const closeSearchBtn = document.getElementById("close-search-btn");
const bgMusic = document.getElementById("bg-music");
const canvas = document.getElementById("bg-canvas");
const ctx = canvas.getContext("2d");

// Navigation & Authentication Modals
const authModalBtn = document.getElementById("auth-modal-btn");
const authOverlay = document.getElementById("auth-overlay");
const closeModalBtn = document.getElementById("close-modal-btn");
const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const authError = document.getElementById("auth-error");

// User Panel & Profile Management Modals
const topLeftProfile = document.getElementById("top-left-profile");
const myMiniAvatar = document.getElementById("my-mini-avatar");
const currentUserText = document.getElementById("current-user-text");
const profileOverlay = document.getElementById("profile-overlay");
const closeProfileModal = document.getElementById("close-profile-modal");
const editModalAvatar = document.getElementById("edit-modal-avatar");
const profileDisplayUsername = document.getElementById("profile-display-username");
const bioInput = document.getElementById("bio-input");
const bioCharCount = document.getElementById("bio-char-count");
const saveBioBtn = document.getElementById("save-bio-btn");

// Preset Avatar Selection Modal
const avatarSelectorOverlay = document.getElementById("avatar-selector-overlay");
const closeAvatarSelector = document.getElementById("close-avatar-selector");
const openAvatarSelector = document.getElementById("open-avatar-selector");
const presetAvatars = document.querySelectorAll(".preset-avatar");

// View User Profile Inspection Modal
const viewProfileOverlay = document.getElementById("view-profile-overlay");
const closeViewProfile = document.getElementById("close-view-profile");
const viewUserAvatar = document.getElementById("view-user-avatar");
const viewUserName = document.getElementById("view-user-name");
const viewUserBio = document.getElementById("view-user-bio");
const addFriendBtn = document.getElementById("add-friend-btn");

// Friends Management Modal & Navigation Nodes
const openFriendsBtn = document.getElementById("open-friends-btn");
const friendsOverlay = document.getElementById("friends-overlay");
const closeFriendsModal = document.getElementById("close-friends-modal");
const tabFriendsList = document.getElementById("tab-friends-list");
const tabAddFriend = document.getElementById("tab-add-friend");
const tabRequests = document.getElementById("tab-requests");
const sectionFriendsList = document.getElementById("section-friends-list");
const sectionAddFriend = document.getElementById("section-add-friend");
const sectionRequests = document.getElementById("section-requests");
const friendsContainer = document.getElementById("friends-container");
const incomingRequestsContainer = document.getElementById("incoming-requests-container");
const friendUsernameInput = document.getElementById("friend-username-input");
const sendFriendReqBtn = document.getElementById("send-friend-req-btn");
const friendReqStatus = document.getElementById("friend-req-status");

// Account Ban Notice Modal
const banOverlay = document.getElementById("ban-overlay");
const dismissBanBtn = document.getElementById("dismiss-ban-btn");

// Chat, Emoji, and Form Elements
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const messagesContainer = document.getElementById("messages-container");
const activeChatName = document.getElementById("active-chat-name");
const dmFriendsList = document.getElementById("dm-friends-list");
const discordHomeBtn = document.querySelector(".discord-home-btn");
const emojiBtn = document.getElementById("emoji-btn");
const emojiPicker = document.getElementById("discord-emoji-picker");
const emojiGrid = document.getElementById("discord-emoji-grid");
const typingIndicator = document.getElementById("typing-indicator");
const typingText = document.getElementById("typing-text");
const attachmentBtn = document.getElementById("attachment-btn");
const giftBtn = document.getElementById("gift-btn");
const gifBtn = document.getElementById("gif-btn");

/* ==========================================================================
   GLOBAL APP STATE REPOSITORIES
   ========================================================================== */
let currentUsername = "";
let currentAvatar = "avatar1.png";
let currentBio = "";
let activeChatTarget = "global"; // "global" or direct message username target
let unsubscribeChatListener = null;
let selectedViewUser = "";
let isMusicPlaying = false;
let typingTimeout = null;
let rawCachedMessages = [];
const userAvatarCache = {};

/* ==========================================================================
   THEME MANAGER (LIGHT / DARK MODE ENGINE)
   ========================================================================== */
function initTheme() {
  const savedTheme = localStorage.getItem("discord-clone-theme");
  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
    if (themeToggleBtn) themeToggleBtn.textContent = "☀️";
  } else {
    document.body.classList.remove("light-mode");
    if (themeToggleBtn) themeToggleBtn.textContent = "🌙";
  }
}

themeToggleBtn?.addEventListener("click", () => {
  const isLight = document.body.classList.toggle("light-mode");
  if (isLight) {
    localStorage.setItem("discord-clone-theme", "light");
    themeToggleBtn.textContent = "☀️";
  } else {
    localStorage.setItem("discord-clone-theme", "dark");
    themeToggleBtn.textContent = "🌙";
  }
});

initTheme();

/* ==========================================================================
   AUDIO MANAGER (AMBIENT BACKGROUND MUSIC SYSTEM)
   ========================================================================== */
musicToggleBtn?.addEventListener("click", () => {
  if (!bgMusic) return;

  if (isMusicPlaying) {
    bgMusic.pause();
    isMusicPlaying = false;
    musicToggleBtn.textContent = "🔇";
  } else {
    bgMusic.play().catch(e => console.warn("Audio autoplay blocked by browser policy restrictions:", e));
    isMusicPlaying = true;
    musicToggleBtn.textContent = "🔊";
  }
});

/* ==========================================================================
   CANVAS PARTICLE ENGINE (FALLING DOTS ANIMATION)
   ========================================================================== */
let particlesArray = [];

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

class Particle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height - canvas.height;
    this.size = Math.random() * 2.5 + 1;
    this.speedY = Math.random() * 1.2 + 0.4;
    this.speedX = (Math.random() - 0.5) * 0.4;
    this.opacity = Math.random() * 0.5 + 0.2;
  }

  update() {
    this.y += this.speedY;
    this.x += this.speedX;

    if (this.y > canvas.height) {
      this.y = 0 - this.size;
      this.x = Math.random() * canvas.width;
    }
  }

  draw() {
    if (!ctx) return;
    const isLightMode = document.body.classList.contains("light-mode");
    const color = isLightMode ? `rgba(0, 0, 0, ${this.opacity})` : `rgba(255, 255, 255, ${this.opacity})`;
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function initParticles() {
  particlesArray = [];
  if (!canvas) return;
  const numberOfParticles = Math.floor((canvas.width * canvas.height) / 10000);
  for (let i = 0; i < numberOfParticles; i++) {
    particlesArray.push(new Particle());
  }
}

function animateParticles() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < particlesArray.length; i++) {
    particlesArray[i].update();
    particlesArray[i].draw();
  }
  requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();

/* ==========================================================================
   SECURITY, SANITIZATION & PROFANITY FILTER SUITE
   ========================================================================== */
const forbiddenWords = [
  "nigger", "nigga", "negro", "faggot", "fag", "retard", "tranny", "kike", "spic", "chink", 
  "wetback", "coon", "dyke", "whore", "slut", "cunt", "bastard", "motherfucker", "pussy", "dick"
];

function containsProfanity(text) {
  const cleaned = text.toLowerCase().replace(/[^a-z]/g, "");
  return forbiddenWords.some(word => cleaned.includes(word));
}

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

/* ==========================================================================
   EMOJI, MEDIA & NITRO ASSET PICKER RENDERING
   ========================================================================== */
const videoEmojis = ["myvideo.mp4"];
const avatarEmojis = ["avatar1.png", "avatar2.png", "avatar3.png", "avatar4.png", "avatar5.png"];
const popularEmojis = ["😂", "😭", "🤣", "👀", "😍", "🙄", "👍", "🤔", "🔥", "💀", "🙏", "👌", "❤️", "😊", "😢", "💯", "✨", "🎉", "😎", "🥳"];

function renderEmojis() {
  if (!emojiGrid) return;
  emojiGrid.innerHTML = "";

  videoEmojis.forEach(videoFile => {
    const videoEl = document.createElement("video");
    videoEl.src = videoFile;
    videoEl.className = "discord-avatar-emoji-item"; 
    videoEl.autoplay = true; 
    videoEl.loop = true; 
    videoEl.muted = true; 
    videoEl.playsInline = true;
    
    videoEl.addEventListener("click", () => {
      messageInput.value += ` [video:${videoFile}] `;
      messageInput.focus();
    });
    emojiGrid.appendChild(videoEl);
  });

  avatarEmojis.forEach(avatar => {
    const img = document.createElement("img");
    img.src = avatar;
    img.className = "discord-avatar-emoji-item";
    img.addEventListener("click", () => {
      messageInput.value += ` [avatar:${avatar}] `;
      messageInput.focus();
    });
    emojiGrid.appendChild(img);
  });

  popularEmojis.forEach(emoji => {
    const span = document.createElement("span");
    span.className = "discord-emoji-item";
    span.textContent = emoji;
    span.addEventListener("click", () => {
      messageInput.value += emoji;
      messageInput.focus();
    });
    emojiGrid.appendChild(span);
  });
}

renderEmojis();

emojiBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  emojiPicker?.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
  if (emojiPicker && !emojiPicker.contains(e.target) && e.target !== emojiBtn) {
    emojiPicker.classList.add("hidden");
  }
});

function parseMessageText(text) {
  if (!text) return "";
  let formatted = text;
  formatted = formatted.replace(/\[avatar:(.*?)\]/g, '<img src="$1" class="inline-chat-avatar-emoji" alt="avatar-emoji" />');
  formatted = formatted.replace(/\[video:(.*?)\]/g, '<video src="$1" class="inline-chat-video-emoji" autoplay loop muted playsinline></video>');
  return formatted;
}

/* ==========================================================================
   MODAL DIALOG & TAB SWITCHING ARCHITECTURE
   ========================================================================== */
const switchTab = (activeTab, inactiveTab, activeForm, inactiveForm) => {
  activeTab.classList.add("active");
  inactiveTab.classList.remove("active");
  activeForm.classList.remove("hidden");
  inactiveForm.classList.add("hidden");
  if (authError) authError.textContent = "";
};

tabRegister?.addEventListener("click", () => switchTab(tabRegister, tabLogin, registerForm, loginForm));
tabLogin?.addEventListener("click", () => switchTab(tabLogin, tabRegister, loginForm, registerForm));

authModalBtn?.addEventListener("click", () => {
  if (!currentUsername) {
    authOverlay?.classList.remove("hidden");
  } else {
    signOut(auth);
  }
});

closeModalBtn?.addEventListener("click", () => authOverlay?.classList.add("hidden"));

topLeftProfile?.addEventListener("click", () => {
  if (!currentUsername) return;
  if (editModalAvatar) editModalAvatar.src = currentAvatar;
  if (profileDisplayUsername) profileDisplayUsername.textContent = currentUsername;
  if (bioInput) {
    bioInput.value = currentBio;
    updateCharCount();
  }
  profileOverlay?.classList.remove("hidden");
});

closeProfileModal?.addEventListener("click", () => profileOverlay?.classList.add("hidden"));
openAvatarSelector?.addEventListener("click", () => avatarSelectorOverlay?.classList.remove("hidden"));
closeAvatarSelector?.addEventListener("click", () => avatarSelectorOverlay?.classList.add("hidden"));

presetAvatars.forEach(img => {
  img.addEventListener("click", async () => {
    const selected = img.getAttribute("data-avatar");
    currentAvatar = selected;
    if (editModalAvatar) editModalAvatar.src = selected;
    if (myMiniAvatar) myMiniAvatar.src = selected;
    avatarSelectorOverlay?.classList.add("hidden");

    if (currentUsername) {
      userAvatarCache[currentUsername] = currentAvatar;
      await setDoc(doc(db, "users", currentUsername), { avatar: currentAvatar, bio: currentBio }, { merge: true });
    }
  });
});

bioInput?.addEventListener("input", updateCharCount);
function updateCharCount() {
  if (!bioInput || !bioCharCount) return;
  const remaining = 150 - bioInput.value.length;
  bioCharCount.textContent = `${remaining} characters remaining`;
}

saveBioBtn?.addEventListener("click", async () => {
  if (!currentUsername) return;
  currentBio = bioInput ? bioInput.value.trim() : "";
  try {
    await setDoc(doc(db, "users", currentUsername), { avatar: currentAvatar, bio: currentBio }, { merge: true });
    profileOverlay?.classList.add("hidden");
  } catch (err) {
    console.error("Error saving profile bio changes:", err);
  }
});

closeViewProfile?.addEventListener("click", () => viewProfileOverlay?.classList.add("hidden"));

/* ==========================================================================
   FRIENDS NETWORK & PROFILE INSPECTION SYSTEM
   ========================================================================== */
openFriendsBtn?.addEventListener("click", () => {
  if (!currentUsername) return alert("Please sign in first to access friends.");
  friendsOverlay?.classList.remove("hidden");
  loadFriendsData();
});

closeFriendsModal?.addEventListener("click", () => friendsOverlay?.classList.add("hidden"));

tabFriendsList?.addEventListener("click", () => {
  tabFriendsList.classList.add("active");
  tabAddFriend.classList.remove("active");
  tabRequests.classList.remove("active");
  sectionFriendsList.classList.remove("hidden");
  sectionAddFriend.classList.add("hidden");
  sectionRequests.classList.add("hidden");
});

tabAddFriend?.addEventListener("click", () => {
  tabAddFriend.classList.add("active");
  tabFriendsList.classList.remove("active");
  tabRequests.classList.remove("active");
  sectionAddFriend.classList.remove("hidden");
  sectionFriendsList.classList.add("hidden");
  sectionRequests.classList.add("hidden");
});

tabRequests?.addEventListener("click", () => {
  tabRequests.classList.add("active");
  tabFriendsList.classList.remove("active");
  tabAddFriend.classList.remove("active");
  sectionRequests.classList.remove("hidden");
  sectionFriendsList.classList.add("hidden");
  sectionAddFriend.classList.add("hidden");
});

sendFriendReqBtn?.addEventListener("click", async () => {
  const targetName = friendUsernameInput?.value.trim();
  if (!targetName || targetName === currentUsername) {
    if (friendReqStatus) friendReqStatus.textContent = "Please provide a valid, distinct username.";
    return;
  }

  const userSnap = await getDoc(doc(db, "users", targetName));
  if (!userSnap.exists()) {
    if (friendReqStatus) friendReqStatus.textContent = "Specified user does not exist on the platform.";
    return;
  }

  const reqId = [currentUsername, targetName].sort().join("_");
  await setDoc(doc(db, "friends", reqId), {
    users: [currentUsername, targetName],
    sender: currentUsername,
    status: "pending",
    timestamp: serverTimestamp()
  });

  if (friendReqStatus) friendReqStatus.textContent = "Friend request dispatched successfully!";
  if (friendUsernameInput) friendUsernameInput.value = "";
});

async function openUserProfileModal(username) {
  selectedViewUser = username;
  try {
    const userSnap = await getDoc(doc(db, "users", username));
    if (userSnap.exists()) {
      const data = userSnap.data();
      if (viewUserAvatar) viewUserAvatar.src = data.avatar || "avatar1.png";
      if (viewUserName) viewUserName.textContent = username;
      if (viewUserBio) viewUserBio.textContent = data.bio ? data.bio : "This user has not specified a bio.";
    } else {
      if (viewUserAvatar) viewUserAvatar.src = "avatar1.png";
      if (viewUserName) viewUserName.textContent = username;
      if (viewUserBio) viewUserBio.textContent = "This user has not specified a bio.";
    }

    if (addFriendBtn) {
      if (username === currentUsername) {
        addFriendBtn.classList.add("hidden");
      } else {
        addFriendBtn.classList.remove("hidden");
        await checkFriendStatus(username);
      }
    }
    viewProfileOverlay?.classList.remove("hidden");
  } catch (err) {
    console.error("Error loading user profile inspection data:", err);
  }
}

async function checkFriendStatus(targetUser) {
  if (!currentUsername || !addFriendBtn) return;
  const reqId = [currentUsername, targetUser].sort().join("_");
  const friendSnap = await getDoc(doc(db, "friends", reqId));

  if (friendSnap.exists()) {
    const data = friendSnap.data();
    if (data.status === "accepted") {
      addFriendBtn.textContent = "Friends";
      addFriendBtn.disabled = true;
    } else if (data.status === "pending") {
      if (data.sender === currentUsername) {
        addFriendBtn.textContent = "Request Sent";
        addFriendBtn.disabled = true;
      } else {
        addFriendBtn.textContent = "Accept Friend Request";
        addFriendBtn.disabled = false;
      }
    }
  } else {
    addFriendBtn.textContent = "Add Friend";
    addFriendBtn.disabled = false;
  }
}

addFriendBtn?.addEventListener("click", async () => {
  if (!currentUsername || !selectedViewUser) return;
  const reqId = [currentUsername, selectedViewUser].sort().join("_");
  const friendSnap = await getDoc(doc(db, "friends", reqId));

  if (friendSnap.exists() && friendSnap.data().status === "pending" && friendSnap.data().sender !== currentUsername) {
    await setDoc(doc(db, "friends", reqId), { status: "accepted" }, { merge: true });
    addFriendBtn.textContent = "Friends";
    addFriendBtn.disabled = true;
  } else {
    await setDoc(doc(db, "friends", reqId), {
      users: [currentUsername, selectedViewUser],
      sender: currentUsername,
      status: "pending",
      timestamp: serverTimestamp()
    });
    addFriendBtn.textContent = "Request Sent";
    addFriendBtn.disabled = true;
  }
});

function loadFriendsData() {
  if (!currentUsername) return;
  const qFriends = query(collection(db, "friends"), where("users", "array-contains", currentUsername));

  onSnapshot(qFriends, (snapshot) => {
    if (friendsContainer) friendsContainer.innerHTML = "";
    if (incomingRequestsContainer) incomingRequestsContainer.innerHTML = "";

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const otherUser = data.users.find(u => u !== currentUsername);

      if (data.status === "accepted") {
        const item = document.createElement("div");
        item.className = "friend-item";
        item.innerHTML = `
          <div class="friend-user-info"><strong>@${otherUser}</strong></div>
          <button class="btn btn-primary dm-btn" data-username="${otherUser}">Message</button>
        `;
        item.querySelector(".dm-btn").addEventListener("click", () => {
          friendsOverlay?.classList.add("hidden");
          openDmChat(otherUser);
        });
        friendsContainer?.appendChild(item);
      } else if (data.status === "pending" && data.sender !== currentUsername) {
        const item = document.createElement("div");
        item.className = "friend-item";
        item.innerHTML = `
          <div><strong>@${otherUser}</strong> sent a request</div>
          <button class="btn btn-primary accept-btn" data-req="${docSnap.id}">Accept</button>
        `;
        item.querySelector(".accept-btn").addEventListener("click", async () => {
          await setDoc(doc(db, "friends", docSnap.id), { status: "accepted" }, { merge: true });
        });
        incomingRequestsContainer?.appendChild(item);
      }
    });

    if (friendsContainer && friendsContainer.children.length === 0) {
      friendsContainer.innerHTML = `<p style="color:var(--text-muted);">No friends added yet.</p>`;
    }
    if (incomingRequestsContainer && incomingRequestsContainer.children.length === 0) {
      incomingRequestsContainer.innerHTML = `<p style="color:var(--text-muted);">No pending requests.</p>`;
    }
  });
}

function loadSidebarFriends() {
  if (!currentUsername || !dmFriendsList) return;
  const qFriends = query(collection(db, "friends"), where("users", "array-contains", currentUsername));

  onSnapshot(qFriends, (snapshot) => {
    dmFriendsList.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.status === "accepted") {
        const otherUser = data.users.find(u => u !== currentUsername);
        const friendEl = document.createElement("div");
        friendEl.className = "sidebar-friend-item";
        friendEl.innerHTML = `<strong>@${otherUser}</strong>`;
        friendEl.addEventListener("click", () => openDmChat(otherUser));
        dmFriendsList.appendChild(friendEl);
      }
    });
    if (dmFriendsList.children.length === 0) {
      dmFriendsList.innerHTML = `<div style="padding: 8px; font-size: 12px; color: var(--text-muted);">No direct messages.</div>`;
    }
  });
}

/* ==========================================================================
   AUTHENTICATION STATE CONTROLLER & SUBSCRIPTION LISTENER
   ========================================================================== */
registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("register-username").value.trim();
  const password = document.getElementById("register-password").value;

  if (username.length < 2) {
    authError.textContent = "Username must be at least 2 characters long.";
    return;
  }
  if (containsProfanity(username)) {
    authError.textContent = "Username contains unauthorized words or policy violations.";
    return;
  }

  try {
    authError.textContent = "Registering user account...";
    await createUserWithEmailAndPassword(auth, makeEmail(username), makeSecurePass(password));
    await setDoc(doc(db, "users", username), { avatar: "avatar1.png", bio: "", banned: false });
    authOverlay?.classList.add("hidden");
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      authError.textContent = "Username is already claimed by another user.";
    } else {
      authError.textContent = err.message;
    }
  }
});

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    authError.textContent = "Authenticating session...";
    await signInWithEmailAndPassword(auth, makeEmail(username), makeSecurePass(password));
    authOverlay?.classList.add("hidden");
  } catch (err) {
    authError.textContent = "Invalid account username or password combination.";
  }
});

dismissBanBtn?.addEventListener("click", async () => {
  banOverlay?.classList.add("hidden");
  await signOut(auth);
  authOverlay?.classList.remove("hidden");
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUsername = user.email.split("@")[0];
    try {
      const userSnap = await getDoc(doc(db, "users", currentUsername));
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.banned === true) {
          banOverlay?.classList.remove("hidden");
          return;
        }
        currentAvatar = data.avatar || "avatar1.png";
        currentBio = data.bio || "";
      } else {
        currentAvatar = "avatar1.png";
        currentBio = "";
        await setDoc(doc(db, "users", currentUsername), { avatar: currentAvatar, bio: currentBio, banned: false });
      }
      userAvatarCache[currentUsername] = currentAvatar;
      if (myMiniAvatar) myMiniAvatar.src = currentAvatar;
    } catch (err) {
      console.error("Auth state profile fetch execution error:", err);
    }

    if (currentUserText) currentUserText.textContent = currentUsername;
    if (authModalBtn) authModalBtn.textContent = "Log Out";

    if (messageInput) {
      messageInput.disabled = false;
      messageInput.placeholder = "Message #global-chat...";
    }
    if (emojiBtn) emojiBtn.disabled = false;
    if (attachmentBtn) attachmentBtn.disabled = false;
    if (giftBtn) giftBtn.disabled = false;
    if (gifBtn) gifBtn.disabled = false;

    loadSidebarFriends();
    switchToGlobalChat();
  } else {
    currentUsername = "";
    currentAvatar = "avatar1.png";
    currentBio = "";

    if (currentUserText) currentUserText.textContent = "Guest User";
    if (myMiniAvatar) myMiniAvatar.src = "avatar1.png";
    if (authModalBtn) authModalBtn.textContent = "Sign In";

    if (messageInput) {
      messageInput.disabled = true;
      messageInput.placeholder = "Sign in to chat...";
    }
    if (emojiBtn) emojiBtn.disabled = true;
    if (attachmentBtn) attachmentBtn.disabled = true;
    if (giftBtn) giftBtn.disabled = true;
    if (gifBtn) gifBtn.disabled = true;
    if (dmFriendsList) dmFriendsList.innerHTML = "";

    switchToGlobalChat();
  }
});

/* ==========================================================================
   CHAT SYSTEM & DISCORD CHANNELS / DM ROUTING ENGINE
   ========================================================================== */
discordHomeBtn?.addEventListener("click", () => switchToGlobalChat());

function switchToGlobalChat() {
  activeChatTarget = "global";
  if (activeChatName) activeChatName.textContent = "Global Chat";
  if (messageInput && currentUsername) messageInput.placeholder = "Message #global-chat...";

  if (unsubscribeChatListener) unsubscribeChatListener();

  const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
  unsubscribeChatListener = onSnapshot(q, (snapshot) => {
    rawCachedMessages = [];
    snapshot.forEach(docSnap => rawCachedMessages.push(docSnap));
    renderMessages(rawCachedMessages);
  });
}

function openDmChat(targetUsername) {
  activeChatTarget = targetUsername;
  if (activeChatName) activeChatName.textContent = `@${targetUsername}`;
  if (messageInput && currentUsername) messageInput.placeholder = `Message @${targetUsername}...`;

  if (unsubscribeChatListener) unsubscribeChatListener();

  const chatId = [currentUsername, targetUsername].sort().join("_");
  const dmQuery = query(collection(db, "direct_messages", chatId, "messages"), orderBy("timestamp", "asc"));
  unsubscribeChatListener = onSnapshot(dmQuery, (snapshot) => {
    rawCachedMessages = [];
    snapshot.forEach(docSnap => rawCachedMessages.push(docSnap));
    renderMessages(rawCachedMessages);
  });
}

/* ==========================================================================
   SEARCH & FILTER CONTROLLER FOR MESSAGES
   ========================================================================== */
searchToggleBtn?.addEventListener("click", () => {
  searchBarContainer?.classList.toggle("hidden");
  if (!searchBarContainer?.classList.contains("hidden")) {
    messageSearchInput?.focus();
  } else {
    if (messageSearchInput) messageSearchInput.value = "";
    renderMessages(rawCachedMessages);
  }
});

closeSearchBtn?.addEventListener("click", () => {
  searchBarContainer?.classList.add("hidden");
  if (messageSearchInput) messageSearchInput.value = "";
  renderMessages(rawCachedMessages);
});

messageSearchInput?.addEventListener("input", (e) => {
  const queryText = e.target.value.toLowerCase().trim();
  if (!queryText) {
    renderMessages(rawCachedMessages);
    return;
  }

  const filtered = rawCachedMessages.filter(docSnap => {
    const data = docSnap.data();
    return (data.text && data.text.toLowerCase().includes(queryText)) ||
           (data.username && data.username.toLowerCase().includes(queryText));
  });
  renderMessages(filtered);
});

/* ==========================================================================
   TYPING INDICATOR REALTIME CONTROLLER
   ========================================================================== */
messageInput?.addEventListener("input", async () => {
  if (!currentUsername || activeChatTarget !== "global") return;
  const userRef = doc(db, "typing", currentUsername);
  await setDoc(userRef, { isTyping: true });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(async () => {
    await deleteDoc(userRef);
  }, 2000);
});

const typingQ = query(collection(db, "typing"));
onSnapshot(typingQ, (snapshot) => {
  const typingUsers = [];
  snapshot.forEach(docSnap => {
    if (docSnap.id !== currentUsername && docSnap.data().isTyping) {
      typingUsers.push(docSnap.id);
    }
  });

  if (typingIndicator && typingText && activeChatTarget === "global") {
    if (typingUsers.length > 0) {
      typingIndicator.classList.remove("hidden");
      typingText.textContent = typingUsers.length === 1 ? `${typingUsers[0]} is typing a message...` : "Multiple platform users are typing...";
      if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } else {
      typingIndicator.classList.add("hidden");
    }
  } else {
    typingIndicator?.classList.add("hidden");
  }
});

/* ==========================================================================
   MESSAGE SUBMISSION & REALTIME RENDERING PIPELINE
   ========================================================================== */
messageForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !currentUsername) return;

  if (text.length > 650) {
    alert("Message length exceeds maximum limit of 650 characters!");
    return;
  }

  messageInput.value = "";
  if (activeChatTarget === "global") {
    await deleteDoc(doc(db, "typing", currentUsername)).catch(() => {});
  }

  try {
    if (activeChatTarget === "global") {
      await addDoc(collection(db, "messages"), {
        text: text,
        username: currentUsername,
        timestamp: serverTimestamp()
      });
    } else {
      const chatId = [currentUsername, activeChatTarget].sort().join("_");
      await addDoc(collection(db, "direct_messages", chatId, "messages"), {
        text: text,
        username: currentUsername,
        timestamp: serverTimestamp()
      });
    }
  } catch (err) {
    console.error("Error submitting chat message dispatch:", err);
  }
});

async function renderMessages(docsArray) {
  if (!messagesContainer) return;

  if (!docsArray || docsArray.length === 0) {
    messagesContainer.innerHTML = `<div class="empty-state">No messages available here yet. Start the conversation!</div>`;
    return;
  }

  // Sort chronologically by timestamp
  docsArray.sort((a, b) => {
    const tA = a.data().timestamp?.toMillis() || 0;
    const tB = b.data().timestamp?.toMillis() || 0;
    return tA - tB;
  });

  const fragment = document.createDocumentFragment();

  for (const docSnap of docsArray) {
    const msg = docSnap.data();
    const timeString = formatTime(msg.timestamp);

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
    msgEl.className = "msg-row";
    msgEl.innerHTML = `
      <img src="${userAvatar}" class="msg-avatar-img" alt="User Avatar" data-username="${msg.username}" />
      <div class="msg-content-wrapper">
        <div class="msg-header-line">
          <span class="msg-author-name" data-username="${msg.username}">${msg.username || "anonymous"}</span>
          <span class="msg-timestamp">${timeString}</span>
        </div>
        <div class="msg-text-body">${parseMessageText(msg.text)}</div>
      </div>
    `;

    msgEl.querySelectorAll("[data-username]").forEach(el => {
      el.addEventListener("click", () => {
        openUserProfileModal(el.getAttribute("data-username"));
      });
    });

    fragment.appendChild(msgEl);
  }

  messagesContainer.innerHTML = "";
  messagesContainer.appendChild(fragment);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}