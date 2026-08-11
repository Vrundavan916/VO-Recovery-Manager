/* ==========================================================
   VO RECOVERY MANAGER - Supabase Data Layer
   CRUD for customers, recoveries, users, shops, settings
========================================================== */

/* LOGIN is handled in auth.js (sbLogin with shop/license checks) */

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
        productName: row.product_name || "",
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
        autoReminder: row.auto_reminder !== false,
        reminderInterval: Number(row.reminder_interval_days || 3),
        lastReminderAt: row.last_reminder_at || "",
        nextReminderDate: row.next_reminder_date || "",
        dueDate: row.due_date || row.followup || "",
        agingBucket: row.aging_bucket || "",
        assignedAgentId: row.assigned_agent_id || "",
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
        product_name: c.productName || "",
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
        remarks: c.remarks || "",
        auto_reminder: c.autoReminder !== false,
        reminder_interval_days: Number(c.reminderInterval || 3),
        next_reminder_date: c.nextReminderDate || c.followup || null,
        due_date: (c.dueDate !== undefined && c.dueDate !== null && String(c.dueDate).trim() !== "") ? String(c.dueDate).slice(0, 10) : (c.followup ? String(c.followup).slice(0, 10) : null)
    };
}

async function sbGetCustomers(shopId) {
    const sb = getSupabase();
    const token = (typeof getSession === "function" && getSession().sessionToken) || "";
    if (token) {
        try {
            const { data, error } = await sb.rpc("app_get_customers", { p_token: token });
            if (!error) return (data || []).map(mapCustomerFromDb);
            console.warn("app_get_customers", error);
        } catch (e) { console.warn(e); }
    }
    if (!shopId) return [];
    const { data, error } = await sb.from("customers").select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapCustomerFromDb);
}

async function sbSaveCustomer(customer, shopId) {
    const sb = getSupabase();
    const payload = mapCustomerToDb(customer, shopId);

    // Always send due_date explicitly (never drop on update)
    if (customer.dueDate !== undefined && customer.dueDate !== null && customer.dueDate !== "") {
        payload.due_date = String(customer.dueDate).slice(0, 10);
    } else if (customer.followup) {
        payload.due_date = String(customer.followup).slice(0, 10);
    }

    // RLS: SELECT on customers is denied — do NOT use .select().single()
    const hasId = customer.id !== undefined && customer.id !== null && String(customer.id).trim() !== "";
    if (hasId) {
        const { error } = await sb
            .from("customers")
            .update({ ...payload, updated_at: new Date().toISOString() })
            .eq("id", customer.id);
        if (error) throw error;
        return mapCustomerFromDb({ ...payload, id: customer.id });
    }

    const { error } = await sb.from("customers").insert(payload);
    if (error) throw error;
    return mapCustomerFromDb(payload);
}

async function sbDeleteCustomer(id) {
    const sb = getSupabase();
    if (!id) throw new Error("Customer id missing");

    // Delete related rows first (FK) — ignore table-missing errors
    const childTables = [
        "recoveries",
        "promises_to_pay",
        "agent_activity_log",
        "escalations",
        "payment_links",
        "receipts",
        "legal_notices",
        "customer_balances",
        "reminder_queue"
    ];
    for (const table of childTables) {
        try {
            const { error } = await sb.from(table).delete().eq("customer_id", id);
            if (error) console.warn("cleanup " + table, error.message || error);
        } catch (e) {
            console.warn("cleanup " + table, e);
        }
    }

    const { error, count } = await sb.from("customers").delete({ count: "exact" }).eq("id", id);
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
    const token = (typeof getSession === "function" && getSession().sessionToken) || "";
    if (token) {
        try {
            const { data, error } = await sb.rpc("app_get_recoveries", { p_token: token });
            if (!error) {
                return (data || []).map(mapRecoveryFromDb);
            }
        } catch (e) { console.warn(e); }
    }
    if (!shopId) return [];
    const { data, error } = await sb.from("recoveries").select("*")
        .eq("shop_id", shopId)
        .order("recovery_date", { ascending: false });
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

    // RLS blocks SELECT on recoveries — skip .select().single()
    const { error } = await sb.from("recoveries").insert(payload);
    if (error) throw error;
    return mapRecoveryFromDb(payload);
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
    let q = sb.from("users").select("id, username, role, shop_id, display_name, is_active, is_field_agent, mobile, agent_code").order("username");
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
        password: (typeof hashPassword === 'function' ? await hashPassword(user.password) : user.password),
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
    const { error } = await sb.from("users").update({ password: (typeof hashPassword === 'function' ? await hashPassword(newPassword) : newPassword) }).eq("id", userId);
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
    let extra = data.extra || {};
    if (typeof extra === "string") {
        try { extra = JSON.parse(extra); } catch (e) { extra = {}; }
    }
    return {
        company: data.company_name || "",
        softwareName: data.software_name || "BK Recovery Manager",
        phone: data.phone || "",
        email: data.email || "",
        address: data.address || "",
        logoDataUrl: data.logo_data_url || "",
        recoveryEmail: data.recovery_email || "",
        executives: Array.isArray(extra.executives) ? extra.executives : ["Mukesh", "Bharat", "Office"]
    };
}

