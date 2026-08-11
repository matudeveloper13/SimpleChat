// ============================================================================
// APP.JS - PART 1 OF 2
// Complete SimpleChat Application Logic & State Management
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    deleteUser 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    query, 
    orderBy, 
    onSnapshot, 
    serverTimestamp, 
    arrayUnion, 
    arrayRemove, 
    deleteDoc, 
    Timestamp, 
    getDocs, 
    where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ----------------------------------------------------------------------------
// 1. FIREBASE & THIRD-PARTY CONFIGURATION
// ----------------------------------------------------------------------------

const firebaseConfig = {
    apiKey: "AIzaSyAjrDMHeulPmO-HbZ43-TlD0-sgAcpXFcQ",
    authDomain: "simplechat-e1787.firebaseapp.com",
    projectId: "simplechat-e1787",
    storageBucket: "simplechat-e1787.firebasestorage.app",
    messagingSenderId: "469168057769",
    appId: "1:469168057769:web:d7f37ceae7b6d8227c28b8",
    measurementId: "G-KDWQTRWZSQ"
};

const IMGBB_API_KEY = "5fbe075f08f860f0714328246630fdfc";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ----------------------------------------------------------------------------
// 2. GLOBAL APPLICATION STATE & SETTINGS STORAGE
// ----------------------------------------------------------------------------

let currentUsername = "Guest";
let viewingProfileUsername = null;
let currentChatRoom = "global";
let unsubscribeMessages = null;
let unsubscribeUserProfiles = new Map();
let userAvatarsCache = {};
let renderedMessageIds = new Set();
let isInitialLoad = true;
let myBlockedUsersCache = [];
let globallyBannedUsersCache = new Set();
let selectedImageFile = null;
let replyingToMessage = null;
let presenceInterval = null;
let currentGroupData = null;

const userAppSettings = {
    fallingBgEnabled: localStorage.getItem("sc_bg_falling") !== "false",
    soundEnabled: localStorage.getItem("sc_sound") !== "false",
    compactMode: localStorage.getItem("sc_compact") === "true",
    fontSize: localStorage.getItem("sc_fontsize") || "14px",
    accentColor: localStorage.getItem("sc_accent") || "#2563eb"
};

// ----------------------------------------------------------------------------
// 3. UTILITY & HELPER FUNCTIONS
// ----------------------------------------------------------------------------

function makeEmail(username) {
    const cleanUser = username.toLowerCase().trim();
    return `${cleanUser}@simplechat.com`;
}

function makeSecurePass(password) {
    return `sc_${password}_pad123`;
}

function applyAppSettings() {
    document.documentElement.style.setProperty('--primary-color', userAppSettings.accentColor);
    const msgContainer = document.getElementById("messages-container");
    if (msgContainer) {
        msgContainer.style.fontSize = userAppSettings.fontSize;
    }
    if (userAppSettings.compactMode) {
        document.body.classList.add("compact-chat");
    } else {
        document.body.classList.remove("compact-chat");
    }
}
applyAppSettings();

function sanitizeMessageHTML(str) {
    if (!str) return "";
    const tempDiv = document.createElement("div");
    tempDiv.textContent = str;
    let safeText = tempDiv.innerHTML;

    return safeText.replace(/&lt;img\s+src="([^"]+)"\s+class="inline-avatar-emoji"\s*\/?&gt;/gi, (match, src) => {
        return `<img src="${src}" class="inline-avatar-emoji" alt="emoji" />`;
    });
}

function renderUsernameWithCrown(username, isGroupContext = false, groupCreator = null) {
    const cleanName = (username || "").trim();
    const isSpecialUser = cleanName === "matubanana" || cleanName === "matubanana2";
    const isCreator = isGroupContext && cleanName === groupCreator;
    
    if (isSpecialUser || isCreator) {
        const safeName = sanitizeMessageHTML(cleanName);
        return `${safeName} <img src="crown.png" style="width: 14px; height: 14px; vertical-align: middle; display: inline-block; margin-left: 3px;" alt="Crown" />`;
    }
    return sanitizeMessageHTML(cleanName);
}

function formatMessageTime(timestamp) {
    let date;
    if (!timestamp) {
        date = new Date();
    } else if (typeof timestamp.toDate === "function") {
        date = timestamp.toDate();
    } else {
        date = new Date(timestamp);
    }
    
    if (isNaN(date.getTime())) {
        return "Just now";
    }
    
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const monthStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    
    if (isToday) {
        return `Today at ${timeStr}`;
    }
    return `${monthStr}, ${timeStr}`;
}

function scrollToBottom(smooth = false) {
    const messagesContainer = document.getElementById("messages-container");
    if (messagesContainer) {
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: smooth ? 'smooth' : 'auto'
        });
    }
}

// ----------------------------------------------------------------------------
// 4. CORE DOM ELEMENT REFERENCES
// ----------------------------------------------------------------------------

const authModalBtn = document.getElementById("auth-modal-btn");
const logoutBtn = document.getElementById("logout-btn");
const authOverlay = document.getElementById("auth-overlay");
const closeModalBtn = document.getElementById("close-modal-btn");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const authError = document.getElementById("auth-error");
const tabRegister = document.getElementById("tab-register");
const tabLogin = document.getElementById("tab-login");
const themeToggleBtn = document.getElementById("theme-toggle-btn");

const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const messagesContainer = document.getElementById("messages-container");
const chatRoomTitle = document.getElementById("chat-room-title");
const exitDmBtn = document.getElementById("exit-dm-btn");

const globalChatSection = document.getElementById("global-chat-section");
if (globalChatSection) {
    globalChatSection.style.display = "flex";
    globalChatSection.style.flexDirection = "column";
}

if (exitDmBtn) {
    exitDmBtn.classList.add("hidden");
    exitDmBtn.style.cursor = "pointer";
}

// Hidden File Input for Message Attachments
const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = "image/png, image/jpeg, image/jpg";
fileInput.style.display = "none";
document.body.appendChild(fileInput);

// ----------------------------------------------------------------------------
// 5. REPLY BAR INTERFACE BUILDER
// ----------------------------------------------------------------------------

const replyPreviewBar = document.createElement("div");
replyPreviewBar.id = "reply-preview-bar";
replyPreviewBar.className = "hidden";
replyPreviewBar.style.cssText = "display: none; align-items: center; justify-content: space-between; padding: 6px 12px; background: var(--card-bg); border-top: 1px solid var(--border-color); font-size: 12px; color: var(--text-muted);";
replyPreviewBar.innerHTML = `
    <div id="reply-preview-text" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></div>
    <button type="button" id="cancel-reply-btn" style="background: none; border: none; color: var(--text-color); cursor: pointer; font-weight: bold; font-size: 14px; padding: 0 4px;">&times;</button>
`;

if (messageForm && messageForm.parentNode) {
    messageForm.parentNode.insertBefore(replyPreviewBar, messageForm);
}

const cancelReplyBtn = document.getElementById("cancel-reply-btn");
const replyPreviewText = document.getElementById("reply-preview-text");

function clearReplyState() {
    replyingToMessage = null;
    if (replyPreviewBar) {
        replyPreviewBar.classList.add("hidden");
        replyPreviewBar.style.display = "none";
    }
}

cancelReplyBtn?.addEventListener("click", () => {
    clearReplyState();
});

// ----------------------------------------------------------------------------
// 6. FRIENDS & DIRECT MESSAGES BUTTON WITH UNREAD BADGE COUNTER
// ----------------------------------------------------------------------------

