// ========== Firebase Configuration ==========
// Replace with your Firebase config
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
let app, auth, db, storage;

try {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    storage = firebase.storage();
} catch (error) {
    console.log('Firebase not initialized - running in demo mode');
}

// ========== Global State ==========
let currentUser = null;
let currentFilter = 'all';
let profiles = [];
let currentProfileIndex = 0;
let matches = [];
let conversations = [];
let currentChat = null;
let interests = [];

// ========== Demo Data ==========
const demoProfiles = [
    {
        id: '1',
        firstName: 'Sarah',
        lastName: 'Wanjiku',
        age: 21,
        gender: 'female',
        bio: 'Computer Science student. Love coding, music, and late-night study sessions. Looking for friends to explore campus with! 🎵💻',
        course: 'Computer Science',
        year: '3',
        intents: ['friendship', 'party'],
        interests: ['Music', 'Coding', 'Movies', 'Coffee']
    },
    {
        id: '2',
        firstName: 'Brian',
        lastName: 'Ochieng',
        age: 22,
        gender: 'male',
        bio: 'Business student by day, DJ by night. If you love good vibes and great conversations, let\'s connect! 🎧',
        course: 'Business Administration',
        year: '4',
        intents: ['party', 'relationship'],
        interests: ['DJing', 'Football', 'Entrepreneurship', 'Travel']
    },
    {
        id: '3',
        firstName: 'Grace',
        lastName: 'Akinyi',
        age: 20,
        gender: 'female',
        bio: 'Nursing student with a passion for helping others. Looking for meaningful connections and someone to share memes with 😂',
        course: 'Nursing',
        year: '2',
        intents: ['relationship', 'friendship'],
        interests: ['Healthcare', 'Reading', 'Cooking', 'Hiking']
    },
    {
        id: '4',
        firstName: 'Kevin',
        lastName: 'Mwangi',
        age: 23,
        gender: 'male',
        bio: 'Engineering student. Into fitness, tech, and discovering new food spots around Maseno. Let\'s grab lunch! 🍔',
        course: 'Electrical Engineering',
        year: '4',
        intents: ['casual', 'friendship'],
        interests: ['Gym', 'Technology', 'Food', 'Gaming']
    },
    {
        id: '5',
        firstName: 'Faith',
        lastName: 'Njeri',
        age: 21,
        gender: 'female',
        bio: 'Arts student who loves painting and poetry. Looking for creative souls and good vibes only ✨',
        course: 'Fine Arts',
        year: '3',
        intents: ['relationship', 'friendship'],
        interests: ['Art', 'Poetry', 'Music', 'Nature']
    },
    {
        id: '6',
        firstName: 'Dennis',
        lastName: 'Kiprop',
        age: 22,
        gender: 'male',
        bio: 'Law student and aspiring activist. Love deep conversations, debate, and making a difference 💪',
        course: 'Law',
        year: '3',
        intents: ['relationship', 'party'],
        interests: ['Debate', 'Politics', 'Reading', 'Basketball']
    }
];

const demoMatches = [
    { ...demoProfiles[0], matchedAt: new Date() },
    { ...demoProfiles[2], matchedAt: new Date() },
    { ...demoProfiles[4], matchedAt: new Date() }
];

const demoConversations = [
    {
        id: 'conv1',
        user: demoProfiles[0],
        messages: [
            { text: 'Hey! I saw we both love coding 💻', sent: false, time: '10:30 AM' },
            { text: 'Hi Sarah! Yes! What languages do you work with?', sent: true, time: '10:32 AM' },
            { text: 'Mainly Python and JavaScript. You?', sent: false, time: '10:33 AM' }
        ],
        lastMessage: 'Mainly Python and JavaScript. You?',
        unread: 2,
        time: '10:33 AM'
    },
    {
        id: 'conv2',
        user: demoProfiles[2],
        messages: [
            { text: 'Hi! Nice to match with you 😊', sent: true, time: '9:15 AM' },
            { text: 'Hey! Same here! How\'s your day going?', sent: false, time: '9:20 AM' }
        ],
        lastMessage: 'Hey! Same here! How\'s your day going?',
        unread: 1,
        time: '9:20 AM'
    },
    {
        id: 'conv3',
        user: demoProfiles[4],
        messages: [
            { text: 'Your art looks amazing!', sent: true, time: 'Yesterday' },
            { text: 'Thank you so much! 🎨', sent: false, time: 'Yesterday' }
        ],
        lastMessage: 'Thank you so much! 🎨',
        unread: 0,
        time: 'Yesterday'
    }
];