async function sbSaveSettings(shopId, settingsObj) {
    const sb = getSupabase();
    const execs = Array.isArray(settingsObj.executives)
        ? settingsObj.executives
        : ["Mukesh", "Bharat", "Office"];
    const payload = {
        shop_id: shopId,
        company_name: settingsObj.company || "",
        software_name: settingsObj.softwareName || "BK Recovery Manager",
        phone: settingsObj.phone || "",
        email: settingsObj.email || "",
        address: settingsObj.address || "",
        logo_data_url: settingsObj.logoDataUrl || null,
        recovery_email: settingsObj.recoveryEmail || "",
        extra: { executives: execs },
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

/* ---------- SYSTEM MAINTENANCE (Super Admin only) ---------- */
async function sbGetMaintenanceStatus() {
    const sb = getSupabase();
    const { data, error } = await sb.from("system_config").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    if (!data) return { enabled: false, message: "" };
    return {
        enabled: !!data.maintenance_mode,
        message: data.maintenance_message || ""
    };
}

async function sbSetMaintenanceMode(enabled, message) {
    const sb = getSupabase();
    const { data, error } = await sb
        .from("system_config")
        .upsert({
            id: 1,
            maintenance_mode: !!enabled,
            maintenance_message: message || "",
            updated_at: new Date().toISOString()
        }, { onConflict: "id" })
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
window.sbGetMaintenanceStatus = sbGetMaintenanceStatus;
window.sbSetMaintenanceMode = sbSetMaintenanceMode;
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
            password: (typeof hashPassword === 'function' ? await hashPassword(adminPassword) : adminPassword),
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
        software_name: "BK Recovery Manager",
        phone: contact || null,
        email: email || null,
        address: address || null
    }, { onConflict: "shop_id" });

    return { shop, user };
}

window.sbRegisterShop = sbRegisterShop;

/* ==========================================================
   SUPER ADMIN MODULE
   Company Management, Add Jewellery (shops), Subscriptions,
   Audit Log, System-wide Dashboard
========================================================== */

/* ---------- AUDIT LOG ---------- */
async function sbAddAuditLog(action, entityType, entityId, details, shopId) {
    try {
        const sb = getSupabase();
        const session = getSession();
        await sb.from("audit_log").insert({
            shop_id: shopId || null,
            user_id: session.userId || null,
            username: session.username || "",
            action: action,
            entity_type: entityType || "",
            entity_id: entityId ? String(entityId) : "",
            details: details || ""
        });
    } catch (e) {
        console.error("audit log failed", e);
    }
}

async function sbGetAuditLog(limit) {
    const sb = getSupabase();
    const { data, error } = await sb
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit || 100);
    if (error) throw error;
    return data || [];
}

/* ---------- SHOPS (full, incl. inactive) ---------- */
async function sbGetAllShopsFull() {
    const sb = getSupabase();
    const { data, error } = await sb.from("shops").select("*").order("name");
    if (error) throw error;
    return data || [];
}

