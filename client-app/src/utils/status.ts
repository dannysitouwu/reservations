import { ReservationStatus } from '../types/reservation';

export const statusDisplay: Record<ReservationStatus, string> = {
  pending: 'Pending submission',
  paid: 'Paid',
  awaiting_confirmation: 'Awaiting confirmation',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
  rejected: 'Rejected'
};