// ========== Page Navigation ==========
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// ========== Tab Navigation ==========
function switchTab(tabName) {
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Load tab-specific data
    if (tabName === 'discover') {
        loadProfiles();
    } else if (tabName === 'matches') {
        loadMatches();
    } else if (tabName === 'messages') {
        loadConversations();
    }
}

// ========== Authentication ==========
function handleRegister(event) {
    event.preventDefault();
    
    const firstName = document.getElementById('reg-firstname').value;
    const lastName = document.getElementById('reg-lastname').value;
    const email = document.getElementById('reg-email').value;
    const age = document.getElementById('reg-age').value;
    const gender = document.getElementById('reg-gender').value;
    const password = document.getElementById('reg-password').value;
    
    // Get selected intents
    const intentCheckboxes = document.querySelectorAll('input[name="intent"]:checked');
    const intents = Array.from(intentCheckboxes).map(cb => cb.value);
    
    if (age < 18) {
        showToast('You must be 18 or older to use MasenoMeet', 'error');
        return;
    }
    
    if (intents.length === 0) {
        showToast('Please select at least one intent', 'error');
        return;
    }
    
    // Demo mode - simulate registration
    if (!auth) {
        currentUser = {
            uid: 'demo-user',
            email: email,
            firstName: firstName,
            lastName: lastName,
            age: age,
            gender: gender,
            intents: intents
        };
        
        showToast('Account created successfully!');
        enterApp();
        return;
    }
    
    // Firebase registration
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            // Save user profile to Firestore
            return db.collection('users').doc(user.uid).set({
                firstName: firstName,
                lastName: lastName,
                email: email,
                age: parseInt(age),
                gender: gender,
                intents: intents,
                interests: [],
                bio: '',
                course: '',
                year: '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            showToast('Account created successfully!');
            enterApp();
        })
        .catch((error) => {
            showToast(error.message, 'error');
        });
}

function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Demo mode
    if (!auth) {
        currentUser = {
            uid: 'demo-user',
            email: email,
            firstName: 'Demo',
            lastName: 'User'
        };
        
        showToast('Welcome back!');
        enterApp();
        return;
    }
    
    // Firebase login
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            showToast('Welcome back!');
            enterApp();
        })
        .catch((error) => {
            showToast(error.message, 'error');
        });
}

function googleSignIn() {
    if (!auth) {
        currentUser = {
            uid: 'demo-user',
            email: 'demo@maseno.ac.ke',
            firstName: 'Demo',
            lastName: 'User'
        };
        showToast('Signed in with Google!');
        enterApp();
        return;
    }
    
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            const user = result.user;
            
            // Check if user profile exists
            return db.collection('users').doc(user.uid).get();
        })
        .then((doc) => {
            if (!doc.exists) {
                // New user - redirect to complete profile
                showToast('Please complete your profile');
                showPage('register-page');
            } else {
                showToast('Welcome back!');
                enterApp();
            }
        })
        .catch((error) => {
            showToast(error.message, 'error');
        });
}

function logout() {
    if (auth) {
        auth.signOut();
    }
    currentUser = null;
    showPage('landing-page');
    showToast('Logged out successfully');
}

function enterApp() {
    showPage('app-page');
    loadProfiles();
    loadMatches();
    loadConversations();
    updateProfileDisplay();
}

// ========== Profile Management ==========
function updateProfileDisplay() {
    if (currentUser) {
        document.getElementById('profile-name').textContent = 
            `${currentUser.firstName || 'Demo'} ${currentUser.lastName || 'User'}`;
        document.getElementById('profile-info').textContent = 
            `${currentUser.age || 21} • ${currentUser.gender || 'Not specified'} • Maseno University`;
    }
}

