# WhatsApp Web Clone (Firebase)

A real-time, WhatsApp Web–styled chat application built with plain HTML/CSS/JS
(ES modules, no build step) and Firebase (Authentication, Firestore, Storage).

## Features

- Email/password authentication with profile name + avatar upload
- One-on-one chats and group chats
- Real-time messaging (Firestore `onSnapshot`)
- Contact search (by name) to start new chats or build a group
- Typing indicators
- Online / offline status with "last seen" timestamps
- Message read receipts (single / double / blue double tick)
- Image and file sharing via Firebase Storage, with upload progress
- Emoji picker
- Delete a message "for me" or "for everyone"
- Unread message counters per chat
- Date separators in the message thread ("Today", "Yesterday", full date)
- Light / dark theme toggle (persisted in localStorage)
- Fully responsive: single-column mobile view that mirrors WhatsApp Web's
  behavior of collapsing the sidebar behind the open chat

## Project structure

```
whatsapp-clone/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── firebase-config.js   # <- put your Firebase project keys here
│   ├── auth.js               # sign up / log in / log out
│   ├── presence.js           # online/offline + last seen
│   ├── chats.js               # contacts, chat/group creation, chat list
│   ├── messages.js            # send/receive/read receipts/delete, media upload
│   └── app.js                 # DOM orchestration (the only file touching the UI)
├── firestore.rules
└── storage.rules
```

## Setup

1. **Create a Firebase project** at https://console.firebase.google.com

2. **Enable products**
   - Authentication → Sign-in method → enable **Email/Password**
   - Firestore Database → Create database (start in production mode)
   - Storage → Get started

3. **Register a Web App** in Project settings → General → "Your apps" → Web,
   then copy the config object into `js/firebase-config.js`:

   ```js
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "...",
   };
   ```

4. **Deploy security rules** (using the Firebase CLI):

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init firestore storage   # point at this project, keep default file names
   firebase deploy --only firestore:rules,storage:rules
   ```

   Or paste the contents of `firestore.rules` / `storage.rules` directly into
   the Firebase console's Rules editors.

5. **Create the required Firestore composite index.** The chat list query
   (`where("participants", "array-contains", uid)` + `orderBy("updatedAt", "desc")`)
   needs a composite index. The easiest way: run the app, open the browser
   console, and click the link Firestore prints in the error the first time
   the query runs — it deep-links straight to an auto-filled "Create Index"
   page. Alternatively create it manually:
   - Collection: `chats`
   - Fields: `participants` (Arrays), `updatedAt` (Descending)

6. **Serve the app.** Because it uses ES modules, open it via a local server
   rather than `file://`:

   ```bash
   npx serve .
   # or
   python3 -m http.server 8000
   ```

   Then visit `http://localhost:8000` (or whichever port is printed).

## Data model

See the comment block at the top of `js/firebase-config.js` for the full
Firestore schema (`users`, `chats`, `chats/{id}/messages`) and Storage layout
(`avatars/`, `chatMedia/`).

## Notes & extension points

- **Presence** is approximated with Firestore heartbeats/visibility events
  (see comments in `presence.js`). For instant, connection-accurate presence
  the standard approach is to mirror it through the Realtime Database's
  native `onDisconnect()` hook and sync that into Firestore with a small
  Cloud Function — Firestore alone has no disconnect callback.
- **Voice/video calling** is out of scope for a pure client + Firestore app —
  it needs a WebRTC signaling layer (Firestore can act as the signaling
  channel) plus TURN/STUN servers; this is a natural next feature to layer
  on top of the existing chat/message modules.
- **Push notifications** can be added with Firebase Cloud Messaging: store
  an FCM token on the user doc and trigger sends from a Cloud Function on
  new-message writes.
- **Message search** currently filters the chat list client-side; for
  full-text search across message history, pair Firestore with an external
  index (e.g., Algolia or Typesense) synced via Cloud Functions.
