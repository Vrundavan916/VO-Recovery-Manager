/* ==========================================================
   VO RECOVERY MANAGER
   app.js – Core application logic (customers, recovery, reports, settings)
==========================================================*/

// In-memory cache (loaded from Supabase)
let customers = [];
let recoveries = [];
let settings = {};
let editIndex = -1;
let editCustomerId = null;

// ================================
// Login
// ================================




// ================================
// Super Admin sidebar links
// (injected on every page when role === super_admin)
// ================================






// ================================
// Customer Modal
// ================================
function openModal() {
    const modal = document.getElementById("customerModal");
    if (modal) modal.style.display = "block";
}

function closeModal() {
    const modal = document.getElementById("customerModal");
    if (modal) modal.style.display = "none";
    const form = document.getElementById("customerForm");
    if (form) form.reset();
    const outstanding = document.getElementById("outstanding");
    if (outstanding) outstanding.value = "";
    editIndex = -1;
    editCustomerId = null;
}

window.onclick = function (event) {
    const modal = document.getElementById("customerModal");
    if (modal && event.target === modal) closeModal();
};

// ================================
// Outstanding calc
// ================================
const billInput = document.getElementById("billAmount");
const downInput = document.getElementById("downPayment");
if (billInput && downInput) {
    billInput.addEventListener("input", calculateOutstanding);
    downInput.addEventListener("input", calculateOutstanding);
}

function calculateOutstanding() {
    const bill = parseFloat(document.getElementById("billAmount")?.value) || 0;
    const down = parseFloat(document.getElementById("downPayment")?.value) || 0;
    let outstanding = Math.max(0, bill - down);
    const outBox = document.getElementById("outstanding");
    if (outBox) outBox.value = outstanding;
}

function validateCustomerForm() {
    const name = document.getElementById("customerName");
    const mobile = document.getElementById("mobile");
    const billAmount = document.getElementById("billAmount");

    if (!name || name.value.trim() === "") {
        alert("Please Enter Customer Name");
        if (name) name.focus();
        return false;
    }
    if (!mobile || mobile.value.trim() === "") {
        alert("Please Enter Mobile Number");
        if (mobile) mobile.focus();
        return false;
    }
    if (mobile.value.trim().length < 10) {
        alert("Mobile Number Must Be 10 Digits");
        mobile.focus();
        return false;
    }
    if (billAmount && billAmount.value.trim() === "") {
        alert("Please Enter Bill Amount");
        billAmount.focus();
        return false;
    }
    return true;
}

function getCustomerData() {
    return {
        id: editCustomerId || null,
        name: document.getElementById("customerName")?.value || "",
        father: document.getElementById("fatherName")?.value || "",
        mobile: document.getElementById("mobile")?.value || "",
        altMobile: document.getElementById("altMobile")?.value || "",
        village: document.getElementById("village")?.value || "",
        taluka: document.getElementById("taluka")?.value || "",
        district: document.getElementById("district")?.value || "",
        address: document.getElementById("address")?.value || "",
        bill: document.getElementById("billAmount")?.value || 0,
        down: document.getElementById("downPayment")?.value || 0,
        outstanding: document.getElementById("outstanding")?.value || 0,
        executive: document.getElementById("executive")?.value || "",
        followup: document.getElementById("followup")?.value || "",
        remarks: document.getElementById("remarks")?.value || "",
        autoReminder: document.getElementById("autoReminder") ? document.getElementById("autoReminder").checked : true,
        reminderInterval: Number(document.getElementById("reminderInterval")?.value || 3),
        dueDate: document.getElementById("followup")?.value || "",
        nextReminderDate: document.getElementById("followup")?.value || ""
    };
}

// ================================
// Save Customer
// ================================
async function saveCustomer() {
    if (!validateCustomerForm()) return;

    const customer = getCustomerData();
    let finalShopId = currentShopId();

    if (!finalShopId && !isSuperAdmin()) {
        alert("No shop assigned. Contact Super Admin.");
        return;
    }

    if (isSuperAdmin() && !finalShopId) {
        alert("Super Admin: login as a shop admin to add customers for a specific shop, or set shop context.");
        return;
    }

    try {
        await sbSaveCustomer(customer, finalShopId);
        closeModal();
        await reloadAllData();
        alert("Customer Saved Successfully.");
    } catch (e) {
        console.error(e);
        alert("Save failed: " + (e.message || e));
    }
}

function clearCustomerForm() {
    const form = document.getElementById("customerForm");
    if (form) form.reset();
    const outstanding = document.getElementById("outstanding");
    if (outstanding) outstanding.value = "";
    editIndex = -1;
    editCustomerId = null;
}

// ================================
// Load Customers
// ================================
function loadCustomers() {
    const tbody = document.getElementById("customerBody");
    if (!tbody) return;

    const session = getSession();
    const role = session.role || "user";

    tbody.innerHTML = "";

    customers.forEach((customer, index) => {
        const deleteButton = (role === "admin" || role === "super_admin")
            ? `<button onclick="deleteCustomer(${index})" title="Delete">🗑️</button>`
            : "";
        const hasMobile = !!(customer.mobile && String(customer.mobile).replace(/\D/g, "").length >= 10);
        const waBtn = hasMobile
            ? `<button type="button" onclick="sendWhatsAppReminder(${index})" title="WhatsApp Due Reminder"
                style="display:inline-flex;align-items:center;gap:4px;background:#25D366;color:#fff;border:none;border-radius:16px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;margin:2px;box-shadow:0 2px 8px rgba(37,211,102,.4);">
                💬 WA Due
               </button>`
            : `<button type="button" disabled title="Mobile number joiye"
                style="display:inline-flex;background:#94a3b8;color:#fff;border:none;border-radius:16px;padding:6px 10px;font-size:11px;margin:2px;opacity:.7;">
                💬 No Mob
               </button>`;

        tbody.innerHTML += `
        <tr>
            <td>${index + 1}</td>
            <td>${customer.name}</td>
            <td>${customer.mobile || "-"}</td>
            <td>${customer.village || ""}</td>
            <td>₹${Number(customer.outstanding || 0).toLocaleString("en-IN")}</td>
            <td>${customer.followup || ""}${customer.autoReminder === false ? " 🔕" : ""}</td>
            <td style="white-space:nowrap;">
                <button onclick="viewCustomer(${index})" title="View">👁</button>
                <button onclick="editCustomer(${index})" title="Edit">✏️</button>
                ${waBtn}
                ${deleteButton}
            </td>
        </tr>`;
    });
}

// ================================
// Edit / Delete / Search / View
// ================================
function editCustomer(index) {
    editIndex = index;
    const c = customers[index];
    editCustomerId = c.id;

    document.getElementById("customerName").value = c.name || "";
    const pn = document.getElementById("productName"); if (pn) pn.value = c.productName || "";
    document.getElementById("fatherName").value = c.father || "";
    document.getElementById("mobile").value = c.mobile || "";
    document.getElementById("altMobile").value = c.altMobile || "";
    document.getElementById("village").value = c.village || "";
    document.getElementById("taluka").value = c.taluka || "";
    document.getElementById("district").value = c.district || "";
    document.getElementById("address").value = c.address || "";
    document.getElementById("billAmount").value = c.bill || 0;
    document.getElementById("downPayment").value = c.down || 0;
    document.getElementById("outstanding").value = c.outstanding || 0;
    document.getElementById("executive").value = c.executive || "";
    document.getElementById("followup").value = c.followup || "";
    document.getElementById("remarks").value = c.remarks || "";

    openModal();
}

