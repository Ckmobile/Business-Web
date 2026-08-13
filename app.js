import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, arrayUnion, arrayRemove,
  writeBatch
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let me = null, activeChat = null, unsubscribeChats = null, unsubscribeMessages = null;
let currentFilter = "all", replyTo = null, typingTimer = null;

const $ = (id) => document.getElementById(id);
const els = {
  auth: $("auth-screen"), app: $("app"), chatList: $("chat-list"), messages: $("messages"),
  input: $("message-input"), composer: $("composer"), file: $("file-input"), toast: $("toast")
};

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => els.toast.classList.remove("show"), 2600);
}
function initials(name = "?") {
  return name.trim().split(/\s+/).slice(0,2).map(x => x[0]).join("").toUpperCase() || "?";
}
function chatIdFor(a,b) { return [a,b].sort().join("_"); }
function escapeHtml(s="") {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function formatTime(ts) {
  const d = ts?.toDate ? ts.toDate() : new Date(ts || Date.now());
  return d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
}

async function ensureUser(user) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  const data = {
    uid: user.uid, displayName: user.displayName || user.email?.split("@")[0] || "User",
    email: user.email || "", photoURL: user.photoURL || "",
    about: "Available", online: true, lastSeen: serverTimestamp(),
    createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp()
  };
  await setDoc(userRef, data, {merge:true});
  await setDoc(doc(db, "presence", user.uid), {online:true, lastSeen:serverTimestamp()}, {merge:true});
}

function renderUser(user) {
  const name = user.displayName || "User";
  $("me-name").textContent = name;
  $("me-status").textContent = "online";
  $("me-avatar").textContent = initials(name);
}

async function loadChats() {
  if (unsubscribeChats) unsubscribeChats();
  const q = query(collection(db,"chats"), where("members","array-contains",me.uid), orderBy("updatedAt","desc"), limit(100));
  unsubscribeChats = onSnapshot(q, async snap => {
    const rows = [];
    for (const d of snap.docs) {
      const c = d.data();
      const peerId = c.members.find(id => id !== me.uid);
      if (!peerId) continue;
      const u = await getDoc(doc(db,"users",peerId));
      rows.push({id:d.id, ...c, peerId, peer:u.exists()?u.data():{displayName:"Unknown"}});
    }
    renderChats(rows);
  }, err => toast(err.message));
}

function renderChats(rows) {
  const term = $("chat-search").value.toLowerCase();
  const filtered = rows.filter(c => {
    const name = c.peer.displayName?.toLowerCase() || "";
    const matchesSearch = !term || name.includes(term) || (c.lastMessage?.text || "").toLowerCase().includes(term);
    const unread = (c.unread?.[me.uid] || 0) > 0;
    const group = !!c.isGroup;
    return matchesSearch && (currentFilter==="all" || (currentFilter==="unread" && unread) || (currentFilter==="groups" && group));
  });
  els.chatList.innerHTML = filtered.map(c => `
    <button class="chat-row ${activeChat?.id===c.id?'selected':''}" data-chat="${c.id}">
      <div class="avatar">${initials(c.peer.displayName)}</div>
      <div class="chat-copy">
        <div><strong>${escapeHtml(c.peer.displayName || "Chat")}</strong><time>${formatTime(c.updatedAt)}</time></div>
        <div><span>${escapeHtml(c.lastMessage?.text || "No messages yet")}</span>${(c.unread?.[me.uid]||0)>0?`<b class="unread">${c.unread[me.uid]}</b>`:""}</div>
      </div>
    </button>`).join("");
  els.chatList.querySelectorAll("[data-chat]").forEach(b => b.onclick = () => openChat(b.dataset.chat));
}

async function openChat(id) {
  activeChat = {id};
  const cSnap = await getDoc(doc(db,"chats",id));
  if (!cSnap.exists()) return;
  const c = cSnap.data();
  const peerId = c.members.find(x => x !== me.uid);
  const pSnap = await getDoc(doc(db,"users",peerId));
  const peer = pSnap.exists()?pSnap.data():{displayName:"Unknown",about:""};
  activeChat = {...activeChat, ...c, peerId, peer};
  $("peer-name").textContent = peer.displayName || "Contact";
  $("peer-presence").textContent = peer.online ? "online" : `last seen ${formatTime(peer.lastSeen)}`;
  $("peer-avatar").textContent = initials(peer.displayName);
  $("details-name").textContent = peer.displayName || "Contact";
  $("details-about").textContent = peer.about || "";
  $("details-avatar").textContent = initials(peer.displayName);
  els.input.disabled = false;
  els.input.focus();

  await updateDoc(doc(db,"chats",id), {[`unread.${me.uid}`]:0}).catch(()=>{});

  if (unsubscribeMessages) unsubscribeMessages();
  const mq = query(collection(db,"chats",id,"messages"), orderBy("createdAt","asc"), limit(500));
  unsubscribeMessages = onSnapshot(mq, snap => {
    renderMessages(snap.docs.map(d => ({id:d.id,...d.data()})));
    markDelivered(snap.docs);
  }, err => toast(err.message));
}