async function sbAddShop(form) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not ready");

    const name = (form.name || "").trim();
    const code = (form.code || "").trim().toUpperCase().replace(/\s+/g, "");
    if (!name) throw new Error("Shop / Company name required");
    if (!code || code.length < 2) throw new Error("Shop code required (min 2 chars)");

    const { data: existingCode } = await sb.from("shops").select("id").eq("code", code).maybeSingle();
    if (existingCode) throw new Error("Shop code already exists. Choose another code.");

    const payload = {
        name,
        code,
        contact_number: (form.contact || "").trim() || null,
        email: (form.email || "").trim() || null,
        address: (form.address || "").trim() || null,
        plan_name: form.plan || "Basic",
        license_expiry: form.licenseExpiry || null,
        max_users: Number(form.maxUsers || 5),
        is_active: true
    };

    const { data: shop, error } = await sb.from("shops").insert(payload).select().single();
    if (error) throw error;

    // Optional: create an initial admin user for this shop
    if (form.adminUsername) {
        const adminUsername = form.adminUsername.trim();
        const adminPassword = (form.adminPassword || "1234").trim();
        const { data: existingUser } = await sb.from("users").select("id").eq("username", adminUsername).maybeSingle();
        if (!existingUser) {
            await sb.from("users").insert({
                username: adminUsername,
                password: (typeof hashPassword === 'function' ? await hashPassword(adminPassword || "ChangeMe@1234") : (adminPassword || "ChangeMe@1234")),
                role: "admin",
                shop_id: shop.id,
                display_name: form.adminName || adminUsername,
                is_active: true
            });
        }
    }

    // Settings row + starter subscription
    await sb.from("settings").upsert({
        shop_id: shop.id,
        company_name: name,
        software_name: "BK Recovery Manager",
        phone: payload.contact_number,
        email: payload.email,
        address: payload.address
    }, { onConflict: "shop_id" });

    if (form.licenseExpiry) {
        await sb.from("subscriptions").insert({
            shop_id: shop.id,
            plan_name: form.plan || "Basic",
            amount: Number(form.amount || 0),
            start_date: new Date().toISOString().split("T")[0],
            end_date: form.licenseExpiry,
            status: "active"
        });
    }

    await sbAddAuditLog("shop.create", "shop", shop.id, `Created shop "${name}" (${code})`, shop.id);
    return shop;
}

