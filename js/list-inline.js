if (typeof db === 'undefined') {
var db = firebase.firestore();
}
// list.html runs in its own separate page load from index.html/script.js,
// so we can't touch that page's in-memory "pin to top" variable directly.
// Instead we drop a small marker into localStorage (same key/shape script.js
// reads on load) whenever a product's catalog entry is updated here, so
// index.html pins that item to the top of the list the next time it loads.
var RECENTLY_CHANGED_ITEM_KEY = 'ukshop_recently_changed_item_v1';
function markItemRecentlyChangedForHome(itemId, itemData) {
  if (!itemId) return;
  try {
    var payload = { id: itemId, ts: Date.now() };
    if (itemData && typeof itemData === 'object') {
      payload.item = Object.assign({}, itemData, { id: itemId });
    }
    localStorage.setItem(RECENTLY_CHANGED_ITEM_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('Could not save recently changed item marker:', e);
  }
}


(function(){
  "use strict";

  var gateLoading = document.getElementById("adminGateLoading");
  var gateDenied = document.getElementById("adminGateDenied");
  var gateDeniedMsg = document.getElementById("adminGateDeniedMsg");
  var appContent = document.getElementById("appContent");

  function revealApp(){
    if (gateLoading) gateLoading.style.display = "none";
    if (gateDenied) gateDenied.style.display = "none";
    if (appContent) appContent.style.display = "block";
  }

  function denyAccess(msg){
    if (gateLoading) gateLoading.style.display = "none";
    if (appContent) appContent.style.display = "none";
    if (gateDenied){
      gateDenied.style.display = "flex";
      if (gateDeniedMsg) gateDeniedMsg.textContent = msg || "This page is only accessible to admin accounts.";
    }
    try { firebase.auth().signOut(); } catch (e) { /* ignore */ }
    setTimeout(function(){ location.reload(); }, 2200);
  }

  var ADMIN_EMAIL = "kavishkairoshan54@gmail.com";

  function checkAdmin(user){
    if (!user){
      if (gateLoading) gateLoading.style.display = "none";
      return;
    }
    if (user.isAnonymous){
      denyAccess("Anonymous browsing isn't allowed here — please log in with an admin account.");
      return;
    }
    if (user.email === ADMIN_EMAIL){
      revealApp();
    } else {
      denyAccess("The account " + (user.email || user.uid) + " does not have admin access.");
    }
  }

  window.onAdminAuthSuccess = function(user, method){
    checkAdmin(user);
  };
})();



(function(){
  "use strict";

  // ---------------------------------------------------------------------
  // Shared body-scroll lock for modals. Locking with position:fixed (rather
  // than just overflow:hidden) stops the well-known mobile-browser bug
  // where focusing a text input inside a fixed-position modal makes the
  // browser scroll the underlying document to "reveal" the input — since
  // the modal is fixed to the viewport, that document scroll visually drags
  // the whole modal (header included) up and off the top of the screen
  // while the on-screen keyboard is open.
  // ---------------------------------------------------------------------
  var scrollLockCount = 0;
  var savedScrollY = 0;

  function lockBodyScroll(){
    if (scrollLockCount === 0){
      savedScrollY = window.scrollY || window.pageYOffset || 0;
      document.body.style.position = "fixed";
      document.body.style.top = (-savedScrollY) + "px";
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
    }
    scrollLockCount++;
  }

  function unlockBodyScroll(){
    if (scrollLockCount === 0) return;
    scrollLockCount--;
    if (scrollLockCount === 0){
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, savedScrollY);
    }
  }

  window.__lockBodyScroll = lockBodyScroll;
  window.__unlockBodyScroll = unlockBodyScroll;
})();



