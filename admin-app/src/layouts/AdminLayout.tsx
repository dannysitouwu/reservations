import { LayoutDashboard, CalendarClock, Users2, BarChart3 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { PropsWithChildren } from 'react';
import { useSupabase } from '../providers/SupabaseProvider';
import { cn } from '../lib/utils';

const navItems = [
  { to: '/', label: 'Resumen', icon: LayoutDashboard },
  { to: '/reservations', label: 'Reservas', icon: CalendarClock },
  { to: '/users', label: 'Clientes', icon: Users2 },
  { to: '/analytics', label: 'Analítica', icon: BarChart3 }
];

export function AdminLayout({ children }: PropsWithChildren) {
  const { profile } = useSupabase();

  return (
    <div className="flex min-h-screen bg-surface-muted">
      <aside className="hidden w-64 flex-col border-r border-surface-border bg-sidebar-background/95 px-6 py-8 text-sidebar-foreground shadow-sm lg:flex">
        <div className="mb-10 space-y-2 text-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-lg font-bold">
            RP
          </div>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-white/60">ReservaPro</p>
          <h1 className="text-lg font-semibold">Panel operativo</h1>
        </div>
        <nav className="space-y-2 text-sm font-medium">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-white/10',
                  isActive ? 'bg-white/10 text-white' : 'text-sidebar-foreground/80'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
          <p className="font-semibold uppercase tracking-[0.2em]">Próxima actividad</p>
          <p>Onboarding proveedores Caribe • 12 enero • 18:00</p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-surface-border bg-white px-6">
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-500">Hola,</p>
            <p className="text-sm font-semibold text-slate-900">{profile?.full_name ?? 'Operador'}</p>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {profile?.role ?? 'worker'}
            </span>
          </div>
          <div className="text-right text-xs text-slate-400">
            <p className="font-semibold text-slate-600">administrador@gmail.com</p>
            <p>Sesión gestionada automáticamente</p>
          </div>
        </header>
        <main className="flex-1 space-y-6 bg-surface-muted px-6 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
