import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, setDoc, getDoc, updateDoc, query, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

const navFriendsBtn = document.getElementById("nav-friends-btn");
const backToChatBtn = document.getElementById("back-to-chat-btn");
const globalChatSection = document.getElementById("global-chat-section");
const friendsSection = document.getElementById("friends-section");

const addFriendInput = document.getElementById("add-friend-input");
const sendFriendRequestBtn = document.getElementById("send-friend-request-btn");
const friendActionMsg = document.getElementById("friend-action-msg");
const pendingRequestsContainer = document.getElementById("pending-requests-container");
const friendsListContainer = document.getElementById("friends-list-container");

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

const emojiBtn = document.getElementById("emoji-btn");
const discordEmojiPicker = document.getElementById("discord-emoji-picker");
const discordEmojiGrid = document.getElementById("discord-emoji-grid");

const makeEmail = (username) => `${username.toLowerCase().trim()}@simplechat.com`;
const makeSecurePass = (pass) => `sc_${pass}_pad123`;

let currentUsername = "matutbanana2";
let viewingProfileUsername = null;
let currentChatRoom = "global";

// Working Dark/Light Mode Toggle
themeToggleBtn?.addEventListener("click", () => {
    if (document.body.classList.contains("dark-mode")) {
        document.body.classList.remove("dark-mode");
        themeToggleBtn.textContent = "☀️";
    } else {
        document.body.classList.add("dark-mode");
        themeToggleBtn.textContent = "🌙";
    }
});

navFriendsBtn?.addEventListener("click", () => {
    globalChatSection.classList.add("hidden");
    friendsSection.classList.remove("hidden");
    loadFriendsAndRequests();
});

backToChatBtn?.addEventListener("click", () => {
    friendsSection.classList.add("hidden");
    globalChatSection.classList.remove("hidden");
    currentChatRoom = "global";
    chatRoomTitle.textContent = "global chat";
});

tabRegister?.addEventListener("click", () => {
    tabRegister.className = "tab-btn active";
    tabLogin.className = "tab-btn";
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
});

tabLogin?.addEventListener("click", () => {
    tabLogin.className = "tab-btn active";
    tabRegister.className = "tab-btn";
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
});

authModalBtn?.addEventListener("click", () => authOverlay.classList.remove("hidden"));
closeModalBtn?.addEventListener("click", () => authOverlay.classList.add("hidden"));
logoutBtn?.addEventListener("click", () => signOut(auth));

registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("register-username").value.trim();
    const password = document.getElementById("register-password").value;
    try {
        await createUserWithEmailAndPassword(auth, makeEmail(username), makeSecurePass(password));
        await setDoc(doc(db, "users", username), {
            username,
            bio: "Hey there! I am using SimpleChat.",
            avatar: "😀",
            friends: [],
            friendRequests: []
        });
        authOverlay.classList.add("hidden");
    } catch (err) {
        authError.textContent = err.message;
    }
});

loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    try {
        await signInWithEmailAndPassword(auth, makeEmail(username), makeSecurePass(password));
        authOverlay.classList.add("hidden");
    } catch (err) {
        authError.textContent = "Invalid credentials.";
    }
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUsername = user.email.split("@")[0];
        myMiniUsername.textContent = currentUsername;
        authModalBtn.classList.add("hidden");
        logoutBtn.classList.remove("hidden");

        const userRef = doc(db, "users", currentUsername);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
            await setDoc(userRef, {
                username: currentUsername,
                bio: "Hey there! I am using SimpleChat.",
                avatar: "😀",
                friends: [],
                friendRequests: []
            });
        } else {
            const data = snap.data();
            if (data.avatar) {
                myMiniAvatar.textContent = data.avatar;
                editModalAvatar.textContent = data.avatar;
            }
            if (data.bio) bioInput.value = data.bio;
        }
    } else {
        currentUsername = "Guest";
        myMiniUsername.textContent = "Guest";
        authModalBtn.classList.remove("hidden");
        logoutBtn.classList.add("hidden");
    }
});

topLeftProfile?.addEventListener("click", () => {
    if (currentUsername === "Guest") {
        authOverlay.classList.remove("hidden");
        return;
    }
    profileDisplayUsername.textContent = currentUsername;
    profileOverlay.classList.remove("hidden");
});
closeProfileModal?.addEventListener("click", () => profileOverlay.classList.add("hidden"));

openAvatarSelector?.addEventListener("click", () => avatarSelectorOverlay.classList.remove("hidden"));
closeAvatarSelector?.addEventListener("click", () => avatarSelectorOverlay.classList.add("hidden"));

