
ALTER TABLE customers ADD COLUMN IF NOT EXISTS product_name TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auto_reminder BOOLEAN DEFAULT true;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS reminder_interval_days INT DEFAULT 3;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS next_reminder_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS extra JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID,
    user_id UUID,
    username TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all_audit_log" ON audit_log;
CREATE POLICY "public_all_audit_log" ON audit_log FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
NOTIFY pgrst, 'reload schema';