const navFriendsBtn = document.getElementById("nav-friends-btn");
if (navFriendsBtn) {
    navFriendsBtn.style.cssText = "position: relative; display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 8px; background: var(--card-bg); color: var(--text-color); border: 1px solid var(--border-color); font-weight: 600; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 5px rgba(0,0,0,0.05);";
    navFriendsBtn.innerHTML = `
        <span style="font-size: 16px;">💬</span>
        <span>Friends & DMs</span>
        <span id="dm-unread-badge" style="display: none; background: #ef4444; color: #ffffff; font-size: 11px; font-weight: bold; border-radius: 12px; padding: 2px 7px; min-width: 18px; text-align: center; box-shadow: 0 2px 4px rgba(239, 68, 68, 0.4); border: 2px solid var(--card-bg);">0</span>
    `;
    navFriendsBtn.addEventListener("mouseover", () => navFriendsBtn.style.transform = "translateY(-1px)");
    navFriendsBtn.addEventListener("mouseout", () => navFriendsBtn.style.transform = "translateY(0)");
}

const backToChatBtn = document.getElementById("back-to-chat-btn");
const friendsSection = document.getElementById("friends-section");
const addFriendInput = document.getElementById("add-friend-input");
const sendFriendRequestBtn = document.getElementById("send-friend-request-btn");
const friendActionMsg = document.getElementById("friend-action-msg");
const pendingRequestsContainer = document.getElementById("pending-requests-container");
const friendsListContainer = document.getElementById("friends-list-container");

function updateUnreadDMBadge(count) {
    const badge = document.getElementById("dm-unread-badge");
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count > 99 ? "99+" : count;
        badge.style.display = "inline-block";
    } else {
        badge.style.display = "none";
    }
}

function listenForUnreadDMsAndRequests() {
    if (currentUsername === "Guest") {
        updateUnreadDMBadge(0);
        return;
    }
    onSnapshot(doc(db, "users", currentUsername), (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        const pendingCount = (data.friendRequests || []).length;
        const unreadDmsCount = data.unreadDMsCount || 0;
        updateUnreadDMBadge(pendingCount + unreadDmsCount);
    });
}

// ----------------------------------------------------------------------------
// 7. BLOCKED USERS & ADMIN SHADOW-BAN MANAGEMENT
// ----------------------------------------------------------------------------

const blockedSection = document.createElement("div");
blockedSection.style.cssText = "margin-top: 25px; padding-top: 20px; border-top: 1px solid var(--border-color);";
blockedSection.innerHTML = `
    <h3 style="font-size: 14px; margin-bottom: 10px; color: var(--text-color);">Blocked Users</h3>
    <div id="blocked-users-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
`;
friendsSection?.appendChild(blockedSection);
const blockedUsersContainer = document.getElementById("blocked-users-container");

const adminBannedUsersSection = document.createElement("div");
adminBannedUsersSection.id = "admin-banned-users-section";
adminBannedUsersSection.className = "hidden";
adminBannedUsersSection.style.cssText = "margin-top: 25px; padding-top: 20px; border-top: 1px solid var(--border-color);";
adminBannedUsersSection.innerHTML = `
    <h3 style="font-size: 14px; margin-bottom: 5px; color: #ef4444;">🔨 Admin Banned Users Manager</h3>
    <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 10px;">Unban accounts so they can be seen again.</p>
    <div id="admin-banned-users-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
`;
friendsSection?.appendChild(adminBannedUsersSection);
const adminBannedUsersContainer = document.getElementById("admin-banned-users-container");

const banPanelTrigger = document.createElement("button");
banPanelTrigger.id = "ban-panel-trigger-btn";
banPanelTrigger.className = "hidden btn btn-secondary";
banPanelTrigger.style.cssText = "margin-left: 10px; background: #ef4444; color: #fff; border: none; padding: 4px 10px; font-size: 12px; border-radius: 6px; cursor: pointer;";
banPanelTrigger.textContent = "🔨 Ban Panel";
if (chatRoomTitle && chatRoomTitle.parentNode) {
    chatRoomTitle.parentNode.appendChild(banPanelTrigger);
}

const banModalOverlay = document.createElement("div");
banModalOverlay.className = "modal-overlay hidden";
banModalOverlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 99999;";
banModalOverlay.innerHTML = `
    <div class="modal" style="background: var(--card-bg); padding: 25px; border-radius: 12px; text-align: center; max-width: 380px; width: 90%; border: 1px solid var(--border-color);">
        <h3 style="margin-bottom: 15px; color: #ef4444;">Admin Ban Panel</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 15px;">Enter exact username to shadow-ban them.</p>
        <input type="text" id="ban-username-input" placeholder="Username to ban..." style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-color); margin-bottom: 15px; box-sizing: border-box;" />
        <div style="display: flex; gap: 10px;">
            <button id="cancel-ban-btn" class="btn btn-secondary" style="flex: 1; height: 40px;">Cancel</button>
            <button id="confirm-ban-btn" class="btn btn-primary" style="flex: 1; height: 40px; background: #ef4444; border-color: #ef4444; color: #fff;">Ban User</button>
        </div>
        <p id="ban-status-msg" style="font-size: 12px; margin-top: 12px; color: var(--text-muted);"></p>
    </div>
`;
document.body.appendChild(banModalOverlay);

banPanelTrigger?.addEventListener("click", () => {
    const input = document.getElementById("ban-username-input");
    const status = document.getElementById("ban-status-msg");
    if (input) input.value = "";
    if (status) status.textContent = "";
    banModalOverlay.classList.remove("hidden");
});

document.getElementById("cancel-ban-btn")?.addEventListener("click", () => {
    banModalOverlay.classList.add("hidden");
});

document.getElementById("confirm-ban-btn")?.addEventListener("click", async () => {
    const targetInput = document.getElementById("ban-username-input");
    const targetUserToBan = targetInput ? targetInput.value.trim() : "";
    const statusMsg = document.getElementById("ban-status-msg");
    
    if (!targetUserToBan) {
        if (statusMsg) statusMsg.textContent = "Please type a username.";
        return;
    }

    if (currentUsername !== "matubanana" && currentUsername !== "matubanana2") {
        if (statusMsg) statusMsg.textContent = "Unauthorized action.";
        return;
    }

    if (!confirm(`Are you sure you want to ban @${targetUserToBan}?`)) return;

    if (statusMsg) statusMsg.textContent = "Applying ban record...";
    try {
        const banRecordRef = doc(db, "banned_users", targetUserToBan);
        await setDoc(banRecordRef, { username: targetUserToBan, bannedAt: serverTimestamp() });
        if (statusMsg) {
            statusMsg.style.color = "var(--success, #22c55e)";
            statusMsg.textContent = `Successfully banned @${targetUserToBan}!`;
        }
        setTimeout(() => {
            banModalOverlay.classList.add("hidden");
            loadFriendsAndRequests();
            loadMessagesFeed();
        }, 1200);
    } catch (err) {
        if (statusMsg) {
            statusMsg.style.color = "#ef4444";
            statusMsg.textContent = "Error: " + err.message;
        }
    }
});

// ----------------------------------------------------------------------------
// 8. SETTINGS MODAL UI & CONFIGURATION LOGIC
// ----------------------------------------------------------------------------

const settingsBtn = document.createElement("button");
settingsBtn.id = "settings-menu-btn";
settingsBtn.className = "btn btn-secondary";
settingsBtn.style.cssText = "position: fixed; top: 15px; right: 65px; z-index: 99998; width: 40px; height: 40px; border-radius: 50%; background: var(--card-bg); color: var(--text-color); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);";
settingsBtn.innerHTML = "⚙️";
document.body.appendChild(settingsBtn);

