-- ============================================================
-- BK Recovery Manager → Professional Collection SaaS
-- Migration: Aging | PTP | Agents | Reminders | Payments |
--            Legal | Escalation | Receipts | ERP Sync
-- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- Run in Supabase SQL Editor after existing schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1) EXTEND EXISTING TABLES
-- ============================================================

-- SHOPS
ALTER TABLE shops ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(14,2) DEFAULT 0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS default_credit_limit NUMERIC(14,2) DEFAULT 0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS legal_notice_template TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS reminder_letter_template TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'razorpay';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS razorpay_key_id TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS razorpay_key_secret TEXT; -- store encrypted in production
ALTER TABLE shops ADD COLUMN IF NOT EXISTS whatsapp_provider TEXT;   -- interakt / wati / gupshup / meta
ALTER TABLE shops ADD COLUMN IF NOT EXISTS whatsapp_api_key TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS sms_provider TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS sms_api_key TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS erp_sync_enabled BOOLEAN DEFAULT false;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS erp_type TEXT;           -- tally / busy / zoho
ALTER TABLE shops ADD COLUMN IF NOT EXISTS escalation_days INT DEFAULT 90;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS ptp_grace_days INT DEFAULT 1;

-- USERS (agents)
ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_field_agent BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_assigned_accounts INT DEFAULT 50;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_email TEXT;