function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!storage) {
        // Demo mode - show preview
        const reader = new FileReader();
        reader.onload = function(e) {
            const avatar = document.getElementById('profile-avatar');
            avatar.style.backgroundImage = `url(${e.target.result})`;
            avatar.style.backgroundSize = 'cover';
            avatar.querySelector('i').style.display = 'none';
        };
        reader.readAsDataURL(file);
        showToast('Profile photo updated!');
        return;
    }
    
    // Firebase upload
    const storageRef = storage.ref(`avatars/${currentUser.uid}`);
    storageRef.put(file)
        .then((snapshot) => snapshot.ref.getDownloadURL())
        .then((downloadURL) => {
            return db.collection('users').doc(currentUser.uid).update({
                photoURL: downloadURL
            });
        })
        .then(() => {
            showToast('Profile photo updated!');
        })
        .catch((error) => {
            showToast(error.message, 'error');
        });
}

function addInterest() {
    const input = document.getElementById('interest-input');
    const interest = input.value.trim();
    
    if (!interest) return;
    if (interests.includes(interest)) {
        showToast('Interest already added', 'error');
        return;
    }
    if (interests.length >= 10) {
        showToast('Maximum 10 interests allowed', 'error');
        return;
    }
    
    interests.push(interest);
    renderInterests();
    input.value = '';
}

function removeInterest(interest) {
    interests = interests.filter(i => i !== interest);
    renderInterests();
}

function renderInterests() {
    const container = document.getElementById('interests-tags');
    container.innerHTML = interests.map(interest => `
        <span class="interest-tag">
            ${interest}
            <button onclick="removeInterest('${interest}')">&times;</button>
        </span>
    `).join('');
}

function saveProfile(event) {
    event.preventDefault();
    
    const bio = document.getElementById('profile-bio').value;
    const course = document.getElementById('profile-course').value;
    const year = document.getElementById('profile-year').value;
    
    const intentCheckboxes = document.querySelectorAll('input[name="profile-intent"]:checked');
    const intents = Array.from(intentCheckboxes).map(cb => cb.value);
    
    if (!db) {
        showToast('Profile saved successfully!');
        return;
    }
    
    db.collection('users').doc(currentUser.uid).update({
        bio: bio,
        course: course,
        year: year,
        intents: intents,
        interests: interests
    })
    .then(() => {
        showToast('Profile saved successfully!');
    })
    .catch((error) => {
        showToast(error.message, 'error');
    });
}

// ========== Discover / Swipe ==========
function loadProfiles() {
    profiles = [...demoProfiles];
    currentProfileIndex = 0;
    renderCurrentCard();
    
    // Set up filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            filterProfiles();
        });
    });
}

function filterProfiles() {
    if (currentFilter === 'all') {
        profiles = [...demoProfiles];
    } else {
        profiles = demoProfiles.filter(p => p.intents.includes(currentFilter));
    }
    currentProfileIndex = 0;
    renderCurrentCard();
}

function renderCurrentCard() {
    const cardStack = document.getElementById('card-stack');
    
    if (currentProfileIndex >= profiles.length) {
        cardStack.innerHTML = `
            <div class="swipe-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <i class="fas fa-search" style="font-size: 60px; color: var(--gray); margin-bottom: 20px;"></i>
                <h3 style="color: var(--dark); margin-bottom: 10px;">No more profiles</h3>
                <p style="color: var(--gray);">Check back later for new people!</p>
            </div>
        `;
        return;
    }
    
    const profile = profiles[currentProfileIndex];
    const intentLabels = {
        friendship: 'Friendship',
        party: 'Party Buddy',
        relationship: 'Relationship',
        casual: 'Casual'
    };
    
    cardStack.innerHTML = `
        <div class="swipe-card" id="current-card">
            <div class="card-image">
                <i class="fas fa-user"></i>
                <div class="card-badge">
                    ${profile.intents.map(i => `<span>${intentLabels[i]}</span>`).join('')}
                </div>
            </div>
            <div class="card-info">
                <h3>${profile.firstName} ${profile.lastName} <span>• ${profile.age}</span></h3>
                <p>${profile.bio}</p>
                <div class="card-interests">
                    ${profile.interests.map(i => `<span>${i}</span>`).join('')}
                </div>
            </div>
        </div>
    `;
    
    // Add swipe gestures
    setupSwipeGestures();
}