function renderMessages(messages) {
  els.messages.innerHTML = "";
  if (!messages.length) {
    els.messages.innerHTML = `<div class="empty-state compact"><div class="empty-icon">✦</div><p>No messages yet. Say hello.</p></div>`;
    return;
  }
  for (const m of messages) {
    const mine = m.senderId === me.uid;
    const reply = m.replyTo ? `<div class="quoted">${escapeHtml(m.replyTo.text || "Message")}</div>` : "";
    const body = m.type==="image" ? `<img class="media-img" src="${m.fileUrl}" alt="image">`
      : m.type==="video" ? `<video class="media-video" src="${m.fileUrl}" controls></video>`
      : m.type==="file" ? `<a class="file-card" target="_blank" href="${m.fileUrl}">📎 ${escapeHtml(m.fileName || "Attachment")}</a>`
      : `<div class="message-text">${escapeHtml(m.text || "")}</div>`;
    els.messages.insertAdjacentHTML("beforeend", `
      <article class="bubble-row ${mine?'mine':''}">
        <div class="bubble" data-message="${m.id}">
          ${reply}${body}
          <div class="meta">${formatTime(m.createdAt)} ${mine?`<span class="ticks ${m.read?'read':''}">${m.read?'✓✓':'✓'}</span>`:""}</div>
          <div class="bubble-actions">
            <button data-reply="${m.id}">↩</button><button data-react="${m.id}">♡</button>
          </div>
          ${m.reactions ? `<div class="reactions">${Object.values(m.reactions).join(" ")}</div>`:""}
        </div>
      </article>`);
  }
  els.messages.querySelectorAll("[data-reply]").forEach(b => b.onclick=()=>startReply(b.dataset.reply));
  els.messages.querySelectorAll("[data-react]").forEach(b => b.onclick=()=>reactTo(b.dataset.react));
  els.messages.scrollTop = els.messages.scrollHeight;
}

async function markDelivered(docs) {
  const batch = writeBatch(db);
  let changed = 0;
  docs.forEach(d => {
    const m = d.data();
    if (m.senderId !== me.uid && !m.delivered) { batch.update(d.ref,{delivered:true}); changed++; }
  });
  if (changed) await batch.commit().catch(()=>{});
}

async function sendText(text) {
  if (!activeChat || !text.trim()) return;
  const chatRef = doc(db,"chats",activeChat.id);
  const msgRef = await addDoc(collection(chatRef,"messages"), {
    senderId:me.uid, text:text.trim(), type:"text", createdAt:serverTimestamp(),
    delivered:false, read:false, replyTo:replyTo ? {text:replyTo.text || "", senderId:replyTo.senderId} : null
  });
  await updateDoc(chatRef, {
    lastMessage:{text:text.trim(), senderId:me.uid, createdAt:serverTimestamp()},
    updatedAt:serverTimestamp(), [`unread.${activeChat.peerId}`]: (activeChat.unread?.[activeChat.peerId] || 0)+1
  });
  clearReply();
  await updateDoc(msgRef,{id:msgRef.id}).catch(()=>{});
}

async function uploadFiles(files) {
  if (!activeChat) return;
  for (const file of files) {
    toast(`Uploading ${file.name}…`);
    const path = `chat-media/${activeChat.id}/${Date.now()}_${file.name.replace(/[^\w.\-]/g,"_")}`;
    const storageRef = ref(storage,path);
    await uploadBytes(storageRef,file);
    const url = await getDownloadURL(storageRef);
    const type = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "file";
    await addDoc(collection(db,"chats",activeChat.id,"messages"), {
      senderId:me.uid, type, fileUrl:url, fileName:file.name, mimeType:file.type,
      size:file.size, createdAt:serverTimestamp(), delivered:false, read:false
    });
    await updateDoc(doc(db,"chats",activeChat.id), {
      lastMessage:{text:`📎 ${file.name}`,senderId:me.uid,createdAt:serverTimestamp()},
      updatedAt:serverTimestamp()
    });
  }
}

