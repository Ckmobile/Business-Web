// ============================================================================
// auth.js — sign up / sign in / sign out and user profile bootstrap
// ============================================================================
import { auth, db, storage } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

/** Creates an account, uploads an optional avatar, and writes the users/{uid} doc. */
export async function signUp({ name, email, password, avatarFile }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  let photoURL = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
  if (avatarFile) {
    const avatarRef = ref(storage, `avatars/${uid}.jpg`);
    await uploadBytes(avatarRef, avatarFile);
    photoURL = await getDownloadURL(avatarRef);
  }

  await updateProfile(cred.user, { displayName: name, photoURL });

  await setDoc(doc(db, "users", uid), {
    uid,
    name,
    nameLower: name.toLowerCase(),
    email,
    photoURL,
    about: "Hey there! I am using WhatsApp Web Clone.",
    phone: "",
    status: "online",
    lastSeen: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  return cred.user;
}

export async function logIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logOut() {
  await signOut(auth);
}

/** Subscribes to auth state; callback receives the Firebase user or null. */
export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}
