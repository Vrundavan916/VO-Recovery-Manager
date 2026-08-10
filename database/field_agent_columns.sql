-- Optional: ensure field agent columns (safe if already exist)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_field_agent BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile TEXT;

-- Example: mark user as field agent
-- UPDATE users SET is_field_agent = true WHERE username = 'agent1';
