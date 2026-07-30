/**
 * ==========================================================================
 * SimpleChat Enterprise Production JavaScript Application Engine
 * Expanded Architecture - Comprehensive Feature Set & Event Controllers
 * Target Line Count: ~900+ lines of robust, modular code
 * ==========================================================================
 */

'use strict';

const SimpleChatApp = (function() {
    
    // Application Core State Management
    const state = {
        currentUser: {
            username: 'matutbanana2',
            tag: '#0001',
            avatar: 'icon.png',
            status: 'online',
            userId: 'usr-local-root',
            role: 'Enterprise Administrator',
            joinedDate: 'January 2026'
        },
        settings: {
            starDensity: 'medium',
            soundEffects: true,
            audioVolume: 70,
            theme: 'dark-theme',
            notificationsEnabled: true,
            autoScroll: true,
            encryptionLevel: 'AES-256-GCM'
        },
        activeView: 'global-chat',
        isDMsOpen: false,
        activeModal: null,
        audioPlaying: false,
        activeChannel: 'global-chat-main',
        friendsList: [
            { id: 'usr-101', name: 'User One', status: 'online', activity: 'Playing SimpleChat Studio', avatar: 'icon.png' },
            { id: 'usr-102', name: 'User Two', status: 'idle', activity: 'Away from keyboard', avatar: 'icon.png' },
            { id: 'usr-103', name: 'User Three', status: 'online', activity: 'Coding something awesome', avatar: 'icon.png' },
            { id: 'usr-104', name: 'User Four', status: 'offline', activity: 'Offline 3h ago', avatar: 'icon.png' }
        ],
        messages: [
            {
                id: 'msg-001',
                author: 'matutbanana2',
                avatar: 'icon.png',
                timestamp: '10:15 PM',
                text: 'Yo! Welcome to the revamped SimpleChat UI. This is fully custom built without any template boilerplate.',
                reactions: {}
            },
            {
                id: 'msg-002',
                author: 'matutbanana2',
                avatar: 'icon.png',
                timestamp: '4:30 PM',
                text: 'Check out this live asset render:',
                image: 'https://images.unsplash.com/photo-1534361960057-19889db9621e?w=400',
                reactions: {}
            },
            {
                id: 'msg-003',
                author: 'yeinobanaya',
                avatar: 'icon.png',
                timestamp: '9:56 PM',
                text: 'Dude, this new layout matches the mockup screenshot precisely! Amazing work.',
                reactions: { '😡': 1 }
            }
        ]
    };

    // Comprehensive DOM Element Reference Cache Repository
    let DOM = {};

    function cacheDOMReferences() {
        DOM.starCanvas = document.getElementById('starCanvas');
        DOM.constellationCanvas = document.getElementById('particleConstellationCanvas');
        DOM.appRootContainer = document.getElementById('app-root-container');
        DOM.applicationHeader = document.getElementById('application-header');
        DOM.userProfileBadge = document.getElementById('userProfileBadge');
        DOM.navUsernameDisplay = document.getElementById('navUsernameDisplay');
        DOM.networkStatusPill = document.getElementById('networkStatusPill');
        DOM.globalSearchTriggerBtn = document.getElementById('globalSearchTriggerBtn');
        DOM.audioEngineToggleBtn = document.getElementById('audioEngineToggleBtn');
        DOM.discordInviteLinkBtn = document.getElementById('discordInviteLinkBtn');
        DOM.musicPlayerHeaderBtn = document.getElementById('musicPlayerHeaderBtn');
        DOM.sessionLogoutBtn = document.getElementById('sessionLogoutBtn');
        DOM.centralWorkspaceFrame = document.getElementById('centralWorkspaceFrame');
        DOM.frameWindowTitlebar = document.getElementById('frameWindowTitlebar');
        DOM.titlebarAppLogo = document.getElementById('titlebarAppLogo');
        DOM.titlebarAppTitleText = document.getElementById('titlebarAppTitleText');
        DOM.frameContentViewport = document.getElementById('frameContentViewport');
        DOM.globalChatFeedSection = document.getElementById('globalChatFeedSection');
        DOM.chatMessagesContainer = document.getElementById('chatMessagesContainer');
        DOM.systemWelcomeBanner = document.getElementById('systemWelcomeBanner');
        DOM.typingIndicatorBar = document.getElementById('typingIndicatorBar');
        DOM.chatInputSubmissionArea = document.getElementById('chatInputSubmissionArea');
        DOM.messageComposerForm = document.getElementById('messageComposerForm');
        DOM.attachFileBtn = document.getElementById('attachFileBtn');
        DOM.emojiPickerToggleBtn = document.getElementById('emojiPickerToggleBtn');
        DOM.messageInputTextField = document.getElementById('messageInputTextField');
        DOM.messageSendActionBtn = document.getElementById('messageSendActionBtn');
        DOM.friendsOverlayPanel = document.getElementById('friendsOverlayPanel');
        DOM.openDMsOverlayBtn = document.getElementById('openDMsOverlayBtn');
        DOM.closeDMsOverlayBtn = document.getElementById('closeDMsOverlayBtn');
        DOM.friendsSearchInput = document.getElementById('friendsSearchInput');
        DOM.overlayFriendsListContainer = document.getElementById('overlayFriendsListContainer');
        DOM.modalContainerRoot = document.getElementById('modalContainerRoot');
        DOM.musicPlayerModalDialog = document.getElementById('musicPlayerModalDialog');
        DOM.settingsModalDialog = document.getElementById('settingsModalDialog');
        DOM.closeMusicModalBtn = document.getElementById('closeMusicModalBtn');
        DOM.closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
        DOM.audioPlayPauseBtn = document.getElementById('audioPlayPauseBtn');
        DOM.audioVolumeSlider = document.getElementById('audioVolumeSlider');
        DOM.starDensitySelect = document.getElementById('starDensitySelect');
        DOM.soundEffectsToggle = document.getElementById('soundEffectsToggle');
        DOM.triggerGlobalChatPanel = document.getElementById('triggerGlobalChatPanel');
        DOM.openFavoritesPanelBtn = document.getElementById('openFavoritesPanelBtn');
        DOM.openSettingsPanelBtn = document.getElementById('openSettingsPanelBtn');
    }

    // ==========================================================================
    // Advanced Starfield Animation & Particle Engine
    // ==========================================================================
    let starCtx, constellationCtx;
    let starsArray = [];
    let animationFrameId = null;

    function initStarfieldEngine() {
        if (!DOM.starCanvas) return;
        starCtx = DOM.starCanvas.getContext('2d');
        constellationCtx = DOM.constellationCanvas ? DOM.constellationCanvas.getContext('2d') : null;

        resizeCanvases();
        window.addEventListener('resize', resizeCanvases);

        generateStarParticles();
        runAnimationLoop();
    }

    function resizeCanvases() {
        if (!DOM.starCanvas) return;
        DOM.starCanvas.width = window.innerWidth;
        DOM.starCanvas.height = window.innerHeight;
        if (DOM.constellationCanvas) {
            DOM.constellationCanvas.width = window.innerWidth;
            DOM.constellationCanvas.height = window.innerHeight;
        }
    }

    function generateStarParticles() {
        starsArray = [];
        let count = 60;
        if (state.settings.starDensity === 'low') count = 30;
        if (state.settings.starDensity === 'high') count = 120;

        for (let i = 0; i < count; i++) {
            starsArray.push({
                x: Math.random() * DOM.starCanvas.width,
                y: Math.random() * DOM.starCanvas.height,
                radius: Math.random() * 1.6 + 0.4,
                speed: Math.random() * 0.4 + 0.1,
                alpha: Math.random() * 0.8 + 0.2,
                pulseSpeed: Math.random() * 0.02 + 0.005
            });
        }
    }

    function runAnimationLoop() {
        if (!starCtx) return;
        starCtx.clearRect(0, 0, DOM.starCanvas.width, DOM.starCanvas.height);
        starCtx.fillStyle = '#ffffff';

        starsArray.forEach(star => {
            star.alpha += Math.sin(Date.now() * star.pulseSpeed) * 0.005;
            star.alpha = Math.max(0.1, Math.min(1, star.alpha));

            starCtx.globalAlpha = star.alpha;
            starCtx.beginPath();
            starCtx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            starCtx.fill();

            // Downward falling motion simulation
            star.y += star.speed;
            if (star.y > DOM.starCanvas.height) {
                star.y = 0;
                star.x = Math.random() * DOM.starCanvas.width;
            }
        });

        animationFrameId = requestAnimationFrame(runAnimationLoop);
    }

    // ==========================================================================
    // UI Event Handlers, Navigation & Interaction Controllers
    // ==========================================================================
    function bindEventListeners() {
        // Toggle Friends/DMs Overlay Panel
        if (DOM.openDMsOverlayBtn) {
            DOM.openDMsOverlayBtn.addEventListener('click', () => {
                toggleDMsOverlay(true);
                playUiClickSound();
            });
        }

        if (DOM.closeDMsOverlayBtn) {
            DOM.closeDMsOverlayBtn.addEventListener('click', () => {
                toggleDMsOverlay(false);
                playUiClickSound();
            });
        }

        // Sidebar Navigation Trigger Switchers
        if (DOM.triggerGlobalChatPanel) {
            DOM.triggerGlobalChatPanel.addEventListener('click', () => {
                switchActiveWorkspaceView('global-chat');
                playUiClickSound();
            });
        }

        // Message Composer Form Submission Handler
        if (DOM.messageComposerForm) {
            DOM.messageComposerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                handleOutgoingMessageSubmission();
            });
        }

        // Music Modal Trigger Handler
        if (DOM.musicPlayerHeaderBtn) {
            DOM.musicPlayerHeaderBtn.addEventListener('click', () => {
                openModal('music');
                playUiClickSound();
            });
        }

        // Settings Modal Trigger Handler
        if (DOM.openSettingsPanelBtn) {
            DOM.openSettingsPanelBtn.addEventListener('click', () => {
                openModal('settings');
                playUiClickSound();
            });
        }

        // Audio Engine Toggle Header Button
        if (DOM.audioEngineToggleBtn) {
            DOM.audioEngineToggleBtn.addEventListener('click', () => {
                toggleGlobalAudioState();
            });
        }

        // Close Modals Action Listeners
        if (DOM.closeMusicModalBtn) DOM.closeMusicModalBtn.addEventListener('click', closeModal);
        if (DOM.closeSettingsModalBtn) DOM.closeSettingsModalBtn.addEventListener('click', closeModal);
        
        if (DOM.modalContainerRoot) {
            DOM.modalContainerRoot.addEventListener('click', (e) => {
                if (e.target === DOM.modalContainerRoot) {
                    closeModal();
                }
            });
        }

        // Audio Modal Play/Pause Control Button
        if (DOM.audioPlayPauseBtn) {
            DOM.audioPlayPauseBtn.addEventListener('click', () => {
                toggleStreamPlayback();
            });
        }

        // Audio Volume Slider Controller
        if (DOM.audioVolumeSlider) {
            DOM.audioVolumeSlider.addEventListener('input', (e) => {
                state.settings.audioVolume = e.target.value;
            });
        }

        // Settings Configuration Form Controllers
        if (DOM.starDensitySelect) {
            DOM.starDensitySelect.addEventListener('change', (e) => {
                state.settings.starDensity = e.target.value;
                generateStarParticles();
            });
        }

        if (DOM.soundEffectsToggle) {
            DOM.soundEffectsToggle.addEventListener('change', (e) => {
                state.settings.soundEffects = e.target.checked;
            });
        }

        // Friends Search Filtering Controller
        if (DOM.friendsSearchInput) {
            DOM.friendsSearchInput.addEventListener('input', (e) => {
                filterFriendsListQuery(e.target.value);
            });
        }

        // Session Termination Handler
        if (DOM.sessionLogoutBtn) {
            DOM.sessionLogoutBtn.addEventListener('click', () => {
                handleSessionTermination();
            });
        }

        // Global Keyboard Shortcut Listener
        window.addEventListener('keydown', (e) => {
            handleGlobalKeyboardShortcuts(e);
        });
    }

    function toggleDMsOverlay(isOpen) {
        state.isDMsOpen = isOpen;
        if (DOM.friendsOverlayPanel) {
            if (isOpen) {
                DOM.friendsOverlayPanel.classList.add('open');
                if (DOM.openDMsOverlayBtn) DOM.openDMsOverlayBtn.classList.add('active');
            } else {
                DOM.friendsOverlayPanel.classList.remove('open');
                if (DOM.openDMsOverlayBtn) DOM.openDMsOverlayBtn.classList.remove('active');
            }
        }
    }

    function switchActiveWorkspaceView(viewName) {
        state.activeView = viewName;
        // Highlight corresponding sidebar button
        document.querySelectorAll('.sidebar-trigger-icon-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        if (viewName === 'global-chat' && DOM.triggerGlobalChatPanel) {
            DOM.triggerGlobalChatPanel.classList.add('active');
        }
    }

    function handleOutgoingMessageSubmission() {
        if (!DOM.messageInputTextField) return;
        const textValue = DOM.messageInputTextField.value.trim();
        if (!textValue) return;

        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const newMessage = {
            id: 'msg-' + Date.now(),
            author: state.currentUser.username,
            avatar: state.currentUser.avatar,
            timestamp: currentTime,
            text: textValue,
            reactions: {}
        };

        state.messages.push(newMessage);
        renderNewMessageNode(newMessage);

        DOM.messageInputTextField.value = '';
        scrollToBottomChat();
        simulateIncomingAutoResponseIfNeeded(textValue);
    }

    function renderNewMessageNode(msg) {
        if (!DOM.chatMessagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message-item incoming-msg';
        messageDiv.setAttribute('data-message-id', msg.id);

        messageDiv.innerHTML = `
            <div class="msg-author-avatar-col">
                <img src="${escapeHTML(msg.avatar)}" alt="User Avatar" class="msg-avatar-thumb">
            </div>
            <div class="msg-content-col">
                <div class="msg-meta-header">
                    <span class="msg-author-name">${escapeHTML(msg.author)}</span>
                    <span class="msg-timestamp">${escapeHTML(msg.timestamp)}</span>
                </div>
                <div class="msg-text-body">
                    ${escapeHTML(msg.text)}
                </div>
            </div>
        `;

        DOM.chatMessagesContainer.appendChild(messageDiv);
    }

    function simulateIncomingAutoResponseIfNeeded(userText) {
        if (!DOM.typingIndicatorBar) return;
        
        setTimeout(() => {
            DOM.typingIndicatorBar.classList.remove('hidden');
            scrollToBottomChat();

            setTimeout(() => {
                DOM.typingIndicatorBar.classList.add('hidden');
                
                const autoReplyText = `Echo response to: "${userText.substring(0, 24)}..." - Secure channel active.`;
                const replyMessage = {
                    id: 'msg-' + Date.now(),
                    author: 'SimpleChat AI Guard',
                    avatar: 'icon.png',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    text: autoReplyText,
                    reactions: {}
                };
                state.messages.push(replyMessage);
                renderNewMessageNode(replyMessage);
                scrollToBottomChat();
            }, 1800);
        }, 800);
    }

    function scrollToBottomChat() {
        if (DOM.chatMessagesContainer && state.settings.autoScroll) {
            DOM.chatMessagesContainer.scrollTop = DOM.chatMessagesContainer.scrollHeight;
        }
    }

    function filterFriendsListQuery(queryStr) {
        const query = queryStr.toLowerCase().trim();
        const cards = document.querySelectorAll('.friend-circle-card-item');
        
        cards.forEach(card => {
            const nameEl = card.querySelector('.friend-display-name');
            const statusEl = card.querySelector('.friend-status-text');
            if (!nameEl || !statusEl) return;

            const nameText = nameEl.textContent.toLowerCase();
            const statusText = statusEl.textContent.toLowerCase();

            if (nameText.includes(query) || statusText.includes(query)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    function openModal(modalType) {
        if (!DOM.modalContainerRoot) return;
        DOM.modalContainerRoot.classList.add('active');
        
        if (modalType === 'music' && DOM.musicPlayerModalDialog) {
            DOM.musicPlayerModalDialog.classList.add('active');
            if (DOM.settingsModalDialog) DOM.settingsModalDialog.classList.remove('active');
        } else if (modalType === 'settings' && DOM.settingsModalDialog) {
            DOM.settingsModalDialog.classList.add('active');
            if (DOM.musicPlayerModalDialog) DOM.musicPlayerModalDialog.classList.remove('active');
        }
        state.activeModal = modalType;
    }

    function closeModal() {
        if (!DOM.modalContainerRoot) return;
        DOM.modalContainerRoot.classList.remove('active');
        if (DOM.musicPlayerModalDialog) DOM.musicPlayerModalDialog.classList.remove('active');
        if (DOM.settingsModalDialog) DOM.settingsModalDialog.classList.remove('active');
        state.activeModal = null;
    }

    function toggleGlobalAudioState() {
        state.audioPlaying = !state.audioPlaying;
        if (DOM.audioEngineToggleBtn) {
            if (state.audioPlaying) {
                DOM.audioEngineToggleBtn.style.borderColor = '#4ade80';
                DOM.audioEngineToggleBtn.style.color = '#4ade80';
            } else {
                DOM.audioEngineToggleBtn.style.borderColor = '';
                DOM.audioEngineToggleBtn.style.color = '';
            }
        }
    }

    function toggleStreamPlayback() {
        if (!DOM.audioPlayPauseBtn) return;
        state.audioPlaying = !state.audioPlaying;
        if (state.audioPlaying) {
            DOM.audioPlayPauseBtn.textContent = 'Pause Stream';
            DOM.audioPlayPauseBtn.style.backgroundColor = '#22c55e';
        } else {
            DOM.audioPlayPauseBtn.textContent = 'Play Stream';
            DOM.audioPlayPauseBtn.style.backgroundColor = '';
        }
    }

    function playUiClickSound() {
        if (!state.settings.soundEffects) return;
        // Synthesizer click simulation stub
    }

    function handleSessionTermination() {
        if (confirm('Are you sure you want to terminate your current enterprise session?')) {
            alert('Session successfully terminated. Refreshing portal state...');
            window.location.reload();
        }
    }

    function handleGlobalKeyboardShortcuts(e) {
        // Escape key closes modals or overlays
        if (e.key === 'Escape') {
            if (state.activeModal) {
                closeModal();
            } else if (state.isDMsOpen) {
                toggleDMsOverlay(false);
            }
        }
        // Ctrl + K or Cmd + K focuses search or message input
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (DOM.messageInputTextField) {
                DOM.messageInputTextField.focus();
            }
        }
    }

    function escapeHTML(str) {
        return String(str).replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

    // Public Application Initialization Controller Hook
    function init() {
        cacheDOMReferences();
        initStarfieldEngine();
        bindEventListeners();
        scrollToBottomChat();
        console.info('SimpleChat Enterprise Production Application Initialized Successfully. Version 4.5.1 active.');
    }

    return {
        init: init,
        getState: () => state,
        toggleDMsOverlay: toggleDMsOverlay,
        openModal: openModal,
        closeModal: closeModal
    };

})();

// Auto-boot application engine execution on DOM content ready
document.addEventListener('DOMContentLoaded', () => {
    SimpleChatApp.init();
});