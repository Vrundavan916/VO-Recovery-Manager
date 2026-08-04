-- Full shops rebuild-safe fix + schema reload
-- Run in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create shops if missing
CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    code TEXT,
    contact_number TEXT,
    email TEXT,
    address TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    plan_name TEXT DEFAULT 'Basic',
    license_expiry DATE,
    max_users INT DEFAULT 5,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure every column exists
ALTER TABLE shops ADD COLUMN IF NOT EXISTS id UUID;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT 'Basic';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS license_expiry DATE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS max_users INT DEFAULT 5;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Fill blanks so NOT NULL can work later
UPDATE shops SET name = COALESCE(NULLIF(trim(name), ''), 'Shop') WHERE name IS NULL OR trim(name) = '';
UPDATE shops SET code = COALESCE(NULLIF(trim(code), ''), 'SH' || substr(replace(id::text, '-', ''), 1, 6))
WHERE code IS NULL OR trim(code) = '';

-- Users table ensure
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    shop_id UUID,
    display_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID UNIQUE,
    company_name TEXT,
    software_name TEXT DEFAULT 'BK Recovery Manager',
    phone TEXT,
    email TEXT,
    address TEXT,
    logo_data_url TEXT,
    recovery_email TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL,
    plan_name TEXT NOT NULL DEFAULT 'Basic',
    amount NUMERIC(12,2) DEFAULT 0,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL DEFAULT (CURRENT_DATE + 365),
    status TEXT NOT NULL DEFAULT 'active',
    remarks TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS + open policies
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_all_shops" ON shops;
CREATE POLICY "public_all_shops" ON shops FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_all_users" ON users;
CREATE POLICY "public_all_users" ON users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_all_settings" ON settings;
CREATE POLICY "public_all_settings" ON settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_all_subscriptions" ON subscriptions;
CREATE POLICY "public_all_subscriptions" ON subscriptions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

-- Show columns so you can verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'shops'
ORDER BY ordinal_position;
