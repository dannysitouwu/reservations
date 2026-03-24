import { Loader2, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { formatCurrency } from '../lib/formatCurrency';
import { supabase } from '../lib/supabaseClient';

type AvailabilityRow = {
  id: number;
  service_option_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  capacity: number;
};

const WEEKDAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

type Service = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  options: {
    id: string;
    name: string;
    base_price: number;
    duration_minutes: number;
    is_active: boolean;
  }[];
};

export function ServicesPage() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [editingAvailabilityOptionId, setEditingAvailabilityOptionId] = useState<string | null>(null);
  const [availabilityWeekday, setAvailabilityWeekday] = useState('1');
  const [availabilityStart, setAvailabilityStart] = useState('09:00');
  const [availabilityEnd, setAvailabilityEnd] = useState('17:00');
  const [availabilityCapacity, setAvailabilityCapacity] = useState('1');
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilityByOption, setAvailabilityByOption] = useState<Record<string, AvailabilityRow[]>>({});
  const [deletingAvailabilityId, setDeletingAvailabilityId] = useState<number | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('services')
        .select(`
          id,
          name,
          description,
          is_active,
          created_at,
          service_options (
            id,
            name,
            base_price,
            duration_minutes,
            is_active
          )
        `)
        .order('created_at', { ascending: false });

      if (err) {
        setError(err.message);
      } else {
        const rows = (data || []) as Array<Record<string, unknown>>;
        setServices(
          rows.map((s) => ({
            id: String(s.id),
            name: String(s.name ?? ''),
            description: (s.description as string | null) ?? null,
            is_active: Boolean(s.is_active),
            created_at: String(s.created_at ?? ''),
            options: (((s.service_options as Array<Record<string, unknown>> | null) ?? []) as Array<
              Record<string, unknown>
            >).map((o) => ({
              id: String(o.id),
              name: String(o.name ?? ''),
              base_price: Number(o.base_price ?? 0),
              duration_minutes: Number(o.duration_minutes ?? 0),
              is_active: Boolean(o.is_active),
            })),
          }))
        );
      }
      setLoading(false);
    };

    void fetchServices();
  }, []);

  useEffect(() => {
    if (!editingAvailabilityOptionId) return;
    let cancelled = false;
    void (async () => {
      const oid = editingAvailabilityOptionId;
      const { data, error: fetchErr } = await supabase
        .from('service_option_availability')
        .select('id, service_option_id, weekday, start_time, end_time, capacity')
        .eq('service_option_id', oid)
        .order('weekday', { ascending: true })
        .order('start_time', { ascending: true });
      if (cancelled || fetchErr || !data) return;
      setAvailabilityByOption((prev) => ({ ...prev, [oid]: data as AvailabilityRow[] }));
    })();
    return () => {
      cancelled = true;
    };
  }, [editingAvailabilityOptionId]);

  const refreshAvailabilityForOption = async (optionId: string) => {
    const { data, error: fetchErr } = await supabase
      .from('service_option_availability')
      .select('id, service_option_id, weekday, start_time, end_time, capacity')
      .eq('service_option_id', optionId)
      .order('weekday', { ascending: true })
      .order('start_time', { ascending: true });
    if (!fetchErr && data) {
      setAvailabilityByOption((prev) => ({ ...prev, [optionId]: data as AvailabilityRow[] }));
    }
  };

  const handleDeleteAvailability = async (optionId: string, row: AvailabilityRow) => {
    if (!window.confirm('¿Eliminar este horario de disponibilidad?')) return;
    setDeletingAvailabilityId(row.id);
    setError('');
    try {
      const { error: delErr } = await supabase.from('service_option_availability').delete().eq('id', row.id);
      if (delErr) throw delErr;
      setAvailabilityByOption((prev) => ({
        ...prev,
        [optionId]: (prev[optionId] ?? []).filter((r) => r.id !== row.id),
      }));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo eliminar');
    } finally {
      setDeletingAvailabilityId(null);
    }
  };

  const handleToggleActive = async (serviceId: string, currentStatus: boolean) => {
    setToggling(serviceId);
    try {
      if (!currentStatus) {
        // Re-activate
        const { error: err } = await supabase
          .from('services')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('id', serviceId);
        
        if (err) throw err;

        const { error: optErr } = await supabase
          .from('service_options')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('service_id', serviceId);
        
        if (optErr) throw optErr;
      } else {
        // Deactivate
        const { error: err } = await supabase
          .rpc('admin_deactivate_service', { p_service_id: serviceId });
        
        if (err) throw err;
      }

      setServices(services.map(s =>
        s.id === serviceId
          ? {
              ...s,
              is_active: !currentStatus,
              options: s.options.map(o => ({ ...o, is_active: !currentStatus }))
            }
          : s
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error toggling service status');
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!window.confirm('¿Eliminar este servicio permanentemente? No se puede deshacer.')) return;

    setDeleting(serviceId);
    try {
      const { error: err } = await supabase
        .rpc('admin_delete_service', { p_service_id: serviceId });
      
      if (err) throw err;

      setServices(services.filter(s => s.id !== serviceId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting service');
    } finally {
      setDeleting(null);
    }
  };

  const handleAddAvailability = async (optionId: string) => {
    setSavingAvailability(true);
    setError('');
    try {
      const weekday = Number(availabilityWeekday);
      const capacity = Number(availabilityCapacity);
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
        throw new Error('Día inválido (0=Domingo ... 6=Sábado)');
      }
      if (!Number.isInteger(capacity) || capacity <= 0) {
        throw new Error('La capacidad debe ser mayor a cero');
      }
      if (availabilityStart >= availabilityEnd) {
        throw new Error('La hora de inicio debe ser menor que la hora de fin');
      }

      const { error: insertError } = await supabase.from('service_option_availability').insert({
        service_option_id: optionId,
        weekday,
        start_time: availabilityStart,
        end_time: availabilityEnd,
        capacity,
      });
      if (insertError) throw insertError;
      await refreshAvailabilityForOption(optionId);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo guardar disponibilidad');
    } finally {
      setSavingAvailability(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <section className="max-w-6xl space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Servicios</h1>
        <p className="text-sm text-slate-500">Gestiona servicios y opciones disponibles</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
          {error}
        </div>
      )}

      <Button onClick={() => navigate('/services/new')} className="w-fit">
        + Nuevo Servicio
      </Button>

      {services.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">No hay servicios creados aún</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {services.map(service => (
            <Card key={service.id} className={service.is_active ? '' : 'opacity-60'}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    {service.description && (
                      <p className="text-sm text-slate-500 mt-1">{service.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(service.id, service.is_active)}
                      disabled={toggling === service.id}
                      title={service.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {toggling === service.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : service.is_active ? (
                        <ToggleRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-slate-400" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(service.id)}
                      disabled={deleting === service.id}
                      className="text-red-600 hover:text-red-700"
                    >
                      {deleting === service.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  {service.options && service.options.length > 0 ? (
                    service.options.map(option => (
                      <div key={option.id} className="rounded bg-slate-50 p-2 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{option.name}</p>
                            <p className="text-xs text-slate-500">{option.duration_minutes} min</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(option.base_price / 100, 'USD')}
                            </span>
                            {!option.is_active && (
                              <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-800">
                                Inactivo
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                setEditingAvailabilityOptionId((prev) => (prev === option.id ? null : option.id))
                              }
                              className="h-8 px-2"
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Disponibilidad
                            </Button>
                          </div>
                        </div>
                        {editingAvailabilityOptionId === option.id ? (
                          <div className="mt-3 space-y-3 rounded border border-slate-200 bg-white p-3">
                            <p className="text-xs font-medium text-slate-600">Horarios guardados</p>
                            {(availabilityByOption[option.id] ?? []).length === 0 ? (
                              <p className="text-xs text-slate-400">Aún no hay bloques. Añade uno abajo.</p>
                            ) : (
                              <ul className="space-y-2">
                                {(availabilityByOption[option.id] ?? []).map((row) => (
                                  <li
                                    key={row.id}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 bg-slate-50 px-2 py-2 text-xs"
                                  >
                                    <span className="text-slate-700">
                                      {WEEKDAY_LABELS[row.weekday] ?? row.weekday} · {row.start_time.slice(0, 5)} –{' '}
                                      {row.end_time.slice(0, 5)} · cap. {row.capacity}
                                    </span>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 text-red-600 hover:text-red-700"
                                      disabled={deletingAvailabilityId === row.id}
                                      onClick={() => void handleDeleteAvailability(option.id, row)}
                                    >
                                      {deletingAvailabilityId === row.id ? '…' : 'Eliminar'}
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            )}
                            <p className="text-xs font-medium text-slate-600">Añadir bloque</p>
                            <div className="grid gap-2 md:grid-cols-5">
                              <select
                                value={availabilityWeekday}
                                onChange={(e) => setAvailabilityWeekday(e.target.value)}
                                className="rounded border border-slate-200 px-2 py-2 text-xs"
                              >
                                <option value="0">Domingo</option>
                                <option value="1">Lunes</option>
                                <option value="2">Martes</option>
                                <option value="3">Miércoles</option>
                                <option value="4">Jueves</option>
                                <option value="5">Viernes</option>
                                <option value="6">Sábado</option>
                              </select>
                              <input
                                type="time"
                                value={availabilityStart}
                                onChange={(e) => setAvailabilityStart(e.target.value)}
                                className="rounded border border-slate-200 px-2 py-2 text-xs"
                              />
                              <input
                                type="time"
                                value={availabilityEnd}
                                onChange={(e) => setAvailabilityEnd(e.target.value)}
                                className="rounded border border-slate-200 px-2 py-2 text-xs"
                              />
                              <input
                                type="number"
                                min={1}
                                value={availabilityCapacity}
                                onChange={(e) => setAvailabilityCapacity(e.target.value)}
                                className="rounded border border-slate-200 px-2 py-2 text-xs"
                                placeholder="Capacidad"
                              />
                              <Button
                                size="sm"
                                onClick={() => void handleAddAvailability(option.id)}
                                disabled={savingAvailability}
                              >
                                {savingAvailability ? 'Guardando…' : 'Guardar'}
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Sin opciones</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
