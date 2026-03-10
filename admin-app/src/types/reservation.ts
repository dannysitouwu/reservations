export type ReservationStatus =
  | 'pending'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'in_progress'
  | 'fulfilled'
  | 'cancelled'
  | 'rejected';

export type Reservation = {
  id: string;
  public_reference: string;
  status: ReservationStatus;
  scheduled_for: string | null;
  buyer_id: string;
  buyer_email: string | null;
  buyer_name: string | null;
  assigned_worker_id: string | null;
  assigned_worker_name: string | null;
  created_at: string;
  updated_at: string;
};

export type ReservationDetail = Reservation & {
  service_name: string;
  duration_minutes: number;
  internal_notes: string | null;
  buyer_phone: string | null;
  notes: string | null;
  contact_preference: string | null;
  party_size: number | null;
};