const settingsOverlay = document.createElement("div");
settingsOverlay.id = "settings-modal-overlay";
settingsOverlay.className = "modal-overlay hidden";
settingsOverlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 99999;";
settingsOverlay.innerHTML = `
    <div class="modal" style="background: var(--card-bg); padding: 25px; border-radius: 12px; max-width: 380px; width: 90%; border: 1px solid var(--border-color); color: var(--text-color);">
        <h3 style="margin-bottom: 18px; text-align: center;">⚙️ Application Settings</h3>
        
        <div style="display: flex; flex-direction: column; gap: 14px; text-align: left; font-size: 13px;">
            <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                <span>✨ Falling Emojis Background</span>
                <input type="checkbox" id="setting-toggle-bg" ${userAppSettings.fallingBgEnabled ? "checked" : ""} />
            </label>

            <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                <span>🔊 Notification Sounds</span>
                <input type="checkbox" id="setting-toggle-sound" ${userAppSettings.soundEnabled ? "checked" : ""} />
            </label>

            <label style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                <span>📏 Compact Chat View</span>
                <input type="checkbox" id="setting-toggle-compact" ${userAppSettings.compactMode ? "checked" : ""} />
            </label>

            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>🔤 Message Text Size</span>
                <select id="setting-select-fontsize" style="padding: 4px 8px; border-radius: 6px; background: var(--bg-color); color: var(--text-color); border: 1px solid var(--border-color);">
                    <option value="12px" ${userAppSettings.fontSize === "12px" ? "selected" : ""}>Small</option>
                    <option value="14px" ${userAppSettings.fontSize === "14px" ? "selected" : ""}>Normal</option>
                    <option value="16px" ${userAppSettings.fontSize === "16px" ? "selected" : ""}>Large</option>
                </select>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>🎨 Accent Color</span>
                <input type="color" id="setting-color-accent" value="${userAppSettings.accentColor}" style="width: 32px; height: 32px; border: none; border-radius: 50%; cursor: pointer;" />
            </div>
        </div>

        <button id="close-settings-btn" class="btn btn-primary" style="width: 100%; margin-top: 20px; height: 38px;">Done</button>
    </div>
`;
document.body.appendChild(settingsOverlay);

settingsBtn.addEventListener("click", () => settingsOverlay.classList.remove("hidden"));
document.getElementById("close-settings-btn")?.addEventListener("click", () => settingsOverlay.classList.add("hidden"));

document.getElementById("setting-toggle-bg")?.addEventListener("change", (e) => {
    userAppSettings.fallingBgEnabled = e.target.checked;
    localStorage.setItem("sc_bg_falling", userAppSettings.fallingBgEnabled);
});

document.getElementById("setting-toggle-sound")?.addEventListener("change", (e) => {
    userAppSettings.soundEnabled = e.target.checked;
    localStorage.setItem("sc_sound", userAppSettings.soundEnabled);
});

document.getElementById("setting-toggle-compact")?.addEventListener("change", (e) => {
    userAppSettings.compactMode = e.target.checked;
    localStorage.setItem("sc_compact", userAppSettings.compactMode);
    applyAppSettings();
});

document.getElementById("setting-select-fontsize")?.addEventListener("change", (e) => {
    userAppSettings.fontSize = e.target.value;
    localStorage.setItem("sc_fontsize", userAppSettings.fontSize);
    applyAppSettings();
});

document.getElementById("setting-color-accent")?.addEventListener("change", (e) => {
    userAppSettings.accentColor = e.target.value;
    localStorage.setItem("sc_accent", userAppSettings.accentColor);
    applyAppSettings();
});

// ----------------------------------------------------------------------------
// 9. BACKGROUND MUSIC PLAYER CONTROLLER
// ----------------------------------------------------------------------------

let currentAudio = null;
let isLooping = false;

const musicBtn = document.createElement("button");
musicBtn.id = "music-panel-btn";
musicBtn.className = "btn btn-secondary";
musicBtn.style.cssText = "position: fixed; top: 15px; right: 15px; z-index: 99998; width: 40px; height: 40px; border-radius: 50%; background: var(--card-bg); color: var(--text-color); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);";
musicBtn.innerHTML = "🎵";
document.body.appendChild(musicBtn);

const musicPanel = document.createElement("div");
musicPanel.id = "music-panel";
musicPanel.className = "hidden";
musicPanel.style.cssText = "position: fixed; top: 65px; right: 15px; background: var(--card-bg); border: 1px solid var(--border-color); padding: 15px; border-radius: 12px; z-index: 99999; width: 240px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);";
musicPanel.innerHTML = `
    <h4 style="font-size: 14px; margin-bottom: 10px; color: var(--text-color);">Music Player</h4>
    <div id="music-list" style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px;">
        <button class="btn btn-secondary music-track-btn" data-src="relaxing.mp3" style="width: 100%; text-align: left; font-size: 12px; padding: 6px;">▶ relaxing.mp3</button>
        <button class="btn btn-secondary music-track-btn" data-src="ordinary.mp3" style="width: 100%; text-align: left; font-size: 12px; padding: 6px;">▶ ordinary.mp3</button>
        <button class="btn btn-secondary music-track-btn" data-src="meep.mp3" style="width: 100%; text-align: left; font-size: 12px; padding: 6px;">▶ meep.mp3</button>
        <button class="btn btn-secondary music-track-btn" data-src="imagination.mp3" style="width: 100%; text-align: left; font-size: 12px; padding: 6px;">▶ imagination.mp3</button>
    </div>
    <div style="display: flex; gap: 6px;">
        <button id="music-stop-btn" class="btn btn-secondary" style="flex: 1; font-size: 12px; background: #ef4444; color: #fff; border: none;">Stop</button>
        <button id="music-loop-btn" class="btn btn-secondary" style="flex: 1; font-size: 12px;">Loop: Off</button>
    </div>
`;
document.body.appendChild(musicPanel);

musicBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    musicPanel.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
    if (musicPanel && !musicPanel.contains(e.target) && e.target !== musicBtn) {
        musicPanel.classList.add("hidden");
    }
});

musicPanel.querySelectorAll(".music-track-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const src = btn.getAttribute("data-src");
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        currentAudio = new Audio(src);
        currentAudio.loop = isLooping;
        currentAudio.play().catch(err => alert("Could not play track: " + err.message));
        
        musicPanel.querySelectorAll(".music-track-btn").forEach(b => b.style.fontWeight = "normal");
        btn.style.fontWeight = "bold";
    });
});

const musicLoopBtn = document.getElementById("music-loop-btn");
musicLoopBtn?.addEventListener("click", () => {
    isLooping = !isLooping;
    musicLoopBtn.textContent = `Loop: ${isLooping ? "On" : "Off"}`;
    musicLoopBtn.style.background = isLooping ? "var(--primary-color, #2563eb)" : "";
    musicLoopBtn.style.color = isLooping ? "#fff" : "";
    if (currentAudio) {
        currentAudio.loop = isLooping;
    }
});

document.getElementById("music-stop-btn")?.addEventListener("click", () => {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    musicPanel.querySelectorAll(".music-track-btn").forEach(b => b.style.fontWeight = "normal");
});

// ----------------------------------------------------------------------------
// 10. CANVAS FALLING BACKGROUND ANIMATION SYSTEM
// ----------------------------------------------------------------------------

const bgCanvas = document.createElement("canvas");
bgCanvas.id = "bg-falling-dots-canvas";
bgCanvas.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: -1;";
document.body.prepend(bgCanvas);

const bgCtx = bgCanvas.getContext("2d");
let bgWidth = bgCanvas.width = window.innerWidth;
let bgHeight = bgCanvas.height = window.innerHeight;

window.addEventListener("resize", () => {
    bgWidth = bgCanvas.width = window.innerWidth;
    bgHeight = bgCanvas.height = window.innerHeight;
});

