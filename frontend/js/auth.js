/* ==========================================================
   VO Recovery Manager – Authentication
========================================================== */

async function sbLogin(username, password) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not ready");

    const { data, error } = await sb
        .from("users")
        .select("id, username, password, role, shop_id, display_name, is_active")
        .eq("username", username.trim())
        .eq("password", password.trim())
        .eq("is_active", true)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    let shop = null;
    if (data.shop_id) {
        const { data: s, error: se } = await sb.from("shops").select("*").eq("id", data.shop_id).maybeSingle();
        if (se) throw se;
        shop = s;
        if (shop && shop.is_active === false) {
            throw new Error("This shop is deactivated. Contact Super Admin.");
        }
        if (shop && shop.license_expiry) {
            const st = computeSubStatus(shop.license_expiry);
            if (st === "expired" && data.role !== "super_admin") {
                throw new Error("Shop license has expired. Contact Super Admin to renew.");
            }
        }
    }

    return { user: data, shop };
}

async function login() {
    const usernameEl = document.getElementById("username");
    const passwordEl = document.getElementById("password");
    if (!usernameEl || !passwordEl) return;

    const user = usernameEl.value.trim();
    const pass = passwordEl.value.trim();
    if (!user || !pass) {
        alert("Please enter username and password");
        return;
    }

    const remember = !!(document.getElementById("rememberMe") && document.getElementById("rememberMe").checked);
    const btn = document.querySelector(".login-box button[type='button'], .login-box button.login-btn, #loginBtn");
    if (btn) {
        btn.disabled = true;
        btn.dataset._old = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';
    }

    try {
        const result = await sbLogin(user, pass);
        if (!result) {
            alert("Invalid Username or Password");
            return;
        }
        setSession(result.user, result.shop, remember);
        if (result.user.role === "super_admin") {
            window.location.href = "super-dashboard.html";
        } else {
            window.location.href = "dashboard.html";
        }
    } catch (e) {
        console.error(e);
        alert(e.message || "Login failed");
    } finally {
        if (btn) {
            btn.disabled = false;
            if (btn.dataset._old) btn.innerHTML = btn.dataset._old;
        }
    }
}

function checkLogin() {
    const page = window.location.pathname;
    if (page.includes("login.html") || page.endsWith("/") || page.endsWith("/frontend")) return;

    const session = getSession();
    if (!session.isLoggedIn) {
        window.location.href = "login.html";
        return;
    }

    const role = session.role;
    if (page.includes("settings.html") && role !== "admin" && role !== "super_admin") {
        alert("Access Denied. Settings is available to Admin only.");
        window.location.href = "dashboard.html";
        return;
    }

    const superAdminOnlyPages = ["super-dashboard.html", "companies.html", "subscription.html"];
    if (superAdminOnlyPages.some(p => page.includes(p)) && role !== "super_admin") {
        alert("Access Denied. This section is available to Super Admin only.");
        window.location.href = "dashboard.html";
        return;
    }

    applyRoleRestrictions();
    injectSuperAdminNav();
}

function injectSuperAdminNav() {
    const session = getSession();
    if (session.role !== "super_admin") return;

    const menu = document.querySelector(".sidebar .menu");
    if (!menu || menu.dataset.superAdminInjected) return;

    const page = window.location.pathname;
    const links = [
        { href: "super-dashboard.html", icon: "fa-chart-pie", label: "Super Dashboard" },
        { href: "companies.html", icon: "fa-building", label: "Company Management" },
        { href: "subscription.html", icon: "fa-file-invoice-dollar", label: "Subscription" }
    ];

    const logoutLi = Array.from(menu.children).find(li => li.querySelector('a[onclick*="logout"]'));

    links.forEach(link => {
        const li = document.createElement("li");
        const isActive = page.includes(link.href);
        li.innerHTML = `<a href="${link.href}"${isActive ? ' class="active"' : ""}>
            <i class="fa-solid ${link.icon}"></i>
            <span>${link.label}</span>
        </a>`;
        if (logoutLi) menu.insertBefore(li, logoutLi);
        else menu.appendChild(li);
    });

    menu.dataset.superAdminInjected = "true";
}

function applyRoleRestrictions() {
    const session = getSession();
    const role = session.role || "user";

    const badge = document.getElementById("userRoleBadge");
    if (badge) {
        if (role === "super_admin") badge.innerText = "Super Admin";
        else if (role === "admin") badge.innerText = "Administrator";
        else badge.innerText = "User";
    }

    const roleDisplay = document.getElementById("currentRoleDisplay");
    if (roleDisplay) {
        roleDisplay.value = role === "super_admin" ? "Super Admin" : (role === "admin" ? "Administrator" : "User");
    }

    const shopLabel = document.getElementById("currentShopName");
    if (shopLabel) {
        shopLabel.innerText = session.shopName || (role === "super_admin" ? "All Shops" : "");
    }

    if (role === "admin" || role === "super_admin") return;

    document.querySelectorAll('a[href="settings.html"]').forEach(link => {
        link.style.display = "none";
    });

    const userMgmt = document.getElementById("userManagementSection");
    if (userMgmt) userMgmt.style.display = "none";
}

function logout() {
    if (confirm("Are you sure you want to logout?")) {
        clearSession();
        window.location.href = "login.html";
    }
}

function openForgotPassword() {
    const modal = document.getElementById("forgotModal");
    if (modal) document.getElementById("forgotModal")&&document.getElementById("forgotModal").classList.add("show");
    else alert("Contact your Super Admin or shop administrator to reset your password.");
}

function closeForgotPassword() {
    const modal = document.getElementById("forgotModal");
    if (modal) modal.style.display = "none";
}

async function submitForgotPassword() {
    const username = (document.getElementById("forgotUsername") || {}).value;
    const email = (document.getElementById("forgotEmail") || {}).value;
    if (!username && !email) {
        alert("Enter your username or recovery email.");
        return;
    }
    alert("Password reset request noted. Please contact Super Admin / Shop Admin to reset your password.\n\nUsername: " + (username || "—"));
    closeForgotPassword();
}

window.sbLogin = sbLogin;
window.login = login;
window.checkLogin = checkLogin;
window.injectSuperAdminNav = injectSuperAdminNav;
window.applyRoleRestrictions = applyRoleRestrictions;
window.logout = logout;
window.openForgotPassword = openForgotPassword;
window.closeForgotPassword = closeForgotPassword;
window.submitForgotPassword = submitForgotPassword;
