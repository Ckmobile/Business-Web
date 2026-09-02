const itemsContainer = document.getElementById('itemsContainer');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const sortDropdown = document.getElementById('sortDropdown');
const sortDropdownBtn = document.getElementById('sortDropdownBtn');
const sortDropdownMenu = document.getElementById('sortDropdownMenu');
const sortDropdownLabel = document.getElementById('sortDropdownLabel');
const sortOptions = document.querySelectorAll('#sortDropdownMenu .category-option');
const itemsCount = document.getElementById('itemsCount');
const emptyState = document.getElementById('emptyState');
const categoryDropdown = document.getElementById('categoryDropdown');
const categoryDropdownBtn = document.getElementById('categoryDropdownBtn');
const categoryDropdownMenu = document.getElementById('categoryDropdownMenu');
const categoryDropdownLabel = document.getElementById('categoryDropdownLabel');
const categoryOptions = document.querySelectorAll('#categoryDropdownMenu .category-option');
let allItems = [];
let filteredItems = [];
let currentCategory = 'all';
let currentSearch = '';
let currentSort = 'newest';
let currentUser = null;
let lastSearchMatchCount = null;
let recentlyChangedItemId = null;
const ITEMS_PER_PAGE = 30;
let visibleCount = ITEMS_PER_PAGE;
let isLoadingMoreItems = false;
let loadMoreObserver = null;
const whatsappNumber = '94755997160';
const defaultImages = {
gift: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
vehicle: 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
mobile: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
music: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
fashion: 'https://images.unsplash.com/photo-1445205170230-053b83016050?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
school: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
stores: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
kids: 'https://images.unsplash.com/photo-1534188753412-9f0337d4d51d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
toy: 'https://images.unsplash.com/photo-1550747531-5f0b3c16d2e6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
electronics: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
home: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
sports: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
kitchen: 'https://images.unsplash.com/photo-1674660346036-4b3df3f07cca?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.1.0&ixid',
health: 'https://plus.unsplash.com/premium_photo-1677102356484-0f1b182a3acf?w=1200&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8aGVhcnQlMjBwbmp8ZW58MHx8MHx8fDA%3D',
other: 'https://images.unsplash.com/photo-1618243329711-359c196ffb38?w=1200&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fGRvd25sb2FkcyUyMGljZW58ZW58MHx8MHx8fDA%3D'
};
function getItemCategories(item) {
if (item && Array.isArray(item.categories) && item.categories.length > 0) {
return item.categories.filter(Boolean);
}
if (item && item.category) {
return [item.category];
}
return [];
}
function getItemTimestamp(item) {
if (!item) return 0;
const candidates = [];
function collect(raw) {
if (!raw) return;
if (typeof raw.toMillis === 'function') { candidates.push(raw.toMillis()); return; }
if (typeof raw.toDate === 'function') { candidates.push(raw.toDate().getTime()); return; }
const t = new Date(raw).getTime();
if (!isNaN(t)) candidates.push(t);
}
collect(item.updatedAt);
collect(item.lastUpdated);
collect(item.date);
return candidates.length ? Math.max(...candidates) : 0;
}
function optimizedImageUrl(url) {
if (!url) return url;
if (url.includes('res.cloudinary.com')) return url;
if (url.includes('w=') || url.includes('width=')) return url;
const sep = url.includes('?') ? '&' : '?';
return url + sep + 'w=320&q=55&fm=webp&auto=format&fit=crop';
}
function tinyPlaceholderUrl(url) {
if (!url) return '';
if (url.includes('res.cloudinary.com')) return '';
const base = url.split('?')[0];
return base + '?w=24&q=20&blur=40&fm=webp&auto=format&fit=crop';
}
function hashString(str) {
let hash = 2166136261;
for (let i = 0; i < str.length; i++) {
hash ^= str.charCodeAt(i);
hash = Math.imul(hash, 16777619);
}
return hash >>> 0;
}
function getHourlyShuffleSeed() {
const now = new Date();
return now.getFullYear() + '-' + now.getMonth() + '-' + now.getDate() + '-' + now.getHours();
}
function shuffleItemsHourly(items) {
const seed = getHourlyShuffleSeed();
return items
.map(function (item, index) {
const key = (item && item.id) ? item.id : ((item && item.name) || 'item-' + index);
return { item: item, sortVal: hashString(key + '|' + seed) };
})
.sort(function (a, b) { return a.sortVal - b.sortVal; })
.map(function (entry) { return entry.item; });
}
function applyRecentlyChangedPin(items) {
if (!recentlyChangedItemId) return items;
const pinnedIndex = items.findIndex(function (item) {
return item && item.id === recentlyChangedItemId;
});
if (pinnedIndex <= 0) return items;
const pinnedItem = items[pinnedIndex];
const rest = items.slice(0, pinnedIndex).concat(items.slice(pinnedIndex + 1));
return [pinnedItem].concat(rest);
}
window.pinRecentlyChangedItem = function (itemId) {
recentlyChangedItemId = itemId || null;
if (typeof applyFilters === 'function') {
applyFilters();
}
};
const RECENTLY_CHANGED_ITEM_KEY = 'ukshop_recently_changed_item_v1';
const RECENTLY_CHANGED_ITEM_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes
window.markItemRecentlyChanged = function (itemId, itemData) {
if (!itemId) return;
try {
const payload = { id: itemId, ts: Date.now() };
if (itemData && typeof itemData === 'object') {
payload.item = Object.assign({}, itemData, { id: itemId });
}
localStorage.setItem(RECENTLY_CHANGED_ITEM_KEY, JSON.stringify(payload));
} catch (e) {
console.warn('Could not save recently changed item marker:', e);
}
};
function readRecentlyChangedMarker() {
try {
const raw = localStorage.getItem(RECENTLY_CHANGED_ITEM_KEY);
if (!raw) return null;
const parsed = JSON.parse(raw);
if (!parsed || !parsed.id || !parsed.ts) return null;
if (Date.now() - parsed.ts > RECENTLY_CHANGED_ITEM_MAX_AGE_MS) {
localStorage.removeItem(RECENTLY_CHANGED_ITEM_KEY);
return null;
}
return parsed;
} catch (e) {
console.warn('Could not read recently changed item marker:', e);
return null;
}
}
function loadRecentlyChangedItemFromStorage() {
const marker = readRecentlyChangedMarker();
return marker ? marker.id : null;
}
function applyRecentlyChangedItemData(itemData) {
if (!itemData || !itemData.id) return;
itemData.date = itemData.date || new Date().toISOString();
// Newly added items already get a brand-new `date`, so they naturally sort
// to the top under "Newest First" with no extra help. Edited items keep
// their original `date` (the item's real creation date), so without this
// they'd only reach the top via the localStorage "pin" mechanism — which
// does not re-run when the browser restores this page from back/forward
// cache (bfcache) instead of doing a fresh load. Stamping `lastUpdated` to
// right now makes edited items sort to the top the same reliable way added
// items already do, regardless of whether the pin logic also fires.
itemData.lastUpdated = new Date().toISOString();
const idx = allItems.findIndex(function (it) { return it && it.id === itemData.id; });
if (idx >= 0) {
allItems[idx] = Object.assign({}, allItems[idx], itemData);
} else {
allItems.unshift(itemData);
}
saveItemsToLocalCache(allItems);
}
if ('scrollRestoration' in history) {
history.scrollRestoration = 'manual';
}
const STATE_CACHE_KEY = 'ukshop_page_state_v1';
const ITEMS_LOCAL_CACHE_KEY = 'ukshop_items_local_cache_v1';
const ITEMS_LOCAL_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
function saveItemsToLocalCache(items) {
try {
localStorage.setItem(ITEMS_LOCAL_CACHE_KEY, JSON.stringify({
items: items,
savedAt: Date.now()
}));
} catch (e) {
console.warn('Could not save items local cache:', e);
}
}
function loadItemsFromLocalCache() {
try {
const raw = localStorage.getItem(ITEMS_LOCAL_CACHE_KEY);
if (!raw) return null;
const parsed = JSON.parse(raw);
if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) return null;
return parsed;
} catch (e) {
console.warn('Could not read items local cache:', e);
return null;
}
}
function setCategoryDropdownUI(category) {
categoryOptions.forEach(function (opt) {
const isActive = opt.getAttribute('data-category') === category;
opt.classList.toggle('active', isActive);
if (isActive && categoryDropdownLabel) {
categoryDropdownLabel.textContent = opt.textContent;
}
});
}
function setSortDropdownUI(sortValue) {
sortOptions.forEach(function (opt) {
const isActive = opt.getAttribute('data-sort') === sortValue;
opt.classList.toggle('active', isActive);
if (isActive && sortDropdownLabel) {
sortDropdownLabel.textContent = opt.textContent;
}
});
}
function openCategoryDropdown() {
if (categoryDropdown) categoryDropdown.classList.add('open');
if (categoryDropdownBtn) categoryDropdownBtn.setAttribute('aria-expanded', 'true');
}
function closeCategoryDropdown() {
if (categoryDropdown) categoryDropdown.classList.remove('open');
if (categoryDropdownBtn) categoryDropdownBtn.setAttribute('aria-expanded', 'false');
}
function openSortDropdown() {
if (sortDropdown) sortDropdown.classList.add('open');
if (sortDropdownBtn) sortDropdownBtn.setAttribute('aria-expanded', 'true');
}
function closeSortDropdown() {
if (sortDropdown) sortDropdown.classList.remove('open');
if (sortDropdownBtn) sortDropdownBtn.setAttribute('aria-expanded', 'false');
}
let categoryHistoryPushed = false;
function setupFilterHistoryHandling() {
window.addEventListener('popstate', function (event) {
const state = event.state || {};
if (categoryHistoryPushed && !state.categoryFilterActive) {
categoryHistoryPushed = false;
currentCategory = 'all';
setCategoryDropdownUI('all');
applyFilters();
window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
return;
}
});
}
function getNavigationType() {
try {
const navEntries = performance.getEntriesByType('navigation');
if (navEntries && navEntries.length > 0 && navEntries[0].type) {
return navEntries[0].type;
}
if (performance.navigation) {
const map = { 0: 'navigate', 1: 'reload', 2: 'back_forward' };
return map[performance.navigation.type] || 'navigate';
}
} catch (e) {
console.warn('Could not detect navigation type:', e);
}
return 'navigate';
}
function shouldRestoreSearch() {
return getNavigationType() === 'back_forward';
}
const DEBUG_PIN_ENABLED = /[?&]debug=1\b/.test(location.search);
function debugPinLog(label, data) {
if (!DEBUG_PIN_ENABLED) return;
try {
console.log('[pin-debug]', label, data);
let panel = document.getElementById('pinDebugPanel');
if (!panel) {
panel = document.createElement('div');
panel.id = 'pinDebugPanel';
panel.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;background:#111;color:#0f0;font:11px/1.4 monospace;padding:8px;max-height:45vh;overflow:auto;white-space:pre-wrap;';
document.documentElement.appendChild(panel);
}
const line = document.createElement('div');
line.style.borderBottom = '1px solid #333';
line.style.paddingBottom = '4px';
line.style.marginBottom = '4px';
let text = label;
try { text += ' ' + JSON.stringify(data); } catch (e) { text += ' [unserializable]'; }
line.textContent = text;
panel.appendChild(line);
} catch (e) { /* ignore debug panel errors */ }
}
document.addEventListener('DOMContentLoaded', function() {
try {
if (window.db && typeof db.enablePersistence === 'function') {
db.enablePersistence().catch(function (err) {
console.warn('Firestore persistence not enabled:', err && err.code);
});
}
} catch (e) {
console.warn('Firestore persistence setup failed:', e);
}
setupEventListeners();
createSuggestionsDropdown();
setupMobileMenu();
setupOrdersLogin();
setupFilterHistoryHandling();
updateNavCartBadge();
const changeMarker = readRecentlyChangedMarker();
recentlyChangedItemId = changeMarker ? changeMarker.id : null;
const hasMarkerItem = !!(changeMarker && changeMarker.item);
debugPinLog('1. marker read', {
markerFound: !!changeMarker,
markerId: changeMarker ? changeMarker.id : null,
hasMarkerItem: hasMarkerItem,
markerItemName: (changeMarker && changeMarker.item) ? changeMarker.item.name : null,
markerAgeMs: changeMarker ? (Date.now() - changeMarker.ts) : null
});
// When an edited/added item's full data is waiting in the marker, skip the
// cache's own render pass below — otherwise the page paints once with the
// old/stale cached copy of that item, then a moment later re-paints with
// the merged, correct copy. That stale-then-fixed flash is what made edits
// look slow (new items didn't show it, since a brand-new item is simply
// unshifted to the top either way). Skipping straight to a single render
// with the merged data below removes that flash entirely.
const restored = restoreStateFromCache(hasMarkerItem);
let paintedSomething = restored;
debugPinLog('2. session cache restore', { restored: restored, allItemsLenAfter: allItems.length });
if (!restored) {
const localCache = loadItemsFromLocalCache();
if (localCache) {
allItems = localCache.items;
setSortDropdownUI(currentSort);
setCategoryDropdownUI(currentCategory);
paintedSomething = true;
}
debugPinLog('2b. localStorage cache fallback', { used: !!localCache, allItemsLenAfter: allItems.length });
}
if (hasMarkerItem) {
const idxBefore = allItems.findIndex(function (it) { return it && it.id === changeMarker.item.id; });
applyRecentlyChangedItemData(changeMarker.item);
paintedSomething = true;
debugPinLog('3. marker item merged', {
idxFoundBeforeMerge: idxBefore,
allItemsLenAfter: allItems.length,
mergedItemName: changeMarker.item.name
});
}
if (paintedSomething) {
applyFilters();
}
debugPinLog('4. after first applyFilters', {
filteredItemsLen: filteredItems.length,
topItemId: filteredItems[0] ? filteredItems[0].id : null,
topItemName: filteredItems[0] ? filteredItems[0].name : null,
recentlyChangedItemId: recentlyChangedItemId,
topMatchesRecentlyChanged: filteredItems[0] ? (filteredItems[0].id === recentlyChangedItemId) : null
});
startItemsLiveSync();
});
function saveStateToCache() {
try {
const snapshot = {
allItems: allItems,
currentCategory: currentCategory,
currentSearch: currentSearch,
currentSort: currentSort,
searchValue: searchInput ? searchInput.value : '',
scrollY: window.scrollY,
savedAt: Date.now()
};
sessionStorage.setItem(STATE_CACHE_KEY, JSON.stringify(snapshot));
} catch (e) {
console.warn('Could not save page state cache:', e);
}
}
function restoreStateFromCache(skipRender) {
try {
const raw = sessionStorage.getItem(STATE_CACHE_KEY);
if (!raw) return false;
const snapshot = JSON.parse(raw);
if (!snapshot || !Array.isArray(snapshot.allItems) || snapshot.allItems.length === 0) {
return false;
}
allItems = snapshot.allItems;
currentCategory = snapshot.currentCategory || 'all';
if (shouldRestoreSearch()) {
currentSort = snapshot.currentSort || 'newest';
currentSearch = snapshot.currentSearch || '';
if (searchInput) searchInput.value = snapshot.searchValue || '';
} else {
currentSort = 'newest';
currentSearch = '';
if (searchInput) searchInput.value = '';
}
setSortDropdownUI(currentSort);
setCategoryDropdownUI(currentCategory);
updateSearchClearButton();
if (!skipRender) {
applyFilters();
}
saveStateToCache();
const targetScroll = snapshot.scrollY || 0;
requestAnimationFrame(function () {
requestAnimationFrame(function () {
window.scrollTo(0, targetScroll);
});
});
return true;
} catch (e) {
console.warn('Could not restore page state cache:', e);
return false;
}
}
let itemsListenerUnsubscribe = null;
function startItemsLiveSync() {
if (itemsListenerUnsubscribe) return;
itemsListenerUnsubscribe = db.collection('items')
.orderBy('date', 'desc')
.onSnapshot(function (querySnapshot) {
const freshItems = [];
querySnapshot.forEach(function (doc) {
const item = doc.data();
item.id = doc.id;
item.date = item.date || new Date().toISOString();
freshItems.push(item);
});
const idxInFreshBeforePin = recentlyChangedItemId
? freshItems.findIndex(function (it) { return it && it.id === recentlyChangedItemId; })
: null;
debugPinLog('5. onSnapshot fired', {
fromCache: querySnapshot.metadata && querySnapshot.metadata.fromCache,
hasPendingWrites: querySnapshot.metadata && querySnapshot.metadata.hasPendingWrites,
freshItemsCount: freshItems.length,
recentlyChangedItemId: recentlyChangedItemId,
idxInFreshBeforePin: idxInFreshBeforePin
});
if (recentlyChangedItemId) {
const hasPinnedItem = freshItems.some(function (it) { return it && it.id === recentlyChangedItemId; });
if (!hasPinnedItem) {
const marker = readRecentlyChangedMarker();
if (marker && marker.id === recentlyChangedItemId && marker.item) {
freshItems.unshift(marker.item);
}
}
}
freshItems.sort((a, b) => getItemTimestamp(b) - getItemTimestamp(a));
const scrollBefore = window.scrollY;
allItems = freshItems;
applyFilters();
debugPinLog('6. after onSnapshot applyFilters', {
filteredItemsLen: filteredItems.length,
topItemId: filteredItems[0] ? filteredItems[0].id : null,
topItemName: filteredItems[0] ? filteredItems[0].name : null,
topMatchesRecentlyChanged: filteredItems[0] ? (filteredItems[0].id === recentlyChangedItemId) : null
});
saveStateToCache();
saveItemsToLocalCache(allItems);
requestAnimationFrame(function () {
window.scrollTo(0, scrollBefore);
});
}, function (error) {
console.warn('Live items sync failed:', error);
debugPinLog('ERROR onSnapshot', { message: error && error.message, code: error && error.code });
if (allItems.length === 0) {
itemsContainer.innerHTML = '<div class="error-message">Failed to load items. Please try again later.</div>';
}
});
}
window.addEventListener('pagehide', saveStateToCache);
window.addEventListener('beforeunload', saveStateToCache);
document.addEventListener('visibilitychange', function () {
if (document.visibilityState === 'hidden') saveStateToCache();
});
function setupMobileMenu() {
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');
if (mobileMenuBtn && navLinks) {
mobileMenuBtn.addEventListener('click', function() {
const isOpen = navLinks.classList.contains('active');
if (!isOpen) {
navLinks.classList.add('active');
this.querySelector('i').classList.remove('fa-bars');
this.querySelector('i').classList.add('fa-times');
history.pushState({ menuOpen: true }, '');
} else {
closeMenu();
}
});
window.addEventListener('popstate', function() {
if (navLinks.classList.contains('active')) {
closeMenu();
}
});
function closeMenu() {
navLinks.classList.remove('active');
mobileMenuBtn.querySelector('i').classList.remove('fa-times');
mobileMenuBtn.querySelector('i').classList.add('fa-bars');
}
}
}
function setupOrdersLogin() {
const ordersBtn = document.getElementById('ordersMenuLink');
const modal = document.getElementById('ordersModal');
const backdrop = document.getElementById('ordersModalBackdrop');
const backBtn = document.getElementById('ordersModalBack');
const loginBtn = document.getElementById('ordersLoginBtn');
const errorBox = document.getElementById('ordersLoginError');
const errorText = document.getElementById('ordersLoginErrorText');
if (!modal) return;
let modalHistoryPushed = false;
if (window.firebase && firebase.auth) {
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
.catch(function (err) { console.warn('Auth persistence error:', err); });
firebase.auth().onAuthStateChanged(function (user) {
currentUser = user || null;
});
}
function showError(message) {
if (!errorBox || !errorText) return;
errorText.textContent = message;
errorBox.style.display = 'flex';
errorBox.style.animation = 'none';
requestAnimationFrame(function () { errorBox.style.animation = ''; });
}
function hideError() {
if (errorBox) errorBox.style.display = 'none';
}
function openModal() {
hideError();
modal.classList.add('active');
modalHistoryPushed = true;
history.pushState({ ordersModalOpen: true }, '');
}
function closeModal() {
modal.classList.remove('active');
hideError();
if (modalHistoryPushed && history.state && history.state.ordersModalOpen) {
modalHistoryPushed = false;
history.back();
} else {
modalHistoryPushed = false;
}
}
window.addEventListener('popstate', function () {
if (modal.classList.contains('active')) {
modal.classList.remove('active');
hideError();
modalHistoryPushed = false;
}
});
if (ordersBtn) {
ordersBtn.addEventListener('click', function (e) {
e.preventDefault();
if (currentUser) {
window.location.href = 'orders.html';
return;
}
openModal();
});
}
if (backBtn) backBtn.addEventListener('click', closeModal);
if (backdrop) backdrop.addEventListener('click', closeModal);
if (loginBtn) {
loginBtn.addEventListener('click', function () {
const email = document.getElementById('ordersEmail').value.trim();
const password = document.getElementById('ordersPassword').value;
const adminKey = document.getElementById('ordersKey').value;
hideError();
if (!email || !password) {
showError('Please enter your email and password.');
return;
}
if (adminKey !== 'admin123') {
showError('Invalid Admin Key.');
return;
}
const originalHtml = loginBtn.innerHTML;
loginBtn.disabled = true;
loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Signing in…</span>';
firebase.auth().signInWithEmailAndPassword(email, password)
.then(function () {
window.location.href = 'orders.html';
})
.catch(function (error) {
showError(error.message || 'Could not sign in. Please try again.');
loginBtn.disabled = false;
loginBtn.innerHTML = originalHtml;
});
});
}
}
function loadItems() {
itemsContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading items...</p></div>';
startItemsLiveSync();
}
function createSuggestionsDropdown() {
const suggestionsDropdown = document.createElement('div');
suggestionsDropdown.id = 'searchSuggestions';
suggestionsDropdown.className = 'search-suggestions';
const searchContainer = document.querySelector('.search-container');
if (searchContainer) {
searchContainer.appendChild(suggestionsDropdown);
}
}
// NOTE: This used to create a second, separate gray circular "X" clear
// button and insert it to the LEFT of the blue Search button, which caused
// two clear (X) icons to appear side by side once the input had text. The
// blue Search button itself already turns into a clear (X) icon on its own
// (see the small inline script in index.html), so this extra button is
// intentionally disabled here to avoid the duplicate.
function setupSearchClearButton() {
return;
}
function updateSearchClearButton() {
const clearBtn = document.getElementById('searchClearBtn');
if (!clearBtn) return;
const hasText = searchInput.value.trim().length > 0;
clearBtn.style.display = hasText ? 'flex' : 'none';
}
function getSearchSuggestions(searchTerm) {
if (!searchTerm || searchTerm.length < 1) return [];
const lowerTerm = searchTerm.toLowerCase();
const suggestions = new Set();
allItems.forEach(item => {
const name = item && item.name ? String(item.name) : '';
if (name.toLowerCase().includes(lowerTerm)) {
suggestions.add(name);
}
getItemCategories(item).forEach(function (cat) {
if (cat.toLowerCase().includes(lowerTerm)) {
suggestions.add(cat);
}
});
if (name) {
const words = name.toLowerCase().split(' ');
words.forEach(word => {
if (word.startsWith(lowerTerm)) {
suggestions.add(word);
}
});
}
});
return Array.from(suggestions).slice(0, 5);
}
function showSearchSuggestions(suggestions) {
const suggestionsDropdown = document.getElementById('searchSuggestions');
if (!suggestionsDropdown) return;
if (suggestions.length === 0) {
suggestionsDropdown.style.display = 'none';
return;
}
suggestionsDropdown.innerHTML = '';
suggestionsDropdown.style.display = 'block';
suggestions.forEach(suggestion => {
const suggestionItem = document.createElement('div');
suggestionItem.className = 'suggestion-item';
suggestionItem.innerHTML = `<i class="fas fa-search"></i> ${escapeHtml(suggestion)}`;
suggestionItem.addEventListener('click', function() {
searchInput.value = suggestion;
updateSearchClearButton();
hideSearchSuggestions();
performSearch();
scrollToItems();
});
suggestionsDropdown.appendChild(suggestionItem);
});
}
function hideSearchSuggestions() {
const suggestionsDropdown = document.getElementById('searchSuggestions');
if (suggestionsDropdown) {
suggestionsDropdown.style.display = 'none';
}
}
function showWhatsAppPopup(item) {
const primaryCategory = (item.category || '').split(',')[0].trim();
const params = new URLSearchParams({
id: item.id || '',
name: item.name || '',
category: item.category || '',
price: item.price || '0.00',
description: item.description || '',
image: item.image || getDefaultImageByCategory(primaryCategory)
});
saveStateToCache();
window.location.href = `page.html?${params.toString()}`;
}
function goToCartPage(item) {
const params = new URLSearchParams({
id: item.id || '',
name: item.name || '',
category: item.category || '',
price: item.price || '0.00',
description: item.description || '',
image: item.image || getDefaultImageByCategory((item.category || '').split(',')[0].trim())
});
saveStateToCache();
window.location.href = `cart.html?${params.toString()}`;
}
function getDefaultImageByCategory(category) {
return defaultImages[category] || defaultImages.other;
}
function escapeHtml(str) {
if (str === undefined || str === null) return '';
return String(str)
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;');
}
function buildSearchDividerCard() {
const divider = document.createElement('div');
divider.className = 'search-group-divider';
divider.style.cssText = 'grid-column: 1 / -1; display: flex; align-items: center; gap: 12px; margin: 10px 0; color: var(--gray, #6c757d); font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;';
divider.innerHTML = `
<span style="flex:1; height:1px; background: var(--light-gray, #e9ecef);"></span>
<span><i class="fas fa-layer-group" style="margin-right:6px;"></i>Other Products</span>
<span style="flex:1; height:1px; background: var(--light-gray, #e9ecef);"></span>
`;
return divider;
}
function buildLoadMoreSentinel() {
const sentinel = document.createElement('div');
sentinel.id = 'loadMoreSentinel';
sentinel.style.cssText = 'grid-column: 1 / -1; display:flex; align-items:center; justify-content:center; padding:30px 0;';
sentinel.innerHTML = '<div class="spinner" style="width:36px;height:36px;border-width:4px;margin:0;"></div>';
return sentinel;
}
function ensureLoadMoreObserver() {
if (loadMoreObserver) return loadMoreObserver;
if (typeof IntersectionObserver === 'undefined') return null;
loadMoreObserver = new IntersectionObserver(function (entries) {
entries.forEach(function (entry) {
if (entry.isIntersecting) {
loadMoreItems();
}
});
}, { rootMargin: '300px 0px 300px 0px' });
return loadMoreObserver;
}
function loadMoreItems() {
if (isLoadingMoreItems) return;
if (visibleCount >= filteredItems.length) return;
isLoadingMoreItems = true;
setTimeout(function () {
visibleCount += ITEMS_PER_PAGE;
isLoadingMoreItems = false;
renderItems();
}, 700);
}
function renderItems() {
if (filteredItems.length === 0) {
itemsContainer.style.display = 'none';
emptyState.style.display = 'block';
return;
}
itemsContainer.style.display = 'grid';
emptyState.style.display = 'none';
itemsContainer.innerHTML = '';
const itemsToRender = filteredItems.slice(0, visibleCount);
const showDivider =
currentSearch &&
typeof lastSearchMatchCount === 'number' &&
lastSearchMatchCount > 0 &&
lastSearchMatchCount < itemsToRender.length;
itemsToRender.forEach((item, idx) => {
if (showDivider && idx === lastSearchMatchCount) {
itemsContainer.appendChild(buildSearchDividerCard());
}
const itemCard = document.createElement('div');
itemCard.className = 'item-card';
const itemCats = getItemCategories(item);
const primaryCat = itemCats[0] || 'other';
const rawImageUrl = item.image || defaultImages[primaryCat] || defaultImages.other;
const displayImageUrl = optimizedImageUrl(rawImageUrl);
const placeholderUrl = tinyPlaceholderUrl(rawImageUrl);
const categoriesForDisplay = itemCats.length > 0 ? itemCats.join(', ') : 'other';
const safeName = item.name || 'Unnamed item';
const safeDescription = item.description || '';
const safePrice = parseFloat(item.price) || 0;
const fallbackImage = defaultImages[primaryCat] || defaultImages.other;
itemCard.innerHTML = `
<div class="item-image"${placeholderUrl ? ` style="background-image:url('${placeholderUrl}');background-size:cover;background-position:center;"` : ''}>
<img src="${displayImageUrl}" alt="${escapeHtml(safeName)}" loading="lazy">
<div class="item-overlay">
</div>
</div>
<div class="item-info">
<h3 class="item-name">${escapeHtml(safeName)}</h3>
<div class="item-details">
<div class="item-price">
<i class="fas fa-tag"></i>
LKR. ${safePrice.toFixed(2)}
</div>
<div class="item-date">
<i class="fas fa-calendar-alt"></i>
${formatDate(item.date)}
</div>
</div>
</div>
`;
const thumbImg = itemCard.querySelector('.item-image img');
if (thumbImg) {
thumbImg.addEventListener('load', function () {
const wrapper = itemCard.querySelector('.item-image');
if (wrapper) wrapper.style.backgroundImage = 'none';
}, { once: true });
thumbImg.addEventListener('error', function () {
if (this.src !== fallbackImage) {
this.src = fallbackImage;
}
}, { once: true });
}
itemCard.style.cursor = 'pointer';
itemCard.addEventListener('click', function(e) {
e.stopPropagation();
const orderCategories = getItemCategories(item);
const categoryForOrder = orderCategories.length > 0 ? orderCategories.join(', ') : 'other';
showWhatsAppPopup({
id: item.id || '',
name: safeName,
category: categoryForOrder,
price: safePrice,
description: safeDescription,
image: rawImageUrl
});
});
itemsContainer.appendChild(itemCard);
});
if (visibleCount < filteredItems.length) {
const sentinel = buildLoadMoreSentinel();
itemsContainer.appendChild(sentinel);
const observer = ensureLoadMoreObserver();
if (observer) {
observer.observe(sentinel);
} else {
loadMoreItems();
}
}
}
function formatDate(dateString) {
try {
const date = new Date(dateString);
const now = new Date();
const diffTime = Math.abs(now - date);
const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
if (diffDays === 1) {
return 'Today';
} else if (diffDays <= 7) {
return `${diffDays} days ago`;
} else {
return date.toLocaleDateString('en-US', {
year: 'numeric',
month: 'short',
day: 'numeric'
});
}
} catch (error) {
return 'Recently';
}
}
function setupEventListeners() {
let searchTimeout;
setupSearchClearButton();
searchInput.addEventListener('input', function() {
clearTimeout(searchTimeout);
const searchTerm = searchInput.value.trim();
updateSearchClearButton();
if (searchTerm.length > 0) {
const suggestions = getSearchSuggestions(searchTerm);
showSearchSuggestions(suggestions);
searchTimeout = setTimeout(() => {
currentSearch = searchTerm.toLowerCase();
applyFilters();
}, 500);
} else {
hideSearchSuggestions();
currentSearch = '';
applyFilters();
}
});
document.addEventListener('click', function(event) {
const suggestionsDropdown = document.getElementById('searchSuggestions');
if (suggestionsDropdown &&
!suggestionsDropdown.contains(event.target) &&
event.target !== searchInput) {
hideSearchSuggestions();
}
});
searchBtn.addEventListener('click', function() {
currentSearch = searchInput.value.trim().toLowerCase();
hideSearchSuggestions();
applyFilters();
if (currentSearch.length > 0) {
scrollToItems();
}
});
searchInput.addEventListener('keypress', function(e) {
if (e.key === 'Enter') {
currentSearch = searchInput.value.trim().toLowerCase();
hideSearchSuggestions();
applyFilters();
if (currentSearch.length > 0) {
scrollToItems();
}
}
});
searchInput.addEventListener('keydown', function(e) {
const suggestionsDropdown = document.getElementById('searchSuggestions');
if (!suggestionsDropdown || suggestionsDropdown.style.display === 'none') return;
const suggestions = suggestionsDropdown.querySelectorAll('.suggestion-item');
let activeIndex = -1;
suggestions.forEach((suggestion, index) => {
if (suggestion.classList.contains('active')) {
activeIndex = index;
}
});
if (e.key === 'ArrowDown') {
e.preventDefault();
if (activeIndex < suggestions.length - 1) {
if (activeIndex >= 0) {
suggestions[activeIndex].classList.remove('active');
}
suggestions[activeIndex + 1].classList.add('active');
searchInput.value = suggestions[activeIndex + 1].textContent.trim();
}
} else if (e.key === 'ArrowUp') {
e.preventDefault();
if (activeIndex > 0) {
suggestions[activeIndex].classList.remove('active');
suggestions[activeIndex - 1].classList.add('active');
searchInput.value = suggestions[activeIndex - 1].textContent.trim();
}
} else if (e.key === 'Escape') {
hideSearchSuggestions();
}
});
if (sortDropdownBtn && sortDropdownMenu) {
sortDropdownBtn.addEventListener('click', function(e) {
e.stopPropagation();
if (sortDropdown.classList.contains('open')) {
closeSortDropdown();
} else {
closeCategoryDropdown();
openSortDropdown();
}
});
sortOptions.forEach(function (option) {
option.addEventListener('click', function() {
const sortValue = this.getAttribute('data-sort');
setSortDropdownUI(sortValue);
currentSort = sortValue;
closeSortDropdown();
applyFilters();
saveStateToCache();
});
});
document.addEventListener('click', function(event) {
if (sortDropdown && !sortDropdown.contains(event.target)) {
closeSortDropdown();
}
});
document.addEventListener('keydown', function(event) {
if (event.key === 'Escape') {
closeSortDropdown();
}
});
}
if (categoryDropdownBtn && categoryDropdownMenu) {
categoryDropdownBtn.addEventListener('click', function(e) {
e.stopPropagation();
if (categoryDropdown.classList.contains('open')) {
closeCategoryDropdown();
} else {
closeSortDropdown();
openCategoryDropdown();
}
});
categoryOptions.forEach(function (option) {
option.addEventListener('click', function() {
const category = this.getAttribute('data-category');
setCategoryDropdownUI(category);
currentCategory = category;
closeCategoryDropdown();
applyFilters();
saveStateToCache();
if (category !== 'all') {
if (!categoryHistoryPushed) {
history.pushState({ categoryFilterActive: true }, '');
categoryHistoryPushed = true;
}
scrollToItems();
} else {
categoryHistoryPushed = false;
}
});
});
document.addEventListener('click', function(event) {
if (categoryDropdown && !categoryDropdown.contains(event.target)) {
closeCategoryDropdown();
}
});
document.addEventListener('keydown', function(event) {
if (event.key === 'Escape') {
closeCategoryDropdown();
}
});
}
}
function performSearch() {
currentSearch = searchInput.value.trim().toLowerCase();
applyFilters();
}
function applyFilters() {
let items = [...allItems];
if (currentCategory !== 'all' && !currentSearch) {
items = items.filter(item =>
getItemCategories(item).some(cat => cat.toLowerCase() === currentCategory.toLowerCase())
);
}
function sortGroup(arr) {
switch (currentSort) {
case 'price-low':
arr.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
break;
case 'price-high':
arr.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
break;
case 'name':
arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
break;
case 'newest':
default:
arr.sort((a, b) => getItemTimestamp(b) - getItemTimestamp(a));
break;
}
return arr;
}
if (currentSearch) {
const matched = [];
const rest = [];
items.forEach(item => {
const isMatch =
(item.name || '').toLowerCase().includes(currentSearch) ||
(item.description || '').toLowerCase().includes(currentSearch) ||
getItemCategories(item).some(cat => cat.toLowerCase().includes(currentSearch));
if (isMatch) {
matched.push(item);
} else if (
currentCategory === 'all' ||
getItemCategories(item).some(cat => cat.toLowerCase() === currentCategory.toLowerCase())
) {
rest.push(item);
}
});
sortGroup(matched);
sortGroup(rest);
lastSearchMatchCount = matched.length;
items = matched.concat(rest);
} else {
lastSearchMatchCount = null;
items = sortGroup(items);
}
filteredItems = applyRecentlyChangedPin(items);
visibleCount = ITEMS_PER_PAGE;
renderItems();
updateItemsCount();
}
function updateItemsCount() {
itemsCount.textContent = (currentSearch && typeof lastSearchMatchCount === 'number')
? lastSearchMatchCount
: filteredItems.length;
}
function scrollToItems() {
const itemsSection = document.querySelector('.items-section');
if (itemsSection) {
itemsSection.scrollIntoView({
behavior: 'smooth',
block: 'start'
});
}
}
function updateNavCartBadge() {
const badge = document.getElementById('navCartCount');
if (!badge) return;
try {
const raw = localStorage.getItem('ukshop_cart_v1');
const cart = raw ? JSON.parse(raw) : [];
const count = Array.isArray(cart)
? cart.reduce((sum, line) => sum + (parseInt(line.qty, 10) || 0), 0)
: 0;
badge.textContent = count;
badge.style.display = count > 0 ? 'inline-flex' : 'none';
} catch (e) {
badge.style.display = 'none';
}
}
window.addEventListener('storage', function (e) {
if (e.key === 'ukshop_cart_v1') {
updateNavCartBadge();
}
if (e.key === RECENTLY_CHANGED_ITEM_KEY) {
const marker = readRecentlyChangedMarker();
if (marker && marker.id) {
recentlyChangedItemId = marker.id;
if (marker.item) {
applyRecentlyChangedItemData(marker.item);
}
applyFilters();
}
}
});
