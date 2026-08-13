// ============================================================================
// firebase-config.js
// ----------------------------------------------------------------------------
// Single source of truth for Firebase initialization.
// 1. Create a project at https://console.firebase.google.com
// 2. Enable: Authentication (Email/Password), Firestore Database, Storage
// 3. Paste your web app config below (Project settings -> General -> Your apps)
// 4. Deploy the security rules in /firestore.rules and /storage.rules
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  connectAuthEmulator,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore,
  connectFirestoreEmulator,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getStorage,
  connectStorageEmulator,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

// -----------------------------------------------------------------------
// REPLACE WITH YOUR OWN FIREBASE PROJECT CREDENTIALS
// -----------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyC3ZKnpBnXZlGihzeO3_SQgNt-1d80bI1o",
  authDomain: "photo-6ecf2.firebaseapp.com",
  projectId: "photo-6ecf2",
  storageBucket: "photo-6ecf2.firebasestorage.app",
  messagingSenderId: "467388659086",
  appId: "1:467388659086:web:43eb2fe0050b26adcce0df",
  measurementId: "G-92DMR9LX63"
// Toggle to true only for local development with the Firebase Emulator Suite
const USE_EMULATORS = false;

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

if (USE_EMULATORS) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
}

// -----------------------------------------------------------------------
// FIRESTORE DATA MODEL (created automatically as documents are written —
// Firestore is schemaless, so nothing needs to be "created" up front, but
// this is the shape the app relies on):
//
// users/{uid}
//   uid, name, email, photoURL, about, phone,
//   status: "online" | "offline", lastSeen: Timestamp,
//   createdAt: Timestamp, nameLower: string (for search)
//
// chats/{chatId}                       (chatId = sorted uids joined by "_" for 1:1,
//                                        or an auto id for groups)
//   isGroup: boolean
//   participants: [uid, ...]
//   participantsInfo: { [uid]: { name, photoURL } }
//   groupName, groupPhoto, groupAdmins: [uid, ...]   (groups only)
//   lastMessage: { text, senderId, type, timestamp }
//   typing: { [uid]: boolean }
//   unreadCount: { [uid]: number }
//   updatedAt: Timestamp
//
// chats/{chatId}/messages/{messageId}
//   senderId, type: "text" | "image" | "file" | "audio"
//   text, mediaURL, fileName, fileSize
//   timestamp: Timestamp
//   status: "sent" | "delivered" | "read"
//   deletedFor: [uid, ...]   (soft delete "for me")
//   deletedForEveryone: boolean
//
// Storage layout:
//   /avatars/{uid}.jpg
//   /chatMedia/{chatId}/{messageId}_{fileName}
// -----------------------------------------------------------------------
