(function () {
"use strict";
let currentUser = null;
function showSection(id) {
document.querySelectorAll(".page-section").forEach(function (s) {
s.classList.remove("active");
});
var el = document.getElementById(id);
if (el) el.classList.add("active");
window.scrollTo(0, 0);
}
function showAlert(id, msg, type) {
var el = document.getElementById(id);
if (!el) return;
el.className = "alert alert-" + type + " show";
el.textContent = msg;
if (type !== "info") {
setTimeout(function () { el.classList.remove("show"); }, 5000);
}
}
function clearAlert(id) {
var el = document.getElementById(id);
if (el) { el.className = "alert"; el.textContent = ""; }
}
function setLoading(btnId, on, originalHTML) {
var btn = document.getElementById(btnId);
if (!btn) return;
btn.disabled = on;
if (on) {
btn.dataset.orig = btn.innerHTML;
btn.innerHTML = '<span class="spinner"></span>';
} else {
btn.innerHTML = btn.dataset.orig || originalHTML || btn.innerHTML;
}
}
window.toggleEye = function (inputId, btn) {
var inp = document.getElementById(inputId);
if (!inp) return;
var icon = btn.querySelector("i");
if (inp.type === "password") {
inp.type = "text";
icon.classList.replace("fa-eye", "fa-eye-slash");
} else {
inp.type = "password";
icon.classList.replace("fa-eye-slash", "fa-eye");
}
};
var photoInput = document.getElementById("photoURLInput");
if (photoInput) {
photoInput.addEventListener("input", function () {
updateUrlPreview(this.value.trim());
});
}
var CLOUD_NAME = "cgxzawjf";
var UPLOAD_PRESET = "kavishka";
var photoFileInput = document.getElementById("photoFileInput");
var uploadPhotoBtn = document.getElementById("uploadPhotoBtn");
var uploadProgressWrap = document.getElementById("uploadProgressWrap");
var uploadProgressBar = document.getElementById("uploadProgressBar");
if (uploadPhotoBtn) {
uploadPhotoBtn.addEventListener("click", function () {
photoFileInput.click();
});
}
if (photoFileInput) {
photoFileInput.addEventListener("change", function () {
if (this.files && this.files[0]) {
uploadPhotoToCloudinary(this.files[0]);
}
});
}
function uploadPhotoToCloudinary(file) {
if (!file.type.startsWith("image/")) {
showAlert("photoAlert", "කරුණාකර image file එකක් තෝරන්න.", "error");
return;
}
var formData = new FormData();
formData.append("file", file);
formData.append("upload_preset", UPLOAD_PRESET);
var xhr = new XMLHttpRequest();
xhr.open("POST", "https://api.cloudinary.com/v1_1/" + CLOUD_NAME + "/image/upload");
uploadPhotoBtn.disabled = true;
uploadPhotoBtn.innerHTML = '<span class="spinner"></span> Uploading...';
uploadProgressWrap.style.display = "block";
uploadProgressBar.style.width = "0%";
clearAlert("photoAlert");
xhr.upload.addEventListener("progress", function (e) {
if (e.lengthComputable) {
var percent = (e.loaded / e.total) * 100;
uploadProgressBar.style.width = percent + "%";
}
});
xhr.onload = function () {
uploadPhotoBtn.disabled = false;
uploadPhotoBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Photo';
uploadProgressWrap.style.display = "none";
if (xhr.status === 200) {
var data = JSON.parse(xhr.responseText);
var url = data.secure_url;
document.getElementById("photoURLInput").value = url;
updateUrlPreview(url);
updateHeroAvatar(url);
savePhotoURLToFirestore(url);
} else {
var msg = "Upload එක අසාර්ථක විය. නැවත උත්සාහ කරන්න.";
try {
var err = JSON.parse(xhr.responseText);
if (err.error && err.error.message) msg = err.error.message;
} catch (e) {}
showAlert("photoAlert", msg, "error");
}
};
xhr.onerror = function () {
uploadPhotoBtn.disabled = false;
uploadPhotoBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Photo';
uploadProgressWrap.style.display = "none";
showAlert("photoAlert", "Network error එකක් සිදු විය. නැවත උත්සාහ කරන්න.", "error");
};
xhr.send(formData);
}
function savePhotoURLToFirestore(url) {
if (!currentUser) {
showAlert("photoAlert", "Photo upload සාර්ථකයි! නමුත් save කරන්න ලොග් වී සිටිය යුතුයි.", "error");
return;
}
db.collection("customer").doc(currentUser.email).set({ photoURL: url }, { merge: true })
.then(function () {
return currentUser.updateProfile({ photoURL: url });
})
.then(function () {
showAlert("photoAlert", "Photo upload වී Firestore එකට සේව් වුනා!", "success");
})
.catch(function (e) {
console.warn("Firestore photoURL save failed:", e);
showAlert("photoAlert", "Photo upload වුනා, නමුත් Firestore save එක අසාර්ථක විය: " + (e.message || ""), "error");
});
}
function updateUrlPreview(url) {
var img = document.getElementById("urlPreviewImg");
var ph = document.getElementById("urlPreviewPlaceholder");
if (!url) {
img.classList.remove("show");
ph.style.display = "flex";
return;
}
img.src = url;
img.onload = function () {
img.classList.add("show");
ph.style.display = "none";
};
img.onerror = function () {
img.classList.remove("show");
ph.style.display = "flex";
};
}
function populateProfile(user, firestoreData) {
document.getElementById("heroName").textContent =
(firestoreData && firestoreData.name) || user.displayName || "No Name";
document.getElementById("heroEmail").textContent = user.email || "";
var photoUrl = (firestoreData && firestoreData.photoURL) || user.photoURL || "";
updateHeroAvatar(photoUrl);
document.getElementById("nameInput").value =
(firestoreData && firestoreData.name) || user.displayName || "";
document.getElementById("emailDisplay").value = user.email || "";
document.getElementById("photoURLInput").value = photoUrl;
if (photoUrl) updateUrlPreview(photoUrl);
}
function updateHeroAvatar(url) {
var img = document.getElementById("heroAvatarImg");
var ph = document.getElementById("heroAvatarPlaceholder");
if (!url) {
img.style.display = "none";
ph.style.display = "flex";
return;
}
img.src = url;
img.onload = function () {
img.style.display = "block";
ph.style.display = "none";
};
img.onerror = function () {
img.style.display = "none";
ph.style.display = "flex";
};
}
function loadFirestoreProfile(user) {
firebase.firestore().collection("customer").doc(user.email).get()
.then(function (doc) {
if (doc.exists) {
populateProfile(user, doc.data());
} else {
populateProfile(user, null);
}
})
.catch(function (e) {
console.warn("Firestore read error:", e);
populateProfile(user, null);
});
}
window.saveProfile = function () {
if (!currentUser) return;
var name = document.getElementById("nameInput").value.trim();
var photoURL = document.getElementById("photoURLInput").value.trim();
if (!name) {
showAlert("profileAlert", "Please enter your name.", "error");
return;
}
setLoading("saveProfileBtn", true);
clearAlert("profileAlert");
var updates = { name: name, photoURL: photoURL };
db.collection("customer").doc(currentUser.email).set(updates, { merge: true })
.then(function () {
return currentUser.updateProfile({ displayName: name, photoURL: photoURL || null });
})
.then(function () {
setLoading("saveProfileBtn", false);
showAlert("profileAlert", "Profile saved successfully!", "success");
document.getElementById("heroName").textContent = name;
updateHeroAvatar(photoURL);
updateUrlPreview(photoURL);
})
.catch(function (e) {
setLoading("saveProfileBtn", false);
showAlert("profileAlert", e.message || "Failed to save profile.", "error");
});
};
window.changePassword = function () {
if (!currentUser) return;
var current = document.getElementById("currentPwInput").value;
var newPw = document.getElementById("newPwInput").value;
var confirm = document.getElementById("confirmPwInput").value;
clearAlert("pwAlert");
if (!current || !newPw || !confirm) {
showAlert("pwAlert", "Please fill in all password fields.", "error"); return;
}
if (newPw.length < 8) {
showAlert("pwAlert", "New password must be at least 8 characters.", "error"); return;
}
if (newPw !== confirm) {
showAlert("pwAlert", "New passwords do not match.", "error"); return;
}
setLoading("changePwBtn", true);
var credential = firebase.auth.EmailAuthProvider.credential(
currentUser.email, current
);
currentUser.reauthenticateWithCredential(credential)
.then(function () {
return currentUser.updatePassword(newPw);
})
.then(function () {
setLoading("changePwBtn", false);
showAlert("pwAlert", "Password updated successfully!", "success");
document.getElementById("currentPwInput").value = "";
document.getElementById("newPwInput").value = "";
document.getElementById("confirmPwInput").value = "";
})
.catch(function (e) {
setLoading("changePwBtn", false);
var msg = e.code === "auth/wrong-password"
? "Current password is incorrect."
: (e.message || "Failed to update password.");
showAlert("pwAlert", msg, "error");
});
};
window.sendForgotPassword = function () {
if (!currentUser || !currentUser.email) return;
clearAlert("forgotAlert");
setLoading("forgotPwBtn", true);
showAlert("forgotAlert", "Sending reset email…", "info");
auth.sendPasswordResetEmail(currentUser.email)
.then(function () {
setLoading("forgotPwBtn", false);
showAlert("forgotAlert",
"Password reset email sent to " + currentUser.email + ". Check your inbox!", "success");
})
.catch(function (e) {
setLoading("forgotPwBtn", false);
showAlert("forgotAlert", e.message || "Failed to send reset email.", "error");
});
};
function loadOrders(user) {
var listEl = document.getElementById("ordersList");
listEl.innerHTML = '<div class="orders-empty"><i class="fas fa-spinner fa-spin" style="font-size:28px;margin-bottom:8px;display:block;"></i>Loading orders…</div>';
db.collection("orders")
.where("email", "==", user.email)
.orderBy("createdAt", "desc")
.get()
.then(function (snap) {
if (snap.empty) {
listEl.innerHTML = '<div class="orders-empty"><i class="fas fa-box-open" style="font-size:32px;margin-bottom:8px;display:block;"></i>No orders yet.</div>';
return;
}
listEl.innerHTML = "";
snap.forEach(function (doc) {
var d = doc.data();
var statusClass = "status-" + (d.status || "pending").toLowerCase().replace(/\s/g,"-");
var date = d.createdAt && d.createdAt.toDate
? d.createdAt.toDate().toLocaleDateString("en-GB", {day:"2-digit",month:"short",year:"numeric"})
: "";
listEl.innerHTML +=
'<div class="order-item">' +
'<div class="order-item-top">' +
'<div>' +
'<div class="order-product">' + (d.productName || d.itemName || "Order") + '</div>' +
'<div class="order-id">#' + doc.id.substring(0,8).toUpperCase() + (date ? " · " + date : "") + '</div>' +
'</div>' +
'<span class="order-status ' + statusClass + '">' + (d.status || "Pending") + '</span>' +
'</div>' +
'<div style="display:flex;justify-content:space-between;align-items:center;">' +
'<div class="order-price">Rs. ' + (d.totalPrice || d.price || "—") + '</div>' +
'<div class="order-date">' + (d.quantity ? "Qty: " + d.quantity : "") + '</div>' +
'</div>' +
'</div>';
});
})
.catch(function (e) {
console.warn("Orders load failed:", e);
listEl.innerHTML = '<div class="orders-empty">Could not load orders.</div>';
});
}
window.doLogout = function () {
if (!confirm("Are you sure you want to sign out?")) return;
auth.signOut().then(function () {
try { sessionStorage.removeItem("uk_admin_logged_in"); } catch(e) {}
showSection("auth-section");
currentUser = null;
});
};
auth.onAuthStateChanged(function (user) {
if (user) {
currentUser = user;
showSection("profile-section");
loadFirestoreProfile(user);
loadOrders(user);
} else {
currentUser = null;
showSection("auth-section");
}
});
document.addEventListener("adminAuthSuccess", function (e) {
var user = e.detail && e.detail.user;
if (user) {
currentUser = user;
showSection("profile-section");
loadFirestoreProfile(user);
loadOrders(user);
}
});
window.addEventListener("popstate", function () {
if (currentUser) {
showSection("profile-section");
}
});
})();