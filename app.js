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

// Initialize Firebase App and Services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ==========================================================================
   PROFANITY FILTER & SECURITY UTILITIES
   ========================================================================== */
const forbiddenWords = [
  "nigger", "nigga", "negro", "faggot", "fag", "retard", "tranny", "kike", "spic", "chink", 
  "wetback", "coon", "dyke", "whore", "slut", "cunt", "bastard", "motherfucker", "pussy", "dick"
];

function containsProfanity(username) {
  const cleanedUsername = username.toLowerCase().replace(/[^a-z]/g, "");
  return forbiddenWords.some(word => cleanedUsername.includes(word));
}

// Helpers for Auth and Email Mapping
const makeSecurePass = (pass) => `sc_${pass}_pad123`;
const makeEmail = (username) => `${username.toLowerCase().trim()}@simplechat.com`;

const getRandomAvatar = () => {
  const avatars = [
    "avatar1.png", 
    "avatar2.png", 
    "avatar3.png", 
    "avatar4.png", 
    "avatar5.png"
  ];
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

/* ==========================================================================
   DOM ELEMENT SELECTION
   ========================================================================== */

// Auth Elements
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

// Global Chat Input Elements
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const messagesContainer = document.getElementById("messages-container");

// Emoji Elements
const emojiBtn = document.getElementById("emoji-btn");
const emojiPicker = document.getElementById("discord-emoji-picker");
const emojiGrid = document.getElementById("discord-emoji-grid");

// Typing Indicator Elements
const typingIndicator = document.getElementById("typing-indicator");
const typingText = document.getElementById("typing-text");

// Top Profile Bar Elements
const topLeftProfile = document.getElementById("top-left-profile");
const myMiniAvatar = document.getElementById("my-mini-avatar");
const myMiniUsername = document.getElementById("my-mini-username");

// Edit Profile Modal Elements
const profileOverlay = document.getElementById("profile-overlay");
const closeProfileModal = document.getElementById("close-profile-modal");
const editModalAvatar = document.getElementById("edit-modal-avatar");
const profileDisplayUsername = document.getElementById("profile-display-username");
const bioInput = document.getElementById("bio-input");
const bioCharCount = document.getElementById("bio-char-count");
const saveBioBtn = document.getElementById("save-bio-btn");

// Avatar Selector Overlay Elements
const avatarSelectorOverlay = document.getElementById("avatar-selector-overlay");
const closeAvatarSelector = document.getElementById("close-avatar-selector");
const openAvatarSelector = document.getElementById("open-avatar-selector");
const presetAvatars = document.querySelectorAll(".preset-avatar");

// View User Profile Modal Elements
const viewProfileOverlay = document.getElementById("view-profile-overlay");
const closeViewProfile = document.getElementById("close-view-profile");
const viewUserAvatar = document.getElementById("view-user-avatar");
const viewUserName = document.getElementById("view-user-name");
const viewUserBio = document.getElementById("view-user-bio");
const addFriendBtn = document.getElementById("add-friend-btn");

// Account Ban Modal Elements
const banOverlay = document.getElementById("ban-overlay");
const dismissBanBtn = document.getElementById("dismiss-ban-btn");

// Friends Modal Elements
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

// Direct Messages Modal Elements
const dmOverlay = document.getElementById("dm-overlay");
const closeDmModal = document.getElementById("close-dm-modal");
const dmTargetUsernameHeader = document.getElementById("dm-target-username");
const dmMessagesContainer = document.getElementById("dm-messages-container");
const dmForm = document.getElementById("dm-form");
const dmInput = document.getElementById("dm-input");

/* ==========================================================================
   GLOBAL APP STATE
   ========================================================================== */
let currentUsername = "";
let currentAvatar = "avatar1.png";
let currentBio = "";
let selectedViewUser = "";
let activeDmTarget = "";
let unsubscribeDmListener = null;

const userAvatarCache = {};

/* ==========================================================================
   EMOJI & MEDIA PICKER CONTROLLER
   ========================================================================== */
const videoEmojis = ["myvideo.mp4"];
const avatarEmojis = [
  "avatar1.png", 
  "avatar2.png", 
  "avatar3.png", 
  "avatar4.png", 
  "avatar5.png"
];
const popularEmojis = [
  "😂", "😭", "🤣", "👀", "😍", "🙄", "👍", "🤔", "🔥", "💀", 
  "🙏", "👌", "❤️", "😊", "😢", "💯", "✨", "🎉", "😎", "🥳"
];

function renderEmojis() {
  if (!emojiGrid) return;
  emojiGrid.innerHTML = "";

  // Render Video Emojis (Small inside picker)
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

  // Render PNG Avatar Emojis
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

  // Render Unicode Emojis
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
  
  // Replace custom tags with inline elements
  formatted = formatted.replace(
    /\[avatar:(.*?)\]/g, 
    '<img src="$1" class="inline-chat-avatar-emoji" alt="avatar-emoji" />'
  );
  
  formatted = formatted.replace(
    /\[video:(.*?)\]/g, 
    '<video src="$1" class="inline-chat-video-emoji" autoplay loop muted playsinline></video>'
  );
  
  return formatted;
}

/* ==========================================================================
   UI MODALS & TAB NAVIGATION
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

authModalBtn?.addEventListener("click", () => authOverlay?.classList.remove("hidden"));
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
      await setDoc(doc(db, "users", currentUsername), { 
        avatar: currentAvatar, 
        bio: currentBio 
      }, { merge: true });
      
      triggerRerender();
    }
  });
});

bioInput?.addEventListener("input", updateCharCount);

function updateCharCount() {
  if (!bioInput || !bioCharCount) return;
  const remaining = 150 - bioInput.value.length;
  bioCharCount.textContent = `${remaining} characters left`;
}

saveBioBtn?.addEventListener("click", async () => {
  if (!currentUsername) return;
  currentBio = bioInput ? bioInput.value.trim() : "";
  
  try {
    await setDoc(doc(db, "users", currentUsername), { 
      avatar: currentAvatar, 
      bio: currentBio 
    }, { merge: true });
    
    profileOverlay?.classList.add("hidden");
  } catch (err) {
    console.error("Error saving bio:", err);
  }
});

closeViewProfile?.addEventListener("click", () => viewProfileOverlay?.classList.add("hidden"));

/* ==========================================================================
   PROFILE VIEW & BIO FRIEND REQUEST SYSTEM
   ========================================================================== */
async function openUserProfileModal(username) {
  selectedViewUser = username;
  
  try {
    const userSnap = await getDoc(doc(db, "users", username));
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      if (viewUserAvatar) viewUserAvatar.src = data.avatar || "avatar1.png";
      if (viewUserName) viewUserName.textContent = username;
      if (viewUserBio) viewUserBio.textContent = data.bio ? data.bio : "No bio available.";
    } else {
      if (viewUserAvatar) viewUserAvatar.src = "avatar1.png";
      if (viewUserName) viewUserName.textContent = username;
      if (viewUserBio) viewUserBio.textContent = "No bio available.";
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
    console.error("Error fetching profile:", err);
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

/* ==========================================================================
   FRIENDS LIST & DIRECT MESSAGES (DM) LOGIC
   ========================================================================== */
openFriendsBtn?.addEventListener("click", () => {
  if (!currentUsername) return alert("Please sign in first.");
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
    if (friendReqStatus) friendReqStatus.textContent = "Invalid username.";
    return;
  }

  const userSnap = await getDoc(doc(db, "users", targetName));
  if (!userSnap.exists()) {
    if (friendReqStatus) friendReqStatus.textContent = "User does not exist.";
    return;
  }

  const reqId = [currentUsername, targetName].sort().join("_");
  await setDoc(doc(db, "friends", reqId), {
    users: [currentUsername, targetName],
    sender: currentUsername,
    status: "pending",
    timestamp: serverTimestamp()
  });

  if (friendReqStatus) friendReqStatus.textContent = "Request sent!";
  if (friendUsernameInput) friendUsernameInput.value = "";
});

function loadFriendsData() {
  if (!currentUsername) return;

  const qFriends = query(
    collection(db, "friends"), 
    where("users", "array-contains", currentUsername)
  );

  onSnapshot(qFriends, async (snapshot) => {
    if (friendsContainer) friendsContainer.innerHTML = "";
    if (incomingRequestsContainer) incomingRequestsContainer.innerHTML = "";

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const otherUser = data.users.find(u => u !== currentUsername);

      if (data.status === "accepted") {
        const item = document.createElement("div");
        item.className = "friend-item";
        item.innerHTML = `
          <div class="friend-user-info">
            <strong>${otherUser}</strong>
          </div>
          <button class="btn btn-primary dm-btn" data-username="${otherUser}">Message</button>
        `;
        
        item.querySelector(".dm-btn").addEventListener("click", () => openDmChat(otherUser));
        friendsContainer?.appendChild(item);

      } else if (data.status === "pending" && data.sender !== currentUsername) {
        const item = document.createElement("div");
        item.className = "friend-item";
        item.innerHTML = `
          <div><strong>${otherUser}</strong> wants to be friends</div>
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

function openDmChat(targetUsername) {
  activeDmTarget = targetUsername;
  
  if (dmTargetUsernameHeader) {
    dmTargetUsernameHeader.textContent = `DM with ${targetUsername}`;
  }
  
  friendsOverlay?.classList.add("hidden");
  dmOverlay?.classList.remove("hidden");

  const chatId = [currentUsername, targetUsername].sort().join("_");
  const dmQuery = query(
    collection(db, "direct_messages", chatId, "messages"), 
    orderBy("timestamp", "asc")
  );

  if (unsubscribeDmListener) unsubscribeDmListener();

  unsubscribeDmListener = onSnapshot(dmQuery, (snapshot) => {
    if (!dmMessagesContainer) return;
    dmMessagesContainer.innerHTML = "";

    snapshot.forEach(docSnap => {
      const msg = docSnap.data();
      const isMe = msg.sender === currentUsername;

      const msgEl = document.createElement("div");
      msgEl.className = `msg ${isMe ? "sent" : "received"}`;
      msgEl.innerHTML = `
        <div class="msg-content">
          <div class="msg-bubble">${parseMessageText(msg.text)}</div>
        </div>
      `;
      dmMessagesContainer.appendChild(msgEl);
    });
    
    dmMessagesContainer.scrollTop = dmMessagesContainer.scrollHeight;
  });
}

dmForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = dmInput?.value.trim();
  if (!text || !activeDmTarget || !currentUsername) return;

  dmInput.value = "";
  const chatId = [currentUsername, activeDmTarget].sort().join("_");

  await addDoc(collection(db, "direct_messages", chatId, "messages"), {
    text: text,
    sender: currentUsername,
    receiver: activeDmTarget,
    timestamp: serverTimestamp()
  });
});

closeDmModal?.addEventListener("click", () => {
  dmOverlay?.classList.add("hidden");
  if (unsubscribeDmListener) unsubscribeDmListener();
});

/* ==========================================================================
   AUTHENTICATION & USER STATE CONTROLLER
   ========================================================================== */
registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("register-username").value.trim();
  const password = document.getElementById("register-password").value;

  if (username.length < 2) {
    authError.textContent = "Username must be at least 2 characters.";
    return;
  }

  if (containsProfanity(username)) {
    authError.textContent = "Username not allowed.";
    return;
  }

  try {
    authError.textContent = "Creating account...";
    await createUserWithEmailAndPassword(auth, makeEmail(username), makeSecurePass(password));
    
    const assignedAvatar = getRandomAvatar();
    await setDoc(doc(db, "users", username), { 
      avatar: assignedAvatar, 
      bio: "", 
      banned: false 
    });
    
    authOverlay?.classList.add("hidden");
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      authError.textContent = "Username is taken.";
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
    authError.textContent = "Signing in...";
    await signInWithEmailAndPassword(auth, makeEmail(username), makeSecurePass(password));
    authOverlay?.classList.add("hidden");
  } catch (err) {
    authError.textContent = "Invalid username or password.";
  }
});

logoutBtn?.addEventListener("click", () => signOut(auth));

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
        currentAvatar = data.avatar || getRandomAvatar();
        currentBio = data.bio || "";
      } else {
        currentAvatar = getRandomAvatar();
        currentBio = "";
        await setDoc(doc(db, "users", currentUsername), { 
          avatar: currentAvatar, 
          bio: currentBio, 
          banned: false 
        });
      }
      
      userAvatarCache[currentUsername] = currentAvatar;
      if (myMiniAvatar) myMiniAvatar.src = currentAvatar;
    } catch (err) {
      console.error("Profile load error:", err);
    }

    if (currentUserText) currentUserText.textContent = currentUsername;
    if (myMiniUsername) myMiniUsername.textContent = currentUsername;
    
    authModalBtn?.classList.add("hidden");
    logoutBtn?.classList.remove("hidden");
    topLeftProfile?.classList.remove("hidden");

    if (messageInput) {
      messageInput.disabled = false;
      messageInput.placeholder = "Message...";
    }
    if (sendBtn) sendBtn.disabled = false;
    if (emojiBtn) emojiBtn.disabled = false;
    
    triggerRerender();
  } else {
    currentUsername = "";
    currentAvatar = "avatar1.png";
    currentBio = "";
    
    if (currentUserText) currentUserText.textContent = "Guest";
    authModalBtn?.classList.remove("hidden");
    logoutBtn?.classList.add("hidden");
    topLeftProfile?.classList.add("hidden");

    if (messageInput) {
      messageInput.disabled = true;
      messageInput.placeholder = "Sign in to chat...";
    }
    if (sendBtn) sendBtn.disabled = true;
    if (emojiBtn) emojiBtn.disabled = true;
    
    triggerRerender();
  }
});

/* ==========================================================================
   TYPING INDICATOR CONTROLLER
   ========================================================================== */
let typingTimeout = null;

messageInput?.addEventListener("input", async () => {
  if (!currentUsername) return;
  
  const userRef = doc(db, "typing", currentUsername);
  await setDoc(userRef, { isTyping: true });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(async () => {
    await deleteDoc(userRef);
  }, 2000);
});

/* ==========================================================================
   PUBLIC GLOBAL CHAT & REALTIME RENDERING
   ========================================================================== */
messageForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !currentUsername) return;

  if (text.length > 650) {
    alert("Message too long!");
    return;
  }

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

async function renderMessages(snapshot) {
  lastSnapshot = snapshot;
  if (!messagesContainer) return;
  
  if (snapshot.empty) {
    messagesContainer.innerHTML = `<div class="empty-state">No messages yet. Say hi!</div>`;
    return;
  }
  
  const docsArray = [];
  snapshot.forEach(docSnap => docsArray.push(docSnap));
  
  docsArray.sort((a, b) => {
    const tA = a.data().timestamp?.toMillis() || 0;
    const tB = b.data().timestamp?.toMillis() || 0;
    return tA - tB;
  });

  const fragment = document.createDocumentFragment();

  for (const docSnap of docsArray) {
    const msg = docSnap.data();
    const timeString = formatTime(msg.timestamp);
    const isMe = currentUsername && msg.username === currentUsername;
    
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
    msgEl.className = `msg ${isMe ? "sent" : "received"}`;
    msgEl.innerHTML = `
      <img 
        src="${userAvatar}" 
        class="msg-avatar-img" 
        alt="avatar" 
        data-username="${msg.username}" 
      />
      <div class="msg-content">
        <div class="msg-header">
          <span class="msg-author" data-username="${msg.username}">${msg.username || "anonymous"}</span>
          <span class="msg-time">${timeString}</span>
        </div>
        <div class="msg-bubble">${parseMessageText(msg.text)}</div>
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

function triggerRerender() {
  if (lastSnapshot) renderMessages(lastSnapshot);
}

// Global Chat Snapshot Listener
const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
onSnapshot(q, (snapshot) => renderMessages(snapshot));

// Typing Indicator Snapshot Listener
const typingQ = query(collection(db, "typing"));
onSnapshot(typingQ, (snapshot) => {
  const typingUsers = [];
  snapshot.forEach(docSnap => {
    if (docSnap.id !== currentUsername && docSnap.data().isTyping) {
      typingUsers.push(docSnap.id);
    }
  });

  if (typingIndicator && typingText) {
    if (typingUsers.length > 0) {
      typingIndicator.classList.remove("hidden");
      typingText.textContent = typingUsers.length === 1 
        ? `${typingUsers[0]} is typing...` 
        : "Multiple people are typing...";
      if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } else {
      typingIndicator.classList.add("hidden");
    }
  }
});