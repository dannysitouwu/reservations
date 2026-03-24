import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useSupabase } from '../providers/SupabaseProvider';
import type { WorkerProfile } from '../types/profile';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';

const roleBadges: Record<WorkerProfile['role'], string> = {
  super_admin: 'bg-violet-100 text-violet-800',
  admin: 'bg-amber-100 text-amber-700',
  worker: 'bg-blue-100 text-blue-700',
  buyer: 'bg-slate-200 text-slate-700'
};

const roleLabels: Record<WorkerProfile['role'], string> = {
  super_admin: 'Super admin',
  admin: 'Administrador',
  worker: 'Operador',
  buyer: 'Cliente'
};

export function UserManagementPage() {
  const { profile: currentProfile } = useSupabase();
  const canAssignRoles = currentProfile?.role === 'super_admin';
  const [users, setUsers] = useState<WorkerProfile[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, WorkerProfile['role']>>({});

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('id, email, full_name, role, phone');
      const rows = (data as WorkerProfile[] | null) ?? [];
      setUsers(rows);
      const nextDrafts: Record<string, WorkerProfile['role']> = {};
      rows.forEach((u) => {
        nextDrafts[u.id] = u.role;
      });
      setRoleDrafts(nextDrafts);
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

  const updateRole = async (user: WorkerProfile) => {
    if (!canAssignRoles) return;
    const nextRole = roleDrafts[user.id];
    if (!nextRole || nextRole === user.role) return;
    setSavingUserId(user.id);
    setError('');
    const { error: rpcError } = await supabase.rpc('admin_set_profile_role', {
      target_email: user.email,
      target_role: nextRole,
    });
    if (rpcError) {
      setError(rpcError.message);
    } else {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u)));
    }
    setSavingUserId(null);
  };

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
          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
          ) : null}
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
                  {canAssignRoles ? <TableHead className="text-right">Acción</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-slate-900">{user.full_name ?? '—'}</TableCell>
                    <TableCell className="text-slate-500">{user.email}</TableCell>
                    <TableCell className="text-slate-500">{user.phone ?? '—'}</TableCell>
                    <TableCell>
                      {canAssignRoles ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={roleDrafts[user.id] ?? user.role}
                            onChange={(event) =>
                              setRoleDrafts((prev) => ({
                                ...prev,
                                [user.id]: event.target.value as WorkerProfile['role'],
                              }))
                            }
                            className="h-9 rounded-md border border-surface-border bg-white px-2 text-sm"
                          >
                            <option value="buyer">Cliente</option>
                            <option value="worker">Operador</option>
                            <option value="admin">Administrador</option>
                            <option value="super_admin">Super admin</option>
                          </select>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${roleBadges[user.role]}`}
                          >
                            {roleLabels[user.role]}
                          </span>
                        </div>
                      ) : (
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${roleBadges[user.role]}`}>
                          {roleLabels[user.role]}
                        </span>
                      )}
                    </TableCell>
                    {canAssignRoles ? (
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={savingUserId === user.id || (roleDrafts[user.id] ?? user.role) === user.role}
                          onClick={() => void updateRole(user)}
                        >
                          {savingUserId === user.id ? 'Guardando...' : 'Guardar'}
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canAssignRoles ? 5 : 4} className="py-10 text-center text-sm text-slate-500">
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
            <Badge variant="outline">
              {users.filter((user) => user.role === 'admin' || user.role === 'super_admin').length}{' '}
              administradores
            </Badge>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
