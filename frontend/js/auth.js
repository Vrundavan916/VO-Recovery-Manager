/* ==========================================================
   BK Recovery Manager – Authentication
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
            return { error: "shop_inactive", message: "This shop has been deactivated. Please contact the Super Admin." };
        }
        if (shop && shop.license_expiry) {
            const st = (typeof computeSubStatus === "function")
                ? computeSubStatus(shop.license_expiry)
                : "unknown";
            if (st === "expired" && data.role !== "super_admin") {
                return {
                    error: "license_expired",
                    message: "This shop's license has expired.\n\nLogin is blocked.\nPlease contact the Super Admin to renew via the Subscription page."
                };
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
            showLoginError("Invalid Username or Password");
            return;
        }
        if (result.error) {
            showLoginError(result.message || result.error);
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
        showLoginError(e.message || "Login failed. Please check your network / Supabase connection.");
    } finally {
        if (btn) {
            btn.disabled = false;
            if (btn.dataset._old) btn.innerHTML = btn.dataset._old;
        }
    }
}

async function checkLogin() {
    const page = window.location.pathname;
    if (page.includes("login.html") || page.includes("maintenance.html") || page.endsWith("/") || page.endsWith("/frontend")) return;

    const session = getSession();
    if (!session.isLoggedIn) {
        window.location.href = "login.html";
        return;
    }

    const role = session.role;

    // Super Admin should never see individual shop/customer data (privacy/trust).
    // Only Super Dashboard (aggregate numbers), Company Management, Subscription allowed.
    // NOTE: check "/dashboard.html" (leading slash) so it does NOT match "super-dashboard.html".
    const superAdminBlockedPages = ["/dashboard.html", "customers.html", "recovery.html", "reports.html"];
    if (role === "super_admin" && !page.includes("super-dashboard.html") && superAdminBlockedPages.some(p => page.includes(p))) {
        alert("Super Admin cannot view shop-level customer data (privacy policy). Redirecting to Super Dashboard.");
        window.location.href = "super-dashboard.html";
        return;
    }

    if (role !== "super_admin") {
        try {
            const status = await sbGetMaintenanceStatus();
            if (status.enabled) {
                sessionStorage.setItem("bk_maintenance_message", status.message || "");
                window.location.href = "maintenance.html";
                return;
            }
        } catch (e) { console.error("maintenance check failed", e); }
    }

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

    if (role === "super_admin") {
        // Hide shop-level data links from Super Admin (privacy - no customer PII access)
        ["dashboard.html", "customers.html", "recovery.html", "reports.html"].forEach(href => {
            document.querySelectorAll('a[href="' + href + '"]').forEach(link => {
                const li = link.closest("li");
                if (li) li.style.display = "none";
                else link.style.display = "none";
            });
        });
        return;
    }

    if (role === "admin") return;

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
    if (!modal) {
        alert("Forgot Password form not found.");
        return;
    }
    modal.classList.add("show");
    modal.style.display = "flex";
    ["forgotUsername","forgotEmail","forgotNewPass","forgotConfirmPass"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}

function closeForgotPassword() {
    const modal = document.getElementById("forgotModal");
    if (!modal) return;
    modal.classList.remove("show");
    modal.style.display = "none";
}

async function submitForgotPassword() {
    const username = (document.getElementById("forgotUsername")?.value || "").trim();
    const email = (document.getElementById("forgotEmail")?.value || "").trim().toLowerCase();
    const newPass = document.getElementById("forgotNewPass")?.value || "";
    const confirmPass = document.getElementById("forgotConfirmPass")?.value || "";

    if (!username) {
        alert("Please enter username.");
        return;
    }
    if (!email) {
        alert("Please enter recovery email.\n\nUse the Recovery Email saved in Settings.");
        return;
    }
    if (!newPass || newPass.length < 4) {
        alert("New password minimum 4 characters.");
        return;
    }
    if (newPass !== confirmPass) {
        alert("New password and confirm password do not match.");
        return;
    }

    try {
        const sb = getSupabase();
        if (!sb) {
            alert("Cloud connection fail.");
            return;
        }

        const { data: user, error } = await sb
            .from("users")
            .select("id, username, role, shop_id, recovery_email, is_active")
            .eq("username", username)
            .maybeSingle();

        if (error) throw error;
        if (!user) {
            alert("Username not found.");
            return;
        }
        if (user.is_active === false) {
            alert("Account is inactive. Please contact the Super Admin.");
            return;
        }

        // Allowed emails: user recovery + shop register email + settings emails
        const allowed = new Set();
        if (user.recovery_email) {
            allowed.add(String(user.recovery_email).trim().toLowerCase());
        }
        if (user.shop_id) {
            const { data: shop } = await sb.from("shops")
                .select("email")
                .eq("id", user.shop_id)
                .maybeSingle();
            if (shop && shop.email) {
                allowed.add(String(shop.email).trim().toLowerCase());
            }
            const { data: st } = await sb.from("settings")
                .select("recovery_email, email")
                .eq("shop_id", user.shop_id)
                .maybeSingle();
            if (st) {
                if (st.recovery_email) allowed.add(String(st.recovery_email).trim().toLowerCase());
                if (st.email) allowed.add(String(st.email).trim().toLowerCase());
            }
        }
        if (user.role === "super_admin") {
            const { data: shops } = await sb.from("shops").select("email").limit(50);
            (shops || []).forEach(sh => {
                if (sh.email) allowed.add(String(sh.email).trim().toLowerCase());
            });
            const { data: anySt } = await sb.from("settings").select("recovery_email, email").limit(50);
            (anySt || []).forEach(x => {
                if (x.recovery_email) allowed.add(String(x.recovery_email).trim().toLowerCase());
                if (x.email) allowed.add(String(x.email).trim().toLowerCase());
            });
        }
        allowed.delete("");
        if (!allowed.size) {
            alert("No registered email for this account.\nAdd the shop Email in Company Management.");
            return;
        }
        if (!allowed.has(email)) {
            alert("Email does not match.\nUse the email saved at company registration.");
            return;
        }

        const { error: upErr } = await sb
            .from("users")
            .update({ password: newPass })
            .eq("id", user.id);

        if (upErr) throw upErr;

        alert("✅ Password reset successful!\n\nUsername: " + username + "\nPlease login with the new password.");
        closeForgotPassword();
        const passInput = document.getElementById("password") || document.querySelector('input[type="password"]');
        const userInput = document.getElementById("username") || document.querySelector('input[type="text"]');
        if (userInput) userInput.value = username;
        if (passInput) passInput.value = "";
    } catch (e) {
        console.error(e);
        alert("Reset failed: " + (e.message || e));
    }
}

window.openForgotPassword = openForgotPassword;
window.closeForgotPassword = closeForgotPassword;
window.submitForgotPassword = submitForgotPassword;


function showLoginError(msg) {
    let box = document.getElementById("loginErrorBox");
    if (!box) {
        box = document.createElement("div");
        box.id = "loginErrorBox";
        box.style.cssText = "margin-top:14px;padding:12px 14px;border-radius:12px;background:#fef2f2;color:#b91c1c;font-size:13px;text-align:left;border:1px solid #fecaca;white-space:pre-line;";
        const card = document.querySelector(".login-card") || document.body;
        const btn = document.getElementById("loginBtn");
        if (btn && btn.parentNode) btn.parentNode.insertBefore(box, btn.nextSibling);
        else card.appendChild(box);
    }
    box.textContent = msg;
    box.style.display = "block";
    try { alert(msg); } catch (e) {}
}
window.showLoginError = showLoginError;