async function sbUpdateShop(shopId, form) {
    const sb = getSupabase();
    const payload = {
        name: (form.name || "").trim(),
        contact_number: (form.contact || "").trim() || null,
        email: (form.email || "").trim() || null,
        address: (form.address || "").trim() || null,
        plan_name: form.plan || "Basic",
        license_expiry: form.licenseExpiry || null,
        max_users: Number(form.maxUsers || 5)
    };
    const { data, error } = await sb.from("shops").update(payload).eq("id", shopId).select().single();
    if (error) throw error;
    await sbAddAuditLog("shop.update", "shop", shopId, `Updated shop details`, shopId);
    
    // Keep latest subscription end_date in sync with shop license
    if (form.licenseExpiry) {
        try {
            const { data: latest } = await sb.from("subscriptions")
                .select("id")
                .eq("shop_id", shopId)
                .order("end_date", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (latest && latest.id) {
                await sb.from("subscriptions").update({
                    end_date: form.licenseExpiry,
                    plan_name: form.planName || form.plan || "Basic",
                    status: "active"
                }).eq("id", latest.id);
            } else {
                await sb.from("subscriptions").insert({
                    shop_id: shopId,
                    plan_name: form.planName || form.plan || "Basic",
                    end_date: form.licenseExpiry,
                    start_date: new Date().toISOString().slice(0,10),
                    status: "active"
                });
            }
        } catch (e) { console.warn("sub sync", e); }
    }
    return data;
}

async function sbToggleShopActive(shopId, isActive) {
    const sb = getSupabase();
    const { data, error } = await sb.from("shops").update({ is_active: isActive }).eq("id", shopId).select().single();
    if (error) throw error;
    await sbAddAuditLog(isActive ? "shop.activate" : "shop.deactivate", "shop", shopId, isActive ? "Shop activated" : "Shop deactivated", shopId);
    return data;
}

async function sbDeleteShop(shopId) {
    const sb = getSupabase();
    const { error } = await sb.from("shops").delete().eq("id", shopId);
    if (error) throw error;
    await sbAddAuditLog("shop.delete", "shop", shopId, "Shop deleted", shopId);
    return true;
}

/* ---------- SUBSCRIPTIONS ---------- */
function getEffectiveLicenseExpiry(shop, sub) {
    const a = shop && shop.license_expiry ? String(shop.license_expiry).slice(0, 10) : "";
    const b = sub && sub.end_date ? String(sub.end_date).slice(0, 10) : "";
    if (a && b) return a >= b ? a : b;
    return b || a || "";
}

function computeSubStatus(endDate) {
    if (!endDate) return "unknown";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    if (isNaN(end.getTime())) return "unknown";
    end.setHours(0, 0, 0, 0);
    const days = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    if (days < 0) return "expired";
    if (days <= 15) return "expiring";
    return "active";
}

async function sbGetSubscriptionsWithShops() {
    const sb = getSupabase();
    const { data: shops, error: shopErr } = await sb.from("shops").select("*").order("name");
    if (shopErr) throw shopErr;

    const { data: subs, error: subErr } = await sb
        .from("subscriptions")
        .select("*")
        .order("end_date", { ascending: false });
    if (subErr) throw subErr;

    // latest subscription per shop
    const latestByShop = {};
    (subs || []).forEach(s => {
        if (!latestByShop[s.shop_id]) latestByShop[s.shop_id] = s;
    });

    return (shops || []).map(shop => {
        const sub = latestByShop[shop.id] || null;
        // Same rule on every page: later of shop.license_expiry vs subscription.end_date
        const a = shop.license_expiry ? String(shop.license_expiry).slice(0, 10) : "";
        const b = sub && sub.end_date ? String(sub.end_date).slice(0, 10) : "";
        let endDate = "";
        if (a && b) endDate = a >= b ? a : b;
        else endDate = b || a || null;
        // Auto-heal: if subscription is later than shop.license_expiry, trust later and update shop async
        if (endDate && shop.license_expiry && String(shop.license_expiry).slice(0,10) !== String(endDate).slice(0,10)) {
            const later = String(endDate).slice(0,10);
            if (!shop.license_expiry || later > String(shop.license_expiry).slice(0,10)) {
                sb.from("shops").update({ license_expiry: later }).eq("id", shop.id).then(() => {});
                shop.license_expiry = later;
            } else if (sub && sub.id && String(shop.license_expiry).slice(0,10) > String(sub.end_date).slice(0,10)) {
                sb.from("subscriptions").update({ end_date: shop.license_expiry }).eq("id", sub.id).then(() => {});
                endDate = shop.license_expiry;
            }
        }
        return {
            shop,
            subscription: sub,
            endDate: endDate,
            liveStatus: computeSubStatus(endDate)
        };
    });
}

async function sbRenewSubscription(shopId, form) {
    const sb = getSupabase();
    const payload = {
        shop_id: shopId,
        plan_name: form.plan || "Basic",
        amount: Number(form.amount || 0),
        start_date: new Date().toISOString().split("T")[0],
        end_date: form.endDate,
        status: "active",
        remarks: form.remarks || ""
    };
    const { data, error } = await sb.from("subscriptions").insert(payload).select().single();
    if (error) throw error;

    // keep shop row in sync for quick reads
    await sb.from("shops").update({ license_expiry: form.endDate, plan_name: form.plan || "Basic" }).eq("id", shopId);

    await sbAddAuditLog("subscription.renew", "subscription", data.id, `Renewed to ${form.plan} until ${form.endDate}`, shopId);
    return data;
}

/* ---------- SUPER ADMIN DASHBOARD STATS ---------- */
async function sbGetSuperDashboardStats() {
    const sb = getSupabase();

    const { data: shops, error: shopErr } = await sb.from("shops").select("*");
    if (shopErr) throw shopErr;

    const { data: custs, error: custErr } = await sb.from("customers").select("shop_id, outstanding");
    if (custErr) throw custErr;

    const totalShops = (shops || []).length;
    const activeShops = (shops || []).filter(s => s.is_active).length;
    const inactiveShops = totalShops - activeShops;
    const totalCustomers = (custs || []).length;
    const totalOutstanding = (custs || []).reduce((sum, c) => sum + Number(c.outstanding || 0), 0);
    const expiringSoon = (shops || []).filter(s => computeSubStatus(s.license_expiry) === "expiring").length;
    const expired = (shops || []).filter(s => computeSubStatus(s.license_expiry) === "expired").length;

    return { totalShops, activeShops, inactiveShops, totalCustomers, totalOutstanding, expiringSoon, expired, shops: shops || [] };
}

window.sbAddAuditLog = sbAddAuditLog;
window.sbGetAuditLog = sbGetAuditLog;
window.sbGetAllShopsFull = sbGetAllShopsFull;
window.sbAddShop = sbAddShop;
window.sbUpdateShop = sbUpdateShop;
window.sbToggleShopActive = sbToggleShopActive;
window.sbDeleteShop = sbDeleteShop;
window.computeSubStatus = computeSubStatus;
window.sbGetSubscriptionsWithShops = sbGetSubscriptionsWithShops;
window.sbRenewSubscription = sbRenewSubscription;
window.sbGetSuperDashboardStats = sbGetSuperDashboardStats;


async function sbMarkReminderSent(customerId, nextDate) {
    const sb = getSupabase();
    const payload = {
        last_reminder_at: new Date().toISOString(),
        next_reminder_date: nextDate || null,
        updated_at: new Date().toISOString()
    };
    const { error } = await sb.from("customers").update(payload).eq("id", customerId);
    if (error) throw error;
    return true;
}
window.sbMarkReminderSent = sbMarkReminderSent;

window.getEffectiveLicenseExpiry = getEffectiveLicenseExpiry;

/* ---------- AGING SUMMARY (RPC) ---------- */
async function sbGetAgingSummary(shopId) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not ready");
    if (!shopId) {
        return {
            total_customers: 0,
            total_outstanding: 0,
            bucket_0_30: 0,
            bucket_31_60: 0,
            bucket_61_90: 0,
            bucket_90_plus: 0,
            total_overdue: 0,
            open_ptp: 0,
            open_escalations: 0
        };
    }
    const { data, error } = await sb.rpc("shop_aging_summary", { p_shop_id: shopId });
    if (error) throw error;
    // rpc returns array of rows for RETURNS TABLE
    const row = Array.isArray(data) ? (data[0] || {}) : (data || {});
    return {
        total_customers: Number(row.total_customers || 0),
        total_outstanding: Number(row.total_outstanding || 0),
        bucket_0_30: Number(row.bucket_0_30 || 0),
        bucket_31_60: Number(row.bucket_31_60 || 0),
        bucket_61_90: Number(row.bucket_61_90 || 0),
        bucket_90_plus: Number(row.bucket_90_plus || 0),
        total_overdue: Number(row.total_overdue || 0),
        open_ptp: Number(row.open_ptp || 0),
        open_escalations: Number(row.open_escalations || 0)
    };
}
window.sbGetAgingSummary = sbGetAgingSummary;

