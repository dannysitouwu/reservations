import { Clock, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { formatCurrency } from '../lib/formatCurrency';
import { supabase } from '../lib/supabaseClient';
import type { Reservation } from '../types/reservation';
import { statusDisplay } from '../utils/status';

type DashboardMetrics = {
  pending_count: number;
  confirmed_count: number;
  cancelled_count: number;
  revenue_month: number;
  /** null = aún no hay métrica implementada en el sistema */
  avg_response_min: number | null;
};

export function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBriefingModal, setShowBriefingModal] = useState(false);
  const [briefingTime, setBriefingTime] = useState('09:00');
  const [briefingSaved, setBriefingSaved] = useState(false);
  const [briefingTestMessage, setBriefingTestMessage] = useState<string | null>(null);

  useEffect(() => {
    if (showBriefingModal) {
      setBriefingTestMessage(null);
    }
  }, [showBriefingModal]);

  useEffect(() => {
    const saved = localStorage.getItem('briefingTime');
    if (saved) {
      setBriefingTime(saved);
      setBriefingSaved(true);
    }

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
          const cancelled = allReservations.filter((r) => r.status === 'cancelled');
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
            cancelled_count: cancelled.length,
            revenue_month: revenue,
            avg_response_min: null,
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

  // Ventana de 3 min tras la hora configurada: si el navegador retrasa timers en segundo plano,
  // no perdemos el aviso. Intervalo corto + visibilitychange para al volver a la pestaña.
  useEffect(() => {
    if (!briefingTime) return;

    const WINDOW_MS = 3 * 60 * 1000;

    const tick = () => {
      const nextReminderKey = `briefingReminder-${new Date().toDateString()}`;
      if (localStorage.getItem(nextReminderKey) === '1') return;

      const [targetH, targetM] = briefingTime.split(':').map(Number);
      if (Number.isNaN(targetH) || Number.isNaN(targetM)) return;

      const now = new Date();
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), targetH, targetM, 0, 0);
      const diffMs = now.getTime() - target.getTime();
      if (diffMs < 0 || diffMs > WINDOW_MS) return;

      if (!('Notification' in window)) return;

      if (Notification.permission === 'granted') {
        try {
          new Notification('ReservaPro', {
            body: `Recordatorio: revisar el panel (${briefingTime}).`,
            tag: 'reservapro-briefing',
          });
        } catch {
          /* ignore */
        }
        localStorage.setItem(nextReminderKey, '1');
      } else if (Notification.permission === 'default') {
        void Notification.requestPermission();
      }
    };

    tick();
    const id = window.setInterval(tick, 15_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [briefingTime]);

  const handleSaveBriefing = async () => {
    localStorage.setItem('briefingTime', briefingTime);
    setBriefingSaved(true);
    setShowBriefingModal(false);
    if (!('Notification' in window)) return;
    try {
      const perm =
        Notification.permission === 'default'
          ? await Notification.requestPermission()
          : Notification.permission;
      if (perm === 'granted') {
        new Notification('ReservaPro', {
          body: 'Notificaciones listas. Te avisaremos cada día a la hora que elegiste mientras esta pestaña siga abierta.',
          tag: 'reservapro-briefing-setup',
        });
      }
    } catch {
      /* ignore */
    }
  };

  const handleBriefingTestNow = async () => {
    setBriefingTestMessage(null);
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBriefingTestMessage('Este navegador no soporta la API de notificaciones.');
      return;
    }
    try {
      let perm = Notification.permission;
      if (perm === 'default') {
        perm = await Notification.requestPermission();
      }
      if (perm === 'denied') {
        setBriefingTestMessage(
          'Permiso bloqueado: en la barra de direcciones, abre el menú del sitio (candado) y permite notificaciones para este origen.',
        );
        return;
      }
      if (perm !== 'granted') {
        setBriefingTestMessage('No se obtuvo permiso para mostrar notificaciones.');
        return;
      }
      const tag = `reservapro-briefing-test-${Date.now()}`;
      new Notification('ReservaPro', {
        body: `Prueba: recordatorio diario (${briefingTime}).`,
        tag,
        requireInteraction: false,
      });
      setBriefingTestMessage(
        'Listo: revisa el centro de notificaciones (macOS: esquina superior derecha). Si no ves nada, comprueba “No molestar”.',
      );
    } catch (e) {
      setBriefingTestMessage(
        e instanceof Error ? e.message : 'No se pudo mostrar la notificación. Prueba otro navegador o HTTPS.',
      );
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Resumen operativo</h1>
          <p className="text-sm text-slate-500">Analiza el estado de reservas, ingresos y tiempos de respuesta del equipo.</p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Badge variant="outline" className="border-primary/20 text-primary w-fit">
            Actualizado {new Date().toLocaleDateString('es-CR', { month: 'short', day: 'numeric' })}
          </Badge>
          <div className="flex flex-col gap-1 sm:items-end">
            <Button
              variant="secondary"
              onClick={() => setShowBriefingModal(true)}
              className="flex h-auto flex-col items-stretch gap-1 py-2.5 text-left sm:min-w-[240px]"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Clock className="h-4 w-4 shrink-0" />
                Recordatorio diario
              </span>
              <span className="text-xs font-normal text-slate-500">
                Hora: <span className="font-mono font-medium text-emerald-700">{briefingTime}</span>
                {' · '}
                {briefingSaved ? 'Configurado' : 'Pulsa para elegir hora'}
              </span>
            </Button>
            {typeof window !== 'undefined' && 'Notification' in window ? (
              <p className="max-w-xs text-[11px] leading-snug text-slate-400 sm:text-right">
                {Notification.permission === 'denied' && (
                  <>Permiso bloqueado: revisa el candado del sitio en la barra del navegador y permite notificaciones.</>
                )}
                {Notification.permission === 'default' && (
                  <>Tras guardar, el navegador pedirá permiso; acéptalo para recibir el aviso diario.</>
                )}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Briefing Modal */}
      {showBriefingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Recordatorio en el navegador</CardTitle>
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
                <Button
                  onClick={() => void handleSaveBriefing()}
                  className="flex-1 bg-primary text-white hover:bg-primary/90"
                >
                  Guardar
                </Button>
                <Button onClick={() => setShowBriefingModal(false)} variant="secondary" className="flex-1">
                  Cancelar
                </Button>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => void handleBriefingTestNow()}
              >
                Probar notificación ahora
              </Button>
              {briefingTestMessage ? (
                <p className="text-xs text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2">
                  {briefingTestMessage}
                </p>
              ) : null}
              <p className="text-xs text-slate-500">
                El aviso diario solo puede dispararse con esta pestaña abierta en los ~3 minutos posteriores a la hora
                elegida; es distinto de otras alertas del sistema. Usa “Probar notificación ahora” para validar permisos.
              </p>
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
              {metrics?.avg_response_min != null ? `${metrics.avg_response_min} min` : 'Sin datos'}
            </CardTitle>
            <CardDescription className="text-xs">Objetivo operativo &lt; 45 min.</CardDescription>
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
                    <Badge variant="outline" className="mt-1 text-xs">
                      {statusDisplay[(reservation as Reservation).status] ?? (reservation as Reservation).status}
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
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-surface-border bg-white p-3">
              <p className="text-xs uppercase text-slate-500">Resumen por estado</p>
              {metrics ? (
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  <li className="flex justify-between gap-2">
                    <span>Pendientes</span>
                    <span className="font-semibold text-amber-700">{metrics.pending_count}</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>Confirmadas / en curso</span>
                    <span className="font-semibold text-emerald-700">{metrics.confirmed_count}</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>Canceladas</span>
                    <span className="font-semibold text-slate-600">{metrics.cancelled_count}</span>
                  </li>
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Sin datos disponibles</p>
              )}
            </div>
            <div className="rounded-lg border border-surface-border bg-white p-3">
              <p className="text-xs uppercase text-slate-500">Tasa de confirmación</p>
              {metrics && metrics.pending_count + metrics.confirmed_count > 0 ? (
                <div className="mt-2">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
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
                    % confirmadas sobre pendientes + confirmadas
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Sin pendientes ni confirmadas para calcular la tasa.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
