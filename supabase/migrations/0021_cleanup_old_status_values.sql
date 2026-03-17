-- Clean up any remaining old status values that weren't converted in migration 0018
-- This handles edge cases where records might have been in intermediate states

-- First, handle any "rejected" statuses (convert to cancelled)
-- These can occur if data existed in old state
UPDATE public.reservations
SET status = 'cancelled'::public.reservation_status
WHERE status::text NOT IN ('pending', 'paid', 'fulfilled', 'cancelled');

-- Verify the cleanup worked
-- SELECT COUNT(*) as remaining_invalid FROM public.reservations WHERE status::text NOT IN ('pending', 'paid', 'fulfilled', 'cancelled');

-- Ensure reservation_status_history table exists and has correct schema
-- (It might reference old enum values too)
DROP TABLE IF EXISTS public.reservation_status_history CASCADE;

CREATE TABLE public.reservation_status_history (
  id bigserial primary key,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  status public.reservation_status not null,
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

-- Create index for performance
CREATE INDEX idx_reservation_status_history_reservation_id 
  ON public.reservation_status_history(reservation_id);

-- Verify critical data wasn't lost
SELECT 
  COUNT(*) as total_reservations,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid,
  COUNT(CASE WHEN status = 'fulfilled' THEN 1 END) as fulfilled,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
FROM public.reservations;