async function sbRecalcAging(shopId) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not ready");
    const { data, error } = await sb.rpc("recalc_all_aging", { p_shop_id: shopId || null });
    if (error) throw error;
    return data;
}
window.sbRecalcAging = sbRecalcAging;

/* ---------- PROMISE TO PAY ---------- */
async function sbGetPtp(shopId, status) {
    const sb = getSupabase();
    if (!shopId) return [];
    if (!sb) throw new Error("Supabase not ready");
    let q = sb.from("promises_to_pay").select("*").order("promised_date", { ascending: true });
    if (shopId) q = q.eq("shop_id", shopId);
    if (status && status !== "all") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
}

async function sbSavePtp(row) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not ready");
    const payload = {
        shop_id: row.shop_id,
        customer_id: row.customer_id,
        agent_id: row.agent_id ? String(row.agent_id) : null,
        promised_amount: Number(row.promised_amount || 0),
        promised_date: row.promised_date,
        notes: row.notes || "",
        status: row.status || "open",
        updated_at: new Date().toISOString()
    };
    if (row.id) {
        const { data, error } = await sb.from("promises_to_pay").update(payload).eq("id", row.id).select().maybeSingle();
        if (error) throw error;
        return data;
    }
    payload.created_at = new Date().toISOString();
    payload.created_by = row.created_by ? String(row.created_by) : null;
    const { data, error } = await sb.from("promises_to_pay").insert(payload).select().maybeSingle();
    if (error) throw error;
    // denormalize on customer
    try {
        await sb.from("customers").update({
            ptp_date: payload.promised_date,
            ptp_amount: payload.promised_amount,
            ptp_notes: payload.notes
        }).eq("id", payload.customer_id);
    } catch (e) { console.warn("customer ptp fields", e); }
    return data;
}

