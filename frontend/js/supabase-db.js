/* ==========================================================
   VO RECOVERY MANAGER - Supabase Data Layer
   CRUD for customers, recoveries, users, shops, settings
========================================================== */

/* ---------- LOGIN ---------- */
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
        const { data: s } = await sb.from("shops").select("*").eq("id", data.shop_id).maybeSingle();
        shop = s;
    }

    setSession(data, shop);
    return { user: data, shop };
}

/* ---------- SHOPS ---------- */
async function sbGetShops() {
    const sb = getSupabase();
    const { data, error } = await sb.from("shops").select("*").eq("is_active", true).order("name");
    if (error) throw error;
    return data || [];
}

/* ---------- CUSTOMERS ---------- */
function mapCustomerFromDb(row) {
    if (!row) return null;
    return {
        id: row.id,
        shop_id: row.shop_id,
        name: row.name || "",
        father: row.father || "",
        mobile: row.mobile || "",
        altMobile: row.alt_mobile || "",
        village: row.village || "",
        taluka: row.taluka || "",
        district: row.district || "",
        address: row.address || "",
        aadhaar: row.aadhaar || "",
        pan: row.pan || "",
        bill: Number(row.bill || 0),
        down: Number(row.down_payment || 0),
        outstanding: Number(row.outstanding || 0),
        executive: row.executive || "",
        followup: row.followup || "",
        status: row.status || "Active",
        priority: row.priority || "Low",
        remarks: row.remarks || "",
        photo_url: row.photo_url || "",
        aadhaar_photo_url: row.aadhaar_photo_url || "",
        pan_photo_url: row.pan_photo_url || "",
        created_at: row.created_at
    };
}

function mapCustomerToDb(c, shopId) {
    return {
        shop_id: shopId || c.shop_id,
        name: c.name || "",
        father: c.father || "",
        mobile: c.mobile || "",
        alt_mobile: c.altMobile || "",
        village: c.village || "",
        taluka: c.taluka || "",
        district: c.district || "",
        address: c.address || "",
        aadhaar: c.aadhaar || "",
        pan: c.pan || "",
        bill: Number(c.bill || 0),
        down_payment: Number(c.down || 0),
        outstanding: Number(c.outstanding || 0),
        executive: c.executive || "",
        followup: c.followup || null,
        status: c.status || "Active",
        priority: c.priority || "Low",
        remarks: c.remarks || ""
    };
}

async function sbGetCustomers(shopId) {
    const sb = getSupabase();
    let q = sb.from("customers").select("*").order("created_at", { ascending: false });
    if (shopId) q = q.eq("shop_id", shopId);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(mapCustomerFromDb);
}

async function sbSaveCustomer(customer, shopId) {
    const sb = getSupabase();
    const payload = mapCustomerToDb(customer, shopId);

    if (customer.id && String(customer.id).length > 10) {
        // update
        const { data, error } = await sb
            .from("customers")
            .update({ ...payload, updated_at: new Date().toISOString() })
            .eq("id", customer.id)
            .select()
            .single();
        if (error) throw error;
        return mapCustomerFromDb(data);
    } else {
        // insert
        const { data, error } = await sb
            .from("customers")
            .insert(payload)
            .select()
            .single();
        if (error) throw error;
        return mapCustomerFromDb(data);
    }
}

async function sbDeleteCustomer(id) {
    const sb = getSupabase();
    const { error } = await sb.from("customers").delete().eq("id", id);
    if (error) throw error;
    return true;
}

/* ---------- RECOVERIES ---------- */
function mapRecoveryFromDb(row) {
    if (!row) return null;
    return {
        id: row.id,
        shop_id: row.shop_id,
        customerId: row.customer_id,
        amount: Number(row.amount || 0),
        date: row.recovery_date || "",
        paymentMode: row.payment_mode || "Cash",
        receiptNo: row.receipt_no || "",
        collectedBy: row.collected_by || "",
        remarks: row.remarks || "",
        created_at: row.created_at
    };
}

async function sbGetRecoveries(shopId) {
    const sb = getSupabase();
    let q = sb.from("recoveries").select("*").order("recovery_date", { ascending: false });
    if (shopId) q = q.eq("shop_id", shopId);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(mapRecoveryFromDb);
}

