import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, doc, setDoc, getDoc, updateDoc, 
    query, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove, deleteDoc, limit 
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

const IMGBB_API_KEY = "5fbe075f08f860f0714328246630fdfc";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function renderUsernameWithCrown(username) {
    const cleanName = (username || "").trim();
    if (cleanName === "matubanana" || cleanName === "matubanana2") {
        return `${sanitizeMessageHTML(cleanName)} <img src="crown.png" style="width: 14px; height: 14px; vertical-align: middle; display: inline-block; margin-left: 3px;" alt="Crown" />`;
    }
    return sanitizeMessageHTML(cleanName);
}

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = "image/png, image/jpeg, image/jpg";
fileInput.style.display = "none";
document.body.appendChild(fileInput);

let selectedImageFile = null;
let replyingToMessage = null;

// DOM Elements
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

if (exitDmBtn) {
    exitDmBtn.classList.add("hidden");
    exitDmBtn.style.cursor = "pointer";
}

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

cancelReplyBtn?.addEventListener("click", () => {
    clearReplyState();
});

function clearReplyState() {
    replyingToMessage = null;
    replyPreviewBar.classList.add("hidden");
    replyPreviewBar.style.display = "none";
}

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
const photoBtn = document.getElementById("photo-btn");
const discordEmojiPicker = document.getElementById("discord-emoji-picker");
const discordEmojiGrid = document.getElementById("discord-emoji-grid");

let currentUsername = "Guest";
let viewingProfileUsername = null;
let currentChatRoom = "global";
let unsubscribeMessages = null;
let unsubscribeUserProfiles = new Map();
let userAvatarsCache = {};
let renderedMessageIds = new Set();
let isInitialLoad = true;

const makeEmail = (username) => `${username.toLowerCase().trim()}@simplechat.com`;
const makeSecurePass = (pass) => `sc_${pass}_pad123`;

function formatMessageTime(timestamp) {
    let date;
    if (!timestamp) {
        date = new Date();
    } else if (typeof timestamp.toDate === "function") {
        date = timestamp.toDate();
    } else {
        date = new Date(timestamp);
    }
    
    if (isNaN(date.getTime())) return "Just now";
    
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const monthStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    
    return isToday ? `Today at ${timeStr}` : `${monthStr}, ${timeStr}`;
}

function sanitizeMessageHTML(str) {
    if (!str) return "";
    const temp = document.createElement("div");
    temp.textContent = str;
    let safeText = temp.innerHTML;

    return safeText.replace(/&lt;img\s+src="([^"]+)"\s+class="inline-avatar-emoji"\s*\/?&gt;/gi, (match, src) => {
        return `<img src="${src}" class="inline-avatar-emoji" alt="emoji" />`;
    });
}

function scrollToBottom(smooth = true) {
    if (messagesContainer) {
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: smooth ? 'smooth' : 'auto'
        });
    }
}

themeToggleBtn?.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    themeToggleBtn.textContent = document.body.classList.contains("dark-mode") ? "🌙" : "☀️";
});

navFriendsBtn?.addEventListener("click", () => {
    globalChatSection.classList.add("hidden");
    friendsSection.classList.remove("hidden");
    loadFriendsAndRequests();
});

backToChatBtn?.addEventListener("click", () => {
    friendsSection.classList.add("hidden");
    globalChatSection.classList.remove("hidden");
});

exitDmBtn?.addEventListener("click", () => {
    currentChatRoom = "global";
    chatRoomTitle.textContent = "global chat";
    exitDmBtn.classList.add("hidden");
    exitDmBtn.style.display = "none";
    if (photoBtn) photoBtn.classList.add("hidden");
    loadMessagesFeed();
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
            avatar: "avatar1.png",
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
        myMiniUsername.innerHTML = renderUsernameWithCrown(currentUsername);
        authModalBtn.classList.add("hidden");
        logoutBtn.classList.remove("hidden");

        const userRef = doc(db, "users", currentUsername);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
            await setDoc(userRef, {
                username: currentUsername,
                bio: "Hey there! I am using SimpleChat.",
                avatar: "avatar1.png",
                friends: [],
                friendRequests: []
            });
        } else {
            const data = snap.data();
            if (data.avatar) {
                myMiniAvatar.src = data.avatar;
                editModalAvatar.src = data.avatar;
                userAvatarsCache[currentUsername] = data.avatar;
            }
            if (data.bio) bioInput.value = data.bio;
        }
    } else {
        currentUsername = "Guest";
        myMiniUsername.textContent = "Guest";
        authModalBtn.classList.remove("hidden");
        logoutBtn.classList.add("hidden");
    }
    loadMessagesFeed();
});

