/* ==========================================================
   VO RECOVERY MANAGER - Firebase Firestore Layer
   Full cloud backup + sync with Firebase Console
========================================================== */

let fbApp = null;
let fbDb = null;
let fbReady = false;

function isFirebaseConfigured() {
    if (typeof FIREBASE_ENABLED === "undefined" || !FIREBASE_ENABLED) return false;
    if (typeof FIREBASE_CONFIG === "undefined") return false;
    if (!FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey === "YOUR_API_KEY") return false;
    if (!FIREBASE_CONFIG.projectId || FIREBASE_CONFIG.projectId === "YOUR_PROJECT_ID") return false;
    return true;
}

function initFirebase() {
    if (!isFirebaseConfigured()) {
        console.log("VO RM: Firebase not configured — using LocalStorage only.");
        fbReady = false;
        updateFirebaseStatusUI(false, "Local Only");
        return false;
    }

    if (typeof firebase === "undefined") {
        console.error("VO RM: Firebase SDK not loaded.");
        updateFirebaseStatusUI(false, "SDK Missing");
        return false;
    }

    try {
        if (!firebase.apps.length) {
            fbApp = firebase.initializeApp(FIREBASE_CONFIG);
        } else {
            fbApp = firebase.app();
        }
        fbDb = firebase.firestore();
        fbReady = true;
        console.log("VO RM: Firebase connected.");
        updateFirebaseStatusUI(true, "Online");
        return true;
    } catch (e) {
        console.error("VO RM: Firebase init error", e);
        fbReady = false;
        updateFirebaseStatusUI(false, "Error");
        return false;
    }
}

function updateFirebaseStatusUI(online, text) {
    const el = document.getElementById("firebaseStatus");
    if (el) {
        el.innerHTML = text || (online ? "Online" : "Offline");
        el.style.color = online ? "#16a34a" : "#ef4444";
    }
    const badge = document.getElementById("dbStatusBadge");
    if (badge) {
        badge.innerHTML = online ? "Firebase Online" : "Local Storage";
        badge.className = online ? "badge badge-success" : "badge badge-warning";
    }
}

/* ---------- HELPERS ---------- */

async function fbSetDoc(collection, docId, data) {
    if (!fbReady) return false;
    try {
        await fbDb.collection(collection).doc(String(docId)).set(data, { merge: true });
        return true;
    } catch (e) {
        console.error("fbSetDoc", collection, e);
        return false;
    }
}

async function fbDeleteDoc(collection, docId) {
    if (!fbReady) return false;
    try {
        await fbDb.collection(collection).doc(String(docId)).delete();
        return true;
    } catch (e) {
        console.error("fbDeleteDoc", collection, e);
        return false;
    }
}

async function fbGetAll(collection) {
    if (!fbReady) return null;
    try {
        const snap = await fbDb.collection(collection).get();
        const list = [];
        snap.forEach(doc => {
            list.push({ ...doc.data(), _docId: doc.id });
        });
        return list;
    } catch (e) {
        console.error("fbGetAll", collection, e);
        return null;
    }
}

async function fbClearCollection(collection) {
    if (!fbReady) return false;
    try {
        const snap = await fbDb.collection(collection).get();
        const batch = fbDb.batch();
        let count = 0;
        snap.forEach(doc => {
            batch.delete(doc.ref);
            count++;
            // Firestore batch limit 500
            if (count >= 450) {
                // remaining handled in next calls if needed
            }
        });
        await batch.commit();
        return true;
    } catch (e) {
        console.error("fbClearCollection", collection, e);
        return false;
    }
}

/* ---------- CUSTOMERS ---------- */

async function syncCustomersToFirebase(list) {
    if (!fbReady) return;
    const data = list || (JSON.parse(localStorage.getItem("customers")) || []);
    for (const c of data) {
        const id = c.id || Date.now();
        await fbSetDoc(FB_COLLECTIONS.customers, id, { ...c, id: id });
    }
}

async function loadCustomersFromFirebase() {
    const list = await fbGetAll(FB_COLLECTIONS.customers);
    if (!list) return null;
    return list.map(c => {
        const { _docId, ...rest } = c;
        return rest;
    });
}

/* ---------- RECOVERIES ---------- */

async function syncRecoveriesToFirebase(list) {
    if (!fbReady) return;
    const data = list || (JSON.parse(localStorage.getItem("recoveries")) || []);
    for (const r of data) {
        const id = r.id || Date.now();
        await fbSetDoc(FB_COLLECTIONS.recoveries, id, { ...r, id: id });
    }
}

