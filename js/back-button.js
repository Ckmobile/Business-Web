(function () {
"use strict";
const CONFIG = {
position: "top-right",
fallbackUrl: "index.html",
logoutRedirectUrl: "index.html",
size: 50,
gap: 14,
sessionFlagKey: "uk_admin_logged_in"
};
const css = `
.bb-stack {
position: fixed;
z-index: 11000;
display: flex;
flex-direction: column;
align-items: center;
gap: ${CONFIG.gap}px;
}
.bb-stack.bb-top-left     { top: 22px;    left: 50px; }
.bb-stack.bb-top-right    { top: 22px;    right: 50px; }
.bb-stack.bb-bottom-left  { bottom: 22px; left: 22px; flex-direction: column-reverse; }
.bb-stack.bb-bottom-right { bottom: 22px; right: 22px; flex-direction: column-reverse; }
.bb-wrap {
position: relative;
width: ${CONFIG.size}px;
height: ${CONFIG.size}px;
display: flex;
align-items: center;
justify-content: center;
}
/* ---- Back button glow rings (back button එක සඳහා පමණයි) ---- */
.bb-ripple {
position: absolute;
inset: 0;
border-radius: 14px;
border: 2px solid transparent;
background:
linear-gradient(135deg, rgba(124,58,237,.55), rgba(37,99,235,.55)) border-box;
-webkit-mask:
linear-gradient(#fff 0 0) padding-box,
linear-gradient(#fff 0 0);
-webkit-mask-composite: xor;
mask-composite: exclude;
animation: bb-wave 3.6s cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
pointer-events: none;
}
.bb-ripple--2 { animation-delay: 1.2s; }
.bb-ripple--3 { animation-delay: 2.4s; }
@keyframes bb-wave {
0%   { transform: scale(1);    opacity: .85; }
70%  { transform: scale(1.4);  opacity: 0;   }
100% { transform: scale(1.4);  opacity: 0;   }
}
/* ---- Shared square button base ---- */
.bb-btn {
position: relative;
z-index: 2;
width: 100%;
height: 100%;
border-radius: 14px;
border: none;
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
transition: transform .25s cubic-bezier(0.34, 1.56, 0.64, 1),
box-shadow .25s ease;
}
/* ---- Back button colors ----
Performance fix: this ran an infinite background-position animation
on every page of the site (this script self-injects everywhere),
forcing a repaint every frame for no real visual benefit. It's now
a static blue → purple → pink gradient. */
.bb-btn.bb-back {
background-image: linear-gradient(135deg, #2563EB 0%, #7C3AED 55%, #EC4899 100%);
box-shadow:
0 4px 14px rgba(76, 29, 207, .35),
0 2px 6px rgba(37, 99, 235, .25);
}
.bb-btn.bb-back:hover {
transform: translateY(-2px) scale(1.07);
box-shadow:
0 8px 20px rgba(76, 29, 207, .45),
0 4px 10px rgba(37, 99, 235, .32);
}
/* ---- Logout button colors (red + pink mix, no glow rings) ---- */
.bb-btn.bb-logout {
background-image: linear-gradient(135deg, #ef4444 0%, #ec4899 100%);
box-shadow:
0 4px 14px rgba(239, 68, 68, .35),
0 2px 6px rgba(236, 72, 153, .25);
}
.bb-btn.bb-logout:hover {
transform: translateY(-2px) scale(1.07);
box-shadow:
0 8px 20px rgba(239, 68, 68, .45),
0 4px 10px rgba(236, 72, 153, .32);
}
.bb-btn:active { transform: translateY(0) scale(.94); }
.bb-btn svg {
width: 46%;
height: 46%;
stroke: #ffffff;
fill: none;
stroke-width: 2.4;
stroke-linecap: round;
stroke-linejoin: round;
transition: transform .2s ease;
}
.bb-btn.bb-back:hover svg { transform: translateX(-2px); }
/* Logout button hidden by default — JS shows it only when admin is logged in */
.bb-wrap.bb-logout-wrap {
display: none;
}
.bb-wrap.bb-logout-wrap.bb-show {
display: flex;
}
@media (prefers-reduced-motion: reduce) {
.bb-ripple, .bb-btn.bb-back { animation: none; }
}
@media (max-width: 600px) {
.bb-wrap { width: ${Math.max(CONFIG.size - 8, 42)}px; height: ${Math.max(CONFIG.size - 8, 42)}px; }
.bb-stack.bb-top-left, .bb-stack.bb-top-right { top: 14px; }
.bb-stack.bb-top-left, .bb-stack.bb-bottom-left { left: 14px; }
.bb-stack.bb-top-right, .bb-stack.bb-bottom-right { right: 14px; }
.bb-stack.bb-bottom-left, .bb-stack.bb-bottom-right { bottom: 14px; }
}
`;
const positionClass = "bb-" + (CONFIG.position || "top-right");
const html = `
<div class="bb-stack ${positionClass}" id="bbStack">
<div class="bb-wrap" id="bbWrap">
<span class="bb-ripple bb-ripple--1"></span>
<span class="bb-ripple bb-ripple--2"></span>
<span class="bb-ripple bb-ripple--3"></span>
<button type="button" id="bbButton" class="bb-btn bb-back" aria-label="ආපසු යන්න (Go back)" title="ආපසු යන්න">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
<path d="M15 18l-6-6 6-6"/>
</svg>
</button>
</div>
<div class="bb-wrap bb-logout-wrap" id="bbLogoutWrap">
<button type="button" id="bbLogoutButton" class="bb-btn bb-logout" aria-label="Admin Logout" title="Admin Logout">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
<path d="M16 17l5-5-5-5"/>
<path d="M21 12H9"/>
</svg>
</button>
</div>
</div>
`;
function injectStyle() {
const styleEl = document.createElement("style");
styleEl.setAttribute("data-bb-style", "true");
styleEl.textContent = css;
document.head.appendChild(styleEl);
}
function injectButtons() {
const holder = document.createElement("div");
holder.innerHTML = html.trim();
document.body.appendChild(holder.firstElementChild);
}
function attachBackBehavior() {
const btn = document.getElementById("bbButton");
if (!btn) return;
btn.addEventListener("click", function () {
if (window.history.length > 1) {
window.history.back();
} else {
window.location.href = CONFIG.fallbackUrl;
}
});
}
function showLogoutButton() {
if (!window.location.href.includes('profile')) {
return;
}
const wrap = document.getElementById("bbLogoutWrap");
if (wrap) wrap.classList.add("bb-show");
}
function hideLogoutButton() {
const wrap = document.getElementById("bbLogoutWrap");
if (wrap) wrap.classList.remove("bb-show");
}
function markAdminLoggedIn() {
try { sessionStorage.setItem(CONFIG.sessionFlagKey, "true"); } catch (e) {}
showLogoutButton();
}
function clearAdminLoggedIn() {
try { sessionStorage.removeItem(CONFIG.sessionFlagKey); } catch (e) {}
hideLogoutButton();
}
function attachLogoutBehavior() {
const logoutBtn = document.getElementById("bbLogoutButton");
if (!logoutBtn) return;
logoutBtn.addEventListener("click", async function () {
logoutBtn.disabled = true;
try {
if (window.firebase && firebase.apps && firebase.apps.length && firebase.auth) {
await firebase.auth().signOut();
}
} catch (e) {
console.warn("Firebase sign-out failed:", e);
}
clearAdminLoggedIn();
logoutBtn.disabled = false;
});
}
function setupAdminLoginDetection() {
document.addEventListener("adminAuthenticated", markAdminLoggedIn);
let alreadyLoggedIn = false;
try { alreadyLoggedIn = sessionStorage.getItem(CONFIG.sessionFlagKey) === "true"; } catch (e) {}
if (alreadyLoggedIn) showLogoutButton();
if (window.firebase && firebase.apps && firebase.apps.length && firebase.auth) {
try {
firebase.auth().onAuthStateChanged(function (user) {
if (user) {
markAdminLoggedIn();
} else {
clearAdminLoggedIn();
}
});
} catch (e) {}
}
}
function init() {
if (document.getElementById("bbStack")) return;
injectStyle();
injectButtons();
attachBackBehavior();
attachLogoutBehavior();
setupAdminLoginDetection();
}
if (document.readyState === "loading") {
document.addEventListener("DOMContentLoaded", init);
} else {
init();
}
})();