async function sbSaveRecovery(recovery, shopId) {
    const sb = getSupabase();
    const payload = {
        shop_id: shopId || recovery.shop_id,
        customer_id: recovery.customerId,
        amount: Number(recovery.amount || 0),
        recovery_date: recovery.date || new Date().toISOString().split("T")[0],
        payment_mode: recovery.paymentMode || "Cash",
        receipt_no: recovery.receiptNo || "",
        collected_by: recovery.collectedBy || "",
        remarks: recovery.remarks || ""
    };

    const { data, error } = await sb.from("recoveries").insert(payload).select().single();
    if (error) throw error;
    return mapRecoveryFromDb(data);
}

async function sbDeleteRecovery(id) {
    const sb = getSupabase();
    const { error } = await sb.from("recoveries").delete().eq("id", id);
    if (error) throw error;
    return true;
}

async function sbUpdateCustomerOutstanding(customerId, newOutstanding) {
    const sb = getSupabase();
    const { error } = await sb
        .from("customers")
        .update({ outstanding: Math.max(0, Number(newOutstanding)), updated_at: new Date().toISOString() })
        .eq("id", customerId);
    if (error) throw error;
    return true;
}

/* ---------- USERS ---------- */
async function sbGetUsers(shopId) {
    const sb = getSupabase();
    let q = sb.from("users").select("id, username, role, shop_id, display_name, is_active").order("username");
    if (shopId) q = q.eq("shop_id", shopId);
    // Super admin can see all; shop admin sees only own shop
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
}

async function sbAddUser(user) {
    const sb = getSupabase();
    const payload = {
        username: user.username,
        password: user.password,
        role: user.role || "user",
        shop_id: user.shop_id || currentShopId(),
        display_name: user.display_name || user.username
    };
    const { data, error } = await sb.from("users").insert(payload).select().single();
    if (error) throw error;
    return data;
}

async function sbDeleteUser(userId) {
    const sb = getSupabase();
    const { error } = await sb.from("users").delete().eq("id", userId);
    if (error) throw error;
    return true;
}

async function sbUpdateUserPassword(userId, newPassword) {
    const sb = getSupabase();
    const { error } = await sb.from("users").update({ password: newPassword }).eq("id", userId);
    if (error) throw error;
    return true;
}

async function sbUpdateUsername(userId, newUsername) {
    const sb = getSupabase();
    const { error } = await sb.from("users").update({ username: newUsername }).eq("id", userId);
    if (error) throw error;
    return true;
}

/* ---------- SETTINGS ---------- */
async function sbGetSettings(shopId) {
    const sb = getSupabase();
    if (!shopId) return {};
    const { data, error } = await sb.from("settings").select("*").eq("shop_id", shopId).maybeSingle();
    if (error) throw error;
    if (!data) return {};
    return {
        company: data.company_name || "",
        softwareName: data.software_name || "VO Recovery Manager",
        phone: data.phone || "",
        email: data.email || "",
        address: data.address || "",
        logoDataUrl: data.logo_data_url || "",
        recoveryEmail: data.recovery_email || ""
    };
}

async function sbSaveSettings(shopId, settingsObj) {
    const sb = getSupabase();
    const payload = {
        shop_id: shopId,
        company_name: settingsObj.company || "",
        software_name: settingsObj.softwareName || "VO Recovery Manager",
        phone: settingsObj.phone || "",
        email: settingsObj.email || "",
        address: settingsObj.address || "",
        logo_data_url: settingsObj.logoDataUrl || null,
        recovery_email: settingsObj.recoveryEmail || "",
        updated_at: new Date().toISOString()
    };
    const { data, error } = await sb
        .from("settings")
        .upsert(payload, { onConflict: "shop_id" })
        .select()
        .single();
    if (error) throw error;
    return data;
}

/* ---------- BULK IMPORT ---------- */
async function sbBulkInsertCustomers(list, shopId) {
    const sb = getSupabase();
    const rows = list.map(c => mapCustomerToDb(c, shopId));
    // Insert in chunks of 50
    const results = [];
    for (let i = 0; i < rows.length; i += 50) {
        const chunk = rows.slice(i, i + 50);
        const { data, error } = await sb.from("customers").insert(chunk).select();
        if (error) throw error;
        results.push(...(data || []).map(mapCustomerFromDb));
    }
    return results;
}

