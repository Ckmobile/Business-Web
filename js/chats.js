// ============================================================================
// chats.js — contacts, 1:1 / group chat creation, chat list, typing state
// ============================================================================
import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

/** Deterministic id for a 1:1 chat so re-opening never duplicates the thread. */
function directChatId(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

/** Search users by name prefix (case-insensitive) excluding the current user. */
export async function searchUsers(currentUid, term) {
  const t = term.trim().toLowerCase();
  if (!t) return [];
  const q = query(
    collection(db, "users"),
    orderBy("nameLower"),
    where("nameLower", ">=", t),
    where("nameLower", "<=", t + "\uf8ff"),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data())
    .filter((u) => u.uid !== currentUid);
}

/** Gets (or lazily creates) the 1:1 chat between two users. Returns the chat id. */
export async function getOrCreateDirectChat(me, otherUser) {
  const chatId = directChatId(me.uid, otherUser.uid);
  const chatRef = doc(db, "chats", chatId);
  const existing = await getDoc(chatRef);

  if (!existing.exists()) {
    await setDoc(chatRef, {
      isGroup: false,
      participants: [me.uid, otherUser.uid],
      participantsInfo: {
        [me.uid]: { name: me.name, photoURL: me.photoURL },
        [otherUser.uid]: { name: otherUser.name, photoURL: otherUser.photoURL },
      },
      lastMessage: null,
      typing: {},
      unreadCount: { [me.uid]: 0, [otherUser.uid]: 0 },
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  }
  return chatId;
}

/** Creates a group chat with the given member user objects (including creator). */
export async function createGroupChat(creator, members, groupName) {
  const participantsInfo = {};
  members.forEach((u) => (participantsInfo[u.uid] = { name: u.name, photoURL: u.photoURL }));
  participantsInfo[creator.uid] = { name: creator.name, photoURL: creator.photoURL };

  const unreadCount = {};
  [...members, creator].forEach((u) => (unreadCount[u.uid] = 0));

  const docRef = await addDoc(collection(db, "chats"), {
    isGroup: true,
    groupName,
    groupPhoto: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(groupName)}`,
    groupAdmins: [creator.uid],
    participants: [creator.uid, ...members.map((u) => u.uid)],
    participantsInfo,
    lastMessage: null,
    typing: {},
    unreadCount,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Live subscription to the current user's chat list, most recent first. */
export function watchChatList(uid, callback) {
  const q = query(
    collection(db, "chats"),
    where("participants", "array-contains", uid),
    orderBy("updatedAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    const chats = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(chats);
  });
}

/** Live subscription to a single chat document (for header info, typing, etc). */
export function watchChat(chatId, callback) {
  return onSnapshot(doc(db, "chats", chatId), (d) => {
    if (d.exists()) callback({ id: d.id, ...d.data() });
  });
}

export async function setTyping(chatId, uid, isTyping) {
  await updateDoc(doc(db, "chats", chatId), { [`typing.${uid}`]: isTyping }).catch(() => {});
}

export async function resetUnreadCount(chatId, uid) {
  await updateDoc(doc(db, "chats", chatId), { [`unreadCount.${uid}`]: 0 }).catch(() => {});
}
