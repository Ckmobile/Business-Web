(function () {
"use strict";
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
#admin-auth-overlay {
position: fixed;
inset: 0;
z-index: 99999;
display: flex;
align-items: stretch;
justify-content: center;
overflow: hidden;
font-family: 'Inter', sans-serif;
}
/* Static background — blue / purple / pink.
Performance fix: this used to animate a 400%-size gradient across
the ENTIRE viewport, forever, on the login screen — the most
expensive possible case of the background-position repaint issue
(whole-screen repaint every frame). It's now a static gradient. */
#admin-auth-bg {
position: absolute;
inset: 0;
background: linear-gradient(
135deg,
#1a1a2e 0%,
#16213e 20%,
#2563EB 45%,
#7C3AED 70%,
#EC4899 100%
);
}
/* Floating orbs for depth */
#admin-auth-bg::before,
#admin-auth-bg::after {
content: '';
position: absolute;
border-radius: 50%;
filter: blur(80px);
opacity: 0.35;
animation: orbFloat 12s ease-in-out infinite alternate;
}
#admin-auth-bg::before {
width: 520px; height: 520px;
background: radial-gradient(circle, #7C3AED, transparent 70%);
top: -120px; left: -100px;
}
#admin-auth-bg::after {
width: 400px; height: 400px;
background: radial-gradient(circle, #EC4899, transparent 70%);
bottom: -80px; right: -80px;
animation-delay: -6s;
}
@keyframes orbFloat {
from { transform: translate(0, 0) scale(1); }
to   { transform: translate(30px, 40px) scale(1.08); }
}
/* Card wrapper — splits screen top & bottom */
#admin-auth-card-wrap {
position: relative;
z-index: 1;
width: 100%;
max-width: 420px;
display: flex;
flex-direction: column;
justify-content: space-between;
padding: 0;
}
/* Top accent strip — static blue/purple/pink */
#admin-auth-top-strip {
height: 6px;
background: linear-gradient(90deg, #2563EB, #7C3AED, #EC4899);
}
/* White card */
#admin-auth-card {
flex: 1;
background: rgba(255,255,255,0.97);
backdrop-filter: blur(20px);
padding: 36px 32px 28px;
display: flex;
flex-direction: column;
overflow-y: auto;
}
/* Bottom accent strip — static blue/purple/pink */
#admin-auth-bottom-strip {
height: 6px;
background: linear-gradient(90deg, #EC4899, #7C3AED, #2563EB);
}
/* Header */
.aauth-header {
display: flex;
align-items: center;
gap: 12px;
margin-bottom: 6px;
}
.aauth-header-icon {
width: 44px; height: 44px;
background: linear-gradient(135deg, #7b2ff7, #e94560);
border-radius: 12px;
display: flex; align-items: center; justify-content: center;
flex-shrink: 0;
}
.aauth-header-icon svg { width: 22px; height: 22px; fill: white; }
.aauth-title {
font-size: 22px;
font-weight: 700;
color: #1a1a2e;
letter-spacing: -0.3px;
margin: 0;
}
.aauth-subtitle {
font-size: 13px;
color: #7a7a9a;
margin: 0 0 24px 0;
}
/* Tabs */
.aauth-tabs {
display: flex;
gap: 4px;
background: #f0f0f8;
border-radius: 10px;
padding: 4px;
margin-bottom: 22px;
}
.aauth-tab {
flex: 1;
padding: 8px 0;
border: none;
background: transparent;
border-radius: 8px;
font-size: 13px;
font-weight: 500;
color: #7a7a9a;
cursor: pointer;
transition: all 0.25s ease;
}
.aauth-tab.active {
background: white;
color: #1a1a2e;
font-weight: 600;
box-shadow: 0 2px 8px rgba(0,0,0,0.10);
}
/* Views */
.aauth-view { display: none; }
.aauth-view.active { display: block; }
/* Form fields */
.aauth-field { margin-bottom: 16px; }
.aauth-label {
display: flex;
align-items: center;
gap: 8px;
font-size: 13px;
font-weight: 600;
color: #333;
margin-bottom: 6px;
}
.aauth-label svg { width: 15px; height: 15px; }
.aauth-input {
width: 100%;
padding: 12px 14px;
border: 1.5px solid #e0e0ef;
border-radius: 10px;
font-size: 14px;
font-family: inherit;
color: #1a1a2e;
background: #fafafe;
outline: none;
transition: border-color 0.2s, box-shadow 0.2s;
box-sizing: border-box;
}
.aauth-input:focus {
border-color: #7b2ff7;
box-shadow: 0 0 0 3px rgba(123,47,247,0.12);
background: white;
}
.aauth-input::placeholder { color: #bbbbd0; }
.aauth-input-wrap {
position: relative;
}
.aauth-eye-btn {
position: absolute;
right: 12px;
top: 50%;
transform: translateY(-50%);
background: none;
border: none;
cursor: pointer;
padding: 2px;
color: #aaa;
display: flex;
align-items: center;
}
.aauth-eye-btn:hover { color: #7b2ff7; }
.aauth-hint {
font-size: 11px;
color: #aaa;
margin-top: 4px;
}
/* Forgot link */
.aauth-forgot-row {
text-align: right;
margin-top: -8px;
margin-bottom: 16px;
}
.aauth-link {
font-size: 12px;
color: #7b2ff7;
cursor: pointer;
text-decoration: none;
background: none;
border: none;
font-family: inherit;
padding: 0;
}
.aauth-link:hover { text-decoration: underline; }
/* Primary button */
.aauth-btn {
width: 100%;
padding: 14px;
border: none;
border-radius: 12px;
background: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%);
color: white;
font-size: 15px;
font-weight: 600;
font-family: inherit;
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
gap: 8px;
transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
box-shadow: 0 4px 18px rgba(123,47,247,0.30);
margin-top: 4px;
}
.aauth-btn:hover:not(:disabled) {
transform: translateY(-1px);
box-shadow: 0 6px 24px rgba(123,47,247,0.38);
opacity: 0.95;
}
.aauth-btn:active:not(:disabled) { transform: translateY(0); }
.aauth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.aauth-btn svg { width: 18px; height: 18px; fill: white; }
/* Divider */
.aauth-divider {
display: flex;
align-items: center;
gap: 10px;
margin: 16px 0;
color: #ccc;
font-size: 12px;
}
.aauth-divider::before,
.aauth-divider::after {
content: '';
flex: 1;
height: 1px;
background: #e8e8f0;
}
/* Google button */
.aauth-btn-google {
width: 100%;
padding: 12px;
border: 1.5px solid #e0e0ef;
border-radius: 12px;
background: white;
font-size: 14px;
font-weight: 500;
font-family: inherit;
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
gap: 10px;
transition: background 0.2s, box-shadow 0.2s;
color: #333;
}
.aauth-btn-google:hover { background: #f8f8ff; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.aauth-btn-google:disabled { opacity: 0.6; cursor: not-allowed; }
/* Note box */
.aauth-note {
display: flex;
gap: 10px;
background: #f0eeff;
border-left: 3px solid #7b2ff7;
border-radius: 0 10px 10px 0;
padding: 12px 14px;
margin-top: 20px;
font-size: 12px;
color: #555;
line-height: 1.5;
}
.aauth-note svg { width: 16px; height: 16px; flex-shrink: 0; margin-top: 1px; fill: #7b2ff7; }
/* Messages */
.aauth-msg {
padding: 10px 14px;
border-radius: 10px;
font-size: 13px;
margin-bottom: 14px;
display: none;
line-height: 1.45;
}
.aauth-msg.error { background: #fff0f3; color: #c0392b; border: 1px solid #ffd0d0; display: block; }
.aauth-msg.success { background: #f0fff4; color: #1e8449; border: 1px solid #b7f0cc; display: block; }
.aauth-msg.info { background: #f0eeff; color: #5a3aaa; border: 1px solid #d0c0f8; display: block; }
/* Loading spinner */
.aauth-spinner {
width: 18px; height: 18px;
border: 2.5px solid rgba(255,255,255,0.4);
border-top-color: white;
border-radius: 50%;
animation: spin 0.7s linear infinite;
display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }
/* Phone field extras */
.aauth-otp-row {
display: flex;
gap: 8px;
margin-top: 10px;
}
.aauth-otp-row .aauth-input { flex: 1; }
.aauth-otp-row .aauth-btn-sm {
padding: 0 16px;
border: none;
border-radius: 10px;
background: linear-gradient(135deg, #7b2ff7, #e94560);
color: white;
font-size: 13px;
font-weight: 600;
cursor: pointer;
white-space: nowrap;
font-family: inherit;
}
.aauth-otp-row .aauth-btn-sm:disabled { opacity: 0.5; cursor: not-allowed; }
#admin-auth-recaptcha { margin-top: 8px; }
/* Responsive */
@media (max-height: 700px) {
#admin-auth-card { padding: 24px 24px 20px; }
}
`;
const ICON_KEY = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12.65 10A6 6 0 1 0 11 13H17v2h2v-2h2v-4h-2V7h-2v3h-3.35zM7 11a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>`;
const ICON_EMAIL = `<svg viewBox="0 0 24 24"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>`;
const ICON_LOCK = `<svg viewBox="0 0 24 24"><path d="M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm3.1-9H8.9V6a3.1 3.1 0 0 1 6.2 0v2z"/></svg>`;
const ICON_SHIELD = `<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4z"/></svg>`;
const ICON_LOGIN = `<svg viewBox="0 0 24 24"><path d="M10 17l5-5-5-5v3H3v4h7v3zm8 0V7h-2v10h2z"/></svg>`;
const ICON_INFO = `<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`;
const ICON_EYE = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>`;
const ICON_EYE_OFF = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-5 0-9.27-3.11-11-7.5a18.5 18.5 0 0 1 2.16-3.72m3.06-2.73A10 10 0 0 1 12 4c5 0 9.27 3.11 11 7.5a18.5 18.5 0 0 1-4.28 5.79M1 1l22 22M9.9 4.24A9 9 0 0 1 12 4m8.63 8.63A9 9 0 0 1 12 20M3 3l3.59 3.59m0 0A9.95 9.95 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5a9.95 9.95 0 0 0 5.41-1.59M6.59 6.59 21 21"/></svg>`;
const ICON_PHONE = `<svg viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>`;
const ICON_ANON = `<svg viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>`;
const ICON_GOOGLE = `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>`;
function buildHTML() {
return `
<div id="admin-auth-bg"></div>
<div id="admin-auth-card-wrap">
<div id="admin-auth-top-strip"></div>
<div id="admin-auth-card">
<div class="aauth-header">
<div class="aauth-header-icon">${ICON_KEY}</div>
<div>
<h1 class="aauth-title">UK ONLINE LOGIN</h1>
</div>
</div>
<p class="aauth-subtitle">Login or create an account to continue.</p>
<!-- Tabs -->
<div class="aauth-tabs">
<button class="aauth-tab active" data-tab="login">Login</button>
<button class="aauth-tab" data-tab="signup">Sign Up</button>
<button class="aauth-tab" data-tab="forgot">Forgot</button>
</div>
<!-- ── LOGIN VIEW ── -->
<div class="aauth-view active" id="aauth-view-login">
<div id="aauth-msg-login" class="aauth-msg"></div>
<div class="aauth-field">
<label class="aauth-label">${ICON_EMAIL} Enter Email</label>
<input class="aauth-input" id="aauth-login-email" type="email" placeholder="loggin@example.com" autocomplete="email"/>
</div>
<div class="aauth-field">
<label class="aauth-label">${ICON_LOCK} Password</label>
<div class="aauth-input-wrap">
<input class="aauth-input" id="aauth-login-password" type="password" placeholder="Your password" autocomplete="current-password" style="padding-right:40px"/>
<button class="aauth-eye-btn" id="aauth-login-eye" type="button">${ICON_EYE}</button>
</div>
</div>
<div class="aauth-forgot-row">
<button class="aauth-link" data-goto="forgot">Forgot password?</button>
</div>
<button class="aauth-btn" id="aauth-btn-login">
${ICON_LOGIN} Log in now
</button>
<div class="aauth-divider">or continue with</div>
<button class="aauth-btn-google" id="aauth-btn-google-login">
${ICON_GOOGLE} Sign in with Google
</button>
<div class="aauth-divider">other options</div>
<button class="aauth-btn-google" id="aauth-btn-anon" style="gap:8px;">
${ICON_ANON} <span>Continue Anonymously</span>
</button>
<div class="aauth-note">
${ICON_INFO}
<span><strong>Note:</strong> Log in or sign up to track your orders. You can also browse products and place orders without logging in.</span>
</div>
</div>
<!-- ── SIGN UP VIEW ── -->
<div class="aauth-view" id="aauth-view-signup">
<div id="aauth-msg-signup" class="aauth-msg"></div>
<div class="aauth-field">
<label class="aauth-label">${ICON_EMAIL} Email</label>
<input class="aauth-input" id="aauth-signup-email" type="email" placeholder="singup@example.com" autocomplete="email"/>
</div>
<div class="aauth-field">
<label class="aauth-label">${ICON_LOCK} Password</label>
<div class="aauth-input-wrap">
<input class="aauth-input" id="aauth-signup-password" type="password" placeholder="Min 8 characters" autocomplete="new-password" style="padding-right:40px"/>
<button class="aauth-eye-btn" id="aauth-signup-eye" type="button">${ICON_EYE}</button>
</div>
</div>
<div class="aauth-field">
<label class="aauth-label">${ICON_LOCK} Confirm Password</label>
<div class="aauth-input-wrap">
<input class="aauth-input" id="aauth-signup-confirm" type="password" placeholder="Re-enter password" autocomplete="new-password" style="padding-right:40px"/>
<button class="aauth-eye-btn" id="aauth-signup-confirm-eye" type="button">${ICON_EYE}</button>
</div>
</div>
<button class="aauth-btn" id="aauth-btn-signup">
${ICON_LOGIN} Create your Account
</button>
<div class="aauth-divider">or</div>
<button class="aauth-btn-google" id="aauth-btn-google-signup">
${ICON_GOOGLE} Sign up with Google
</button>
<div class="aauth-divider">phone verification</div>
<div class="aauth-field">
<label class="aauth-label">${ICON_PHONE} Phone Number</label>
<input class="aauth-input" id="aauth-phone-number" type="tel" placeholder="+94771234567"/>
<div id="admin-auth-recaptcha"></div>
<div class="aauth-otp-row">
<input class="aauth-input" id="aauth-otp-code" type="text" placeholder="Enter OTP"/>
<button class="aauth-btn-sm" id="aauth-btn-send-otp">Send OTP</button>
</div>
<button class="aauth-btn" id="aauth-btn-verify-otp" style="margin-top:10px;">
Verify & Sign In
</button>
</div>
</div>
<!-- ── FORGOT VIEW ── -->
<div class="aauth-view" id="aauth-view-forgot">
<div id="aauth-msg-forgot" class="aauth-msg"></div>
<p style="font-size:13px;color:#666;margin-bottom:16px;line-height:1.5;">
Enter your admin email address and we'll send a password reset link.
</p>
<div class="aauth-field">
<label class="aauth-label">${ICON_EMAIL} Admin Email</label>
<input class="aauth-input" id="aauth-forgot-email" type="email" placeholder="admin@example.com" autocomplete="email"/>
</div>
<button class="aauth-btn" id="aauth-btn-forgot">
${ICON_EMAIL} Send Reset Link
</button>
<div style="text-align:center;margin-top:16px;">
<button class="aauth-link" data-goto="login">← Back to Login</button>
</div>
</div>
</div><!-- /card -->
<div id="admin-auth-bottom-strip"></div>
</div>
`;
}
function showMsg(id, msg, type = "error") {
const el = document.getElementById(id);
if (!el) return;
el.textContent = msg;
el.className = `aauth-msg ${type}`;
}
function clearMsg(id) {
const el = document.getElementById(id);
if (el) { el.textContent = ""; el.className = "aauth-msg"; }
}
function setLoading(btnId, loading) {
const btn = document.getElementById(btnId);
if (!btn) return;
btn.disabled = loading;
if (loading) {
btn._orig = btn.innerHTML;
btn.innerHTML = `<span class="aauth-spinner"></span>`;
} else if (btn._orig) {
btn.innerHTML = btn._orig;
}
}
function togglePasswordVisibility(inputId, btnId) {
const input = document.getElementById(inputId);
const btn = document.getElementById(btnId);
if (!input || !btn) return;
if (input.type === "password") {
input.type = "text";
btn.innerHTML = ICON_EYE_OFF;
} else {
input.type = "password";
btn.innerHTML = ICON_EYE;
}
}
function switchTab(tab) {
document.querySelectorAll(".aauth-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
document.querySelectorAll(".aauth-view").forEach(v => v.classList.toggle("active", v.id === `aauth-view-${tab}`));
}
let firebaseLoaded = false;
let auth, googleProvider, RecaptchaVerifier;
let confirmationResult = null;
function waitForFirebase(cb) {
const maxWait = 8000;
const start = Date.now();
function poll() {
if (window.firebase && window.firebase.auth) {
cb(null);
} else if (Date.now() - start > maxWait) {
cb(new Error("Firebase SDK not found. Make sure firebase-config.js is loaded before password.js."));
} else {
setTimeout(poll, 100);
}
}
poll();
}
function initFirebase(cb) {
if (firebaseLoaded) { cb(null); return; }
waitForFirebase(function (err) {
if (err) { cb(err); return; }
try {
if (window.firebase && window.firebase.auth) {
auth = window.firebase.auth();
auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);
googleProvider = new window.firebase.auth.GoogleAuthProvider();
RecaptchaVerifier = window.firebase.auth.RecaptchaVerifier;
firebaseLoaded = true;
cb(null);
} else {
cb(new Error("Firebase Auth not available."));
}
} catch (e) {
cb(e);
}
});
}
function loginEmailPassword(email, password, msgId, btnId) {
clearMsg(msgId);
if (!email || !password) {
showMsg(msgId, "Please fill in all fields.", "error"); return;
}
setLoading(btnId, true);
initFirebase(function (err) {
if (err) { setLoading(btnId, false); showMsg(msgId, err.message, "error"); return; }
auth.signInWithEmailAndPassword(email, password)
.then(function (uc) {
setLoading(btnId, false);
onAuthSuccess(uc.user, "email");
})
.catch(function (e) {
setLoading(btnId, false);
showMsg(msgId, friendlyError(e), "error");
});
});
}
function signupEmailPassword(email, password, confirm, msgId, btnId) {
clearMsg(msgId);
if (!email || !password || !confirm) {
showMsg(msgId, "Please fill in all fields.", "error"); return;
}
if (password !== confirm) {
showMsg(msgId, "Passwords do not match.", "error"); return;
}
if (password.length < 8) {
showMsg(msgId, "Password must be at least 8 characters.", "error"); return;
}
setLoading(btnId, true);
initFirebase(function (err) {
if (err) { setLoading(btnId, false); showMsg(msgId, err.message, "error"); return; }
auth.createUserWithEmailAndPassword(email, password)
.then(function (uc) {
setLoading(btnId, false);
onAuthSuccess(uc.user, "signup");
})
.catch(function (e) {
setLoading(btnId, false);
showMsg(msgId, friendlyError(e), "error");
});
});
}
function loginGoogle(msgId, btnId) {
clearMsg(msgId);
setLoading(btnId, true);
initFirebase(function (err) {
if (err) { setLoading(btnId, false); showMsg(msgId, err.message, "error"); return; }
auth.signInWithPopup(googleProvider)
.then(function (uc) {
setLoading(btnId, false);
onAuthSuccess(uc.user, "google");
})
.catch(function (e) {
setLoading(btnId, false);
if (e.code !== "auth/popup-closed-by-user") showMsg(msgId, friendlyError(e), "error");
});
});
}
function loginAnonymous(msgId, btnId) {
clearMsg(msgId);
setLoading(btnId, true);
initFirebase(function (err) {
if (err) { setLoading(btnId, false); showMsg(msgId, err.message, "error"); return; }
auth.signInAnonymously()
.then(function (uc) {
setLoading(btnId, false);
onAuthSuccess(uc.user, "anonymous");
})
.catch(function (e) {
setLoading(btnId, false);
showMsg(msgId, friendlyError(e), "error");
});
});
}
function sendOTP(phoneNumber, msgId) {
clearMsg(msgId);
if (!phoneNumber) { showMsg(msgId, "Enter a valid phone number.", "error"); return; }
initFirebase(function (err) {
if (err) { showMsg(msgId, err.message, "error"); return; }
try {
if (!window._aauth_recaptcha) {
window._aauth_recaptcha = new RecaptchaVerifier("admin-auth-recaptcha", {
size: "normal",
callback: function () {}
}, auth);
}
auth.signInWithPhoneNumber(phoneNumber, window._aauth_recaptcha)
.then(function (result) {
confirmationResult = result;
showMsg(msgId, "OTP sent! Check your phone.", "success");
})
.catch(function (e) {
showMsg(msgId, friendlyError(e), "error");
});
} catch (e) {
showMsg(msgId, e.message, "error");
}
});
}
function verifyOTP(otp, msgId, btnId) {
clearMsg(msgId);
if (!confirmationResult) { showMsg(msgId, "Please send OTP first.", "error"); return; }
if (!otp) { showMsg(msgId, "Enter the OTP code.", "error"); return; }
setLoading(btnId, true);
confirmationResult.confirm(otp)
.then(function (uc) {
setLoading(btnId, false);
onAuthSuccess(uc.user, "phone");
})
.catch(function (e) {
setLoading(btnId, false);
showMsg(msgId, friendlyError(e), "error");
});
}
function sendPasswordReset(email, msgId, btnId) {
clearMsg(msgId);
if (!email) { showMsg(msgId, "Enter your email address.", "error"); return; }
setLoading(btnId, true);
initFirebase(function (err) {
if (err) { setLoading(btnId, false); showMsg(msgId, err.message, "error"); return; }
auth.sendPasswordResetEmail(email)
.then(function () {
setLoading(btnId, false);
showMsg(msgId, "Reset link sent! Check your inbox.", "success");
})
.catch(function (e) {
setLoading(btnId, false);
showMsg(msgId, friendlyError(e), "error");
});
});
}
function onAuthSuccess(user, method) {
const overlay = document.getElementById("admin-auth-overlay");
if (overlay) {
overlay.style.transition = "opacity 0.5s";
overlay.style.opacity = "0";
setTimeout(function () { overlay.style.display = "none"; }, 500);
}
document.dispatchEvent(new CustomEvent("adminAuthSuccess", {
detail: { user: user, method: method }
}));
if (typeof window.onAdminAuthSuccess === "function") {
window.onAdminAuthSuccess(user, method);
}
}
function friendlyError(e) {
const map = {
"auth/user-not-found": "No account found with this email.",
"auth/wrong-password": "Incorrect password. Try again.",
"auth/invalid-email": "Please enter a valid email address.",
"auth/email-already-in-use": "This email is already registered.",
"auth/weak-password": "Password is too weak. Use at least 8 characters.",
"auth/too-many-requests": "Too many attempts. Please wait and try again.",
"auth/network-request-failed": "Network error. Check your connection.",
"auth/invalid-verification-code": "Invalid OTP code.",
"auth/invalid-phone-number": "Invalid phone number format. Include country code.",
"auth/operation-not-allowed": "This sign-in method is not enabled in Firebase Console.",
"auth/popup-blocked": "Popup blocked. Allow popups for this site.",
"auth/account-exists-with-different-credential": "An account already exists with a different login method.",
};
return map[e.code] || e.message || "An error occurred.";
}
function mount() {
const style = document.createElement("style");
style.textContent = STYLES;
document.head.appendChild(style);
const overlay = document.createElement("div");
overlay.id = "admin-auth-overlay";
overlay.innerHTML = buildHTML();
document.body.appendChild(overlay);
overlay.querySelectorAll(".aauth-tab").forEach(function (btn) {
btn.addEventListener("click", function () { switchTab(btn.dataset.tab); });
});
overlay.querySelectorAll("[data-goto]").forEach(function (btn) {
btn.addEventListener("click", function () { switchTab(btn.dataset.goto); });
});
[
["aauth-login-password", "aauth-login-eye"],
["aauth-signup-password", "aauth-signup-eye"],
["aauth-signup-confirm", "aauth-signup-confirm-eye"],
].forEach(function (pair) {
const btn = document.getElementById(pair[1]);
if (btn) btn.addEventListener("click", function () { togglePasswordVisibility(pair[0], pair[1]); });
});
document.getElementById("aauth-btn-login").addEventListener("click", function () {
loginEmailPassword(
document.getElementById("aauth-login-email").value.trim(),
document.getElementById("aauth-login-password").value,
"aauth-msg-login",
"aauth-btn-login"
);
});
["aauth-login-email","aauth-login-password"].forEach(function(id) {
const el = document.getElementById(id);
if (el) el.addEventListener("keydown", function(e) {
if (e.key === "Enter") document.getElementById("aauth-btn-login").click();
});
});
document.getElementById("aauth-btn-google-login").addEventListener("click", function () {
loginGoogle("aauth-msg-login", "aauth-btn-google-login");
});
document.getElementById("aauth-btn-anon").addEventListener("click", function () {
loginAnonymous("aauth-msg-login", "aauth-btn-anon");
});
document.getElementById("aauth-btn-signup").addEventListener("click", function () {
signupEmailPassword(
document.getElementById("aauth-signup-email").value.trim(),
document.getElementById("aauth-signup-password").value,
document.getElementById("aauth-signup-confirm").value,
"aauth-msg-signup",
"aauth-btn-signup"
);
});
document.getElementById("aauth-btn-google-signup").addEventListener("click", function () {
loginGoogle("aauth-msg-signup", "aauth-btn-google-signup");
});
document.getElementById("aauth-btn-send-otp").addEventListener("click", function () {
sendOTP(
document.getElementById("aauth-phone-number").value.trim(),
"aauth-msg-signup"
);
});
document.getElementById("aauth-btn-verify-otp").addEventListener("click", function () {
verifyOTP(
document.getElementById("aauth-otp-code").value.trim(),
"aauth-msg-signup",
"aauth-btn-verify-otp"
);
});
document.getElementById("aauth-btn-forgot").addEventListener("click", function () {
sendPasswordReset(
document.getElementById("aauth-forgot-email").value.trim(),
"aauth-msg-forgot",
"aauth-btn-forgot"
);
});
document.getElementById("aauth-forgot-email").addEventListener("keydown", function(e) {
if (e.key === "Enter") document.getElementById("aauth-btn-forgot").click();
});
}
function showLoginOverlay() {
const existing = document.getElementById("admin-auth-overlay");
if (existing) {
existing.style.transition = "";
existing.style.opacity = "1";
existing.style.display = "flex";
["aauth-login-email", "aauth-login-password"].forEach(function (id) {
const el = document.getElementById(id);
if (el) el.value = "";
});
clearMsg("aauth-msg-login");
clearMsg("aauth-msg-signup");
clearMsg("aauth-msg-forgot");
switchTab("login");
} else {
mount();
}
}
function initializeAuth() {
initFirebase(function(err) {
if (err) {
mount();
return;
}
auth.onAuthStateChanged(function(user) {
if (user) {
onAuthSuccess(user, "persisted");
} else {
showLoginOverlay();
}
});
});
}
if (document.readyState === "loading") {
document.addEventListener("DOMContentLoaded", initializeAuth);
} else {
initializeAuth();
}
// ---- Fix: login overlay reappearing on browser Back navigation ----
// When the user presses the browser's Back button, the page can come
// back in two ways:
//  1) Restored instantly from the browser's back/forward cache
//     (bfcache) — "pageshow" fires with event.persisted === true.
//  2) Fully reloaded by the browser — password.js runs again from
//     scratch and briefly re-checks Firebase's persisted session
//     before onAuthStateChanged resolves, which can flash/leave the
//     login overlay visible even though the user is still logged in.
// In both cases, re-confirm the real auth state as soon as the page
// is shown again and keep the overlay hidden if a session exists.
window.addEventListener("pageshow", function (event) {
try {
if (auth && auth.currentUser) {
// Already signed in — make sure the overlay (if it exists from
// an earlier state) stays hidden instead of popping back up.
onAuthSuccess(auth.currentUser, "persisted");
} else if (event.persisted) {
// Came back from bfcache before auth had resolved in this page
// instance — re-run the normal check instead of leaving a stale
// overlay/loading state on screen.
initializeAuth();
}
} catch (e) { /* ignore */ }
});
})();