const easterEggEmojis = ["🐢", "😊", "🚀", "😢", "😂", "✨", "🔥", "🍌"];
const fallingParticles = [];
const particleCount = 45;

for (let i = 0; i < particleCount; i++) {
    fallingParticles.push({
        x: Math.random() * bgWidth,
        y: Math.random() * bgHeight,
        radius: Math.random() * 2.5 + 1,
        speedY: Math.random() * 0.8 + 0.3,
        opacity: Math.random() * 0.5 + 0.2,
        isEmoji: false,
        emoji: "",
        size: 0
    });
}

function spawnEmojiParticle(targetParticle, customX = null) {
    targetParticle.isEmoji = true;
    targetParticle.emoji = easterEggEmojis[Math.floor(Math.random() * easterEggEmojis.length)];
    targetParticle.size = Math.random() * 6 + 14; 
    targetParticle.speedY = Math.random() * 0.5 + 0.2; 
    if (customX !== null) {
        targetParticle.x = Math.min(Math.max(customX, 10), bgWidth - 20);
    }
}

function animateFallingBackground() {
    bgCtx.clearRect(0, 0, bgWidth, bgHeight);

    if (userAppSettings.fallingBgEnabled) {
        const isDark = document.body.classList.contains("dark-mode");
        const dotColor = isDark ? "rgba(255, 255, 255, " : "rgba(0, 0, 0, ";

        for (let i = 0; i < fallingParticles.length; i++) {
            let p = fallingParticles[i];
            p.y += p.speedY;

            if (p.y > bgHeight + 20) {
                p.y = -20;
                p.x = Math.random() * bgWidth;

                // Enhanced emoji spawn rate (+25% increase -> 0.0625 chance)
                if (Math.random() < 0.0625) {
                    spawnEmojiParticle(p);

                    // 30% chance to rain down 3 emojis at once
                    if (Math.random() < 0.30 && i + 2 < fallingParticles.length) {
                        const baseX = p.x;
                        spawnEmojiParticle(fallingParticles[i + 1], baseX - 25);
                        fallingParticles[i + 1].y = -20 - (Math.random() * 15);
                        
                        spawnEmojiParticle(fallingParticles[i + 2], baseX + 25);
                        fallingParticles[i + 2].y = -20 - (Math.random() * 30);
                    }
                } else {
                    p.isEmoji = false;
                    p.radius = Math.random() * 2.5 + 1;
                    p.speedY = Math.random() * 0.8 + 0.3;
                }
            }

            if (p.isEmoji) {
                bgCtx.font = `${p.size}px sans-serif`;
                bgCtx.globalAlpha = p.opacity + 0.2;
                bgCtx.fillText(p.emoji, p.x, p.y);
            } else {
                bgCtx.beginPath();
                bgCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                bgCtx.fillStyle = dotColor + p.opacity + ")";
                bgCtx.fill();
            }
        }
    }

    requestAnimationFrame(animateFallingBackground);
}

requestAnimationFrame(animateFallingBackground);
// ============================================================================
// APP.JS - PART 2 OF 2
// Profile, Image Cropping, Messaging Engine, Friends, DMs & Realtime Handlers
// ============================================================================

// ----------------------------------------------------------------------------
// 11. USER PROFILE & BIO MANAGEMENT
// ----------------------------------------------------------------------------

const topLeftProfile = document.getElementById("top-left-profile");
const profileOverlay = document.getElementById("profile-overlay");
const closeProfileModal = document.getElementById("close-profile-modal");
const myMiniAvatar = document.getElementById("my-mini-avatar");
const myMiniUsername = document.getElementById("my-mini-username");
const editModalAvatar = document.getElementById("edit-modal-avatar");
const profileDisplayUsername = document.getElementById("profile-display-username");
const openAvatarSelector = document.getElementById("open-avatar-selector");
const avatarSelectorOverlay = document.getElementById("avatar-selector-overlay");
const closeAvatarSelector = document.getElementById("close-avatar-selector");
const bioInput = document.getElementById("bio-input");
const saveBioBtn = document.getElementById("save-bio-btn");
const bioCharCount = document.getElementById("bio-char-count");

const viewProfileOverlay = document.getElementById("view-profile-overlay");
const closeViewProfile = document.getElementById("close-view-profile");
const viewUserAvatar = document.getElementById("view-user-avatar");
const viewUserName = document.getElementById("view-user-name");
const viewUserBio = document.getElementById("view-user-bio");
const profileFriendActionBtn = document.getElementById("profile-friend-action-btn");

let myProfilePfpWrapper = null;
let myProfileStatusDot = null;

if (editModalAvatar && editModalAvatar.parentNode) {
    myProfilePfpWrapper = document.createElement("div");
    myProfilePfpWrapper.style.cssText = "position: relative; display: inline-block; margin-bottom: 15px;";
    editModalAvatar.parentNode.insertBefore(myProfilePfpWrapper, editModalAvatar);
    myProfilePfpWrapper.appendChild(editModalAvatar);
    
    myProfileStatusDot = document.createElement("span");
    myProfileStatusDot.id = "my-profile-modal-status-dot";
    myProfileStatusDot.style.cssText = "position: absolute; bottom: 5px; right: 5px; width: 16px; height: 16px; border-radius: 50%; background: var(--success, #22c55e); border: 3px solid var(--card-bg);";
    myProfilePfpWrapper.appendChild(myProfileStatusDot);
}

let profilePfpWrapper = null;
let profileStatusDot = null;

if (viewUserAvatar && viewUserAvatar.parentNode) {
    profilePfpWrapper = document.createElement("div");
    profilePfpWrapper.style.cssText = "position: relative; display: inline-block; margin: 0 auto 15px auto;";
    viewUserAvatar.parentNode.insertBefore(profilePfpWrapper, viewUserAvatar);
    profilePfpWrapper.appendChild(viewUserAvatar);
    
    profileStatusDot = document.createElement("span");
    profileStatusDot.id = "profile-modal-status-dot";
    profileStatusDot.style.cssText = "position: absolute; bottom: 5px; right: 5px; width: 16px; height: 16px; border-radius: 50%; border: 3px solid var(--card-bg);";
    profilePfpWrapper.appendChild(profileStatusDot);
}

const profileBlockActionBtn = document.createElement("button");
profileBlockActionBtn.className = "btn btn-secondary";
profileBlockActionBtn.style.cssText = "width: 100%; margin-top: 8px; background: #ef4444; color: #fff; border: none;";
profileBlockActionBtn.textContent = "Block User";

if (profileFriendActionBtn && profileFriendActionBtn.parentNode) {
    profileFriendActionBtn.parentNode.insertBefore(profileBlockActionBtn, profileFriendActionBtn.nextSibling);
}

topLeftProfile?.addEventListener("click", () => {
    if (currentUsername === "Guest") {
        authOverlay.classList.remove("hidden");
        return;
    }
    if (profileDisplayUsername) {
        profileDisplayUsername.innerHTML = renderUsernameWithCrown(currentUsername);
    }
    if (myProfileStatusDot) {
        myProfileStatusDot.style.background = "var(--success, #22c55e)";
    }
    profileOverlay.classList.remove("hidden");
});

closeProfileModal?.addEventListener("click", () => profileOverlay.classList.add("hidden"));
openAvatarSelector?.addEventListener("click", () => avatarSelectorOverlay.classList.remove("hidden"));
closeAvatarSelector?.addEventListener("click", () => avatarSelectorOverlay.classList.add("hidden"));

bioInput?.addEventListener("input", () => {
    if (bioCharCount) {
        bioCharCount.textContent = `${bioInput.value.length}/120`;
    }
});

