// ========== Firebase Configuration ==========
const firebaseConfig = {
    apiKey: "AIzaSyD9ngJMNKJ4B53MZFczCizdTlHlrMF1nuM",
    authDomain: "masenomeet.firebaseapp.com",
    projectId: "masenomeet",
    storageBucket: "masenomeet.firebasestorage.app",
    messagingSenderId: "144227368033",
    appId: "1:144227368033:web:ed798eb0fe09ffb4673e20",
    measurementId: "G-YSB64XZTQX"
};

// Initialize Firebase
let app, auth, db, storage;

try {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    storage = firebase.storage();
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// ========== Global State ==========
let currentUser = null;
let currentUserProfile = null;
let currentFilter = 'all';
let profiles = [];
let currentProfileIndex = 0;
let matches = [];
let conversations = [];
let currentChat = null;
let interests = [];
let isDarkTheme = true;
let isAdmin = false;
let unsubscribeMatches = null;
let unsubscribeMessages = null;

// Admin emails - ADD YOUR EMAIL HERE
const ADMIN_EMAILS = ['admin@masenomeet.com', 'your-email@gmail.com'];

// ========== Theme Management ==========
function initTheme() {
    const savedTheme = localStorage.getItem('masenoMeetTheme');
    if (savedTheme) {
        isDarkTheme = savedTheme === 'dark';
    }
    applyTheme();
}

function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    localStorage.setItem('masenoMeetTheme', isDarkTheme ? 'dark' : 'light');
    applyTheme();
    showToast(`Switched to ${isDarkTheme ? 'dark' : 'light'} mode`);
}

function applyTheme() {
    document.body.classList.toggle('light-theme', !isDarkTheme);
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        themeIcon.className = isDarkTheme ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// ========== Page Navigation ==========
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// ========== Tab Navigation ==========
function switchTab(tabName) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeLink) activeLink.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    if (tabName === 'discover') {
        loadProfiles();
    } else if (tabName === 'matches') {
        loadMatches();
    } else if (tabName === 'messages') {
        loadConversations();
    } else if (tabName === 'admin') {
        loadAdminData();
    }
}

// ========== Authentication ==========
function handleRegister(event) {
    event.preventDefault();
    
    const firstName = document.getElementById('reg-firstname').value.trim();
    const lastName = document.getElementById('reg-lastname').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const age = parseInt(document.getElementById('reg-age').value);
    const gender = document.getElementById('reg-gender').value;
    const password = document.getElementById('reg-password').value;
    
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

    const submitBtn = document.querySelector('#register-form button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    submitBtn.disabled = true;
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            return db.collection('users').doc(user.uid).set({
                firstName: firstName,
                lastName: lastName,
                email: email,
                age: age,
                gender: gender,
                intents: intents,
                interests: [],
                bio: '',
                course: '',
                year: '',
                photoURL: '',
                isActive: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            showToast('Account created successfully!');
        })
        .catch((error) => {
            showToast(error.message, 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        });
}

function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    const submitBtn = document.querySelector('#login-form button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
    submitBtn.disabled = true;
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            showToast('Welcome back!');
        })
        .catch((error) => {
            showToast(error.message, 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        });
}

function googleSignIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            const user = result.user;
            
            return db.collection('users').doc(user.uid).get().then((doc) => {
                if (!doc.exists) {
                    return db.collection('users').doc(user.uid).set({
                        firstName: user.displayName ? user.displayName.split(' ')[0] : 'User',
                        lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
                        email: user.email,
                        age: 18,
                        gender: '',
                        intents: ['friendship'],
                        interests: [],
                        bio: '',
                        course: '',
                        year: '',
                        photoURL: user.photoURL || '',
                        isActive: true,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastActive: firebase.firestore.FieldValue.serverTimestamp()
                    }).then(() => {
                        showToast('Welcome! Please complete your profile.');
                    });
                } else {
                    showToast('Welcome back!');
                }
            });
        })
        .catch((error) => {
            if (error.code !== 'auth/popup-closed-by-user') {
                showToast(error.message, 'error');
            }
        });
}