document.querySelectorAll(".preset-avatar").forEach(el => {
    el.addEventListener("click", async (e) => {
        const selected = e.target.getAttribute("data-avatar");
        myMiniAvatar.textContent = selected;
        editModalAvatar.textContent = selected;
        avatarSelectorOverlay.classList.add("hidden");
        if (currentUsername !== "Guest") {
            await updateDoc(doc(db, "users", currentUsername), { avatar: selected });
        }
    });
});

bioInput?.addEventListener("input", () => {
    const left = 150 - bioInput.value.length;
    bioCharCount.textContent = `${left} characters left`;
});

saveBioBtn?.addEventListener("click", async () => {
    if (currentUsername === "Guest") return;
    await updateDoc(doc(db, "users", currentUsername), { bio: bioInput.value.trim() });
    profileOverlay.classList.add("hidden");
});

// Emoji & GIF Setup (all 4 files included in picker)
const popularEmojis = ["😂", "😭", "🤣", "👀", "😍", "🙄", "👍", "🤔", "🔥", "💀", "🙏", "👌", "❤️", "😊"];
const gifFiles = ["gif1.mp4", "gif2.mp4", "gif3.mp4", "gif4.mp4"];

gifFiles.forEach(gif => {
    const videoThumb = document.createElement("video");
    videoThumb.src = gif;
    videoThumb.className = "discord-picker-thumbnail";
    videoThumb.muted = true;
    videoThumb.autoplay = true;
    videoThumb.loop = true;
    videoThumb.playsInline = true;
    videoThumb.addEventListener("click", () => {
        messageInput.value += ` <video src="${gif}" class="inline-chat-video-original" autoplay loop muted playsinline></video> `;
        messageInput.focus();
        discordEmojiPicker.classList.add("hidden");
    });
    discordEmojiGrid.appendChild(videoThumb);
});

popularEmojis.forEach(emoji => {
    const span = document.createElement("span");
    span.className = "discord-emoji-item";
    span.textContent = emoji;
    span.addEventListener("click", () => {
        messageInput.value += emoji;
        messageInput.focus();
        discordEmojiPicker.classList.add("hidden");
    });
    discordEmojiGrid.appendChild(span);
});

emojiBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    discordEmojiPicker.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
    if (!discordEmojiPicker.contains(e.target) && e.target !== emojiBtn) {
        discordEmojiPicker.classList.add("hidden");
    }
});

messageForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text || currentUsername === "Guest") return;

    let userAvatar = "😀";
    try {
        const snap = await getDoc(doc(db, "users", currentUsername));
        if (snap.exists() && snap.data().avatar) userAvatar = snap.data().avatar;
    } catch(e){}

    messageInput.value = "";
    await addDoc(collection(db, "messages"), {
        text,
        username: currentUsername,
        avatar: userAvatar,
        room: currentChatRoom,
        timestamp: serverTimestamp()
    });
});

const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
onSnapshot(q, (snapshot) => {
    messagesContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
        const msg = docSnap.data();
        let matchesRoom = false;
        if (currentChatRoom === "global") {
            matchesRoom = !msg.room || msg.room === "global";
        } else {
            matchesRoom = (msg.room === `dm_${currentUsername}_${currentChatRoom}`) || 
                          (msg.room === `dm_${currentChatRoom}_${currentUsername}`) ||
                          (msg.room === currentChatRoom && msg.username === currentUsername) ||
                          (msg.room === currentUsername && msg.username === currentChatRoom);
        }

        // Alternative DM room check matching both ways
        if (currentChatRoom !== "global") {
            const isTargetDM = (msg.room === currentChatRoom && msg.username === currentUsername) ||
                               (msg.room === currentUsername && msg.username === currentChatRoom);
            if (!isTargetDM && msg.room !== currentChatRoom) return;
        } else {
            if (msg.room && msg.room !== "global") return;
        }

        const isSent = msg.username === currentUsername;
        const div = document.createElement("div");
        div.className = `msg ${isSent ? 'sent' : 'received'}`;
        
        div.innerHTML = `
            <div class="msg-avatar-img emoji-avatar">${msg.avatar || '😀'}</div>
            <div class="msg-content">
                <div class="msg-header">
                    <span class="msg-author">${msg.username}</span>
                    <span class="msg-time">Now</span>
                </div>
                <div class="msg-bubble">${msg.text}</div>
            </div>
        `;

        div.querySelectorAll(".msg-avatar-img, .msg-author").forEach(el => {
            el.addEventListener("click", () => openUserProfileModal(msg.username));
        });

        messagesContainer.appendChild(div);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

async function openUserProfileModal(username) {
    viewingProfileUsername = username;
    viewUserName.textContent = username;
    viewUserAvatar.textContent = "😀";
    viewUserBio.textContent = "Loading bio...";
    profileFriendActionBtn.textContent = "Send Friend Request";
    profileFriendActionBtn.disabled = false;

    try {
        const userDoc = await getDoc(doc(db, "users", username));
        if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.avatar) viewUserAvatar.textContent = data.avatar;
            if (data.bio) viewUserBio.textContent = data.bio;
        }

        if (currentUsername !== "Guest" && currentUsername !== username) {
            const myDoc = await getDoc(doc(db, "users", currentUsername));
            if (myDoc.exists()) {
                const myData = myDoc.data();
                if ((myData.friends || []).includes(username)) {
                    profileFriendActionBtn.textContent = "Friends (Open DM)";
                    profileFriendActionBtn.onclick = () => {
                        viewProfileOverlay.classList.add("hidden");
                        openDirectMessage(username);
                    };
                } else {
                    const targetDoc = await getDoc(doc(db, "users", username));
                    const targetRequests = (targetDoc.data() || {}).friendRequests || [];
                    if (targetRequests.includes(currentUsername)) {
                        profileFriendActionBtn.textContent = "Request Sent";
                        profileFriendActionBtn.disabled = true;
                    }
                }
            }
        } else if (currentUsername === username) {
            profileFriendActionBtn.textContent = "This is You";
            profileFriendActionBtn.disabled = true;
        }
    } catch(e) {}

    viewProfileOverlay.classList.remove("hidden");
}