topLeftProfile?.addEventListener("click", () => {
    if (currentUsername === "Guest") {
        authOverlay.classList.remove("hidden");
        return;
    }
    profileDisplayUsername.innerHTML = renderUsernameWithCrown(currentUsername);
    profileOverlay.classList.remove("hidden");
});
closeProfileModal?.addEventListener("click", () => profileOverlay.classList.add("hidden"));

openAvatarSelector?.addEventListener("click", () => avatarSelectorOverlay.classList.remove("hidden"));
closeAvatarSelector?.addEventListener("click", () => avatarSelectorOverlay.classList.add("hidden"));

document.querySelectorAll(".preset-avatar").forEach(el => {
    el.addEventListener("click", async (e) => {
        const selected = e.target.getAttribute("data-avatar");
        await applyNewAvatar(selected);
    });
});

const customAvatarFileInput = document.createElement("input");
customAvatarFileInput.type = "file";
customAvatarFileInput.accept = "image/png, image/jpeg, image/jpg";
customAvatarFileInput.style.display = "none";
document.body.appendChild(customAvatarFileInput);

const cropOverlay = document.createElement("div");
cropOverlay.id = "crop-preview-overlay";
cropOverlay.className = "modal-overlay hidden";
cropOverlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 9999;";
cropOverlay.innerHTML = `
    <div class="modal" style="background: var(--card-bg); padding: 20px; border-radius: 12px; text-align: center; max-width: 320px; width: 90%; border: 1px solid var(--border-color);">
        <h3 style="margin-bottom: 15px; color: var(--text-color);">Position Your PFP</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 15px;">Drag to pan or scroll to zoom your image inside the circle.</p>
        <div id="crop-viewport" style="position: relative; width: 200px; height: 200px; margin: 0 auto 15px auto; overflow: hidden; border-radius: 50%; border: 3px solid var(--primary-color); cursor: grab; background: #000;">
            <img id="crop-source-img" style="position: absolute; top: 0; left: 0; user-select: none; pointer-events: none; max-width: none;" />
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
    avatarModalContent.querySelectorAll(".custom-pfp-trigger-btn").forEach(b => b.remove());
}

let activeImageObj = null;
let imgX = 0, imgY = 0, imgScale = 1;
let isDragging = false;
let startX = 0, startY = 0;

const cropViewport = document.getElementById("crop-viewport");
const cropSourceImg = document.getElementById("crop-source-img");

customAvatarFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        activeImageObj = new Image();
        activeImageObj.onload = function () {
            cropSourceImg.src = activeImageObj.src;
            imgScale = Math.max(200 / activeImageObj.width, 200 / activeImageObj.height);
            imgX = (200 - (activeImageObj.width * imgScale)) / 2;
            imgY = (200 - (activeImageObj.height * imgScale)) / 2;
            updateCropImageTransform();
            avatarSelectorOverlay.classList.add("hidden");
            cropOverlay.classList.remove("hidden");
            customAvatarFileInput.value = "";
        };
        activeImageObj.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

function updateCropImageTransform() {
    if (!cropSourceImg) return;
    cropSourceImg.style.width = `${activeImageObj.width * imgScale}px`;
    cropSourceImg.style.height = `${activeImageObj.height * imgScale}px`;
    cropSourceImg.style.transform = `translate(${imgX}px, ${imgY}px)`;
}

cropViewport?.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX - imgX;
    startY = e.clientY - imgY;
    cropViewport.style.cursor = "grabbing";
});

window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    imgX = e.clientX - startX;
    imgY = e.clientY - startY;
    updateCropImageTransform();
});

window.addEventListener("mouseup", () => {
    isDragging = false;
    if (cropViewport) cropViewport.style.cursor = "grab";
});

cropViewport?.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX - imgX;
        startY = e.touches[0].clientY - imgY;
    }
}, { passive: true });

window.addEventListener("touchmove", (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    imgX = e.touches[0].clientX - startX;
    imgY = e.touches[0].clientY - startY;
    updateCropImageTransform();
}, { passive: true });

window.addEventListener("touchend", () => {
    isDragging = false;
});

cropViewport?.addEventListener("wheel", (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    imgScale *= zoomFactor;
    updateCropImageTransform();
}, { passive: false });

document.getElementById("cancel-crop-btn")?.addEventListener("click", () => {
    cropOverlay.classList.add("hidden");
});

document.getElementById("confirm-crop-btn")?.addEventListener("click", async () => {
    const canvas = document.createElement("canvas");
    const outputSize = 150;
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(
        activeImageObj,
        -imgX / imgScale,
        -imgY / imgScale,
        200 / imgScale,
        200 / imgScale,
        0,
        0,
        outputSize,
        outputSize
    );

    canvas.toBlob(async (blob) => {
        cropOverlay.classList.add("hidden");
        if (!blob) return;

        const formData = new FormData();
        formData.append("image", blob, "pfp.jpg");

        try {
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                await applyNewAvatar(data.data.url);
            } else {
                alert("Failed to upload custom PFP: " + (data.error?.message || "unknown error"));
            }
        } catch (err) {
            alert("Network error uploading PFP: " + err.message);
        }
    }, "image/jpeg", 0.9);
});

async function applyNewAvatar(avatarUrl) {
    myMiniAvatar.src = avatarUrl;
    editModalAvatar.src = avatarUrl;
    userAvatarsCache[currentUsername] = avatarUrl;
    avatarSelectorOverlay.classList.add("hidden");

    if (currentUsername !== "Guest") {
        try {
            await updateDoc(doc(db, "users", currentUsername), { avatar: avatarUrl });
        } catch (err) {}
    }
}

bioInput?.addEventListener("input", () => {
    const left = 150 - bioInput.value.length;
    bioCharCount.textContent = `${left} characters left`;
});

saveBioBtn?.addEventListener("click", async () => {
    if (currentUsername === "Guest") return;
    await updateDoc(doc(db, "users", currentUsername), { bio: bioInput.value.trim() });
    profileOverlay.classList.add("hidden");
});

photoBtn?.addEventListener("click", () => {
    if (currentUsername === "Guest" || currentChatRoom === "global") return;
    fileInput.click();
});

fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
        alert("Only PNG, JPG, and JPEG images are allowed!");
        fileInput.value = "";
        return;
    }

    selectedImageFile = file;
    messageInput.value = "(image)";
    messageInput.focus();
});

messageInput?.addEventListener("input", () => {
    if (selectedImageFile && !messageInput.value.includes("(image)")) {
        selectedImageFile = null;
        fileInput.value = "";
    }
});

if (discordEmojiGrid) {
    discordEmojiGrid.innerHTML = "";
    const basicEmojis = ["😀", "😂", "😍", "👍", "🔥", "❤️", "😎", "🎉"];
    basicEmojis.forEach(em => {
        const emojiDiv = document.createElement("div");
        emojiDiv.className = "discord-picker-emoji-thumb";
        emojiDiv.textContent = em;
        emojiDiv.addEventListener("click", (e) => {
            e.preventDefault();
            messageInput.value += em;
            messageInput.focus();
            discordEmojiPicker.classList.add("hidden");
        });
        discordEmojiGrid.appendChild(emojiDiv);
    });

    const avatars = ["avatar1.png", "avatar2.png", "avatar3.png", "avatar4.png", "avatar5.png"];
    avatars.forEach(av => {
        const imgThumb = document.createElement("img");
        imgThumb.src = av;
        imgThumb.className = "discord-picker-emoji-thumb";
        imgThumb.style.width = "28px";
        imgThumb.style.height = "28px";
        imgThumb.style.borderRadius = "50%";
        imgThumb.style.objectFit = "cover";
        imgThumb.style.cursor = "pointer";
        imgThumb.addEventListener("click", (e) => {
            e.preventDefault();
            messageInput.value += `<img src="${av}" class="inline-avatar-emoji" />`;
            messageInput.focus();
            discordEmojiPicker.classList.add("hidden");
        });
        discordEmojiGrid.appendChild(imgThumb);
    });

    const projectVideos = ["gif1.mp4", "gif2.mp4", "gif3.mp4", "gif4.mp4", "gif5.mp4", "gif6.mp4", "gif7.mp4", "gif8.mp4", "gif9.mp4", "gif10.mp4", "myvideo.mp4"];
    projectVideos.forEach(videoSrc => {
        const wrapper = document.createElement("div");
        wrapper.className = "discord-picker-emoji-thumb video-wrapper";
        wrapper.style.cssText = "width: 36px; height: 36px; position: relative; cursor: pointer; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.2); border-radius: 4px; overflow: hidden;";
        
        const vidThumb = document.createElement("video");
        vidThumb.src = videoSrc;
        vidThumb.autoplay = true;
        vidThumb.loop = true;
        vidThumb.muted = true;
        vidThumb.playsInline = true;
        vidThumb.style.cssText = "width: 100%; height: 100%; object-fit: cover; border-radius: 4px; pointer-events: none;";
        wrapper.appendChild(vidThumb);

        wrapper.addEventListener("click", async (e) => {
            e.preventDefault();
            discordEmojiPicker.classList.add("hidden");
            if (currentUsername === "Guest") return;

            const roomKey = currentChatRoom === "global" ? "global" : [currentUsername, currentChatRoom].sort().join("_dm_");
            const recipient = currentChatRoom === "global" ? null : currentChatRoom;
            
            const messagePayload = {
                mediaUrl: videoSrc,
                mediaType: "video",
                username: currentUsername,
                room: roomKey,
                recipient: recipient,
                timestamp: serverTimestamp()
            };

            if (replyingToMessage) {
                messagePayload.replyTo = {
                    username: replyingToMessage.username,
                    text: replyingToMessage.text || (replyingToMessage.mediaType ? `[${replyingToMessage.mediaType}]` : "Attachment")
                };
            }

            await addDoc(collection(db, "messages"), messagePayload);
            clearReplyState();
        });
        discordEmojiGrid.appendChild(wrapper);
    });
}

emojiBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    discordEmojiPicker.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
    if (discordEmojiPicker && !discordEmojiPicker.contains(e.target) && e.target !== emojiBtn) {
        discordEmojiPicker.classList.add("hidden");
    }
});

messageForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (currentUsername === "Guest") return;

    const roomKey = currentChatRoom === "global" ? "global" : [currentUsername, currentChatRoom].sort().join("_dm_");
    const recipient = currentChatRoom === "global" ? null : currentChatRoom;

    if (selectedImageFile && messageInput.value.includes("(image)")) {
        const fileToUpload = selectedImageFile;
        selectedImageFile = null;
        fileInput.value = "";
        messageInput.value = "Uploading image...";

        try {
            const formData = new FormData();
            formData.append("image", fileToUpload);
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                messageInput.value = "";
                
                const messagePayload = {
                    mediaUrl: data.data.url,
                    mediaType: "image",
                    username: currentUsername,
                    room: roomKey,
                    recipient: recipient,
                    timestamp: serverTimestamp()
                };

                if (replyingToMessage) {
                    messagePayload.replyTo = {
                        username: replyingToMessage.username,
                        text: replyingToMessage.text || "[image]"
                    };
                }

                await addDoc(collection(db, "messages"), messagePayload);
                clearReplyState();
                scrollToBottom(true);
            } else {
                alert("Upload failed: " + data.error.message);
                messageInput.value = "";
            }
        } catch (err) {
            alert("Failed to send image: " + err.message);
            messageInput.value = "";
        }
        return;
    }

    const text = messageInput.value.trim();
    if (!text) return;

    messageInput.value = "";

    const messagePayload = {
        text,
        username: currentUsername,
        room: roomKey,
        recipient: recipient,
        timestamp: serverTimestamp()
    };

    if (replyingToMessage) {
        messagePayload.replyTo = {
            username: replyingToMessage.username,
            text: replyingToMessage.text || (replyingToMessage.mediaType ? `[${replyingToMessage.mediaType}]` : "Attachment")
        };
    }

    await addDoc(collection(db, "messages"), messagePayload);
    clearReplyState();
    scrollToBottom(true);
});

function watchUserAvatar(username, callback) {
    if (!username) return;
    if (unsubscribeUserProfiles.has(username)) return;

    const userDocRef = doc(db, "users", username);
    const unsub = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.avatar) {
                userAvatarsCache[username] = data.avatar;
                callback(data.avatar);
            }
        }
    });
    unsubscribeUserProfiles.set(username, unsub);
}

async function getLiveUserAvatar(username, imgElement = null) {
    if (!username) return "avatar1.png";
    if (username === currentUsername && myMiniAvatar && myMiniAvatar.src) {
        return myMiniAvatar.src;
    }
    if (userAvatarsCache[username]) {
        if (imgElement) {
            watchUserAvatar(username, (newAvatar) => {
                imgElement.src = newAvatar;
            });
        }
        return userAvatarsCache[username];
    }
    try {
        const userDoc = await getDoc(doc(db, "users", username));
        if (userDoc.exists() && userDoc.data().avatar) {
            userAvatarsCache[username] = userDoc.data().avatar;
            if (imgElement) {
                watchUserAvatar(username, (newAvatar) => {
                    imgElement.src = newAvatar;
                });
            }
            return userDoc.data().avatar;
        }
    } catch (err) {}
    
    if (imgElement) {
        watchUserAvatar(username, (newAvatar) => {
            imgElement.src = newAvatar;
        });
    }
    return "avatar1.png";
}

function loadMessagesFeed() {
    if (unsubscribeMessages) unsubscribeMessages();

    renderedMessageIds.clear();
    messagesContainer.innerHTML = "";
    isInitialLoad = true;

    if (currentChatRoom !== "global") {
        chatRoomTitle.innerHTML = `<span style="display: flex; align-items: center; gap: 8px;"><img id="dm-header-avatar" src="avatar1.png" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;" /> DM with @${sanitizeMessageHTML(currentChatRoom)}</span>`;
        const dmHeaderAvatarImg = document.getElementById("dm-header-avatar");
        getLiveUserAvatar(currentChatRoom, dmHeaderAvatarImg).then(av => {
            if (dmHeaderAvatarImg) dmHeaderAvatarImg.src = av;
        });
    } else {
        chatRoomTitle.textContent = "global chat";
    }

    const q = query(collection(db, "messages"), orderBy("timestamp", "desc"), limit(50));
    
    unsubscribeMessages = onSnapshot(q, async (snapshot) => {
        const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 300;
        
        let docsArray = snapshot.docs.reverse();
        let hasNewMessages = false;

        for (const docSnap of docsArray) {
            const msgId = docSnap.id;
            const msg = docSnap.data();

            let matchesRoom = false;
            if (currentChatRoom === "global") {
                matchesRoom = !msg.room || msg.room === "global";
            } else {
                const expectedDM = [currentUsername, currentChatRoom].sort().join("_dm_");
                matchesRoom = msg.room === expectedDM || 
                              (msg.recipient === currentUsername && msg.username === currentChatRoom) || 
                              (msg.recipient === currentChatRoom && msg.username === currentUsername);
            }

            if (!matchesRoom) continue;

            if (!renderedMessageIds.has(msgId)) {
                renderedMessageIds.add(msgId);
                hasNewMessages = true;

                const isSent = msg.username === currentUsername;
                const div = document.createElement("div");
                div.className = `msg ${isSent ? 'sent' : 'received'}`;
                div.style.position = "relative";
                const readableTime = formatMessageTime(msg.timestamp);

                let contentHTML = "";
                if (msg.mediaUrl || msg.imageUrl) {
                    const mediaPath = msg.mediaUrl || msg.imageUrl;
                    const isVideo = msg.mediaType === "video" || mediaPath.endsWith(".mp4");
                    const isAvatarEmoji = mediaPath.includes("avatar") && !mediaPath.startsWith("http");

                    if (isVideo) {
                        contentHTML = `<video src="${mediaPath}" autoplay loop muted playsinline disablepictureinpicture style="max-width:320px; width:100%; border-radius:8px; display:block; pointer-events:none; user-select:none;"></video>`;
                    } else if (isAvatarEmoji) {
                        contentHTML = `<img src="${mediaPath}" class="inline-avatar-emoji" alt="emoji" />`;
                    } else {
                        contentHTML = `<img src="${mediaPath}" style="max-width:280px; width:100%; border-radius:8px; display:block;" />`;
                    }
                } else {
                    contentHTML = sanitizeMessageHTML(msg.text || "");
                }

                let replyHTML = "";
                if (msg.replyTo) {
                    const snippetText = (msg.replyTo.text || "").length > 40 ? msg.replyTo.text.substring(0, 40) + "..." : (msg.replyTo.text || "");
                    replyHTML = `
                        <div class="msg-reply-snippet" style="font-size: 11px; opacity: 0.75; border-left: 2px solid var(--primary-color); padding-left: 6px; margin-bottom: 4px;">
                            Replying to <b>@${sanitizeMessageHTML(msg.replyTo.username)}</b>: ${sanitizeMessageHTML(snippetText)}
                        </div>
                    `;
                }

                const avatarImgElement = document.createElement("img");
                avatarImgElement.className = "msg-avatar-img";
                avatarImgElement.alt = "Avatar";
                avatarImgElement.src = "avatar1.png";

                const effectiveAvatar = await getLiveUserAvatar(msg.username, avatarImgElement);
                avatarImgElement.src = effectiveAvatar;

                // FIXED: Sent messages have 3 dots on the left of the message bubble with gap spacing, matching the user's exact specification
                if (isSent) {
                    div.innerHTML = `
                        <div class="msg-options-container" style="display: flex; align-items: center; margin-right: 12px; margin-top: 24px; position: relative;">
                            <button class="msg-three-dots-btn" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 16px; font-weight: bold; padding: 2px 6px; line-height: 1;" title="Options">︙</button>
                            <div class="msg-dropdown-menu hidden" style="position: absolute; right: 0; top: 22px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 20; display: none; min-width: 90px; padding: 4px 0;">
                                <button class="msg-reply-option-btn" style="width: 100%; text-align: left; background: none; border: none; padding: 6px 12px; font-size: 12px; color: var(--text-color); cursor: pointer;">Reply</button>
                            </div>
                        </div>
                        <div class="msg-content" style="position: relative; display: flex; align-items: flex-start;">
                            <div style="flex: 1; min-width: 0;">
                                <div class="msg-header" style="justify-content: flex-end;">
                                    <span class="msg-time">${readableTime}</span>
                                </div>
                                ${replyHTML}
                                <div class="msg-bubble">${contentHTML}</div>
                            </div>
                        </div>
                        <div class="avatar-slot" style="display:inline-flex;"></div>
                    `;
                } else {
                    div.innerHTML = `
                        <div class="avatar-slot" style="display:inline-flex;"></div>
                        <div class="msg-content" style="position: relative; display: flex; align-items: flex-start;">
                            <div style="flex: 1; min-width: 0;">
                                <div class="msg-header">
                                    <span class="msg-author">${renderUsernameWithCrown(msg.username)}</span>
                                    <span class="msg-time">${readableTime}</span>
                                </div>
                                ${replyHTML}
                                <div class="msg-bubble">${contentHTML}</div>
                            </div>
                            <div class="msg-options-container" style="display: flex; align-items: center; margin-left: 12px; margin-top: 24px; position: relative;">
                                <button class="msg-three-dots-btn" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 16px; font-weight: bold; padding: 2px 6px; line-height: 1;" title="Options">︙</button>
                                <div class="msg-dropdown-menu hidden" style="position: absolute; left: 0; top: 22px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 20; display: none; min-width: 90px; padding: 4px 0;">
                                    <button class="msg-reply-option-btn" style="width: 100%; text-align: left; background: none; border: none; padding: 6px 12px; font-size: 12px; color: var(--text-color); cursor: pointer;">Reply</button>
                                </div>
                            </div>
                        </div>
                    `;
                }

                div.querySelector(".avatar-slot").appendChild(avatarImgElement);

                const dotsBtn = div.querySelector(".msg-three-dots-btn");
                const dropdownMenu = div.querySelector(".msg-dropdown-menu");
                const replyOptionBtn = div.querySelector(".msg-reply-option-btn");

                dotsBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    document.querySelectorAll(".msg-dropdown-menu").forEach(menu => {
                        if (menu !== dropdownMenu) {
                            menu.classList.add("hidden");
                            menu.style.display = "none";
                        }
                    });
                    const isHidden = dropdownMenu.classList.contains("hidden");
                    if (isHidden) {
                        dropdownMenu.classList.remove("hidden");
                        dropdownMenu.style.display = "block";
                    } else {
                        dropdownMenu.classList.add("hidden");
                        dropdownMenu.style.display = "none";
                    }
                });

                replyOptionBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    dropdownMenu.classList.add("hidden");
                    dropdownMenu.style.display = "none";
                    if (currentUsername === "Guest") return;
                    replyingToMessage = msg;
                    replyPreviewText.innerHTML = `Replying to <b>@${sanitizeMessageHTML(msg.username)}</b>: ${sanitizeMessageHTML(msg.text || msg.mediaType || "Attachment")}`;
                    replyPreviewBar.classList.remove("hidden");
                    replyPreviewBar.style.display = "flex";
                    messageInput.focus();
                });

                div.querySelectorAll(".msg-avatar-img, .msg-author").forEach(el => {
                    el.addEventListener("click", () => openUserProfileModal(msg.username));
                });

                messagesContainer.appendChild(div);
            }
        }

        if (isInitialLoad) {
            scrollToBottom(false);
            isInitialLoad = false;
        } else if (hasNewMessages && isNearBottom) {
            scrollToBottom(true);
        }
    });
}

