import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, DollarSign, CheckCheck, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { ReservationDetail } from '../types/reservation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { formatCurrency } from '../lib/formatCurrency';

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
          // Transform the data to match expected format
          const transformed = {
            id: res.id,
            public_reference: res.public_reference,
            status: res.status as any,
            scheduled_for: res.scheduled_for,
            total_amount: res.total_amount,
            currency_code: res.currency_code,
            notes: res.notes,
            internal_notes: res.internal_notes,
            buyer_name: (res.profiles as any)?.full_name,
            buyer_email: (res.profiles as any)?.email,
            buyer_phone: (res.profiles as any)?.phone,
            service_name: (res.service_options?.services as any)?.name,
            service_option_name: res.service_options?.name,
            duration_minutes: res.service_options?.duration_minutes,
            party_size: 1
          };
          setReservation(transformed as any);
          setInternalNotes(res.internal_notes || '');
        }
      } catch (err) {
        console.error('Error fetching reservation:', err);
        setError('Error al cargar la reserva');
      }
      setLoading(false);
    };

    if (id) {
      fetchReservation();
      const subscription = supabase
        .channel(`reservation-${id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'reservations', filter: `id=eq.${id}` },
          () => fetchReservation()
        )
        .subscribe();

      return () => subscription.unsubscribe();
    }
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!id || !reservation) return;
    setUpdating(true);
    try {
      const { error: err } = await supabase.rpc('admin_update_reservation_status', {
        reservation_id: id,
        next_status: newStatus
      });

      if (err) {
        setError(`Error: ${err.message}`);
      } else {
        setReservation({ ...reservation, status: newStatus as any });
        setError('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setUpdating(false);
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
                  variant="outline"
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
                variant="outline"
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