async function loadRecoveriesFromFirebase() {
    const list = await fbGetAll(FB_COLLECTIONS.recoveries);
    if (!list) return null;
    return list.map(r => {
        const { _docId, ...rest } = r;
        return rest;
    });
}

/* ---------- USERS ---------- */

async function syncUsersToFirebase(list) {
    if (!fbReady) return;
    const data = list || getUsers();
    for (const u of data) {
        await fbSetDoc(FB_COLLECTIONS.users, u.username, {
            username: u.username,
            password: u.password,
            role: u.role
        });
    }
}

async function loadUsersFromFirebase() {
    const list = await fbGetAll(FB_COLLECTIONS.users);
    if (!list || list.length === 0) return null;
    return list.map(u => ({
        username: u.username,
        password: u.password,
        role: u.role || "User"
    }));
}

/* ---------- SETTINGS ---------- */

async function syncSettingsToFirebase(obj) {
    if (!fbReady) return;
    const data = obj || (JSON.parse(localStorage.getItem("settings")) || {});
    await fbSetDoc(FB_COLLECTIONS.settings, "app", data);
}

async function loadSettingsFromFirebase() {
    if (!fbReady) return null;
    try {
        const doc = await fbDb.collection(FB_COLLECTIONS.settings).doc("app").get();
        if (doc.exists) return doc.data();
        return null;
    } catch (e) {
        console.error("loadSettingsFromFirebase", e);
        return null;
    }
}

/* ---------- FULL CLOUD BACKUP (Firebase Console visible) ---------- */

async function fullBackupToFirebase() {
    if (!fbReady) {
        alert("Firebase connected નથી. પહેલા firebase-config.js માં keys paste કરો.");
        return false;
    }

    try {
        const customersData = JSON.parse(localStorage.getItem("customers")) || [];
        const recoveriesData = JSON.parse(localStorage.getItem("recoveries")) || [];
        const usersData = getUsers();
        const settingsData = JSON.parse(localStorage.getItem("settings")) || {};

        const backupId = "backup_" + Date.now();
        const backupDoc = {
            id: backupId,
            backupDate: new Date().toISOString(),
            company: (settingsData.company) || "Vrundavan Ornaments Pvt. Ltd.",
            version: "1.0.0",
            counts: {
                customers: customersData.length,
                recoveries: recoveriesData.length,
                users: usersData.length
            },
            customers: customersData,
            recoveries: recoveriesData,
            users: usersData,
            settings: settingsData
        };

        // 1) Save full snapshot in backups collection
        await fbSetDoc(FB_COLLECTIONS.backups, backupId, backupDoc);

        // 2) Also keep live collections in sync
        await syncCustomersToFirebase(customersData);
        await syncRecoveriesToFirebase(recoveriesData);
        await syncUsersToFirebase(usersData);
        await syncSettingsToFirebase(settingsData);

        // 3) Mark latest
        await fbSetDoc(FB_COLLECTIONS.backups, "latest", {
            latestId: backupId,
            backupDate: backupDoc.backupDate,
            counts: backupDoc.counts
        });

        localStorage.setItem("lastFirebaseBackup", backupDoc.backupDate);

        const lastEl = document.getElementById("lastBackupDate");
        if (lastEl) lastEl.innerHTML = new Date(backupDoc.backupDate).toLocaleString("en-IN");

        alert("✅ Full Backup Firebase પર save થયો!\n\nBackup ID: " + backupId + "\nCustomers: " + customersData.length + "\nRecoveries: " + recoveriesData.length + "\n\nFirebase Console > Firestore > backups માં જુઓ.");
        return true;
    } catch (e) {
        console.error(e);
        alert("Backup failed: " + (e.message || e));
        return false;
    }
}

