import { ReservationStatus } from '../types/reservation';

export const statusDisplay: Record<ReservationStatus, string> = {
  pending: 'Pendiente',
  awaiting_confirmation: 'Por confirmar',
  confirmed: 'Confirmada',
  in_progress: 'En curso',
  fulfilled: 'Completada',
  cancelled: 'Cancelada',
  rejected: 'Rechazada'
};