(function(){
  "use strict";

  var listArea = document.getElementById("listArea");
  var loadingBox = document.getElementById("loadingBox");
  var errorBox = document.getElementById("errorBox");
  var pageSub = document.getElementById("pageSub");
  var statTotalOrders = document.getElementById("statTotalOrders");
  var statTotalQty = document.getElementById("statTotalQty");
  var statTotalRevenue = document.getElementById("statTotalRevenue");
  var statTotalProfit = document.getElementById("statTotalProfit");
  var statOrdersLabel = document.getElementById("statOrdersLabel");
  var statRevenueLabel = document.getElementById("statRevenueLabel");
  var statProfitLabel = document.getElementById("statProfitLabel");
  var searchInput = document.getElementById("searchInput");
  var searchBtn = document.getElementById("searchBtn");
  var periodSelectBtn = document.getElementById("periodSelectBtn");
  var periodSelectBtnLabel = document.getElementById("periodSelectBtnLabel");
  var periodPickerOverlay = document.getElementById("periodPickerOverlay");
  var periodPickerClose = document.getElementById("periodPickerClose");
  var calGranTabs = document.getElementById("calGranTabs");
  var calPrevBtn = document.getElementById("calPrevBtn");
  var calNextBtn = document.getElementById("calNextBtn");
  var calNavLabel = document.getElementById("calNavLabel");
  var calBody = document.getElementById("calBody");
  var calClearBtn = document.getElementById("calClearBtn");
  var calApplyBtn = document.getElementById("calApplyBtn");
  var toastEl = document.getElementById("toast");
  var selectionToolbar = document.getElementById("selectionToolbar");
  var selectionDoneBtn = document.getElementById("selectionDoneBtn");
  var selectionCountEl = document.getElementById("selectionCount");

  var OrderAdmin = { openEdit: null, confirmDelete: null };

  var allOrders = [];
  var currentSearch = "";
  var currentView = "all"; // "all" | "profit"
  var viewTabs = document.getElementById("viewTabs");
  var currentPeriod = { granularity: null, refDate: null };
  var unsubscribe = null;
  var searchTimer = null;

  function toDate(val){
    if (!val) return null;
    try {
      if (typeof val.toDate === "function") return val.toDate();
      if (typeof val.seconds === "number") return new Date(val.seconds * 1000);
      if (typeof val === "number") return new Date(val);
      if (typeof val === "string") {
        var d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  function getOrderDate(o){
    return toDate(o.createdAt);
  }

  function getReviewedDate(o){
    return toDate(o.reviewedAt);
  }

  function getCustomerName(o){
    return (o.customer && o.customer.name) || "Unknown Customer";
  }

  function getPhone(o){
    return (o.customer && o.customer.phone) || "";
  }

  function getAddress(o){
    return (o.customer && o.customer.address) || "";
  }

  function getNote(o){
    return (o.customer && o.customer.note) || "";
  }

  function getStatus(o){
    return String(o.status || "Pending").toLowerCase().trim();
  }

  function getProduct(o){
    var it = o.item || {};
    var rawQty = it.quantity;
    if (rawQty == null) rawQty = it.qty;
    if (rawQty == null) rawQty = o.quantity;
    if (rawQty == null) rawQty = o.qty;
    var qty = parseInt(rawQty, 10);
    var rawProfit = it.profit;
    if (rawProfit == null) rawProfit = it.profitPerUnit;
    if (rawProfit == null) rawProfit = o.profit;
    var profit = typeof rawProfit === "number" ? rawProfit : parseFloat(rawProfit);
    return {
      id: it.id || "",
      name: it.name || "Item",
      category: it.category || "",
      categories: Array.isArray(it.categories) ? it.categories : (it.category ? [it.category] : []),
      price: it.price,
      profit: isNaN(profit) ? null : profit,
      description: it.description || "",
      image: it.image || "",
      quantity: (!isNaN(qty) && qty > 0) ? qty : 1
    };
  }

  function getProductPrice(product){
    var n = typeof product.price === "number" ? product.price : parseFloat(product.price);
    return isNaN(n) ? 0 : n;
  }

  function getProductProfit(product){
    var n = typeof product.profit === "number" ? product.profit : parseFloat(product.profit);
    return isNaN(n) ? 0 : n;
  }

  function getTotal(o, product){
    var stored = typeof o.totalPrice === "number" ? o.totalPrice : parseFloat(o.totalPrice);
    if (!isNaN(stored) && stored > 0) return stored;
    return getProductPrice(product) * (product.quantity || 1);
  }

  function getProfit(product){
    var qty = product.quantity || 1;
    return getProductProfit(product) * qty;
  }

  function formatCurrency(n){
    return "LKR " + n.toLocaleString("en-LK", {minimumFractionDigits:2, maximumFractionDigits:2});
  }

  function formatDate(d){
    if (!d) return "Unknown date";
    return d.toLocaleDateString("en-GB", {day:"2-digit", month:"short", year:"numeric"}) +
      " · " + d.toLocaleTimeString("en-GB", {hour:"2-digit", minute:"2-digit"});
  }

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, function(c){
      return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c];
    });
  }

  function normalizeStatus(s){
    if (["completed","delivered","done","fulfilled"].indexOf(s) !== -1) return "completed";
    if (["processing","confirmed","shipped","in progress"].indexOf(s) !== -1) return "processing";
    if (["cancelled","canceled","rejected"].indexOf(s) !== -1) return "cancelled";
    return "pending";
  }

  function startOfDay(d){ var x = new Date(d); x.setHours(0,0,0,0); return x; }
  function addDays(d, n){ var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function startOfWeek(d){
    var x = startOfDay(d);
    var day = x.getDay();
    var diff = (day === 0 ? -6 : 1 - day);
    return addDays(x, diff);
  }
  function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
  function startOfYear(d){ return new Date(d.getFullYear(), 0, 1); }

  function getPeriodRange(gran, refDate){
    if (gran === "day"){
      var s = startOfDay(refDate);
      return { start: s, end: addDays(s, 1) };
    }
    if (gran === "week"){
      var sw = startOfWeek(refDate);
      return { start: sw, end: addDays(sw, 7) };
    }
    if (gran === "month"){
      var sm = startOfMonth(refDate);
      return { start: sm, end: new Date(sm.getFullYear(), sm.getMonth() + 1, 1) };
    }
    if (gran === "year"){
      var sy = startOfYear(refDate);
      return { start: sy, end: new Date(sy.getFullYear() + 1, 0, 1) };
    }
    return null;
  }

  function formatPeriodLabel(gran, refDate){
    if (gran === "day"){
      return refDate.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
    }
    if (gran === "week"){
      var range = getPeriodRange("week", refDate);
      var endInclusive = addDays(range.end, -1);
      var startStr = range.start.toLocaleDateString("en-GB", { day:"2-digit", month:"short" });
      var endStr = endInclusive.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
      return startStr + " – " + endStr;
    }
    if (gran === "month"){
      return refDate.toLocaleDateString("en-GB", { month:"long", year:"numeric" });
    }
    if (gran === "year"){
      return String(refDate.getFullYear());
    }
    return "";
  }

  function matchesPeriod(order){
    if (!currentPeriod.granularity) return true;
    if (!order._date) return false;
    var range = getPeriodRange(currentPeriod.granularity, currentPeriod.refDate);
    var t = order._date.getTime();
    return t >= range.start.getTime() && t < range.end.getTime();
  }

  function todayShortLabel(){
    return new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"short" });
  }

  function renderPeriodPanel(){
    if (!currentPeriod.granularity){
      periodSelectBtn.classList.remove("active");
      if (periodSelectBtnLabel) periodSelectBtnLabel.textContent = todayShortLabel();
      return;
    }
    periodSelectBtn.classList.add("active");
    if (periodSelectBtnLabel){
      periodSelectBtnLabel.textContent = formatPeriodLabel(currentPeriod.granularity, currentPeriod.refDate);
    }
  }

  var MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var WEEKDAY_NAMES_SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  var calState = { granularity: "day", viewDate: new Date(), selectedDate: new Date() };

  function sameDay(a, b){
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function renderCalGranTabs(){
    calGranTabs.querySelectorAll("button").forEach(function(b){
      b.classList.toggle("active", b.getAttribute("data-gran") === calState.granularity);
    });
  }

  function renderDayGrid(){
    var view = calState.viewDate;
    calNavLabel.textContent = MONTH_NAMES[view.getMonth()] + " " + view.getFullYear();

    var monthStart = new Date(view.getFullYear(), view.getMonth(), 1);
    var monthEnd = new Date(view.getFullYear(), view.getMonth() + 1, 0);
    var gridStart = startOfWeek(monthStart);
    var gridEnd = addDays(startOfWeek(monthEnd), 6);

    var today = new Date();
    var selWeekStart = (calState.granularity === "week") ? startOfWeek(calState.selectedDate).getTime() : null;

    var html = '<div class="cal-weekdays">' + WEEKDAY_NAMES_SHORT.map(function(w){ return "<span>" + w + "</span>"; }).join("") + '</div>';
    html += '<div class="cal-days">';
    var cursor = new Date(gridStart);
    while (cursor.getTime() <= gridEnd.getTime()){
      var classes = ["cal-day"];
      if (cursor.getMonth() !== view.getMonth()) classes.push("outside");
      if (sameDay(cursor, today)) classes.push("today");

      if (calState.granularity === "day"){
        if (sameDay(cursor, calState.selectedDate)) classes.push("selected");
      } else {
        if (startOfWeek(cursor).getTime() === selWeekStart){
          classes.push("in-week");
          var dow = cursor.getDay();
          if (dow === 1) classes.push("wk-start");
          if (dow === 0) classes.push("wk-end");
        }
      }
      html += '<button type="button" class="' + classes.join(" ") + '" data-date="' + cursor.getTime() + '">' + cursor.getDate() + '</button>';
      cursor = addDays(cursor, 1);
    }
    html += '</div>';
    calBody.innerHTML = html;
  }

  function renderMonthGrid(){
    var view = calState.viewDate;
    calNavLabel.textContent = String(view.getFullYear());
    var html = '<div class="cal-months">';
    for (var m = 0; m < 12; m++){
      var selected = calState.selectedDate.getFullYear() === view.getFullYear() && calState.selectedDate.getMonth() === m;
      html += '<button type="button" class="cal-tile' + (selected ? " selected" : "") + '" data-value="' + m + '">' + MONTH_NAMES[m].slice(0, 3) + '</button>';
    }
    html += '</div>';
    calBody.innerHTML = html;
  }

  function renderYearGrid(){
    var startY = calState.viewDate.getFullYear();
    calNavLabel.textContent = startY + " – " + (startY + 11);
    var html = '<div class="cal-years">';
    for (var i = 0; i < 12; i++){
      var y = startY + i;
      var selected = calState.selectedDate.getFullYear() === y;
      html += '<button type="button" class="cal-tile' + (selected ? " selected" : "") + '" data-value="' + y + '">' + y + '</button>';
    }
    html += '</div>';
    calBody.innerHTML = html;
  }

  function renderCalendarBody(){
    if (calState.granularity === "day" || calState.granularity === "week") renderDayGrid();
    else if (calState.granularity === "month") renderMonthGrid();
    else if (calState.granularity === "year") renderYearGrid();
  }

  function navigateCal(dir){
    var v = calState.viewDate;
    if (calState.granularity === "day" || calState.granularity === "week"){
      calState.viewDate = new Date(v.getFullYear(), v.getMonth() + dir, 1);
    } else if (calState.granularity === "month"){
      calState.viewDate = new Date(v.getFullYear() + dir, v.getMonth(), 1);
    } else if (calState.granularity === "year"){
      calState.viewDate = new Date(v.getFullYear() + dir * 12, 0, 1);
    }
    renderCalendarBody();
  }

  function openPeriodPicker(){
    calState.granularity = currentPeriod.granularity || "day";
    calState.selectedDate = currentPeriod.refDate ? new Date(currentPeriod.refDate) : new Date();
    calState.viewDate = new Date(calState.selectedDate);
    renderCalGranTabs();
    renderCalendarBody();
    periodPickerOverlay.classList.add("open");
    window.__lockBodyScroll();
    history.pushState({ periodPickerOpen: true }, "");
  }

  function closePeriodPicker(){
    var wasOpen = periodPickerOverlay.classList.contains("open");
    periodPickerOverlay.classList.remove("open");
    if (wasOpen) window.__unlockBodyScroll();
    if (wasOpen && history.state && history.state.periodPickerOpen) {
      history.back();
    }
  }

  window.addEventListener("popstate", function(){
    if (periodPickerOverlay.classList.contains("open")) {
      periodPickerOverlay.classList.remove("open");
      window.__unlockBodyScroll();
    }
  });

  periodSelectBtn.addEventListener("click", openPeriodPicker);
  periodPickerClose.addEventListener("click", closePeriodPicker);
  periodPickerOverlay.addEventListener("click", function(e){
    if (e.target === periodPickerOverlay) closePeriodPicker();
  });
  document.addEventListener("keydown", function(e){
    if (e.key === "Escape" && periodPickerOverlay.classList.contains("open")) closePeriodPicker();
  });

  calGranTabs.addEventListener("click", function(e){
    var btn = e.target.closest("button[data-gran]");
    if (!btn) return;
    calState.granularity = btn.getAttribute("data-gran");
    calState.viewDate = new Date(calState.selectedDate);
    renderCalGranTabs();
    renderCalendarBody();
  });

  calPrevBtn.addEventListener("click", function(){ navigateCal(-1); });
  calNextBtn.addEventListener("click", function(){ navigateCal(1); });

  calBody.addEventListener("click", function(e){
    var dayBtn = e.target.closest("button[data-date]");
    if (dayBtn){
      calState.selectedDate = new Date(parseInt(dayBtn.getAttribute("data-date"), 10));
      renderCalendarBody();
      return;
    }
    var tile = e.target.closest(".cal-tile");
    if (tile){
      var val = parseInt(tile.getAttribute("data-value"), 10);
      if (calState.granularity === "month"){
        calState.selectedDate = new Date(calState.viewDate.getFullYear(), val, 1);
      } else if (calState.granularity === "year"){
        calState.selectedDate = new Date(val, 0, 1);
      }
      calState.viewDate = new Date(calState.selectedDate);
      renderCalendarBody();
    }
  });

  calApplyBtn.addEventListener("click", function(){
    currentPeriod.granularity = calState.granularity;
    currentPeriod.refDate = new Date(calState.selectedDate);
    closePeriodPicker();
    render();
  });

  calClearBtn.addEventListener("click", function(){
    currentPeriod.granularity = null;
    currentPeriod.refDate = null;
    closePeriodPicker();
    render();
  });

  var addProfitDayOverlay = document.getElementById("addProfitDayOverlay");
  var addProfitDayClose = document.getElementById("addProfitDayClose");
  var addProfitDayCancel = document.getElementById("addProfitDayCancel");
  var profitCalPrevBtn = document.getElementById("profitCalPrevBtn");
  var profitCalNextBtn = document.getElementById("profitCalNextBtn");
  var profitCalNavLabel = document.getElementById("profitCalNavLabel");
  var profitCalBody = document.getElementById("profitCalBody");
  var profitDayOrderSearch = document.getElementById("profitDayOrderSearch");
  var profitDayOrderSearchLabel = document.getElementById("profitDayOrderSearchLabel");
  var profitDayOrderList = document.getElementById("profitDayOrderList");
  var profitDaySearchTimer = null;

  var profitCalState = { viewDate: new Date(), selectedDate: new Date() };

  function renderProfitDayOrderList(){
    var q = profitDayOrderSearch.value.trim().toLowerCase();
    var candidates = allOrders.filter(function(o){ return o._reviewed !== true; });

    if (q){
      candidates = candidates.filter(function(o){
        var hay = (o._name + " " + o._phone + " " + o.id + " " + o._product.name).toLowerCase();
        return hay.indexOf(q) !== -1;
      });
    }

    candidates = candidates.slice(0, 60);

    if (candidates.length === 0){
      profitDayOrderList.innerHTML = '<div class="product-suggestion-empty">No un-added orders match. Every order may already be added to a day.</div>';
      return;
    }

    profitDayOrderList.innerHTML = candidates.map(function(o){
      var imgHtml = o._product.image
        ? '<img class="picker-item-img" src="' + escapeHtml(o._product.image) + '" alt="" onerror="this.style.display=\'none\'">'
        : '<div class="picker-item-img picker-item-img-placeholder"><i class="fas fa-box"></i></div>';
      return (
        '<button type="button" class="picker-item" data-id="' + escapeHtml(o.id) + '">' +
          imgHtml +
          '<div class="picker-item-info">' +
            '<div class="picker-item-title">' + escapeHtml(o._name) + '</div>' +
            '<div class="picker-item-product">' + escapeHtml(o._product.name) + '</div>' +
            '<div class="picker-item-meta">' +
              '#' + escapeHtml(o.id.slice(-8).toUpperCase()) + ' · ' + escapeHtml(formatDate(o._date)) + ' · ' + escapeHtml(formatCurrency(o._total)) +
            '</div>' +
          '</div>' +
          '<div class="picker-item-add"><i class="fas fa-plus"></i></div>' +
        '</button>'
      );
    }).join("");
  }

  function updateProfitDayOrderSearchLabel(){
    var dateLabel = profitCalState.selectedDate.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
    profitDayOrderSearchLabel.textContent = "Add Orders to " + dateLabel;
  }

  function renderProfitCalGrid(){
    var view = profitCalState.viewDate;
    profitCalNavLabel.textContent = MONTH_NAMES[view.getMonth()] + " " + view.getFullYear();

    var monthStart = new Date(view.getFullYear(), view.getMonth(), 1);
    var monthEnd = new Date(view.getFullYear(), view.getMonth() + 1, 0);
    var gridStart = startOfWeek(monthStart);
    var gridEnd = addDays(startOfWeek(monthEnd), 6);

    var today = new Date();
    var html = '<div class="cal-weekdays">' + WEEKDAY_NAMES_SHORT.map(function(w){ return "<span>" + w + "</span>"; }).join("") + '</div>';
    html += '<div class="cal-days">';
    var cursor = new Date(gridStart);
    while (cursor.getTime() <= gridEnd.getTime()){
      var classes = ["cal-day"];
      if (cursor.getMonth() !== view.getMonth()) classes.push("outside");
      if (sameDay(cursor, today)) classes.push("today");
      if (sameDay(cursor, profitCalState.selectedDate)) classes.push("selected");
      html += '<button type="button" class="' + classes.join(" ") + '" data-date="' + cursor.getTime() + '">' + cursor.getDate() + '</button>';
      cursor = addDays(cursor, 1);
    }
    html += '</div>';
    profitCalBody.innerHTML = html;
    updateProfitDayOrderSearchLabel();
  }

  function openAddProfitDayPicker(){
    profitCalState.selectedDate = new Date();
    profitCalState.viewDate = new Date();
    profitDayOrderSearch.value = "";
    renderProfitCalGrid();
    renderProfitDayOrderList();
    addProfitDayOverlay.classList.add("open");
    window.__lockBodyScroll();
    history.pushState({ addProfitDayOpen: true }, "");
  }

  function closeAddProfitDayPicker(){
    var wasOpen = addProfitDayOverlay.classList.contains("open");
    addProfitDayOverlay.classList.remove("open");
    if (wasOpen) window.__unlockBodyScroll();
    if (wasOpen && history.state && history.state.addProfitDayOpen) {
      history.back();
    }
  }

  window.addEventListener("popstate", function(){
    if (addProfitDayOverlay.classList.contains("open")) {
      addProfitDayOverlay.classList.remove("open");
      window.__unlockBodyScroll();
    }
  });

  addProfitDayClose.addEventListener("click", closeAddProfitDayPicker);
  addProfitDayCancel.addEventListener("click", closeAddProfitDayPicker);
  addProfitDayOverlay.addEventListener("click", function(e){
    if (e.target === addProfitDayOverlay) closeAddProfitDayPicker();
  });
  document.addEventListener("keydown", function(e){
    if (e.key === "Escape" && addProfitDayOverlay.classList.contains("open")) closeAddProfitDayPicker();
  });

  profitCalPrevBtn.addEventListener("click", function(){
    var v = profitCalState.viewDate;
    profitCalState.viewDate = new Date(v.getFullYear(), v.getMonth() - 1, 1);
    renderProfitCalGrid();
  });
  profitCalNextBtn.addEventListener("click", function(){
    var v = profitCalState.viewDate;
    profitCalState.viewDate = new Date(v.getFullYear(), v.getMonth() + 1, 1);
    renderProfitCalGrid();
  });

  profitCalBody.addEventListener("click", function(e){
    var dayBtn = e.target.closest("button[data-date]");
    if (!dayBtn) return;
    profitCalState.selectedDate = new Date(parseInt(dayBtn.getAttribute("data-date"), 10));
    renderProfitCalGrid();
  });

  profitDayOrderSearch.addEventListener("input", function(){
    clearTimeout(profitDaySearchTimer);
    profitDaySearchTimer = setTimeout(renderProfitDayOrderList, 150);
  });

  profitDayOrderList.addEventListener("click", function(e){
    var btn = e.target.closest(".picker-item[data-id]");
    if (!btn) return;
    var id = btn.getAttribute("data-id");
    var order = allOrders.filter(function(o){ return o.id === id; })[0];
    if (!order) return;

    var target = profitCalState.selectedDate;
    toggleReviewed(order.id, true, target);
    order._reviewed = true;
    order._reviewedAt = new Date(target);

    showToastGlobal("Order added ✓");
    renderProfitDayOrderList();
    render();
  });

  function matchesFilter(order){
    if (!matchesPeriod(order)) return false;
    if (currentSearch){
      var q = currentSearch.toLowerCase();
      var hay = (order._name + " " + order._phone + " " + order.id + " " + order._product.name).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  function renderSummary(){
    var relevant = currentPeriod.granularity ? allOrders.filter(matchesPeriod) : allOrders;

    if (currentView === "profit"){
      relevant = relevant.filter(function(o){ return o._reviewed === true; });
    }

    statTotalOrders.textContent = relevant.length;
    var revenue = 0, profit = 0, totalQty = 0;
    for (var i = 0; i < relevant.length; i++){
      totalQty += (relevant[i]._product && relevant[i]._product.quantity) ? relevant[i]._product.quantity : 0;
      if (normalizeStatus(relevant[i]._status) !== "cancelled"){
        revenue += relevant[i]._total;
        profit += relevant[i]._profit;
      }
    }
    statTotalQty.textContent = totalQty.toLocaleString("en-LK") + (totalQty === 1 ? " item" : " items");
    statTotalRevenue.textContent = formatCurrency(revenue);
    statTotalProfit.textContent = formatCurrency(profit);

    if (currentPeriod.granularity){
      var periodLabelText = formatPeriodLabel(currentPeriod.granularity, currentPeriod.refDate);
      statOrdersLabel.textContent = "Orders — " + periodLabelText;
      statRevenueLabel.textContent = "Price — " + periodLabelText;
      statProfitLabel.textContent = "Profit — " + periodLabelText;
    } else {
      statOrdersLabel.textContent = "Total Orders";
      statRevenueLabel.textContent = "Total Price";
      statProfitLabel.textContent = "Total Profit";
    }
  }

  var selectionModeActive = false;

  var selectionSessionOriginals = null;
  var selectionPopstateExpected = false;

  function setSelectionMode(active){
    selectionModeActive = active;
    document.body.classList.toggle("selection-mode-active", active);
    updateSelectionCount();
  }

  function updateSelectionCount(){
    if (!selectionCountEl) return;
    var n = document.querySelectorAll(".order-tick-input:checked").length;
    selectionCountEl.textContent = n + (n === 1 ? " selected" : " selected");
  }

  function recordSessionOriginal(orderId, originalValue){
    if (selectionSessionOriginals && !(orderId in selectionSessionOriginals)){
      selectionSessionOriginals[orderId] = originalValue;
    }
  }

  function revertSelectionSession(){
    if (!selectionSessionOriginals) return;
    var originals = selectionSessionOriginals;
    selectionSessionOriginals = null;
    Object.keys(originals).forEach(function(orderId){
      toggleReviewed(orderId, originals[orderId]);
    });
  }

  function enterSelectionMode(){
    if (selectionModeActive) return;
    selectionSessionOriginals = {};
    setSelectionMode(true);
    history.pushState({ selectionModeOpen: true }, "");
  }

  function finishSelectionMode(){
    if (!selectionModeActive) return;
    selectionSessionOriginals = null;
    setSelectionMode(false);
    if (history.state && history.state.selectionModeOpen){
      selectionPopstateExpected = true;
      history.back();
    }
  }

  function cancelSelectionMode(){
    revertSelectionSession();
    setSelectionMode(false);
  }

  window.addEventListener("popstate", function(){
    if (selectionPopstateExpected){
      selectionPopstateExpected = false;
      return;
    }
    if (selectionModeActive){
      cancelSelectionMode();
    }
  });

  if (selectionDoneBtn){
    selectionDoneBtn.addEventListener("click", finishSelectionMode);
  }

  function maybeExitSelectionMode(){
    if (!selectionModeActive) return;
    if (!document.querySelector(".order-tick-input:checked")){
      finishSelectionMode();
    } else {
      updateSelectionCount();
    }
  }

  function toggleReviewed(orderId, checked, forDate){
    if (!db) return;
    var update = { reviewed: checked };
    if (checked){
      var d = forDate ? new Date(forDate) : new Date();
      update.reviewedAt = firebase.firestore.Timestamp.fromDate(d);
    } else {
      update.reviewedAt = firebase.firestore.FieldValue.delete();
    }
    db.collection("orders").doc(orderId).update(update)
      .catch(function(err){
        showToastGlobal("Could not update: " + (err && err.message ? err.message : "Unknown error"));
      });
  }

  function showToastGlobal(msg){
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    setTimeout(function(){ toastEl.classList.remove("show"); }, 2200);
  }

  // ---------------------------------------------------------------------
  // Card preview back-button handling: whenever ANY order card or profit
  // day-summary card is expanded (its "open" class turned on), a single
  // history entry is pushed. Pressing back once — no matter how many
  // separate cards are open at that moment — closes every open preview in
  // one go, consuming that single history entry.
  // ---------------------------------------------------------------------
  var openPreviewCards = new Set();
  var previewHistoryPushed = false;
  var previewPopstateExpected = false;

  function registerCardPreviewOpened(cardEl){
    openPreviewCards.add(cardEl);
    if (!previewHistoryPushed){
      previewHistoryPushed = true;
      history.pushState({ cardPreviewOpen: true }, "");
    }
  }

  function registerCardPreviewClosed(cardEl){
    openPreviewCards.delete(cardEl);
    if (openPreviewCards.size === 0 && previewHistoryPushed){
      previewHistoryPushed = false;
      previewPopstateExpected = true;
      history.back();
    }
  }

  function closeAllCardPreviews(){
    openPreviewCards.forEach(function(c){ c.classList.remove("open"); });
    openPreviewCards.clear();
  }

  window.addEventListener("popstate", function(){
    if (previewPopstateExpected){
      previewPopstateExpected = false;
      return;
    }
    if (previewHistoryPushed){
      previewHistoryPushed = false;
      closeAllCardPreviews();
    }
  });

  function buildOrderCardEl(order){
    var product = order._product;
    var card = document.createElement("div");
    card.className = "order-card" + (order._reviewed ? " reviewed" : "");

    var thumbHtml = product.image
      ? '<img class="order-thumb" src="' + escapeHtml(product.image) + '" alt="" onerror="this.style.display=\'none\'">'
      : '<div class="order-thumb order-thumb-placeholder"><i class="fas fa-box"></i></div>';

    var productBlockHtml =
      '<div class="product-block">' +
        (product.image
          ? '<img class="product-block-img" src="' + escapeHtml(product.image) + '" alt="" onerror="this.style.display=\'none\'">'
          : '<div class="product-block-img product-block-img-placeholder"><i class="fas fa-box"></i></div>') +
        '<div>' +
          '<div class="product-block-name">' + escapeHtml(product.name) + '</div>' +
          (product.category ? '<div class="product-block-cat">' + escapeHtml(product.category) + '</div>' : '') +
          (product.description ? '<div class="product-block-desc">' + escapeHtml(product.description) + '</div>' : '') +
        '</div>' +
      '</div>';

    card.innerHTML =
      '<div class="order-head" role="button" tabindex="0">' +
        '<div class="order-head-left">' +
          '<label class="order-tick"><input type="checkbox" class="order-tick-input"' + (order._reviewed ? " checked" : "") + '></label>' +
          thumbHtml +
          '<div>' +
            '<div class="order-id">#' + escapeHtml(order.id.slice(-8).toUpperCase()) + '</div>' +
            '<div class="order-name">' + escapeHtml(order._name) + '</div>' +
            '<div class="order-product-name">' + escapeHtml(product.name) + '</div>' +
            '<div class="order-date">' + formatDate(order._date) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="order-right">' +
          '<div class="order-total-label">Price</div>' +
          '<div class="order-total">' + formatCurrency(order._total) + '</div>' +
          '<div class="order-profit-chip"><i class="fas fa-sack-dollar"></i>Profit ' + formatCurrency(order._profit) + '</div>' +
          '<div class="order-qty-note">Qty ' + product.quantity + '</div>' +
          '<div class="chevron">▾</div>' +
        '</div>' +
      '</div>' +
      '<div class="order-details">' +
        '<div class="order-details-inner">' +
          '<div class="items-title">Product</div>' +
          productBlockHtml +
          '<div class="detail-row"><span>Price</span><span>' + formatCurrency(order._total) + '</span></div>' +
          '<div class="detail-row profit-row"><span>Profit</span><span>' + formatCurrency(order._profit) + '</span></div>' +
          '<div class="items-title">Customer</div>' +
          (order._phone ? '<div class="detail-row"><span>Phone</span><span>' + escapeHtml(order._phone) + '</span></div>' : '') +
          (order._address ? '<div class="detail-row"><span>Address</span><span>' + escapeHtml(order._address) + '</span></div>' : '') +
          (order._note ? '<div class="detail-row"><span>Note</span><span>' + escapeHtml(order._note) + '</span></div>' : '') +
          '<div class="order-actions">' +
            '<button class="order-action-btn edit" type="button"><i class="fas fa-pen"></i> Edit</button>' +
            '<button class="order-action-btn delete" type="button"><i class="fas fa-trash"></i> Delete</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var head = card.querySelector(".order-head");
    var tickInput = card.querySelector(".order-tick-input");
    var tickLabel = card.querySelector(".order-tick");

    function setTicked(checked){
      recordSessionOriginal(order.id, tickInput.checked);
      tickInput.checked = checked;
      card.classList.toggle("reviewed", checked);
      // Update the local order object immediately (optimistic) so that any
      // list re-render triggered by the Firestore write (onSnapshot) — even
      // one that happens to land mid-gesture — already reflects the correct
      // selected state instead of depending on the async round trip.
      order._reviewed = checked;
      toggleReviewed(order.id, checked);
      updateSelectionCount();
    }

    // ---------------------------------------------------------------------
    // Selection is now triggered by a DOUBLE TAP (or double click) on the
    // card head, instead of a long press. A single tap/click still just
    // opens or closes the card's detail preview (or, once selection mode is
    // already on, toggles that card's tick). Since a single tap has its own
    // normal job, we briefly hold it (DOUBLE_TAP_MS) to see whether a
    // second tap follows before committing to the single-tap action — this
    // is the standard, minimal way to tell a single tap from the first half
    // of a double tap without any extra gestures or timers left running.
    // ---------------------------------------------------------------------
    var DOUBLE_TAP_MS = 300;
    var DOUBLE_TAP_MOVE_TOLERANCE = 24;
    var pendingTapTimer = null;
    var lastTapTime = 0;
    var lastTapX = 0, lastTapY = 0;

    function clearPendingTap(){
      if (pendingTapTimer){ clearTimeout(pendingTapTimer); pendingTapTimer = null; }
    }

    function runSingleTapAction(){
      if (selectionModeActive){
        setTicked(!tickInput.checked);
        maybeExitSelectionMode();
        return;
      }
      var isOpen = card.classList.toggle("open");
      if (isOpen) registerCardPreviewOpened(card); else registerCardPreviewClosed(card);
    }

    function runDoubleTapAction(){
      if (!selectionModeActive){
        if (!tickInput.checked) setTicked(true);
        enterSelectionMode();
      } else {
        setTicked(!tickInput.checked);
        maybeExitSelectionMode();
      }
    }

    head.addEventListener("click", function(e){
      var now = Date.now();
      var withinTime = (now - lastTapTime) < DOUBLE_TAP_MS;
      var withinDistance =
        Math.abs(e.clientX - lastTapX) <= DOUBLE_TAP_MOVE_TOLERANCE &&
        Math.abs(e.clientY - lastTapY) <= DOUBLE_TAP_MOVE_TOLERANCE;

      if (withinTime && withinDistance){
        // Second tap of a double tap: cancel the pending single-tap action
        // and run the double-tap (select) action instead.
        clearPendingTap();
        lastTapTime = 0;
        runDoubleTapAction();
        return;
      }

      lastTapTime = now;
      lastTapX = e.clientX;
      lastTapY = e.clientY;
      clearPendingTap();
      pendingTapTimer = setTimeout(function(){
        pendingTapTimer = null;
        runSingleTapAction();
      }, DOUBLE_TAP_MS);
    });

    head.addEventListener("keydown", function(e){
      if (e.key === "Enter" || e.key === " "){
        e.preventDefault();
        if (selectionModeActive){
          setTicked(!tickInput.checked);
          maybeExitSelectionMode();
          return;
        }
        var isOpen = card.classList.toggle("open");
        if (isOpen) registerCardPreviewOpened(card); else registerCardPreviewClosed(card);
      }
    });

    tickLabel.addEventListener("click", function(e){ e.stopPropagation(); });
    tickInput.addEventListener("change", function(){
      recordSessionOriginal(order.id, !tickInput.checked);
      card.classList.toggle("reviewed", tickInput.checked);
      order._reviewed = tickInput.checked;
      toggleReviewed(order.id, tickInput.checked);
      maybeExitSelectionMode();
    });

    var editBtn = card.querySelector(".order-action-btn.edit");
    var deleteBtn = card.querySelector(".order-action-btn.delete");
    editBtn.addEventListener("click", function(e){
      e.stopPropagation();
      if (OrderAdmin.openEdit) OrderAdmin.openEdit(order);
    });
    deleteBtn.addEventListener("click", function(e){
      e.stopPropagation();
      if (OrderAdmin.confirmDelete) OrderAdmin.confirmDelete(order.id, order._name);
    });

    return card;
  }

  function buildDaySummaryCardEl(dateKey, orders){
  var totalProfit = 0, totalPrice = 0, itemsCount = 0;
  var productSet = {};
  for (var i = 0; i < orders.length; i++){
    totalProfit += orders[i]._profit;
    totalPrice += orders[i]._total;
    var p = orders[i]._product || {};
    itemsCount += (parseInt(p.quantity, 10) || 1);
    productSet[p.id || p.name || i] = true;
  }
  var productCount = Object.keys(productSet).length;

  var dateObj = (dateKey === "unknown") ? null : new Date(Number(dateKey));
  var dateLabel = dateObj
    ? dateObj.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })
    : "Unknown date";

  var card = document.createElement("div");
  card.className = "order-card day-summary-card";
  card.innerHTML =
    '<div class="order-head" role="button" tabindex="0">' +
      '<div class="order-head-left">' +
        '<div class="order-thumb order-thumb-placeholder"><i class="fas fa-calendar-check"></i></div>' +
        '<div>' +
          '<div class="order-id">Reviewed</div>' +
          '<div class="order-name">' + escapeHtml(dateLabel) + '</div>' +
          '<div class="order-date">' + orders.length + (orders.length === 1 ? " order" : " orders") + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="order-right">' +
        '<div class="order-total-label">Profit</div>' +
        '<div class="order-total">' + formatCurrency(totalProfit) + '</div>' +
        '<div class="chevron">▾</div>' +
      '</div>' +
    '</div>' +
    '<div class="order-details">' +
      '<div class="day-summary-orders-wrap">' +
        '<div class="day-dashboard">' +
          '<div class="day-dash-item"><div class="day-dash-label"><i class="fas fa-calendar-day"></i>Date</div><div class="day-dash-value">' + escapeHtml(dateLabel) + '</div></div>' +
          '<div class="day-dash-item"><div class="day-dash-label"><i class="fas fa-tag"></i>Price</div><div class="day-dash-value">' + formatCurrency(totalPrice) + '</div></div>' +
          '<div class="day-dash-item highlight"><div class="day-dash-label"><i class="fas fa-sack-dollar"></i>Profit</div><div class="day-dash-value">' + formatCurrency(totalProfit) + '</div></div>' +
          '<div class="day-dash-item"><div class="day-dash-label"><i class="fas fa-box"></i>Products</div><div class="day-dash-value">' + productCount + '</div></div>' +
          '<div class="day-dash-item"><div class="day-dash-label"><i class="fas fa-layer-group"></i>Items</div><div class="day-dash-value">' + itemsCount + '</div></div>' +
        '</div>' +
        '<div class="order-actions day-summary-actions" style="margin-top:0;padding-top:0;border-top:none;margin-bottom:10px;">' +
          '<button class="order-action-btn edit day-edit-btn" type="button"><i class="fas fa-pen"></i> Edit</button>' +
          '<button class="order-action-btn delete day-delete-btn" type="button"><i class="fas fa-trash"></i> Delete</button>' +
        '</div>' +
        '<div class="order-list day-summary-orders"></div>' +
      '</div>' +
    '</div>';

  var head = card.querySelector(".order-head");
  var ordersContainer = card.querySelector(".day-summary-orders");
  var dayEditBtn = card.querySelector(".day-edit-btn");
  var dayDeleteBtn = card.querySelector(".day-delete-btn");
  var built = false;

  dayEditBtn.addEventListener("click", function(e){
    e.stopPropagation();
    openDayOrderPicker(dateObj, orders, function(pickedOrder){
      if (!card.classList.contains("open")){
        card.classList.add("open");
        registerCardPreviewOpened(card);
      }
      ordersContainer.innerHTML = "";
      built = true;
      var freshOrders = orders.slice();
      var already = freshOrders.some(function(o){ return o.id === pickedOrder.id; });
      if (!already) freshOrders.push(pickedOrder);
      freshOrders.forEach(function(o){
        var childCard = buildOrderCardEl(o);
        childCard.classList.remove("reviewed");
        ordersContainer.appendChild(childCard);
      });
    });
  });

  dayDeleteBtn.addEventListener("click", function(e){
    e.stopPropagation();
    if (!orders.length) return;
    openDayDeleteConfirm(dateLabel, orders.length, function(){
      orders.forEach(function(o){
        toggleReviewed(o.id, false);
        o._reviewed = false;
        o._reviewedAt = null;
      });
      showToastGlobal("Day removed from Profit ✓");
      render();
    });
  });

  function toggleOpen(){
    var isOpen = card.classList.toggle("open");
    if (isOpen){
      registerCardPreviewOpened(card);
      if (!built){
        built = true;
        orders.forEach(function(o){
          var childCard = buildOrderCardEl(o);
          childCard.classList.remove("reviewed");
          ordersContainer.appendChild(childCard);
        });
      }
    } else {
      registerCardPreviewClosed(card);
    }
  }

  head.addEventListener("click", toggleOpen);
  head.addEventListener("keydown", function(e){
    if (e.key === "Enter" || e.key === " "){
      e.preventDefault();
      toggleOpen();
    }
  });

  return card;
}

  var dayAddOrderOverlay = document.getElementById("dayAddOrderOverlay");
  var dayAddOrderClose = document.getElementById("dayAddOrderClose");
  var dayAddOrderCancel = document.getElementById("dayAddOrderCancel");
  var dayAddOrderSearch = document.getElementById("dayAddOrderSearch");
  var dayAddOrderList = document.getElementById("dayAddOrderList");
  var dayEditCalPrevBtn = document.getElementById("dayEditCalPrevBtn");
  var dayEditCalNextBtn = document.getElementById("dayEditCalNextBtn");
  var dayEditCalNavLabel = document.getElementById("dayEditCalNavLabel");
  var dayEditCalBody = document.getElementById("dayEditCalBody");
  var dayEditDateApply = document.getElementById("dayEditDateApply");
  var dayPickerTargetDate = null;
  var dayPickerOnPick = null;
  var dayPickerOrders = null;
  var dayPickerSearchTimer = null;
  var dayEditCalState = { viewDate: new Date(), selectedDate: new Date() };

  function renderDayEditCalGrid(){
    var view = dayEditCalState.viewDate;
    dayEditCalNavLabel.textContent = MONTH_NAMES[view.getMonth()] + " " + view.getFullYear();

    var monthStart = new Date(view.getFullYear(), view.getMonth(), 1);
    var monthEnd = new Date(view.getFullYear(), view.getMonth() + 1, 0);
    var gridStart = startOfWeek(monthStart);
    var gridEnd = addDays(startOfWeek(monthEnd), 6);

    var today = new Date();
    var html = '<div class="cal-weekdays">' + WEEKDAY_NAMES_SHORT.map(function(w){ return "<span>" + w + "</span>"; }).join("") + '</div>';
    html += '<div class="cal-days">';
    var cursor = new Date(gridStart);
    while (cursor.getTime() <= gridEnd.getTime()){
      var classes = ["cal-day"];
      if (cursor.getMonth() !== view.getMonth()) classes.push("outside");
      if (sameDay(cursor, today)) classes.push("today");
      if (sameDay(cursor, dayEditCalState.selectedDate)) classes.push("selected");
      html += '<button type="button" class="' + classes.join(" ") + '" data-date="' + cursor.getTime() + '">' + cursor.getDate() + '</button>';
      cursor = addDays(cursor, 1);
    }
    html += '</div>';
    dayEditCalBody.innerHTML = html;
  }

  dayEditCalPrevBtn.addEventListener("click", function(){
    var v = dayEditCalState.viewDate;
    dayEditCalState.viewDate = new Date(v.getFullYear(), v.getMonth() - 1, 1);
    renderDayEditCalGrid();
  });
  dayEditCalNextBtn.addEventListener("click", function(){
    var v = dayEditCalState.viewDate;
    dayEditCalState.viewDate = new Date(v.getFullYear(), v.getMonth() + 1, 1);
    renderDayEditCalGrid();
  });
  dayEditCalBody.addEventListener("click", function(e){
    var dayBtn = e.target.closest("button[data-date]");
    if (!dayBtn) return;
    dayEditCalState.selectedDate = new Date(parseInt(dayBtn.getAttribute("data-date"), 10));
    renderDayEditCalGrid();
  });

  dayEditDateApply.addEventListener("click", function(){
    if (!dayPickerOrders || !dayPickerOrders.length){
      showToastGlobal("Nothing to move.");
      return;
    }
    var target = dayEditCalState.selectedDate;
    dayPickerTargetDate = target;
    dayPickerOrders.forEach(function(o){
      toggleReviewed(o.id, true, target);
      o._reviewed = true;
      o._reviewedAt = new Date(target);
    });
    var dateLabel = target.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
    showToastGlobal("Day moved to " + dateLabel + " ✓");
    closeDayOrderPicker();
    render();
  });

  function closeDayOrderPicker(){
    var wasOpen = dayAddOrderOverlay.classList.contains("open");
    dayAddOrderOverlay.classList.remove("open");
    if (wasOpen) window.__unlockBodyScroll();
    dayAddOrderSearch.value = "";
    dayPickerOnPick = null;
    dayPickerOrders = null;
    if (wasOpen && history.state && history.state.dayOrderPickerOpen) {
      history.back();
    }
  }

  window.addEventListener("popstate", function(){
    if (dayAddOrderOverlay.classList.contains("open")) {
      dayAddOrderOverlay.classList.remove("open");
      window.__unlockBodyScroll();
    }
  });

  function renderDayOrderPickerList(){
    var q = dayAddOrderSearch.value.trim().toLowerCase();
    var candidates = allOrders.filter(function(o){ return o._reviewed !== true; });

    if (q){
      candidates = candidates.filter(function(o){
        var hay = (o._name + " " + o._phone + " " + o.id + " " + o._product.name).toLowerCase();
        return hay.indexOf(q) !== -1;
      });
    }

    candidates = candidates.slice(0, 60);

    if (candidates.length === 0){
      dayAddOrderList.innerHTML = '<div class="product-suggestion-empty">No unticked orders match. Every order may already be added to a day.</div>';
      return;
    }

    dayAddOrderList.innerHTML = candidates.map(function(o){
      var imgHtml = o._product.image
        ? '<img class="picker-item-img" src="' + escapeHtml(o._product.image) + '" alt="" onerror="this.style.display=\'none\'">'
        : '<div class="picker-item-img picker-item-img-placeholder"><i class="fas fa-box"></i></div>';
      return (
        '<button type="button" class="picker-item" data-id="' + escapeHtml(o.id) + '">' +
          imgHtml +
          '<div class="picker-item-info">' +
            '<div class="picker-item-title">' + escapeHtml(o._name) + '</div>' +
            '<div class="picker-item-product">' + escapeHtml(o._product.name) + '</div>' +
            '<div class="picker-item-meta">' +
              '#' + escapeHtml(o.id.slice(-8).toUpperCase()) + ' · ' + escapeHtml(formatDate(o._date)) + ' · ' + escapeHtml(formatCurrency(o._total)) +
            '</div>' +
          '</div>' +
          '<div class="picker-item-add"><i class="fas fa-plus"></i></div>' +
        '</button>'
      );
    }).join("");
  }

  function openDayOrderPicker(forDate, orders, onPick){
    dayPickerTargetDate = forDate || new Date();
    dayPickerOrders = orders || [];
    dayPickerOnPick = onPick || null;
    dayAddOrderSearch.value = "";
    dayEditCalState.selectedDate = new Date(dayPickerTargetDate);
    dayEditCalState.viewDate = new Date(dayPickerTargetDate);
    renderDayEditCalGrid();
    renderDayOrderPickerList();
    dayAddOrderOverlay.classList.add("open");
    window.__lockBodyScroll();
    history.pushState({ dayOrderPickerOpen: true }, "");
    setTimeout(function(){ dayAddOrderSearch.focus(); }, 50);
  }

  dayAddOrderClose.addEventListener("click", closeDayOrderPicker);
  dayAddOrderCancel.addEventListener("click", closeDayOrderPicker);
  dayAddOrderOverlay.addEventListener("click", function(e){
    if (e.target === dayAddOrderOverlay) closeDayOrderPicker();
  });
  document.addEventListener("keydown", function(e){
    if (e.key === "Escape" && dayAddOrderOverlay.classList.contains("open")) closeDayOrderPicker();
  });

  dayAddOrderSearch.addEventListener("input", function(){
    clearTimeout(dayPickerSearchTimer);
    dayPickerSearchTimer = setTimeout(renderDayOrderPickerList, 150);
  });

  dayAddOrderList.addEventListener("click", function(e){
    var btn = e.target.closest(".picker-item[data-id]");
    if (!btn) return;
    var id = btn.getAttribute("data-id");
    var order = allOrders.filter(function(o){ return o.id === id; })[0];
    if (!order) return;

    toggleReviewed(order.id, true, dayPickerTargetDate);
    order._reviewed = true;
    order._reviewedAt = dayPickerTargetDate;

    var cb = dayPickerOnPick;
    closeDayOrderPicker();
    showToastGlobal("Order added ✓");
    if (cb) cb(order);
  });

  var dayDeleteConfirmOverlay = document.getElementById("dayDeleteConfirmOverlay");
  var dayDeleteConfirmClose = document.getElementById("dayDeleteConfirmClose");
  var dayDeleteConfirmCancel = document.getElementById("dayDeleteConfirmCancel");
  var dayDeleteConfirmBtn = document.getElementById("dayDeleteConfirmBtn");
  var dayDeleteConfirmText = document.getElementById("dayDeleteConfirmText");
  var dayDeleteConfirmAction = null;

  function closeDayDeleteConfirm(){
    dayDeleteConfirmOverlay.classList.remove("open");
    document.body.style.overflow = "";
    dayDeleteConfirmAction = null;
  }

  function openDayDeleteConfirm(dateLabel, count, onConfirm){
    dayDeleteConfirmAction = onConfirm;
    dayDeleteConfirmText.textContent =
      "Remove " + count + (count === 1 ? " order" : " orders") + " from " + dateLabel +
      "'s Profit card? This only un-marks them as reviewed — the orders themselves are not deleted.";
    dayDeleteConfirmOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  dayDeleteConfirmClose.addEventListener("click", closeDayDeleteConfirm);
  dayDeleteConfirmCancel.addEventListener("click", closeDayDeleteConfirm);
  dayDeleteConfirmOverlay.addEventListener("click", function(e){
    if (e.target === dayDeleteConfirmOverlay) closeDayDeleteConfirm();
  });
  document.addEventListener("keydown", function(e){
    if (e.key === "Escape" && dayDeleteConfirmOverlay.classList.contains("open")) closeDayDeleteConfirm();
  });
  dayDeleteConfirmBtn.addEventListener("click", function(){
    var action = dayDeleteConfirmAction;
    closeDayDeleteConfirm();
    if (action) action();
  });

  function renderList(){
    var filtered = allOrders.filter(matchesFilter);

    listArea.innerHTML = "";

    if (allOrders.length === 0){
      listArea.innerHTML =
        '<div class="state-box"><div class="icon">📭</div>No orders have been placed yet.</div>';
      return;
    }

    if (filtered.length === 0){
      var msg = currentPeriod.granularity
        ? "No orders were placed in this " + currentPeriod.granularity + "."
        : "No orders match your search or filter.";
      listArea.innerHTML =
        '<div class="state-box"><div class="icon">🔍</div>' + msg + '</div>';
      return;
    }

    var wrap = document.createElement("div");
    wrap.className = "order-list";

    if (currentView === "profit"){
      var reviewedOrders = filtered.filter(function(o){ return o._reviewed === true; });

      if (reviewedOrders.length === 0){
        listArea.innerHTML =
          '<div class="state-box"><div class="icon">✅</div>No orders have been ticked yet. Tick an order to see it here.</div>';
        return;
      }

      var groups = {};
      reviewedOrders.forEach(function(o){
        var groupDate = o._reviewedAt || o._date;
        var key = groupDate ? startOfDay(groupDate).getTime() : "unknown";
        if (!groups[key]) groups[key] = [];
        groups[key].push(o);
      });
      var dayKeys = Object.keys(groups).sort(function(a, b){
        if (a === "unknown") return 1;
        if (b === "unknown") return -1;
        return Number(b) - Number(a);
      });
      dayKeys.forEach(function(key){
        wrap.appendChild(buildDaySummaryCardEl(key, groups[key]));
      });
    } else {
      filtered.forEach(function(order){
        wrap.appendChild(buildOrderCardEl(order));
      });
    }

    listArea.appendChild(wrap);
  }

  function render(){
    renderSummary();
    renderPeriodPanel();
    renderList();
  }

  function showError(msg){
    errorBox.style.display = "block";
    errorBox.textContent = msg;
  }
  function hideError(){
    errorBox.style.display = "none";
  }

  function normalizeOrder(doc){
    var data = doc.data();
    var product = getProduct(data);
    var total = getTotal(data, product);
    return {
      id: doc.id,
      raw: data,
      _name: getCustomerName(data),
      _phone: getPhone(data),
      _address: getAddress(data),
      _note: getNote(data),
      _status: getStatus(data),
      _product: product,
      _total: total,
      _profit: getProfit(product),
      _date: getOrderDate(data),
      _reviewedAt: getReviewedDate(data),
      _reviewed: data.reviewed === true
    };
  }

  function fetchOrders(){
    if (!db){
      loadingBox.style.display = "none";
      showError("Firestore is not available. Make sure Firebase is configured correctly at the top of this file.");
      return;
    }

    hideError();

    if (unsubscribe) { unsubscribe(); unsubscribe = null; }

    try {
      unsubscribe = db.collection("orders").onSnapshot(function(snapshot){
        loadingBox.style.display = "none";
        hideError();

        allOrders = snapshot.docs.map(normalizeOrder).sort(function(a, b){
          var da = a._date ? a._date.getTime() : 0;
          var db_ = b._date ? b._date.getTime() : 0;
          return db_ - da;
        });

        pageSub.textContent = allOrders.length + " order" + (allOrders.length === 1 ? "" : "s") + " on record";
        render();
      }, function(err){
        loadingBox.style.display = "none";
        showError("Could not load orders: " + (err && err.message ? err.message : "Unknown error") +
          ". Check your Firestore security rules and collection name (\"orders\").");
      });
    } catch (e){
      loadingBox.style.display = "none";
      showError("Unexpected error while loading orders: " + e.message);
    }
  }

  function updateAddOrderFabLabel(){
    var fabBtn = document.getElementById("addOrderFab");
    var fabLabel = document.getElementById("addOrderFabLabel");
    if (!fabBtn) return;
    if (currentView === "profit"){
      if (fabLabel) fabLabel.textContent = "Add Profit";
      fabBtn.setAttribute("aria-label", "Add profit");
      fabBtn.setAttribute("title", "Add profit");
    } else {
      if (fabLabel) fabLabel.textContent = "Add Order";
      fabBtn.setAttribute("aria-label", "Add order");
      fabBtn.setAttribute("title", "Add order");
    }
  }

  function setActiveViewTab(view){
    currentView = view;
    viewTabs.querySelectorAll(".view-tab").forEach(function(b){
      b.classList.toggle("active", b.getAttribute("data-view") === view);
    });
    updateAddOrderFabLabel();
    render();
  }

  viewTabs.addEventListener("click", function(e){
    var btn = e.target.closest(".view-tab");
    if (!btn) return;
    var view = btn.getAttribute("data-view");
    if (selectionModeActive) finishSelectionMode();
    if (view === currentView){
      if (view === "all"){
        // Re-tapping "All Orders" while already on it does a full page reload.
        location.reload();
      } else {
        // Re-tapping "Profit" while already on it just refreshes that view.
        setActiveViewTab(view);
      }
      return;
    }
    setActiveViewTab(view);
    if (view === "profit"){
      history.pushState({ profitViewOpen: true }, "");
    } else if (history.state && history.state.profitViewOpen) {
      history.back();
    }
  });

  window.addEventListener("popstate", function(){
    if (currentView === "profit" && !(history.state && history.state.profitViewOpen)){
      setActiveViewTab("all");
    }
  });

  searchInput.addEventListener("input", function(){
    clearTimeout(searchTimer);
    var val = searchInput.value;
    searchTimer = setTimeout(function(){
      currentSearch = val.trim();
      render();
    }, 180);
  });

  searchInput.addEventListener("keydown", function(e){
    if (e.key === "Enter"){
      clearTimeout(searchTimer);
      currentSearch = searchInput.value.trim();
      render();
    }
  });

  searchBtn.addEventListener("click", function(){
    clearTimeout(searchTimer);
    currentSearch = searchInput.value.trim();
    render();
  });

  window.addEventListener("pagehide", function(){
    if (unsubscribe) unsubscribe();
  });

  updateAddOrderFabLabel();
  fetchOrders();

  (function(){
    var fab = document.getElementById("addOrderFab");
    var overlay = document.getElementById("addOrderOverlay");
    var closeBtn = document.getElementById("addOrderClose");
    var cancelBtn = document.getElementById("addOrderCancel");
    var submitBtn = document.getElementById("addOrderSubmit");
    var form = document.getElementById("addOrderForm");
    var errBox = document.getElementById("addOrderError");

    var fProductName = document.getElementById("fProductName");
    var productSuggestions = document.getElementById("productSuggestions");
    var fPrice = document.getElementById("fPrice");
    var fQuantity = document.getElementById("fQuantity");
    var fProfit = document.getElementById("fProfit");
    var fImage = document.getElementById("fImage");
    var fDescription = document.getElementById("fDescription");
    var fName = document.getElementById("fName");
    var fPhone = document.getElementById("fPhone");
    var fOrderDate = document.getElementById("fOrderDate");
    var addrTypeToggle = document.getElementById("addrTypeToggle");
    var addressInputGroup = document.getElementById("addressInputGroup");
    var fAddress = document.getElementById("fAddress");
    var fLocationInput = document.getElementById("fLocationInput");
    var locationSuggestions = document.getElementById("locationSuggestions");
    var modalTitleEl = document.getElementById("addOrderTitle");

    var SL_LOCATIONS = {
      "Western": {
        "Colombo": ["Colombo", "Dehiwala", "Mount Lavinia", "Maharagama", "Nugegoda", "Sri Jayawardenepura Kotte", "Kotte", "Battaramulla", "Rajagiriya", "Kaduwela", "Malabe", "Athurugiriya", "Homagama", "Piliyandala", "Kesbewa", "Moratuwa", "Kotikawatta", "Wellampitiya", "Kolonnawa", "Mulleriyawa", "Angoda", "Kohuwala", "Bambalapitiya", "Wellawatte", "Kollupitiya", "Borella", "Maradana", "Pettah", "Fort", "Dematagoda", "Grandpass", "Mattakkuliya", "Modera", "Mutwal", "Kotahena", "Hultsdorf", "Slave Island", "Cinnamon Gardens", "Narahenpita", "Kirulapone", "Pamankada", "Thimbirigasyaya", "Havelock Town", "Orugodawatta", "Avissawella", "Padukka", "Hanwella", "Kosgama", "Pugoda", "Meepe", "Waga", "Seethawaka"],
        "Gampaha": ["Gampaha", "Negombo", "Ja-Ela", "Wattala", "Kelaniya", "Mahara", "Biyagama", "Minuwangoda", "Katana", "Divulapitiya", "Mirigama", "Attanagalla", "Nittambuwa", "Dompe", "Ganemulla", "Yakkala", "Veyangoda", "Kirindiwela", "Pugoda", "Malwana", "Delgoda", "Peliyagoda", "Kandana", "Ragama", "Welisara", "Hendala", "Hunupitiya", "Mabole", "Seeduwa", "Katunayake", "Kurana", "Liyanagemulla", "Andiambalama", "Kadirana", "Kimbulapitiya", "Kochchikade", "Kadawatha", "Kiribathgoda", "Dalugama", "Weliweriya", "Kirillawala", "Imbulgoda", "Pasyala", "Kalagedihena", "Warakapola"],
        "Kalutara": ["Kalutara", "Panadura", "Wadduwa", "Bandaragama", "Horana", "Beruwala", "Aluthgama", "Matugama", "Ingiriya", "Bulathsinhala", "Agalawatta", "Dodangoda", "Payagala", "Maggona", "Bentota", "Dharga Town", "Waskaduwa", "Millaniya", "Ratnapura Road"]
      },
      "Central": {
        "Kandy": ["Kandy", "Peradeniya", "Katugastota", "Gampola", "Nawalapitiya", "Kadugannawa", "Pilimathalawa", "Gelioya", "Daulagala", "Wattegama", "Digana", "Teldeniya", "Kundasale", "Akurana", "Galagedara", "Poojapitiya", "Hatharaliyadda", "Deltota", "Pussellawa", "Dolosbage", "Ulapane", "Galaha", "Rikillagaskada", "Menikhinna", "Alawatugoda"],
        "Matale": ["Matale", "Dambulla", "Galewela", "Ukuwela", "Rattota", "Naula", "Laggala", "Pallepola", "Yatawatta", "Wilgamuwa", "Sigiriya", "Palapathwela", "Elkaduwa", "Kandalama", "Inamaluwa", "Nalanda"],
        "Nuwara Eliya": ["Nuwara Eliya", "Hatton", "Talawakelle", "Ginigathhena", "Walapane", "Ragala", "Hanguranketha", "Pundaluoya", "Kotagala", "Lindula", "Maskeliya", "Nanu Oya", "Ambewela", "Pattipola", "Agarapathana", "Bogawantalawa", "Norwood", "Watawala", "Kandapola"]
      },
      "Southern": {
        "Galle": ["Galle", "Ambalangoda", "Hikkaduwa", "Elpitiya", "Baddegama", "Bentota", "Balapitiya", "Karandeniya", "Imaduwa", "Udugama", "Neluwa", "Nagoda", "Yakkalamulla", "Akmeemana", "Gonapinuwala", "Habaraduwa", "Koggala", "Unawatuna"],
        "Matara": ["Matara", "Weligama", "Akuressa", "Dikwella", "Hakmana", "Kamburupitiya", "Devinuwara", "Deniyaya", "Kekanadura", "Mirissa", "Dondra", "Gandara", "Thihagoda", "Malimbada", "Mulatiyana", "Pasgoda", "Pitabeddara", "Kotapola", "Morawaka", "Weligama"],
        "Hambantota": ["Hambantota", "Tangalle", "Beliatta", "Ambalantota", "Tissamaharama", "Walasmulla", "Weeraketiya", "Suriyawewa", "Kataragama", "Lunugamvehera", "Angunakolapelessa", "Middeniya", "Katuwana", "Ranna"]
      },
      "Northern": {
        "Jaffna": ["Jaffna", "Nallur", "Chavakachcheri", "Point Pedro", "Valvettithurai", "Karainagar", "Kayts", "Delft", "Kopay", "Tellippalai", "Chunnakam", "Uduvil", "Manipay", "Kankesanthurai", "Karaveddy", "Chankanai", "Vaddukoddai"],
        "Kilinochchi": ["Kilinochchi", "Pallai", "Poonakary", "Karachchi", "Kandavalai", "Pachchilaipalli", "Paranthan"],
        "Mannar": ["Mannar", "Madhu", "Murunkan", "Nanaddan", "Pesalai", "Talaimannar", "Adampan"],
        "Vavuniya": ["Vavuniya", "Nedunkeni", "Cheddikulam", "Omanthai", "Vengalacheddikulam", "Puliyankulam"],
        "Mullaitivu": ["Mullaitivu", "Puthukkudiyiruppu", "Oddusuddan", "Mankulam", "Maritimepattu", "Mallavi", "Visvamadu"]
      },
      "Eastern": {
        "Ampara": ["Ampara", "Kalmunai", "Akkaraipattu", "Sainthamaruthu", "Sammanthurai", "Nintavur", "Addalachchenai", "Dehiattakandiya", "Maha Oya", "Uhana", "Pottuvil", "Panama"],
        "Batticaloa": ["Batticaloa", "Kattankudy", "Eravur", "Chenkalady", "Valachchenai", "Oddamavadi", "Kiran", "Vakarai", "Kaluwanchikudy", "Kallady"],
        "Trincomalee": ["Trincomalee", "Kinniya", "Kantale", "Muttur", "Kuchchaveli", "Gomarankadawala", "Morawewa", "Seruvila", "Nilaveli", "Uppuveli"]
      },
      "North Western": {
        "Kurunegala": ["Kurunegala", "Kuliyapitiya", "Alawwa", "Bingiriya", "Dambadeniya", "Galgamuwa", "Giriulla", "Hettipola", "Ibbagamuwa", "Maho", "Mawathagama", "Narammala", "Nikaweratiya", "Pannala", "Polgahawela", "Wariyapola", "Ridigama", "Rambukkana"],
        "Puttalam": ["Puttalam", "Chilaw", "Anamaduwa", "Arachchikattuwa", "Dankotuwa", "Kalpitiya", "Madampe", "Mundel", "Nattandiya", "Wennappuwa", "Marawila", "Nainamadama", "Norochcholai"]
      },
      "North Central": {
        "Anuradhapura": ["Anuradhapura", "Mihintale", "Medawachchiya", "Kekirawa", "Tambuttegama", "Nochchiyagama", "Thalawa", "Galnewa", "Horowpothana", "Kahatagasdigiliya", "Padaviya", "Rambewa", "Nachchaduwa", "Eppawala"],
        "Polonnaruwa": ["Polonnaruwa", "Kaduruwela", "Minneriya", "Hingurakgoda", "Medirigiriya", "Lankapura", "Welikanda", "Dimbulagala", "Elahera", "Manampitiya", "Bakamuna", "Aralaganwila", "Giritale"]
      },
      "Uva": {
        "Badulla": ["Badulla", "Bandarawela", "Haputale", "Mahiyanganaya", "Diyatalawa", "Hali Ela", "Ella", "Haldummulla", "Welimada", "Kandaketiya", "Passara", "Lunugala", "Ragala", "Koslanda", "Namunukula"],
        "Monaragala": ["Monaragala", "Bibile", "Buttala", "Wellawaya", "Siyambalanduwa", "Medagama", "Thanamalwila", "Badalkumbura", "Sevanagala", "Kataragama", "Okkampitiya"]
      },
      "Sabaragamuwa": {
        "Ratnapura": ["Ratnapura", "Eheliyagoda", "Kuruwita", "Pelmadulla", "Balangoda", "Embilipitiya", "Rakwana", "Godakawela", "Kahawatta", "Nivithigala", "Kalawana", "Ayagama", "Kolonna", "Imbulpe", "Kiriella", "Udawalawe", "Belihuloya"],
        "Kegalle": ["Kegalle", "Mawanella", "Rambukkana", "Warakapola", "Galigamuwa", "Aranayake", "Yatiyantota", "Ruwanwella", "Dehiowita", "Deraniyagala", "Bulathkohupitiya", "Kitulgala", "Karawanella"]
      }
    };

    var addressType = "shop";
    var selectedItemId = null;
    var itemsCache = [];
    var itemsUnsub = null;
    var highlightedIndex = -1;
    var currentMatches = [];
    var editingOrderId = null;
    var editingNote = "";
    var editingOriginalStatus = "pending";
    var editingOriginalDate = null;

    // ---- Categories: same fixed checkbox picker as the Admin Panel's
    // "Choose Categories" modal (id="orderCategoryOverlay"). Selected
    // values (lowercase slugs, matching the Admin Panel's stored format)
    // live in `selectedCategories`; the button below the field just opens
    // the picker and shows a "Selected: ..." summary line, exactly like
    // the Admin Panel's Add Item form.
    var selectedCategories = [];
    var orderCategoryOverlay = document.getElementById("orderCategoryOverlay");
    var openOrderCategoryModalBtn = document.getElementById("openOrderCategoryModalBtn");
    var orderCategoryClose = document.getElementById("orderCategoryClose");
    var orderCategoryCancel = document.getElementById("orderCategoryCancel");
    var orderCategorySave = document.getElementById("orderCategorySave");
    var orderSelectedCategoriesText = document.getElementById("orderSelectedCategoriesText");
    var orderCategoryCheckboxes = document.querySelectorAll('input[name="orderItemCategories"]');

    function categoryLabelsFromValues(values){
      var labels = [];
      (values || []).forEach(function(v){
        var found = null;
        orderCategoryCheckboxes.forEach(function(cb){
          if (!found && cb.value.toLowerCase() === String(v).trim().toLowerCase()){
            found = cb.nextElementSibling.textContent;
          }
        });
        labels.push(found || v);
      });
      return labels;
    }

    function updateSelectedCategoriesDisplay(){
      if (selectedCategories.length > 0){
        orderSelectedCategoriesText.textContent = "Selected: " + categoryLabelsFromValues(selectedCategories).join(", ");
        orderSelectedCategoriesText.classList.remove("empty");
      } else {
        orderSelectedCategoriesText.textContent = "No categories selected";
        orderSelectedCategoriesText.classList.add("empty");
      }
    }

    function setCategoryCheckboxes(cats){
      var lowerCats = (cats || []).map(function(c){ return String(c).trim().toLowerCase(); });
      orderCategoryCheckboxes.forEach(function(cb){
        var label = cb.nextElementSibling.textContent.trim().toLowerCase();
        cb.checked = lowerCats.indexOf(cb.value.toLowerCase()) !== -1 || lowerCats.indexOf(label) !== -1;
      });
    }

    function openOrderCategoryModal(){
      setCategoryCheckboxes(selectedCategories);
      orderCategoryOverlay.classList.add("open");
      window.__lockBodyScroll();
      history.pushState({ orderCategoryModalOpen: true }, "");
    }

    function closeOrderCategoryModal(){
      var wasOpen = orderCategoryOverlay.classList.contains("open");
      orderCategoryOverlay.classList.remove("open");
      if (wasOpen) window.__unlockBodyScroll();
      if (wasOpen && history.state && history.state.orderCategoryModalOpen){
        history.back();
      }
    }

    // NOTE: this listener only ever un-does the CATEGORY modal itself. It
    // must not blindly close the Add Order modal underneath it — that was
    // the cause of the Add Order popup closing whenever "Save Choices" (or
    // Cancel/back) was used on the category picker: closeOrderCategoryModal()
    // calls history.back(), which fires this *global* popstate listener, and
    // the Add Order modal's own popstate listener (further below) was
    // unconditionally treating that as "close me too". Checking
    // event.state here keeps this handler scoped to only the category modal.
    window.addEventListener("popstate", function(e){
      if (orderCategoryOverlay.classList.contains("open")){
        if (e.state && e.state.orderCategoryModalOpen) return;
        orderCategoryOverlay.classList.remove("open");
        window.__unlockBodyScroll();
      }
    });

    openOrderCategoryModalBtn.addEventListener("click", openOrderCategoryModal);
    orderCategoryClose.addEventListener("click", closeOrderCategoryModal);
    orderCategoryCancel.addEventListener("click", closeOrderCategoryModal);
    orderCategoryOverlay.addEventListener("click", function(e){
      if (e.target === orderCategoryOverlay) closeOrderCategoryModal();
    });
    document.addEventListener("keydown", function(e){
      if (e.key === "Escape" && orderCategoryOverlay.classList.contains("open")) closeOrderCategoryModal();
    });

    orderCategorySave.addEventListener("click", function(){
      var pickedValues = [];
      orderCategoryCheckboxes.forEach(function(cb){
        if (cb.checked) pickedValues.push(cb.value);
      });
      selectedCategories = pickedValues;
      updateSelectedCategoriesDisplay();
      closeOrderCategoryModal();
    });

    function formatDateForInput(d){
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, "0");
      var day = String(d.getDate()).padStart(2, "0");
      return y + "-" + m + "-" + day;
    }

    function buildDateFromInput(dateStr, timeSource){
      var base = timeSource ? new Date(timeSource) : new Date();
      if (!dateStr) return base;
      var parts = dateStr.split("-");
      var y = parseInt(parts[0], 10);
      var m = parseInt(parts[1], 10) - 1;
      var d = parseInt(parts[2], 10);
      if (isNaN(y) || isNaN(m) || isNaN(d)) return base;
      var result = new Date(base);
      result.setFullYear(y, m, d);
      return result;
    }

    function showToast(msg){
      toastEl.textContent = msg;
      toastEl.classList.add("show");
      setTimeout(function(){ toastEl.classList.remove("show"); }, 2200);
    }

    function showFormError(msg){
      errBox.textContent = msg;
      errBox.classList.add("show");
    }
    function hideFormError(){
      errBox.classList.remove("show");
    }

    function readItemDoc(doc){
      var d = doc.data();
      var rawProfit = d.profit;
      if (rawProfit == null) rawProfit = d.profitPerUnit;
      var profitNum = (typeof rawProfit === "number") ? rawProfit : parseFloat(rawProfit);
      return {
        id: doc.id,
        name: d.name || d.title || "Untitled item",
        category: d.category || "",
        categories: Array.isArray(d.categories) ? d.categories : (d.category ? [d.category] : []),
        price: (typeof d.price === "number") ? d.price : parseFloat(d.price),
        profit: isNaN(profitNum) ? null : profitNum,
        description: d.description || "",
        image: d.image || d.imageUrl || d.img || ""
      };
    }

    function loadItems(){
      if (!db) return;
      if (itemsUnsub) { itemsUnsub(); itemsUnsub = null; }
      try {
        itemsUnsub = db.collection("items").onSnapshot(function(snapshot){
          itemsCache = snapshot.docs.map(readItemDoc);
        }, function(err){
          console.error("Could not load items collection:", err);
        });
      } catch (e) {
        console.error("Unexpected error loading items:", e);
      }
    }

    function escapeHtmlForOption(str){
      return String(str).replace(/[&<>"']/g, function(c){
        return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c];
      });
    }

    var SL_ALL_LOCATIONS = [];
    Object.keys(SL_LOCATIONS).forEach(function(province){
      var districts = SL_LOCATIONS[province];
      Object.keys(districts).forEach(function(district){
        districts[district].forEach(function(city){
          SL_ALL_LOCATIONS.push({ city: city, district: district, province: province });
        });
      });
    });

    var selectedLocation = null;
    var locHighlightedIndex = -1;
    var locCurrentMatches = [];

    function closeLocationSuggestions(){
      locationSuggestions.classList.remove("open");
      locationSuggestions.innerHTML = "";
      locHighlightedIndex = -1;
      locCurrentMatches = [];
    }

    function applyLocationHighlight(){
      var rows = locationSuggestions.querySelectorAll(".product-suggestion");
      rows.forEach(function(row, i){
        row.classList.toggle("highlighted", i === locHighlightedIndex);
      });
      if (locHighlightedIndex >= 0 && rows[locHighlightedIndex]){
        rows[locHighlightedIndex].scrollIntoView({ block: "nearest" });
      }
    }

    function renderLocationSuggestions(query){
      var q = query.trim().toLowerCase();
      if (!q){
        closeLocationSuggestions();
        return;
      }

      locCurrentMatches = SL_ALL_LOCATIONS.filter(function(loc){
        return loc.city.toLowerCase().indexOf(q) !== -1;
      }).slice(0, 25);

      if (locCurrentMatches.length === 0){
        locationSuggestions.innerHTML = '<div class="product-suggestion-empty">No matching area found — you can still use the area name you typed.</div>';
        locationSuggestions.classList.add("open");
        locHighlightedIndex = -1;
        return;
      }

      locationSuggestions.innerHTML = locCurrentMatches.map(function(loc, i){
        return (
          '<div class="product-suggestion" data-index="' + i + '">' +
            '<div>' +
              '<div class="product-suggestion-name">' + escapeHtmlForOption(loc.city) + '</div>' +
              '<div class="product-suggestion-meta">' + escapeHtmlForOption(loc.district + " District, " + loc.province + " Province") + '</div>' +
            '</div>' +
          '</div>'
        );
      }).join("");

      locationSuggestions.classList.add("open");
      locHighlightedIndex = 0;
      applyLocationHighlight();
    }

    function pickLocation(loc){
      selectedLocation = loc;
      fLocationInput.value = loc.city;
      closeLocationSuggestions();
      updateComposedAddress();
    }

    fLocationInput.addEventListener("input", function(){
      selectedLocation = null;
      renderLocationSuggestions(fLocationInput.value);
      updateComposedAddress();
    });

    fLocationInput.addEventListener("focus", function(){
      var val = fLocationInput.value.trim();
      if (!val) return;
      if (selectedLocation && selectedLocation.city === val) return;
      renderLocationSuggestions(val);
    });

    fLocationInput.addEventListener("keydown", function(e){
      if (!locationSuggestions.classList.contains("open") || locCurrentMatches.length === 0) return;
      if (e.key === "ArrowDown"){
        e.preventDefault();
        locHighlightedIndex = Math.min(locHighlightedIndex + 1, locCurrentMatches.length - 1);
        applyLocationHighlight();
      } else if (e.key === "ArrowUp"){
        e.preventDefault();
        locHighlightedIndex = Math.max(locHighlightedIndex - 1, 0);
        applyLocationHighlight();
      } else if (e.key === "Enter"){
        if (locHighlightedIndex >= 0 && locCurrentMatches[locHighlightedIndex]){
          e.preventDefault();
          pickLocation(locCurrentMatches[locHighlightedIndex]);
        }
      } else if (e.key === "Escape"){
        closeLocationSuggestions();
      }
    });

    locationSuggestions.addEventListener("click", function(e){
      var row = e.target.closest(".product-suggestion");
      if (!row) return;
      var idx = parseInt(row.getAttribute("data-index"), 10);
      var loc = locCurrentMatches[idx];
      if (loc) pickLocation(loc);
    });

    function updateComposedAddress(){
      var cityText = fLocationInput.value.trim();
      var parts = [];
      if (cityText) parts.push(cityText);
      if (selectedLocation && selectedLocation.city === cityText){
        parts.push(selectedLocation.district + " District");
        parts.push(selectedLocation.province + " Province");
      }
      fAddress.value = parts.join(", ");
    }

    function parseAddressToFields(addressStr){
      var result = { location: null, text: addressStr || "" };
      if (!addressStr) return result;

      var remaining = addressStr;
      var matched = SL_ALL_LOCATIONS.filter(function(loc){
        return remaining.indexOf(loc.city) !== -1;
      })[0];

      if (matched) result.location = matched;
      return result;
    }

    function setAddressType(type, addressValue){
      addressType = (type === "address") ? "address" : "shop";
      addrTypeToggle.querySelectorAll(".addr-type-btn").forEach(function(b){
        b.classList.toggle("active", b.getAttribute("data-type") === addressType);
      });
      addressInputGroup.style.display = (addressType === "address") ? "block" : "none";

      if (addressType === "address"){
        var trimmedVal = (addressValue || "").trim();

        if (trimmedVal && trimmedVal.toLowerCase() !== "shop"){
          var parsed = parseAddressToFields(trimmedVal);
          if (parsed.location){
            selectedLocation = parsed.location;
            fLocationInput.value = parsed.location.city;
          } else {
            selectedLocation = null;
            fLocationInput.value = trimmedVal;
          }
        } else {
          selectedLocation = null;
          fLocationInput.value = "";
        }

        closeLocationSuggestions();
        updateComposedAddress();
      } else {
        selectedLocation = null;
        fLocationInput.value = "";
        closeLocationSuggestions();
        fAddress.value = "Shop";
      }
    }

    document.addEventListener("click", function(e){
      if (!e.target.closest(".location-search-wrap")) closeLocationSuggestions();
    });

    addrTypeToggle.addEventListener("click", function(e){
      var btn = e.target.closest(".addr-type-btn");
      if (!btn) return;
      setAddressType(btn.getAttribute("data-type"), fAddress.value);
      if (addressType === "address"){
        setTimeout(function(){ fLocationInput.focus(); }, 50);
      }
    });

    function escapeHtmlLocal(str){
      return String(str).replace(/[&<>"']/g, function(c){
        return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c];
      });
    }

    function formatPriceShort(n){
      if (isNaN(n)) return "";
      return "LKR " + n.toLocaleString("en-LK", {minimumFractionDigits:0, maximumFractionDigits:2});
    }

    function closeSuggestions(){
      productSuggestions.classList.remove("open");
      productSuggestions.innerHTML = "";
      highlightedIndex = -1;
      currentMatches = [];
    }

    function applyHighlight(){
      var rows = productSuggestions.querySelectorAll(".product-suggestion");
      rows.forEach(function(row, i){
        row.classList.toggle("highlighted", i === highlightedIndex);
      });
      if (highlightedIndex >= 0 && rows[highlightedIndex]){
        rows[highlightedIndex].scrollIntoView({ block: "nearest" });
      }
    }

    function renderSuggestions(query){
      var q = query.trim().toLowerCase();
      if (!q){
        closeSuggestions();
        return;
      }

      currentMatches = itemsCache.filter(function(it){
        var nameMatch = it.name && it.name.toLowerCase().indexOf(q) !== -1;
        var priceMatch = it.price != null && !isNaN(it.price) && String(it.price).indexOf(q) !== -1;
        return nameMatch || priceMatch;
      }).slice(0, 20);

      if (currentMatches.length === 0){
        productSuggestions.innerHTML = '<div class="product-suggestion-empty">No matching items in the items list — you can still type a custom product.</div>';
        productSuggestions.classList.add("open");
        highlightedIndex = -1;
        return;
      }

      productSuggestions.innerHTML = currentMatches.map(function(it){
        var priceLabel = formatPriceShort(it.price);
        var metaParts = [];
        if (it.category) metaParts.push(escapeHtmlLocal(it.category));
        if (priceLabel) metaParts.push(priceLabel);
        var imgHtml = it.image
          ? '<img class="product-suggestion-img" src="' + escapeHtmlLocal(it.image) + '" alt="" onerror="this.style.display=\'none\'">'
          : '<div class="product-suggestion-img product-suggestion-img-placeholder"><i class="fas fa-box"></i></div>';
        return (
          '<div class="product-suggestion" data-id="' + escapeHtmlLocal(it.id) + '">' +
            imgHtml +
            '<div>' +
              '<div class="product-suggestion-name">' + escapeHtmlLocal(it.name) + '</div>' +
              (metaParts.length ? '<div class="product-suggestion-meta">' + metaParts.join(" · ") + '</div>' : '') +
            '</div>' +
          '</div>'
        );
      }).join("");

      productSuggestions.classList.add("open");
      highlightedIndex = 0;
      applyHighlight();
    }

    function selectItem(item){
      selectedItemId = item.id;
      fProductName.value = item.name;
      selectedCategories = Array.isArray(item.categories) && item.categories.length
        ? item.categories.slice()
        : (item.category ? [item.category] : []);
      updateSelectedCategoriesDisplay();
      fPrice.value = (item.price != null && !isNaN(item.price)) ? item.price : "";
      fProfit.value = (item.profit != null && !isNaN(item.profit)) ? item.profit : "";
      fDescription.value = item.description || "";
      fImage.value = item.image || "";
      closeSuggestions();
    }

    fProductName.addEventListener("input", function(){
      if (fProductName.value.trim() === ""){
        selectedItemId = null;
      }
      renderSuggestions(fProductName.value);
    });

    fProductName.addEventListener("focus", function(){
      var val = fProductName.value.trim();
      if (!val) return;
      if (selectedItemId){
        var current = itemsCache.filter(function(it){ return it.id === selectedItemId; })[0];
        if (current && current.name === val) return;
      }
      renderSuggestions(val);
    });

    fProductName.addEventListener("keydown", function(e){
      if (!productSuggestions.classList.contains("open") || currentMatches.length === 0) return;
      if (e.key === "ArrowDown"){
        e.preventDefault();
        highlightedIndex = Math.min(highlightedIndex + 1, currentMatches.length - 1);
        applyHighlight();
      } else if (e.key === "ArrowUp"){
        e.preventDefault();
        highlightedIndex = Math.max(highlightedIndex - 1, 0);
        applyHighlight();
      } else if (e.key === "Enter"){
        if (highlightedIndex >= 0 && currentMatches[highlightedIndex]){
          e.preventDefault();
          selectItem(currentMatches[highlightedIndex]);
        }
      } else if (e.key === "Escape"){
        closeSuggestions();
      }
    });

    productSuggestions.addEventListener("click", function(e){
      var row = e.target.closest(".product-suggestion");
      if (!row) return;
      var id = row.getAttribute("data-id");
      var item = currentMatches.filter(function(it){ return it.id === id; })[0];
      if (item) selectItem(item);
    });

    document.addEventListener("click", function(e){
      if (!e.target.closest(".product-search-wrap")) closeSuggestions();
    });

    function resetForm(){
      form.reset();
      fQuantity.value = "1";
      fOrderDate.value = formatDateForInput(new Date());
      selectedItemId = null;
      selectedCategories = [];
      updateSelectedCategoriesDisplay();
      editingOrderId = null;
      editingNote = "";
      editingOriginalStatus = "pending";
      editingOriginalDate = null;
      modalTitleEl.textContent = "Add Order";
      submitBtn.textContent = "Save Order";
      hideFormError();
      closeSuggestions();
      setAddressType("shop");
    }

    function openModalOverlay(){
      overlay.classList.add("open");
      window.__lockBodyScroll();
      history.pushState({ orderModalOpen: true }, "");
    }

    function closeModal(){
      var wasOpen = overlay.classList.contains("open");
      overlay.classList.remove("open");
      if (wasOpen) window.__unlockBodyScroll();
      closeSuggestions();
      if (wasOpen && history.state && history.state.orderModalOpen) {
        history.back();
      }
    }

    // Only close the Add Order modal on a real "back past it" navigation —
    // i.e. when the state we've landed on after the popstate is NOT still
    // "orderModalOpen" (which is what happens when a modal stacked *above*
    // this one, like the category picker, is the one being closed via its
    // own history.back()). Without this check, closing the category picker
    // also incorrectly closed this modal underneath it.
    window.addEventListener("popstate", function(e){
      if (overlay.classList.contains("open")) {
        if (e.state && e.state.orderModalOpen) return;
        overlay.classList.remove("open");
        window.__unlockBodyScroll();
        closeSuggestions();
      }
    });

    function openModal(){
      resetForm();
      loadItems();
      openModalOverlay();
    }

    function openEditModal(order){
      resetForm();
      loadItems();

      var product = order._product || {};
      editingOrderId = order.id;
      editingNote = order._note || "";
      selectedItemId = product.id || null;

      fProductName.value = product.name || "";
      selectedCategories = Array.isArray(product.categories) && product.categories.length
        ? product.categories.slice()
        : (product.category ? [product.category] : []);
      updateSelectedCategoriesDisplay();
      fPrice.value = (product.price != null && !isNaN(product.price)) ? product.price : "";
      fQuantity.value = product.quantity || 1;
      fProfit.value = (product.profit != null && !isNaN(product.profit)) ? product.profit : "";
      fImage.value = product.image || "";
      fDescription.value = product.description || "";
      fName.value = order._name || "";
      fPhone.value = order._phone || "";
      editingOriginalStatus = normalizeStatus(order._status);
      editingOriginalDate = order._date || new Date();
      fOrderDate.value = formatDateForInput(editingOriginalDate);

      if (order._address && order._address.trim().toLowerCase() !== "shop"){
        setAddressType("address", order._address);
      } else {
        setAddressType("shop");
      }

      modalTitleEl.textContent = "Edit Order";
      submitBtn.textContent = "Update Order";

      openModalOverlay();
    }

    fab.addEventListener("click", function(){
      if (currentView === "profit"){
        if (typeof openAddProfitDayPicker === "function") openAddProfitDayPicker();
      } else {
        openModal();
      }
    });
    closeBtn.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", function(e){
      if (e.target === overlay) closeModal();
    });
    document.addEventListener("keydown", function(e){
      if (e.key === "Escape" && overlay.classList.contains("open") && !productSuggestions.classList.contains("open")) closeModal();
    });

    function setSaving(saving){
      submitBtn.disabled = saving;
      cancelBtn.disabled = saving;
      submitBtn.textContent = saving ? "Saving…" : (editingOrderId ? "Update Order" : "Save Order");
    }

    function slugId(name){
      return String(name || "item")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 40) || "item";
    }

    function handleSubmit(){
      hideFormError();

      var productName = fProductName.value.trim();
      var priceVal = parseFloat(fPrice.value);
      var qtyVal = parseInt(fQuantity.value, 10);
      var profitVal = parseFloat(fProfit.value);
      var customerName = fName.value.trim();
      var addressVal = (addressType === "shop") ? "Shop" : fAddress.value.trim();

      if (!productName){
        showFormError("Product name is required.");
        fProductName.focus();
        return;
      }
      if (isNaN(priceVal) || priceVal < 0){
        showFormError("Please enter a valid price.");
        fPrice.focus();
        return;
      }
      if (isNaN(qtyVal) || qtyVal < 1) qtyVal = 1;
      if (isNaN(profitVal) || profitVal < 0){
        showFormError("Please enter a valid profit amount.");
        fProfit.focus();
        return;
      }
      if (!customerName){
        showFormError("Customer name is required.");
        fName.focus();
        return;
      }
      if (addressType === "address" && !addressVal){
        showFormError("Please select a delivery city / area, or switch to Shop.");
        fLocationInput.focus();
        return;
      }
      if (!fOrderDate.value){
        showFormError("Please pick an order date.");
        fOrderDate.focus();
        return;
      }
      if (!db){
        showFormError("Firestore is not available right now.");
        return;
      }

      var chosenDate = buildDateFromInput(fOrderDate.value, editingOrderId ? editingOriginalDate : new Date());
      var categoriesForOrder = selectedCategories.slice();
      var primaryCategory = categoriesForOrder.length ? categoriesForOrder[0] : "";

      var orderDoc = {
        customer: {
          name: customerName,
          phone: fPhone.value.trim(),
          address: addressVal,
          note: editingNote
        },
        item: {
          id: selectedItemId || slugId(productName),
          name: productName,
          category: primaryCategory,
          categories: categoriesForOrder,
          price: priceVal,
          profit: profitVal,
          quantity: qtyVal,
          description: fDescription.value.trim(),
          image: fImage.value.trim()
        },
        quantity: qtyVal,
        totalPrice: parseFloat((priceVal * qtyVal).toFixed(2)),
        userId: null,
        userEmail: null,
        isGuest: true,
        status: editingOriginalStatus,
        createdAt: firebase.firestore.Timestamp.fromDate(chosenDate)
      };

      // ---- Ensure this product exists in the "items" collection (the same
      // collection the Admin Panel reads/writes via db.collection('items')).
      // 1) If the product was picked from the suggestions list, selectedItemId
      //    is already a real items/{id} — reuse it directly, no search needed.
      // 2) Otherwise (custom-typed name), search the LIVE items list
      //    (itemsCache, kept in sync by the onSnapshot listener in loadItems())
      //    for a name match, case-insensitive, trimmed. If found, reuse that
      //    item's id so we never create a duplicate item.
      // 3) As a guaranteed fallback (in case itemsCache hasn't finished its
      //    first snapshot yet), also run one direct one-off query against
      //    Firestore's "items" collection before deciding to create anything.
      // 4) If truly not found anywhere, create a brand-new items/{id}
      //    document with the name/category/price/description/image entered
      //    here, in the exact same field shape the Admin Panel's own "Add
      //    Item" form writes — so it shows up immediately in the Admin
      //    Panel's "Manage Existing Items" list and on the storefront list
      //    page.
      function findExistingItemInCache(name){
        var q = String(name || "").trim().toLowerCase();
        if (!q) return null;
        for (var i = 0; i < itemsCache.length; i++){
          if (String(itemsCache[i].name || "").trim().toLowerCase() === q){
            return itemsCache[i];
          }
        }
        return null;
      }

      function findExistingItemInFirestore(name){
        var q = String(name || "").trim();
        if (!q) return Promise.resolve(null);
        return db.collection("items").get().then(function(snapshot){
          var qLower = q.toLowerCase();
          var found = null;
          snapshot.forEach(function(doc){
            if (found) return;
            var d = doc.data();
            var docName = String(d.name || d.title || "").trim().toLowerCase();
            if (docName === qLower){
              found = { id: doc.id, data: d };
            }
          });
          return found;
        });
      }

      function ensureItemExists(){
        if (selectedItemId){
          // An existing catalog product was selected. Any edits made to its
          // fields here (name, category, price, profit, description, image)
          // should also be saved back onto that same items/{id} document in
          // Firebase, so the product catalog itself stays up to date instead
          // of the change only being kept inside this one order.
          var itemUpdatePayload = {
            name: orderDoc.item.name,
            price: orderDoc.item.price,
            profit: orderDoc.item.profit,
            categories: categoriesForOrder,
            category: primaryCategory,
            description: orderDoc.item.description || "",
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          if (orderDoc.item.image) itemUpdatePayload.image = orderDoc.item.image;

          var linkedItemId = selectedItemId;
          // Plain, JSON-safe copy for the "recently changed" marker
          // (itemUpdatePayload above carries a Firestore FieldValue sentinel
          // that can't be stored in localStorage / read back by index.html).
          var homeItemData = {
            id: linkedItemId,
            name: itemUpdatePayload.name,
            price: itemUpdatePayload.price,
            profit: itemUpdatePayload.profit,
            categories: itemUpdatePayload.categories,
            category: itemUpdatePayload.category,
            description: itemUpdatePayload.description
          };
          if (itemUpdatePayload.image) homeItemData.image = itemUpdatePayload.image;
          var cachedForDate = findExistingItemInCache(orderDoc.item.name);
          if (cachedForDate && cachedForDate.date) homeItemData.date = cachedForDate.date;
          return db.collection("items").doc(linkedItemId).update(itemUpdatePayload)
            .then(function(){
              markItemRecentlyChangedForHome(linkedItemId, homeItemData);
              return linkedItemId;
            })
            .catch(function(err){
              console.error("Could not update existing product in catalog, order will still save:", err);
              return linkedItemId;
            });
        }

        var cached = findExistingItemInCache(orderDoc.item.name);
        if (cached){
          return Promise.resolve(cached.id);
        }

        return findExistingItemInFirestore(orderDoc.item.name).then(function(found){
          if (found){
            return found.id;
          }

          var newItemDoc = {
            name: orderDoc.item.name,
            price: orderDoc.item.price,
            categories: categoriesForOrder,
            category: primaryCategory,
            description: orderDoc.item.description || "",
            date: new Date().toISOString(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          if (orderDoc.item.image) newItemDoc.image = orderDoc.item.image;

          return db.collection("items").add(newItemDoc).then(function(ref){
            // Plain, JSON-safe copy for the "recently changed" marker
            // (newItemDoc above carries Firestore FieldValue sentinels that
            // can't be stored in localStorage / read back by index.html).
            var homeItemData = {
              id: ref.id,
              name: newItemDoc.name,
              price: newItemDoc.price,
              categories: newItemDoc.categories,
              category: newItemDoc.category,
              description: newItemDoc.description,
              date: newItemDoc.date
            };
            if (newItemDoc.image) homeItemData.image = newItemDoc.image;
            markItemRecentlyChangedForHome(ref.id, homeItemData);
            return ref.id;
          });
        });
      }

      setSaving(true);

      ensureItemExists()
        .then(function(itemId){
          orderDoc.item.id = itemId;
          if (editingOrderId){
            return db.collection("orders").doc(editingOrderId).update(orderDoc);
          } else {
            return db.collection("orders").add(orderDoc);
          }
        })
        .then(function(){
          setSaving(false);
          closeModal();
          showToast(editingOrderId ? "Order updated ✓" : "Order added ✓");
        })
        .catch(function(err){
          setSaving(false);
          showFormError("Could not save order: " + (err && err.message ? err.message : "Unknown error"));
        });
    }

    submitBtn.addEventListener("click", handleSubmit);
    form.addEventListener("submit", function(e){
      e.preventDefault();
      handleSubmit();
    });

    window.addEventListener("pagehide", function(){
      if (itemsUnsub) itemsUnsub();
    });

    var deleteOverlay = document.getElementById("deleteConfirmOverlay");
    var deleteCloseBtn = document.getElementById("deleteConfirmClose");
    var deleteCancelBtn = document.getElementById("deleteConfirmCancel");
    var deleteConfirmBtn = document.getElementById("deleteConfirmBtn");
    var deleteConfirmText = document.getElementById("deleteConfirmText");
    var pendingDeleteId = null;

    function closeDeleteModal(){
      deleteOverlay.classList.remove("open");
      document.body.style.overflow = "";
      pendingDeleteId = null;
    }

    function openDeleteModal(orderId, customerName){
      pendingDeleteId = orderId;
      deleteConfirmText.textContent = "Delete the order for " + (customerName || "this customer") + "? This cannot be undone.";
      deleteConfirmBtn.disabled = false;
      deleteConfirmBtn.textContent = "Delete";
      deleteOverlay.classList.add("open");
      document.body.style.overflow = "hidden";
    }

    deleteCloseBtn.addEventListener("click", closeDeleteModal);
    deleteCancelBtn.addEventListener("click", closeDeleteModal);
    deleteOverlay.addEventListener("click", function(e){
      if (e.target === deleteOverlay) closeDeleteModal();
    });
    document.addEventListener("keydown", function(e){
      if (e.key === "Escape" && deleteOverlay.classList.contains("open")) closeDeleteModal();
    });

    deleteConfirmBtn.addEventListener("click", function(){
      if (!pendingDeleteId || !db) return;
      deleteConfirmBtn.disabled = true;
      deleteConfirmBtn.textContent = "Deleting…";
      db.collection("orders").doc(pendingDeleteId).delete()
        .then(function(){
          closeDeleteModal();
          showToast("Order deleted ✓");
        })
        .catch(function(err){
          deleteConfirmBtn.disabled = false;
          deleteConfirmBtn.textContent = "Delete";
          showToast("Could not delete order: " + (err && err.message ? err.message : "Unknown error"));
        });
    });

    OrderAdmin.openEdit = openEditModal;
    OrderAdmin.confirmDelete = openDeleteModal;

  })();

})();
