import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { supabase } from '../lib/supabaseClient';
import { formatCurrency } from '../lib/formatCurrency';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { Loader2 } from 'lucide-react';

type OverviewRow = {
  total_reservations: number;
  total_revenue: number;
  average_ticket: number;
  cancellation_rate: number;
};

type MonthlyRow = {
  month_start: string;
  month_label: string;
  reservations: number;
  revenue: number;
};

type StatusRow = {
  status: string;
  reservations: number;
};

type ServiceRow = {
  service_name: string;
  reservations: number;
  revenue: number;
  average_ticket: number;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  awaiting_confirmation: 'En confirmación',
  confirmed: 'Confirmada',
  in_progress: 'En curso',
  fulfilled: 'Finalizada',
  cancelled: 'Cancelada',
  rejected: 'Rechazada'
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#94a3b8',
  awaiting_confirmation: '#f59e0b',
  confirmed: '#0ea5e9',
  in_progress: '#6366f1',
  fulfilled: '#22c55e',
  cancelled: '#ef4444',
  rejected: '#64748b'
};

const PIE_COLORS = ['#4338ca', '#2563eb', '#14b8a6', '#22c55e', '#f97316', '#ef4444', '#0f172a'];

type MetricCard = {
  label: string;
  value: string;
  helper: string;
  trend: number | null;
};