async function sbUpdatePtpStatus(id, status, extra) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not ready");
    const payload = { status: status, updated_at: new Date().toISOString() };
    if (status === "broken") payload.broken_at = new Date().toISOString();
    if (status === "kept") {
        payload.kept_at = new Date().toISOString();
        if (extra && extra.kept_recovery_id) payload.kept_recovery_id = extra.kept_recovery_id;
    }
    const { data, error } = await sb.from("promises_to_pay").update(payload).eq("id", id).select().maybeSingle();
    if (error) throw error;
    // clear customer denorm if closed
    if (data && (status === "kept" || status === "broken" || status === "cancelled")) {
        try {
            await sb.from("customers").update({
                ptp_date: null, ptp_amount: null, ptp_notes: null
            }).eq("id", data.customer_id);
        } catch (e) {}
    }
    // escalation on broken
    if (status === "broken" && data) {
        try {
            await sb.from("escalations").insert({
                shop_id: data.shop_id,
                customer_id: data.customer_id,
                reason: "ptp_broken",
                level: 1,
                notes: "PTP broken via app. Amount: " + data.promised_amount + " Date: " + data.promised_date,
                status: "open"
            });
        } catch (e) { console.warn("escalation", e); }
    }
    return data;
}

async function sbDeletePtp(id) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not ready");
    const { error } = await sb.from("promises_to_pay").delete().eq("id", id);
    if (error) throw error;
    return true;
}

window.sbGetPtp = sbGetPtp;
window.sbSavePtp = sbSavePtp;
window.sbUpdatePtpStatus = sbUpdatePtpStatus;
window.sbDeletePtp = sbDeletePtp;

/* ---------- PHASE 2: Payment links, receipts, escalations, agents ---------- */
async function sbCreatePaymentLinkRow(row) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not ready");
    const payload = {
        shop_id: row.shop_id,
        customer_id: row.customer_id,
        amount: Number(row.amount || 0),
        currency: "INR",
        gateway: row.gateway || "upi",
        short_url: row.short_url || null,
        qr_data: row.qr_data || null,
        status: row.status || "created",
        notes: row.notes || "",
        created_by: row.created_by ? String(row.created_by) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    const { data, error } = await sb.from("payment_links").insert(payload).select().maybeSingle();
    if (error) throw error;
    return data;
}

async function sbSaveReceiptRow(row) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not ready");
    let receiptNo = row.receipt_no;
    if (!receiptNo && row.shop_id) {
        try {
            const { data: rn } = await sb.rpc("next_receipt_no", { p_shop_id: row.shop_id });
            receiptNo = rn || ("R-" + Date.now());
        } catch (e) {
            receiptNo = "R-" + Date.now();
        }
    }
    const payload = {
        shop_id: row.shop_id,
        recovery_id: row.recovery_id,
        customer_id: row.customer_id || null,
        receipt_no: receiptNo,
        amount: Number(row.amount || 0),
        pdf_url: row.pdf_url || null,
        whatsapp_sent: !!row.whatsapp_sent,
        created_at: new Date().toISOString()
    };
    const { data, error } = await sb.from("receipts").insert(payload).select().maybeSingle();
    if (error) throw error;
    return data;
}

async function sbGetEscalations(shopId, status) {
    const sb = getSupabase();
    if (!shopId) return [];
    if (!sb) throw new Error("Supabase not ready");
    let q = sb.from("escalations").select("*").order("created_at", { ascending: false });
    if (shopId) q = q.eq("shop_id", shopId);
    if (status && status !== "all") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
}