async function deleteCustomer(index) {
    const session = getSession();
    if (session.role !== "admin" && session.role !== "super_admin") {
        alert("Only Admin Can Delete Records.");
        return;
    }
    if (!confirm("Delete this customer permanently?")) return;

    const removed = customers[index];
    try {
        await sbDeleteCustomer(removed.id);
        await reloadAllData();
    } catch (e) {
        console.error(e);
        alert("Delete failed: " + (e.message || e));
    }
}

function searchCustomer() {
    const keyword = (document.getElementById("searchCustomer")?.value || "").toLowerCase();
    const rows = document.querySelectorAll("#customerBody tr");
    rows.forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(keyword) ? "" : "none";
    });
}

function viewCustomer(index) {
    const c = customers[index];
    const msg =
`Customer Details

Customer : ${c.name}
Father : ${c.father}
Mobile : ${c.mobile}
Alternate : ${c.altMobile}
Village : ${c.village}
Taluka : ${c.taluka}
District : ${c.district}
Address :
${c.address}
Bill Amount : ₹${c.bill}
Down Payment : ₹${c.down}
Outstanding : ₹${c.outstanding}
Executive : ${c.executive}
Follow-up : ${c.followup}
Remarks :
${c.remarks}
`;
    if (Number(c.outstanding || 0) > 0 && c.mobile) {
        if (confirm(msg + "\n\nSend WhatsApp dues reminder?")) {
            sendWhatsAppReminder(index);
        }
    } else {
        alert(msg);
    }
}


// ================================
// WhatsApp Dues Reminder
// ================================
function normalizeWhatsAppNumber(mobile) {
    let n = String(mobile || "").replace(/\D/g, "");
    if (!n) return "";
    if (n.length === 10) n = "91" + n;
    if (n.startsWith("0") && n.length === 11) n = "91" + n.slice(1);
    return n;
}

function buildWhatsAppReminderMessage(customer) {
    const session = (typeof getSession === "function") ? getSession() : {};
    const shopName = (session.shopName)
        || (typeof settings !== "undefined" && settings.company)
        || "Jewellery Shop";
    const name = customer.name || "Customer";
    const outstanding = Number(customer.outstanding || 0).toLocaleString("en-IN");
    const bill = Number(customer.bill || 0).toLocaleString("en-IN");
    const phone = (typeof settings !== "undefined" && settings.phone) ? settings.phone : "";
    const lines = [
        "🙏 Namaste " + name + " ji,",
        "",
        "*" + shopName + "* – Payment Reminder",
        "",
        "Your account has *outstanding dues* pending.",
        "",
        "📋 Bill Amount: ₹" + bill,
        "💰 *Pending Dues: ₹" + outstanding + "*",
        "",
        "Please make payment soon to clear your account.",
        "After payment, contact the shop for receipt / update.",
        phone ? ("📞 " + phone) : "",
        "",
        "Dhanyavaad,",
        shopName,
        "_Powered by BK Recovery Manager_"
    ].filter(Boolean);
    return lines.join("\n");
}

function sendWhatsAppReminder(index) {
    const customer = (typeof customers !== "undefined") ? customers[index] : null;
    if (!customer) {
        alert("Customer not found");
        return;
    }
    const phone = normalizeWhatsAppNumber(customer.mobile);
    if (!phone || phone.length < 12) {
        alert("Valid mobile number not found. Enter a 10-digit mobile on the customer.");
        return;
    }
    const amt = Number(customer.outstanding || 0);
    if (amt <= 0) {
        if (!confirm("Outstanding is ₹0. Still send reminder?")) return;
    }
    const text = buildWhatsAppReminderMessage(customer);
    const url = "https://wa.me/" + phone + "?text=" + encodeURIComponent(text);
    window.open(url, "_blank", "noopener,noreferrer");
}

window.sendWhatsAppReminder = sendWhatsAppReminder;
window.normalizeWhatsAppNumber = normalizeWhatsAppNumber;
window.buildWhatsAppReminderMessage = buildWhatsAppReminderMessage;

// ================================
// WhatsApp reminder schedule (due + every N days)
// Full auto-send needs Meta WhatsApp Cloud API + cron.
// Here: detect due list + one-click / sequential send + mark sent.
// ================================
function addDaysISO(dateStr, days) {
    const d = new Date(dateStr || new Date());
    if (isNaN(d.getTime())) return todayISO();
    d.setDate(d.getDate() + Number(days || 3));
    return d.toISOString().split("T")[0];
}

function getDueReminderCustomers() {
    const today = todayISO();
    return (customers || []).filter(c => {
        if (c.autoReminder === false) return false;
        if (Number(c.outstanding || 0) <= 0) return false;
        if (!c.mobile) return false;
        const due = c.dueDate || c.followup || c.nextReminderDate;
        if (!due) return false;
        // due today or past, and (no last sent OR next_reminder_date <= today)
        if (due > today && (!c.nextReminderDate || c.nextReminderDate > today)) {
            // only if next_reminder_date is set and due
            if (c.nextReminderDate && c.nextReminderDate <= today) return true;
            return false;
        }
        if (due <= today) {
            if (!c.nextReminderDate || c.nextReminderDate <= today) return true;
        }
        return false;
    });
}

async function processWhatsAppReminders(autoOpen) {
    const list = getDueReminderCustomers();
    if (!list.length) {
        alert("No auto-reminders pending today.\n\n• Outstanding > 0\n• Auto Reminder ON\n• Follow-up / Due date today or past");
        return;
    }
    if (!confirm(list.length + " customer(s) — send WhatsApp due reminder?\n\nOK = WhatsApp will open one by one.")) return;

    for (let i = 0; i < list.length; i++) {
        const c = list[i];
        const idx = customers.findIndex(x => x.id === c.id);
        if (idx < 0) continue;
        sendWhatsAppReminder(idx);
        const interval = Number(c.reminderInterval || 3);
        const next = addDaysISO(todayISO(), interval);
        try {
            if (typeof sbMarkReminderSent === "function") {
                await sbMarkReminderSent(c.id, next);
            }
            c.lastReminderAt = new Date().toISOString();
            c.nextReminderDate = next;
        } catch (e) {
            console.error(e);
        }
        if (i < list.length - 1) {
            await new Promise(r => setTimeout(r, 1500));
        }
    }
    alert("Reminders processed. Next auto date: +" + (list[0].reminderInterval || 3) + " days.");
    if (typeof reloadAllData === "function") await reloadAllData();
}

window.getDueReminderCustomers = getDueReminderCustomers;
window.processWhatsAppReminders = processWhatsAppReminders;
window.addDaysISO = addDaysISO;



// ================================
// Dashboard
// ================================
function updateDashboard() {
    const totalCustomers = document.getElementById("totalCustomers");
    const totalOutstanding = document.getElementById("totalOutstanding");
    const todayFollowup = document.getElementById("todayFollowup");
    const todayRecovery = document.getElementById("todayRecovery");

    if (!totalCustomers) return;

    totalCustomers.innerHTML = customers.length;

    let outstanding = 0;
    customers.forEach(c => { outstanding += Number(c.outstanding || 0); });
    if (totalOutstanding) {
        totalOutstanding.innerHTML = "₹" + outstanding.toLocaleString("en-IN");
    }

    const today = new Date().toISOString().split("T")[0];
    const followCount = customers.filter(c => c.followup === today).length;
    if (todayFollowup) todayFollowup.innerHTML = followCount;

    let recoveryTotal = 0;
    recoveries.forEach(item => {
        if (item.date === today) recoveryTotal += Number(item.amount || 0);
    });
    if (todayRecovery) {
        todayRecovery.innerHTML = "₹" + recoveryTotal.toLocaleString("en-IN");
    }
}

