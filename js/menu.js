/**
 * menu.js
 * ---------------------------------------------------------------
 * ඕනෑම HTML file එකකට plug කරගත හැකි bottom navigation menu.
 * Style එක - video app එකේ pill-style floating bottom nav එකට සමානයි.
 * Menu options - "UK Online Shop" එකේ තිබූ පිළිවෙලටම:
 *   Home → Dashboard → My Orders → My Cart → Profile
 *
 * භාවිතය:
 *   <script src="menu.js"></script>
 *   ඕනෑම html file එකක </body> ට කලින් මේ line එක දාන්න. ඉතුරු ඔක්කොම
 *   මේ file එකෙන්ම handle වෙනවා (CSS + HTML දෙකම auto-inject වෙනවා).
 *
 * Customize කිරීම:
 *   - පහළ MENU_ITEMS array එකේ label/href/active අගයන් වෙනස් කරන්න.
 *   - active: true කරපු item එකට red highlight එක වැටෙනවා.
 *
 * Profile avatar:
 *   - Profile menu item එකේ image එක default එකට "DEFAULT_PROFILE_IMG" එක.
 *   - User කෙනෙක් login වෙලා, ඔහුගේ Firebase profile photo එකක් තියෙනවා නම්
 *     (auth user.photoURL හෝ Firestore "customer/{email}".photoURL), ඒක
 *     automatic ව මෙතන පේන්නවා.
 *   - Logout වුනාම / login වෙලා නැති නම් default image එකටම ආපහු යනවා.
 *   - No "flash of default image": localStorage cache එකෙන් instant paint.
 *
 * Cart & Orders notifications (NEW):
 *   - "My Cart" menu item එකට, user ගේ Firestore cart (carts/{uid}/items)
 *     එකේ item count එක red badge එකක් විදිහට පේන්නවා - cart එකට item
 *     එකක් add කරාම / qty එකක් වැඩි කරාම, ඒ ගමන්ම (any page එකක ඉඳන් වුනත්)
 *     badge එක update වෙනවා, ඒ එක්කම "🛒 Item added to cart" වගේ toast
 *     alert එකක් පේනවා.
 *   - "My Orders" menu item එකට: Admin (ADMIN_EMAIL) ට - අලුත් (pending
 *     නොවූ) orders ගණන badge එකක් විදිහට පේන්නවා, අලුත් order එකක් Firestore
 *     එකට add වුනාම "🛍️ New order received" toast එකක් පේනවා. සාමාන්‍ය
 *     customer කෙනෙක්ට - ඔහුගේම අලුත් order එකක් Firestore එකේ create වුනාම
 *     "✅ Your order has been placed" toast එකක් පේනවා (ඕනෑම page එකක
 *     ඉඳන් වුනත්, මොකද menu.js හැම page එකකම load වෙනවා).
 *   - Cart badge එකේ අන්තිම count එක localStorage cache කරලා තියෙනවා,
 *     Firebase resolve වෙනකන් බලන්නවත් කලින් badge එක instant ව පේන්නවා.
 * ---------------------------------------------------------------
 */