async function sbUpdateEscalation(id, patch) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not ready");
    const payload = Object.assign({}, patch, { updated_at: new Date().toISOString() });
    const { data, error } = await sb.from("escalations").update(payload).eq("id", id).select().maybeSingle();
    if (error) throw error;
    return data;
}

async function sbAssignAgent(customerId, agentId, executiveName) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not ready");
    const payload = { updated_at: new Date().toISOString() };
    if (agentId !== undefined) payload.assigned_agent_id = agentId;
    if (executiveName !== undefined) payload.executive = executiveName;
    const { data, error } = await sb.from("customers").update(payload).eq("id", customerId).select().maybeSingle();
    if (error) throw error;
    return data;
}

window.sbCreatePaymentLinkRow = sbCreatePaymentLinkRow;
window.sbSaveReceiptRow = sbSaveReceiptRow;
window.sbGetEscalations = sbGetEscalations;
window.sbUpdateEscalation = sbUpdateEscalation;
window.sbAssignAgent = sbAssignAgent;

/* ---------- PHASE 3: Activity log + analytics helpers ---------- */
async function sbAddActivity(row) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not ready");
    const payload = {
        shop_id: row.shop_id,
        agent_id: String(row.agent_id || ""),
        customer_id: row.customer_id || null,
        task_id: row.task_id || null,
        activity_type: row.activity_type || "note",
        outcome: row.outcome || "",
        notes: row.notes || "",
        gps_lat: row.gps_lat != null ? row.gps_lat : null,
        gps_lng: row.gps_lng != null ? row.gps_lng : null,
        duration_sec: row.duration_sec != null ? row.duration_sec : null,
        created_at: new Date().toISOString()
    };
    const { data, error } = await sb.from("agent_activity_log").insert(payload).select().maybeSingle();
    if (error) throw error;
    return data;
}

async function sbGetActivities(shopId, limit) {
    const sb = getSupabase();
    if (!shopId) return [];
    if (!sb) throw new Error("Supabase not ready");
    let q = sb.from("agent_activity_log").select("*").order("created_at", { ascending: false });
    if (shopId) q = q.eq("shop_id", shopId);
    if (limit) q = q.limit(limit);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
}

async function sbSaveLegalNotice(row) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not ready");
    const payload = {
        shop_id: row.shop_id,
        customer_id: row.customer_id,
        notice_type: row.notice_type || "reminder_letter",
        amount_at_issue: Number(row.amount_at_issue || 0),
        sent_via: row.sent_via || "print",
        sent_at: row.sent_at || new Date().toISOString(),
        created_by: row.created_by ? String(row.created_by) : null,
        notes: row.notes || "",
        created_at: new Date().toISOString()
    };
    const { data, error } = await sb.from("legal_notices").insert(payload).select().maybeSingle();
    if (error) throw error;
    try {
        await sb.from("customers").update({
            last_legal_notice_at: new Date().toISOString()
        }).eq("id", row.customer_id);
    } catch (e) {}
    return data;
}

window.sbAddActivity = sbAddActivity;
window.sbGetActivities = sbGetActivities;
window.sbSaveLegalNotice = sbSaveLegalNotice;



async function sbGetActivitiesByAgent(shopId, agentId, limit) {
    const sb = getSupabase();
    if (!shopId) return [];
    if (!sb) throw new Error("Supabase not ready");
    let q = sb.from("agent_activity_log").select("*").order("created_at", { ascending: false });
    if (shopId) q = q.eq("shop_id", shopId);
    if (agentId) q = q.eq("agent_id", String(agentId));
    if (limit) q = q.limit(limit);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
}
window.sbGetActivitiesByAgent = sbGetActivitiesByAgent;

async function sbSetFieldAgent(userId, isField) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not ready");
    const { data, error } = await sb.from("users").update({
        is_field_agent: !!isField
    }).eq("id", userId).select().maybeSingle();
    if (error) throw error;
    return data;
}
window.sbSetFieldAgent = sbSetFieldAgent;