function loadRecentCustomers() {
    const tbody = document.getElementById("recentCustomers");
    if (!tbody) return;
    tbody.innerHTML = "";
    customers.slice(0, 5).forEach((customer, index) => {
        tbody.innerHTML += `
        <tr>
            <td>${index + 1}</td>
            <td>${customer.name}</td>
            <td>${customer.mobile}</td>
            <td>${customer.village}</td>
            <td>₹${Number(customer.outstanding || 0).toLocaleString("en-IN")}</td>
            <td><span class="badge badge-success">Active</span></td>
        </tr>`;
    });
}

function loadDashboardFollowups() {
    const tbody = document.getElementById("followupTable");
    if (!tbody) return;
    tbody.innerHTML = "";
    const today = new Date().toISOString().split("T")[0];
    customers.filter(c => c.followup === today).forEach((customer, index) => {
        tbody.innerHTML += `
        <tr>
            <td>${index + 1}</td>
            <td>${customer.name}</td>
            <td>${customer.mobile}</td>
            <td>${customer.village}</td>
            <td>₹${Number(customer.outstanding || 0).toLocaleString("en-IN")}</td>
            <td>${customer.followup}</td>
        </tr>`;
    });
}

function loadDashboardRecentRecovery() {
    const tbody = document.getElementById("recoveryTable");
    if (!tbody) return;
    tbody.innerHTML = "";
    recoveries.slice(0, 5).forEach((item, index) => {
        const customer = customers.find(c => c.id == item.customerId);
        tbody.innerHTML += `
        <tr>
            <td>${index + 1}</td>
            <td>${customer ? customer.name : "-"}</td>
            <td>₹${Number(item.amount || 0).toLocaleString("en-IN")}</td>
            <td>${item.date}</td>
            <td>${item.remarks || "-"}</td>
        </tr>`;
    });
}