-- CUSTOMERS
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(14,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS balance NUMERIC(14,2) DEFAULT 0;  -- mirror of outstanding
ALTER TABLE customers ADD COLUMN IF NOT EXISTS aging_bucket TEXT DEFAULT '0-30'
  CHECK (aging_bucket IS NULL OR aging_bucket IN ('0-30','31-60','61-90','90+','current','none'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS oldest_due_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS ptp_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS ptp_amount NUMERIC(12,2);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS ptp_notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_legal_notice_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS next_reminder_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auto_reminder BOOLEAN DEFAULT true;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS reminder_interval_days INT DEFAULT 3;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS risk_score INT DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS product_name TEXT DEFAULT '';

-- RECOVERIES
ALTER TABLE recoveries ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'cash'
  CHECK (payment_mode IS NULL OR payment_mode IN ('cash','upi','gateway','cheque','bank','other'));
ALTER TABLE recoveries ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT;
ALTER TABLE recoveries ADD COLUMN IF NOT EXISTS gateway_order_id TEXT;
ALTER TABLE recoveries ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE recoveries ADD COLUMN IF NOT EXISTS reconciled BOOLEAN DEFAULT false;
ALTER TABLE recoveries ADD COLUMN IF NOT EXISTS ptp_id UUID;
ALTER TABLE recoveries ADD COLUMN IF NOT EXISTS receipt_no TEXT;

-- ============================================================
-- 2) NEW TABLES
-- ============================================================

-- Customer balance / aging snapshot (one row per customer)
CREATE TABLE IF NOT EXISTS customer_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  total_outstanding NUMERIC(14,2) DEFAULT 0,
  bucket_0_30   NUMERIC(14,2) DEFAULT 0,
  bucket_31_60  NUMERIC(14,2) DEFAULT 0,
  bucket_61_90  NUMERIC(14,2) DEFAULT 0,
  bucket_90_plus NUMERIC(14,2) DEFAULT 0,
  credit_limit  NUMERIC(14,2) DEFAULT 0,
  credit_used   NUMERIC(14,2) DEFAULT 0,
  as_of         TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (customer_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_balances_shop ON customer_balances(shop_id);
CREATE INDEX IF NOT EXISTS idx_customer_balances_90 ON customer_balances(shop_id, bucket_90_plus)
  WHERE bucket_90_plus > 0;

-- Promise to Pay
CREATE TABLE IF NOT EXISTS promises_to_pay (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  promised_amount NUMERIC(12,2) NOT NULL CHECK (promised_amount >= 0),
  promised_date DATE NOT NULL,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','kept','broken','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  broken_at TIMESTAMPTZ,
  kept_at TIMESTAMPTZ,
  kept_recovery_id UUID,  -- link after recovery saved
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ptp_shop_status ON promises_to_pay(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_ptp_date ON promises_to_pay(promised_date) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_ptp_customer ON promises_to_pay(customer_id);

-- Agent tasks / assignments
CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','urgent')),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','done','skipped','cancelled')),
  task_type TEXT DEFAULT 'followup'
    CHECK (task_type IN ('followup','visit','call','legal','ptp','other')),
  notes TEXT DEFAULT '',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent ON agent_tasks(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_shop ON agent_tasks(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_due ON agent_tasks(due_date) WHERE status IN ('pending','in_progress');

-- Field visit / call / activity log
CREATE TABLE IF NOT EXISTS agent_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL
    CHECK (activity_type IN ('call','visit','whatsapp','sms','email','note','ptp')),
  outcome TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  gps_lat NUMERIC(10,7),
  gps_lng NUMERIC(10,7),
  duration_sec INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_agent ON agent_activity_log(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_customer ON agent_activity_log(customer_id, created_at DESC);

-- Reminder queue
CREATE TABLE IF NOT EXISTS reminder_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp','sms','email','push')),
  template_key TEXT DEFAULT 'generic_reminder',
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','failed','cancelled')),
  payload JSONB DEFAULT '{}'::jsonb,
  error_msg TEXT,
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminder_pending ON reminder_queue(scheduled_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_reminder_shop ON reminder_queue(shop_id, status);

-- Payment links (Razorpay / Cashfree / UPI)
CREATE TABLE IF NOT EXISTS payment_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'INR',
  gateway TEXT DEFAULT 'razorpay',
  gateway_link_id TEXT,
  gateway_order_id TEXT,
  short_url TEXT,
  qr_data TEXT,
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created','paid','expired','cancelled','failed')),
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  recovery_id UUID,
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_links_customer ON payment_links(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_status ON payment_links(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_links_gateway ON payment_links(gateway_link_id);

-- Legal notices
CREATE TABLE IF NOT EXISTS legal_notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  notice_type TEXT NOT NULL
    CHECK (notice_type IN ('reminder_letter','legal_notice_1','legal_notice_2','final_notice')),
  pdf_url TEXT,
  amount_at_issue NUMERIC(14,2),
  sent_via TEXT,  -- email / whatsapp / post / hand
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_notices_customer ON legal_notices(customer_id, created_at DESC);

-- Escalations
CREATE TABLE IF NOT EXISTS escalations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  reason TEXT NOT NULL
    CHECK (reason IN ('ptp_broken','aging_90','high_value','manual','no_response')),
  level INT DEFAULT 1,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','dismissed')),
  notes TEXT DEFAULT '',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escalations_open ON escalations(shop_id, status)
  WHERE status IN ('open','in_progress');

-- Digital receipts
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  recovery_id UUID NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  receipt_no TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  pdf_url TEXT,
  whatsapp_sent BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (shop_id, receipt_no)
);

CREATE INDEX IF NOT EXISTS idx_receipts_recovery ON receipts(recovery_id);

-- ERP sync log
CREATE TABLE IF NOT EXISTS erp_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,  -- customer / recovery / receipt
  entity_id UUID,
  direction TEXT NOT NULL CHECK (direction IN ('push','pull')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','success','failed')),
  payload JSONB DEFAULT '{}'::jsonb,
  response JSONB,
  error_msg TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erp_sync_shop ON erp_sync_log(shop_id, created_at DESC);

-- Reminder rules (per shop config)
CREATE TABLE IF NOT EXISTS reminder_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL
    CHECK (trigger_type IN ('pre_due','on_due','overdue','ptp_day','ptp_broken','aging_bucket')),
  days_offset INT DEFAULT 0,          -- e.g. -3 pre-due, +7 overdue
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  template_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminder_rules_shop ON reminder_rules(shop_id) WHERE is_active;

-- Optional: simple invoice lines if you later split bills
CREATE TABLE IF NOT EXISTS customer_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_no TEXT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(14,2) DEFAULT 0,
  outstanding NUMERIC(14,2) DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','partial','paid','written_off')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON customer_invoices(customer_id, status);

-- ============================================================
-- 3) FOREIGN KEYS that needed tables first
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recoveries_ptp_id_fkey'
  ) THEN
    ALTER TABLE recoveries
      ADD CONSTRAINT recoveries_ptp_id_fkey
      FOREIGN KEY (ptp_id) REFERENCES promises_to_pay(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'recoveries_ptp_id_fkey: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_links_recovery_id_fkey'
  ) THEN
    ALTER TABLE payment_links
      ADD CONSTRAINT payment_links_recovery_id_fkey
      FOREIGN KEY (recovery_id) REFERENCES recoveries(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'payment_links_recovery_id_fkey: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'receipts_recovery_id_fkey'
  ) THEN
    ALTER TABLE receipts
      ADD CONSTRAINT receipts_recovery_id_fkey
      FOREIGN KEY (recovery_id) REFERENCES recoveries(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'receipts_recovery_id_fkey: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'promises_kept_recovery_fkey'
  ) THEN
    ALTER TABLE promises_to_pay
      ADD CONSTRAINT promises_kept_recovery_fkey
      FOREIGN KEY (kept_recovery_id) REFERENCES recoveries(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'promises_kept_recovery_fkey: %', SQLERRM;
END $$;

-- ============================================================
-- 4) HELPER: compute aging bucket from due date
-- ============================================================

CREATE OR REPLACE FUNCTION compute_aging_bucket(p_due DATE, p_as_of DATE DEFAULT CURRENT_DATE)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_due IS NULL THEN 'none'
    WHEN p_due >= p_as_of THEN 'current'
    WHEN (p_as_of - p_due) <= 30 THEN '0-30'
    WHEN (p_as_of - p_due) <= 60 THEN '31-60'
    WHEN (p_as_of - p_due) <= 90 THEN '61-90'
    ELSE '90+'
  END;
$$;

-- ============================================================
-- 5) RECALCULATE AGING FOR ONE CUSTOMER
-- ============================================================

CREATE OR REPLACE FUNCTION recalc_customer_aging(p_customer_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_shop UUID;
  v_outstanding NUMERIC(14,2);
  v_due DATE;
  v_bucket TEXT;
  v_credit NUMERIC(14,2);
  v_b0 NUMERIC(14,2) := 0;
  v_b31 NUMERIC(14,2) := 0;
  v_b61 NUMERIC(14,2) := 0;
  v_b90 NUMERIC(14,2) := 0;
BEGIN
  SELECT shop_id, COALESCE(outstanding,0),
         COALESCE(due_date, followup, oldest_due_date),
         COALESCE(credit_limit, 0)
    INTO v_shop, v_outstanding, v_due, v_credit
  FROM customers
  WHERE id = p_customer_id;

  IF v_shop IS NULL THEN
    RETURN;
  END IF;

  v_bucket := compute_aging_bucket(v_due);

  -- Simple model: full outstanding sits in the single bucket of oldest due
  IF v_outstanding <= 0 THEN
    v_bucket := 'none';
  ELSIF v_bucket = '0-30' OR v_bucket = 'current' THEN
    v_b0 := v_outstanding;
  ELSIF v_bucket = '31-60' THEN
    v_b31 := v_outstanding;
  ELSIF v_bucket = '61-90' THEN
    v_b61 := v_outstanding;
  ELSIF v_bucket = '90+' THEN
    v_b90 := v_outstanding;
  END IF;

  UPDATE customers
  SET aging_bucket = v_bucket,
      balance = v_outstanding,
      updated_at = NOW()
  WHERE id = p_customer_id;

  INSERT INTO customer_balances (
    shop_id, customer_id, total_outstanding,
    bucket_0_30, bucket_31_60, bucket_61_90, bucket_90_plus,
    credit_limit, credit_used, as_of, updated_at
  ) VALUES (
    v_shop, p_customer_id, v_outstanding,
    v_b0, v_b31, v_b61, v_b90,
    v_credit, v_outstanding, NOW(), NOW()
  )
  ON CONFLICT (customer_id) DO UPDATE SET
    total_outstanding = EXCLUDED.total_outstanding,
    bucket_0_30 = EXCLUDED.bucket_0_30,
    bucket_31_60 = EXCLUDED.bucket_31_60,
    bucket_61_90 = EXCLUDED.bucket_61_90,
    bucket_90_plus = EXCLUDED.bucket_90_plus,
    credit_limit = EXCLUDED.credit_limit,
    credit_used = EXCLUDED.credit_used,
    as_of = NOW(),
    updated_at = NOW();
END;
$$;

-- ============================================================
-- 6) RECALCULATE ALL CUSTOMERS (shop or global)
-- ============================================================

CREATE OR REPLACE FUNCTION recalc_all_aging(p_shop_id UUID DEFAULT NULL)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
  n INT := 0;
BEGIN
  FOR r IN
    SELECT id FROM customers
    WHERE (p_shop_id IS NULL OR shop_id = p_shop_id)
      AND COALESCE(outstanding, 0) >= 0
  LOOP
    PERFORM recalc_customer_aging(r.id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- ============================================================
-- 7) MARK BROKEN PTPs + create escalation
-- ============================================================

CREATE OR REPLACE FUNCTION process_broken_ptp(p_grace_days INT DEFAULT 1)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
  n INT := 0;
  v_grace INT;
BEGIN
  FOR r IN
    SELECT p.*, c.shop_id AS c_shop,
           COALESCE(s.ptp_grace_days, p_grace_days) AS grace
    FROM promises_to_pay p
    JOIN customers c ON c.id = p.customer_id
    LEFT JOIN shops s ON s.id = p.shop_id
    WHERE p.status = 'open'
      AND p.promised_date < (CURRENT_DATE - COALESCE(s.ptp_grace_days, p_grace_days))
  LOOP
    UPDATE promises_to_pay
    SET status = 'broken', broken_at = NOW(), updated_at = NOW()
    WHERE id = r.id;

    INSERT INTO escalations (shop_id, customer_id, reason, level, notes)
    VALUES (
      r.shop_id,
      r.customer_id,
      'ptp_broken',
      1,
      'PTP broken. Promised ' || r.promised_amount || ' on ' || r.promised_date
    );

    -- clear denormalized PTP fields on customer if this was the active one
    UPDATE customers
    SET ptp_date = NULL, ptp_amount = NULL, ptp_notes = NULL
    WHERE id = r.customer_id
      AND ptp_date = r.promised_date;

    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- ============================================================
-- 8) DASHBOARD AGGREGATES (aging summary for a shop)
-- ============================================================

CREATE OR REPLACE FUNCTION shop_aging_summary(p_shop_id UUID)
RETURNS TABLE (
  total_customers BIGINT,
  total_outstanding NUMERIC,
  bucket_0_30 NUMERIC,
  bucket_31_60 NUMERIC,
  bucket_61_90 NUMERIC,
  bucket_90_plus NUMERIC,
  total_overdue NUMERIC,
  open_ptp BIGINT,
  open_escalations BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(DISTINCT c.id)::BIGINT,
    COALESCE(SUM(c.outstanding), 0),
    COALESCE(SUM(cb.bucket_0_30), 0),
    COALESCE(SUM(cb.bucket_31_60), 0),
    COALESCE(SUM(cb.bucket_61_90), 0),
    COALESCE(SUM(cb.bucket_90_plus), 0),
    COALESCE(SUM(cb.bucket_0_30 + cb.bucket_31_60 + cb.bucket_61_90 + cb.bucket_90_plus), 0),
    (SELECT COUNT(*) FROM promises_to_pay p WHERE p.shop_id = p_shop_id AND p.status = 'open'),
    (SELECT COUNT(*) FROM escalations e WHERE e.shop_id = p_shop_id AND e.status IN ('open','in_progress'))
  FROM customers c
  LEFT JOIN customer_balances cb ON cb.customer_id = c.id
  WHERE c.shop_id = p_shop_id
    AND COALESCE(c.status, 'Active') NOT IN ('Closed','Deleted');
$$;

-- ============================================================
-- 9) RECEIPT NUMBER GENERATOR
-- ============================================================

CREATE OR REPLACE FUNCTION next_receipt_no(p_shop_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
  v_seq INT;
BEGIN
  SELECT COALESCE(NULLIF(TRIM(code), ''), 'SH') INTO v_code FROM shops WHERE id = p_shop_id;
  SELECT COUNT(*) + 1 INTO v_seq FROM receipts WHERE shop_id = p_shop_id;
  RETURN v_code || '-R-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD(v_seq::TEXT, 5, '0');
END;
$$;

-- ============================================================
-- 10) DEFAULT REMINDER RULES for existing shops
-- ============================================================

INSERT INTO reminder_rules (shop_id, name, trigger_type, days_offset, channel, template_key)
SELECT s.id, 'Pre-due 3 days', 'pre_due', -3, 'whatsapp', 'pre_due_reminder'
FROM shops s
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_rules r WHERE r.shop_id = s.id AND r.trigger_type = 'pre_due'
);

INSERT INTO reminder_rules (shop_id, name, trigger_type, days_offset, channel, template_key)
SELECT s.id, 'On due date', 'on_due', 0, 'whatsapp', 'due_day_reminder'
FROM shops s
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_rules r WHERE r.shop_id = s.id AND r.trigger_type = 'on_due'
);

INSERT INTO reminder_rules (shop_id, name, trigger_type, days_offset, channel, template_key)
SELECT s.id, 'Overdue +7', 'overdue', 7, 'whatsapp', 'overdue_7'
FROM shops s
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_rules r WHERE r.shop_id = s.id AND r.trigger_type = 'overdue' AND r.days_offset = 7
);

INSERT INTO reminder_rules (shop_id, name, trigger_type, days_offset, channel, template_key)
SELECT s.id, 'Overdue +30', 'overdue', 30, 'email', 'overdue_30'
FROM shops s
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_rules r WHERE r.shop_id = s.id AND r.trigger_type = 'overdue' AND r.days_offset = 30
);

-- ============================================================
-- 11) INITIAL AGING BACKFILL
-- ============================================================

SELECT recalc_all_aging(NULL);

-- ============================================================
-- 12) OPTIONAL: pg_cron schedules (uncomment if extension enabled)
-- ============================================================
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('recalc-aging-daily',  '30 1 * * *',  $$ SELECT recalc_all_aging(NULL); $$);
-- SELECT cron.schedule('process-broken-ptp',  '0 2 * * *',   $$ SELECT process_broken_ptp(1); $$);
-- SELECT cron.schedule('reminder-queue-15m',  '*/15 * * * *',$$ /* call edge function or process queue */ SELECT 1; $$);

-- ============================================================
-- DONE
-- Verify:
--   SELECT * FROM shop_aging_summary('<shop-uuid>');
--   SELECT recalc_all_aging(NULL);
--   SELECT process_broken_ptp(1);
-- ============================================================