function logout() {
    if (unsubscribeMatches) unsubscribeMatches();
    if (unsubscribeMessages) unsubscribeMessages();
    
    auth.signOut().then(() => {
        currentUser = null;
        currentUserProfile = null;
        isAdmin = false;
        showPage('landing-page');
        showToast('Logged out successfully');
    });
}

function enterApp() {
    showPage('app-page');
    initTheme();
    setupAdminNav();
    loadProfiles();
    setupMatchListener();
    setupMessageListener();
    updateProfileDisplay();
}

function setupAdminNav() {
    const navLinks = document.querySelector('.nav-links');
    const existingAdminLink = document.querySelector('[data-tab="admin"]');
    
    if (isAdmin && !existingAdminLink) {
        const adminLink = document.createElement('button');
        adminLink.className = 'nav-link';
        adminLink.setAttribute('data-tab', 'admin');
        adminLink.onclick = () => switchTab('admin');
        adminLink.innerHTML = `
            <i class="fas fa-shield-alt"></i>
            <span>Admin</span>
        `;
        navLinks.appendChild(adminLink);
    } else if (!isAdmin && existingAdminLink) {
        existingAdminLink.remove();
    }
}

// ========== Real-time Listeners ==========
function setupMatchListener() {
    if (!currentUser) return;
    
    unsubscribeMatches = db.collection('matches')
        .where('users', 'array-contains', currentUser.uid)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const matchData = change.doc.data();
                    if (matchData.createdAt) {
                        const matchTime = matchData.createdAt.toDate();
                        const now = new Date();
                        if ((now - matchTime) < 10000) {
                            const otherUserId = matchData.users.find(id => id !== currentUser.uid);
                            showMatchNotification(otherUserId, change.doc.id);
                        }
                    }
                }
            });
            updateMatchesBadge();
        });
}

function setupMessageListener() {
    if (!currentUser) return;
    
    unsubscribeMessages = db.collection('conversations')
        .where('participants', 'array-contains', currentUser.uid)
        .onSnapshot((snapshot) => {
            let unreadCount = 0;
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.unreadBy && data.unreadBy.includes(currentUser.uid)) {
                    unreadCount++;
                }
            });
            updateMessagesBadge(unreadCount);
        });
}

function updateMatchesBadge() {
    db.collection('matches')
        .where('users', 'array-contains', currentUser.uid)
        .get()
        .then((snapshot) => {
            const badge = document.getElementById('matches-badge');
            if (badge) {
                badge.textContent = snapshot.size;
                badge.style.display = snapshot.size > 0 ? 'flex' : 'none';
            }
        });
}

function updateMessagesBadge(count) {
    const badge = document.getElementById('messages-badge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

async function showMatchNotification(otherUserId, matchId) {
    try {
        const userDoc = await db.collection('users').doc(otherUserId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            userData.id = otherUserId;
            showMatch(userData, matchId);
        }
    } catch (error) {
        console.error('Error showing match notification:', error);
    }
}

// ========== Profile Management ==========
function updateProfileDisplay() {
    if (currentUserProfile) {
        document.getElementById('profile-name').textContent = 
            `${currentUserProfile.firstName || ''} ${currentUserProfile.lastName || ''}`;
        document.getElementById('profile-info').textContent = 
            `${currentUserProfile.age || ''} • ${currentUserProfile.gender || 'Not specified'} • Maseno University`;
        
        document.getElementById('profile-bio').value = currentUserProfile.bio || '';
        document.getElementById('profile-course').value = currentUserProfile.course || '';
        document.getElementById('profile-year').value = currentUserProfile.year || '';
        
        interests = currentUserProfile.interests || [];
        renderInterests();
        
        document.querySelectorAll('input[name="profile-intent"]').forEach(cb => {
            cb.checked = currentUserProfile.intents && currentUserProfile.intents.includes(cb.value);
        });
        
        if (currentUserProfile.photoURL) {
            const avatar = document.getElementById('profile-avatar');
            avatar.style.backgroundImage = `url(${currentUserProfile.photoURL})`;
            avatar.style.backgroundSize = 'cover';
            avatar.style.backgroundPosition = 'center';
            const icon = avatar.querySelector('i');
            if (icon) icon.style.display = 'none';
        }
    }
}

function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image must be less than 5MB', 'error');
        return;
    }
    
    showToast('Uploading photo...');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result;
        
        db.collection('users').doc(currentUser.uid).update({
            photoURL: base64Image
        }).then(() => {
            const avatar = document.getElementById('profile-avatar');
            avatar.style.backgroundImage = `url(${base64Image})`;
            avatar.style.backgroundSize = 'cover';
            avatar.style.backgroundPosition = 'center';
            const icon = avatar.querySelector('i');
            if (icon) icon.style.display = 'none';
            currentUserProfile.photoURL = base64Image;
            showToast('Profile photo updated!');
        }).catch((error) => {
            showToast('Failed to upload photo', 'error');
        });
    };
    reader.readAsDataURL(file);
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
    if (!container) return;
    
    container.innerHTML = interests.map(interest => `
        <span class="interest-tag">
            ${escapeHtml(interest)}
            <button onclick="removeInterest('${escapeHtml(interest)}')">&times;</button>
        </span>
    `).join('');
}

