-- ============================================================
-- SUPER ADMIN PASSWORD SECURITY
-- 1) App now stores SHA-256(pepper + password) hashes
-- 2) Set a STRONG password for superadmin (min 12 chars, letter+number+symbol)
-- 3) Generate hash: open browser console on login page after deploy and run:
--      await hashPassword("YourStrongPass@2026")
--    OR use the Python one-liner in README
-- 4) Paste the 64-char hex below
-- ============================================================

-- Example: replace HASH_HERE with result of hashPassword("YourStrongPass@2026")
UPDATE users
SET password = 'HASH_HERE'
WHERE username = 'superadmin' AND role = 'super_admin';

-- Verify row exists
SELECT id, username, role,
       CASE WHEN password ~ '^[a-f0-9]{64}$' THEN 'HASHED' ELSE 'PLAIN/LEGACY' END AS pwd_status,
       length(password) AS pwd_len
FROM users
WHERE role = 'super_admin';

-- Optional: force all plain passwords to be re-set on next login
-- (app auto-upgrades plain → hash on successful login)
SELECT username, role,
       CASE WHEN password ~ '^[a-f0-9]{64}$' THEN 'HASHED' ELSE 'NEEDS_LOGIN_UPGRADE' END
FROM users
ORDER BY role, username;
