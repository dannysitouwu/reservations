-- Migration 0014: Add reservation payments tracking
-- This migration adds support for payment tracking separate from reservation workflow
-- Does NOT modify existing tables, only adds new ones

-- ============================================================================
-- 1. ADD payment_status STATUS TO ENUM (if not already present)
-- ============================================================================
-- Note: postgres ENUM types cannot have values removed, only added
-- This is backward compatible

ALTER TYPE public.reservation_status ADD VALUE IF NOT EXISTS 'awaiting_payment' AFTER 'confirmed';

-- ============================================================================
-- 2. CREATE PAYMENT TRACKING TABLE
-- ============================================================================
CREATE TABLE public.reservation_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency_code char(3) NOT NULL DEFAULT 'USD',
  payment_status text NOT NULL DEFAULT 'pending' 
    CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  payment_method text,
  transaction_id text UNIQUE,
  gateway_response jsonb DEFAULT '{}' :: jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_reservation_payments_set_updated
  BEFORE UPDATE ON public.reservation_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 3. CREATE INDEX FOR COMMON QUERIES
-- ============================================================================
CREATE INDEX idx_reservation_payments_reservation_id 
  ON public.reservation_payments(reservation_id);

CREATE INDEX idx_reservation_payments_status 
  ON public.reservation_payments(payment_status);

CREATE INDEX idx_reservation_payments_created_at 
  ON public.reservation_payments(created_at DESC);

-- ============================================================================
-- 4. CREATE VIEW FOR RESERVATION + PAYMENT STATUS
-- ============================================================================
DROP VIEW IF EXISTS public.reservations_with_payments CASCADE;

CREATE OR REPLACE VIEW public.reservations_with_payments AS
SELECT
  r.id,
  r.public_reference,
  r.status as reservation_status,
  rp.payment_status,
  rp.amount_cents,
  rp.currency_code,
  rp.created_at as payment_created_at,
  rp.updated_at as payment_updated_at,
  COALESCE(rp.payment_status, 'no_payment_record') as current_payment_status
FROM public.reservations r
LEFT JOIN public.reservation_payments rp ON r.id = rp.reservation_id;

-- ============================================================================
-- 5. ADD RLS POLICIES FOR NEW TABLE
-- ============================================================================
ALTER TABLE public.reservation_payments ENABLE ROW LEVEL SECURITY;

-- Buyers can view payments for their reservations
CREATE POLICY "Buyers can view own payments"
  ON public.reservation_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reservations
      WHERE id = reservation_payments.reservation_id
      AND buyer_id = auth.uid()
    )
  );

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
  ON public.reservation_payments
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can create/update payments
CREATE POLICY "Admins can manage payments"
  ON public.reservation_payments
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================
GRANT SELECT ON public.reservation_payments TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON public.reservation_payments TO authenticated, service_role;
GRANT SELECT ON public.reservations_with_payments TO anon, authenticated, service_role;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- This migration:
-- ✅ Adds payment_status enum value (backward compatible)
-- ✅ Creates new reservation_payments table (does not modify existing)
-- ✅ Creates view to see combined status
-- ✅ Enables RLS for payments
-- ✅ Does NOT delete or modify any existing data
--
-- Next steps:
-- 1. Create RPC function: admin_record_payment(reservation_id, amount, method)
-- 2. Update UI: Add payment status to ReservationDetailPage
-- 3. Create user app payment interface
-- 4. Integrate payment gateway (Stripe/PayPal)
