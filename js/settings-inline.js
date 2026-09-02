(function () {
function showToast(msg) {
var toast = document.getElementById('toast');
var toastMsg = document.getElementById('toastMsg');
toastMsg.textContent = msg;
toast.classList.add('show');
clearTimeout(window.__toastTimer);
window.__toastTimer = setTimeout(function () {
toast.classList.remove('show');
}, 1800);
}
var ordersCard = document.getElementById('ordersCard');
if (ordersCard) {
ordersCard.addEventListener('click', function (e) {
e.preventDefault();
showToast('Opening Orders…');
setTimeout(function () { window.location.href = 'orders.html'; }, 600);
});
}
var adminCard = document.getElementById('adminCard');
if (adminCard) {
adminCard.addEventListener('click', function (e) {
e.preventDefault();
showToast('Opening Admin Panel…');
setTimeout(function () { window.location.href = 'admin.html'; }, 600);
});
}
var gamesCard = document.getElementById('gamesCard');
if (gamesCard) {
gamesCard.addEventListener('click', function (e) {
e.preventDefault();
showToast('Opening Games…');
setTimeout(function () { window.location.href = 'games.html'; }, 600);
});
}
var cartCard = document.getElementById('cartCard');
if (cartCard) {
cartCard.addEventListener('click', function (e) {
e.preventDefault();
showToast('Opening Cart…');
setTimeout(function () { window.location.href = 'cart.html'; }, 600);
});
}
var orderListCard = document.getElementById('orderListCard');
if (orderListCard) {
orderListCard.addEventListener('click', function (e) {
e.preventDefault();
showToast('Opening Orders List…');
setTimeout(function () { window.location.href = 'list.html'; }, 600);
});
}
})();