function saveProfile(event) {
    event.preventDefault();
    
    const bio = document.getElementById('profile-bio').value.trim();
    const course = document.getElementById('profile-course').value.trim();
    const year = document.getElementById('profile-year').value;
    
    const intentCheckboxes = document.querySelectorAll('input[name="profile-intent"]:checked');
    const intents = Array.from(intentCheckboxes).map(cb => cb.value);
    
    if (intents.length === 0) {
        showToast('Please select at least one intent', 'error');
        return;
    }
    
    db.collection('users').doc(currentUser.uid).update({
        bio: bio,
        course: course,
        year: year,
        intents: intents,
        interests: interests,
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        currentUserProfile.bio = bio;
        currentUserProfile.course = course;
        currentUserProfile.year = year;
        currentUserProfile.intents = intents;
        currentUserProfile.interests = interests;
        showToast('Profile saved successfully!');
    })
    .catch((error) => {
        showToast('Failed to save profile', 'error');
    });
}

// ========== Discover / Swipe ==========
async function loadProfiles() {
    if (!currentUser) return;
    
    const cardStack = document.getElementById('card-stack');
    cardStack.innerHTML = `
        <div class="swipe-card loading-card">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Finding people near you...</p>
        </div>
    `;
    
    try {
        const likedSnapshot = await db.collection('likes')
            .where('fromUser', '==', currentUser.uid)
            .get();
        
        const likedUserIds = likedSnapshot.docs.map(doc => doc.data().toUser);
        likedUserIds.push(currentUser.uid);
        
        let query = db.collection('users')
            .where('isActive', '==', true)
            .limit(50);
        
        const snapshot = await query.get();
        
        profiles = [];
        snapshot.forEach((doc) => {
            if (!likedUserIds.includes(doc.id)) {
                profiles.push({ id: doc.id, ...doc.data() });
            }
        });
        
        if (currentFilter !== 'all') {
            profiles = profiles.filter(p => p.intents && p.intents.includes(currentFilter));
        }
        
        currentProfileIndex = 0;
        renderCurrentCard();
        
    } catch (error) {
        console.error('Error loading profiles:', error);
        cardStack.innerHTML = `
            <div class="swipe-card error-card">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load profiles</p>
                <button class="btn btn-primary" onclick="loadProfiles()">Try Again</button>
            </div>
        `;
    }
}

