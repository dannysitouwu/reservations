import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { AuthAdminPage } from '../pages/AuthAdminPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NewServicePage } from '../pages/NewServicePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ReservationDetailPage } from '../pages/ReservationDetailPage';
import { ReservationsPage } from '../pages/ReservationsPage';
import { UserManagementPage } from '../pages/UserManagementPage';
import { useSupabase } from '../providers/SupabaseProvider';

function ProtectedRoutes() {
  const { session, loading } = useSupabase();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      navigate('/auth', { replace: true });
    }
  }, [session, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/reservations" element={<ReservationsPage />} />
        <Route path="/reservations/:id" element={<ReservationDetailPage />} />
        <Route path="/users" element={<UserManagementPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/services/new" element={<NewServicePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AdminLayout>
  );
}

export function AdminRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthAdminPage />} />
      <Route path="*" element={<ProtectedRoutes />} />
    </Routes>
  );
}
