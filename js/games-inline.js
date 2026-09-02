const gamesRef = db.collection('games');
let unsubscribeGames = null;
function switchTab(tab){
document.getElementById('tabBtnGames').classList.toggle('active', tab==='games');
document.getElementById('tabBtnAdmin').classList.toggle('active', tab==='admin');
document.getElementById('panelGames').classList.toggle('active', tab==='games');
document.getElementById('panelAdmin').classList.toggle('active', tab==='admin');
}
function listenGames(){
if(unsubscribeGames) unsubscribeGames();
unsubscribeGames = gamesRef.orderBy('gName').onSnapshot(snapshot=>{
const games = [];
snapshot.forEach(doc=> games.push({ id: doc.id, ...doc.data() }));
renderPublicGrid(games);
renderAdminList(games);
}, err=>{
console.error(err);
document.getElementById('gamesGrid').innerHTML =
'<div class="empty-state"><p>ගේම්ස් load කිරීමේදී දෝෂයක්.</p></div>';
});
}
function esc(str){
return String(str||'').replace(/[&<>"']/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
function renderPublicGrid(games){
const grid = document.getElementById('gamesGrid');
if(!games.length){
grid.innerHTML = `
<div class="empty-state">
<div class="e-icon">
<svg viewBox="0 0 24 24"><path d="M11 15h2v2h-2v-2Zm0-8h2v6h-2V7Z"/></svg>
</div>
<h3>තවම ගේම්ස් නැත</h3>
<p style="margin-top:6px;">Admin Panel එකෙන් පළමු ගේම එකතු කරන්න.</p>
</div>`;
return;
}
grid.innerHTML = games.map(g => `
<div class="game-card" onclick="playGame('${esc(g.gLink)}')">
<img class="thumb" src="${esc(g.gImage)}" alt="${esc(g.gName)}" onerror="this.src='https://placehold.co/300x300/ece8ff/6d5bd0?text=Game'">
<div class="info">
<h3>${esc(g.gName)}</h3>
<span class="play-pill">
<svg viewBox="0 0 24 24" width="10" height="10"><path fill="#fff" d="M8 5v14l11-7L8 5Z"/></svg>
Play Now
</span>
</div>
</div>
`).join('');
}
function playGame(link){
if(!link) return;
window.location.href = link;
}
function renderAdminList(games){
const list = document.getElementById('adminGamesList');
if(!games.length){
list.innerHTML = `<p style="color:var(--muted);font-size:13.5px;text-align:center;padding:20px 0;">තවම ගේම්ස් එකතු කර නැත.</p>`;
return;
}
list.innerHTML = games.map(g => `
<div class="admin-game-row">
<img src="${esc(g.gImage)}" onerror="this.src='https://placehold.co/100x100/ece8ff/6d5bd0?text=%3F'">
<div class="meta">
<h4>${esc(g.gName)}</h4>
<span>${esc(g.gLink)}</span>
</div>
<div class="actions">
<button class="icon-btn edit" onclick='editGame(${JSON.stringify(g).replace(/'/g,"&#39;")})'>
<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25ZM20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/></svg>
</button>
<button class="icon-btn delete" onclick="deleteGame('${g.id}')">
<svg viewBox="0 0 24 24"><path d="M6 7h12l-1 14H7L6 7Zm3-4h6l1 2H8l1-2Z"/></svg>
</button>
</div>
</div>
`).join('');
}
function editGame(g){
document.getElementById('editingId').value = g.id;
document.getElementById('gName').value = g.gName || '';
document.getElementById('gImage').value = g.gImage || '';
document.getElementById('gLink').value = g.gLink || '';
document.getElementById('formTitle').textContent = 'Edit Game';
document.getElementById('saveBtnLabel').textContent = 'Update Game';
document.getElementById('cancelEditBtn').hidden = false;
document.getElementById('gameForm').scrollIntoView({behavior:'smooth', block:'center'});
}
function resetForm(){
document.getElementById('editingId').value = '';
document.getElementById('gameForm').reset();
document.getElementById('formTitle').textContent = 'Add New Game';
document.getElementById('saveBtnLabel').textContent = 'Add Game';
document.getElementById('cancelEditBtn').hidden = true;
hideError('formError');
}
function showError(id, msg){
const el = document.getElementById(id);
el.textContent = msg;
el.classList.add('show');
}
function hideError(id){
const el = document.getElementById(id);
el.classList.remove('show');
el.textContent='';
}
function saveGame(){
hideError('formError');
const id = document.getElementById('editingId').value;
const gName = document.getElementById('gName').value.trim();
const gImage = document.getElementById('gImage').value.trim();
const gLink = document.getElementById('gLink').value.trim();
if(!gName || !gImage || !gLink){
showError('formError', 'සියලුම කොටස් පුරවන්න.');
return;
}
const data = { gName, gImage, gLink };
const action = id
? gamesRef.doc(id).update(data)
: gamesRef.add(data);
action.then(()=>{
resetForm();
}).catch(err=>{
showError('formError', 'Save කිරීමේදී දෝෂයක්: ' + err.message);
});
}
function deleteGame(id){
if(!confirm('මෙම ගේම ඉවත් කරන්නද?')) return;
gamesRef.doc(id).delete().catch(err=> alert('Delete දෝෂයක්: ' + err.message));
}
function doLogin(){
hideError('loginError');
const email = document.getElementById('adminEmail').value.trim();
const password = document.getElementById('adminPassword').value;
const btn = document.getElementById('loginBtn');
if(!email || !password){
showError('loginError', 'Email සහ Password ඇතුළත් කරන්න.');
return;
}
btn.disabled = true;
btn.innerHTML = '<span class="spinner"></span><span>Logging in...</span>';
auth.signInWithEmailAndPassword(email, password)
.catch(err=>{
showError('loginError', 'Login අසාර්ථකයි: වැරදි Email/Password.');
})
.finally(()=>{
btn.disabled = false;
btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M10 17v-2H3v-2h7V9l5 4-5 4Zm9 3H12v-2h7V6h-7V4h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2Z"/></svg><span>Login</span>';
});
}
function doLogout(){
auth.signOut();
}
auth.onAuthStateChanged(user=>{
const loginBox = document.getElementById('loginBox');
const adminContent = document.getElementById('adminContent');
if(user){
loginBox.hidden = true;
adminContent.hidden = false;
document.getElementById('adminWhoEmail').textContent = user.email;
document.getElementById('adminEmail').value = '';
document.getElementById('adminPassword').value = '';
resetForm();
} else {
loginBox.hidden = false;
adminContent.hidden = true;
}
});
listenGames();