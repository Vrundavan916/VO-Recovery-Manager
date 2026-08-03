# VO Recovery Manager

**Version:** 2.0.0 – Supabase Multi-Tenant Edition

Jewellery recovery management software for multiple jewellers.

## Features
- Secure Login (Supabase)
- Super Admin + Shop-level Admins / Users
- Multi-shop isolation (each shop sees only its data)
- Customer Management
- Excel Template Download / Bulk Upload / Export
- Outstanding Recovery
- Reports + Print
- Company branding per shop
- GitHub Pages compatible (vanilla HTML/CSS/JS)

## Default Logins

| Username     | Password | Role         | Shop                        |
|--------------|----------|--------------|-----------------------------|
| superadmin   | 1234     | Super Admin  | All shops                   |
| admin        | 1234     | Admin        | Vrundavan Ornaments         |
| vo_user      | 1234     | User         | Vrundavan Ornaments         |
| rj_admin     | 1234     | Admin        | Raj Jewellers               |
| gp_admin     | 1234     | Admin        | Golden Palace Jewellers     |

## Setup

1. Open Supabase SQL Editor and run:
   `database/supabase_schema.sql`
2. Confirm tables: `shops`, `users`, `customers`, `recoveries`, `settings`
3. Open `frontend/login.html` (or deploy `frontend/` to GitHub Pages)
4. Login with any account above

## Supabase Config

File: `frontend/js/supabase-config.js`

```
URL: https://tmgpajynsvpjhpgrziue.supabase.co
Anon key: (publishable key provided)
```

## Multi-tenancy

- Super Admin sees data of all shops
- Shop Admin / User sees only their `shop_id` data
- Customers & recoveries always scoped by `shop_id`

## Developed For
Multi-jeweller businesses

Powered by **BK Design Hub**