function renderCurrentCard() {
    const cardStack = document.getElementById('card-stack');
    
    if (profiles.length === 0 || currentProfileIndex >= profiles.length) {
        cardStack.innerHTML = `
            <div class="swipe-card empty-card">
                <i class="fas fa-search"></i>
                <h3>No more profiles</h3>
                <p>Check back later for new people or adjust your filters!</p>
                <button class="btn btn-primary" onclick="loadProfiles()">
                    <i class="fas fa-sync"></i> Refresh
                </button>
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
    
    const avatarStyle = profile.photoURL 
        ? `background-image: url(${profile.photoURL}); background-size: cover; background-position: center;`
        : '';
    
    cardStack.innerHTML = `
        <div class="swipe-card" id="current-card">
            <div class="card-image" style="${avatarStyle}">
                ${!profile.photoURL ? '<i class="fas fa-user"></i>' : ''}
                <div class="card-badge">
                    ${(profile.intents || []).map(i => `<span>${intentLabels[i] || i}</span>`).join('')}
                </div>
            </div>
            <div class="card-info">
                <h3>${escapeHtml(profile.firstName || '')} ${escapeHtml(profile.lastName || '')} <span>• ${profile.age || '?'}</span></h3>
                <p class="card-meta">${escapeHtml(profile.course || 'Maseno University')} ${profile.year ? '• Year ' + profile.year : ''}</p>
                <p class="card-bio">${escapeHtml(profile.bio || 'No bio yet')}</p>
                <div class="card-interests">
                    ${(profile.interests || []).slice(0, 5).map(i => `<span>${escapeHtml(i)}</span>`).join('')}
                </div>
            </div>
        </div>
    `;
    
    setupSwipeGestures();
}

function setupSwipeGestures() {
    const card = document.getElementById('current-card');
    if (!card) return;
    
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    
    const startDrag = (x) => {
        isDragging = true;
        startX = x;
        card.style.transition = 'none';
    };
    
    const moveDrag = (x) => {
        if (!isDragging) return;
        currentX = x - startX;
        const rotate = currentX * 0.05;
        card.style.transform = `translateX(${currentX}px) rotate(${rotate}deg)`;
        
        if (currentX > 50) {
            card.classList.add('swiping-right');
            card.classList.remove('swiping-left');
        } else if (currentX < -50) {
            card.classList.add('swiping-left');
            card.classList.remove('swiping-right');
        } else {
            card.classList.remove('swiping-right', 'swiping-left');
        }
    };
    
    const endDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        card.style.transition = 'transform 0.3s ease';
        card.classList.remove('swiping-right', 'swiping-left');
        
        if (currentX > 100) {
            swipeCard('right');
        } else if (currentX < -100) {
            swipeCard('left');
        } else {
            card.style.transform = '';
        }
        currentX = 0;
    };
    
    card.addEventListener('mousedown', (e) => startDrag(e.clientX));
    card.addEventListener('mousemove', (e) => moveDrag(e.clientX));
    card.addEventListener('mouseup', endDrag);
    card.addEventListener('mouseleave', endDrag);
    
    card.addEventListener('touchstart', (e) => startDrag(e.touches[0].clientX));
    card.addEventListener('touchmove', (e) => moveDrag(e.touches[0].clientX));
    card.addEventListener('touchend', endDrag);
}

async function swipeCard(direction) {
    if (profiles.length === 0 || currentProfileIndex >= profiles.length) return;
    
    const card = document.getElementById('current-card');
    if (!card) return;
    
    const profile = profiles[currentProfileIndex];
    
    card.classList.add('removing', direction === 'right' || direction === 'super' ? 'right' : 'left');
    
    if (direction === 'right' || direction === 'super') {
        try {
            await db.collection('likes').add({
                fromUser: currentUser.uid,
                toUser: profile.id,
                type: direction === 'super' ? 'super' : 'normal',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            const reverseMatch = await db.collection('likes')
                .where('fromUser', '==', profile.id)
                .where('toUser', '==', currentUser.uid)
                .get();
            
            if (!reverseMatch.empty) {
                await createMatch(currentUser.uid, profile.id);
                showMatch(profile);
            } else {
                showToast(direction === 'super' ? 'Super liked! ⭐' : 'Liked! 💕');
            }
        } catch (error) {
            console.error('Error processing like:', error);
            showToast('Something went wrong', 'error');
        }
    } else {
        try {
            await db.collection('likes').add({
                fromUser: currentUser.uid,
                toUser: profile.id,
                type: 'pass',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error recording pass:', error);
        }
    }
    
    setTimeout(() => {
        currentProfileIndex++;
        renderCurrentCard();
    }, 300);
}

async function createMatch(user1Id, user2Id) {
    try {
        const existingMatch = await db.collection('matches')
            .where('users', 'array-contains', user1Id)
            .get();
        
        let matchExists = false;
        existingMatch.forEach((doc) => {
            if (doc.data().users.includes(user2Id)) {
                matchExists = true;
            }
        });
        
        if (!matchExists) {
            await db.collection('matches').add({
                users: [user1Id, user2Id],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastActivity: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error creating match:', error);
    }
}

function showMatch(profile, matchId) {
    document.getElementById('match-name').textContent = profile.firstName || 'Someone';
    
    const matchAvatars = document.querySelectorAll('.match-avatar');
    if (matchAvatars.length >= 2) {
        // Reset avatars
        matchAvatars[0].style.backgroundImage = '';
        matchAvatars[0].innerHTML = '<i class="fas fa-user"></i>';
        matchAvatars[1].style.backgroundImage = '';
        matchAvatars[1].innerHTML = '<i class="fas fa-user"></i>';
        
        if (currentUserProfile && currentUserProfile.photoURL) {
            matchAvatars[0].style.backgroundImage = `url(${currentUserProfile.photoURL})`;
            matchAvatars[0].style.backgroundSize = 'cover';
            matchAvatars[0].style.backgroundPosition = 'center';
            matchAvatars[0].innerHTML = '';
        }
        if (profile.photoURL) {
            matchAvatars[1].style.backgroundImage = `url(${profile.photoURL})`;
            matchAvatars[1].style.backgroundSize = 'cover';
            matchAvatars[1].style.backgroundPosition = 'center';
            matchAvatars[1].innerHTML = '';
        }
    }
    
    document.getElementById('match-modal').classList.add('active');
    window.matchedUser = profile;
}

function closeModal() {
    document.getElementById('match-modal').classList.remove('active');
}

function startChat() {
    closeModal();
    if (window.matchedUser) {
        openChat(window.matchedUser.id);
    }
    switchTab('messages');
}

// ========== Matches ==========
async function loadMatches() {
    if (!currentUser) return;
    
    const grid = document.getElementById('matches-grid');
    grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading matches...</div>';
    
    try {
        const snapshot = await db.collection('matches')
            .where('users', 'array-contains', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        if (snapshot.empty) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-heart"></i>
                    <h3>No matches yet</h3>
                    <p>Keep swiping to find your people!</p>
                    <button class="btn btn-primary" onclick="switchTab('discover')">
                        <i class="fas fa-compass"></i> Discover
                    </button>
                </div>
            `;
            return;
        }
        
        matches = [];
        const userPromises = [];
        
        snapshot.forEach((doc) => {
            const matchData = doc.data();
            const otherUserId = matchData.users.find(id => id !== currentUser.uid);
            userPromises.push(
                db.collection('users').doc(otherUserId).get().then((userDoc) => {
                    if (userDoc.exists) {
                        matches.push({
                            matchId: doc.id,
                            oderId: otherUserId,
                            oderId: otherUserId,
                            ...userDoc.data(),
                            matchedAt: matchData.createdAt
                        });
                    }
                })
            );
        });
        
        await Promise.all(userPromises);
        
        grid.innerHTML = matches.map(match => {
            const avatarStyle = match.photoURL 
                ? `background-image: url(${match.photoURL}); background-size: cover; background-position: center;`
                : '';
            
            return `
                <div class="match-card" onclick="openChat('${match.oderId}')">
                    <div class="match-card-image" style="${avatarStyle}">
                        ${!match.photoURL ? '<i class="fas fa-user"></i>' : ''}
                    </div>
                    <div class="match-card-info">
                        <h4>${escapeHtml(match.firstName || '')} ${escapeHtml(match.lastName || '')}, ${match.age || '?'}</h4>
                        <p>${escapeHtml(match.course || 'Maseno University')} ${match.year ? '• Year ' + match.year : ''}</p>
                        <button class="btn btn-primary" onclick="openChat('${match.oderId}'); event.stopPropagation();">
                            <i class="fas fa-comment"></i> Message
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading matches:', error);
        grid.innerHTML = `
            <div class="empty-state error">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Failed to load matches</h3>
                <button class="btn btn-primary" onclick="loadMatches()">Try Again</button>
            </div>
        `;
    }
}

// ========== Messages ==========
async function loadConversations() {
    if (!currentUser) return;
    
    const list = document.getElementById('conversations-list');
    list.innerHTML = '<h2>Messages</h2><div class="loading"><i class="fas fa-spinner fa-spin"></i></div>';
    
    try {
        const snapshot = await db.collection('conversations')
            .where('participants', 'array-contains', currentUser.uid)
            .orderBy('lastMessageAt', 'desc')
            .get();
        
        let html = '<h2>Messages</h2>';
        
        if (snapshot.empty) {
            html += `
                <div class="empty-conversations">
                    <i class="fas fa-comments"></i>
                    <p>No messages yet</p>
                    <small>Match with someone to start chatting!</small>
                </div>
            `;
        } else {
            conversations = [];
            
            for (const doc of snapshot.docs) {
                const convData = doc.data();
                const otherUserId = convData.participants.find(id => id !== currentUser.uid);
                
                const userDoc = await db.collection('users').doc(otherUserId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    conversations.push({
                        id: doc.id,
                        oderId: otherUserId,
                        user: userData,
                        lastMessage: convData.lastMessage || 'Start a conversation!',
                        lastMessageAt: convData.lastMessageAt,
                        unread: convData.unreadBy && convData.unreadBy.includes(currentUser.uid)
                    });
                }
            }
            
            html += conversations.map(conv => {
                const avatarStyle = conv.user.photoURL 
                    ? `background-image: url(${conv.user.photoURL}); background-size: cover; background-position: center;`
                    : '';
                
                const timeAgo = conv.lastMessageAt ? formatTimeAgo(conv.lastMessageAt.toDate()) : '';
                
                return `
                    <div class="conversation-item ${currentChat?.id === conv.id ? 'active' : ''} ${conv.unread ? 'unread' : ''}" 
                         onclick="openConversation('${conv.id}', '${conv.oderId}')">
                        <div class="conversation-avatar" style="${avatarStyle}">
                            ${!conv.user.photoURL ? '<i class="fas fa-user"></i>' : ''}
                        </div>
                        <div class="conversation-info">
                            <h4>${escapeHtml(conv.user.firstName || '')} ${escapeHtml(conv.user.lastName || '')}</h4>
                            <p>${escapeHtml(conv.lastMessage)}</p>
                        </div>
                        <div class="conversation-meta">
                            <span class="conversation-time">${timeAgo}</span>
                            ${conv.unread ? '<span class="unread-dot"></span>' : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        list.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading conversations:', error);
        list.innerHTML = '<h2>Messages</h2><p class="error">Failed to load messages</p>';
    }
}

async function openChat(userId) {
    try {
        const snapshot = await db.collection('conversations')
            .where('participants', 'array-contains', currentUser.uid)
            .get();
        
        let conversationId = null;
        
        snapshot.forEach((doc) => {
            if (doc.data().participants.includes(userId)) {
                conversationId = doc.id;
            }
        });
        
        if (!conversationId) {
            const newConv = await db.collection('conversations').add({
                participants: [currentUser.uid, userId],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessage: '',
                lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
                unreadBy: []
            });
            conversationId = newConv.id;
        }
        
        switchTab('messages');
        openConversation(conversationId, userId);
        
    } catch (error) {
        console.error('Error opening chat:', error);
        showToast('Failed to open chat', 'error');
    }
}

async function openConversation(convId, oderId) {
    currentChat = { id: convId, oderId: oderId };
    
    await db.collection('conversations').doc(convId).update({
        unreadBy: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
    });
    
    loadConversations();
    renderChatWindow(convId, oderId);
}

async function renderChatWindow(convId, oderId) {
    const chatWindow = document.getElementById('chat-window');
    
    if (!convId) {
        chatWindow.innerHTML = `
            <div class="chat-placeholder">
                <i class="fas fa-comments"></i>
                <p>Select a conversation to start chatting</p>
            </div>
        `;
        return;
    }
    
    const userDoc = await db.collection('users').doc(oderId).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    
    const avatarStyle = userData.photoURL 
        ? `background-image: url(${userData.photoURL}); background-size: cover; background-position: center;`
        : '';
    
    chatWindow.innerHTML = `
        <div class="chat-header">
            <div class="conversation-avatar" style="${avatarStyle}">
                ${!userData.photoURL ? '<i class="fas fa-user"></i>' : ''}
            </div>
            <div class="conversation-info">
                <h4>${escapeHtml(userData.firstName || '')} ${escapeHtml(userData.lastName || '')}</h4>
                <p class="online-status">Online</p>
            </div>
        </div>
        <div class="chat-messages" id="chat-messages">
            <div class="loading"><i class="fas fa-spinner fa-spin"></i></div>
        </div>
        <div class="chat-input">
            <input type="text" id="message-input" placeholder="Type a message..." 
                   onkeypress="if(event.key === 'Enter') sendMessage()">
            <button onclick="sendMessage()">
                <i class="fas fa-paper-plane"></i>
            </button>
        </div>
    `;
    
    loadMessages(convId);
}

async function loadMessages(convId) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    try {
        const snapshot = await db.collection('conversations').doc(convId)
            .collection('messages')
            .orderBy('createdAt', 'asc')
            .get();
        
        if (snapshot.empty) {
            messagesContainer.innerHTML = `
                <div class="no-messages">
                    <p>No messages yet. Say hello! 👋</p>
                </div>
            `;
            return;
        }
        
        messagesContainer.innerHTML = snapshot.docs.map(doc => {
            const msg = doc.data();
            const isSent = msg.senderId === currentUser.uid;
            const time = msg.createdAt ? formatTime(msg.createdAt.toDate()) : '';
            
            return `
                <div class="message ${isSent ? 'sent' : 'received'}">
                    ${escapeHtml(msg.text)}
                    <div class="message-time">${time}</div>
                </div>
            `;
        }).join('');
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
    } catch (error) {
        console.error('Error loading messages:', error);
        messagesContainer.innerHTML = '<p class="error">Failed to load messages</p>';
    }
}

async function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    
    if (!text || !currentChat) return;
    
    input.value = '';
    
    try {
        await db.collection('conversations').doc(currentChat.id)
            .collection('messages').add({
                text: text,
                senderId: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        await db.collection('conversations').doc(currentChat.id).update({
            lastMessage: text,
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
            unreadBy: firebase.firestore.FieldValue.arrayUnion(currentChat.oderId)
        });
        
        loadMessages(currentChat.id);
        
    } catch (error) {
        console.error('Error sending message:', error);
        showToast('Failed to send message', 'error');
    }
}

// ========== Admin Panel ==========
async function loadAdminData() {
    if (!isAdmin) {
        switchTab('discover');
        return;
    }
    
    const adminContent = document.getElementById('admin-content');
    if (!adminContent) return;
    
    adminContent.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading admin data...</div>';
    
    try {
        const usersSnapshot = await db.collection('users').get();
        const matchesSnapshot = await db.collection('matches').get();
        const conversationsSnapshot = await db.collection('conversations').get();
        
        const users = [];
        usersSnapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });
        
        users.sort((a, b) => {
            if (!a.createdAt || !b.createdAt) return 0;
            return b.createdAt.toDate() - a.createdAt.toDate();
        });
        
        adminContent.innerHTML = `
            <div class="admin-stats">
                <div class="stat-card">
                    <i class="fas fa-users"></i>
                    <div class="stat-info">
                        <h3>${users.length}</h3>
                        <p>Total Users</p>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-heart"></i>
                    <div class="stat-info">
                        <h3>${matchesSnapshot.size}</h3>
                        <p>Total Matches</p>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-comments"></i>
                    <div class="stat-info">
                        <h3>${conversationsSnapshot.size}</h3>
                        <p>Conversations</p>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-user-check"></i>
                    <div class="stat-info">
                        <h3>${users.filter(u => u.isActive !== false).length}</h3>
                        <p>Active Users</p>
                    </div>
                </div>
            </div>
            
            <div class="admin-section">
                <h3><i class="fas fa-users"></i> User Management</h3>
                <div class="admin-table-container">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Email</th>
                                <th>Age</th>
                                <th>Gender</th>
                                <th>Joined</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(user => `
                                <tr>
                                    <td>
                                        <div class="user-cell">
                                            <div class="user-avatar-small" ${user.photoURL ? `style="background-image: url(${user.photoURL}); background-size: cover;"` : ''}>
                                                ${!user.photoURL ? '<i class="fas fa-user"></i>' : ''}
                                            </div>
                                            <span>${escapeHtml(user.firstName || '')} ${escapeHtml(user.lastName || '')}</span>
                                        </div>
                                    </td>
                                    <td>${escapeHtml(user.email || '')}</td>
                                    <td>${user.age || '-'}</td>
                                    <td>${user.gender || '-'}</td>
                                    <td>${user.createdAt ? formatDate(user.createdAt.toDate()) : '-'}</td>
                                    <td>
                                        <span class="status-badge ${user.isActive !== false ? 'active' : 'inactive'}">
                                            ${user.isActive !== false ? 'Active' : 'Banned'}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="action-buttons">
                                            ${user.isActive !== false ? `
                                                <button class="btn-sm btn-danger" onclick="banUser('${user.id}')" title="Ban User">
                                                    <i class="fas fa-ban"></i>
                                                </button>
                                            ` : `
                                                <button class="btn-sm btn-success" onclick="unbanUser('${user.id}')" title="Unban User">
                                                    <i class="fas fa-check"></i>
                                                </button>
                                            `}
                                            <button class="btn-sm btn-danger" onclick="deleteUser('${user.id}')" title="Delete User">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading admin data:', error);
        adminContent.innerHTML = '<p class="error">Failed to load admin data</p>';
    }
}

