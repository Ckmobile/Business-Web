// ============================================================================
// presence.js — online / offline / last-seen tracking
// ----------------------------------------------------------------------------
// Firestore has no native "onDisconnect" hook (that's a Realtime Database
// feature). This module approximates presence with:
//   - "online" written on load and on a heartbeat interval
//   - "offline" + lastSeen written on tab close / visibility change
//   - a heartbeat timestamp other clients can use to detect stale "online"
//     status (e.g. treat as offline if heartbeat is older than 60s)
// For production-grade instant presence, mirror this with Realtime Database
// onDisconnect() and sync the result into Firestore via a Cloud Function.
// ============================================================================
import { db } from "./firebase-config.js";
import {
  doc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

let heartbeatTimer = null;

export function startPresence(uid) {
  const userRef = doc(db, "users", uid);

  const setOnline = () =>
    updateDoc(userRef, { status: "online", lastSeen: serverTimestamp() }).catch(() => {});
  const setOffline = () =>
    updateDoc(userRef, { status: "offline", lastSeen: serverTimestamp() }).catch(() => {});

  setOnline();
  heartbeatTimer = setInterval(setOnline, 30000);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") setOnline();
    else setOffline();
  });
  window.addEventListener("beforeunload", setOffline);

  return () => {
    clearInterval(heartbeatTimer);
    setOffline();
  };
}

export function formatLastSeen(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;

  const sameDay = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `today at ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `yesterday at ${time}`;

  return `${date.toLocaleDateString()} at ${time}`;
}
