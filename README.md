# MasenoMeet 💕

A social connection app for Maseno University students to find friends, party buddies, relationships, and more.

![MasenoMeet](https://img.shields.io/badge/MasenoMeet-Social%20App-ff6b6b)

## Features

- 🔐 **User Authentication** - Email/password and Google sign-in
- 👤 **User Profiles** - Customize bio, interests, photos, and what you're looking for
- 💫 **Swipe to Connect** - Tinder-style card swiping
- 🎯 **Intent Filters** - Filter by friendship, party, relationship, or casual
- 💬 **Real-time Chat** - Message your matches instantly
- ❤️ **Matching System** - Get notified when someone likes you back
- 📱 **Responsive Design** - Works on desktop and mobile

## Intent Categories

- **Friendship** - Find study buddies and campus friends
- **Party Buddies** - Connect with people who love events
- **Relationship** - Looking for something more serious
- **Casual** - Open to whatever happens

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage

## Getting Started

### Prerequisites

- Node.js installed on your machine
- A Firebase project (free tier works fine)

### Installation

1. Clone or download the project

2. Navigate to the project folder:
   ```bash
   cd masenoMeet
   ```

3. Configure Firebase:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication (Email/Password and Google)
   - Create a Firestore database
   - Get your config from Project Settings > General > Your apps > Web app

4. Update Firebase config in `public/app.js`:
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_AUTH_DOMAIN",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_STORAGE_BUCKET",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID"
   };
   ```

5. Start the server:
   ```bash
   npm start
   ```

6. Open your browser and go to `http://localhost:3000`

## Firebase Setup

### Firestore Rules

Add these rules to your Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    match /matches/{matchId} {
      allow read, write: if request.auth != null;
    }
    match /conversations/{convId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /avatars/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

## Demo Mode

The app runs in demo mode if Firebase is not configured. You can:
- Browse demo profiles
- Simulate matches
- Test the chat interface
- Explore all features

## Project Structure

```
masenoMeet/
├── public/
│   ├── index.html      # Main HTML file
│   ├── styles.css      # All styling
│   └── app.js          # JavaScript logic
├── server.js           # Node.js server
├── package.json        # Project config
└── README.md           # This file
```

## Contributing

Feel free to fork and improve MasenoMeet!

## License

MIT License - Use it however you want!

---

Made with ❤️ for Maseno University