function setupSwipeGestures() {
    const card = document.getElementById('current-card');
    if (!card) return;
    
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    
    card.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        card.style.transition = 'none';
    });
    
    card.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        currentX = e.clientX - startX;
        card.style.transform = `translateX(${currentX}px) rotate(${currentX * 0.05}deg)`;
    });
    
    card.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        card.style.transition = 'transform 0.3s ease';
        
        if (currentX > 100) {
            swipeCard('right');
        } else if (currentX < -100) {
            swipeCard('left');
        } else {
            card.style.transform = '';
        }
    });
    
    card.addEventListener('mouseleave', () => {
        if (isDragging) {
            isDragging = false;
            card.style.transition = 'transform 0.3s ease';
            card.style.transform = '';
        }
    });
    
    // Touch events for mobile
    card.addEventListener('touchstart', (e) => {
        isDragging = true;
        startX = e.touches[0].clientX;
        card.style.transition = 'none';
    });
    
    card.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentX = e.touches[0].clientX - startX;
        card.style.transform = `translateX(${currentX}px) rotate(${currentX * 0.05}deg)`;
    });
    
    card.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        card.style.transition = 'transform 0.3s ease';
        
        if (currentX > 100) {
            swipeCard('right');
        } else if (currentX < -100) {
            swipeCard('left');
        } else {
            card.style.transform = '';
        }
    });
}

function swipeCard(direction) {
    const card = document.getElementById('current-card');
    if (!card) return;
    
    card.classList.add('removing', direction === 'right' ? 'right' : 'left');
    
    if (direction === 'right' || direction === 'super') {
        // Like - check for match (simulate 30% match rate)
        if (Math.random() < 0.3) {
            setTimeout(() => {
                showMatch(profiles[currentProfileIndex]);
            }, 300);
        } else {
            showToast('Liked! 💕');
        }
    } else {
        showToast('Passed');
    }
    
    setTimeout(() => {
        currentProfileIndex++;
        renderCurrentCard();
    }, 300);
}

function showMatch(profile) {
    document.getElementById('match-name').textContent = profile.firstName;
    document.getElementById('match-modal').classList.add('active');
    
    // Add to matches
    matches.push({ ...profile, matchedAt: new Date() });
}

function closeModal() {
    document.getElementById('match-modal').classList.remove('active');
}

function startChat() {
    closeModal();
    switchTab('messages');
}

// ========== Matches ==========
function loadMatches() {
    matches = [...demoMatches];
    renderMatches();
}

function renderMatches() {
    const grid = document.getElementById('matches-grid');
    
    if (matches.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-heart" style="font-size: 60px; color: var(--gray); margin-bottom: 20px;"></i>
                <h3 style="color: var(--white); margin-bottom: 10px;">No matches yet</h3>
                <p style="color: var(--gray);">Keep swiping to find your people!</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = matches.map(match => `
        <div class="match-card" onclick="openChat('${match.id}')">
            <div class="match-card-image">
                <i class="fas fa-user"></i>
            </div>
            <div class="match-card-info">
                <h4>${match.firstName}, ${match.age}</h4>
                <p>${match.course} • Year ${match.year}</p>
                <button class="btn btn-primary" onclick="openChat('${match.id}'); event.stopPropagation();">
                    <i class="fas fa-comment"></i> Message
                </button>
            </div>
        </div>
    `).join('');
    
    // Update badge
    document.getElementById('matches-badge').textContent = matches.length;
}

// ========== Messages ==========
function loadConversations() {
    conversations = [...demoConversations];
    renderConversations();
}

function renderConversations() {
    const list = document.getElementById('conversations-list');
    
    let html = '<h2>Messages</h2>';
    
    if (conversations.length === 0) {
        html += `
            <div style="text-align: center; padding: 40px 20px;">
                <i class="fas fa-comments" style="font-size: 40px; color: var(--gray); margin-bottom: 16px;"></i>
                <p style="color: var(--gray);">No messages yet</p>
            </div>
        `;
    } else {
        html += conversations.map(conv => `
            <div class="conversation-item ${currentChat?.id === conv.id ? 'active' : ''}" 
                 onclick="openConversation('${conv.id}')">
                <div class="conversation-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="conversation-info">
                    <h4>${conv.user.firstName} ${conv.user.lastName}</h4>
                    <p>${conv.lastMessage}</p>
                </div>
                <div class="conversation-meta">
                    <span class="conversation-time">${conv.time}</span>
                    ${conv.unread > 0 ? `<span class="unread-badge">${conv.unread}</span>` : ''}
                </div>
            </div>
        `).join('');
    }
    
    list.innerHTML = html;
    
    // Update badge
    const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);
    document.getElementById('messages-badge').textContent = totalUnread || '';
}

