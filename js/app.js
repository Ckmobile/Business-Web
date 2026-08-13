// ============================================================================
// app.js — UI orchestration. Wires auth.js / chats.js / messages.js /
// presence.js to the DOM. No Firebase calls happen directly in this file
// beyond reading the live-auth user; all data access goes through the
// dedicated modules for a clean separation of concerns.
// ============================================================================
import { auth, db } from "./firebase-config.js";
import { signUp, logIn, logOut, watchAuthState } from "./auth.js";
import { startPresence, formatLastSeen } from "./presence.js";
import {
  searchUsers,
  getOrCreateDirectChat,
  createGroupChat,
  watchChatList,
  watchChat,
  setTyping,
  resetUnreadCount,
} from "./chats.js";
import {
  watchMessages,
  sendTextMessage,
  sendMediaMessage,
  markMessagesRead,
  deleteForMe,
  deleteForEveryone,
} from "./messages.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  me: null, // { uid, name, email, photoURL }
  chats: [],
  activeChatId: null,
  unsubMessages: null,
  unsubActiveChat: null,
  groupSelection: new Map(),
  typingTimeout: null,
};

const EMOJIS = "😀 😁 😂 🤣 😊 😍 😘 😜 🤔 😎 😢 😭 😡 👍 👎 👏 🙏 💪 🔥 🎉 ❤️ 💔 ✅ ❌ 😴 🤗 😇 🥳 🙌 👀 💯 🚀".split(" ");

// ---------------------------------------------------------------------------
// DOM shortcuts
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const authScreen = $("authScreen"), appScreen = $("appScreen");

// ===================== AUTH SCREEN =====================
document.querySelectorAll(".auth-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    $("loginForm").classList.toggle("hidden", tab.dataset.tab !== "login");
    $("signupForm").classList.toggle("hidden", tab.dataset.tab !== "signup");
  });
});

let signupAvatarFile = null;
$("signupAvatar").addEventListener("change", (e) => {
  signupAvatarFile = e.target.files[0] || null;
  if (signupAvatarFile) {
    $("avatarPreview").style.backgroundImage = `url(${URL.createObjectURL(signupAvatarFile)})`;
    $("avatarPreview").textContent = "";
  }
});

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("loginError").textContent = "";
  try {
    await logIn($("loginEmail").value.trim(), $("loginPassword").value);
  } catch (err) {
    $("loginError").textContent = friendlyAuthError(err);
  }
});

$("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("signupError").textContent = "";
  try {
    await signUp({
      name: $("signupName").value.trim(),
      email: $("signupEmail").value.trim(),
      password: $("signupPassword").value,
      avatarFile: signupAvatarFile,
    });
  } catch (err) {
    $("signupError").textContent = friendlyAuthError(err);
  }
});

function friendlyAuthError(err) {
  const map = {
    "auth/email-already-in-use": "That email is already registered.",
    "auth/invalid-email": "Please enter a valid email.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect email or password.",
  };
  return map[err.code] || "Something went wrong. Please try again.";
}

// ===================== AUTH STATE =====================
let stopPresence = null;

watchAuthState(async (user) => {
  if (user) {
    const snap = await getDoc(doc(db, "users", user.uid));
    const profile = snap.exists() ? snap.data() : { uid: user.uid, name: user.displayName, photoURL: user.photoURL };
    state.me = profile;

    authScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
    $("myAvatar").src = profile.photoURL;

    stopPresence = startPresence(user.uid);
    watchChatList(user.uid, renderChatList);
  } else {
    state.me = null;
    if (stopPresence) stopPresence();
    authScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
  }
});

$("logoutBtn").addEventListener("click", () => logOut());

// ===================== THEME =====================
const savedTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);
$("themeToggleBtn").textContent = savedTheme === "dark" ? "☀️" : "🌙";
$("themeToggleBtn").addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  $("themeToggleBtn").textContent = next === "dark" ? "☀️" : "🌙";
});

