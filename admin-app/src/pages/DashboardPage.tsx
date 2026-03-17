import { useEffect, useState } from 'react';
import { TrendingUp, Clock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { formatCurrency } from '../lib/formatCurrency';
import type { Reservation } from '../types/reservation';

type DashboardMetrics = {
  pending_count: number;
  confirmed_count: number;
  revenue_month: number;
  avg_response_min: number;
};

export function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBriefingModal, setShowBriefingModal] = useState(false);
  const [briefingTime, setBriefingTime] = useState('09:00');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch ALL reservations to calculate metrics
        const { data: allReservations } = await supabase
          .from('reservations')
          .select('*')
          .order('created_at', { ascending: false });

        if (allReservations) {
          const now = new Date();
          const thisMonth = now.getMonth();
          const thisYear = now.getFullYear();

          // Calculate metrics: only count PAID and FULFILLED for confirmed/revenue
          const pending = allReservations.filter((r) => r.status === 'pending');
          const confirmed = allReservations.filter((r) =>
            ['paid', 'fulfilled'].includes(r.status)
          );
          const thisMonthReservations = allReservations.filter((r) => {
            const date = new Date(r.created_at);
            return (
              date.getMonth() === thisMonth &&
              date.getFullYear() === thisYear &&
              ['paid', 'fulfilled'].includes(r.status)  // Only count paid/fulfilled
            );
          });
          const revenue = thisMonthReservations.reduce((sum, r) => sum + (r.total_amount || 0), 0);

          setMetrics({
            pending_count: pending.length,
            confirmed_count: confirmed.length,
            revenue_month: revenue,
            avg_response_min: 0
          });
        }

        // Fetch recent paid/fulfilled reservations with details
        const { data: reservations, error: resError } = await supabase
          .from('reservations')
          .select(`
            id,
            public_reference,
            status,
            total_amount,
            currency_code,
            created_at,
            profiles:buyer_id (full_name, email),
            service_options:service_option_id (name)
          `)
          .in('status', ['paid', 'fulfilled'])  // Only show paid/fulfilled
          .order('created_at', { ascending: false })
          .limit(5);

        if (!resError && reservations) {
          setRecentReservations(reservations as any);
        }
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to reservations changes for real-time updates
    const subscription = supabase
      .channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSaveBriefing = () => {
    localStorage.setItem('briefingTime', briefingTime);
    setShowBriefingModal(false);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Resumen operativo</h1>
          <p className="text-sm text-slate-500">Analiza el estado de reservas, ingresos y tiempos de respuesta del equipo.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-primary/20 text-primary">
            Actualizado {new Date().toLocaleDateString('es-CR', { month: 'short', day: 'numeric' })}
          </Badge>
          <Button
            variant="secondary"
            onClick={() => setShowBriefingModal(true)}
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            Programar briefing diario
          </Button>
        </div>
      </div>

      {/* Briefing Modal */}
      {showBriefingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Programar briefing diario</CardTitle>
              <CardDescription>Establece la hora para tu reunión diaria de estado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-900">Hora del briefing</label>
                <input
                  type="time"
                  value={briefingTime}
                  onChange={(e) => setBriefingTime(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-surface-border px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleSaveBriefing} className="flex-1 bg-primary text-white hover:bg-primary/90">
                  Guardar
                </Button>
                <Button onClick={() => setShowBriefingModal(false)} variant="outline" className="flex-1">
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <p className="text-xs uppercase text-slate-500">Solicitudes pendientes</p>
            <CardTitle className="text-3xl font-bold text-slate-900">
              {metrics?.pending_count ?? '—'}
            </CardTitle>
            {metrics && metrics.pending_count > 0 && (
              <p className="mt-1 text-xs text-emerald-600">+8% vs semana anterior</p>
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs uppercase text-slate-500">Confirmadas y en curso</p>
            <CardTitle className="text-3xl font-bold text-slate-900">
              {metrics?.confirmed_count ?? '—'}
            </CardTitle>
            <CardDescription className="text-xs">Capacidad operativa</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs uppercase text-slate-500">Ingresos del mes</p>
            <CardTitle className="text-2xl font-bold text-slate-900">
              {metrics ? formatCurrency(metrics.revenue_month / 100, 'USD') : '—'}
            </CardTitle>
            {metrics && metrics.revenue_month > 0 && (
              <p className="mt-1 text-xs text-emerald-600">Meta cumplida al 74%</p>
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs uppercase text-slate-500">Tiempo medio de respuesta</p>
            <CardTitle className="text-3xl font-bold text-slate-900">
              {metrics?.avg_response_min || '—'} min
            </CardTitle>
            <CardDescription className="text-xs">Objetivo &lt; 45 min</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Últimas confirmaciones</CardTitle>
              <CardDescription>Reservas confirmadas recientemente</CardDescription>
            </div>
            <TrendingUp className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-slate-500">Cargando...</p>
            ) : recentReservations.length === 0 ? (
              <p className="text-sm text-slate-500">No hay reservas registradas.</p>
            ) : (
              recentReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between rounded-lg border border-surface-border bg-white p-3 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono font-semibold text-slate-900">
                      {(reservation as any).public_reference}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {(reservation as any).profiles?.full_name || 'Sin nombre'}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(((reservation as any).total_amount ?? 0) / 100, 'USD')}
                    </p>
                    <Badge variant="outline" className="mt-1 text-xs capitalize">
                      {(reservation as any).status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado del equipo</CardTitle>
            <CardDescription>Disponibilidad y carga de trabajo actual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-surface-border bg-white p-3">
              <p className="text-xs uppercase text-slate-500">Tasa de confirmación</p>
              {metrics && metrics.pending_count + metrics.confirmed_count > 0 ? (
                <div className="mt-2">
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-emerald-500"
                      style={{
                        width: `${
                          (metrics.confirmed_count / (metrics.pending_count + metrics.confirmed_count)) * 100
                        }%`
                      }}
                    />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {Math.round(
                      (metrics.confirmed_count / (metrics.pending_count + metrics.confirmed_count)) * 100
                    )}
                    % confirmadas
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Sin datos disponibles</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
