import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { formatCurrency } from '../lib/formatCurrency';

type DashboardMetrics = {
  pending_reservations: number;
  confirmed_reservations: number;
  revenue_this_month: number;
  average_response_minutes: number;
};

const recientes = [
  { title: 'Bahía Drake Lodge', date: '12 jun', value: 425000, status: 'Confirmada' },
  { title: 'Mirador Arenal', date: '09 jun', value: 182000, status: 'Por confirmar' },
  { title: 'Ruta Caribe Verde', date: '07 jun', value: 94500, status: 'En curso' }
];

export function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      const { data } = await supabase.rpc('admin_reservations_kpi');
      setMetrics((data as DashboardMetrics | null) ?? null);
    };

    fetchMetrics();
  }, []);

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
          <Button variant="secondary">Programar briefing diario</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <p className="text-xs uppercase text-slate-500">Solicitudes pendientes</p>
            <CardTitle className="text-2xl">
              {metrics?.pending_reservations ?? '—'}
              <span className="ml-2 text-xs font-normal text-emerald-500">+8% vs semana anterior</span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs uppercase text-slate-500">Confirmadas y en curso</p>
            <CardTitle className="text-2xl">{metrics?.confirmed_reservations ?? '—'}</CardTitle>
            <CardDescription>Capacidad alineada hasta 12 jul</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs uppercase text-slate-500">Ingresos del mes</p>
            <CardTitle className="text-2xl">
              {metrics ? formatCurrency(metrics.revenue_this_month) : '—'}
            </CardTitle>
            <CardDescription>Meta cumplida al 74%</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs uppercase text-slate-500">Tiempo medio de respuesta</p>
            <CardTitle className="text-2xl">{metrics?.average_response_minutes ?? '—'} min</CardTitle>
            <CardDescription>Objetivo &lt; 45 min</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Velocidad de pipeline</CardTitle>
              <CardDescription>Estados proyectados de los próximos 30 días.</CardDescription>
            </div>
            <TrendingUp className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {[
              { label: 'Por confirmar', value: '12', trend: '+4.2%' },
              { label: 'En ejecución', value: '18', trend: '+2.6%' },
              { label: 'Completadas (30d)', value: '46', trend: '+6.8%' },
              { label: 'En riesgo', value: '3', trend: '-1.2%' }
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-surface-border bg-white p-4">
                <p className="text-xs uppercase text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
                <p className={item.trend.startsWith('-') ? 'text-xs text-rose-500' : 'text-xs text-emerald-500'}>
                  {item.trend}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Últimas confirmaciones</CardTitle>
            <CardDescription>Reservas de alto valor confirmadas esta semana.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recientes.map((highlight) => (
              <div
                key={highlight.title}
                className="flex items-center justify-between rounded-lg border border-surface-border bg-white p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{highlight.title}</p>
                  <p className="text-xs text-slate-500">{highlight.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{formatCurrency(highlight.value)}</p>
                  <span className="text-xs uppercase text-slate-400">{highlight.status}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