saveBioBtn?.addEventListener("click", async () => {
    if (currentUsername === "Guest") return;
    const newBio = bioInput.value.trim();
    try {
        await updateDoc(doc(db, "users", currentUsername), { bio: newBio });
        alert("Bio saved successfully!");
    } catch (e) {
        alert("Error saving bio: " + e.message);
    }
});

// ----------------------------------------------------------------------------
// 12. CUSTOM AVATAR CROPPER CANVAS ENGINE
// ----------------------------------------------------------------------------

const customAvatarFileInput = document.createElement("input");
customAvatarFileInput.type = "file";
customAvatarFileInput.accept = "image/png, image/jpeg, image/jpg";
customAvatarFileInput.style.display = "none";
document.body.appendChild(customAvatarFileInput);

const cropOverlay = document.createElement("div");
cropOverlay.id = "crop-preview-overlay";
cropOverlay.className = "modal-overlay hidden";
cropOverlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 99999;";
cropOverlay.innerHTML = `
    <div class="modal" style="background: var(--card-bg); padding: 20px; border-radius: 12px; text-align: center; max-width: 320px; width: 90%; border: 1px solid var(--border-color);">
        <h3 style="margin-bottom: 12px; color: var(--text-color);">Position Your PFP</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 15px;">Drag to pan or scroll to zoom inside the circle.</p>
        <div id="crop-viewport" style="position: relative; width: 200px; height: 200px; margin: 0 auto 15px auto; overflow: hidden; border-radius: 50%; border: 3px solid var(--primary-color, #2563eb); cursor: grab; background: #000;">
            <img id="crop-source-img" style="position: absolute; top: 0; left: 0; user-select: none; pointer-events: none; max-width: none;" alt="PFP Crop Preview" />
        </div>
        <div style="display: flex; gap: 10px;">
            <button id="cancel-crop-btn" class="btn btn-secondary" style="flex: 1; height: 40px;">Cancel</button>
            <button id="confirm-crop-btn" class="btn btn-primary" style="flex: 1; height: 40px;">Save PFP</button>
        </div>
    </div>
`;
document.body.appendChild(cropOverlay);

const avatarModalContent = document.querySelector("#avatar-selector-overlay .modal");
if (avatarModalContent) {
    document.querySelectorAll(".custom-pfp-trigger-btn").forEach(el => el.remove());
    
    const customPfpBtn = document.createElement("button");
    customPfpBtn.className = "btn btn-secondary custom-pfp-trigger-btn";
    customPfpBtn.style.cssText = "width: 100%; margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;";
    
    const circleSpan = document.createElement("span");
    circleSpan.style.cssText = "width: 12px; height: 12px; border-radius: 50%; border: 2px solid currentColor; display: inline-block;";
    customPfpBtn.appendChild(circleSpan);
    
    const textSpan = document.createElement("span");
    textSpan.textContent = "Upload Custom PFP";
    customPfpBtn.appendChild(textSpan);

    customPfpBtn.addEventListener("click", () => customAvatarFileInput.click());
    avatarModalContent.appendChild(customPfpBtn);
}

let cropScale = 1;
let cropPosX = 0;
let cropPosY = 0;
let isDraggingCrop = false;
let startDragX = 0;
let startDragY = 0;
let cropImgElement = null;

customAvatarFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        cropImgElement = document.getElementById("crop-source-img");
        if (!cropImgElement) return;

        cropImgElement.src = event.target.result;
        cropImgElement.onload = () => {
            const viewportSize = 200;
            const minDim = Math.min(cropImgElement.naturalWidth, cropImgElement.naturalHeight);
            cropScale = viewportSize / minDim;

            cropPosX = (viewportSize - cropImgElement.naturalWidth * cropScale) / 2;
            cropPosY = (viewportSize - cropImgElement.naturalHeight * cropScale) / 2;

            updateCropTransform();
            cropOverlay.classList.remove("hidden");
        };
    };
    reader.readAsDataURL(file);
});

function updateCropTransform() {
    if (!cropImgElement) return;
    cropImgElement.style.width = `${cropImgElement.naturalWidth * cropScale}px`;
    cropImgElement.style.height = `${cropImgElement.naturalHeight * cropScale}px`;
    cropImgElement.style.left = `${cropPosX}px`;
    cropImgElement.style.top = `${cropPosY}px`;
}

const cropViewport = document.getElementById("crop-viewport");
cropViewport?.addEventListener("mousedown", (e) => {
    isDraggingCrop = true;
    startDragX = e.clientX - cropPosX;
    startDragY = e.clientY - cropPosY;
    cropViewport.style.cursor = "grabbing";
});

window.addEventListener("mousemove", (e) => {
    if (!isDraggingCrop) return;
    cropPosX = e.clientX - startDragX;
    cropPosY = e.clientY - startDragY;
    updateCropTransform();
});

window.addEventListener("mouseup", () => {
    isDraggingCrop = false;
    if (cropViewport) cropViewport.style.cursor = "grab";
});

cropViewport?.addEventListener("wheel", (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    cropScale *= zoomFactor;
    updateCropTransform();
}, { passive: false });

document.getElementById("cancel-crop-btn")?.addEventListener("click", () => {
    cropOverlay.classList.add("hidden");
    customAvatarFileInput.value = "";
});

document.getElementById("confirm-crop-btn")?.addEventListener("click", async () => {
    if (!cropImgElement) return;

    const canvas = document.createElement("canvas");
    canvas.width = 180;
    canvas.height = 180;
    const ctx = canvas.getContext("2d");

    ctx.beginPath();
    ctx.arc(90, 90, 90, 0, Math.PI * 2);
    ctx.clip();

    const scaleRatio = 180 / 200;
    ctx.drawImage(
        cropImgElement,
        cropPosX * scaleRatio,
        cropPosY * scaleRatio,
        cropImgElement.naturalWidth * cropScale * scaleRatio,
        cropImgElement.naturalHeight * cropScale * scaleRatio
    );

    const croppedBase64 = canvas.toDataURL("image/png");
    cropOverlay.classList.add("hidden");
    avatarSelectorOverlay.classList.add("hidden");
    customAvatarFileInput.value = "";

    await applyNewAvatar(croppedBase64);
});

async function applyNewAvatar(avatarUrlOrBase64) {
    if (currentUsername === "Guest") return;
    try {
        await updateDoc(doc(db, "users", currentUsername), { avatar: avatarUrlOrBase64 });
        userAvatarsCache[currentUsername] = avatarUrlOrBase64;
        if (myMiniAvatar) myMiniAvatar.src = avatarUrlOrBase64;
        if (editModalAvatar) editModalAvatar.src = avatarUrlOrBase64;
        avatarSelectorOverlay.classList.add("hidden");
        loadMessagesFeed();
    } catch (e) {
        alert("Failed to update profile picture: " + e.message);
    }
}

document.querySelectorAll(".preset-avatar").forEach(el => {
    el.addEventListener("click", async (e) => {
        const selected = e.target.getAttribute("data-avatar");
        if (selected) {
            await applyNewAvatar(selected);
        }
    });
});

// ----------------------------------------------------------------------------
// 13. IMAGE UPLOADING ENGINE (IMGBB API)
// ----------------------------------------------------------------------------

async function uploadImageToImgBB(file) {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData
    });

    const result = await response.json();
    if (result.success) {
        return result.data.url;
    } else {
        throw new Error(result.error?.message || "Failed image upload to ImgBB.");
    }
}

const photoBtn = document.getElementById("photo-btn");
photoBtn?.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", (e) => {
    selectedImageFile = e.target.files[0] || null;
    if (selectedImageFile) {
        messageInput.placeholder = `[Photo attached: ${selectedImageFile.name}] Type caption...`;
    } else {
        messageInput.placeholder = "Type a message...";
    }
});

