# Supabase Setup – BK Recovery Manager SaaS

## 1) Run SQL

1. https://supabase.com/dashboard → your project  
2. SQL Editor → New query  
3. Paste & run `database/supabase_schema.sql`  
4. Paste & run `database/super_admin_migration.sql`

## 2) Config

`frontend/js/supabase.js` already contains:

- Project URL  
- Publishable (anon) key  

## 3) Open app

- Local: open `frontend/login.html`  
- GitHub Pages: publish the `frontend` folder as site root  

## 4) Default logins

- superadmin / 1234 → all shops  
- admin / 1234 → BK Recovery Manager  
- rj_admin / 1234 → Raj Jewellers  
- gp_admin / 1234 → Golden Palace Jewellers  

## 5) Adding shops

**Only Super Admin** via **Company Management** in the app.  
There is **no public company registration**.

## If you see: Could not find the 'code' column of 'shops'

Your Supabase project has an older `shops` table without new columns.

1. SQL Editor → New query
2. Paste **entire** file: `database/FIX_shops_columns.sql`
3. Run
4. Wait 5–10 seconds, then try **Add Jewellery** again

This also fixes related user / subscription / settings columns and refreshes schema cache.