async function restoreFromFirebaseLatest() {
    if (!fbReady) {
        alert("Firebase connected નથી.");
        return false;
    }

    try {
        const latestDoc = await fbDb.collection(FB_COLLECTIONS.backups).doc("latest").get();
        if (!latestDoc.exists) {
            alert("Firebase પર કોઈ backup મળ્યો નથી.");
            return false;
        }

        const latestId = latestDoc.data().latestId;
        const backupSnap = await fbDb.collection(FB_COLLECTIONS.backups).doc(latestId).get();

        if (!backupSnap.exists) {
            alert("Latest backup document not found.");
            return false;
        }

        const backup = backupSnap.data();

        if (!confirm("Firebase backup restore કરશો?\n\nDate: " + (backup.backupDate || "-") + "\nCustomers: " + (backup.counts?.customers || 0) + "\nRecoveries: " + (backup.counts?.recoveries || 0) + "\n\nLocal data overwrite થશે.")) {
            return false;
        }

        customers = backup.customers || [];
        recoveries = backup.recoveries || [];
        settings = backup.settings || {};

        localStorage.setItem("customers", JSON.stringify(customers));
        localStorage.setItem("recoveries", JSON.stringify(recoveries));
        localStorage.setItem("settings", JSON.stringify(settings));

        if (backup.users && backup.users.length) {
            localStorage.setItem("users", JSON.stringify(backup.users));
        }

        if (typeof loadCustomers === "function") loadCustomers();
        if (typeof loadRecoveryTable === "function") loadRecoveryTable();
        if (typeof loadReports === "function") loadReports();
        if (typeof updateDashboard === "function") updateDashboard();
        if (typeof updateRecoverySummary === "function") updateRecoverySummary();
        if (typeof loadUserList === "function") loadUserList();

        alert("✅ Firebase backup restore થયો!");
        return true;
    } catch (e) {
        console.error(e);
        alert("Restore failed: " + (e.message || e));
        return false;
    }
}

async function pullLiveFromFirebase() {
    if (!fbReady) return false;

    try {
        const [c, r, u, s] = await Promise.all([
            loadCustomersFromFirebase(),
            loadRecoveriesFromFirebase(),
            loadUsersFromFirebase(),
            loadSettingsFromFirebase()
        ]);

        let changed = false;

        if (c && c.length >= 0) {
            customers = c;
            localStorage.setItem("customers", JSON.stringify(customers));
            changed = true;
        }
        if (r && r.length >= 0) {
            recoveries = r;
            localStorage.setItem("recoveries", JSON.stringify(recoveries));
            changed = true;
        }
        if (u && u.length) {
            localStorage.setItem("users", JSON.stringify(u));
            changed = true;
        }
        if (s) {
            settings = s;
            localStorage.setItem("settings", JSON.stringify(settings));
            changed = true;
        }

        if (changed) {
            if (typeof loadCustomers === "function") loadCustomers();
            if (typeof loadRecoveryTable === "function") loadRecoveryTable();
            if (typeof loadReports === "function") loadReports();
            if (typeof updateDashboard === "function") updateDashboard();
            if (typeof updateRecoverySummary === "function") updateRecoverySummary();
        }

        return true;
    } catch (e) {
        console.error("pullLiveFromFirebase", e);
        return false;
    }
}

/* ---------- AUTO SYNC AFTER LOCAL SAVE ---------- */

async function cloudSyncAll() {
    if (!fbReady) return;
    try {
        const customersData = JSON.parse(localStorage.getItem("customers")) || [];
        const recoveriesData = JSON.parse(localStorage.getItem("recoveries")) || [];
        const usersData = (typeof getUsers === "function") ? getUsers() : [];
        const settingsData = JSON.parse(localStorage.getItem("settings")) || {};

        await Promise.all([
            syncCustomersToFirebase(customersData),
            syncRecoveriesToFirebase(recoveriesData),
            syncUsersToFirebase(usersData),
            syncSettingsToFirebase(settingsData)
        ]);
        console.log("VO RM: Cloud sync done.");
    } catch (e) {
        console.error("cloudSyncAll", e);
    }
}

async function cloudDeleteCustomer(id) {
    if (!fbReady || !id) return;
    await fbDeleteDoc(FB_COLLECTIONS.customers, id);
}

async function cloudDeleteRecovery(id) {
    if (!fbReady || !id) return;
    await fbDeleteDoc(FB_COLLECTIONS.recoveries, id);
}

/* ---------- INIT ON LOAD ---------- */

async function firebaseBoot() {
    const ok = initFirebase();
    if (!ok) return;

    // Prefer cloud data if available
    await pullLiveFromFirebase();
}

// Export for console testing
window.VO_FIREBASE = {
    init: initFirebase,
    backup: fullBackupToFirebase,
    restore: restoreFromFirebaseLatest,
    sync: cloudSyncAll,
    pull: pullLiveFromFirebase,
    ready: () => fbReady
};
