import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { ReservationDetail } from '../types/reservation';
import { statusDisplay } from '../utils/status';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

const statusOptions: ReservationDetail['status'][] = [
  'pending',
  'awaiting_confirmation',
  'confirmed',
  'in_progress',
  'fulfilled',
  'cancelled',
  'rejected'
];

const contactPreferenceLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'Correo electrónico',
  phone_call: 'Llamada telefónica'
};

export function ReservationDetailPage() {
  const { id } = useParams();
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchReservation = async () => {
      const { data } = await supabase
        .from('reservations_detail_view')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      setReservation((data as ReservationDetail | null) ?? null);
      setLoading(false);
    };

    if (id) {
      fetchReservation();
    }
  }, [id]);

  const handleStatusChange = async (nextStatus: ReservationDetail['status']) => {
    if (!id) return;
    setUpdating(true);
    await supabase.rpc('admin_update_reservation_status', {
      reservation_id: id,
      next_status: nextStatus
    });
    setReservation((prev) => (prev ? { ...prev, status: nextStatus } : prev));
    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando reserva…
      </div>
    );
  }

  if (!reservation) {
    return <p className="text-sm text-slate-500">Reserva no encontrada.</p>;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reserva {reservation.public_reference}</h1>
          <p className="text-sm text-slate-500">{reservation.service_name}</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={reservation.status}
            onChange={(event) => handleStatusChange(event.target.value as ReservationDetail['status'])}
            disabled={updating}
            className="h-10 rounded-lg border border-surface-border bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {statusDisplay[status]}
              </option>
            ))}
          </select>
          <Badge variant="outline" className="capitalize text-slate-600">
            {statusDisplay[reservation.status]}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Información del cliente</CardTitle>
            <p className="text-sm text-slate-500">Contacto principal y detalles solicitados.</p>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-slate-500">Cliente</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{reservation.buyer_name ?? 'Sin nombre'}</p>
              <p className="text-sm text-slate-500">{reservation.buyer_email ?? 'Sin correo'}</p>
              <p className="text-sm text-slate-500">{reservation.buyer_phone ?? 'Sin teléfono'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Agenda</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {reservation.scheduled_for
                  ? new Date(reservation.scheduled_for).toLocaleString('es-CR', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })
                  : 'Por definir'}
              </p>
              <p className="text-sm text-slate-500">Duración • {reservation.duration_minutes} min</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Preferencias</p>
              <p className="mt-2 text-sm text-slate-500">
                Grupo:{' '}
                {reservation.party_size ? `${reservation.party_size} ${reservation.party_size === 1 ? 'persona' : 'personas'}` : 'Sin definir'}
              </p>
              <p className="text-sm text-slate-500">
                Contacto:{' '}
                {reservation.contact_preference
                  ? contactPreferenceLabels[reservation.contact_preference] ?? reservation.contact_preference
                  : 'Sin preferencia'}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs uppercase text-slate-500">Notas del cliente</p>
              <p className="mt-2 rounded-lg border border-dashed border-surface-border bg-white p-4 text-sm text-slate-600">
                {reservation.notes ?? 'Sin notas registradas.'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Coordinación interna</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div>
              <p className="text-xs uppercase text-slate-500">Concierge líder</p>
              <p className="mt-2 font-semibold text-slate-900">{reservation.assigned_worker_name ?? 'Sin asignar'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Notas operativas</p>
              <p className="mt-2 rounded-lg border border-surface-border bg-white p-4">
                {reservation.internal_notes ?? 'Aún no se registran notas internas.'}
              </p>
            </div>
            <Button variant="ghost" className="w-full justify-center">
              Registrar actualización
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
