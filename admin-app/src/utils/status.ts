import { ReservationStatus } from '../types/reservation';

export const statusDisplay: Record<ReservationStatus, string> = {
  pending: 'Pendiente (Esperando pago)',
  paid: 'Pagado (Listo para realizar)',
  fulfilled: 'Realizado',
  cancelled: 'Cancelado'
};
