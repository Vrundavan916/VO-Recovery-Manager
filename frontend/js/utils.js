/* ==========================================================
   BK Recovery Manager – Utilities
========================================================== */

function formatCurrency(amount) {
    return "₹" + Number(amount || 0).toLocaleString("en-IN");
}

function formatDate(date) {
    if (!date) return "-";
    try {
        return new Date(date).toLocaleDateString("en-IN");
    } catch (e) {
        return String(date);
    }
}

function todayISO() {
    return new Date().toISOString().split("T")[0];
}

function daysLeft(endDate) {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

function computeSubStatus(endDate) {
    const d = daysLeft(endDate);
    if (d === null) return "unknown";
    if (d < 0) return "expired";
    if (d <= 15) return "expiring";
    return "active";
}

function statusBadge(status) {
    const map = {
        active: '<span class="badge badge-success">Active</span>',
        expiring: '<span class="badge badge-warning">Expiring</span>',
        expired: '<span class="badge badge-danger">Expired</span>',
        inactive: '<span class="badge badge-danger">Inactive</span>',
        unknown: '<span class="badge">—</span>'
    };
    return map[status] || map.unknown;
}

function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function showToast(msg, type) {
    type = type || "info";
    let el = document.getElementById("bkToast");
    if (!el) {
        el = document.createElement("div");
        el.id = "bkToast";
        el.className = "bk-toast";
        document.body.appendChild(el);
    }
    el.className = "bk-toast bk-toast-" + type + " show";
    el.textContent = msg;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 3200);
}

window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.todayISO = todayISO;
window.daysLeft = daysLeft;
window.computeSubStatus = computeSubStatus;
window.statusBadge = statusBadge;
window.escapeHtml = escapeHtml;
window.showToast = showToast;


/* ========== Sidebar mobile drawer (single binder) ========== */
(function bindSidebarToggle() {
  function isMobile() {
    return window.matchMedia("(max-width: 900px)").matches;
  }

  function init() {
    var btn = document.getElementById("menuToggle");
    var sb = document.querySelector(".sidebar");
    var ov = document.getElementById("sidebarOverlay");
    if (!sb) return;

    function closeMenu() {
      sb.classList.remove("open");
      if (ov) ov.classList.remove("show");
      document.documentElement.classList.remove("sidebar-open");
      document.body.classList.remove("sidebar-open");
      document.body.style.overflow = "";
    }

    function openMenu() {
      if (!isMobile()) return;
      sb.classList.add("open");
      if (ov) ov.classList.add("show");
      document.documentElement.classList.add("sidebar-open");
      document.body.classList.add("sidebar-open");
      document.body.style.overflow = "hidden";
    }

    function toggleMenu(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (!isMobile()) return;
      if (sb.classList.contains("open")) closeMenu();
      else openMenu();
    }

    if (btn && btn.dataset.bound !== "1") {
      btn.dataset.bound = "1";
      btn.addEventListener("click", toggleMenu);
      btn.addEventListener("touchend", function (e) {
        // avoid double-fire with click on some devices
        e.preventDefault();
        toggleMenu(e);
      }, { passive: false });
    }

    if (ov && ov.dataset.bound !== "1") {
      ov.dataset.bound = "1";
      ov.addEventListener("click", closeMenu);
      ov.addEventListener("touchend", function (e) {
        e.preventDefault();
        closeMenu();
      }, { passive: false });
    }

    // Links must navigate — close menu then follow href (mobile-safe)
    function bindLinks() {
      sb.querySelectorAll("a[href]").forEach(function (a) {
        if (a.dataset.navBound === "1") return;
        a.dataset.navBound = "1";
        a.addEventListener("click", function (e) {
          var href = a.getAttribute("href") || "";
          // ignore pure hash / empty
          if (!href || href === "#") return;
          // logout or other JS handlers — still close
          if (href.indexOf("javascript:") === 0) {
            closeMenu();
            return;
          }
          if (isMobile()) {
            // Close first so UI doesn't stick; allow default navigation
            closeMenu();
          }
          // default navigation continues
        });
      });
    }
    bindLinks();

    // Re-bind when Super Admin injects extra links
    var obs = new MutationObserver(function () { bindLinks(); });
    obs.observe(sb, { childList: true, subtree: true });

    // Desktop: never keep drawer state
    window.addEventListener("resize", function () {
      if (!isMobile()) closeMenu();
    });

    // Start closed on mobile
    if (isMobile()) closeMenu();
    else closeMenu();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
