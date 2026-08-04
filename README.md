# BK Recovery Manager

**Version:** 3.0.0 – Production SaaS (Supabase Multi-Tenant)

Commercial jewellery recovery management for multiple jewellers.  
Only Super Admin can onboard new companies. No public registration.

## Features

- Premium UI (luxury jewellery theme)
- Supabase-only backend (no LocalStorage / Firebase data)
- Super Admin: dashboard, company CRUD, activate/deactivate, subscriptions, renew
- Shop Admin / User: customers, recovery, reports, settings (scoped by `shop_id`)
- Excel template / bulk import / export
- Outstanding auto-update on recovery
- Reports: filter, CSV export, print
- Remember me + Forgot password (admin-assisted reset)
- Modular JavaScript

## Default Logins

| Username   | Password | Role        | Shop                    |
|------------|----------|-------------|-------------------------|
| superadmin | 1234     | Super Admin | All shops               |
| admin      | 1234     | Admin       | BK Recovery Manager     |
| vo_user    | 1234     | User        | BK Recovery Manager     |
| rj_admin   | 1234     | Admin       | Raj Jewellers           |
| gp_admin   | 1234     | Admin       | Golden Palace Jewellers |

## Setup

1. Supabase → SQL Editor → run in order:
   - `database/supabase_schema.sql`
   - `database/super_admin_migration.sql`
2. Confirm tables: `shops`, `users`, `customers`, `recoveries`, `settings`, `subscriptions`, `audit_log`
3. Open `frontend/login.html` or deploy `frontend/` to GitHub Pages / any static host
4. Login as `superadmin` / `1234`

## Supabase Config

`frontend/js/supabase.js`

- URL: `https://tmgpajynsvpjhpgrziue.supabase.co`
- Anon key: publishable key (already set)

## Structure

```
frontend/
  login.html, dashboard.html, customers.html, recovery.html,
  reports.html, settings.html, super-dashboard.html,
  companies.html, subscription.html
  css/style.css
  js/
    supabase.js   – client + session
    auth.js       – login / roles / logout
    utils.js      – formatters / helpers
    db.js         – all Supabase CRUD
    app.js        – customers, recovery, reports, settings UI
    company.js    – super-admin company & subscription UI
    excel-import.js
database/
  supabase_schema.sql
  super_admin_migration.sql
```

## Security notes

- RLS enabled with permissive anon policies for GitHub Pages + anon key (tighten for production with Supabase Auth or Edge Functions).
- Shop isolation is enforced in application queries via `shop_id`.
- Expired / inactive shops cannot login (shop staff).
- Passwords are stored plain to match original app simplicity — hash before commercial production if required.

## Developed by

**BK Design Hub** · BK Recovery Manager Commercial Edition
