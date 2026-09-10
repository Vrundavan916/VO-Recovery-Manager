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


/* ========== Sidebar drawer V6: desktop + mobile, touch-safe ========== */
(function () {
  function initDrawerV6() {
    var btn = document.getElementById('menuToggle');
    var sb = document.querySelector('.sidebar');
    var ov = document.getElementById('sidebarOverlay');
    if (!btn || !sb) return;

    function setOpen(open) {
      sb.classList.toggle('open', open);
      if (ov) ov.classList.toggle('show', open);
      document.documentElement.classList.toggle('sidebar-open', open);
      document.body.classList.toggle('sidebar-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }

    // Never inherit a stale open state after navigation/back-cache restore.
    setOpen(false);

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(!sb.classList.contains('open'));
    }, false);

    if (ov) {
      ov.addEventListener('click', function (e) {
        e.preventDefault();
        setOpen(false);
      }, false);
    }

    // Do NOT prevent default on links: navigation/logout must keep working.
    sb.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a');
      if (!a) return;
      window.setTimeout(function(){ setOpen(false); }, 0);
    }, false);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });

    window.addEventListener('pageshow', function () { setOpen(false); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDrawerV6, {once:true});
  else initDrawerV6();
})();

/* Premium ambient cursor effect — desktop pointer devices only. */
(function () {
  function initCursorFx() {
    if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (document.querySelector('.cursor-ambient-glow')) return;

    var glow = document.createElement('div');
    glow.className = 'cursor-ambient-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);

    var raf = 0, x = -500, y = -500;
    function paint() {
      raf = 0;
      glow.style.left = x + 'px';
      glow.style.top = y + 'px';
    }
    document.addEventListener('mousemove', function (e) {
      x = e.clientX; y = e.clientY;
      document.body.classList.add('cursor-fx-active');
      if (!raf) raf = requestAnimationFrame(paint);
    }, { passive: true });
    document.addEventListener('mouseleave', function () {
      document.body.classList.remove('cursor-fx-active');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCursorFx);
  else initCursorFx();
})();
