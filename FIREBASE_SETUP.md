# VO Recovery Manager – Firebase Console Setup

## 1) Firebase Project બનાવો

1. https://console.firebase.google.com ખોલો
2. **Add project** → નામ આપો (જેમ કે `vo-recovery-manager`)
3. Google Analytics optional (skip કરી શકો)
4. Project create થયા પછી **Continue**

## 2) Firestore Database ચાલુ કરો

1. Left menu → **Build** → **Firestore Database**
2. **Create database**
3. Mode: **Start in test mode** (પહેલા 30 દિવસ open rules)
4. Location: `asia-south1` (Mumbai) પસંદ કરો
5. Enable

### Test mode rules (પહેલા માટે)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> Production માં પછી Auth rules મૂકવા.

## 3) Web App Config કાઢો

1. Project Overview → **</> (Web)** icon
2. App nickname: `VO Recovery`
3. **Register app**
4. `firebaseConfig` object copy કરો:

```
apiKey: "..."
authDomain: "....firebaseapp.com"
projectId: "..."
storageBucket: "....appspot.com"
messagingSenderId: "..."
appId: "..."
```

## 4) Keys paste કરો

File ખોલો:

```
frontend/js/firebase-config.js
```

`YOUR_API_KEY` વગેરે ની જગ્યાએ તમારી real keys paste કરો.

`FIREBASE_ENABLED = true` રાખો.

## 5) App ચલાવો

1. `frontend/login.html` browser માં ખોલો
2. Login: `admin` / `1234`
3. Settings → **☁ Cloud Backup** દબાવો
4. Firebase Console → **Firestore** → આ collections દેખાશે:

| Collection | શું છે |
|------------|--------|
| `customers` | બધા customers |
| `recoveries` | recovery entries |
| `users` | login users |
| `settings` | app settings |
| `backups` | full backup snapshots + `latest` |

## 6) Backup / Restore

| Button | કામ |
|--------|-----|
| **Download JSON** | Local file download + auto cloud backup |
| **☁ Cloud Backup** | Full data Firebase Console માં save |
| **☁ Cloud Restore** | Latest Firebase backup થી restore |
| **Restore JSON File** | Local JSON file import |

## 7) Auto Sync

Customer / Recovery save અથવા delete થાય ત્યારે data Firebase પર automatic sync થાય છે.

---

© 2026 BK Design Hub