function startReply(id) {
  const el = document.querySelector(`[data-message="${id}"]`);
  if (!el) return;
  const text = el.querySelector(".message-text")?.textContent || "Attachment";
  replyTo = {id,text};
  $("reply-text").textContent = text;
  $("reply-preview").classList.remove("hidden");
  els.input.focus();
}
function clearReply(){ replyTo=null; $("reply-preview").classList.add("hidden"); }
async function reactTo(id) {
  const choices = ["❤️","👍","😂","😮","😢"];
  const emoji = choices[Math.floor(Math.random()*choices.length)];
  await updateDoc(doc(db,"chats",activeChat.id,"messages",id), {[`reactions.${me.uid}`]:emoji});
}
async function markTyping() {
  if (!activeChat) return;
  await setDoc(doc(db,"typing",`${activeChat.id}_${me.uid}`),{chatId:activeChat.id,userId:me.uid,typing:true,updatedAt:serverTimestamp()},{merge:true});
  clearTimeout(typingTimer);
  typingTimer=setTimeout(()=>setDoc(doc(db,"typing",`${activeChat.id}_${me.uid}`),{typing:false,updatedAt:serverTimestamp()},{merge:true}),1800);
}

$("google-login").onclick = async () => {
  try { await signInWithPopup(auth,new GoogleAuthProvider()); } catch(e){toast(e.message);}
};
$("email-auth-form").onsubmit = async e => {
  e.preventDefault();
  try { await signInWithEmailAndPassword(auth,$("email").value,$("password").value); }
  catch(e){toast(e.message);}
};
$("signup").onclick = async () => {
  try {
    const cred = await createUserWithEmailAndPassword(auth,$("email").value,$("password").value);
    await updateProfile(cred.user,{displayName:cred.user.email.split("@")[0]});
    await ensureUser(cred.user);
  } catch(e){toast(e.message);}
};
$("logout-btn").onclick = () => signOut(auth);
$("chat-search").oninput = loadChats;
document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=> {
  document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));
  b.classList.add("active"); currentFilter=b.dataset.filter; loadChats();
});
$("composer").onsubmit = async e => {
  e.preventDefault();
  const text = els.input.value;
  els.input.value = "";
  try { await sendText(text); } catch(e){toast(e.message);}
};
els.input.oninput = markTyping;
$("attach-btn").onclick = () => els.file.click();
els.file.onchange = () => uploadFiles([...els.file.files]).catch(e=>toast(e.message));
$("cancel-reply").onclick = clearReply;
$("conversation-menu").onclick = () => $("details-panel").classList.toggle("hidden");
$("close-details").onclick = () => $("details-panel").classList.add("hidden");
$("menu-btn").onclick = () => toast("Settings, privacy, notifications and linked-device controls belong here.");
$("status-btn").onclick = () => toast("Status composer can be wired to the status collection.");
$("new-chat-btn").onclick = async () => {
  const email = prompt("Enter the contact's email:");
  if (!email || !me) return;
  const q = query(collection(db,"users"),where("email","==",email),limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return toast("User not found.");
  const peer = snap.docs[0].data();
  if (peer.uid===me.uid) return toast("Choose another user.");
  const id = chatIdFor(me.uid,peer.uid);
  await setDoc(doc(db,"chats",id),{members:[me.uid,peer.uid],isGroup:false,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),unread:{[me.uid]:0,[peer.uid]:0}},{merge:true});
  openChat(id);
};
$("video-call").onclick = () => toast("WebRTC call UI is scaffolded; add TURN/STUN and signaling for production.");
$("audio-call").onclick = () => toast("WebRTC audio call UI is scaffolded; add TURN/STUN and signaling for production.");
$("emoji-btn").onclick = () => { els.input.value += "🙂"; els.input.focus(); };

onAuthStateChanged(auth, async user => {
  if (!user) {
    me=null; els.auth.classList.remove("hidden"); els.app.classList.add("hidden");
    return;
  }
  me=user;
  await ensureUser(user);
  renderUser(user);
  els.auth.classList.add("hidden"); els.app.classList.remove("hidden");
  await loadChats();
  window.addEventListener("beforeunload",()=>setDoc(doc(db,"presence",me.uid),{online:false,lastSeen:serverTimestamp()},{merge:true}));
});
