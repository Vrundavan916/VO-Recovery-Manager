/* ==========================================================
   BK Recovery Manager - Excel Template + Bulk Import
   Requires SheetJS (xlsx) from CDN
   Now writes to Supabase
========================================================== */

const CUSTOMER_EXCEL_HEADERS = [
    "Customer Name",
    "Father / Husband Name",
    "Mobile",
    "Alternate Mobile",
    "Village",
    "Taluka",
    "District",
    "Address",
    "Bill Amount",
    "Down Payment",
    "Outstanding",
    "Recovery Executive",
    "Next Follow-up (YYYY-MM-DD)",
    "Remarks"
];

function downloadCustomerTemplate() {
    if (typeof XLSX === "undefined") {
        alert("Excel library load નથી થઈ. Internet check કરો.");
        return;
    }

    const sample = [
        CUSTOMER_EXCEL_HEADERS,
        [
            "Ramesh Patel",
            "Suresh Patel",
            "9876543210",
            "9123456789",
            "Mehsana",
            "Mehsana",
            "Mehsana",
            "Near Bus Stand",
            "50000",
            "10000",
            "40000",
            "Mukesh",
            "2026-08-10",
            "Sample row - delete before real upload"
        ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(sample);
    ws["!cols"] = CUSTOMER_EXCEL_HEADERS.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, "BK-Customer-Import-Template.xlsx");
}

function parseExcelDate(val) {
    if (val === null || val === undefined || val === "") return "";
    if (typeof val === "number" && typeof XLSX !== "undefined") {
        try {
            const d = XLSX.SSF.parse_date_code(val);
            if (d) {
                const mm = String(d.m).padStart(2, "0");
                const dd = String(d.d).padStart(2, "0");
                return d.y + "-" + mm + "-" + dd;
            }
        } catch (e) {}
    }
    const s = String(val).trim();
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
        return m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return s;
}

function rowToCustomer(row) {
    const get = (keys, idx) => {
        for (const k of keys) {
            if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
                return String(row[k]).trim();
            }
        }
        if (Array.isArray(row) && row[idx] !== undefined) return String(row[idx] || "").trim();
        return "";
    };

    const name = get(["Customer Name", "customer name", "Name", "name", "Customer"], 0);
    const mobile = get(["Mobile", "mobile", "Mobile Number", "Phone"], 2);
    if (!name || !mobile) return null;

    const bill = parseFloat(get(["Bill Amount", "bill amount", "Bill", "Total Bill"], 8)) || 0;
    const down = parseFloat(get(["Down Payment", "down payment", "Down"], 9)) || 0;
    let outstanding = parseFloat(get(["Outstanding", "outstanding", "Pending"], 10));
    if (isNaN(outstanding) || get(["Outstanding", "outstanding", "Pending"], 10) === "") {
        outstanding = Math.max(0, bill - down);
    }

    return {
        name: name,
        father: get(["Father / Husband Name", "Father", "father", "Husband"], 1),
        mobile: mobile,
        altMobile: get(["Alternate Mobile", "Alt Mobile", "alt mobile"], 3),
        village: get(["Village", "village"], 4),
        taluka: get(["Taluka", "taluka"], 5),
        district: get(["District", "district"], 6),
        address: get(["Address", "address"], 7),
        bill: bill,
        down: down,
        outstanding: outstanding,
        executive: get(["Recovery Executive", "Executive", "executive"], 11),
        followup: parseExcelDate(get(["Next Follow-up (YYYY-MM-DD)", "Next Follow-up", "Follow-up", "followup"], 12)),
        remarks: get(["Remarks", "remarks", "Notes"], 13)
    };
}

function importCustomersFromExcel(file, options) {
    options = options || {};
    const mode = options.mode || "append";

    return new Promise((resolve, reject) => {
        if (typeof XLSX === "undefined") {
            reject(new Error("Excel library not loaded"));
            return;
        }
        if (!file) {
            reject(new Error("No file selected"));
            return;
        }

        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                const data = new Uint8Array(e.target.result);
                const wb = XLSX.read(data, { type: "array" });
                const sheet = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

                if (!rows.length) {
                    reject(new Error("Excel માં data નથી"));
                    return;
                }

                const imported = [];
                const skipped = [];

                rows.forEach((row, i) => {
                    const c = rowToCustomer(row);
                    if (c) imported.push(c);
                    else skipped.push(i + 2);
                });

                if (!imported.length) {
                    reject(new Error("Valid customer rows મળ્યા નથી. Template headers check કરો."));
                    return;
                }

                const shopId = (typeof currentShopId === "function") ? currentShopId() : null;
                if (!shopId) {
                    reject(new Error("No shop context. Login as shop admin."));
                    return;
                }

                if (mode === "replace") {
                    // delete existing for this shop then insert
                    // (simple approach: just insert; full replace would need bulk delete)
                    const saved = await sbBulkInsertCustomers(imported, shopId);
                    if (typeof reloadAllData === "function") await reloadAllData();
                    resolve({
                        total: imported.length,
                        saved: saved.length,
                        skipped: skipped.length
                    });
                } else {
                    // append - skip duplicate mobiles client-side against current list
                    const existingMobiles = new Set((window.customers || []).map(c => String(c.mobile || "")));
                    const unique = [];
                    imported.forEach(c => {
                        if (existingMobiles.has(String(c.mobile))) {
                            skipped.push(c.mobile);
                        } else {
                            unique.push(c);
                            existingMobiles.add(String(c.mobile));
                        }
                    });
                    const saved = await sbBulkInsertCustomers(unique, shopId);
                    if (typeof reloadAllData === "function") await reloadAllData();
                    resolve({
                        total: imported.length,
                        saved: saved.length,
                        skipped: skipped.length
                    });
                }
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error("File read failed"));
        reader.readAsArrayBuffer(file);
    });
}

function handleCustomerExcelUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const mode = confirm("OK = નવા customers ADD (append)\nCancel = બધા REPLACE (note: replace inserts new rows)")
        ? "append"
        : "replace";

    importCustomersFromExcel(file, { mode })
        .then(res => {
            alert("✅ Excel Import Successful!\n\nImported rows: " + res.total +
                "\nSaved: " + res.saved +
                "\nSkipped: " + res.skipped);
            event.target.value = "";
        })
        .catch(err => {
            alert("Import failed: " + (err.message || err));
            event.target.value = "";
        });
}

function exportCustomersToExcel() {
    if (typeof XLSX === "undefined") {
        alert("Excel library load નથી થઈ.");
        return;
    }
    const list = window.customers || [];
    if (!list.length) {
        alert("Export કરવા customers નથી.");
        return;
    }
    const rows = [CUSTOMER_EXCEL_HEADERS];
    list.forEach(c => {
        rows.push([
            c.name || "",
            c.father || "",
            c.mobile || "",
            c.altMobile || "",
            c.village || "",
            c.taluka || "",
            c.district || "",
            c.address || "",
            c.bill || 0,
            c.down || 0,
            c.outstanding || 0,
            c.executive || "",
            c.followup || "",
            c.remarks || ""
        ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, "BK-Customers-Export.xlsx");
}

window.downloadCustomerTemplate = downloadCustomerTemplate;
window.handleCustomerExcelUpload = handleCustomerExcelUpload;
window.exportCustomersToExcel = exportCustomersToExcel;
window.importCustomersFromExcel = importCustomersFromExcel;