// ===================== CHAT LIST =====================
function renderChatList(chats) {
  state.chats = chats;
  const listEl = $("chatList");
  const filterTerm = $("chatSearchInput").value.trim().toLowerCase();

  const visible = chats.filter((c) => chatDisplayName(c).toLowerCase().includes(filterTerm));

  if (visible.length === 0) {
    listEl.innerHTML = `<li class="empty-list-hint">No chats yet. Tap 💬 to start one.</li>`;
    return;
  }

  listEl.innerHTML = "";
  visible.forEach((chat) => {
    const li = document.createElement("li");
    li.className = "chat-item" + (chat.id === state.activeChatId ? " active" : "");
    const unread = chat.unreadCount?.[state.me.uid] || 0;
    const isTyping = chat.typing && Object.entries(chat.typing).some(([uid, v]) => uid !== state.me.uid && v);
    const preview = isTyping ? "typing…" : lastMessagePreview(chat);

    li.innerHTML = `
      <div class="avatar-wrap">
        <img class="avatar" src="${chatAvatar(chat)}" alt="" />
      </div>
      <div class="chat-item-body">
        <div class="chat-item-top">
          <span class="chat-item-name">${escapeHtml(chatDisplayName(chat))}</span>
          <span class="chat-item-time">${formatTimestampShort(chat.lastMessage?.timestamp)}</span>
        </div>
        <div class="chat-item-bottom">
          <span class="chat-item-preview" style="${isTyping ? "color:var(--accent-dark);font-weight:600;" : ""}">${escapeHtml(preview)}</span>
          ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ""}
        </div>
      </div>`;
    li.addEventListener("click", () => openChat(chat.id));
    listEl.appendChild(li);
  });
}

$("chatSearchInput").addEventListener("input", () => renderChatList(state.chats));

