/* ==========================================================
   VO RECOVERY MANAGER - Firebase Config
   Project: bk-device-manager
========================================================== */

const FIREBASE_CONFIG = {

    apiKey: "AIzaSyAZVjwHZJn_ELDIllC-CceZdXZ6NKAZOso",
    authDomain: "bk-device-manager.firebaseapp.com",
    projectId: "bk-device-manager",
    storageBucket: "bk-device-manager.firebasestorage.app",
    messagingSenderId: "876972263144",
    appId: "1:876972263144:web:39138b39ffd8c29d03ab5d",
    measurementId: "G-LTN3Z9VE3F"

};

// true = Firebase cloud use | false = localStorage only
const FIREBASE_ENABLED = true;

// Collection names in Firestore
const FB_COLLECTIONS = {
    customers: "customers",
    recoveries: "recoveries",
    users: "users",
    settings: "settings",
    backups: "backups"
};
