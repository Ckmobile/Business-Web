let allOrders = [];
let activeFilter = 'all';
const todayStr = new Date().toDateString();
document.getElementById('todayLabel').textContent =
new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
document.getElementById('kpiTodaySub').textContent =
new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
document.getElementById('refreshBtn').addEventListener('click', function () {
const icon = this.querySelector('i');
icon.style.transition = 'transform .6s ease';
icon.style.transform = 'rotate(360deg)';
setTimeout(() => { icon.style.transform = ''; }, 700);
loadAll();
});
document.getElementById('tabBar').addEventListener('click', function (e) {
const b = e.target.closest('.tab-btn');
if (!b) return;
document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active'));
b.classList.add('active');
activeFilter = b.dataset.s;
renderTable();
});
window.onAdminAuthSuccess = function (user) {
showUser(user);
loadAll();
};
auth.onAuthStateChanged(function (user) {
if (user) {
showUser(user);
loadAll();
}
});
function showUser(user) {
document.getElementById('navUserEmail').textContent =
user.email || user.displayName || user.uid || 'Admin';
}
function loadAll() {
Promise.all([fetchOrders(), fetchItems()]).then(function () {
updateKPIs();
buildChart();
buildCats();
renderTable();
});
}
function fetchOrders() {
return db.collection('orders').orderBy('createdAt', 'desc').get()
.then(function (snap) {
allOrders = [];
snap.forEach(function (doc) { var d = doc.data(); d._id = doc.id; allOrders.push(d); });
})
.catch(function (err) { console.warn('orders:', err); allOrders = []; });
}
function fetchItems() {
return db.collection('items').orderBy('date', 'desc').limit(6).get()
.then(function (snap) {
var items = [];
snap.forEach(function (doc) { var d = doc.data(); d._id = doc.id; items.push(d); });
renderRecent(items);
return db.collection('items').get();
})
.then(function (all) { animNum('kpiItems', all.size); })
.catch(function (err) { console.warn('items:', err); document.getElementById('kpiItems').textContent = '—'; });
}
function updateKPIs() {
var total = allOrders.length;
var pending = allOrders.filter(function (o) { return (o.status||'').toLowerCase() === 'pending'; }).length;
var todayCount = allOrders.filter(function (o) {
if (!o.createdAt) return false;
var d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
return d.toDateString() === todayStr;
}).length;
var revenue = 0;
allOrders.forEach(function (o) {
var p = parseFloat((o.item && o.item.price) || o.price || 0);
if (!isNaN(p)) revenue += p;
});
animNum('kpiOrders', total);
animNum('kpiPending', pending);
animNum('kpiToday', todayCount);
document.getElementById('kpiRevenue').textContent = revenue > 0 ? fmtNum(Math.round(revenue)) : '0';
}
function animNum(id, target) {
var el = document.getElementById(id);
var dur = 700; var t0 = performance.now();
function step(now) {
var p = Math.min((now - t0) / dur, 1);
el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
if (p < 1) requestAnimationFrame(step);
}
requestAnimationFrame(step);
}
function fmtNum(n) {
if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
if (n >= 1000) return (n/1000).toFixed(1) + 'K';
return n.toString();
}
function buildChart() {
document.getElementById('chartSpinner').style.display = 'none';
var days = 14; var now = new Date(); var dates = [];
for (var i = days - 1; i >= 0; i--) {
var d = new Date(now); d.setDate(d.getDate() - i);
dates.push({ label: d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}), ds: d.toDateString(), count: 0, isToday: i === 0 });
}
allOrders.forEach(function (o) {
if (!o.createdAt) return;
var d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
var found = dates.find(function (x) { return x.ds === d.toDateString(); });
if (found) found.count++;
});
var maxC = Math.max.apply(null, dates.map(function (d) { return d.count; }).concat([1]));
var barsEl = document.getElementById('chartBars');
var yEl = document.getElementById('chartY');
var emptyEl= document.getElementById('chartEmpty');
var wrapEl = document.getElementById('chartWrap');
if (allOrders.length === 0) { emptyEl.style.display = 'flex'; return; }
wrapEl.style.display = 'flex';
yEl.innerHTML = '';
var steps = 4; var yStep = Math.ceil(maxC / steps);
for (var j = steps; j >= 0; j--) {
var sp = document.createElement('span'); sp.textContent = j * yStep; yEl.appendChild(sp);
}
barsEl.innerHTML = '';
dates.forEach(function (day) {
var pct = Math.max((day.count / (steps * yStep)) * 100, day.count > 0 ? 2 : 0);
var g = document.createElement('div'); g.className = 'bar-group';
var b = document.createElement('div'); b.className = 'bar' + (day.isToday ? ' today' : '');
b.style.height = '0%';
var tip = document.createElement('div'); tip.className = 'bar-tip';
tip.textContent = day.count + ' order' + (day.count !== 1 ? 's' : '');
b.appendChild(tip);
var lbl = document.createElement('div'); lbl.className = 'bar-xlbl';
lbl.textContent = day.label.split(' ')[0];
g.appendChild(b); g.appendChild(lbl); barsEl.appendChild(g);
setTimeout(function (bar, p) { bar.style.height = p + '%'; }.bind(null, b, pct), 60);
});
}
function buildCats() {
var map = {};
allOrders.forEach(function (o) {
var cat = (o.item && o.item.category) || o.category || 'other';
map[cat] = (map[cat] || 0) + 1;
});
var sorted = Object.entries(map).sort(function (a, b) { return b[1] - a[1]; });
var max = sorted.length > 0 ? sorted[0][1] : 1;
var el = document.getElementById('catList');
el.innerHTML = '';
if (!sorted.length) { el.innerHTML = '<div class="empty-row"><i class="fas fa-box-open"></i>No data yet</div>'; return; }
var grads = [
'linear-gradient(90deg,#4361ee,#7209b7)',
'linear-gradient(90deg,#00b894,#38d9a9)',
'linear-gradient(90deg,#ff9f43,#f72585)',
'linear-gradient(90deg,#f72585,#7209b7)',
'linear-gradient(90deg,#2e86de,#00b894)',
'linear-gradient(90deg,#4361ee,#f72585)',
];
sorted.slice(0, 6).forEach(function (entry, i) {
var cat = entry[0]; var count = entry[1];
var pct = Math.round((count / max) * 100);
var row = document.createElement('div');
row.innerHTML =
'<div class="cat-row-lbl"><span>' + e(cat) + '</span><span>' + count + '</span></div>' +
'<div class="cat-track"><div class="cat-fill" style="width:0%;background:' + grads[i % grads.length] + '"></div></div>';
el.appendChild(row);
setTimeout(function (r) { r.querySelector('.cat-fill').style.width = pct + '%'; }.bind(null, row), 80 + i * 40);
});
}
function renderTable() {
var tbody = document.getElementById('tblBody');
var orders = allOrders.slice(0, 50);
if (activeFilter !== 'all')
orders = orders.filter(function (o) { return (o.status||'').toLowerCase() === activeFilter.toLowerCase(); });
if (!orders.length) {
tbody.innerHTML = '<tr><td colspan="6"><div class="empty-row"><i class="fas fa-inbox"></i>No orders found</div></td></tr>'; return;
}
tbody.innerHTML = '';
orders.forEach(function (o) {
var status = o.status || 'Pending';
var scls = 'bs-' + status.toLowerCase().replace(/\s/g, '-');
var customer = (o.customer && o.customer.name) || o.customerName || '—';
var item = (o.item && o.item.name) || o.itemName || o.productName || '—';
var price = parseFloat((o.item && o.item.price) || o.price || 0);
var date = o.createdAt
? (o.createdAt.toDate
? o.createdAt.toDate().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})
: new Date(o.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}))
: '—';
var tr = document.createElement('tr');
tr.innerHTML =
'<td class="oid">#' + o._id.substring(0,8).toUpperCase() + '</td>' +
'<td>' + e(customer) + '</td>' +
'<td style="max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + e(item) + '</td>' +
'<td class="oprice">LKR ' + (isNaN(price) ? '—' : price.toFixed(2)) + '</td>' +
'<td><span class="badge ' + scls + '">' + e(status) + '</span></td>' +
'<td style="color:var(--gray-light);font-size:.76rem;">' + date + '</td>';
tbody.appendChild(tr);
});
}
function renderRecent(items) {
var el = document.getElementById('recentList');
if (!items || !items.length) { el.innerHTML = '<div class="empty-row"><i class="fas fa-box-open"></i>No items</div>'; return; }
el.innerHTML = '';
items.forEach(function (item) {
var img = item.image || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=100&q=80';
var price = parseFloat(item.price || 0);
var row = document.createElement('div'); row.className = 'recent-row';
row.innerHTML =
'<img src="' + e(img) + '" class="recent-img" alt="" onerror="this.src=\'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=100&q=80\'" />' +
'<div class="recent-info"><div class="recent-name">' + e(item.name || 'Unnamed') + '</div>' +
'<div class="recent-cat">' + e(item.category || 'uncategorised') + '</div></div>' +
'<div class="recent-price">LKR ' + price.toFixed(2) + '</div>';
el.appendChild(row);
});
}
function e(s) {
if (s == null) return '';
return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}