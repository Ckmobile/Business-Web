const whatsappNumber = '94755997160';
const CART_KEY = 'ukshop_cart_v1';
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
let allItems = [];
let currentItem = null;
let gridSearchTerm = '';
function escapeHtml(str){
if (str === undefined || str === null) return '';
return String(str)
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;');
}
function getItemCategories(item) {
if (item && Array.isArray(item.categories) && item.categories.length > 0) {
return item.categories.filter(Boolean);
}
if (item && item.category) {
return String(item.category).split(',').map(c => c.trim()).filter(Boolean);
}
return [];
}
function getDefaultImageByCategory(category) {
return defaultImages[category] || defaultImages.other;
}
function formatDate(dateString) {
try {
const date = new Date(dateString);
const now = new Date();
const diffDays = Math.ceil(Math.abs(now - date) / (1000 * 60 * 60 * 24));
if (diffDays === 1) return 'Today';
if (diffDays <= 7) return `${diffDays} days ago`;
return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
} catch (e) {
return 'Recently';
}
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
function itemFromParams(params) {
const id = params.get('id') || '';
if (!id) return null;
const category = params.get('category') || 'other';
const primaryCategory = category.split(',')[0].trim();
return {
id: id,
name: params.get('name') || 'Unnamed item',
category: category,
price: parseFloat(params.get('price')) || 0,
description: params.get('description') || '',
image: params.get('image') || getDefaultImageByCategory(primaryCategory),
date: params.get('date') || ''
};
}
function renderHero(item, options) {
const push = !!(options && options.push);
currentItem = item;
const cats = getItemCategories(item);
document.getElementById('hero-img').src = item.image || getDefaultImageByCategory((cats[0] || 'other'));
document.getElementById('hero-img').alt = item.name;
document.getElementById('hero-img').onerror = function () {
this.onerror = null;
this.src = getDefaultImageByCategory((cats[0] || 'other'));
};
document.getElementById('hero-badge').textContent = cats[0] || 'other';
document.getElementById('hero-name').textContent = item.name;
document.getElementById('hero-price').textContent = formatPrice(item.price);
document.getElementById('hero-desc').textContent = item.description || 'No description provided for this item.';
document.getElementById('hero').classList.remove('hero');
void document.body.offsetWidth;
document.getElementById('hero').classList.add('hero');
const p = new URLSearchParams({
id: item.id || '',
name: item.name || '',
category: item.category || '',
price: item.price || '0',
description: item.description || '',
image: item.image || ''
});
const url = 'page.html?' + p.toString();
if (push) {
history.pushState({ itemId: item.id }, '', url);
} else {
history.replaceState({ itemId: item.id }, '', url);
}
renderGrid();
}
window.addEventListener('popstate', function () {
const params = new URLSearchParams(window.location.search);
const item = itemFromParams(params);
if (item) {
renderHero(item, { push: false });
window.scrollTo({ top: 0, behavior: 'smooth' });
}
});
function isFirestoreReady() {
try {
return typeof db !== 'undefined' && db && typeof db.collection === 'function';
} catch (e) {
return false;
}
}
function loadCurrentItemFromFirestore(id) {
if (!isFirestoreReady() || !id) return;
db.collection('items').doc(id).get()
.then((doc) => {
if (!doc.exists) return;
const data = doc.data();
const cats = getItemCategories(data);
const primaryCategory = cats[0] || 'other';
renderHero({
id: doc.id,
name: data.name || 'Unnamed item',
category: (data.category || cats.join(', ') || 'other'),
price: parseFloat(data.price) || 0,
description: data.description || '',
image: data.image || getDefaultImageByCategory(primaryCategory),
date: data.date || ''
});
})
.catch((error) => {
console.error('Error loading this item from Firestore:', error);
});
}
function loadAllItems() {
if (!isFirestoreReady()) {
document.getElementById('grid').innerHTML =
'<div class="grid-empty">Could not connect to the item database. Make sure firebase-config.js is loaded on this page and defines a working "db" (firebase.firestore()) before script.js/page.html runs.</div>';
document.getElementById('found-pill').textContent = '0 Items Found';
return;
}
db.collection('items')
.get()
.then((querySnapshot) => {
allItems = [];
querySnapshot.forEach((doc) => {
const item = doc.data();
item.id = doc.id;
item.date = item.date || new Date().toISOString();
item.price = parseFloat(item.price) || 0;
allItems.push(item);
});
allItems.sort((a, b) => new Date(b.date) - new Date(a.date));
if (!currentItem && allItems.length > 0) {
renderHero(allItems[0]);
} else {
renderGrid();
}
})
.catch((error) => {
console.error('Error loading items:', error);
document.getElementById('grid').innerHTML =
'<div class="grid-empty">Failed to load other items: ' + escapeHtml(error.message || String(error)) + '</div>';
document.getElementById('found-pill').textContent = '0 Items Found';
});
}
function renderGrid() {
const grid = document.getElementById('grid');
const others = allItems.filter(p => p.id !== (currentItem ? currentItem.id : null));
const currentCats = (currentItem ? getItemCategories(currentItem) : [])
.map(c => c.toLowerCase());
function categoryScore(item) {
if (currentCats.length === 0) return 0;
const itemCats = getItemCategories(item).map(c => c.toLowerCase());
return itemCats.filter(c => currentCats.includes(c)).length;
}
const term = gridSearchTerm.trim().toLowerCase();
function isSearchMatch(item) {
if (!term) return false;
return (item.name || '').toLowerCase().includes(term) ||
(item.description || '').toLowerCase().includes(term) ||
getItemCategories(item).some(cat => cat.toLowerCase().includes(term));
}
const sortedOthers = others
.map(item => ({
item: item,
searchMatch: isSearchMatch(item) ? 1 : 0,
catScore: categoryScore(item)
}))
.sort((a, b) => {
if (a.searchMatch !== b.searchMatch) return b.searchMatch - a.searchMatch;
return b.catScore - a.catScore;
})
.map(entry => entry.item);
document.getElementById('found-pill').textContent = sortedOthers.length + ' Items Found';
if (sortedOthers.length === 0) {
grid.innerHTML = '<div class="grid-empty">No other items to show right now.</div>';
return;
}
grid.innerHTML = '';
sortedOthers.forEach(item => {
const cats = getItemCategories(item);
const primaryCat = cats[0] || 'other';
const fallbackImg = getDefaultImageByCategory(primaryCat);
const img = item.image || fallbackImg;
const card = document.createElement('div');
card.className = 'card';
card.addEventListener('click', () => selectProduct(item.id));
card.innerHTML = `
<img class="card-img" src="${img}" alt="${escapeHtml(item.name || '')}">
<div class="card-body">
<div class="card-name">${escapeHtml(item.name || 'Unnamed item')}</div>
<div class="card-price">🏷️ ${formatPrice(item.price)}</div>
<div class="card-date">📅 ${formatDate(item.date)}</div>
</div>
`;
const cardImg = card.querySelector('.card-img');
cardImg.onerror = function () {
this.onerror = null;
this.src = fallbackImg;
};
grid.appendChild(card);
});
}
function selectProduct(id) {
const item = allItems.find(p => p.id === id);
if (!item) return;
renderHero(item, { push: true });
window.scrollTo({ top: 0, behavior: 'smooth' });
}
function orderNow() {
if (!currentItem) return;
const p = new URLSearchParams({
id: currentItem.id || '',
name: currentItem.name || '',
category: currentItem.category || '',
price: currentItem.price || '0',
description: currentItem.description || '',
image: currentItem.image || ''
});
window.location.href = 'order.html?' + p.toString();
}
function addToCart() {
if (!currentItem) return;
try {
const raw = localStorage.getItem(CART_KEY);
const cart = raw ? JSON.parse(raw) : [];
const existing = cart.find(line => line.id === currentItem.id);
if (existing) {
existing.qty = (parseInt(existing.qty, 10) || 0) + 1;
} else {
cart.push({
id: currentItem.id,
name: currentItem.name,
price: currentItem.price,
image: currentItem.image,
qty: 1
});
}
localStorage.setItem(CART_KEY, JSON.stringify(cart));
showToast(currentItem.name + ' කාට් එකට එකතු කරන ලදී 🛒');
} catch (e) {
console.error('Could not update cart:', e);
showToast('Something went wrong adding this to your cart.');
}
}
(function init() {
const searchInput = document.getElementById('gridSearchInput');
if (searchInput) {
let searchTimeout;
searchInput.addEventListener('input', function () {
clearTimeout(searchTimeout);
searchTimeout = setTimeout(() => {
gridSearchTerm = searchInput.value;
renderGrid();
}, 300);
});
}
const params = new URLSearchParams(window.location.search);
const paramItem = itemFromParams(params);
if (paramItem) {
renderHero(paramItem);
loadCurrentItemFromFirestore(paramItem.id);
}
loadAllItems();
})();