// ----------------------------------------------------------------------------
// 14. EMOJI PICKER INTERFACE BUILDER
// ----------------------------------------------------------------------------

const emojiBtn = document.getElementById("emoji-btn");
const discordEmojiPicker = document.getElementById("discord-emoji-picker");
const discordEmojiGrid = document.getElementById("discord-emoji-grid");

const sampleEmojis = [
    "😊", "😂", "🤣", "😍", "😒", "😭", "😊", "😩", "😔", "😏", "😁", "😳",
    "🔥", "✨", "🎉", "❤️", "👍", "👎", "💩", "🚀", "👑", "🐢", "🍌", "💯"
];

if (discordEmojiGrid && discordEmojiGrid.children.length === 0) {
    sampleEmojis.forEach(emoji => {
        const span = document.createElement("span");
        span.textContent = emoji;
        span.style.cssText = "font-size: 20px; cursor: pointer; text-align: center; padding: 4px; border-radius: 4px; transition: background 0.1s;";
        span.addEventListener("mouseover", () => span.style.background = "var(--border-color)");
        span.addEventListener("mouseout", () => span.style.background = "transparent");
        span.addEventListener("click", () => {
            if (messageInput) {
                messageInput.value += emoji;
                messageInput.focus();
            }
            discordEmojiPicker?.classList.add("hidden");
        });
        discordEmojiGrid.appendChild(span);
    });
}

emojiBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    discordEmojiPicker?.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
    if (discordEmojiPicker && !discordEmojiPicker.contains(e.target) && e.target !== emojiBtn) {
        discordEmojiPicker.classList.add("hidden");
    }
});

// ----------------------------------------------------------------------------
// 15. MESSAGING CORE: SEND, RENDER, REACTIONS & DELETE
// ----------------------------------------------------------------------------

messageForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (currentUsername === "Guest") {
        authOverlay.classList.remove("hidden");
        return;
    }

    const textContent = messageInput.value.trim();
    if (!textContent && !selectedImageFile) return;

    messageInput.value = "";
    messageInput.placeholder = "Sending...";

    try {
        let imageUrl = null;
        if (selectedImageFile) {
            imageUrl = await uploadImageToImgBB(selectedImageFile);
            selectedImageFile = null;
        }

        const msgPayload = {
            sender: currentUsername,
            text: textContent,
            imageUrl: imageUrl || null,
            chatRoom: currentChatRoom,
            timestamp: serverTimestamp(),
            reactions: {}
        };

        if (replyingToMessage) {
            msgPayload.replyTo = {
                id: replyingToMessage.id,
                sender: replyingToMessage.sender,
                text: replyingToMessage.text || "[Photo Attachment]"
            };
        }

        await addDoc(collection(db, "messages"), msgPayload);

        clearReplyState();
        messageInput.placeholder = "Type a message...";
        scrollToBottom(true);
    } catch (err) {
        alert("Could not send message: " + err.message);
        messageInput.placeholder = "Type a message...";
    }
});

function renderSingleMessage(msgData, msgId) {
    if (renderedMessageIds.has(msgId)) return;
    renderedMessageIds.add(msgId);

    const isShadowBanned = globallyBannedUsersCache.has(msgData.sender);
    if (isShadowBanned && currentUsername !== msgData.sender && currentUsername !== "matubanana" && currentUsername !== "matubanana2") {
        return;
    }

    if (myBlockedUsersCache.includes(msgData.sender)) {
        return;
    }

    const msgElement = document.createElement("div");
    msgElement.className = "message-item";
    msgElement.dataset.id = msgId;
    msgElement.style.cssText = "display: flex; gap: 12px; margin-bottom: 14px; align-items: flex-start; position: relative;";

    const senderPfp = userAvatarsCache[msgData.sender] || "avatar1.png";

    let replySnippetHTML = "";
    if (msgData.replyTo) {
        replySnippetHTML = `
            <div class="message-reply-snippet" style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px; padding-left: 8px; border-left: 2px solid var(--primary-color, #2563eb);">
                Replying to <b>@${sanitizeMessageHTML(msgData.replyTo.sender)}</b>: "${sanitizeMessageHTML(msgData.replyTo.text)}"
            </div>
        `;
    }

    let imageAttachmentHTML = "";
    if (msgData.imageUrl) {
        imageAttachmentHTML = `
            <div style="margin-top: 8px;">
                <img src="${msgData.imageUrl}" style="max-width: 260px; max-height: 260px; border-radius: 8px; border: 1px solid var(--border-color); cursor: pointer;" onclick="window.open('${msgData.imageUrl}', '_blank')" alt="Attachment" />
            </div>
        `;
    }

    let isGroupContext = false;
    let groupCreator = null;
    if (currentGroupData) {
        isGroupContext = true;
        groupCreator = currentGroupData.createdBy;
    }

    const formattedUsername = renderUsernameWithCrown(msgData.sender, isGroupContext, groupCreator);
    const formattedTime = formatMessageTime(msgData.timestamp);

    const canDelete = currentUsername === msgData.sender || currentUsername === "matubanana" || currentUsername === "matubanana2";

    msgElement.innerHTML = `
        <img src="${senderPfp}" class="msg-avatar" style="width: 36px; height: 36px; border-radius: 50%; cursor: pointer; flex-shrink: 0;" alt="${msgData.sender}" />
        <div class="msg-content-body" style="flex: 1; overflow: hidden;">
            ${replySnippetHTML}
            <div class="msg-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                <span class="msg-sender-name" style="font-weight: 600; font-size: 13px; color: var(--text-color); cursor: pointer;">${formattedUsername}</span>
                <span class="msg-timestamp" style="font-size: 11px; color: var(--text-muted);">${formattedTime}</span>
            </div>
            <div class="msg-text" style="color: var(--text-color); word-break: break-word; line-height: 1.4;">${sanitizeMessageHTML(msgData.text)}</div>
            ${imageAttachmentHTML}
            <div class="msg-reactions-bar" id="reactions-${msgId}" style="display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap;"></div>
        </div>
        <div class="msg-actions-overlay" style="display: flex; gap: 6px; position: absolute; right: 0; top: -8px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 6px; padding: 2px 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <button class="msg-action-btn reply-btn" title="Reply" style="background: none; border: none; cursor: pointer; font-size: 12px;">↩️</button>
            <button class="msg-action-btn react-btn" title="Add Reaction" style="background: none; border: none; cursor: pointer; font-size: 12px;">😊</button>
            ${canDelete ? `<button class="msg-action-btn delete-btn" title="Delete" style="background: none; border: none; cursor: pointer; font-size: 12px; color: #ef4444;">🗑️</button>` : ""}
        </div>
    `;

    const avatarEl = msgElement.querySelector(".msg-avatar");
    const senderNameEl = msgElement.querySelector(".msg-sender-name");

    const openProfileHandler = () => openViewUserProfileModal(msgData.sender);
    avatarEl?.addEventListener("click", openProfileHandler);
    senderNameEl?.addEventListener("click", openProfileHandler);

    const replyBtn = msgElement.querySelector(".reply-btn");
    replyBtn?.addEventListener("click", () => {
        replyingToMessage = { id: msgId, sender: msgData.sender, text: msgData.text };
        if (replyPreviewText) {
            replyPreviewText.textContent = `Replying to @${msgData.sender}: "${msgData.text || '[Photo]'}"`;
        }
        if (replyPreviewBar) {
            replyPreviewBar.classList.remove("hidden");
            replyPreviewBar.style.display = "flex";
        }
        messageInput.focus();
    });

    const reactBtn = msgElement.querySelector(".react-btn");
    reactBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleQuickReactionPicker(msgId, reactBtn);
    });

    const deleteBtn = msgElement.querySelector(".delete-btn");
    deleteBtn?.addEventListener("click", async () => {
        if (confirm("Are you sure you want to delete this message?")) {
            await deleteDoc(doc(db, "messages", msgId));
            msgElement.remove();
        }
    });

    renderReactionsList(msgId, msgData.reactions || {});

    messagesContainer.appendChild(msgElement);
}