closeViewProfile?.addEventListener("click", () => viewProfileOverlay.classList.add("hidden"));

profileFriendActionBtn?.addEventListener("click", async () => {
    if (currentUsername === "Guest" || !viewingProfileUsername) return;
    if (profileFriendActionBtn.textContent.includes("Open DM")) return;
    
    await updateDoc(doc(db, "users", viewingProfileUsername), {
        friendRequests: arrayUnion(currentUsername)
    });
    profileFriendActionBtn.textContent = "Request Sent";
    profileFriendActionBtn.disabled = true;
});

sendFriendRequestBtn?.addEventListener("click", async () => {
    const targetName = addFriendInput.value.trim();
    if (!targetName || currentUsername === "Guest") return;

    try {
        const targetSnap = await getDoc(doc(db, "users", targetName));
        if (!targetSnap.exists()) {
            friendActionMsg.textContent = "User not found.";
            return;
        }
        await updateDoc(doc(db, "users", targetName), {
            friendRequests: arrayUnion(currentUsername)
        });
        friendActionMsg.textContent = `Friend request sent to ${targetName}!`;
        addFriendInput.value = "";
        loadFriendsAndRequests();
    } catch (err) {
        friendActionMsg.textContent = "Error sending request.";
    }
});

async function loadFriendsAndRequests() {
    if (currentUsername === "Guest") return;
    pendingRequestsContainer.innerHTML = "";
    friendsListContainer.innerHTML = "";

    const mySnap = await getDoc(doc(db, "users", currentUsername));
    if (!mySnap.exists()) return;
    const myData = mySnap.data();

    const requests = myData.friendRequests || [];
    const friends = myData.friends || [];

    if (requests.length === 0) {
        pendingRequestsContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No pending requests.</p>`;
    } else {
        requests.forEach(reqUser => {
            const row = document.createElement("div");
            row.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--card-bg); border-radius: var(--radius-sm); border: 1px solid var(--border-color);";
            row.innerHTML = `<span>${reqUser}</span><button class="btn btn-primary" style="padding: 4px 10px; font-size: 12px;">Accept</button>`;
            row.querySelector("button").addEventListener("click", () => acceptFriendRequest(reqUser));
            pendingRequestsContainer.appendChild(row);
        });
    }

    if (friends.length === 0) {
        friendsListContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No friends added yet.</p>`;
    } else {
        friends.forEach(friend => {
            const row = document.createElement("div");
            row.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--card-bg); border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer;";
            row.innerHTML = `<span style="font-weight: 600;">💬 DM @${friend}</span><span style="font-size: 12px; color: var(--success);">Connected</span>`;
            row.addEventListener("click", () => openDirectMessage(friend));
            friendsListContainer.appendChild(row);
        });
    }
}

function openDirectMessage(friendName) {
    currentChatRoom = friendName;
    chatRoomTitle.textContent = `DM with @${friendName}`;
    friendsSection.classList.add("hidden");
    globalChatSection.classList.remove("hidden");
}

async function acceptFriendRequest(friendName) {
    const myRef = doc(db, "users", currentUsername);
    const friendRef = doc(db, "users", friendName);

    await updateDoc(myRef, {
        friends: arrayUnion(friendName),
        friendRequests: arrayRemove(friendName)
    });
    await updateDoc(friendRef, {
        friends: arrayUnion(currentUsername)
    });
    loadFriendsAndRequests();
}