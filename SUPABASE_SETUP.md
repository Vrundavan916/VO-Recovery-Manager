# VO Recovery Manager – Supabase Setup

## 1) Run SQL Schema

1. Open https://supabase.com/dashboard → your project
2. SQL Editor → New query
3. Paste contents of `database/supabase_schema.sql`
4. Run

This creates:
- shops (3 seeded jewellery shops)
- users (superadmin + shop admins)
- customers
- recoveries
- settings
- RLS policies allowing anon access (tighten later if needed)

## 2) Verify Config

`frontend/js/supabase-config.js` already has:

- Project URL
- Publishable (anon) key

## 3) Open App

- Local: open `frontend/login.html`
- GitHub Pages: publish the `frontend` folder as site root (or whole repo and point to `/frontend/`)

## 4) Default Logins

- superadmin / 1234  → all shops
- admin / 1234       → Vrundavan Ornaments
- rj_admin / 1234    → Raj Jewellers
- gp_admin / 1234    → Golden Palace Jewellers

## 5) Adding more shops

Insert into `shops` and create users with matching `shop_id` in Supabase Table Editor or SQL.