function renderReactionsList(msgId, reactionsMap) {
    const reactionsBar = document.getElementById(`reactions-${msgId}`);
    if (!reactionsBar) return;
    reactionsBar.innerHTML = "";

    Object.entries(reactionsMap).forEach(([emoji, usersArray]) => {
        if (!Array.isArray(usersArray) || usersArray.length === 0) return;

        const badge = document.createElement("button");
        badge.style.cssText = "background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 2px 6px; font-size: 11px; cursor: pointer; display: flex; align-items: center; gap: 4px; color: var(--text-color);";
        if (usersArray.includes(currentUsername)) {
            badge.style.borderColor = "var(--primary-color, #2563eb)";
            badge.style.background = "rgba(37, 99, 235, 0.1)";
        }
        badge.innerHTML = `<span>${emoji}</span> <span>${usersArray.length}</span>`;
        badge.addEventListener("click", () => toggleReaction(msgId, emoji));
        reactionsBar.appendChild(badge);
    });
}

async function toggleReaction(msgId, emoji) {
    if (currentUsername === "Guest") return;
    const msgRef = doc(db, "messages", msgId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const reactions = data.reactions || {};
    let usersList = reactions[emoji] || [];

    if (usersList.includes(currentUsername)) {
        usersList = usersList.filter(u => u !== currentUsername);
    } else {
        usersList.push(currentUsername);
    }

    reactions[emoji] = usersList;
    await updateDoc(msgRef, { reactions });
}

function toggleQuickReactionPicker(msgId, targetButton) {
    let existingPicker = document.getElementById("quick-reaction-popover");
    if (existingPicker) existingPicker.remove();

    const popover = document.createElement("div");
    popover.id = "quick-reaction-popover";
    popover.style.cssText = "position: absolute; right: 0; top: -35px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 20px; padding: 4px 8px; display: flex; gap: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); z-index: 100;";

    const quickEmojis = ["👍", "❤️", "😂", "🔥", "💩"];
    quickEmojis.forEach(emoji => {
        const btn = document.createElement("span");
        btn.textContent = emoji;
        btn.style.cssText = "cursor: pointer; font-size: 14px; transition: transform 0.1s;";
        btn.addEventListener("mouseover", () => btn.style.transform = "scale(1.2)");
        btn.addEventListener("mouseout", () => btn.style.transform = "scale(1.0)");
        btn.addEventListener("click", async () => {
            popover.remove();
            await toggleReaction(msgId, emoji);
        });
        popover.appendChild(btn);
    });

    targetButton.parentNode.appendChild(popover);
}

// ----------------------------------------------------------------------------
// 16. FIRESTORE REALTIME MESSAGE FEED LISTENER
// ----------------------------------------------------------------------------

function loadMessagesFeed() {
    if (unsubscribeMessages) unsubscribeMessages();

    renderedMessageIds.clear();
    messagesContainer.innerHTML = "";

    const q = query(
        collection(db, "messages"),
        where("chatRoom", "==", currentChatRoom),
        orderBy("timestamp", "asc")
    );

    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                renderSingleMessage(change.doc.data(), change.doc.id);
            }
            if (change.type === "modified") {
                const msgData = change.doc.data();
                renderReactionsList(change.doc.id, msgData.reactions || {});
            }
            if (change.type === "removed") {
                const el = document.querySelector(`[data-id="${change.doc.id}"]`);
                if (el) el.remove();
            }
        });
        scrollToBottom(isInitialLoad);
        isInitialLoad = false;
    });
}

// ----------------------------------------------------------------------------
// 17. VIEW OTHER USER PROFILES MODAL ENGINE
// ----------------------------------------------------------------------------

async function openViewUserProfileModal(username) {
    if (!username) return;
    viewingProfileUsername = username;

    if (viewUserName) {
        viewUserName.innerHTML = renderUsernameWithCrown(username);
    }

    const userDocRef = doc(db, "users", username);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
        const data = userSnap.data();
        if (viewUserAvatar) viewUserAvatar.src = data.avatar || "avatar1.png";
        if (viewUserBio) viewUserBio.textContent = data.bio || "No bio available.";

        if (profileStatusDot) {
            const lastSeen = data.lastSeen;
            let isOnline = false;
            if (lastSeen && typeof lastSeen.toDate === "function") {
                const diffMs = Date.now() - lastSeen.toDate().getTime();
                isOnline = diffMs < 45000;
            }
            profileStatusDot.style.background = isOnline ? "var(--success, #22c55e)" : "#9ca3af";
        }
    }

    updateProfileModalButtons(username);
    viewProfileOverlay?.classList.remove("hidden");
}

closeViewProfile?.addEventListener("click", () => {
    viewProfileOverlay?.classList.add("hidden");
});

function updateProfileModalButtons(targetUser) {
    if (currentUsername === "Guest" || targetUser === currentUsername) {
        if (profileFriendActionBtn) profileFriendActionBtn.style.display = "none";
        if (profileBlockActionBtn) profileBlockActionBtn.style.display = "none";
        return;
    }

    if (profileFriendActionBtn) profileFriendActionBtn.style.display = "block";
    if (profileBlockActionBtn) profileBlockActionBtn.style.display = "block";

    const isBlocked = myBlockedUsersCache.includes(targetUser);
    profileBlockActionBtn.textContent = isBlocked ? "Unblock User" : "Block User";
    profileBlockActionBtn.onclick = () => isBlocked ? unblockUser(targetUser) : blockUser(targetUser);

    profileFriendActionBtn.textContent = "Send Friend Request";
    profileFriendActionBtn.onclick = () => sendFriendRequestToUser(targetUser);
}

// ----------------------------------------------------------------------------
// 18. FRIENDS, DIRECT MESSAGES & GROUP CHAT MANAGEMENT
// ----------------------------------------------------------------------------

async function sendFriendRequestToUser(targetUser) {
    if (currentUsername === "Guest") return;
    if (targetUser === currentUsername) {
        alert("You cannot add yourself.");
        return;
    }

    try {
        const targetRef = doc(db, "users", targetUser);
        const snap = await getDoc(targetRef);

        if (!snap.exists()) {
            alert("User does not exist.");
            return;
        }

        await updateDoc(targetRef, {
            friendRequests: arrayUnion(currentUsername)
        });

        alert(`Friend request sent to @${targetUser}!`);
    } catch (err) {
        alert("Error sending request: " + err.message);
    }
}

sendFriendRequestBtn?.addEventListener("click", () => {
    const target = addFriendInput.value.trim();
    if (target) {
        sendFriendRequestToUser(target);
        addFriendInput.value = "";
    }
});

