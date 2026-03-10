import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { WorkerProfile } from '../types/profile';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

const roleBadges: Record<WorkerProfile['role'], string> = {
  admin: 'bg-amber-100 text-amber-700',
  worker: 'bg-blue-100 text-blue-700',
  buyer: 'bg-slate-200 text-slate-700'
};

const roleLabels: Record<WorkerProfile['role'], string> = {
  admin: 'Administrador',
  worker: 'Operador',
  buyer: 'Cliente'
};

export function UserManagementPage() {
  const [users, setUsers] = useState<WorkerProfile[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('id, email, full_name, role, phone');
      setUsers((data as WorkerProfile[] | null) ?? []);
    };

    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) =>
      `${user.full_name ?? ''} ${user.email ?? ''} ${user.phone ?? ''} ${user.role}`.toLowerCase().includes(needle)
    );
  }, [users, query]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Usuarios</h1>
        <p className="text-sm text-slate-500">Gestiona compradores, operadores y administradores conectados a ReservaPro.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directorio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="search">Buscar usuarios</Label>
            <Input
              id="search"
              placeholder="Nombre, correo o rol"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="mt-2 max-w-sm"
            />
          </div>

          <div className="rounded-xl border border-surface-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Rol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-slate-900">{user.full_name ?? '—'}</TableCell>
                    <TableCell className="text-slate-500">{user.email}</TableCell>
                    <TableCell className="text-slate-500">{user.phone ?? '—'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${roleBadges[user.role]}`}>
                        {roleLabels[user.role]}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-slate-500">
                      No se encontraron usuarios con los filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <Badge variant="outline">{users.length} usuarios en total</Badge>
            <Badge variant="outline">{users.filter((user) => user.role === 'worker').length} operadores</Badge>
            <Badge variant="outline">{users.filter((user) => user.role === 'admin').length} administradores</Badge>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
