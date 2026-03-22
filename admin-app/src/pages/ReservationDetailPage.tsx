import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useParams } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { formatCurrency } from '../lib/formatCurrency';
import { supabase } from '../lib/supabaseClient';
import type { ReservationDetail } from '../types/reservation';

// Simplified state transitions
const stateInfo: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  'pending': { label: 'Pendiente (Esperando Pago)', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
  'paid': { label: 'Pagado (Listo)', color: 'bg-green-100 text-green-800', icon: '✓' },
  'fulfilled': { label: 'Realizado', color: 'bg-blue-100 text-blue-800', icon: '✓✓' },
  'cancelled': { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: '✕' }
};

const validTransitions: Record<string, { status: string; label: string; color: string }[]> = {
  'pending': [
    { status: 'paid', label: 'Marcar como Pagado', color: 'bg-green-600 hover:bg-green-700' },
    { status: 'cancelled', label: 'Cancelar', color: 'bg-red-600 hover:bg-red-700' }
  ],
  'paid': [
    { status: 'fulfilled', label: 'Marcar como Realizado', color: 'bg-blue-600 hover:bg-blue-700' },
    { status: 'cancelled', label: 'Cancelar', color: 'bg-red-600 hover:bg-red-700' }
  ],
  'fulfilled': [],
  'cancelled': []
};