async function loadFriendsAndRequests() {
    if (currentUsername === "Guest") return;

    const myDocRef = doc(db, "users", currentUsername);
    const snap = await getDoc(myDocRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const friends = data.friends || [];
    const requests = data.friendRequests || [];
    const blocked = data.blocked || [];

    myBlockedUsersCache = blocked;

    // Render Pending Requests
    if (pendingRequestsContainer) {
        pendingRequestsContainer.innerHTML = requests.length === 0 ? `<p style="font-size: 12px; color: var(--text-muted);">No pending requests.</p>` : "";
        requests.forEach(reqUser => {
            const item = document.createElement("div");
            item.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-color); border-radius: 6px;";
            item.innerHTML = `
                <span style="font-size: 13px;">@${sanitizeMessageHTML(reqUser)}</span>
                <div style="display: flex; gap: 6px;">
                    <button class="accept-btn btn btn-primary" style="padding: 4px 8px; font-size: 11px;">Accept</button>
                    <button class="decline-btn btn btn-secondary" style="padding: 4px 8px; font-size: 11px;">Decline</button>
                </div>
            `;
            item.querySelector(".accept-btn").onclick = () => acceptFriendRequest(reqUser);
            item.querySelector(".decline-btn").onclick = () => declineFriendRequest(reqUser);
            pendingRequestsContainer.appendChild(item);
        });
    }

    // Render Friends List
    if (friendsListContainer) {
        friendsListContainer.innerHTML = friends.length === 0 ? `<p style="font-size: 12px; color: var(--text-muted);">No friends added yet.</p>` : "";
        friends.forEach(friendUser => {
            const item = document.createElement("div");
            item.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-color); border-radius: 6px;";
            item.innerHTML = `
                <span style="font-size: 13px;">@${sanitizeMessageHTML(friendUser)}</span>
                <div style="display: flex; gap: 6px;">
                    <button class="dm-btn btn btn-primary" style="padding: 4px 8px; font-size: 11px;">Message DM</button>
                    <button class="remove-btn btn btn-secondary" style="padding: 4px 8px; font-size: 11px; background: #ef4444; color: #fff; border: none;">Remove</button>
                </div>
            `;
            item.querySelector(".dm-btn").onclick = () => openDirectMessage(friendUser);
            item.querySelector(".remove-btn").onclick = () => removeFriend(friendUser);
            friendsListContainer.appendChild(item);
        });
    }

    // Render Blocked Users List
    if (blockedUsersContainer) {
        blockedUsersContainer.innerHTML = blocked.length === 0 ? `<p style="font-size: 12px; color: var(--text-muted);">No blocked users.</p>` : "";
        blocked.forEach(blockedUser => {
            const item = document.createElement("div");
            item.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-color); border-radius: 6px;";
            item.innerHTML = `
                <span style="font-size: 13px;">@${sanitizeMessageHTML(blockedUser)}</span>
                <button class="unblock-btn btn btn-secondary" style="padding: 4px 8px; font-size: 11px;">Unblock</button>
            `;
            item.querySelector(".unblock-btn").onclick = () => unblockUser(blockedUser);
            blockedUsersContainer.appendChild(item);
        });
    }

    // Render Admin Banned Users List
    if (adminBannedUsersContainer && (currentUsername === "matubanana" || currentUsername === "matubanana2")) {
        adminBannedUsersSection?.classList.remove("hidden");
        adminBannedUsersContainer.innerHTML = globallyBannedUsersCache.size === 0 ? `<p style="font-size: 12px; color: var(--text-muted);">No accounts shadow-banned.</p>` : "";
        globallyBannedUsersCache.forEach(bannedUser => {
            const item = document.createElement("div");
            item.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-color); border-radius: 6px;";
            item.innerHTML = `
                <span style="font-size: 13px; color: #ef4444;">🔨 @${sanitizeMessageHTML(bannedUser)}</span>
                <button class="unban-btn btn btn-secondary" style="padding: 4px 8px; font-size: 11px;">Unban</button>
            `;
            item.querySelector(".unban-btn").onclick = () => adminUnbanUser(bannedUser);
            adminBannedUsersContainer.appendChild(item);
        });
    }
}

async function acceptFriendRequest(senderUser) {
    try {
        const myRef = doc(db, "users", currentUsername);
        const senderRef = doc(db, "users", senderUser);

        await updateDoc(myRef, {
            friends: arrayUnion(senderUser),
            friendRequests: arrayRemove(senderUser)
        });

        await updateDoc(senderRef, {
            friends: arrayUnion(currentUsername)
        });

        loadFriendsAndRequests();
    } catch (e) {
        alert("Error accepting request: " + e.message);
    }
}

async function declineFriendRequest(senderUser) {
    try {
        await updateDoc(doc(db, "users", currentUsername), {
            friendRequests: arrayRemove(senderUser)
        });
        loadFriendsAndRequests();
    } catch (e) {
        alert("Error declining request: " + e.message);
    }
}

async function removeFriend(friendUser) {
    if (!confirm(`Remove @${friendUser} from your friends list?`)) return;
    try {
        await updateDoc(doc(db, "users", currentUsername), { friends: arrayRemove(friendUser) });
        await updateDoc(doc(db, "users", friendUser), { friends: arrayRemove(currentUsername) });
        loadFriendsAndRequests();
    } catch (e) {
        alert("Error removing friend: " + e.message);
    }
}

async function blockUser(targetUser) {
    if (!confirm(`Block @${targetUser}? They won't be able to send you direct messages.`)) return;
    try {
        await updateDoc(doc(db, "users", currentUsername), {
            blocked: arrayUnion(targetUser),
            friends: arrayRemove(targetUser)
        });
        await updateDoc(doc(db, "users", targetUser), {
            friends: arrayRemove(currentUsername)
        });
        myBlockedUsersCache.push(targetUser);
        loadFriendsAndRequests();
        viewProfileOverlay?.classList.add("hidden");
        loadMessagesFeed();
    } catch (e) {
        alert("Error blocking user: " + e.message);
    }
}

async function unblockUser(targetUser) {
    try {
        await updateDoc(doc(db, "users", currentUsername), {
            blocked: arrayRemove(targetUser)
        });
        myBlockedUsersCache = myBlockedUsersCache.filter(u => u !== targetUser);
        loadFriendsAndRequests();
        viewProfileOverlay?.classList.add("hidden");
        loadMessagesFeed();
    } catch (e) {
        alert("Error unblocking user: " + e.message);
    }
}

async function adminUnbanUser(targetUser) {
    if (currentUsername !== "matubanana" && currentUsername !== "matubanana2") return;
    try {
        await deleteDoc(doc(db, "banned_users", targetUser));
        globallyBannedUsersCache.delete(targetUser);
        loadFriendsAndRequests();
        loadMessagesFeed();
    } catch (e) {
        alert("Error unbanning user: " + e.message);
    }
}

function openDirectMessage(friendUsername) {
    const sorted = [currentUsername, friendUsername].sort();
    currentChatRoom = `dm_${sorted[0]}_${sorted[1]}`;
    currentGroupData = null;

    if (chatRoomTitle) chatRoomTitle.textContent = `@${friendUsername}`;
    if (exitDmBtn) {
        exitDmBtn.classList.remove("hidden");
        exitDmBtn.style.display = "inline-block";
    }
    if (photoBtn) {
        photoBtn.classList.remove("hidden");
        photoBtn.style.display = "inline-block";
    }

    friendsSection?.classList.add("hidden");
    globalChatSection?.classList.remove("hidden");

    loadMessagesFeed();
}

function loadFriendsAndGroupsLists() {
    loadFriendsAndRequests();
}

// ----------------------------------------------------------------------------
// 19. GLOBAL KEYBOARD & SHORTCUT LISTENERS
// ----------------------------------------------------------------------------

window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        authOverlay?.classList.add("hidden");
        profileOverlay?.classList.add("hidden");
        avatarSelectorOverlay?.classList.add("hidden");
        viewProfileOverlay?.classList.add("hidden");
        banModalOverlay?.classList.add("hidden");
        settingsOverlay?.classList.add("hidden");
        discordEmojiPicker?.classList.add("hidden");
        musicPanel?.classList.add("hidden");
        clearReplyState();
    }
});

console.log("SimpleChat Engine fully initialized successfully.");