function openChat(userId) {
    // Find existing conversation or create new one
    let conv = conversations.find(c => c.user.id === userId);
    
    if (!conv) {
        const user = [...demoProfiles, ...matches].find(p => p.id === userId);
        if (user) {
            conv = {
                id: `conv-${Date.now()}`,
                user: user,
                messages: [],
                lastMessage: 'Start a conversation!',
                unread: 0,
                time: 'Now'
            };
            conversations.unshift(conv);
        }
    }
    
    if (conv) {
        switchTab('messages');
        openConversation(conv.id);
    }
}

function openConversation(convId) {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    
    currentChat = conv;
    conv.unread = 0;
    
    renderConversations();
    renderChatWindow();
}

function renderChatWindow() {
    const chatWindow = document.getElementById('chat-window');
    
    if (!currentChat) {
        chatWindow.innerHTML = `
            <div class="chat-placeholder">
                <i class="fas fa-comments"></i>
                <p>Select a conversation to start chatting</p>
            </div>
        `;
        return;
    }
    
    chatWindow.innerHTML = `
        <div class="chat-header">
            <div class="conversation-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="conversation-info">
                <h4>${currentChat.user.firstName} ${currentChat.user.lastName}</h4>
                <p style="font-size: 12px;">Online</p>
            </div>
        </div>
        <div class="chat-messages" id="chat-messages">
            ${currentChat.messages.map(msg => `
                <div class="message ${msg.sent ? 'sent' : 'received'}">
                    ${msg.text}
                    <div class="message-time">${msg.time}</div>
                </div>
            `).join('')}
        </div>
        <div class="chat-input">
            <input type="text" id="message-input" placeholder="Type a message..." 
                   onkeypress="if(event.key === 'Enter') sendMessage()">
            <button onclick="sendMessage()">
                <i class="fas fa-paper-plane"></i>
            </button>
        </div>
    `;
    
    // Scroll to bottom
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    
    if (!text || !currentChat) return;
    
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    currentChat.messages.push({
        text: text,
        sent: true,
        time: time
    });
    
    currentChat.lastMessage = text;
    currentChat.time = time;
    
    input.value = '';
    renderChatWindow();
    renderConversations();
    
    // Simulate reply after 2 seconds
    setTimeout(() => {
        if (currentChat) {
            const replies = [
                'That sounds great! 😊',
                'Haha, I totally agree!',
                'Tell me more about that!',
                'That\'s so interesting!',
                'I\'d love to hear more!',
                'Same here! We should meet up sometime!'
            ];
            
            const reply = replies[Math.floor(Math.random() * replies.length)];
            const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            currentChat.messages.push({
                text: reply,
                sent: false,
                time: replyTime
            });
            
            currentChat.lastMessage = reply;
            currentChat.time = replyTime;
            currentChat.unread = 0;
            
            renderChatWindow();
            renderConversations();
        }
    }, 2000);
}

// ========== Notifications ==========
function showNotifications() {
    showToast('Notifications coming soon!');
}

// ========== Utility Functions ==========
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.parentElement.querySelector('.toggle-password');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const icon = toast.querySelector('i');
    
    toastMessage.textContent = message;
    
    if (type === 'error') {
        icon.className = 'fas fa-exclamation-circle';
        icon.style.color = 'var(--danger)';
    } else {
        icon.className = 'fas fa-check-circle';
        icon.style.color = 'var(--success)';
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========== Auth State Observer ==========
if (auth) {
    auth.onAuthStateChanged((user) => {
        if (user) {
            db.collection('users').doc(user.uid).get()
                .then((doc) => {
                    if (doc.exists) {
                        currentUser = { uid: user.uid, ...doc.data() };
                        enterApp();
                    }
                });
        }
    });
}

// ========== Initialize ==========
document.addEventListener('DOMContentLoaded', () => {
    // Add enter key support for interest input
    document.getElementById('interest-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addInterest();
        }
    });
});