export function ReservationDetailPage() {
  const { id } = useParams();
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('sinpe');
  const [externalRef, setExternalRef] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  useEffect(() => {
    const fetchReservation = async () => {
      try {
        // Query reservations table directly since the view might not exist after migration
        const { data: res, error: err } = await supabase
          .from('reservations')
          .select(`
            id,
            public_reference,
            status,
            scheduled_for,
            total_amount,
            currency_code,
            notes,
            internal_notes,
            buyer_id,
            service_option_id,
            metadata,
            created_at,
            updated_at,
            profiles:buyer_id (email, full_name, phone),
            service_options:service_option_id (
              name,
              duration_minutes,
              base_price,
              service_id,
              services!inner (name)
            )
          `)
          .eq('id', id)
          .maybeSingle();

        if (err) throw err;

        if (res) {
          const row = res as Record<string, unknown>;
          const meta = (row.metadata as Record<string, unknown> | null) ?? {};
          const ps = meta.party_size;
          const partySize =
            typeof ps === 'number' ? ps : typeof ps === 'string' ? parseInt(ps, 10) || 1 : 1;
          const so = row.service_options as
            | {
                name?: string;
                duration_minutes?: number;
                services?: { name?: string } | { name?: string }[];
              }
            | null
            | undefined;
          const svc = so?.services;
          const serviceCategoryName = Array.isArray(svc) ? svc[0]?.name : svc?.name;
          const transformed: ReservationDetail = {
            id: row.id as string,
            public_reference: row.public_reference as string,
            status: row.status as ReservationDetail['status'],
            scheduled_for: (row.scheduled_for as string | null) ?? null,
            buyer_id: row.buyer_id as string,
            buyer_email: (row.profiles as { email?: string } | null)?.email ?? null,
            buyer_name: (row.profiles as { full_name?: string } | null)?.full_name ?? null,
            assigned_worker_id: null,
            assigned_worker_name: null,
            created_at: (row.created_at as string) ?? '',
            updated_at: (row.updated_at as string) ?? '',
            service_name: serviceCategoryName ?? '',
            service_option_name: so?.name ?? null,
            duration_minutes: so?.duration_minutes ?? 0,
            total_amount: (row.total_amount as number | null) ?? null,
            currency_code: (row.currency_code as string | null) ?? null,
            notes: (row.notes as string | null) ?? null,
            internal_notes: (row.internal_notes as string | null) ?? null,
            buyer_phone: (row.profiles as { phone?: string } | null)?.phone ?? null,
            contact_preference: null,
            party_size: partySize
          };
          setReservation(transformed);
          setInternalNotes(res.internal_notes || '');
        }
      } catch (err) {
        console.error('Error fetching reservation:', err);
        setError('Error al cargar la reserva');
      }
      setLoading(false);
    };

    if (!id) {
      setLoading(false);
      return undefined;
    }

    void fetchReservation();
    const channel = supabase
      .channel(`reservation-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations', filter: `id=eq.${id}` },
        () => {
          void fetchReservation();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!id || !reservation) return;
    if (newStatus === 'cancelled') {
      const ok = window.confirm(
        '¿Cancelar esta reserva? El cliente verá el estado como cancelado.'
      );
      if (!ok) return;
    }
    if (newStatus === 'paid') {
      const ok = window.confirm(
        '¿Marcar esta reserva como pagada? Si registras el cobro con comprobante, usa el formulario “Registrar pago” debajo.'
      );
      if (!ok) return;
    }
    if (newStatus === 'fulfilled') {
      const ok = window.confirm('¿Marcar esta reserva como realizada?');
      if (!ok) return;
    }
    setUpdating(true);
    try {
      const { data, error: err } = await supabase.rpc('admin_update_reservation_status', {
        reservation_id: id,
        next_status: newStatus
      });

      if (err) {
        setError(`Error: ${err.message}`);
      } else {
        const payload = data as { success?: boolean; error?: string } | null;
        if (payload && payload.success === false) {
          setError(payload.error ?? 'No se pudo actualizar el estado');
        } else {
          setReservation({ ...reservation, status: newStatus as any });
          setError('');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setUpdating(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!id || !reservation || reservation.status !== 'pending') return;
    const cents = reservation.total_amount ?? 0;
    if (!cents) {
      setError('La reserva no tiene monto total definido');
      return;
    }
    const ok = window.confirm(
      '¿Confirmar el pago y marcar la reserva como pagada? Se registrará el movimiento en pagos.'
    );
    if (!ok) return;
    setRecordingPayment(true);
    setError('');
    try {
      const { data, error: err } = await supabase.rpc('admin_record_payment', {
        p_reservation_id: id,
        amount_cents: cents,
        payment_method: paymentMethod,
        external_reference: externalRef.trim() || null
      });
      if (err) {
        setError(err.message);
      } else {
        const payload = data as { success?: boolean; error?: string } | null;
        if (payload && payload.success === false) {
          setError(payload.error ?? 'No se pudo registrar el pago');
        } else {
          setReservation({ ...reservation, status: 'paid' as any });
          setExternalRef('');
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar pago');
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!id) return;
    setUpdating(true);

    try {
      const { error: err } = await supabase
        .from('reservations')
        .update({ internal_notes: internalNotes || null })
        .eq('id', id);

      if (err) {
        setError(`Error: ${err.message}`);
      } else {
        setReservation(prev => prev ? { ...prev, internal_notes: internalNotes || null } : prev);
        setEditingNotes(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[30vh] items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  if (!reservation) {
    return <p className="text-sm text-slate-500">Reserva no encontrada.</p>;
  }

  const availableTransitions = validTransitions[reservation.status] || [];
  const stateData = stateInfo[reservation.status];

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reserva {reservation.public_reference}</h1>
          <p className="text-sm text-slate-500">{reservation.service_name}</p>
        </div>
        <Badge className={stateData?.color}>{stateData?.label}</Badge>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* State Transition Buttons */}
      {availableTransitions.length > 0 ? (
        <div className="flex gap-2 flex-wrap">
          {availableTransitions.map(transition => (
            <Button
              key={transition.status}
              onClick={() => handleStatusChange(transition.status)}
              disabled={updating}
              className={`${transition.color} text-white`}
            >
              {transition.label}
            </Button>
          ))}
        </div>
      ) : (
        <div className="text-sm text-slate-500">✓ Estado final - no se puede cambiar</div>
      )}

      {reservation.status === 'pending' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registrar pago (SINPE / efectivo)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-w-md">
            <div>
              <Label htmlFor="pay_method">Método</Label>
              <select
                id="pay_method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="sinpe">SINPE móvil / transferencia</option>
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta (manual)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="pay_ref">Referencia externa (opcional)</Label>
              <Input
                id="pay_ref"
                value={externalRef}
                onChange={(e) => setExternalRef(e.target.value)}
                placeholder="Número de comprobante"
                disabled={recordingPayment}
              />
            </div>
            <Button
              onClick={() => void handleRecordPayment()}
              disabled={recordingPayment || updating}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {recordingPayment ? 'Registrando…' : 'Confirmar pago y marcar como pagada'}
            </Button>
            <p className="text-xs text-slate-500">
              Se guarda el movimiento en <code className="text-xs">reservation_payments</code> y se encola notificación al cliente.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Left: Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle>Cliente y Contacto</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-slate-500">Nombre</p>
              <p className="text-sm font-semibold text-slate-900">{reservation.buyer_name || 'Sin nombre'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Email</p>
              <p className="text-sm text-slate-600">{reservation.buyer_email || 'Sin email'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Teléfono</p>
              <p className="text-sm text-slate-600">{reservation.buyer_phone || 'Sin teléfono'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Grupo</p>
              <p className="text-sm text-slate-600">{reservation.party_size} persona(s)</p>
            </div>
          </CardContent>
        </Card>

        {/* Right: Details */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs uppercase text-slate-500">Fechas</p>
                <p className="text-sm text-slate-600">
                  {reservation.scheduled_for
                    ? new Date(reservation.scheduled_for).toLocaleString('es-CR', { dateStyle: 'medium', timeStyle: 'short' })
                    : 'Por definir'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Monto</p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatCurrency((reservation.total_amount || 0) / 100, 'USD')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notas Internas</CardTitle>
        </CardHeader>
        <CardContent>
          {editingNotes ? (
            <div className="space-y-2">
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                disabled={updating}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveNotes}
                  disabled={updating}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Guardar
                </Button>
                <Button
                  onClick={() => setEditingNotes(false)}
                  disabled={updating}
                  variant="secondary"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{internalNotes || '(Sin notas)'}</p>
              <Button
                onClick={() => setEditingNotes(true)}
                variant="secondary"
                className="mt-2"
                size="sm"
              >
                Editar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