export function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewRow | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyRow[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusRow[]>([]);
  const [servicePerformance, setServicePerformance] = useState<ServiceRow[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        const [overviewRes, monthlyRes, statusRes, serviceRes] = await Promise.all([
          supabase.rpc('analytics_overview'),
          supabase.rpc('analytics_monthly_revenue', { months_count: 6 }),
          supabase.rpc('analytics_status_distribution'),
          supabase.rpc('analytics_service_performance', { limit_count: 5 })
        ]);

        if (!isMounted) {
          return;
        }

        const rpcError =
          overviewRes.error ?? monthlyRes.error ?? statusRes.error ?? serviceRes.error ?? null;

        if (rpcError) {
          setError(rpcError.message);
          setLoading(false);
          return;
        }

        setOverview((overviewRes.data?.[0] as OverviewRow | undefined) ?? null);

        const monthlyRows = ((monthlyRes.data as MonthlyRow[]) ?? []).map((row) => ({
          ...row,
          revenue: Number(row.revenue ?? 0),
          reservations: Number(row.reservations ?? 0)
        }));

        monthlyRows.sort(
          (a, b) => new Date(a.month_start).getTime() - new Date(b.month_start).getTime()
        );
        setMonthlyData(monthlyRows);

        setStatusDistribution(
          ((statusRes.data as StatusRow[]) ?? []).map((row) => ({
            ...row,
            reservations: Number(row.reservations ?? 0)
          }))
        );

        setServicePerformance(
          ((serviceRes.data as ServiceRow[]) ?? []).map((row) => ({
            ...row,
            revenue: Number(row.revenue ?? 0),
            reservations: Number(row.reservations ?? 0),
            average_ticket: Number(row.average_ticket ?? 0)
          }))
        );
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : 'Error desconocido';
        setError(message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAnalytics();

    return () => {
      isMounted = false;
    };
  }, []);

  const latestMonth = monthlyData.at(-1);
  const previousMonth = monthlyData.at(-2);

  const computeTrend = (current: number, previous: number | undefined) => {
    if (previous === undefined || previous === 0) {
      return null;
    }

    return ((current - previous) / previous) * 100;
  };

  const revenueTrend = computeTrend(Number(latestMonth?.revenue ?? 0), previousMonth?.revenue);
  const reservationTrend = computeTrend(
    Number(latestMonth?.reservations ?? 0),
    previousMonth?.reservations
  );

  const metrics: MetricCard[] = useMemo(() => {
    const cancellationRate = overview ? Number(overview.cancellation_rate ?? 0) * 100 : null;

    return [
      {
        label: 'Ingresos del mes',
        value: latestMonth ? formatCurrency(Number(latestMonth.revenue ?? 0)) : '—',
        helper: 'Comparado con el mes anterior',
        trend: revenueTrend
      },
      {
        label: 'Reservas confirmadas',
        value: latestMonth ? Number(latestMonth.reservations ?? 0).toString() : '—',
        helper: 'Comparado con el mes anterior',
        trend: reservationTrend
      },
      {
        label: 'Ticket promedio histórico',
        value: overview ? formatCurrency(Number(overview.average_ticket ?? 0)) : '—',
        helper: 'Promedio en reservas confirmadas',
        trend: null
      },
      {
        label: 'Tasa de cancelación',
        value: cancellationRate !== null ? `${cancellationRate.toFixed(1)}%` : '—',
        helper: 'Cancelaciones sobre el total',
        trend: null
      }
    ];
  }, [overview, latestMonth, revenueTrend, reservationTrend]);

  const monthlyChartData = useMemo(
    () =>
      monthlyData.map((item) => {
        const date = new Date(item.month_start);
        return {
          month: date.toLocaleDateString('es-CR', { month: 'short' }),
          revenue: Number(item.revenue ?? 0),
          reservations: Number(item.reservations ?? 0),
          fullMonth: date.toLocaleDateString('es-CR', { month: 'short', year: 'numeric' })
        };
      }),
    [monthlyData]
  );

  const pieChartData = useMemo(() => {
    const filtered = statusDistribution.filter((item) => Number(item.reservations ?? 0) > 0);
    const base =
      filtered.length === 0 && statusDistribution.length > 0 ? statusDistribution : filtered;

    return base.map((item, index) => ({
      name: STATUS_LABELS[item.status] ?? item.status,
      value: Number(item.reservations ?? 0),
      color: STATUS_COLORS[item.status] ?? PIE_COLORS[index % PIE_COLORS.length]
    }));
  }, [statusDistribution]);

  const serviceChartData = useMemo(
    () =>
      servicePerformance.map((item) => ({
        service: item.service_name,
        revenue: Number(item.revenue ?? 0),
        reservations: Number(item.reservations ?? 0),
        averageTicket: Number(item.average_ticket ?? 0)
      })),
    [servicePerformance]
  );

  const formatTrend = (trend: number | null) => {
    if (trend === null) {
      return '—';
    }

    const formatted = trend.toFixed(1);
    return `${trend > 0 ? '+' : ''}${formatted}%`;
  };

  if (loading) {
    return (
      <section className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p>Cargando analíticas operativas…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-6">
        <Card className="border-rose-100 bg-rose-50/60 text-rose-700">
          <CardHeader>
            <CardTitle>Error al obtener datos</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <p className="mt-2 text-sm text-rose-600">
              Verifica que las funciones `analytics_*` existan en Supabase y vuelve a intentar.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Analítica</h1>
        <p className="text-sm text-slate-500">
          Indicadores construidos en tiempo real con las reservas almacenadas en Supabase.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="border-surface-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">{metric.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-2xl font-semibold text-slate-900">{metric.value}</p>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    metric.trend !== null
                      ? metric.trend >= 0
                        ? 'border-emerald-200 text-emerald-600'
                        : 'border-rose-200 text-rose-600'
                      : 'border-slate-200 text-slate-500'
                  }
                >
                  {formatTrend(metric.trend)}
                </Badge>
                <span className="text-xs text-slate-500">{metric.helper}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-surface-border">
          <CardHeader>
            <CardTitle>Evolución mensual</CardTitle>
            <p className="text-sm text-slate-500">
              Ingresos confirmados y volumen de reservas en los últimos seis meses.
            </p>
          </CardHeader>
          <CardContent className="h-[320px]">
            {monthlyChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Sin información suficiente para graficar.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tickLine={false} stroke="#94a3b8" />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={(value) => formatCurrency(Number(value)).replace('₡', '₡ ')}
                    stroke="#94a3b8"
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    allowDecimals={false}
                    stroke="#94a3b8"
                  />
                  <Tooltip
                    contentStyle={{ fontSize: '0.75rem' }}
                    formatter={(value: number, name) =>
                      name === 'Ingresos'
                        ? formatCurrency(Number(value))
                        : `${Number(value).toLocaleString('es-CR')} reservas`
                    }
                    labelFormatter={(value) =>
                      monthlyChartData.find((item) => item.month === value)?.fullMonth ?? value
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Ingresos"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    yAxisId="left"
                  />
                  <Line
                    type="monotone"
                    dataKey="reservations"
                    name="Reservas"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    yAxisId="right"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-surface-border">
          <CardHeader>
            <CardTitle>Distribución de estados</CardTitle>
            <p className="text-sm text-slate-500">
              Participación de cada etapa del pipeline operativo.
            </p>
          </CardHeader>
          <CardContent className="h-[320px]">
            {pieChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Sin información suficiente para graficar.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(value: number) => `${Number(value).toLocaleString('es-CR')} reservas`}
                  />
                  <Legend />
                  <Pie data={pieChartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={100}>
                    {pieChartData.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.color ?? PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-surface-border">
        <CardHeader>
          <CardTitle>Servicios con mayor ingreso</CardTitle>
          <p className="text-sm text-slate-500">
            Ranking de servicios por ingresos confirmados. Incluye reservas en curso y finalizadas.
          </p>
        </CardHeader>
        <CardContent className="h-[360px]">
          {serviceChartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              Aún no hay reservas asociadas a los servicios registrados.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="service"
                  stroke="#94a3b8"
                  tickLine={false}
                  tickFormatter={(value: string) => value.split(' ').slice(0, 3).join(' ')}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#94a3b8"
                  tickFormatter={(value) => formatCurrency(Number(value)).replace('₡', '₡ ')}
                />
                <YAxis yAxisId="right" orientation="right" allowDecimals={false} stroke="#94a3b8" />
                <Tooltip
                  formatter={(value: number, name) =>
                    name === 'Ingresos'
                      ? formatCurrency(Number(value))
                      : `${Number(value).toLocaleString('es-CR')} reservas`
                  }
                />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" name="Ingresos" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar
                  yAxisId="right"
                  dataKey="reservations"
                  name="Reservas"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
