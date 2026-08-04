# VO Recovery Manager Changelog

## Unreleased – Super Admin Module
- New pages: `super-dashboard.html`, `companies.html`, `subscription.html`
- New data layer (`js/super-admin.js`, additions to `js/supabase-db.js`): shop CRUD ("Add Jewellery"), activate/deactivate shop, subscription/license renewal, system-wide stats, audit log
- New tables (`database/super_admin_migration.sql`): `subscriptions`, `audit_log`; new columns on `shops` (`plan_name`, `license_expiry`, `max_users`, `notes`)
- Super Admin sidebar links are injected automatically on every page when logged in as `super_admin`
- Run `database/super_admin_migration.sql` in Supabase SQL editor after the base schema
- Still pending from the original spec: remove "Register Company" link from `login.html`, auto backup, an audit-log viewer page (table exists, capture works, no UI yet)

## V0.03
- Firebase Firestore integration
- Full cloud backup to Firebase Console
- Cloud restore from latest backup
- Auto sync customers / recoveries / users / settings
- Reports customer dropdown + filter/search/export fixed
- Recovery extra fields (payment mode, receipt, collected by)

## V0.02
- Login Module
- Reports fixes

## V0.01
- Repository Created
- README Added
- Frontend Structure Created