async function banUser(userId) {
    if (!confirm('Are you sure you want to ban this user?')) return;
    
    try {
        await db.collection('users').doc(userId).update({
            isActive: false
        });
        showToast('User banned successfully');
        loadAdminData();
    } catch (error) {
        showToast('Failed to ban user', 'error');
    }
}

async function unbanUser(userId) {
    try {
        await db.collection('users').doc(userId).update({
            isActive: true
        });
        showToast('User unbanned successfully');
        loadAdminData();
    } catch (error) {
        showToast('Failed to unban user', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to DELETE this user? This cannot be undone!')) return;
    if (!confirm('FINAL WARNING: All user data will be permanently deleted. Continue?')) return;
    
    try {
        await db.collection('users').doc(userId).delete();
        showToast('User deleted successfully');
        loadAdminData();
    } catch (error) {
        showToast('Failed to delete user', 'error');
    }
}

// ========== Notifications ==========
function showNotifications() {
    showToast('Notifications coming soon!');
}

// ========== Filter ==========
function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            loadProfiles();
        });
    });
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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return formatDate(date);
}

// ========== Auth State Observer ==========
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                currentUserProfile = doc.data();
                isAdmin = ADMIN_EMAILS.includes(user.email);
                
                db.collection('users').doc(user.uid).update({
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                enterApp();
            } else {
                showPage('register-page');
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            showToast('Error loading profile', 'error');
        }
    } else {
        currentUser = null;
        currentUserProfile = null;
        isAdmin = false;
        showPage('landing-page');
    }
});

// ========== Initialize ==========
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupFilters();
    
    const interestInput = document.getElementById('interest-input');
    if (interestInput) {
        interestInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addInterest();
            }
        });
    }
});
