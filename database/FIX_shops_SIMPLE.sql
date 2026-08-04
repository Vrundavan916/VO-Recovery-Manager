-- BK Recovery Manager - SIMPLE FIX (mobile safe)
-- Supabase SQL Editor ma paste karo ane Run

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

UPDATE shops
SET code = 'SH' || substr(replace(id::text, '-', ''), 1, 6)
WHERE code IS NULL OR trim(code) = '';

ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE recoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_all_shops" ON shops;
CREATE POLICY "public_all_shops" ON shops FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_all_users" ON users;
CREATE POLICY "public_all_users" ON users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_all_customers" ON customers;
CREATE POLICY "public_all_customers" ON customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_all_recoveries" ON recoveries;
CREATE POLICY "public_all_recoveries" ON recoveries FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_all_settings" ON settings;
CREATE POLICY "public_all_settings" ON settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

SELECT 'OK - shops.code ready' AS status;