/* ---------- STATUS UI ---------- */
function updateSupabaseStatusUI(online, text) {
    const el = document.getElementById("firebaseStatus");
    if (el) {
        el.innerHTML = text || (online ? "Online" : "Offline");
        el.style.color = online ? "#16a34a" : "#ef4444";
    }
    const badge = document.getElementById("dbStatusBadge");
    if (badge) {
        badge.innerHTML = online ? "Supabase Online" : "Offline";
        badge.className = online ? "badge badge-success" : "badge badge-warning";
    }
}

async function supabaseBoot() {
    try {
        const sb = getSupabase();
        if (!sb) {
            updateSupabaseStatusUI(false, "SDK Missing");
            return false;
        }
        // lightweight ping
        const { error } = await sb.from("shops").select("id").limit(1);
        if (error) {
            console.error("Supabase boot error", error);
            updateSupabaseStatusUI(false, "Error");
            return false;
        }
        updateSupabaseStatusUI(true, "Online");
        return true;
    } catch (e) {
        console.error(e);
        updateSupabaseStatusUI(false, "Error");
        return false;
    }
}

// Export
window.sbLogin = sbLogin;
window.sbGetShops = sbGetShops;
window.sbGetCustomers = sbGetCustomers;
window.sbSaveCustomer = sbSaveCustomer;
window.sbDeleteCustomer = sbDeleteCustomer;
window.sbGetRecoveries = sbGetRecoveries;
window.sbSaveRecovery = sbSaveRecovery;
window.sbDeleteRecovery = sbDeleteRecovery;
window.sbUpdateCustomerOutstanding = sbUpdateCustomerOutstanding;
window.sbGetUsers = sbGetUsers;
window.sbAddUser = sbAddUser;
window.sbDeleteUser = sbDeleteUser;
window.sbUpdateUserPassword = sbUpdateUserPassword;
window.sbUpdateUsername = sbUpdateUsername;
window.sbGetSettings = sbGetSettings;
window.sbSaveSettings = sbSaveSettings;
window.sbBulkInsertCustomers = sbBulkInsertCustomers;
window.supabaseBoot = supabaseBoot;
window.mapCustomerFromDb = mapCustomerFromDb;
window.mapRecoveryFromDb = mapRecoveryFromDb;

/* ---------- COMPANY / SHOP REGISTRATION ---------- */
async function sbRegisterShop(form) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not ready");

    const companyName = (form.companyName || "").trim();
    const code = (form.code || "").trim().toUpperCase().replace(/\s+/g, "");
    const contact = (form.contact || "").trim();
    const email = (form.email || "").trim();
    const address = (form.address || "").trim();
    const adminUsername = (form.adminUsername || "").trim();
    const adminPassword = (form.adminPassword || "").trim();
    const adminName = (form.adminName || adminUsername).trim();

    if (!companyName) throw new Error("Company name required");
    if (!code || code.length < 2) throw new Error("Shop code required (min 2 chars, e.g. VO, RJ)");
    if (!adminUsername) throw new Error("Admin username required");
    if (!adminPassword || adminPassword.length < 4) throw new Error("Admin password min 4 characters");

    // Check code unique
    const { data: existingCode } = await sb.from("shops").select("id").eq("code", code).maybeSingle();
    if (existingCode) throw new Error("Shop code already exists. Choose another code.");

    // Check username unique
    const { data: existingUser } = await sb.from("users").select("id").eq("username", adminUsername).maybeSingle();
    if (existingUser) throw new Error("Username already taken. Choose another.");

    // 1) Create shop
    const { data: shop, error: shopErr } = await sb
        .from("shops")
        .insert({
            name: companyName,
            code: code,
            contact_number: contact || null,
            email: email || null,
            address: address || null,
            is_active: true
        })
        .select()
        .single();
    if (shopErr) throw shopErr;

    // 2) Create admin user for this shop
    const { data: user, error: userErr } = await sb
        .from("users")
        .insert({
            username: adminUsername,
            password: adminPassword,
            role: "admin",
            shop_id: shop.id,
            display_name: adminName,
            is_active: true
        })
        .select()
        .single();
    if (userErr) {
        // rollback shop if user fails
        await sb.from("shops").delete().eq("id", shop.id);
        throw userErr;
    }

    // 3) Create settings row
    await sb.from("settings").upsert({
        shop_id: shop.id,
        company_name: companyName,
        software_name: "VO Recovery Manager",
        phone: contact || null,
        email: email || null,
        address: address || null
    }, { onConflict: "shop_id" });

    return { shop, user };
}

window.sbRegisterShop = sbRegisterShop;
