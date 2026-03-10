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
  buyer_id: string;
  status: ReservationStatus;
  scheduled_for: string;
  service_option_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
