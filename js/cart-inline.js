const whatsappNumber = '94755997160';
const CART_KEY = 'ukshop_cart_v1';
let currentUser = null;
let unsubscribeCart = null;
let cartItems = [];
function escapeHtml(str){
if (str === undefined || str === null) return '';
return String(str)
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;');
}
function formatPrice(p) {
const n = parseFloat(p) || 0;
return 'LKR. ' + n.toFixed(2);
}
function showToast(msg) {
const t = document.getElementById('toast');
t.textContent = msg;
t.classList.add('show');
clearTimeout(showToast._timer);
showToast._timer = setTimeout(() => t.classList.remove('show'), 2200);
}
function isFirestoreReady() {
try {
return typeof db !== 'undefined' && db && typeof db.collection === 'function';
} catch (e) {
return false;
}
}
function mergeLocalCartIntoFirestore(uid) {
if (!isFirestoreReady()) return Promise.resolve();
let localCart = [];
try {
const raw = localStorage.getItem(CART_KEY);
localCart = raw ? JSON.parse(raw) : [];
} catch (e) {
localCart = [];
}
if (!Array.isArray(localCart) || localCart.length === 0) return Promise.resolve();
const itemsRef = db.collection('carts').doc(uid).collection('items');
const ops = localCart.map((line) => {
const docRef = itemsRef.doc(line.id);
return docRef.get().then((doc) => {
const addQty = parseInt(line.qty, 10) || 1;
if (doc.exists) {
const existingQty = parseInt(doc.data().qty, 10) || 0;
return docRef.update({ qty: existingQty + addQty });
}
return docRef.set({
id: line.id,
name: line.name || 'Unnamed item',
price: parseFloat(line.price) || 0,
image: line.image || '',
qty: addQty,
addedAt: new Date().toISOString()
});
});
});
return Promise.all(ops).then(() => {
localStorage.removeItem(CART_KEY);
}).catch((err) => {
console.error('Error merging local cart into Firestore:', err);
});
}
function attachCartListener(uid) {
if (!isFirestoreReady()) {
console.error('[cart.html] Firestore "db" is not available. Check that firebase-config.js defines a working db (firebase.firestore()) and is loaded before this script.');
document.getElementById('foundPill').textContent = 'Could not load cart';
document.getElementById('cartList').innerHTML =
'<div class="loading-state">Could not connect to the database. Make sure firebase-config.js defines a working "db".</div>';
return;
}
if (unsubscribeCart) { unsubscribeCart(); unsubscribeCart = null; }
document.getElementById('foundPill').textContent = 'Loading your cart…';
try {
unsubscribeCart = db.collection('carts').doc(uid).collection('items')
.onSnapshot((snapshot) => {
cartItems = [];
snapshot.forEach((doc) => {
const d = doc.data();
cartItems.push({
refId: doc.id,
id: d.id || doc.id,
name: d.name || 'Unnamed item',
price: parseFloat(d.price) || 0,
image: d.image || '',
qty: parseInt(d.qty, 10) || 1
});
});
renderCart();
}, (err) => {
console.error('[cart.html] Error listening to cart (carts/' + uid + '/items):', err);
document.getElementById('foundPill').textContent = 'Could not load cart';
document.getElementById('cartList').innerHTML =
'<div class="loading-state">Failed to load your cart: ' + escapeHtml(err.message || String(err)) +
'<br><br>Check that your Firestore rules allow <code>carts/' + escapeHtml(uid) + '/items</code> to be read by this signed-in user.</div>';
});
} catch (err) {
console.error('[cart.html] Unexpected error attaching cart listener:', err);
document.getElementById('foundPill').textContent = 'Could not load cart';
document.getElementById('cartList').innerHTML =
'<div class="loading-state">Unexpected error: ' + escapeHtml(err.message || String(err)) + '</div>';
}
}
function renderCart() {
const list = document.getElementById('cartList');
const pill = document.getElementById('foundPill');
const bar = document.getElementById('checkoutBar');
if (cartItems.length === 0) {
pill.textContent = 'Your cart is empty';
list.innerHTML = `
<div class="empty-cart">
<div class="emoji">🛒</div>
<h3>Your cart is empty</h3>
<p>Add some items to see them here.</p>
<a href="index.html">Browse products</a>
</div>`;
bar.classList.remove('show');
return;
}
pill.textContent = cartItems.length + (cartItems.length === 1 ? ' Item in Cart' : ' Items in Cart');
list.innerHTML = '';
let grandTotal = 0;
cartItems.forEach((item) => {
const lineTotal = item.price * item.qty;
grandTotal += lineTotal;
const row = document.createElement('div');
row.className = 'cart-item';
row.dataset.refId = item.refId;
row.innerHTML = `
<img class="cart-img" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}"
onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1618243329711-359c196ffb38?w=600&auto=format&fit=crop&q=60';">
<div class="cart-body">
<div>
<div class="cart-name">${escapeHtml(item.name)}</div>
<div class="cart-price">🏷️ ${formatPrice(item.price)}</div>
</div>
<div class="cart-row-bottom">
<div class="qty-stepper">
<button class="qty-btn" onclick="changeQty('${item.refId}', -1)">−</button>
<span class="qty-val">${item.qty}</span>
<button class="qty-btn" onclick="changeQty('${item.refId}', 1)">+</button>
</div>
<button class="remove-btn" onclick="removeItem('${item.refId}')">🗑️ Remove</button>
</div>
<div class="line-total">Subtotal: ${formatPrice(lineTotal)}</div>
<button class="item-order-btn" onclick="orderNowItem('${item.refId}')">🛵 Order Now</button>
</div>
`;
list.appendChild(row);
});
document.getElementById('checkoutAmount').textContent = formatPrice(grandTotal);
bar.classList.add('show');
}
function changeQty(refId, delta) {
if (!currentUser || !isFirestoreReady()) return;
const item = cartItems.find(i => i.refId === refId);
if (!item) return;
const newQty = item.qty + delta;
if (newQty <= 0) { removeItem(refId); return; }
const docRef = db.collection('carts').doc(currentUser.uid).collection('items').doc(refId);
docRef.update({ qty: newQty }).catch((err) => {
console.error('Error updating qty:', err);
showToast('Could not update quantity.');
});
}
function removeItem(refId) {
if (!currentUser || !isFirestoreReady()) return;
const row = document.querySelector(`.cart-item[data-ref-id="${refId}"]`);
if (row) row.classList.add('removing');
const docRef = db.collection('carts').doc(currentUser.uid).collection('items').doc(refId);
setTimeout(() => {
docRef.delete().catch((err) => {
console.error('Error removing item:', err);
showToast('Could not remove item.');
});
}, 220);
}
function orderNowItem(refId) {
const item = cartItems.find(i => i.refId === refId);
if (!item) return;
const p = new URLSearchParams({
id: item.id || '',
name: item.name || '',
category: item.category || '',
price: item.price || '0',
description: item.description || '',
image: item.image || '',
qty: item.qty || '1'
});
window.location.href = 'order.html?' + p.toString();
}
function checkoutOnWhatsApp() {
if (cartItems.length === 0) return;
let msg = 'Hi! I would like to order the following items:%0A%0A';
let grandTotal = 0;
cartItems.forEach((item, idx) => {
const lineTotal = item.price * item.qty;
grandTotal += lineTotal;
msg += `${idx + 1}. ${item.name} x${item.qty} — ${formatPrice(lineTotal)}%0A`;
});
msg += `%0ATotal: ${formatPrice(grandTotal)}`;
window.open(`https://wa.me/${whatsappNumber}?text=${msg}`, '_blank');
}
function showCart(user) {
document.getElementById('cartWrap').classList.add('show');
}
function hideCart() {
document.getElementById('cartWrap').classList.remove('show');
document.getElementById('checkoutBar').classList.remove('show');
document.getElementById('cartList').innerHTML =
'<div class="loading-state">Please log in to see your cart.</div>';
}
function waitForFirebaseAuth(cb) {
const maxWait = 8000;
const start = Date.now();
(function poll() {
if (window.firebase && window.firebase.auth) {
cb(null);
} else if (Date.now() - start > maxWait) {
cb(new Error('Firebase not found. Make sure firebase-config.js and password.js are loaded before this script.'));
} else {
setTimeout(poll, 100);
}
})();
}
function initAuthListener() {
waitForFirebaseAuth(function (err) {
if (err) {
document.getElementById('cartList').innerHTML =
'<div class="loading-state">' + escapeHtml(err.message) + '</div>';
return;
}
firebase.auth().onAuthStateChanged((user) => {
if (unsubscribeCart) { unsubscribeCart(); unsubscribeCart = null; }
if (user) {
console.log('[cart.html] Signed in as', user.uid, user.email || '(no email)');
currentUser = user;
showCart(user);
mergeLocalCartIntoFirestore(user.uid)
.catch((err) => console.error('[cart.html] mergeLocalCartIntoFirestore failed:', err))
.finally(() => {
attachCartListener(user.uid);
});
} else {
console.log('[cart.html] No signed-in user.');
currentUser = null;
cartItems = [];
hideCart();
}
});
});
}
(function init() {
initAuthListener();
})();