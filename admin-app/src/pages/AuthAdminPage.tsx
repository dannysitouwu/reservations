import type { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { supabase } from '../lib/supabaseClient';

export function AuthAdminPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@reservapro.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession) {
        navigate('/');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (currentSession) {
        navigate('/');
      }
    });

    return () => subscription?.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Sign in with email/password
      const { error: signInError, data: { session: newSession } } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      // Verify user is admin
      if (newSession?.user?.id) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', newSession.user.id)
          .maybeSingle();

        if (profileError || !profile) {
          await supabase.auth.signOut();
          setError('Perfil de usuario no encontrado');
          setLoading(false);
          return;
        }

        if (profile.role !== 'admin' && profile.role !== 'super_admin') {
          await supabase.auth.signOut();
          setError('Solo administradores pueden acceder a este panel');
          setLoading(false);
          return;
        }

        // User is admin, session will auto-redirect
      }
    } catch (err) {
      setError('Error al iniciar sesión. Intenta de nuevo.');
      setLoading(false);
    }
  };

  if (session) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-primary bg-primary text-white text-sm font-bold">
              RP
            </div>
            <span className="font-semibold">ReservaPro</span>
          </div>
          <CardTitle>Panel Admin</CardTitle>
          <p className="text-xs text-slate-500">Inicia sesión para acceder al panel de administración</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@reservapro.com"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Iniciando...' : 'Iniciar sesión'}
            </Button>
          </form>
          <div className="mt-4 rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-600">
              <strong>Demo:</strong> Usa credenciales válidas de Supabase Auth con rol {'"admin"'} en la tabla{' '}
              <code className="text-xs">profiles</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
