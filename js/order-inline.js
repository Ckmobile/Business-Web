if (typeof db === 'undefined') {
var db = firebase.firestore();
}

const urlParams = new URLSearchParams(window.location.search);
const item = {
id: urlParams.get('id') || 'PREVIEW',
name: urlParams.get('name') || 'Sample Product',
category: urlParams.get('category') || 'General',
price: urlParams.get('price') || '0.00',
description: urlParams.get('description') || 'Open from a product page to see real item details.',
image: urlParams.get('image') || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=600&q=80'
};
document.getElementById('itemImage').src = item.image;
document.getElementById('itemName').textContent = item.name;
document.getElementById('itemCategory').textContent = item.category;
document.getElementById('itemPrice').textContent = parseFloat(item.price || 0).toFixed(2);
document.getElementById('itemDescription').textContent = item.description;
document.title = `Order: ${item.name} | UK Online Shop`;

let quantity = 1;
const MAX_QTY = 20;
const unitPrice = parseFloat(item.price || 0) || 0;
function updateQtyUI() {
document.getElementById('qtyValue').textContent = quantity;
document.getElementById('totalPrice').textContent = (unitPrice * quantity).toFixed(2);
document.getElementById('qtyMinus').disabled = quantity <= 1;
document.getElementById('qtyPlus').disabled = quantity >= MAX_QTY;
}
document.getElementById('qtyMinus').addEventListener('click', function() {
if (quantity > 1) {
quantity--;
updateQtyUI();
}
});
document.getElementById('qtyPlus').addEventListener('click', function() {
if (quantity < MAX_QTY) {
quantity++;
updateQtyUI();
}
});
updateQtyUI();
const referrerUrl = document.referrer || 'index.html';
function goBack() {
if (window.history.length > 1) {
window.history.back();
} else {
window.location.href = 'index.html';
}
}
function closeSuccessPopup() {
document.getElementById('successOverlay').style.display = 'none';
}
document.getElementById('cancelBtn').addEventListener('click', function() {
goBack();
});
let currentUser = null;
firebase.auth().onAuthStateChanged(function(user) {
currentUser = user || null;
});
document.getElementById('orderForm').addEventListener('submit', function(e) {
e.preventDefault();
clearError();
const customerName = document.getElementById('customerName').value.trim();
const customerPhone = document.getElementById('customerPhone').value.trim();
const customerAddress = document.getElementById('customerAddress').value.trim();
const customerMessage = document.getElementById('customerMessage').value.trim();
if (!customerName) {
return showError('Please enter your full name.', 'customerName');
}
if (!customerPhone || !/^[0-9]{9,10}$/.test(customerPhone)) {
return showError('Please enter a valid 9 or 10-digit phone number.', 'customerPhone');
}
const confirmBtn = document.getElementById('confirmBtn');
confirmBtn.classList.add('loading');
confirmBtn.disabled = true;
const orderDoc = {
customer: {
name: customerName,
phone: customerPhone,
address: customerAddress || '',
note: customerMessage || ''
},
item: {
id: item.id,
name: item.name,
category: item.category,
price: item.price,
description: item.description,
image: item.image
},
quantity: quantity,
totalPrice: parseFloat((unitPrice * quantity).toFixed(2)),
userId: currentUser ? currentUser.uid : null,
userEmail: currentUser ? currentUser.email : null,
isGuest: !currentUser,
status: 'Pending',
createdAt: firebase.firestore.FieldValue.serverTimestamp()
};
db.collection('orders').add(orderDoc)
.then((docRef) => {
this.reset();
quantity = 1;
updateQtyUI();
confirmBtn.classList.remove('loading');
confirmBtn.disabled = false;
document.getElementById('successItemName').textContent = item.name;
document.getElementById('successQty').textContent = orderDoc.quantity;
document.getElementById('successTotal').textContent = orderDoc.totalPrice.toFixed(2);
document.getElementById('successPhone').textContent = customerPhone;
document.getElementById('successOrderRef').textContent = '📋 Order ref: ' + docRef.id.slice(0, 8).toUpperCase();
const btnArea = document.getElementById('successBtnArea');
if (currentUser) {
btnArea.innerHTML = `
<button class="btn-ok" onclick="window.location.href='orders.html'">
<i class="fas fa-clipboard-list"></i> View My Orders
</button>
<button class="btn-ok" style="background:linear-gradient(135deg,#4361ee,#3a56d4);margin-top:0;" onclick="closeSuccessPopup()">
<i class="fas fa-check"></i> Submit
</button>`;
} else {
btnArea.innerHTML = `
<button class="btn-ok" onclick="closeSuccessPopup()">
<i class="fas fa-check"></i> Submit
</button>`;
}
document.getElementById('successOverlay').style.display = 'flex';
})
.catch((error) => {
console.error('Firestore save error:', error);
confirmBtn.classList.remove('loading');
confirmBtn.disabled = false;
showError('Failed to place order. Please check your connection and try again.');
});
});
document.getElementById('successOverlay').addEventListener('click', function(e) {
if (e.target === this) closeSuccessPopup();
});
function showError(message, focusId) {
const box = document.getElementById('errorBox');
box.innerHTML = `
<div class="error-msg">
<i class="fas fa-exclamation-circle"></i>
${message}
</div>`;
if (focusId) document.getElementById(focusId).focus();
setTimeout(clearError, 6000);
}
function clearError() {
document.getElementById('errorBox').innerHTML = '';
}