function chatDisplayName(chat) {
  if (chat.isGroup) return chat.groupName || "Group";
  const otherUid = chat.participants.find((p) => p !== state.me.uid);
  return chat.participantsInfo?.[otherUid]?.name || "Unknown user";
}
function chatAvatar(chat) {
  if (chat.isGroup) return chat.groupPhoto;
  const otherUid = chat.participants.find((p) => p !== state.me.uid);
  return chat.participantsInfo?.[otherUid]?.photoURL || "";
}
function lastMessagePreview(chat) {
  if (!chat.lastMessage) return "No messages yet";
  const prefix = chat.lastMessage.senderId === state.me.uid ? "You: " : "";
  return prefix + (chat.lastMessage.text || "");
}
function formatTimestampShort(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

// ===================== OPEN CHAT =====================
async function openChat(chatId) {
  state.activeChatId = chatId;
  appScreen.classList.add("chat-open");
  $("emptyState").classList.add("hidden");
  $("chatView").classList.remove("hidden");
  renderChatList(state.chats); // refresh active highlight

  if (state.unsubMessages) state.unsubMessages();
  if (state.unsubActiveChat) state.unsubActiveChat();

  state.unsubActiveChat = watchChat(chatId, (chat) => {
    $("chatTitle").textContent = chatDisplayName(chat);
    $("chatAvatar").src = chatAvatar(chat);

    const typingUids = chat.typing
      ? Object.entries(chat.typing).filter(([uid, v]) => uid !== state.me.uid && v).map(([uid]) => uid)
      : [];

    if (typingUids.length > 0) {
      $("chatSubtitle").textContent = chat.isGroup
        ? `${typingUids.length} typing…`
        : "typing…";
    } else if (!chat.isGroup) {
      const otherUid = chat.participants.find((p) => p !== state.me.uid);
      renderOtherUserStatus(otherUid);
    } else {
      $("chatSubtitle").textContent = `${chat.participants.length} participants`;
    }
  });

  state.unsubMessages = watchMessages(chatId, renderMessages);

  await resetUnreadCount(chatId, state.me.uid);
  await markMessagesRead(chatId, state.me.uid);
}

async function renderOtherUserStatus(otherUid) {
  const snap = await getDoc(doc(db, "users", otherUid));
  if (!snap.exists()) return;
  const u = snap.data();
  $("chatSubtitle").textContent = u.status === "online" ? "online" : `last seen ${formatLastSeen(u.lastSeen)}`;
}

$("backBtn").addEventListener("click", () => {
  appScreen.classList.remove("chat-open");
});

// ===================== MESSAGES RENDER =====================
function renderMessages(messages) {
  const container = $("messagesContainer");
  const wasAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 60;
  container.innerHTML = "";

  let lastDate = null;
  messages.forEach((m) => {
    if (m.deletedFor?.includes(state.me.uid)) return;

    const msgDate = m.timestamp?.toDate ? m.timestamp.toDate() : new Date();
    const dateLabel = msgDate.toDateString();
    if (dateLabel !== lastDate) {
      lastDate = dateLabel;
      const sep = document.createElement("div");
      sep.className = "date-separator";
      sep.textContent = formatDateSeparator(msgDate);
      container.appendChild(sep);
    }

    container.appendChild(renderBubble(m));
  });

  if (wasAtBottom) container.scrollTop = container.scrollHeight;
}

function formatDateSeparator(date) {
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
}

function renderBubble(m) {
  const row = document.createElement("div");
  const isOut = m.senderId === state.me.uid;
  row.className = "bubble-row " + (isOut ? "out" : "in");

  const bubble = document.createElement("div");
  bubble.className = "bubble" + (m.deletedForEveryone ? " deleted" : "");

  if (m.deletedForEveryone) {
    bubble.textContent = "🚫 This message was deleted";
  } else if (m.type === "image") {
    bubble.innerHTML = `<img class="msg-image" src="${m.mediaURL}" alt="image" />`;
    bubble.querySelector("img").addEventListener("click", () => openImageViewer(m.mediaURL));
  } else if (m.type === "file") {
    bubble.innerHTML = `<a class="msg-file" href="${m.mediaURL}" target="_blank" rel="noopener">📎 ${escapeHtml(m.fileName)}</a>`;
  } else {
    bubble.appendChild(document.createTextNode(m.text));
  }

  const meta = document.createElement("div");
  meta.className = "meta";
  const time = m.timestamp?.toDate ? m.timestamp.toDate() : new Date();
  meta.innerHTML = `<span class="time">${time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>`;
  if (isOut && !m.deletedForEveryone) {
    const ticks = m.status === "read" ? "✓✓" : m.status === "delivered" ? "✓✓" : "✓";
    meta.innerHTML += `<span class="ticks ${m.status === "read" ? "read" : ""}">${ticks}</span>`;
  }
  bubble.appendChild(meta);

  if (isOut && !m.deletedForEveryone) {
    const actions = document.createElement("div");
    actions.className = "msg-actions";
    actions.innerHTML = `<button class="icon-btn" title="Delete" style="width:26px;height:26px;font-size:13px;">🗑️</button>`;
    actions.querySelector("button").addEventListener("click", () => showDeleteChoice(m.id));
    bubble.appendChild(actions);
  }

  row.appendChild(bubble);
  return row;
}

function showDeleteChoice(messageId) {
  const forEveryone = confirm("Delete for everyone? Click Cancel to delete just for you.");
  if (forEveryone) deleteForEveryone(state.activeChatId, messageId);
  else deleteForMe(state.activeChatId, messageId, state.me.uid);
}

function openImageViewer(url) {
  $("imageViewerImg").src = url;
  $("imageViewerModal").classList.remove("hidden");
}

// ===================== SENDING =====================
$("sendBtn").addEventListener("click", sendCurrentMessage);
$("messageInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendCurrentMessage();
});
$("messageInput").addEventListener("input", () => {
  if (!state.activeChatId) return;
  setTyping(state.activeChatId, state.me.uid, true);
  clearTimeout(state.typingTimeout);
  state.typingTimeout = setTimeout(() => setTyping(state.activeChatId, state.me.uid, false), 1500);
});

async function sendCurrentMessage() {
  const input = $("messageInput");
  const text = input.value.trim();
  if (!text || !state.activeChatId) return;
  input.value = "";
  setTyping(state.activeChatId, state.me.uid, false);

  const chat = state.chats.find((c) => c.id === state.activeChatId);
  const others = chat.participants.filter((p) => p !== state.me.uid);
  await sendTextMessage(state.activeChatId, state.me.uid, text, others);
}

