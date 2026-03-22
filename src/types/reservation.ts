export type ReservationStatus =
  | 'pending'
  | 'paid'
  | 'fulfilled'
  | 'cancelled'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'in_progress'
  | 'rejected';

export type Reservation = {
  id: string;
  public_reference: string;
  buyer_id: string;
  status: ReservationStatus;
  scheduled_for: string;
  service_option_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
