function adminToast(message, type) {
type = type || 'info';
var stack = document.getElementById('toastStack');
var icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
var el = document.createElement('div');
el.className = 'toast-notif toast-' + type;
el.innerHTML = '<i class="fas ' + (icons[type] || icons.info) + '"></i><span>' + message + '</span>';
stack.appendChild(el);
requestAnimationFrame(function() { el.classList.add('toast-show'); });
setTimeout(function() {
el.classList.remove('toast-show');
el.classList.add('toast-hide');
setTimeout(function() { el.remove(); }, 350);
}, 3200);
}
var ADMIN_EMAIL = 'kavishkairoshan54@gmail.com';
var appMain = document.getElementById('appMain');
firebase.auth().onAuthStateChanged(function(user) {
if (user && user.email === ADMIN_EMAIL) {
initOrdersPage(user, true);
} else if (user) {
initOrdersPage(user, false);
} else {
appMain.innerHTML = '<div style="text-align:center;padding:60px 24px;"><h2 style="color:#5B21B6;margin-bottom:12px;">Please Log In</h2><p style="color:#666;margin-bottom:24px;">Log in to view your orders.</p><button onclick="window.location.href=\'index.html\'" style="background:linear-gradient(135deg,#5B21B6,#7C3AED);color:#fff;border:none;padding:12px 32px;border-radius:100px;font-size:1rem;font-weight:600;cursor:pointer;">← Back to Shop</button></div>';
}
});
function animateCount(el, target) {
var start = parseInt(el.textContent, 10) || 0;
target = parseInt(target, 10) || 0;
if (start === target) { el.textContent = target; return; }
var duration = 600, startTime = performance.now();
function step(now) {
var progress = Math.min((now - startTime) / duration, 1);
var eased = 1 - Math.pow(1 - progress, 3);
el.textContent = Math.round(start + (target - start) * eased);
if (progress < 1) requestAnimationFrame(step);
else el.textContent = target;
}
requestAnimationFrame(step);
}
function initOrdersPage(currentUser, isAdmin) {
var db = firebase.firestore();
var statLabel = isAdmin ? 'Total Customers / Orders' : 'My Orders';
appMain.innerHTML = `
<div class="customers-stat-line">
<div class="customers-stat-icon"><i class="fas fa-${isAdmin ? 'users' : 'box-open'}"></i></div>
<div class="customers-stat-info">
<h3 id="ordersCount">—</h3>
<p>${statLabel}</p>
</div>
</div>
<!-- Products horizontal menu -->
<div class="products-menu-wrap" id="productMenuWrap">
<div class="products-menu-header">
<h3><i class="fas fa-box-open"></i> All Products</h3>
<span id="productMenuCount">Loading…</span>
</div>
<div class="products-scroll" id="productMenuScroll">
<div class="products-empty-mini">Loading products…</div>
</div>
</div>
<div id="loading" class="orders-grid" aria-busy="true">
<div class="skeleton-card">
<div class="sk sh-20 sw-55p"></div>
<div class="sk sh-12 sw-95p mt-16"></div>
<div class="sk sh-12 sw-85p mt-12"></div>
<div class="sk sh-12 sw-70p mt-12"></div>
</div>
<div class="skeleton-card">
<div class="sk sh-20 sw-55p"></div>
<div class="sk sh-12 sw-95p mt-16"></div>
<div class="sk sh-12 sw-85p mt-12"></div>
<div class="sk sh-12 sw-70p mt-12"></div>
</div>
<div class="skeleton-card">
<div class="sk sh-20 sw-55p"></div>
<div class="sk sh-12 sw-95p mt-16"></div>
<div class="sk sh-12 sw-85p mt-12"></div>
<div class="sk sh-12 sw-70p mt-12"></div>
</div>
</div>
<div id="resultsArea" hidden>
<div class="tabs-wrap">
<div class="tabs-nav">
<button class="tab-btn active" data-tab="new" id="tabBtnNew">
<span class="tab-icon">📦</span>
<span>New Orders</span>
<span class="tab-badge" id="newCount">0</span>
</button>
<button class="tab-btn" data-tab="pending" id="tabBtnPending">
<span class="tab-icon">⏳</span>
<span>Pending</span>
<span class="tab-badge" id="pendingCount">0</span>
</button>
</div>
</div>
<div class="tab-panel active" id="panel-new">
<div id="newOrdersContainer" class="orders-grid"></div>
</div>
<div class="tab-panel" id="panel-pending">
<div id="pendingOrdersContainer" class="orders-grid"></div>
</div>
</div>
`;
document.getElementById('deleteModalOverlay').innerHTML = `
<div class="modal-box">
<div class="modal-head">
<h2 class="modal-title">Delete Customer Record?</h2>
<button type="button" class="modal-close" id="deleteModalClose" aria-label="Close">&times;</button>
</div>
<div class="delete-modal-body">
<div class="delete-warning-icon">🗑️</div>
<p class="delete-warning-text">
This action <strong>cannot be undone</strong>.<br>
This customer's order will be permanently removed from Firebase.
</p>
<div class="modal-actions">
<button type="button" class="btn btn-ghost" id="deleteCancelBtn">Cancel</button>
<button type="button" class="btn btn-danger" id="deleteConfirmBtn">Yes, Delete</button>
</div>
</div>
</div>
`;
var resultsArea = document.getElementById('resultsArea');
var newOrdersContainer = document.getElementById('newOrdersContainer');
var pendingOrdersContainer = document.getElementById('pendingOrdersContainer');
var loading = document.getElementById('loading');
var newCountEl = document.getElementById('newCount');
var pendingCountEl = document.getElementById('pendingCount');
var ordersCountEl = document.getElementById('ordersCount');
var tabBtnNew = document.getElementById('tabBtnNew');
var tabBtnPending = document.getElementById('tabBtnPending');
var panelNew = document.getElementById('panel-new');
var panelPending = document.getElementById('panel-pending');
var deleteOverlay = document.getElementById('deleteModalOverlay');
var deleteModalClose = document.getElementById('deleteModalClose');
var deleteCancelBtn = document.getElementById('deleteCancelBtn');
var deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
var searchInput = document.getElementById('searchInput');
var searchBtn = document.getElementById('searchBtn');
(function loadProducts() {
var scroll = document.getElementById('productMenuScroll');
var countEl = document.getElementById('productMenuCount');
db.collection('items').get().then(function(snap) {
if (snap.empty) {
scroll.innerHTML = '<div class="products-empty-mini">No products found.</div>';
if (countEl) countEl.textContent = '0 items';
return;
}
if (countEl) countEl.textContent = snap.size + ' items';
scroll.innerHTML = '';
snap.forEach(function(doc, i) {
var item = doc.data();
var card = document.createElement('div');
card.className = 'product-mini-card card-enter';
card.style.animationDelay = (i * 0.05) + 's';
var cat = item.categories && item.categories.length ? item.categories[0] : (item.category || '');
card.innerHTML =
'<img class="product-mini-img" src="' + (item.image || 'https://via.placeholder.com/180x110') +
'" alt="' + (item.name || '') + '" loading="lazy">' +
'<div class="product-mini-info">' +
'<div class="product-mini-name">' + (item.name || '—') + '</div>' +
'<div class="product-mini-price">LKR ' + parseFloat(item.price || 0).toFixed(2) + '</div>' +
(cat ? '<span class="product-mini-cat">' + cat.toUpperCase() + '</span>' : '') +
'</div>';
scroll.appendChild(card);
});
}).catch(function() {
scroll.innerHTML = '<div class="products-empty-mini">Could not load products.</div>';
});
})();
var allOrders = [];
var currentSearch = '';
var pendingDeleteId = null;
var activeTab = 'new';
function switchTab(tab) {
activeTab = tab;
tabBtnNew.classList.toggle('active', tab === 'new');
tabBtnPending.classList.toggle('active', tab === 'pending');
panelNew.classList.toggle('active', tab === 'new');
panelPending.classList.toggle('active', tab === 'pending');
}
tabBtnNew.addEventListener('click', function() { switchTab('new'); });
tabBtnPending.addEventListener('click', function() { switchTab('pending'); });
var searchBackGuard = false;
function armSearchBackGuard() {
if (!searchBackGuard) {
try { history.pushState({ searchGuard: true }, '', location.href); } catch (e) {}
searchBackGuard = true;
}
}
window.addEventListener('popstate', function() {
if (searchInput && searchInput.value.trim() !== '') {
searchInput.value = '';
currentSearch = '';
renderOrders();
searchBackGuard = false;
armSearchBackGuard();
} else {
searchBackGuard = false;
}
});
if (searchInput) {
searchInput.addEventListener('input', function(e) {
currentSearch = e.target.value;
if (currentSearch.trim() !== '') armSearchBackGuard();
renderOrders();
});
searchInput.addEventListener('keydown', function(e) {
if (e.key === 'Enter') { e.preventDefault(); currentSearch = searchInput.value; renderOrders(); }
});
}
if (searchBtn) {
searchBtn.addEventListener('click', function() {
currentSearch = searchInput ? searchInput.value : '';
renderOrders();
});
}
function escapeHtml(str) {
if (str == null) return '';
return String(str)
.replace(/&/g,'&amp;').replace(/</g,'&lt;')
.replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDateTime(createdAt) {
if (!createdAt || !createdAt.seconds) return 'N/A';
return new Date(createdAt.seconds * 1000).toLocaleString('en-GB');
}
var COLOR_MAP = {
'dark purple': { hex: '#5B2C82', label: 'තද දම් (Dark Purple)' },
'light purple': { hex: '#C9A8E0', label: 'ලා දම් (Light Purple)' },
'dark blue': { hex: '#1A4D8F', label: 'තද නිල් (Dark Blue)' },
'light blue': { hex: '#A9D2F5', label: 'ලා නිල් (Light Blue)' },
'dark green': { hex: '#1B5E3A', label: 'තද කොල (Dark Green)' },
'white': { hex: '#FFFFFF', label: 'සුදු (White)' }
};
function renderColorSwatch(colorKey) {
if (!colorKey) return '<div><span class="label">Colour:</span> —</div>';
var key = String(colorKey).trim().toLowerCase();
var info = COLOR_MAP[key] || { hex: '#A0AABF', label: escapeHtml(colorKey) };
return '<div class="swatch-row"><span class="label">Colour:</span>' +
'<span class="swatch-dot" style="background:' + info.hex + ';"></span>' +
'<span>' + info.label + '</span></div>';
}
function showToast(msg, type) {
type = type || 'info';
var wrap = document.getElementById('toastWrap');
if (!wrap) return;
var toast = document.createElement('div');
toast.className = 'toast toast--' + type;
var icons = { success: '✅', error: '❌', info: 'ℹ️' };
toast.innerHTML = '<span class="toast-icon">' + (icons[type] || 'ℹ️') + '</span><span>' + escapeHtml(msg) + '</span>';
wrap.appendChild(toast);
requestAnimationFrame(function() { toast.classList.add('toast--in'); });
setTimeout(function() {
toast.classList.remove('toast--in');
toast.classList.add('toast--out');
setTimeout(function() { toast.remove(); }, 420);
}, 3300);
}
function setOrderPending(docId, isPending) {
db.collection('orders').doc(docId).update({ pending: isPending })
.then(function() {
if (isPending) {
showToast('Order marked as Pending.', 'success');
} else {
showToast('Order marked as New.', 'success');
}
})
.catch(function(err) { showToast('Could not update order: ' + err.message, 'error'); });
}
function buildOrderCard(order, index) {
var data = order.data;
var docId = order.id;
var customer = data.customer || {};
var item = data.item || {};
var isPending = !!data.pending;
var qty = item.quantity != null ? item.quantity : (item.qty != null ? item.qty : (data.quantity != null ? data.quantity : (data.qty != null ? data.qty : null)));
var totalPrice = data.totalPrice != null ? data.totalPrice : (item.totalPrice != null ? item.totalPrice : null);
var card = document.createElement('div');
card.className = 'order-card' + (isPending ? ' is-pending' : '');
card.style.animationDelay = (index * 0.05) + 's';
card.innerHTML =
'<div class="order-top-row">' +
'<div class="order-id">🆔 ' + escapeHtml(data.item && data.item.id ? data.item.id : docId) + '</div>' +
'<label class="pending-toggle">' +
'<input type="checkbox" class="pending-checkbox"' + (isPending ? ' checked' : '') + '>' +
'<span class="track"><span class="thumb">✓</span></span>' +
'<span class="toggle-label">Pending</span>' +
'</label>' +
'</div>' +
'<div class="section section--product">' +
'<div class="section-heading">📦 Product Details</div>' +
'<div><span class="label">Image:</span><br>' +
'<div class="product-photo-wrap">' +
'<img class="product-photo" src="' + (item.image || item.imageUrl || 'placeholder.jpg') + '" alt="' + escapeHtml(item.name || 'Product') + '" loading="lazy">' +
'</div>' +
'</div>' +
'<div><span class="label">Product:</span> ' + escapeHtml(item.name || item.product || '—') + '</div>' +
'<div><span class="label">Description:</span> ' + escapeHtml(item.description || item.desc || '—') + '</div>' +
'<div><span class="label">Quantity:</span> ' + escapeHtml(qty != null ? qty : '—') + '</div>' +
'<div><span class="label">Unit Price:</span> ' + (item.price != null ? 'LKR ' + escapeHtml(item.price) : '—') + '</div>' +
'<div><span class="label">Total:</span> ' + (totalPrice != null ? 'LKR ' + escapeHtml(parseFloat(totalPrice).toFixed(2)) : '—') + '</div>' +
'</div>' +
'<div class="section">' +
'<div class="section-heading">👤 Customer Details</div>' +
'<div><span class="label">Name:</span> ' + escapeHtml(customer.name) + '</div>' +
'<div><span class="label">Phone:</span> ' + escapeHtml(customer.phone) + '</div>' +
'<div><span class="label">Address:</span> ' + escapeHtml(customer.address) + '</div>' +
'<div><span class="label">Note:</span> ' + escapeHtml(customer.note || '—') + '</div>' +
'</div>' +
'<div class="card-meta">' +
'<span>Order placed</span>' +
'<span>' + formatDateTime(data.createdAt) + '</span>' +
'</div>' +
'<div class="card-actions">' +
'<button type="button" class="action-delete" title="Delete this record"><span>🗑</span><span>Delete Record</span></button>' +
'</div>';
card.querySelector('.action-delete').addEventListener('click', function(e) {
e.stopPropagation();
openDeleteModal(docId);
});
card.querySelector('.pending-checkbox').addEventListener('change', function(e) {
e.stopPropagation();
setOrderPending(docId, e.target.checked);
});
return card;
}
function renderOrders() {
var filtered = allOrders.slice();
if (currentSearch.trim() !== '') {
var q = currentSearch.trim().toLowerCase();
filtered = filtered.filter(function(o) {
var c = o.data.customer || {};
return (c.name || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q);
});
}
var newOrders = filtered.filter(function(o) { return !o.data.pending; });
var pendingOrders = filtered.filter(function(o) { return !!o.data.pending; });
if (typeof animateCount === 'function') animateCount(ordersCountEl, filtered.length);
else ordersCountEl.textContent = filtered.length;
newCountEl.textContent = newOrders.length;
pendingCountEl.textContent = pendingOrders.length;
newOrdersContainer.innerHTML = '';
if (newOrders.length === 0) {
newOrdersContainer.innerHTML =
'<div class="empty-state' + (currentSearch ? '' : ' empty-state--compact') + '">' +
'<span class="empty-icon">📦</span>' +
'<p class="empty-title">' + (currentSearch ? 'No results found' : 'No new orders yet') + '</p>' +
'<p class="empty-desc">' + (currentSearch ? 'Try a different search term.' : 'Incoming orders will appear here automatically.') + '</p></div>';
} else {
newOrders.forEach(function(order, i) { newOrdersContainer.appendChild(buildOrderCard(order, i)); });
}
pendingOrdersContainer.innerHTML = '';
if (pendingOrders.length === 0) {
pendingOrdersContainer.innerHTML =
'<div class="empty-state empty-state--compact">' +
'<span class="empty-icon">⏳</span>' +
'<p class="empty-title">No pending orders</p>' +
'<p class="empty-desc">Toggle "Pending" on any order to move it here.</p></div>';
} else {
pendingOrders.forEach(function(order, i) { pendingOrdersContainer.appendChild(buildOrderCard(order, i)); });
}
}
function openDeleteModal(id) {
pendingDeleteId = id;
deleteOverlay.hidden = false;
requestAnimationFrame(function() { deleteOverlay.classList.add('overlay--visible'); });
}
function closeDeleteModal() {
deleteOverlay.classList.remove('overlay--visible');
setTimeout(function() { deleteOverlay.hidden = true; pendingDeleteId = null; }, 240);
}
deleteModalClose.addEventListener('click', closeDeleteModal);
deleteCancelBtn.addEventListener('click', closeDeleteModal);
deleteOverlay.addEventListener('click', function(e) { if (e.target === deleteOverlay) closeDeleteModal(); });
deleteConfirmBtn.addEventListener('click', function() {
if (!pendingDeleteId) return;
var id = pendingDeleteId;
deleteConfirmBtn.textContent = 'Deleting…';
deleteConfirmBtn.disabled = true;
db.collection('orders').doc(id).delete()
.then(function() { closeDeleteModal(); showToast('Customer record deleted.', 'success'); })
.catch(function(err) { showToast('Could not delete: ' + err.message, 'error'); })
.finally(function() { deleteConfirmBtn.textContent = 'Yes, Delete'; deleteConfirmBtn.disabled = false; });
});
var query;
if (isAdmin) {
query = db.collection('orders').orderBy('createdAt', 'desc');
} else {
query = db.collection('orders')
.where('userId', '==', currentUser.uid)
.orderBy('createdAt', 'desc');
}
if (!isAdmin) {
var styleEl = document.createElement('style');
styleEl.textContent = '.pending-toggle { display: none !important; }';
document.head.appendChild(styleEl);
}
query.onSnapshot(function(snapshot) {
loading.style.display = 'none';
resultsArea.hidden = false;
allOrders = snapshot.docs.map(function(doc) { return { id: doc.id, data: doc.data() }; });
renderOrders();
}, function(error) {
loading.style.display = 'none';
resultsArea.hidden = false;
newOrdersContainer.innerHTML =
'<div class="empty-state"><span class="empty-icon">⚠️</span>' +
'<p class="empty-title">Could not load orders</p>' +
'<p class="empty-desc">' + escapeHtml(error.message) + '</p></div>';
console.error('Firestore error:', error);
});
}