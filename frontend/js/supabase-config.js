/* ==========================================================
   VO RECOVERY MANAGER - Supabase Config
   Multi-tenant Jewellery Recovery
========================================================== */

const SUPABASE_URL = "https://tmgpajynsvpjhpgrziue.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_LSQW7TBVNoTpgL3g8ccnaw_fYZJrbVh";

// Global client (created after supabase-js loads)
let supabaseClient = null;

function getSupabase() {
    if (supabaseClient) return supabaseClient;
    if (typeof supabase === "undefined" || !supabase.createClient) {
        console.error("Supabase SDK not loaded");
        return null;
    }
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseClient;
}

// Session helpers (sessionStorage only – no data in localStorage)
const SESSION_KEYS = {
    loggedIn: "vo_isLoggedIn",
    userId: "vo_userId",
    username: "vo_username",
    role: "vo_role",
    shopId: "vo_shopId",
    shopName: "vo_shopName",
    displayName: "vo_displayName"
};

function setSession(user, shop) {
    sessionStorage.setItem(SESSION_KEYS.loggedIn, "true");
    sessionStorage.setItem(SESSION_KEYS.userId, user.id || "");
    sessionStorage.setItem(SESSION_KEYS.username, user.username || "");
    sessionStorage.setItem(SESSION_KEYS.role, user.role || "user");
    sessionStorage.setItem(SESSION_KEYS.shopId, user.shop_id || "");
    sessionStorage.setItem(SESSION_KEYS.shopName, (shop && shop.name) || "");
    sessionStorage.setItem(SESSION_KEYS.displayName, user.display_name || user.username || "");
}

function clearSession() {
    Object.values(SESSION_KEYS).forEach(k => sessionStorage.removeItem(k));
}

function getSession() {
    return {
        isLoggedIn: sessionStorage.getItem(SESSION_KEYS.loggedIn) === "true",
        userId: sessionStorage.getItem(SESSION_KEYS.userId) || "",
        username: sessionStorage.getItem(SESSION_KEYS.username) || "",
        role: sessionStorage.getItem(SESSION_KEYS.role) || "user",
        shopId: sessionStorage.getItem(SESSION_KEYS.shopId) || "",
        shopName: sessionStorage.getItem(SESSION_KEYS.shopName) || "",
        displayName: sessionStorage.getItem(SESSION_KEYS.displayName) || ""
    };
}

function isSuperAdmin() {
    return getSession().role === "super_admin";
}

function currentShopId() {
    return getSession().shopId || null;
}

window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
window.getSupabase = getSupabase;
window.setSession = setSession;
window.clearSession = clearSession;
window.getSession = getSession;
window.isSuperAdmin = isSuperAdmin;
window.currentShopId = currentShopId;
