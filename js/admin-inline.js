const db = firebase.firestore();
try {
db.enablePersistence({ synchronizeTabs: true }).catch(function (err) {
console.warn('Firestore offline cache not enabled:', err.code);
});
} catch (e) {}
// admin.html runs in its own separate page load from index.html/script.js,
// so we can't touch that page's in-memory "pin to top" variable directly.
// Instead we drop a small marker into localStorage (same key/shape script.js
// reads on load) whenever a product is updated here, so index.html pins that
// item to the top of the list the next time it loads.
const RECENTLY_CHANGED_ITEM_KEY = 'ukshop_recently_changed_item_v1';
function markItemRecentlyChangedForHome(itemId, itemData) {
if (!itemId) return;
try {
var payload = { id: itemId, ts: Date.now() };
if (itemData && typeof itemData === 'object') {
payload.item = Object.assign({}, itemData, { id: itemId });
}
localStorage.setItem(RECENTLY_CHANGED_ITEM_KEY, JSON.stringify(payload));
} catch (e) {
console.warn('Could not save recently changed item marker:', e);
}
}
const auth = firebase.auth();

function toast(message, type = 'success') {
let stack = document.getElementById('toastStack');
if (!stack) {
stack = document.createElement('div');
stack.id = 'toastStack';
stack.className = 'toast-stack';
document.body.appendChild(stack);
}
const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
const el = document.createElement('div');
el.className = `toast toast-${type}`;
el.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
stack.appendChild(el);
requestAnimationFrame(() => el.classList.add('toast-show'));
setTimeout(() => {
el.classList.remove('toast-show');
el.classList.add('toast-hide');
setTimeout(() => el.remove(), 350);
}, 3200);
}
function animateCount(el, target) {
const start = parseInt(el.textContent, 10) || 0;
target = parseInt(target, 10) || 0;
if (start === target) { el.textContent = target; return; }
const duration = 600;
const startTime = performance.now();
function step(now) {
const progress = Math.min((now - startTime) / duration, 1);
const eased = 1 - Math.pow(1 - progress, 3);
el.textContent = Math.round(start + (target - start) * eased);
if (progress < 1) requestAnimationFrame(step);
else el.textContent = target;
}
requestAnimationFrame(step);
}
const loginSection = document.getElementById('loginSection');
const adminDashboard = document.getElementById('adminDashboard');
const addItemForm = document.getElementById('addItemForm');
const clearFormBtn = document.getElementById('clearForm');
const adminItemsContainer = document.getElementById('adminItemsContainer');
const adminSearch = document.getElementById('adminSearch');
const adminSearchBtn = document.getElementById('adminSearchBtn');
const totalItemsEl = document.getElementById('totalItems');
const recentItemsEl = document.getElementById('recentItems');
const catModal = document.getElementById('categoryModal');
const openCatModalBtn = document.getElementById('openCategoryModalBtn');
const closeCatModalBtn = document.getElementById('closeCategoryModalBtn');
const saveCatModalBtn = document.getElementById('saveCategoryModalBtn');
const selectedCatText = document.getElementById('selectedCategoriesText');
const checkboxes = document.querySelectorAll('input[name="itemCategories"]');
let adminLoggedIn = false;
let adminItems = [];
let currentAdminSearch = '';
let editingItemId = null;
document.addEventListener('DOMContentLoaded', function() {
checkAdminAuth();
setupAdminEventListeners();
setupAdminAuthPopupListener();
// NOTE: dashboard is NOT shown and items are NOT loaded here anymore.
// That only happens after password.js fires 'adminAuthSuccess' with a
// verified admin user (see setupAdminAuthPopupListener below). This keeps
// the panel gated behind password.js's login flow instead of showing the
// dashboard to anyone who loads this page.
document.addEventListener('focusin', function (e) {
if (e.target.matches('input, textarea')) document.body.classList.add('is-typing');
});
document.addEventListener('focusout', function (e) {
if (e.target.matches('input, textarea')) document.body.classList.remove('is-typing');
});
});
const ADMIN_EMAIL = 'kavishkairoshan54@gmail.com';
function showAdminPopup(type, title, message, btnLabel, onClose, autoCloseMs) {
const overlay = document.getElementById('adminStatusPopupOverlay');
const icon = document.getElementById('adminStatusPopupIcon');
const titleEl = document.getElementById('adminStatusPopupTitle');
const msgEl = document.getElementById('adminStatusPopupMessage');
const oldBtn = document.getElementById('adminStatusPopupBtn');
document.body.classList.add('popup-open');
icon.className = 'admin-status-popup-icon ' + (type === 'success' ? 'success' : 'denied');
icon.innerHTML = type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-ban"></i>';
titleEl.textContent = title;
msgEl.textContent = message;
const btn = oldBtn.cloneNode(true);
oldBtn.parentNode.replaceChild(btn, oldBtn);
btn.id = 'adminStatusPopupBtn';
btn.textContent = btnLabel;
btn.className = type === 'success' ? 'success-btn' : 'denied-btn';
let closed = false;
function closePopup() {
if (closed) return;
closed = true;
overlay.style.display = 'none';
document.body.classList.remove('popup-open');
if (typeof onClose === 'function') onClose();
}
btn.addEventListener('click', closePopup);
overlay.style.display = 'flex';
if (autoCloseMs) {
setTimeout(closePopup, autoCloseMs);
}
}
function setupAdminAuthPopupListener() {
document.addEventListener('adminAuthSuccess', function (e) {
const user = e.detail.user;
const method = e.detail.method;
if (user && user.email === ADMIN_EMAIL) {
adminLoggedIn = true;
// Backup path — normally checkAdminAuth's onAuthStateChanged fast-path
// (above) has already revealed the dashboard by the time this fires.
// revealDashboardFast() is idempotent, so this is a no-op in that case.
revealDashboardFast();
} else {
adminLoggedIn = false;
hideGateOverlay();
showAdminPopup(
'denied',
'Access Denied',
'This panel is for admins only.',
'OK',
function () { history.back(); }
);
}
});
}
function revealDashboardFast() {
if (dashboardRevealed) return;
dashboardRevealed = true;
// localStorage reads are synchronous, so if we already know what this
// admin's data looked like from a previous visit, we can render it and
// reveal the dashboard in the very same tick — no network round trip
// standing between login confirmation and seeing the page.
const cachedItems = getCachedItems();
const cachedOrders = getCachedOrders();
if (cachedItems !== null && cachedOrders !== null) {
adminItems = cachedItems;
sortItemsNewestFirst(adminItems);
allOrders = reviveCachedOrders(cachedOrders);
updateAdminStats();
renderAdminItems();
const badge = document.getElementById('pendingCountBadge');
if (badge) badge.textContent = allOrders.filter(o => o.status === 'Pending').length;
animateCount(document.getElementById('totalCustomers'), allOrders.length);
renderOrders();
showAdminDashboard();
hideGateOverlay();
refreshDataInBackground();
return;
}
// First-ever visit on this device — no cache to show instantly, so we
// have no choice but to wait for the actual data before revealing.
loadAllDataThenReveal();
}
function refreshDataInBackground() {
Promise.all([fetchAllItemsOnce(), fetchAllOrdersOnce()])
.then(() => {
updateAdminStats();
renderAdminItems();
cacheItems(adminItems);
renderOrders();
cacheOrders(allOrders);
})
.catch((error) => console.error('Background refresh failed: ', error));
}
function loadAllDataThenReveal() {
Promise.all([fetchAllItemsOnce(), fetchAllOrdersOnce()])
.then(() => {
updateAdminStats();
renderAdminItems();
cacheItems(adminItems);
renderOrders();
cacheOrders(allOrders);
showAdminDashboard();
hideGateOverlay();
})
.catch((error) => {
console.error('Error loading admin data: ', error);
// Don't leave the admin stuck behind the gate forever on a network
// hiccup — show whatever we have and let them retry from inside.
showAdminDashboard();
hideGateOverlay();
toast('දත්ත load කිරීමේදී error එකක් ඇතිවිය. නැවත උත්සාහ කරන්න.', 'error');
});
}
function fetchAllItemsOnce() {
return db.collection('items').get().then((querySnapshot) => {
adminItems = [];
querySnapshot.forEach((doc) => {
const item = doc.data();
item.id = doc.id;
adminItems.push(item);
});
sortItemsNewestFirst(adminItems);
});
}
function fetchAllOrdersOnce() {
return db.collection('orders').orderBy('createdAt', 'desc').get().then(snap => {
allOrders = [];
snap.forEach(doc => { const o = doc.data(); o.id = doc.id; allOrders.push(o); });
const badge = document.getElementById('pendingCountBadge');
if (badge) badge.textContent = allOrders.filter(o => o.status === 'Pending').length;
const totalCustomersEl = document.getElementById('totalCustomers');
if (totalCustomersEl) totalCustomersEl.textContent = allOrders.length;
});
}
function setGateMessage(msg) {
const m = document.getElementById('pageGateMessage');
if (m) m.textContent = msg;
}
function hideGateOverlay() {
const overlay = document.getElementById('pageGateOverlay');
if (overlay) overlay.style.display = 'none';
}
let dashboardRevealed = false;
function checkAdminAuth() {
// Blocks the page behind #pageGateOverlay until we know the login state.
// - No Firebase session at all -> hide the gate so password.js's own
//   login UI is what the visitor actually sees first.
// - A session exists and matches the admin email -> reveal immediately
//   using this signal directly, instead of waiting for password.js's
//   separate 'adminAuthSuccess' event (that event still runs as a backup
//   confirmation/denial path below, but firing off of it costs an extra
//   round trip we don't need to wait for).
firebase.auth().onAuthStateChanged(user => {
if (!user) {
adminLoggedIn = false;
hideGateOverlay();
} else if (user.email === ADMIN_EMAIL) {
adminLoggedIn = true;
revealDashboardFast();
} else {
setGateMessage('පිවිසුම තහවුරු කරමින්...');
}
});
}
function showLoginSection() {
adminDashboard.style.display = 'none';
}
function showAdminDashboard() {
if (loginSection) loginSection.style.display = 'none';
adminDashboard.style.display = 'block';
}
function setupAdminEventListeners() {
addItemForm.addEventListener('submit', handleFormSubmit);
clearFormBtn.addEventListener('click', resetFormState);
adminSearchBtn.addEventListener('click', performAdminSearch);
adminSearch.addEventListener('keypress', function(e) {
if (e.key === 'Enter') performAdminSearch();
});
if (openCatModalBtn) {
openCatModalBtn.addEventListener('click', () => { catModal.style.display = 'flex'; });
}
if (closeCatModalBtn) {
closeCatModalBtn.addEventListener('click', () => { catModal.style.display = 'none'; });
}
if (saveCatModalBtn) {
saveCatModalBtn.addEventListener('click', updateSelectedCategoriesUI);
}
window.addEventListener('click', (e) => {
if (e.target === catModal) { catModal.style.display = 'none'; }
});
document.addEventListener('click', (e) => {
const btn = e.target.closest('button');
if (!btn) return;
const circle = document.createElement('span');
circle.className = 'btn-ripple';
const rect = btn.getBoundingClientRect();
const size = Math.max(rect.width, rect.height);
circle.style.width = circle.style.height = size + 'px';
circle.style.left = (e.clientX - rect.left - size / 2) + 'px';
circle.style.top = (e.clientY - rect.top - size / 2) + 'px';
btn.appendChild(circle);
setTimeout(() => circle.remove(), 600);
});
}
function resetFormState() {
addItemForm.reset();
clearCategoryCheckboxes();
editingItemId = null;
if (selectedCatText) {
selectedCatText.textContent = "No categories selected";
selectedCatText.style.color = "#e74c3c";
}
const formTitle = document.querySelector('.add-item-section h3');
const submitBtn = addItemForm.querySelector('button[type="submit"]');
if (formTitle && submitBtn) {
formTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Item';
submitBtn.innerHTML = '<i class="fas fa-save"></i> Add Item';
submitBtn.disabled = false;
}
}
function clearCategoryCheckboxes() {
checkboxes.forEach(cb => cb.checked = false);
}
function updateSelectedCategoriesUI() {
let selectedLabels = [];
checkboxes.forEach(cb => {
if (cb.checked) selectedLabels.push(cb.nextElementSibling.textContent);
});
if (selectedLabels.length > 0) {
selectedCatText.textContent = "Selected: " + selectedLabels.join(', ');
selectedCatText.style.color = "#27ae60";
} else {
selectedCatText.textContent = "No categories selected";
selectedCatText.style.color = "#e74c3c";
}
catModal.style.display = 'none';
}
function adminLogout() {
auth.signOut()
.then(() => { toast('Logged out successfully', 'success'); })
.catch((error) => { console.error("Logout error: ", error); });
}
function getItemTimestamp(item) {
const candidates = [];
if (item.updatedAt?.toMillis) candidates.push(item.updatedAt.toMillis());
if (item.createdAt?.toMillis) candidates.push(item.createdAt.toMillis());
if (item.date) {
const t = new Date(item.date).getTime();
if (!isNaN(t)) candidates.push(t);
}
return candidates.length ? Math.max(...candidates) : 0;
}
sortItemsNewestFirst(adminItems);
function sortItemsNewestFirst(items) {
return items.sort((a, b) => getItemTimestamp(b) - getItemTimestamp(a));
}
const ITEMS_CACHE_KEY = 'ukshop_admin_items_cache_v1';
function getCachedItems() {
try {
const raw = localStorage.getItem(ITEMS_CACHE_KEY);
if (!raw) return null;
const parsed = JSON.parse(raw);
return Array.isArray(parsed.items) ? parsed.items : null;
} catch (e) { return null; }
}
function cacheItems(items) {
try { localStorage.setItem(ITEMS_CACHE_KEY, JSON.stringify({ items: items, ts: Date.now() })); } catch (e) {}
}
function loadAdminItems() {
// Show whatever we already know instantly (from last visit) instead of a blank spinner.
const cached = getCachedItems();
if (cached && cached.length) {
adminItems = cached;
sortItemsNewestFirst(adminItems);
updateAdminStats();
renderAdminItems();
} else {
adminItemsContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading items...</p></div>';
}
// Then quietly refresh with the latest data in the background.
db.collection('items').get()
.then((querySnapshot) => {
adminItems = [];
querySnapshot.forEach((doc) => {
const item = doc.data();
item.id = doc.id;
adminItems.push(item);
});
sortItemsNewestFirst(adminItems);
updateAdminStats();
renderAdminItems();
cacheItems(adminItems);
})
.catch((error) => {
console.error("Error loading items: ", error);
if (!cached || !cached.length) {
adminItemsContainer.innerHTML = '<div class="error-message">Failed to load items. Please try again later.</div>';
}
});
}
function updateAdminStats() {
animateCount(totalItemsEl, adminItems.length);
const oneWeekAgo = new Date();
oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
const recentItems = adminItems.filter(item => {
const itemDate = new Date(item.date || new Date());
return itemDate >= oneWeekAgo;
});
animateCount(recentItemsEl, recentItems.length);
}
function renderAdminItems() {
if (adminItems.length === 0) {
adminItemsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i><h3>No Items Found</h3><p>Add your first item using the form above.</p></div>';
return;
}
let displayedItems = [...adminItems];
if (currentAdminSearch) {
displayedItems = displayedItems.filter(item => {
const nameMatch = item.name.toLowerCase().includes(currentAdminSearch);
const descMatch = item.description.toLowerCase().includes(currentAdminSearch);
let categoryMatch = false;
if (item.categories && Array.isArray(item.categories)) {
categoryMatch = item.categories.some(cat => cat.toLowerCase().includes(currentAdminSearch));
} else if (item.category) {
categoryMatch = item.category.toLowerCase().includes(currentAdminSearch);
}
return nameMatch || descMatch || categoryMatch;
});
}
if (displayedItems.length === 0) {
adminItemsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><h3>No Items Match Your Search</h3><p>Try a different search term.</p></div>';
return;
}
adminItemsContainer.innerHTML = '';
displayedItems.forEach((item, index) => {
const itemCard = document.createElement('div');
itemCard.className = 'admin-item-card card-enter';
itemCard.style.animationDelay = `${Math.min(index, 10) * 0.05}s`;
let categoriesDisplay = '';
if (item.categories && Array.isArray(item.categories) && item.categories.length > 0) {
categoriesDisplay = item.categories.map(cat => cat.toUpperCase()).join(', ');
} else if (item.category) {
categoriesDisplay = item.category.toUpperCase();
} else {
categoriesDisplay = 'NO CATEGORY';
}
itemCard.innerHTML = `
<div class="admin-item-image">
<img src="${item.image || 'https://via.placeholder.com/150'}" alt="${item.name}" class="item-image">
</div>
<div class="admin-item-info">
<h4 class="admin-item-name">${item.name}</h4>
<span class="admin-item-category">${categoriesDisplay}</span>
<p class="admin-item-description">${item.description ? (item.description.substring(0, 120) + (item.description.length > 120 ? '...' : '')) : ''}</p>
<div class="admin-item-price">LKR ${parseFloat(item.price).toFixed(2)}</div>
<div class="admin-item-date">Added: ${formatDate(item.date)}</div>
</div>
<div class="admin-item-actions">
<button class="btn-edit" data-id="${item.id}"><i class="fas fa-edit"></i> Edit</button>
<button class="btn-delete" data-id="${item.id}"><i class="fas fa-trash"></i> Delete</button>
</div>`;
adminItemsContainer.appendChild(itemCard);
});
document.querySelectorAll('.btn-edit').forEach(btn => {
btn.addEventListener('click', function() { editItem(this.getAttribute('data-id')); });
});
document.querySelectorAll('.btn-delete').forEach(btn => {
btn.addEventListener('click', function() { deleteItem(this.getAttribute('data-id')); });
});
}
function formatDate(dateString) {
if (!dateString) return "N/A";
const date = new Date(dateString);
return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function handleFormSubmit(e) {
e.preventDefault();
if (!adminLoggedIn) { toast('You must be logged in as admin to manage items', 'error'); return; }
const itemName = document.getElementById('itemName').value.trim();
const itemPrice = document.getElementById('itemPrice').value.trim();
const itemImage = document.getElementById('itemImage').value.trim();
const itemDescription = document.getElementById('itemDescription').value.trim();
const checkedBoxes = document.querySelectorAll('input[name="itemCategories"]:checked');
const selectedCategories = Array.from(checkedBoxes).map(cb => cb.value);
if (!itemName || !itemPrice || selectedCategories.length === 0 || !itemDescription) {
toast('Please fill in all required fields (select at least one category)', 'error');
return;
}
const submitBtn = addItemForm.querySelector('button[type="submit"]');
if (editingItemId) {
const item = adminItems.find(i => i.id === editingItemId);
const updatedItem = {
name: itemName, price: parseFloat(itemPrice), categories: selectedCategories,
category: selectedCategories[0], description: itemDescription,
image: itemImage || "", date: item ? item.date : new Date().toISOString(),
updatedAt: firebase.firestore.FieldValue.serverTimestamp()
};
// Plain, JSON-safe copy for the "recently changed" marker (the real
// updatedItem above contains a Firestore FieldValue sentinel, which can't
// be stored in localStorage / read back on another page).
// IMPORTANT: this "date" is what the home page uses to treat the item as
// fresh/just-changed and pin it to the top — it must be a current
// timestamp, same as new items get, NOT the item's original creation
// date (updatedItem.date). Reusing the old date was why edited items
// weren't jumping to the top instantly like added items already did.
const nowIso = new Date().toISOString();
const homeItemData = {
id: editingItemId,
name: updatedItem.name,
price: updatedItem.price,
categories: updatedItem.categories,
category: updatedItem.category,
description: updatedItem.description,
image: updatedItem.image,
date: nowIso,
lastUpdated: nowIso
};
// Write the "recently changed" marker right now, before the network
// write even starts — we already know editingItemId, so there's no
// reason to wait for Firestore's round trip just to pin this item to
// the top on the home page.
markItemRecentlyChangedForHome(editingItemId, homeItemData);
submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
submitBtn.disabled = true;
db.collection('items').doc(editingItemId).update(updatedItem)
.then(() => { toast('Item updated successfully!', 'success'); resetFormState(); loadAdminItems(); })
.catch((error) => { console.error("Error updating item: ", error); toast('Error updating item: ' + error.message, 'error'); submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Item'; submitBtn.disabled = false; });
} else {
const newItem = {
name: itemName, price: parseFloat(itemPrice), categories: selectedCategories, category: selectedCategories[0],
description: itemDescription, date: new Date().toISOString(),
createdAt: firebase.firestore.FieldValue.serverTimestamp(),
updatedAt: firebase.firestore.FieldValue.serverTimestamp()
};
if (itemImage) newItem.image = itemImage;
// Plain, JSON-safe copy for the "recently changed" marker (newItem above
// contains Firestore FieldValue sentinels that can't survive localStorage).
const homeItemData = {
name: newItem.name,
price: newItem.price,
categories: newItem.categories,
category: newItem.category,
description: newItem.description,
date: newItem.date
};
if (itemImage) homeItemData.image = itemImage;
submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
submitBtn.disabled = true;
db.collection('items').add(newItem)
.then((docRef) => { markItemRecentlyChangedForHome(docRef.id, homeItemData); toast('Item added successfully!', 'success'); resetFormState(); loadAdminItems(); })
.catch((error) => { console.error("Error adding item: ", error); toast('Error adding item: ' + error.message, 'error'); submitBtn.innerHTML = '<i class="fas fa-save"></i> Add Item'; submitBtn.disabled = false; });
}
}
function editItem(itemId) {
const item = adminItems.find(i => i.id === itemId);
if (!item) { toast('Item not found', 'error'); return; }
editingItemId = itemId;
document.getElementById('itemName').value = item.name;
document.getElementById('itemPrice').value = item.price;
document.getElementById('itemImage').value = item.image || '';
document.getElementById('itemDescription').value = item.description;
clearCategoryCheckboxes();
let selectedLabels = [];
if (item.categories && Array.isArray(item.categories)) {
item.categories.forEach(cat => {
const checkbox = document.querySelector(`input[name="itemCategories"][value="${cat}"]`);
if (checkbox) { checkbox.checked = true; selectedLabels.push(checkbox.nextElementSibling.textContent); }
});
} else if (item.category) {
const checkbox = document.querySelector(`input[name="itemCategories"][value="${item.category}"]`);
if (checkbox) { checkbox.checked = true; selectedLabels.push(checkbox.nextElementSibling.textContent); }
}
if (selectedLabels.length > 0) {
selectedCatText.textContent = "Selected: " + selectedLabels.join(', ');
selectedCatText.style.color = "#27ae60";
} else {
selectedCatText.textContent = "No categories selected";
selectedCatText.style.color = "#e74c3c";
}
const formTitle = document.querySelector('.add-item-section h3');
const submitBtn = addItemForm.querySelector('button[type="submit"]');
formTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Item';
submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Item';
submitBtn.disabled = false;
document.querySelector('.add-item-section').scrollIntoView({ behavior: 'smooth' });
}
function deleteItem(itemId) {
if (!confirm('Are you sure you want to delete this item?')) return;
db.collection('items').doc(itemId).delete()
.then(() => { toast('Item deleted successfully!', 'success'); if (editingItemId === itemId) resetFormState(); loadAdminItems(); })
.catch((error) => { console.error("Error deleting item: ", error); toast('Error deleting item: ' + error.message, 'error'); });
}
let adminSearchDebounceTimer = null;
adminSearch.addEventListener('input', function () {
currentAdminSearch = this.value.trim().toLowerCase();
clearTimeout(adminSearchDebounceTimer);
adminSearchDebounceTimer = setTimeout(function () {
showSearchSuggestions();
renderAdminItems();
}, 180);
});
(function setupBackGuard() {
history.pushState({ pageExitGuard: true }, '', location.href);
window.addEventListener('popstate', function () {
if (adminSearch.value.length > 0) {
adminSearch.value = '';
currentAdminSearch = '';
renderAdminItems();
showSearchSuggestions();
history.pushState({ pageExitGuard: true }, '', location.href);
return;
}
document.body.classList.add('page-exiting');
setTimeout(function () {
history.back();
}, 300);
});
})();
function showSearchSuggestions() {
const suggestionsBox = document.getElementById('searchSuggestions');
if (!suggestionsBox) return;
if (!currentAdminSearch) { suggestionsBox.innerHTML = ''; suggestionsBox.style.display = 'none'; return; }
const matches = adminItems.filter(item => item.name.toLowerCase().includes(currentAdminSearch)).slice(0, 5);
suggestionsBox.innerHTML = matches.map(item => `<div class="suggestion-item" data-id="${item.id}">${item.name}</div>`).join('');
suggestionsBox.style.display = 'block';
document.querySelectorAll('.suggestion-item').forEach(el => {
el.addEventListener('click', function () {
const selectedText = this.textContent.trim();
adminSearch.value = selectedText;
currentAdminSearch = selectedText.toLowerCase();
suggestionsBox.style.display = 'none';
renderAdminItems();
scrollToFirstMatch();
});
});
}
function scrollToFirstMatch() {
setTimeout(() => {
const firstMatch = document.querySelector('.admin-item-card');
if (firstMatch) {
firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
firstMatch.style.background = "#fff3cd";
setTimeout(() => { firstMatch.style.background = ""; }, 1500);
}
}, 100);
}
function performAdminSearch() {
clearTimeout(adminSearchDebounceTimer);
currentAdminSearch = adminSearch.value.trim().toLowerCase();
const suggestionsBox = document.getElementById('searchSuggestions');
if (suggestionsBox) suggestionsBox.style.display = 'none';
showSection('items');
renderAdminItems();
adminSearch.blur();
scrollToFirstMatch();
}
function showSection(section) {
const itemsSections = document.querySelectorAll('.add-item-section, .manage-items-section');
const ordersSection = document.getElementById('ordersSection');
if (section === 'orders') {
itemsSections.forEach(s => s.style.display = 'none');
ordersSection.style.display = 'block';
loadOrders();
} else {
itemsSections.forEach(s => s.style.display = 'block');
ordersSection.style.display = 'none';
}
}
let allOrders = [];
let currentTab = 'all';
function switchTab(tab) {
currentTab = tab;
document.getElementById('tabAllOrders').classList.toggle('active', tab === 'all');
document.getElementById('tabPendingOrders').classList.toggle('active', tab === 'pending');
document.getElementById('pendingOnlyToggle').checked = false;
renderOrders();
}
document.addEventListener('DOMContentLoaded', function() {
const pendingToggle = document.getElementById('pendingOnlyToggle');
if (pendingToggle) {
pendingToggle.addEventListener('change', function() { renderOrders(); });
}
});
const ORDERS_CACHE_KEY = 'ukshop_admin_orders_cache_v1';
function getCachedOrders() {
try {
const raw = localStorage.getItem(ORDERS_CACHE_KEY);
if (!raw) return null;
const parsed = JSON.parse(raw);
return Array.isArray(parsed.orders) ? parsed.orders : null;
} catch (e) { return null; }
}
function cacheOrders(orders) {
try {
// createdAt is a Firestore Timestamp object; store a plain ms value instead so it survives JSON + localStorage.
const plain = orders.map(o => Object.assign({}, o, {
createdAt: (o.createdAt && o.createdAt.toMillis) ? { __ms: o.createdAt.toMillis() } : (o.createdAt || null)
}));
localStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify({ orders: plain, ts: Date.now() }));
} catch (e) {}
}
function reviveCachedOrders(orders) {
return orders.map(o => {
if (o.createdAt && o.createdAt.__ms) {
const ms = o.createdAt.__ms;
o.createdAt = { toDate: function () { return new Date(ms); } };
}
return o;
});
}
function loadOrders() {
const list = document.getElementById('ordersList');
const cached = getCachedOrders();
if (cached && cached.length) {
allOrders = reviveCachedOrders(cached);
animateCount(document.getElementById('totalCustomers'), allOrders.length);
document.getElementById('pendingCountBadge').textContent = allOrders.filter(o => o.status === 'Pending').length;
renderOrders();
} else {
list.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading orders...</p></div>';
}
db.collection('orders').orderBy('createdAt', 'desc').get()
.then(snap => {
allOrders = [];
snap.forEach(doc => { const o = doc.data(); o.id = doc.id; allOrders.push(o); });
animateCount(document.getElementById('totalCustomers'), allOrders.length);
const pendingCount = allOrders.filter(o => o.status === 'Pending').length;
document.getElementById('pendingCountBadge').textContent = pendingCount;
renderOrders();
cacheOrders(allOrders);
})
.catch(err => {
if (!cached || !cached.length) {
list.innerHTML = '<div class="orders-empty"><i class="fas fa-exclamation-circle"></i><p>Failed to load orders.</p></div>';
}
});
}
function renderOrders() {
const list = document.getElementById('ordersList');
const pendingOnly = document.getElementById('pendingOnlyToggle').checked;
let orders = [...allOrders];
if (currentTab === 'pending') orders = orders.filter(o => o.status === 'Pending');
if (pendingOnly) orders = orders.filter(o => o.status === 'Pending');
if (orders.length === 0) {
list.innerHTML = '<div class="orders-empty"><i class="fas fa-inbox"></i><p>No orders found.</p></div>';
return;
}
list.innerHTML = orders.map((o, i) => `
<div class="order-card ${o.status === 'Pending' ? 'pending' : ''}" style="animation-delay:${i*0.04}s">
<div class="order-info">
<div class="order-ref">#${o.id.slice(0,8).toUpperCase()}</div>
<div class="order-item-name">${o.item ? o.item.name : 'N/A'}</div>
<div class="order-customer"><i class="fas fa-user"></i>${o.customer ? o.customer.name : ''}</div>
<div class="order-customer"><i class="fas fa-phone"></i>${o.customer ? o.customer.phone : ''}</div>
${o.customer && o.customer.address ? `<div class="order-customer"><i class="fas fa-map-marker-alt"></i>${o.customer.address}</div>` : ''}
<div class="order-price">LKR ${o.item ? parseFloat(o.item.price||0).toFixed(2) : '0.00'}</div>
</div>
<div class="order-meta">
<span class="order-status ${o.status === 'Pending' ? 'status-pending' : 'status-confirmed'}">
<i class="fas ${o.status === 'Pending' ? 'fa-clock' : 'fa-check-circle'}"></i> ${o.status || 'Pending'}
</span>
<span class="order-date">${o.createdAt && o.createdAt.toDate ? o.createdAt.toDate().toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}) : ''}</span>
${o.status === 'Pending' ? `<button class="btn-mark-done" onclick="markOrderDone('${o.id}')"><i class="fas fa-check"></i> Mark Done</button>` : ''}
</div>
</div>
`).join('');
}
function markOrderDone(orderId) {
db.collection('orders').doc(orderId).update({ status: 'Confirmed' })
.then(() => { toast('Order marked as confirmed!', 'success'); loadOrders(); })
.catch(err => toast('Error: ' + err.message, 'error'));
}
(function () {
const CLOUD_NAME = "cgxzawjf";
const UPLOAD_PRESET = "kavishka";
const itemImageInput = document.getElementById('itemImage');
const openBtn = document.getElementById('openImageUploadBtn');
const closeBtn = document.getElementById('closeImageUploadBtn');
const modal = document.getElementById('imageUploadModal');
const dropZone = document.getElementById('uploadDropZone');
const fileInput = document.getElementById('uploadFileInput');
const previewWrap = document.getElementById('uploadPreviewWrap');
const previewImg = document.getElementById('uploadPreviewImg');
const confirmBtn = document.getElementById('confirmUploadBtn');
const progressWrap = document.getElementById('uploadProgressWrap');
const progressBar = document.getElementById('uploadProgressBar');
const errorBox = document.getElementById('uploadErrorBox');
let selectedFile = null;
if (!openBtn || !modal) return;
function resetUploadModal() {
selectedFile = null;
fileInput.value = '';
previewWrap.style.display = 'none';
previewImg.src = '';
confirmBtn.disabled = true;
confirmBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload';
progressWrap.style.display = 'none';
progressBar.style.width = '0%';
errorBox.style.display = 'none';
errorBox.textContent = '';
dropZone.classList.remove('dragover');
}
function showUploadError(msg) {
errorBox.textContent = msg;
errorBox.style.display = 'block';
}
function openModal() {
resetUploadModal();
modal.style.display = 'flex';
}
function closeModal() {
modal.style.display = 'none';
}
openBtn.addEventListener('click', openModal);
closeBtn.addEventListener('click', closeModal);
window.addEventListener('click', (e) => {
if (e.target === modal) closeModal();
});
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
e.preventDefault();
dropZone.classList.remove('dragover');
if (e.dataTransfer.files.length) handleSelectedFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => {
if (fileInput.files.length) handleSelectedFile(fileInput.files[0]);
});
function handleSelectedFile(file) {
if (!file.type.startsWith('image/')) {
showUploadError('කරුණාකර image file එකක් තෝරන්න.');
return;
}
selectedFile = file;
errorBox.style.display = 'none';
const reader = new FileReader();
reader.onload = (e) => {
previewImg.src = e.target.result;
previewWrap.style.display = 'block';
};
reader.readAsDataURL(file);
confirmBtn.disabled = false;
}
confirmBtn.addEventListener('click', () => {
if (!selectedFile) return;
const formData = new FormData();
formData.append('file', selectedFile);
formData.append('upload_preset', UPLOAD_PRESET);
const xhr = new XMLHttpRequest();
xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
confirmBtn.disabled = true;
confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
progressWrap.style.display = 'block';
errorBox.style.display = 'none';
xhr.upload.addEventListener('progress', (e) => {
if (e.lengthComputable) {
const percent = (e.loaded / e.total) * 100;
progressBar.style.width = percent + '%';
}
});
xhr.onload = () => {
progressWrap.style.display = 'none';
if (xhr.status === 200) {
const data = JSON.parse(xhr.responseText);
itemImageInput.value = data.secure_url;
toast('Image uploaded successfully!', 'success');
closeModal();
} else {
let msg = 'Upload එක අසාර්ථක විය.';
try {
const err = JSON.parse(xhr.responseText);
if (err.error && err.error.message) msg = err.error.message;
} catch (e) {}
showUploadError(msg);
confirmBtn.disabled = false;
confirmBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload';
}
};
xhr.onerror = () => {
progressWrap.style.display = 'none';
showUploadError('Network error එකක් සිදු විය. නැවත උත්සාහ කරන්න.');
confirmBtn.disabled = false;
confirmBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload';
};
xhr.send(formData);
});
})();