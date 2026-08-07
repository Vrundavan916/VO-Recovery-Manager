
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_email TEXT;
NOTIFY pgrst, 'reload schema';
