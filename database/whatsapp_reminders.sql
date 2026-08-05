-- WhatsApp auto-reminder fields on customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auto_reminder BOOLEAN DEFAULT true;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS reminder_interval_days INT DEFAULT 3;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS next_reminder_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS due_date DATE;

NOTIFY pgrst, 'reload schema';
SELECT 'WhatsApp reminder columns ready' AS status;