// ================================
// Recovery Module
// ================================
async function saveRecovery() {
    const customerId = document.getElementById("recoveryCustomer");
    const amount = document.getElementById("recoveryAmount");
    const date = document.getElementById("recoveryDate");
    const remarks = document.getElementById("recoveryRemarks");
    const paymentMode = document.getElementById("paymentMode");
    const receiptNo = document.getElementById("receiptNo");
    const collectedBy = document.getElementById("collectedBy");

    if (!customerId || !amount || !date) return;
    if (customerId.value === "") { alert("Please Select Customer"); return; }
    
    const custCheck = (customers || []).find(c => String(c.id) === String(customerId.value));
    const payAmt = Number(amount.value || 0);
    const dueAmt = custCheck ? Number(custCheck.outstanding || 0) : 0;
    const remarkText = remarks ? (remarks.value || "").trim() : "";

    // Amount 0 allowed = call / follow-up only (must add comment)
    if (payAmt < 0) {
        alert("Recovery amount cannot be negative.");
        return;
    }
    if (payAmt === 0 && !remarkText) {
        alert("Amount is 0 (call / no payment).

Please enter details in Remarks
(e.g. Called customer – payment not received).");
        if (remarks) remarks.focus();
        return;
    }
    if (custCheck && payAmt > dueAmt + 0.001) {
        alert("❌ Recovery entry not allowed

Customer: " + (custCheck.name || "-") + "
Current Outstanding: ₹" + dueAmt.toLocaleString("en-IN") + "
You entered: ₹" + payAmt.toLocaleString("en-IN") + "
Extra: ₹" + (payAmt - dueAmt).toLocaleString("en-IN") + "

Amount cannot exceed outstanding balance.
Please enter ₹" + dueAmt.toLocaleString("en-IN") + " or less.");
        amount.focus();
        return;
    }


    let finalShopId = currentShopId();
    const cust = customers.find(c => c.id == customerId.value);
    if (isSuperAdmin() && cust) finalShopId = cust.shop_id;

    if (!finalShopId) {
        alert("No shop context.");
        return;
    }

    const recovery = {
        customerId: customerId.value,
        amount: Number(amount.value),
        date: date.value,
        paymentMode: paymentMode ? paymentMode.value : "Cash",
        receiptNo: receiptNo ? receiptNo.value : "",
        collectedBy: collectedBy ? collectedBy.value : "",
        remarks: remarks ? remarks.value : ""
    };

    try {
        await sbSaveRecovery(recovery, finalShopId);

        if (cust && Number(amount.value || 0) > 0) {
            const newOut = Math.max(0, Number(cust.outstanding || 0) - Number(amount.value));
            await sbUpdateCustomerOutstanding(cust.id, newOut);
        }
        // Also append call note to customer remarks when amount is 0
        if (cust && Number(amount.value || 0) === 0 && remarks && remarks.value.trim()) {
            try {
                const note = "[" + (date.value || "") + "] " + remarks.value.trim();
                const prev = (cust.remarks || "").trim();
                const merged = prev ? (prev + " | " + note) : note;
                const sb = getSupabase();
                await sb.from("customers").update({ remarks: merged }).eq("id", cust.id);
            } catch (e) { console.warn("remarks update", e); }
        }

        amount.value = "";
        if (remarks) remarks.value = "";
        if (receiptNo) receiptNo.value = "";
        if (paymentMode) paymentMode.selectedIndex = 0;
        if (collectedBy) collectedBy.selectedIndex = 0;
        customerId.value = "";
        const outBox = document.getElementById("recoveryOutstanding");
        if (outBox) outBox.value = "";

        await reloadAllData();
        alert("Recovery Saved Successfully.");
    } catch (e) {
        console.error(e);
        alert("Save failed: " + (e.message || e));
    }
}

function loadRecoveryTable() {
    const tbody = document.getElementById("recoveryBody");
    if (!tbody) return;

    const session = getSession();
    const role = session.role || "user";

    tbody.innerHTML = "";

    recoveries.forEach((item, index) => {
        const customer = customers.find(c => c.id == item.customerId);
        const deleteBtn = (role === "admin" || role === "super_admin")
            ? `<button class="action-btn delete-btn" onclick="deleteRecovery(${index})" title="Delete">🗑️</button>`
            : "";

        tbody.innerHTML += `
        <tr>
            <td>${index + 1}</td>
            <td>${customer ? customer.name : "-"}</td>
            <td>₹${Number(item.amount || 0).toLocaleString("en-IN")}</td>
            <td>${item.paymentMode || "-"}</td>
            <td>${item.receiptNo || "-"}</td>
            <td>${item.date || "-"}</td>
            <td>${item.collectedBy || "-"}</td>
            <td>${item.remarks || "-"}</td>
            <td>${deleteBtn}</td>
        </tr>`;
    });
}

async function deleteRecovery(index) {
    const session = getSession();
    if (session.role !== "admin" && session.role !== "super_admin") {
        alert("Only Admin Can Delete Records.");
        return;
    }
    if (!confirm("Delete this recovery entry?")) return;

    const item = recoveries[index];
    try {
        if (item) {
            const customer = customers.find(c => c.id == item.customerId);
            if (customer) {
                const newOut = Number(customer.outstanding || 0) + Number(item.amount || 0);
                await sbUpdateCustomerOutstanding(customer.id, newOut);
            }
        }
        await sbDeleteRecovery(item.id);
        await reloadAllData();
    } catch (e) {
        console.error(e);
        alert("Delete failed: " + (e.message || e));
    }
}

function loadRecoveryCustomers() {
    const select = document.getElementById("recoveryCustomer");
    if (!select) return;
    const prev = select.value;
    select.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "Select Customer";
    select.appendChild(opt0);

    (customers || []).forEach(function(customer) {
        const out = Number(customer.outstanding || 0);
        const opt = document.createElement("option");
        opt.value = String(customer.id);
        opt.setAttribute("data-outstanding", String(out));
        opt.textContent = customer.name + (out > 0 ? (" — ₹" + out.toLocaleString("en-IN") + " due") : " — Paid");
        select.appendChild(opt);
    });

    if (prev) select.value = prev;

    // bind every time (mobile safe)
    select.onchange = onRecoveryCustomerChange;
    select.addEventListener("change", onRecoveryCustomerChange);
    select.addEventListener("input", onRecoveryCustomerChange);

    onRecoveryCustomerChange();
}

function onRecoveryCustomerChange() {
    try {
        const select = document.getElementById("recoveryCustomer");
        const outBox = document.getElementById("recoveryOutstanding");
        const amtBox = document.getElementById("recoveryAmount");
        const hint = document.getElementById("recoveryOutHint");
        if (!select || !outBox) return;

        const val = select.value;
        if (!val) {
            outBox.value = "";
            if (hint) {
                hint.textContent = "Select a customer to see pending amount";
                hint.style.color = "#73879B";
            }
            return;
        }

        let out = 0;
        const selected = select.options[select.selectedIndex];
        if (selected && selected.getAttribute("data-outstanding") != null) {
            out = Number(selected.getAttribute("data-outstanding") || 0);
        }

        // also from customers array (source of truth)
        const c = (customers || []).find(function(x) {
            return String(x.id) === String(val) || String(x.id) === val;
        });
        if (c) out = Number(c.outstanding || 0);

        outBox.value = "₹" + out.toLocaleString("en-IN");
        if (hint) {
            if (out > 0) {
                hint.textContent = "Pending dues — recover up to this amount";
                hint.style.color = "#b91c1c";
            } else {
                hint.textContent = "Outstanding ₹0 — already cleared";
                hint.style.color = "#15803d";
            }
        }
        if (amtBox) {
            amtBox.setAttribute("max", String(out > 0 ? out : ""));
            amtBox.placeholder = out > 0 ? ("Max ₹" + out.toLocaleString("en-IN")) : "Enter amount";
        }
    } catch (e) {
        console.error("onRecoveryCustomerChange", e);
    }
}
window.onRecoveryCustomerChange = onRecoveryCustomerChange;
window.loadRecoveryCustomers = loadRecoveryCustomers;

function bindRecoveryOutstandingUI() {
    var select = document.getElementById("recoveryCustomer");
    if (!select) return;
    select.onchange = onRecoveryCustomerChange;
    select.onclick = onRecoveryCustomerChange;
    select.onblur = onRecoveryCustomerChange;
    if (select.dataset.outBound === "1") return;
    select.dataset.outBound = "1";
    ["change","input","blur","keyup"].forEach(function(ev){
        select.addEventListener(ev, onRecoveryCustomerChange);
    });
}
window.bindRecoveryOutstandingUI = bindRecoveryOutstandingUI;

document.addEventListener("DOMContentLoaded", function(){
    try {
        if (document.getElementById("recoveryCustomer")) {
            if (typeof loadRecoveryCustomers === "function") loadRecoveryCustomers();
            bindRecoveryOutstandingUI();
            setTimeout(onRecoveryCustomerChange, 300);
            setTimeout(onRecoveryCustomerChange, 1000);
        }
    } catch(e) {}
});



// ================================
// Reports
// ================================
function loadReportCustomers() {
    const select = document.getElementById("reportCustomer");
    if (!select) return;
    const current = select.value;
    select.innerHTML = `<option value="">All Customers</option>`;
    customers.forEach(customer => {
        select.innerHTML += `<option value="${customer.id}">${customer.name}</option>`;
    });
    if (current) select.value = current;
}

function renderReportRows(list) {
    const tbody = document.getElementById("reportBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    list.forEach((item, index) => {
        const customer = customers.find(c => c.id == item.customerId);
        const status = customer && Number(customer.outstanding) > 0
            ? `<span class="badge badge-warning">Pending</span>`
            : `<span class="badge badge-success">Paid</span>`;

        tbody.innerHTML += `
        <tr>
            <td>${index + 1}</td>
            <td>${customer ? customer.name : "-"}</td>
            <td>${customer ? (customer.mobile || "-") : "-"}</td>
            <td>${customer ? (customer.village || "-") : "-"}</td>
            <td>₹${Number(item.amount || 0).toLocaleString("en-IN")}</td>
            <td>${item.paymentMode || "-"}</td>
            <td>${item.date || "-"}</td>
            <td>${item.collectedBy || "-"}</td>
            <td>${status}</td>
        </tr>`;
    });

    const totalRecords = document.getElementById("reportTotalRecords");
    const reportAmount = document.getElementById("reportAmount");
    if (totalRecords) totalRecords.innerHTML = list.length;
    if (reportAmount) {
        let sum = 0;
        list.forEach(i => sum += Number(i.amount || 0));
        reportAmount.innerHTML = formatCurrency(sum);
    }
}

function loadReports() {
    loadReportCustomers();
    renderReportRows(recoveries);
    updateRecoverySummary();
    updateReportExtraStats();
}

function getFilteredRecoveries() {
    const fromDate = document.getElementById("fromDate");
    const toDate = document.getElementById("toDate");
    const reportCustomer = document.getElementById("reportCustomer");
    const reportSearch = document.getElementById("reportSearch");

    let list = recoveries.slice();

    if (reportCustomer && reportCustomer.value) {
        list = list.filter(r => String(r.customerId) === String(reportCustomer.value));
    }
    if (fromDate && fromDate.value) {
        list = list.filter(r => r.date >= fromDate.value);
    }
    if (toDate && toDate.value) {
        list = list.filter(r => r.date <= toDate.value);
    }
    if (reportSearch && reportSearch.value.trim() !== "") {
        const keyword = reportSearch.value.trim().toLowerCase();
        list = list.filter(r => {
            const customer = customers.find(c => c.id == r.customerId);
            const name = customer ? (customer.name || "").toLowerCase() : "";
            const mobile = customer ? (customer.mobile || "").toLowerCase() : "";
            const village = customer ? (customer.village || "").toLowerCase() : "";
            return name.includes(keyword) || mobile.includes(keyword) || village.includes(keyword);
        });
    }
    return list;
}

function filterReport() {
    const list = getFilteredRecoveries();
    renderReportRows(list);
    updateReportExtraStats(list);
}

function searchReport() { filterReport(); }
function filterReportByDate() { filterReport(); }

function exportReport() {
    const list = getFilteredRecoveries();
    if (list.length === 0) {
        alert("No data to export.");
        return;
    }
    let csv = "No,Customer,Mobile,Village,Amount,Payment Mode,Date,Collected By,Remarks\n";
    list.forEach((item, index) => {
        const customer = customers.find(c => c.id == item.customerId);
        const name = customer ? (customer.name || "-") : "-";
        const mobile = customer ? (customer.mobile || "-") : "-";
        const village = customer ? (customer.village || "-") : "-";
        csv += `${index + 1},"${name}","${mobile}","${village}",${item.amount},"${item.paymentMode || "-"}","${item.date || "-"}","${item.collectedBy || "-"}","${(item.remarks || "").replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "BK-Recovery-Report.csv";
    a.click();
    URL.revokeObjectURL(url);
}

function updateReportExtraStats(list) {
    list = list || recoveries;
    const totals = {};
    list.forEach(item => {
        const id = item.customerId;
        totals[id] = (totals[id] || 0) + Number(item.amount || 0);
    });
    let topId = null, topAmt = 0;
    Object.keys(totals).forEach(id => {
        if (totals[id] > topAmt) { topAmt = totals[id]; topId = id; }
    });

    const topCustomer = document.getElementById("topCustomer");
    const highestCollection = document.getElementById("highestCollection");
    const activeCustomers = document.getElementById("activeCustomers");
    const pendingCustomers = document.getElementById("pendingCustomers");

    if (topCustomer) {
        if (topId) {
            const c = customers.find(x => x.id == topId);
            topCustomer.innerHTML = c ? c.name : "-";
        } else topCustomer.innerHTML = "-";
    }
    if (highestCollection) highestCollection.innerHTML = formatCurrency(topAmt);
    if (activeCustomers) {
        const activeIds = new Set(list.map(r => String(r.customerId)));
        activeCustomers.innerHTML = activeIds.size;
    }
    if (pendingCustomers) {
        pendingCustomers.innerHTML = customers.filter(c => Number(c.outstanding || 0) > 0).length;
    }
}

function getMonthlyCollection() {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    let total = 0;
    recoveries.forEach(item => {
        const d = new Date(item.date);
        if (d.getMonth() + 1 === month && d.getFullYear() === year) {
            total += Number(item.amount);
        }
    });
    return total;
}

function getTotalRecovery() {
    let total = 0;
    recoveries.forEach(item => { total += Number(item.amount); });
    return total;
}

function updateRecoverySummary() {
    const today = new Date().toISOString().split("T")[0];
    let todayTotal = 0;
    recoveries.forEach(item => {
        if (item.date === today) todayTotal += Number(item.amount || 0);
    });
    let pendingTotal = 0;
    customers.forEach(c => { pendingTotal += Number(c.outstanding || 0); });

    const totalRecoveryAmount = getTotalRecovery();
    const monthlyAmount = getMonthlyCollection();
    const transactionCount = recoveries.length;

    const fields = {
        todayRecovery: formatCurrency(todayTotal),
        totalRecovery: formatCurrency(totalRecoveryAmount),
        pendingRecovery: formatCurrency(pendingTotal),
        totalTransactions: transactionCount,
        monthlyCollection: formatCurrency(monthlyAmount),
        summaryRecovery: formatCurrency(totalRecoveryAmount),
        summaryPending: formatCurrency(pendingTotal),
        summaryToday: formatCurrency(todayTotal),
        reportTotalCustomers: customers.length,
        reportTotalRecovery: formatCurrency(totalRecoveryAmount),
        reportMonthlyRecovery: formatCurrency(monthlyAmount),
        reportPending: formatCurrency(pendingTotal),
        reportTotalRecords: transactionCount,
        reportAmount: formatCurrency(totalRecoveryAmount),
        reportPendingBalance: formatCurrency(pendingTotal),
        todayCollection: formatCurrency(todayTotal),
        thisMonthCollection: formatCurrency(monthlyAmount),
        reportOutstanding: formatCurrency(pendingTotal)
    };

    Object.keys(fields).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = fields[id];
    });
}

// ================================
// Utilities
// ================================
function formatCurrency(amount) {
    return "₹" + Number(amount || 0).toLocaleString("en-IN");
}

function formatDate(date) {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN");
}

function backupData() {
    alert("Data is stored in Supabase cloud.\\nUse Supabase Dashboard → Table Editor for export if needed.");
}

function restoreData() {
    alert("Restore is managed via Supabase. Local JSON restore is disabled.");
}

function clearAllData() {
    alert("Clear All is disabled. Manage data from Supabase Dashboard or delete records individually.");
}

function firebaseFullBackup() { backupData(); }
function firebaseFullRestore() { restoreData(); }

// ================================
// Settings / Users
// ================================
async function saveSettings() {
    const usernameField = document.getElementById("adminUsername");
    const currentPasswordField = document.getElementById("currentPassword");
    const newPasswordField = document.getElementById("newPassword");
    const confirmPasswordField = document.getElementById("confirmPassword");
    const recoveryEmailField = document.getElementById("recoveryEmail");

    if (!usernameField) return;

    const session = getSession();
    const newUsername = usernameField.value.trim();
    if (!newUsername) {
        alert("Username Cannot Be Empty");
        return;
    }

    try {
        const currentPassword = currentPasswordField ? currentPasswordField.value.trim() : "";
        const newPassword = newPasswordField ? newPasswordField.value.trim() : "";
        const confirmPassword = confirmPasswordField ? confirmPasswordField.value.trim() : "";

        if (newPassword !== "" || confirmPassword !== "") {
            const check = await sbLogin(session.username, currentPassword);
            if (!check) {
                alert("Current Password Is Incorrect");
                return;
            }
            setSession(check.user, check.shop ? { name: check.shop.name } : null);

            if (newPassword.length < 4) {
                alert("New Password Must Be At Least 4 Characters");
                return;
            }
            if (newPassword !== confirmPassword) {
                alert("New Password And Confirm Password Do Not Match");
                return;
            }
            await sbUpdateUserPassword(session.userId, newPassword);
        }

        if (newUsername !== session.username) {
            await sbUpdateUsername(session.userId, newUsername);
            sessionStorage.setItem("bk_username", newUsername);
        }

        // Always save recovery email on the user account (works for Super Admin too)
        if (recoveryEmailField && session.userId) {
            const re = recoveryEmailField.value.trim();
            const sb = getSupabase();
            await sb.from("users").update({ recovery_email: re || null }).eq("id", session.userId);
        }

        if (session.shopId) {
            const s = await sbGetSettings(session.shopId);
            if (recoveryEmailField) s.recoveryEmail = recoveryEmailField.value.trim();
            await sbSaveSettings(session.shopId, s);
            settings = s;
        }

        if (currentPasswordField) currentPasswordField.value = "";
        if (newPasswordField) newPasswordField.value = "";
        if (confirmPasswordField) confirmPasswordField.value = "";

        alert("Settings Saved Successfully.");
        await loadUserList();
    } catch (e) {
        console.error(e);
        alert("Save failed: " + (e.message || e));
    }
}

async function addUser() {
    const usernameField = document.getElementById("newUserUsername");
    const passwordField = document.getElementById("newUserPassword");
    const roleField = document.getElementById("newUserRole");
    if (!usernameField || !passwordField || !roleField) return;

    const username = usernameField.value.trim();
    const password = passwordField.value.trim();
    let role = roleField.value;
    if (role === "Admin") role = "admin";
    if (role === "User") role = "user";

    if (!username) { alert("Please Enter Username"); return; }
    if (password.length < 4) { alert("Password Must Be At Least 4 Characters"); return; }

    try {
        await sbAddUser({
            username,
            password,
            role,
            shop_id: currentShopId(),
            display_name: username
        });
        usernameField.value = "";
        passwordField.value = "";
        roleField.value = "User";
        alert("User Added Successfully.");
        await loadUserList();
    } catch (e) {
        console.error(e);
        alert("Add user failed: " + (e.message || e));
    }
}

async function deleteUser(usernameOrId) {
    const session = getSession();
    if (!usernameOrId) {
        alert("Invalid user");
        return;
    }
    if (usernameOrId === session.username || usernameOrId === session.userId) {
        alert("You Cannot Delete Your Own Logged-In Account.");
        return;
    }
    if (!confirm("Remove This User Permanently?")) return;

    try {
        // Resolve by id or username (fresh fetch)
        let userId = usernameOrId;
        const looksLikeUuid = String(usernameOrId).length > 20 && String(usernameOrId).includes("-");
        if (!looksLikeUuid) {
            const users = await sbGetUsers(isSuperAdmin() ? null : currentShopId());
            const target = (users || []).find(u =>
                u.id === usernameOrId ||
                u.username === usernameOrId ||
                String(u.id) === String(usernameOrId)
            );
            if (!target) {
                alert("User not found");
                return;
            }
            if (target.username === "superadmin" || target.role === "super_admin") {
                alert("Super Admin account cannot be deleted.");
                return;
            }
            userId = target.id;
        } else {
            // protect superadmin by id lookup optional
            const users = await sbGetUsers(null);
            const t = (users || []).find(u => String(u.id) === String(usernameOrId));
            if (t && (t.username === "superadmin" || t.role === "super_admin")) {
                alert("Super Admin account cannot be deleted.");
                return;
            }
        }
        await sbDeleteUser(userId);
        await loadUserList();
        alert("User removed.");
    } catch (e) {
        console.error(e);
        alert("Delete failed: " + (e.message || e));
    }
}

async function loadUserList() {
    const tbody = document.getElementById("userListBody");
    if (!tbody) return;
    const session = getSession();

    try {
        const shopFilter = isSuperAdmin() ? null : currentShopId();
        const users = await sbGetUsers(shopFilter);
        tbody.innerHTML = "";
        (users || []).forEach(u => {
            const isSelf = u.id === session.userId || u.username === session.username;
            const isSA = u.role === "super_admin" || u.username === "superadmin";
            let action = "—";
            if (!isSelf && !isSA) {
                action = `<button type="button" onclick="deleteUser(this.dataset.uid)" data-uid="${u.id}" title="Remove" style="background:#ef4444;color:#fff;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;">🗑️ Remove</button>`;
            }
            tbody.innerHTML += `
            <tr>
                <td>${u.username || ""}</td>
                <td>${u.role || ""}</td>
                <td>${action}</td>
            </tr>`;
        });
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="3" style="color:#ef4444;">Failed to load users: ${e.message || e}</td></tr>`;
    }
}

function getCompanyName() {
    return settings.company || getSession().shopName || "BK Recovery Manager";
}

// ================================
// Company Branding
// ================================
function previewCompanyLogo(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function (e) {
        const preview = document.getElementById("logoPreview");
        if (preview) {
            preview.src = e.target.result;
            preview.style.display = "block";
        }
        settings.logoDataUrl = e.target.result;
        const shopId = currentShopId();
        if (shopId) {
            try {
                await sbSaveSettings(shopId, settings);
            } catch (err) {
                console.error(err);
            }
        }
    };
    reader.readAsDataURL(file);
}

async function saveCompanyBranding() {
    const session = (typeof getSession === "function") ? getSession() : {};
    const shopId = (typeof currentShopId === "function") ? currentShopId() : (session.shopId || null);
    const isSA = (typeof isSuperAdmin === "function" && isSuperAdmin())
        || session.role === "super_admin"
        || session.role === "Super Admin"
        || session.username === "superadmin";

    const companyField = document.getElementById("companyName");
    const phoneField = document.getElementById("companyMobile") || document.getElementById("contactNumber");
    const emailField = document.getElementById("companyEmail") || document.getElementById("emailAddress");
    const addressField = document.getElementById("companyAddress");
    const softwareField = document.getElementById("softwareName");

    if (typeof settings !== "object" || !settings) window.settings = {};

    if (companyField && companyField.value.trim()) settings.company = companyField.value.trim();
    if (phoneField && phoneField.value.trim()) settings.phone = phoneField.value.trim();
    if (emailField && emailField.value.trim()) settings.email = emailField.value.trim();
    if (addressField && addressField.value.trim()) settings.address = addressField.value.trim();
    if (softwareField && softwareField.value.trim()) settings.softwareName = softwareField.value.trim();

    const emailVal = (emailField && emailField.value.trim()) || (settings.email || "");

    try {
        // No shop (Super Admin / missing shop): save recovery email on user
        if (!shopId) {
            const uid = session.userId || session.user_id || "";
            if (!uid) {
                alert("Session expired. Please logout and login again.");
                return;
            }
            if (!emailVal) {
                alert("Enter recovery email in Email Address, then Save.");
                return;
            }
            const sb = getSupabase();
            if (!sb) {
                alert("Cloud connection failed.");
                return;
            }
            const { error } = await sb.from("users").update({ recovery_email: emailVal }).eq("id", uid);
            if (error) {
                // try by username
                const { error: e2 } = await sb.from("users").update({ recovery_email: emailVal }).eq("username", session.username || "superadmin");
                if (e2) throw e2;
            }
            const reField = document.getElementById("recoveryEmail");
            if (reField) reField.value = emailVal;
            alert("✅ Recovery email saved: " + emailVal + "\n\nUse Username + this email on Forgot Password.\n\nNote: Company logo/name is saved by Shop Admin login.");
            return;
        }

        await sbSaveSettings(shopId, settings);
        if (emailVal) {
            try {
                const sb = getSupabase();
                await sb.from("shops").update({ email: emailVal }).eq("id", shopId);
                if (session.userId) {
                    await sb.from("users").update({ recovery_email: emailVal }).eq("id", session.userId);
                }
            } catch (e) { console.warn(e); }
        }
        alert("Company branding saved.");
    } catch (e) {
        console.error(e);
        alert("Save failed: " + (e.message || e));
    }
}

window.saveCompanyBranding = saveCompanyBranding;


// ================================
// Sales / Recovery Executives
// ================================
function getExecutivesList() {
    const list = (typeof settings !== "undefined" && Array.isArray(settings.executives))
        ? settings.executives.slice()
        : ["Mukesh", "Bharat", "Office"];
    return list.filter(x => x && String(x).trim() !== "");
}

function fillExecutiveDropdowns(selected) {
    const list = getExecutivesList();
    const opts = ['<option value="">Select Executive</option>']
        .concat(list.map(e => {
            const sel = (selected && String(selected) === String(e)) ? " selected" : "";
            return `<option value="${String(e).replace(/"/g, "&quot;")}"${sel}>${e}</option>`;
        }))
        .join("");
    const execSel = document.getElementById("executive");
    if (execSel) {
        const cur = selected || execSel.value;
        execSel.innerHTML = opts;
        if (cur) execSel.value = cur;
    }
    const colSel = document.getElementById("collectedBy");
    if (colSel) {
        const cur2 = colSel.value;
        colSel.innerHTML = list.map(e => {
            const sel = (cur2 && String(cur2) === String(e)) ? " selected" : "";
            return `<option value="${String(e).replace(/"/g, "&quot;")}"${sel}>${e}</option>`;
        }).join("") || '<option value="">Select</option>';
        if (cur2) colSel.value = cur2;
    }
}

function loadExecutiveListUI() {
    const tbody = document.getElementById("executiveListBody");
    if (!tbody) return;
    const list = getExecutivesList();
    tbody.innerHTML = list.map((e, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${e}</td>
            <td>
                <button type="button" onclick="removeExecutive(${i})" title="Remove"
                    style="background:#ef4444;color:#fff;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;">🗑️</button>
            </td>
        </tr>
    `).join("") || `<tr><td colspan="3" style="text-align:center;color:#94a3b8;">No executives yet. Add below.</td></tr>`;
}

async function addExecutive() {
    const input = document.getElementById("newExecutiveName");
    if (!input) return;
    const name = input.value.trim();
    if (!name) {
        alert("Please enter executive name");
        return;
    }
    const shopId = (typeof currentShopId === "function") ? currentShopId() : null;
    if (!shopId) {
        alert("No shop context. Please login as Shop Admin.");
        return;
    }
    if (typeof settings !== "object" || !settings) settings = {};
    if (!Array.isArray(settings.executives)) settings.executives = getExecutivesList();
    if (settings.executives.some(e => e.toLowerCase() === name.toLowerCase())) {
        alert("Aa executive pehla thi che");
        return;
    }
    settings.executives.push(name);
    try {
        await sbSaveSettings(shopId, settings);
        input.value = "";
        loadExecutiveListUI();
        fillExecutiveDropdowns();
        try { applyShopBranding(); } catch (e) {}
        alert("Sales Executive add thai gayo.");
    } catch (e) {
        console.error(e);
        alert("Save failed: " + (e.message || e));
    }
}

async function removeExecutive(index) {
    if (!confirm("Aa executive remove karvu?")) return;
    const shopId = (typeof currentShopId === "function") ? currentShopId() : null;
    if (!shopId) {
        alert("No shop context.");
        return;
    }
    if (!Array.isArray(settings.executives)) settings.executives = getExecutivesList();
    settings.executives.splice(index, 1);
    try {
        await sbSaveSettings(shopId, settings);
        loadExecutiveListUI();
        fillExecutiveDropdowns();
        try { applyShopBranding(); } catch (e) {}
    } catch (e) {
        alert("Remove failed: " + (e.message || e));
    }
}

window.getExecutivesList = getExecutivesList;
window.fillExecutiveDropdowns = fillExecutiveDropdowns;
window.loadExecutiveListUI = loadExecutiveListUI;
window.addExecutive = addExecutive;
window.removeExecutive = removeExecutive;


// ================================
// Shop branding (name + logo)
// ================================
function applyShopBranding() {
    const session = (typeof getSession === "function") ? getSession() : {};
    const company = (typeof settings !== "undefined" && settings.company)
        || session.shopName
        || "";
    const logoUrl = (typeof settings !== "undefined" && settings.logoDataUrl)
        || "assets/logo.png";
    const software = (typeof settings !== "undefined" && settings.softwareName)
        || "Recovery Manager";

    // Sidebar logo block
    const logoBox = document.querySelector(".sidebar .logo");
    if (logoBox) {
        let img = logoBox.querySelector("img.shop-brand-logo");
        if (!img) {
            img = document.createElement("img");
            img.className = "shop-brand-logo";
            img.alt = "Logo";
            img.style.cssText = "width:64px;height:64px;object-fit:contain;margin:0 auto 10px;border-radius:12px;background:rgba(255,255,255,0.06);padding:6px;display:block;";
            logoBox.insertBefore(img, logoBox.firstChild);
        }
        img.src = logoUrl;
        img.onerror = function () {
            this.src = "assets/logo.png";
            this.onerror = function () { this.style.display = "none"; };
        };

        let h2 = logoBox.querySelector("h2");
        if (!h2) {
            h2 = document.createElement("h2");
            logoBox.appendChild(h2);
        }
        // Short title for sidebar
        if (session.role === "super_admin" && !session.shopId) {
            h2.textContent = "BK Recovery";
        } else if (company) {
            // max ~18 chars for sidebar
            h2.textContent = company.length > 18 ? company.slice(0, 16) + "…" : company;
            h2.title = company;
        }

        let p = logoBox.querySelector("p");
        if (!p) {
            p = document.createElement("p");
            logoBox.appendChild(p);
        }
        if (session.role === "super_admin" && !session.shopId) {
            p.textContent = "Super Admin";
        } else {
            p.textContent = company || software;
        }
    }

    // Topbar / page titles
    const shopLabel = document.getElementById("currentShopName");
    if (shopLabel && company) shopLabel.innerText = company;

    // Reports print header
    const printName = document.getElementById("printCompanyName");
    if (printName) printName.textContent = company || "Jewellery Shop";

    const printLogo = document.querySelector(".print-header img");
    if (printLogo) {
        printLogo.src = logoUrl;
        printLogo.onerror = function () { this.style.display = "none"; };
    }

    // Any element with data-brand="company"
    document.querySelectorAll("[data-brand='company']").forEach(el => {
        el.textContent = company || el.textContent;
    });

    // Footer company lines
    document.querySelectorAll(".footer, footer").forEach(el => {
        // don't overwrite entire footer; optional small brand line
    });

    // Document title
    if (company && session.role !== "super_admin") {
        document.title = company + " | Recovery Manager";
    }
}

window.applyShopBranding = applyShopBranding;

// ================================
// Data reload
// ================================
async function reloadAllData() {
    const session = getSession();
    const shopFilter = isSuperAdmin() ? null : session.shopId;

    try {
        const [c, r] = await Promise.all([
            sbGetCustomers(shopFilter),
            sbGetRecoveries(shopFilter)
        ]);
        customers = c;
        recoveries = r;

        if (session.shopId) {
            settings = await sbGetSettings(session.shopId);
        }

        if (document.getElementById("customerBody")) loadCustomers();
        if (document.getElementById("totalCustomers")) {
            updateDashboard();
            loadRecentCustomers();
            loadDashboardFollowups();
            loadDashboardRecentRecovery();
        }
        if (document.getElementById("recoveryBody")) {
            loadRecoveryTable();
            updateRecoverySummary();
        }
        if (document.getElementById("recoveryCustomer")) loadRecoveryCustomers();
        if (document.getElementById("reportBody")) loadReports();
        try { applyShopBranding(); } catch (be) {}
    } catch (e) {
        console.error("reloadAllData", e);
    }
}

// ================================
// Init
// ================================
window.addEventListener("load", async function () {
    if (typeof supabaseBoot === "function") {
        try { await supabaseBoot(); } catch (e) { console.error(e); }
    }

    checkLogin();

    const session = getSession();
    if (!session.isLoggedIn && !window.location.pathname.includes("login.html")) return;

    await reloadAllData();

    if (document.getElementById("adminUsername")) {
        document.getElementById("adminUsername").value = session.username || "";
        if (document.getElementById("recoveryEmail") && settings.recoveryEmail) {
            document.getElementById("recoveryEmail").value = settings.recoveryEmail;
        }
        await loadUserList();
    }
    fillExecutiveDropdowns();
        try { applyShopBranding(); } catch (e) {}
    if (document.getElementById("executiveListBody")) loadExecutiveListUI();

    if (document.getElementById("companyName") && settings.company) {
        document.getElementById("companyName").value = settings.company;
    }
    if (document.getElementById("logoPreview") && settings.logoDataUrl) {
        document.getElementById("logoPreview").src = settings.logoDataUrl;
        document.getElementById("logoPreview").style.display = "block";
    }
});

function refreshProject() {
    reloadAllData();
}

const APP_INFO = {
    name: "BK Recovery Manager",
    version: "3.0.0",
    company: "BK Recovery Manager",
    developer: "BK Design Hub"
};

console.log(APP_INFO.name + " v" + APP_INFO.version);


function filterDashboardMetric(type) {
    document.querySelectorAll(".metric-active").forEach(el => el.classList.remove("metric-active"));
    const today = (typeof todayISO === "function") ? todayISO() : new Date().toISOString().split("T")[0];
    let list = [];
    let title = "";
    if (type === "customers") {
        list = customers || [];
        title = "All Customers (" + list.length + ")";
    } else if (type === "outstanding") {
        list = (customers || []).filter(c => Number(c.outstanding || 0) > 0);
        title = "Outstanding Customers (" + list.length + ")";
    } else if (type === "followup") {
        list = (customers || []).filter(c => c.followup && String(c.followup).slice(0,10) === today);
        title = "Today's Follow-up (" + list.length + ")";
    } else if (type === "recovery") {
        list = (recoveries || []).filter(r => String(r.date || r.recovery_date || "").slice(0,10) === today);
        title = "Today's Recovery (" + list.length + ")";
    }
    const box = document.getElementById("dashboardMetricList");
    if (!box) {
        // navigate to customers with hash
        if (type === "recovery") location.href = "recovery.html";
        else location.href = "customers.html#" + type;
        return;
    }
    box.style.display = "block";
    box.querySelector("h3").textContent = title;
    const tb = box.querySelector("tbody");
    if (type === "recovery") {
        tb.innerHTML = list.map((r,i) => {
            const cust = (customers||[]).find(c => c.id === r.customerId || c.id === r.customer_id);
            return `<tr><td>${i+1}</td><td>${(cust&&cust.name)||"-"}</td><td>₹${Number(r.amount||0).toLocaleString("en-IN")}</td><td>${r.date||r.recovery_date||""}</td></tr>`;
        }).join("") || `<tr><td colspan="4">No records</td></tr>`;
    } else {
        tb.innerHTML = list.map((c,i) =>
            `<tr><td>${i+1}</td><td>${c.name||""}</td><td>${c.mobile||""}</td><td>₹${Number(c.outstanding||0).toLocaleString("en-IN")}</td><td>${c.followup||""}</td></tr>`
        ).join("") || `<tr><td colspan="5">No records</td></tr>`;
    }
}
window.filterDashboardMetric = filterDashboardMetric;

async function logAudit(action, entityType, entityId, details) {
    try {
        const sb = getSupabase();
        if (!sb) return;
        const session = getSession();
        await sb.from("audit_log").insert({
            shop_id: session.shopId || null,
            user_id: session.userId || null,
            username: session.username || "",
            action: action,
            entity_type: entityType || "",
            entity_id: entityId ? String(entityId) : "",
            details: details || ""
        });
    } catch (e) { console.warn("audit", e); }
}
window.logAudit = logAudit;

function printCleanReport() {
    try {
        const body = document.getElementById("cprBody");
        if (!body) { window.print(); return; }

        const fromEl = document.getElementById("fromDate");
        const toEl = document.getElementById("toDate");
        const searchEl = document.getElementById("reportSearch");
        const custEl = document.getElementById("reportCustomer");

        // ONLY recoveries in selected period (today if dates = today)
        let recs = (typeof recoveries !== "undefined" && recoveries) ? recoveries.slice() : [];
        if (fromEl && fromEl.value) {
            recs = recs.filter(function(r){
                return String(r.date || r.recovery_date || "").slice(0,10) >= fromEl.value;
            });
        }
        if (toEl && toEl.value) {
            recs = recs.filter(function(r){
                return String(r.date || r.recovery_date || "").slice(0,10) <= toEl.value;
            });
        }
        if (custEl && custEl.value) {
            recs = recs.filter(function(r){
                return String(r.customerId || r.customer_id) === String(custEl.value);
            });
        }
        if (searchEl && searchEl.value && searchEl.value.trim()) {
            var q = searchEl.value.trim().toLowerCase();
            recs = recs.filter(function(r){
                var c = (customers || []).find(function(x){ return String(x.id) === String(r.customerId || r.customer_id); }) || {};
                return String(c.name || "").toLowerCase().indexOf(q) >= 0
                    || String(c.mobile || "").indexOf(q) >= 0
                    || String(c.village || "").toLowerCase().indexOf(q) >= 0;
            });
        }

        // Group by customer for sheet columns (only who recovered in period)
        var map = {};
        recs.forEach(function(r) {
            var id = String(r.customerId || r.customer_id || "");
            var c = (customers || []).find(function(x){ return String(x.id) === id; }) || {};
            if (!map[id]) {
                map[id] = {
                    name: c.name || "-",
                    city: c.village || c.city || c.district || "-",
                    bill: Number(c.bill || 0),
                    received: 0,
                    due: Number(c.outstanding || 0),
                    comment: c.remarks || ""
                };
            }
            map[id].received += Number(r.amount || 0);
            if (r.remarks) map[id].comment = r.remarks;
        });

        var rows = Object.keys(map).map(function(k){ return map[k]; });
        var totalReceived = 0, totalDue = 0;

        if (!rows.length) {
            body.innerHTML = '<tr><td colspan="7" style="text-align:center">No recovery in this period</td></tr>';
        } else {
            body.innerHTML = rows.map(function(r, i) {
                var totalAmt = r.bill || (r.due + r.received);
                totalReceived += r.received;
                totalDue += r.due;
                var comment = String(r.comment || "-").replace(/</g, "&lt;");
                return "<tr><td>" + (i+1) + "</td><td>" + r.name + "</td><td>" + r.city + "</td><td>₹" + Number(totalAmt).toLocaleString("en-IN") + "</td><td>₹" + Number(r.received).toLocaleString("en-IN") + "</td><td>₹" + Number(r.due).toLocaleString("en-IN") + "</td><td>" + comment + "</td></tr>";
            }).join("");
        }

        var elT = document.getElementById("cprTotalAmt");
        var elO = document.getElementById("cprTotalOut");
        if (elT) elT.textContent = "₹" + totalReceived.toLocaleString("en-IN");
        if (elO) elO.textContent = "₹" + totalDue.toLocaleString("en-IN");

        var shop = "";
        try { if (typeof getSession === "function") shop = getSession().shopName || ""; } catch(e) {}
        var sn = document.getElementById("cprShopName");
        if (sn) sn.textContent = shop || (typeof settings !== "undefined" && settings && settings.company) || "BK Recovery Manager";
        var dl = document.getElementById("cprDateLine");
        if (dl) dl.textContent = "Printed: " + new Date().toLocaleString("en-IN");
        var fl = document.getElementById("cprFilterLine");
        if (fl) fl.textContent = "Period: " + ((fromEl && fromEl.value) || "All") + " to " + ((toEl && toEl.value) || "All") + " | Recovery only";

        var box = document.getElementById("cleanPrintReport");
        if (box) box.style.display = "block";
        setTimeout(function() {
            window.print();
            setTimeout(function(){ if (box) box.style.display = ""; }, 500);
        }, 200);
    } catch (err) {
        console.error("printCleanReport", err);
        alert("Print error: " + (err.message || err));
        window.print();
    }
}
window.printCleanReport = printCleanReport;

function onRecoveryAmountInput() {
    var amount = document.getElementById("recoveryAmount");
    var select = document.getElementById("recoveryCustomer");
    var hint = document.getElementById("recoveryOutHint");
    if (!amount || !select || !select.value) return;
    var c = (customers || []).find(function(x){ return String(x.id) === String(select.value); });
    if (!c) return;
    var due = Number(c.outstanding || 0);
    var pay = Number(amount.value || 0);
    if (pay > due + 0.001) {
        amount.style.borderColor = "#ef4444";
        amount.style.background = "#fef2f2";
        if (hint) {
            hint.textContent = "Error: Outstanding ₹" + due.toLocaleString("en-IN") + " — you entered ₹" + pay.toLocaleString("en-IN") + " more than due";
            hint.style.color = "#b91c1c";
        }
    } else {
        amount.style.borderColor = "";
        amount.style.background = "";
        if (hint && due > 0) {
            hint.textContent = "Pending dues — recover up to this amount";
            hint.style.color = "#b91c1c";
        }
    }
}
window.onRecoveryAmountInput = onRecoveryAmountInput;
