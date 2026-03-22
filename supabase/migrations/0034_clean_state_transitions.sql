-- 0034: State transition validation
-- Defines valid reservation status transitions and removes problematic triggers

-- Drop old validation trigger (validation is now in RPC function)
DROP TRIGGER IF EXISTS trg_reservations_enforce_status ON public.reservations;

-- Recreate transitions table with 4-state model
DROP TABLE IF EXISTS public.reservation_status_transitions CASCADE;

CREATE TABLE public.reservation_status_transitions (
  from_status public.reservation_status NOT NULL,
  to_status public.reservation_status NOT NULL,
  CONSTRAINT reservation_status_transitions_pk PRIMARY KEY (from_status, to_status)
);

-- Valid transitions for 4-state model (pending → paid → fulfilled, cancel at any point)
INSERT INTO public.reservation_status_transitions (from_status, to_status) VALUES
  ('pending', 'paid'),
  ('pending', 'cancelled'),
  ('paid', 'fulfilled'),
  ('paid', 'cancelled'),
  ('fulfilled', 'fulfilled'),
  ('cancelled', 'cancelled');
