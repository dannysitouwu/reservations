import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Reservation } from '../types/reservation';
import { statusDisplay } from '../utils/status';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

const statuses = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'awaiting_confirmation', label: 'Por confirmar' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'fulfilled', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'rejected', label: 'Rechazada' }
];

export function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchReservations = async () => {
      const { data } = await supabase
        .from('reservations_view')
        .select('*')
        .order('created_at', { ascending: false });

      setReservations((data as Reservation[] | null) ?? []);
    };

    fetchReservations();
  }, []);

  const filteredReservations = useMemo(() => {
    return reservations.filter((reservation) => {
      const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
      const searchString = `${reservation.public_reference} ${reservation.buyer_email ?? ''} ${reservation.buyer_name ?? ''}`.toLowerCase();
      const matchesQuery = searchString.includes(query.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [reservations, statusFilter, query]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Reservas</h1>
        <p className="text-sm text-slate-500">Gestiona reservas entrantes, asigna concierge y monitorea estados críticos.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle>Filtros</CardTitle>
            <p className="text-sm text-slate-500">Filtra por estado o busca por código, cliente o concierge.</p>
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div>
              <Label htmlFor="status">Estado</Label>
              <select
                id="status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-2 h-10 rounded-lg border border-surface-border bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="search">Buscar</Label>
              <Input
                id="search"
                placeholder="Código, correo o nombre"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="mt-2 w-64"
              />
            </div>
            <Button variant="ghost" className="mt-6 md:mt-0" onClick={() => setQuery('')}>
              Limpiar
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pipeline de reservas</CardTitle>
          <Badge variant="outline">{filteredReservations.length} resultados</Badge>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Programado</TableHead>
                <TableHead>Concierge</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReservations.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell className="font-mono text-xs uppercase text-slate-500">
                    {reservation.public_reference}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">{reservation.buyer_name ?? 'Sin nombre'}</span>
                      <span className="text-xs text-slate-500">{reservation.buyer_email ?? 'Sin correo'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {statusDisplay[reservation.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {reservation.scheduled_for
                      ? new Date(reservation.scheduled_for).toLocaleString('es-CR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Por definir'}
                  </TableCell>
                  <TableCell>{reservation.assigned_worker_name ?? 'No asignado'}</TableCell>
                  <TableCell className="text-right text-sm">
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/reservations/${reservation.id}`}>Abrir</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredReservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">
                    No hay reservas con los filtros actuales.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
