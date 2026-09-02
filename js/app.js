/* ==========================================================================
   app.js — SPA Router
   Loads each original page's fragment (HTML), its own CSS, and its own
   JS files on demand, and swaps them into the single-page shell.
   Every page keeps its ORIGINAL, separate .html / .css / .js files —
   this router just stitches them together at runtime so everything
   appears on one page with instant tab-style navigation.
   ========================================================================== */

const PAGES = {
  index: {
    title: "Uk Online | Shop Products",
    css: "css/index.css",
    html: "pages/index.html",
    scripts: ["js/menu.js", "js/script.js", "js/index-inline.js"]
  },
  admin: {
    title: "Admin Panel | Product Management",
    css: "css/admin.css",
    html: "pages/admin.html",
    scripts: ["js/password.js", "js/back-button.js", "js/menu.js", "js/admin-inline.js"]
  },
  cart: {
    title: "My Cart",
    css: "css/cart.css",
    html: "pages/cart.html",
    scripts: ["js/password.js", "js/back-button.js", "js/menu.js", "js/cart-inline.js"]
  },
  dashboard: {
    title: "Dashboard | UK Online Shop",
    css: "css/dashboard.css",
    html: "pages/dashboard.html",
    scripts: ["js/password.js", "js/menu.js", "js/back-button.js", "js/dashboard-inline.js"]
  },
  games: {
    title: "Games | UK Online Shop",
    css: "css/games.css",
    html: "pages/games.html",
    scripts: ["js/back-button.js", "js/games-inline.js"]
  },
  list: {
    title: "Order List - UK Online Shop",
    css: "css/list.css",
    html: "pages/list.html",
    scripts: ["js/back-button.js", "js/menu.js", "js/password.js", "js/list-inline.js"]
  },
  order: {
    title: "Confirm Your Order | UK Online Shop",
    css: "css/order.css",
    html: "pages/order.html",
    scripts: ["js/back-button.js", "js/order-inline.js"]
  },
  orders: {
    title: "Customer Orders | UK Online Shop",
    css: "css/orders.css",
    html: "pages/orders.html",
    scripts: ["js/password.js", "js/back-button.js", "js/menu.js", "js/orders-inline.js"]
  },
  page: {
    title: "Product Details",
    css: "css/page.css",
    html: "pages/page.html",
    scripts: ["js/back-button.js", "js/page-inline.js"]
  },
  profile: {
    title: "My Profile | Uk Online",
    css: "css/profile.css",
    html: "pages/profile.html",
    scripts: ["js/password.js", "js/back-button.js", "js/menu.js", "js/profile-inline.js"]
  },
  settings: {
    title: "Settings | UK Online Shop",
    css: "css/settings.css",
    html: "pages/settings.html",
    scripts: ["js/back-button.js", "js/menu.js", "js/settings-inline.js"]
  }
};

const appContent = document.getElementById("app-content");
const pageStyle = document.getElementById("page-style");
const tabButtons = document.querySelectorAll(".spa-tab");

const fileCache = {}; // caches raw text of fetched css/html/js files

async function loadText(path) {
  if (fileCache[path]) return fileCache[path];
  const res = await fetch(path);
  if (!res.ok) throw new Error("Failed to load " + path);
  const text = await res.text();
  fileCache[path] = text;
  return text;
}

/* Run a classic script's source code inside its OWN function scope.
   This lets every page keep top-level `const`/`let` declarations
   (exactly as in the original separate files) without clashing when
   the same script — or same variable name in a different page's
   script — runs again after navigating around the SPA. Globals that
   really are meant to be shared (firebase, db, auth from
   firebase-config.js) are still visible because Function() closures
   fall back to the real global scope for anything not declared
   locally. */
function runScript(code, path) {
  try {
    const fn = new Function(code);
    fn();
  } catch (err) {
    console.error("Error running " + path, err);
  }
}

let firebaseInitDone = false;
async function ensureFirebaseInit() {
  if (firebaseInitDone) return;
  const code = await loadText("js/firebase-config.js");
  runScript(code, "js/firebase-config.js");
  firebaseInitDone = true;
}

async function navigateTo(pageId, pushState = true) {
  const cfg = PAGES[pageId];
  if (!cfg) return;

  appContent.classList.add("spa-loading");

  // 1. CSS
  const css = await loadText(cfg.css);
  pageStyle.textContent = css;

  // 2. HTML fragment
  const html = await loadText(cfg.html);
  appContent.innerHTML = html;

  // 3. Firebase must be initialised once, before any page script runs
  await ensureFirebaseInit();

  // 4. Page-specific scripts, in original order
  for (const scriptPath of cfg.scripts) {
    const code = await loadText(scriptPath);
    runScript(code, scriptPath);
  }

  // 5. Housekeeping
  document.title = cfg.title;
  tabButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.page === pageId));
  appContent.classList.remove("spa-loading");
  window.scrollTo(0, 0);

  if (pushState) {
    history.pushState({ page: pageId }, "", "#/" + pageId);
  }
}

function currentPageFromHash() {
  const hash = location.hash.replace(/^#\/?/, "");
  return PAGES[hash] ? hash : "index";
}

window.addEventListener("popstate", () => {
  navigateTo(currentPageFromHash(), false);
});

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => navigateTo(btn.dataset.page));
});

/* Intercept clicks on any link that points to one of the original
   page files (e.g. <a href="cart.html">) so it navigates inside the
   SPA instead of doing a full page reload. */
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[href]");
  if (!a) return;
  const href = a.getAttribute("href");
  const match = href.match(/^([a-zA-Z0-9_-]+)\.html/);
  if (match && PAGES[match[1]]) {
    e.preventDefault();
    navigateTo(match[1]);
  }
});

// Boot
navigateTo(currentPageFromHash(), false);
