// ============================================================================
// messages.js — send / receive / read receipts / delete / media upload
// ============================================================================
import { db, storage } from "./firebase-config.js";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  arrayUnion,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch,
  getDocs,
  limit as fsLimit,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

/** Live subscription to a chat's messages, oldest first. */
export function watchMessages(chatId, callback) {
  const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(messages);
  });
}

/** Sends a plain text message and updates the parent chat's lastMessage/unread counts. */
export async function sendTextMessage(chatId, senderId, text, otherParticipants) {
  const msgRef = await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId,
    type: "text",
    text,
    timestamp: serverTimestamp(),
    status: "sent",
    deletedFor: [],
    deletedForEveryone: false,
  });

  await touchChatAfterSend(chatId, { text, type: "text", senderId }, otherParticipants);
  return msgRef.id;
}

/** Uploads an image/file to Storage then writes the message doc. onProgress(pct) is optional. */
export async function sendMediaMessage(chatId, senderId, file, type, otherParticipants, onProgress) {
  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const path = `chatMedia/${chatId}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file);

  await new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => onProgress && onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      resolve
    );
  });

  const mediaURL = await getDownloadURL(storageRef);

  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId,
    type, // "image" | "file"
    text: "",
    mediaURL,
    fileName: file.name,
    fileSize: file.size,
    timestamp: serverTimestamp(),
    status: "sent",
    deletedFor: [],
    deletedForEveryone: false,
  });

  const preview = type === "image" ? "📷 Photo" : `📎 ${file.name}`;
  await touchChatAfterSend(chatId, { text: preview, type, senderId }, otherParticipants);
}

async function touchChatAfterSend(chatId, lastMessage, otherParticipants) {
  const updates = {
    lastMessage: { ...lastMessage, timestamp: serverTimestamp() },
    updatedAt: serverTimestamp(),
  };
  otherParticipants.forEach((uid) => {
    updates[`unreadCount.${uid}`] = increment(1);
  });
  await updateDoc(doc(db, "chats", chatId), updates);
}

/** Marks all messages not sent by `uid` as read, in a single batch. */
export async function markMessagesRead(chatId, uid) {
  const q = query(collection(db, "chats", chatId, "messages"), fsLimit(500));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  let hasWrites = false;

  snap.docs.forEach((d) => {
    const m = d.data();
    if (m.senderId !== uid && m.status !== "read") {
      batch.update(d.ref, { status: "read" });
      hasWrites = true;
    }
  });

  if (hasWrites) await batch.commit();
}

/** Soft delete: hides a message for the requesting user only. */
export async function deleteForMe(chatId, messageId, uid) {
  await updateDoc(doc(db, "chats", chatId, "messages", messageId), {
    deletedFor: arrayUnion(uid),
  });
}

/** Deletes a message's content for everyone (leaves a tombstone, WhatsApp-style). */
export async function deleteForEveryone(chatId, messageId) {
  await updateDoc(doc(db, "chats", chatId, "messages", messageId), {
    deletedForEveryone: true,
    text: "",
    mediaURL: null,
  });
}