(function () {
  "use strict";

  // ---- -1) Current page name (URL එකේ ".html" එකක් තිබුනත් නැතත් - clean
  // URL hosting වලටත් වැඩ කරන විදියට normalize කරනවා) ----------------------
  function normalizePageName(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/\.html?$/i, "")
      .replace(/\/+$/, "");
  }
  var rawPathSegment = window.location.pathname.split("/").filter(Boolean).pop() || "";
  var currentFile = normalizePageName(rawPathSegment) || "index";

  // ---- 0) "2 වෙනි වතාවට Back කරාම Home එකට" logic ------------------------
  // 1 වෙනි Back press එක - browser එකෙන්ම සාමාන්‍යයෙන් කලින් page එකට
  // යනවා (default behaviour එකම තියෙනවා). 2 වෙනි Back press එක (කලින්
  // page load එකත් Back එකකින් ආවා නම්) - කෙලින්ම Home screen (index.html)
  // එකට redirect කරනවා, කොච්චර history ගැඹුරින් back ගියත්. මෙතන "return"
  // කරාම, redirect එකක් යනවා නම් ඉතුරු menu.js code එකවත් run වෙන්නේ නෑ.
  try {
    var BACK_STREAK_KEY = "uk_last_nav_was_back";
    var navEntries =
      window.performance && performance.getEntriesByType
        ? performance.getEntriesByType("navigation")
        : [];
    var navType = navEntries.length
      ? navEntries[0].type
      : window.performance && performance.navigation
      ? performance.navigation.type === 2
        ? "back_forward"
        : "navigate"
      : "navigate";
    var isBackNav = navType === "back_forward";
    var lastWasBack = sessionStorage.getItem(BACK_STREAK_KEY) === "1";

    if (isBackNav) {
      if (lastWasBack && currentFile !== "index") {
        // දෙවෙනි (හෝ ඊට වඩා) පෙල පිලිවෙලින් Back press - Home එකට යනවා
        sessionStorage.setItem(BACK_STREAK_KEY, "0");
        window.location.replace("index.html");
        return;
      }
      sessionStorage.setItem(BACK_STREAK_KEY, "1");
    } else {
      // සාමාන්‍ය menu click / fresh navigation එකක් - back-streak එක reset කරනවා
      sessionStorage.setItem(BACK_STREAK_KEY, "0");
    }
  } catch (e) {
    /* sessionStorage/performance API නැති අවස්ථා - කිසිම දෙයක් නොකර ඉඳිනවා */
  }

  // ---- 0z) Default profile avatar (login වෙලා නැති / logout වුනු අයට) ---
  var DEFAULT_PROFILE_IMG = "https://files.catbox.moe/7ym8gi.jpg";

  // ---- 0a) Admin email (orders.html එකේ තියෙන ADMIN_EMAIL එකටම match) --
  var ADMIN_EMAIL = "kavishkairoshan54@gmail.com";

  // ---- 0b) Guest cart local-storage key (cart.html එකේ CART_KEY එකටම) --
  var CART_STORAGE_KEY = "ukshop_cart_v1";

  // ---- 0c) Avatar cache (default image flash එක වළක්වන්න) --------------
  var AVATAR_CACHE_KEY = "uk_profile_avatar_cache";

  function getCachedAvatar() {
    try {
      var v = localStorage.getItem(AVATAR_CACHE_KEY);
      return v || null;
    } catch (e) {
      return null;
    }
  }

  function cacheAvatar(url) {
    try {
      if (url && url !== DEFAULT_PROFILE_IMG) {
        localStorage.setItem(AVATAR_CACHE_KEY, url);
      } else {
        localStorage.removeItem(AVATAR_CACHE_KEY);
      }
    } catch (e) {
      /* ignore (private mode / storage disabled) */
    }
  }

  // ---- 0d) Badge cache (Cart/Orders badge flash එක වළක්වන්න) -----------
  var BADGE_CACHE_PREFIX = "uk_menu_badge_";

  function getCachedBadge(label) {
    try {
      var v = localStorage.getItem(BADGE_CACHE_PREFIX + label);
      return v ? parseInt(v, 10) || 0 : 0;
    } catch (e) {
      return 0;
    }
  }

  function cacheBadgeCount(label, count) {
    try {
      if (count > 0) {
        localStorage.setItem(BADGE_CACHE_PREFIX + label, String(count));
      } else {
        localStorage.removeItem(BADGE_CACHE_PREFIX + label);
      }
    } catch (e) {
      /* ignore */
    }
  }

  // ---- 1) Menu items (UK Online Shop menu order එකටම) -----------------
  var MENU_ITEMS = [
    {
      label: "Home",
      href: "index.html",
      active: true,
      icon:
        '<path d="M4 11.5 12 4l8 7.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M6 10.5V20a1 1 0 0 0 1 1h4v-5.5h2V21h4a1 1 0 0 0 1-1v-9.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    },
    {
      label: "Dashboard",
      href: "dashboard.html",
      active: false,
      icon:
        '<path d="M4 19V13" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M10 19V9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M16 19V5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M3 19h18" stroke-width="2" stroke-linecap="round"/>' +
        '<path d="M4 14 9 9l3 3 6-6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    },
    {
      label: "My Orders",
      href: "orders.html",
      active: false,
      icon:
        '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" stroke-width="2" stroke-linejoin="round"/>' +
        '<path d="M8.5 8h7M8.5 11.5h7M8.5 15h4" stroke-width="1.6" stroke-linecap="round"/>'
    },
    {
      label: "My Cart",
      href: "cart.html",
      active: false,
      icon:
        '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>' +
        '<path d="M2.5 3h2.4l2.1 11.6a1.8 1.8 0 0 0 1.8 1.5h8.6a1.8 1.8 0 0 0 1.77-1.47L21 7.5H6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    },
    {
      label: "Profile",
      href: "profile.html",
      active: false,
      image: DEFAULT_PROFILE_IMG,
      icon:
        '<circle cx="12" cy="8" r="3.6" stroke-width="2"/>' +
        '<path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    }
  ];

  // ---- 2) Styles (pill-shaped floating nav, video-app ආකාරයට) ---------
  var STYLE_ID = "app-bottom-menu-styles";
  if (!document.getElementById(STYLE_ID)) {
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      ".app-bottom-menu{" +
      "position:fixed;left:0;right:0;bottom:0;" +
      "display:flex;justify-content:center;" +
      "padding:6px 10px 6px;" +
      "z-index:9999;pointer-events:none;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;" +
      "}" +
      ".app-bottom-menu__bar{" +
      "pointer-events:auto;" +
      "display:flex;align-items:stretch;justify-content:space-between;" +
      "width:100%;max-width:520px;" +
      "background:#ffffff;" +
      "border-radius:26px;" +
      "box-shadow:0 6px 24px rgba(0,0,0,0.14), 0 1px 2px rgba(0,0,0,0.06);" +
      "padding:6px;" +
      "}" +
      ".app-bottom-menu__item{" +
      "flex:1 1 0;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "gap:3px;padding:8px 4px 7px;" +
      "border-radius:20px;" +
      "background:transparent;border:none;cursor:pointer;" +
      "color:#8a8f98;text-decoration:none;" +
      "transition:color .15s ease, background-color .15s ease, transform .1s ease;" +
      "-webkit-tap-highlight-color:transparent;" +
      "}" +
      ".app-bottom-menu__icon-wrap{position:relative;display:inline-flex;align-items:center;justify-content:center;}" +
      ".app-bottom-menu__item svg{width:28px;height:28px;fill:none;stroke:currentColor;display:block;}" +
      ".app-bottom-menu__avatar{width:28px;height:28px;border-radius:50%;object-fit:cover;display:block;border:1.5px solid transparent;transition:border-color .15s ease;}" +
      ".app-bottom-menu__item.is-active .app-bottom-menu__avatar{border-color:#e5233d;}" +
      ".app-bottom-menu__badge{" +
      "position:absolute;top:-4px;right:-9px;min-width:16px;height:16px;padding:0 4px;" +
      "border-radius:999px;background:#e5233d;color:#fff;font-size:10px;font-weight:800;" +
      "line-height:1;display:none;align-items:center;justify-content:center;" +
      "box-shadow:0 0 0 2px #fff;" +
      "}" +
      ".app-bottom-menu__item span:not(.app-bottom-menu__badge){font-size:11px;font-weight:600;letter-spacing:.2px;white-space:nowrap;}" +
      ".app-bottom-menu__item:active{transform:scale(0.94);}" +
      ".app-bottom-menu__item.is-active{color:#e5233d;background:#fdeaec;}" +
      "@media (min-width:600px){.app-bottom-menu__bar{max-width:460px;}}" +
      "@media (min-width:900px){.app-bottom-menu{padding:8px 18px 10px;}.app-bottom-menu__bar{max-width:100%;}}" +
      ".app-bottom-menu{transition:transform .25s ease, opacity .25s ease;}" +
      ".app-bottom-menu.is-hidden{transform:translateY(140%);opacity:0;pointer-events:none;}" +
      ".app-scroll-top-btn{" +
      "position:fixed;right:16px;" +
      "bottom:calc(18px + env(safe-area-inset-bottom));" +
      "width:48px;height:48px;border-radius:50%;" +
      "background:#4f6ef7;color:#fff;border:none;" +
      "display:flex;align-items:center;justify-content:center;" +
      "box-shadow:0 6px 18px rgba(79,110,247,0.45);" +
      "cursor:pointer;z-index:9998;" +
      "opacity:0;transform:translateY(20px) scale(.85);pointer-events:none;" +
      "transition:opacity .2s ease, transform .2s ease;" +
      "}" +
      ".app-scroll-top-btn.is-visible{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}" +
      ".app-scroll-top-btn svg{width:22px;height:22px;fill:none;stroke:#fff;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;}" +
      ".app-scroll-top-btn:active{transform:scale(.92);}" +
      // Global toast notifications (Cart / Orders alerts)
      ".app-menu-toast-wrap{" +
      "position:fixed;top:calc(14px + env(safe-area-inset-top));left:50%;" +
      "transform:translateX(-50%);z-index:10000;width:100%;max-width:420px;" +
      "padding:0 16px;display:flex;flex-direction:column;gap:8px;align-items:stretch;" +
      "pointer-events:none;" +
      "}" +
      ".app-menu-toast{" +
      "pointer-events:auto;background:#232336;color:#fff;padding:12px 18px;border-radius:14px;" +
      "font-size:13.5px;font-weight:600;box-shadow:0 10px 26px rgba(0,0,0,0.25);" +
      "display:flex;align-items:center;gap:10px;" +
      "opacity:0;transform:translateY(-16px) scale(.98);" +
      "transition:opacity .25s ease, transform .25s ease;" +
      "font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;" +
      "}" +
      ".app-menu-toast.show{opacity:1;transform:translateY(0) scale(1);}" +
      ".app-menu-toast__icon{font-size:16px;flex-shrink:0;}";
    document.head.appendChild(style);
  }

  // ---- 3) Build markup ---------------------------------------------------
  // currentFile / normalizePageName දැනටමත් file එකේ මුලින්ම compute
  // කරලා තියෙනවා (Back-navigation logic එකටත් අවශ්‍ය නිසා). Menu item
  // එකේ active class එකට සහ list.html hide කිරීමටත් ඒවම භාවිතා කරමු.

  // list.html එකේදී විතරක් - පහළ menu bar එක පේන්නේ නෑ, උඩට scroll කරන
  // ඊතලය (scroll-to-top button) එක විතරයි පේන්නේ.
  var HIDDEN_MENU_PAGES = ["list"];
  var hideMenuBar = HIDDEN_MENU_PAGES.indexOf(currentFile) !== -1;

  var wrapper = document.createElement("nav");
  wrapper.className = "app-bottom-menu";
  wrapper.setAttribute("aria-label", "Main menu");

  var bar = document.createElement("div");
  bar.className = "app-bottom-menu__bar";
  wrapper.appendChild(bar);

  MENU_ITEMS.forEach(function (item) {
    var isCurrent = currentFile === normalizePageName(item.href);
    var el = document.createElement("a");
    el.href = item.href;
    el.className = "app-bottom-menu__item" + (isCurrent ? " is-active" : "");
    el.setAttribute("data-menu-label", item.label);

    // Profile item එකට: default image එක flash වෙන එක වළක්වන්න,
    // localStorage cache වුනු අන්තිම photo URL එකම initial src කරගන්නවා.
    var initialImgSrc =
      item.label === "Profile" ? getCachedAvatar() || item.image : item.image;

    // Cart/Orders badge එකට: cache වුනු අන්තිම count එකම instant ව
    // පෙන්නලා, පස්සේ Firestore listener එකෙන් confirm/update කරනවා.
    var initialBadgeCount = getCachedBadge(item.label);
    var badgeDisplay = initialBadgeCount > 0 ? "flex" : "none";
    var badgeText = initialBadgeCount > 99 ? "99+" : String(initialBadgeCount);

    var iconMarkup = item.image
      ? '<img class="app-bottom-menu__avatar" src="' +
        initialImgSrc +
        '" alt="' +
        item.label +
        '" onerror="this.onerror=null;this.src=\'' +
        DEFAULT_PROFILE_IMG +
        '\';" />'
      : '<svg viewBox="0 0 24 24">' + item.icon + "</svg>";

    el.innerHTML =
      '<span class="app-bottom-menu__icon-wrap">' +
      iconMarkup +
      '<span class="app-bottom-menu__badge" data-badge-for="' +
      item.label +
      '" style="display:' +
      badgeDisplay +
      ';">' +
      badgeText +
      "</span>" +
      "</span>" +
      "<span>" + item.label + "</span>";

    el.addEventListener("click", function (e) {
      if (isCurrent) {
        // දැනටමත් ඉන්න page එකේම menu option එකම ටච් කරාම:
        // 1 වෙනි ටච් එකෙන් කිසිම දෙයක් වෙන්නේ නෑ (default navigation එකත්
        // stop කරනවා, මොකද එකම page එක වෙනුවෙන් full reload එකක් ඕනේ නෑ).
        // 2 වෙනි ටච් එකෙන් (හෝ ඊට වඩා) page එක reload වෙනවා.
        e.preventDefault();
        el._tapCount = (el._tapCount || 0) + 1;
        if (el._tapCount >= 2) {
          window.location.reload();
        }
      }
      // Custom event එකක් fire කරනවා - වෙන js code එකකින් අවශ්‍ය නම් listen කරගන්න පුලුවන්.
      // වෙනස් page එකකට යන navigation එක browser එකෙන්ම සිද්ධ වෙනවා.
      wrapper.dispatchEvent(
        new CustomEvent("menu:navigate", { detail: { label: item.label, href: item.href } })
      );
    });

    bar.appendChild(el);
  });

  // ---- 3a) Global toast notification helper (Cart / Orders alerts) -----
  var toastWrapEl = null;
  function ensureToastWrap() {
    if (toastWrapEl) return toastWrapEl;
    toastWrapEl = document.createElement("div");
    toastWrapEl.className = "app-menu-toast-wrap";
    document.body.appendChild(toastWrapEl);
    return toastWrapEl;
  }

  function showMenuToast(message, icon) {
    var wrap = ensureToastWrap();
    var t = document.createElement("div");
    t.className = "app-menu-toast";
    t.innerHTML =
      (icon ? '<span class="app-menu-toast__icon">' + icon + "</span>" : "") +
      "<span>" + message + "</span>";
    wrap.appendChild(t);
    requestAnimationFrame(function () {
      t.classList.add("show");
    });
    setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () {
        if (t.parentNode) t.parentNode.removeChild(t);
      }, 300);
    }, 3400);
  }

  // ---- 3b) Badge helper (Cart / Orders count) ----------------------------
  function setMenuBadge(label, count) {
    var badgeEl = bar.querySelector('.app-bottom-menu__badge[data-badge-for="' + label + '"]');
    count = count || 0;
    if (badgeEl) {
      if (count > 0) {
        badgeEl.textContent = count > 99 ? "99+" : String(count);
        badgeEl.style.display = "flex";
      } else {
        badgeEl.style.display = "none";
      }
    }
    cacheBadgeCount(label, count);
  }

  // Other scripts (product pages, etc.) ට manual ව badge/toast trigger
  // කරන්න ඕනේ නම් භාවිතා කරන්න පුලුවන් public API එකක්.
  window.AppMenu = window.AppMenu || {};
  window.AppMenu.setBadge = setMenuBadge;
  window.AppMenu.showToast = showMenuToast;

  // ---- 3c) "My Cart" badge + "item added" toast (Firestore, live) -------
  var cartUnsub = null;
  var lastCartQty = null;

  function readGuestCartQty() {
    try {
      var raw = localStorage.getItem(CART_STORAGE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return 0;
      var total = 0;
      arr.forEach(function (line) {
        total += parseInt(line.qty, 10) || 1;
      });
      return total;
    } catch (e) {
      return 0;
    }
  }

  // Login වෙලා නැති (guest) අයට - localStorage cart එකේ qty එක බලලා badge/
  // toast පෙන්නනවා. login වුනාම Firestore listener එකට switch වෙනවා.
  function watchGuestCartBadge() {
    var qty = readGuestCartQty();
    if (lastCartQty !== null && qty > lastCartQty) {
      showMenuToast("Item added to cart! (" + qty + ")", "🛒");
    }
    lastCartQty = qty;
    setMenuBadge("My Cart", qty);
  }

  function watchCartBadge(uid) {
    if (cartUnsub) {
      cartUnsub();
      cartUnsub = null;
    }
    if (!uid) {
      watchGuestCartBadge();
      return;
    }
    try {
      if (!(window.firebase && window.firebase.firestore)) return;
      cartUnsub = window.firebase
        .firestore()
        .collection("carts")
        .doc(uid)
        .collection("items")
        .onSnapshot(
          function (snapshot) {
            var totalQty = 0;
            snapshot.forEach(function (doc) {
              var d = doc.data();
              totalQty += parseInt(d.qty, 10) || 1;
            });
            if (lastCartQty !== null && totalQty > lastCartQty) {
              showMenuToast("Item added to cart! (" + totalQty + ")", "🛒");
            }
            lastCartQty = totalQty;
            setMenuBadge("My Cart", totalQty);
          },
          function (err) {
            console.warn("menu.js: cart badge listener error:", err);
          }
        );
    } catch (e) {
      console.warn("menu.js: cart badge error:", e);
    }
  }

  // Guest cart එක localStorage වල update වෙන අවස්ථා (add to cart button
  // click කරන පිටු වලින්) ඒ ගමන්ම (same tab) catch කරගන්න localStorage
  // setItem/removeItem පොඩ්ඩක් "patch" කරනවා. Cross-tab updates
  // "storage" event එකෙන් catch වෙනවා.
  (function patchLocalStorageForGuestCart() {
    try {
      var origSetItem = localStorage.setItem.bind(localStorage);
      localStorage.setItem = function (key, value) {
        origSetItem(key, value);
        if (key === CART_STORAGE_KEY) watchGuestCartBadge();
      };
      var origRemoveItem = localStorage.removeItem.bind(localStorage);
      localStorage.removeItem = function (key) {
        origRemoveItem(key);
        if (key === CART_STORAGE_KEY) watchGuestCartBadge();
      };
    } catch (e) {
      /* ignore (private mode / storage disabled) */
    }
  })();
  window.addEventListener("storage", function (e) {
    if (e.key === CART_STORAGE_KEY) watchGuestCartBadge();
  });

  // ---- 3d) "My Orders" badge (admin) + "new order" toast (admin+user) --
  var ordersUnsub = null;
  var ordersInitialLoad = true;

  function watchOrdersBadge(user) {
    if (ordersUnsub) {
      ordersUnsub();
      ordersUnsub = null;
    }
    ordersInitialLoad = true;
    if (!user || !(window.firebase && window.firebase.firestore)) {
      setMenuBadge("My Orders", 0);
      return;
    }
    try {
      var db = window.firebase.firestore();
      var isAdmin = user.email === ADMIN_EMAIL;
      var query = isAdmin
        ? db.collection("orders")
        : db.collection("orders").where("userId", "==", user.uid);

      ordersUnsub = query.onSnapshot(
        function (snapshot) {
          if (isAdmin) {
            // Admin ට "New" (pending නොවූ) orders ගණන badge එකක් විදිහට.
            var newCount = 0;
            snapshot.forEach(function (doc) {
              if (!doc.data().pending) newCount++;
            });
            setMenuBadge("My Orders", newCount);
          }

          // පළවෙනි snapshot එකේදී (page එක load වෙනකොට තියෙන existing
          // orders) toast පෙන්නන්නේ නෑ - අලුතෙන් add වෙන orders වලට විතරයි.
          if (!ordersInitialLoad) {
            snapshot.docChanges().forEach(function (change) {
              if (change.type === "added") {
                var d = change.doc.data();
                if (isAdmin) {
                  var custName =
                    d.customer && d.customer.name ? d.customer.name : "රසිකයෙකුගෙන්";
                  showMenuToast("අලුත් ඇණවුමක් ලැබුණා — " + custName, "🛍️");
                } else {
                  showMenuToast("ඔබගේ ඇණවුම සාර්ථකව ලැබුණි!", "✅");
                }
              }
            });
          }
          ordersInitialLoad = false;
        },
        function (err) {
          console.warn("menu.js: orders badge listener error:", err);
        }
      );
    } catch (e) {
      console.warn("menu.js: orders badge error:", e);
    }
  }

  // ---- 3e) Profile avatar sync ------------------------------------------
  // Login වී සිටින user ගේ Firebase photo එක (auth.photoURL හෝ Firestore
  // "customer/{email}".photoURL) මෙතන Profile menu item එකේ පේන්නවා.
  // Login වී නැති / logout වූ අවස්ථාවලදී DEFAULT_PROFILE_IMG එකටම ආපහු යනවා.
  function getProfileAvatarImg() {
    var item = bar.querySelector('.app-bottom-menu__item[data-menu-label="Profile"]');
    return item ? item.querySelector(".app-bottom-menu__avatar") : null;
  }

  function setProfileAvatar(url) {
    var img = getProfileAvatarImg();
    if (img) img.src = url || DEFAULT_PROFILE_IMG;
    cacheAvatar(url);
  }

  function applyUserAvatar(user) {
    if (!user) {
      setProfileAvatar(DEFAULT_PROFILE_IMG);
      return;
    }
    if (user.photoURL) {
      setProfileAvatar(user.photoURL);
    }
    try {
      if (user.email && window.firebase && window.firebase.firestore) {
        window.firebase
          .firestore()
          .collection("customer")
          .doc(user.email)
          .get()
          .then(function (doc) {
            if (doc.exists && doc.data() && doc.data().photoURL) {
              setProfileAvatar(doc.data().photoURL);
            } else if (!user.photoURL) {
              setProfileAvatar(DEFAULT_PROFILE_IMG);
            }
          })
          .catch(function (e) {
            console.warn("menu.js: Firestore photoURL read failed:", e);
          });
      }
    } catch (e) {
      console.warn("menu.js: avatar sync error:", e);
    }
  }

  function watchAuthForAvatar() {
    var attached = false;
    function attach() {
      try {
        if (window.firebase && window.firebase.auth) {
          window.firebase.auth().onAuthStateChanged(function (user) {
            applyUserAvatar(user);
            watchCartBadge(user ? user.uid : null);
            watchOrdersBadge(user);
          });
          attached = true;
        }
      } catch (e) {
        attached = false;
      }
      return attached;
    }
    if (attach()) return;
    // firebase.js / firebase-config.js තව load වී නැති අවස්ථාවක් සඳහා,
    // ලැම්බ වුනත් කුඩා delay එකකින් නැවත try කරමු.
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (attach() || tries > 40) clearInterval(iv); // ~6 seconds max
    }, 150);
  }

  // password.js login සාර්ථක වූ විට dispatch කරන custom event එකෙනුත්
  // ක්ෂණිකව avatar/cart/orders update කරමු (logout එකට password.js event
  // එකක් dispatch නොකරන නිසා, ඒක firebase.auth().onAuthStateChanged
  // එකෙන්ම watchAuthForAvatar() එකෙන් handle වෙනවා).
  document.addEventListener("adminAuthSuccess", function (e) {
    if (e.detail && e.detail.user) {
      applyUserAvatar(e.detail.user);
      watchCartBadge(e.detail.user.uid);
      watchOrdersBadge(e.detail.user);
    }
  });

  // ---- 4) Scroll-to-top button (menu එක disappear වෙනකොට වෙනුවට පෙන්වන ඊතලය) --
  var scrollTopBtn = document.createElement("button");
  scrollTopBtn.type = "button";
  scrollTopBtn.className = "app-scroll-top-btn";
  scrollTopBtn.setAttribute("aria-label", "Scroll to top");
  scrollTopBtn.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
  scrollTopBtn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // ---- 5) Scroll direction අනුව menu එක hide/show කරලා, ඊතලය show/hide කරන logic --
  var SCROLL_DELTA_MIN = 6; // ජිටර් (jitter) නොවෙන්න පොඩි threshold එකක්
  var TOP_EDGE = 10; // පිටුවේ මුදුනටම ළඟ නම් සැමවිටම menu එක පෙන්නනවා
  var lastScrollY = window.scrollY || window.pageYOffset || 0;
  var ticking = false;

  function updateOnScroll() {
    var currentY = window.scrollY || window.pageYOffset || 0;
    var delta = currentY - lastScrollY;

    if (currentY <= TOP_EDGE) {
      wrapper.classList.remove("is-hidden");
      scrollTopBtn.classList.remove("is-visible");
    } else if (delta > SCROLL_DELTA_MIN) {
      wrapper.classList.add("is-hidden");
      scrollTopBtn.classList.add("is-visible");
    } else if (delta < -SCROLL_DELTA_MIN) {
      wrapper.classList.remove("is-hidden");
      scrollTopBtn.classList.remove("is-visible");
    }

    lastScrollY = currentY;
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        window.requestAnimationFrame(updateOnScroll);
        ticking = true;
      }
    },
    { passive: true }
  );

  // ---- 6) Inject into page (DOM ready වුනාට පස්සේ) ----------------------
  function mount() {
    if (!hideMenuBar) {
      document.body.appendChild(wrapper);
      var existingPadding = parseInt(window.getComputedStyle(document.body).paddingBottom, 10) || 0;
      if (existingPadding < 66) {
        document.body.style.paddingBottom = "66px";
      }
    }
    document.body.appendChild(scrollTopBtn);
    updateOnScroll();

    // Firebase resolve වෙනකන් බලන්නවත් කලින්, cached/guest cart count එකෙන්
    // badge එක instant ව පෙන්නනවා (flash of "0" එකක් නැති කරන්න).
    lastCartQty = getCachedBadge("My Cart");
    watchGuestCartBadge();

    watchAuthForAvatar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