// ---- Attachments ----
$("attachBtn").addEventListener("click", () => $("fileInput").click());
$("fileInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file || !state.activeChatId) return;

  const chat = state.chats.find((c) => c.id === state.activeChatId);
  const others = chat.participants.filter((p) => p !== state.me.uid);
  const type = file.type.startsWith("image/") ? "image" : "file";

  $("attachPreview").classList.remove("hidden");
  $("attachFileName").textContent = file.name;
  $("attachProgress").style.width = "0%";

  try {
    await sendMediaMessage(state.activeChatId, state.me.uid, file, type, others, (pct) => {
      $("attachProgress").style.width = pct + "%";
    });
  } catch (err) {
    alert("Upload failed: " + err.message);
  } finally {
    $("attachPreview").classList.add("hidden");
    $("fileInput").value = "";
  }
});
$("cancelAttachBtn").addEventListener("click", () => $("attachPreview").classList.add("hidden"));

// ---- Emoji picker ----
const emojiPicker = $("emojiPicker");
emojiPicker.innerHTML = EMOJIS.map((e) => `<span>${e}</span>`).join("");
emojiPicker.addEventListener("click", (e) => {
  if (e.target.tagName === "SPAN") {
    $("messageInput").value += e.target.textContent;
    $("messageInput").focus();
  }
});
$("emojiBtn").addEventListener("click", () => emojiPicker.classList.toggle("hidden"));
document.addEventListener("click", (e) => {
  if (!emojiPicker.contains(e.target) && e.target.id !== "emojiBtn") emojiPicker.classList.add("hidden");
});

// ===================== NEW CHAT MODAL =====================
$("newChatBtn").addEventListener("click", () => openModal("newChatModal"));
$("newChatSearch").addEventListener("input", async (e) => {
  const results = await searchUsers(state.me.uid, e.target.value);
  renderUserResults($("newChatResults"), results, async (user) => {
    const chatId = await getOrCreateDirectChat(state.me, user);
    closeModal("newChatModal");
    openChat(chatId);
  });
});

// ===================== NEW GROUP MODAL =====================
$("newGroupBtn").addEventListener("click", () => {
  state.groupSelection.clear();
  renderGroupChips();
  openModal("newGroupModal");
});
$("groupSearch").addEventListener("input", async (e) => {
  const results = await searchUsers(state.me.uid, e.target.value);
  renderUserResults($("groupResults"), results, (user) => {
    state.groupSelection.set(user.uid, user);
    renderGroupChips();
  });
});
function renderGroupChips() {
  const wrap = $("groupSelectedChips");
  wrap.innerHTML = "";
  state.groupSelection.forEach((user, uid) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.innerHTML = `${escapeHtml(user.name)} <button data-uid="${uid}">✕</button>`;
    chip.querySelector("button").addEventListener("click", () => {
      state.groupSelection.delete(uid);
      renderGroupChips();
    });
    wrap.appendChild(chip);
  });
}
$("createGroupBtn").addEventListener("click", async () => {
  const name = $("groupNameInput").value.trim();
  if (!name || state.groupSelection.size === 0) {
    alert("Enter a group name and select at least one participant.");
    return;
  }
  const chatId = await createGroupChat(state.me, [...state.groupSelection.values()], name);
  closeModal("newGroupModal");
  $("groupNameInput").value = "";
  openChat(chatId);
});

function renderUserResults(listEl, users, onPick) {
  listEl.innerHTML = "";
  if (users.length === 0) {
    listEl.innerHTML = `<li class="empty-list-hint">No users found</li>`;
    return;
  }
  users.forEach((u) => {
    const li = document.createElement("li");
    li.className = "user-result-item";
    li.innerHTML = `
      <img class="avatar" src="${u.photoURL}" alt="" />
      <div><div class="name">${escapeHtml(u.name)}</div><div class="email">${escapeHtml(u.email || "")}</div></div>`;
    li.addEventListener("click", () => onPick(u));
    listEl.appendChild(li);
  });
}

// ===================== MODAL HELPERS =====================
function openModal(id) { $(id).classList.remove("hidden"); }
function closeModal(id) { $(id).classList.add("hidden"); }
document.querySelectorAll(".close-modal").forEach((btn) =>
  btn.addEventListener("click", () => closeModal(btn.dataset.modal))
);
document.querySelectorAll(".modal").forEach((modal) =>
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); })
);

// ===================== UTIL =====================
function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