document.addEventListener("click", () => {
    document.querySelectorAll(".msg-dropdown-menu").forEach(menu => {
        menu.classList.add("hidden");
        menu.style.display = "none";
    });
});

async function openUserProfileModal(username) {
    viewingProfileUsername = username;
    viewUserName.innerHTML = renderUsernameWithCrown(username);
    viewUserAvatar.src = "avatar1.png";
    viewUserBio.textContent = "Loading bio...";
    profileFriendActionBtn.textContent = "Send Friend Request";
    profileFriendActionBtn.disabled = false;

    try {
        const userDoc = await getDoc(doc(db, "users", username));
        if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.avatar) viewUserAvatar.src = data.avatar;
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
        for (const reqUser of requests) {
            const avatarUrl = await getLiveUserAvatar(reqUser);
            const row = document.createElement("div");
            row.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--card-bg); border-radius: var(--radius-sm); border: 1px solid var(--border-color);";
            row.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${avatarUrl}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;" />
                    <span>${sanitizeMessageHTML(reqUser)}</span>
                </div>
                <button class="btn btn-primary" style="padding: 4px 10px; font-size: 12px;">Accept</button>
            `;
            row.querySelector("button").addEventListener("click", () => acceptFriendRequest(reqUser));
            pendingRequestsContainer.appendChild(row);
        }
    }

    if (friends.length === 0) {
        friendsListContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No friends added yet.</p>`;
    } else {
        for (const friend of friends) {
            const avatarUrl = await getLiveUserAvatar(friend);
            const row = document.createElement("div");
            row.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--card-bg); border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer;";
            
            // FIXED: Added circular user PFP next to their name in the DM tab list view as requested
            row.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${avatarUrl}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;" />
                    <span style="font-weight: 600;">DM @${sanitizeMessageHTML(friend)}</span>
                </div>
                <span style="font-size: 12px; color: var(--success);">Connected</span>
            `;
            row.addEventListener("click", () => openDirectMessage(friend));
            friendsListContainer.appendChild(row);
        }
    }
}

function openDirectMessage(friendName) {
    currentChatRoom = friendName;
    chatRoomTitle.textContent = `DM with @${friendName}`;
    exitDmBtn.classList.remove("hidden");
    exitDmBtn.style.display = "inline-block";
    if (photoBtn) photoBtn.classList.remove("hidden");
    friendsSection.classList.add("hidden");
    globalChatSection.classList.remove("hidden");
    loadMessagesFeed();
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