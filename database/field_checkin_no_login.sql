-- Field check-in without full website login
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_field_agent BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS field_pin TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile TEXT;

-- Unique agent codes recommended
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_agent_code ON users (agent_code) WHERE agent_code IS NOT NULL AND agent_code <> '';

-- Example setup for one field employee:
-- UPDATE users
-- SET is_field_agent = true,
--     agent_code = 'MUKESH01',
--     field_pin = '4821',
--     display_name = 'Mukesh'
-- WHERE username = 'mukesh';
