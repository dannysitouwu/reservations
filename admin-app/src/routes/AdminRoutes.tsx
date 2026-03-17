import { useEffect } from 'react';
import { Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useSupabase } from '../providers/SupabaseProvider';
import { AdminLayout } from '../layouts/AdminLayout';
import { AuthAdminPage } from '../pages/AuthAdminPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ReservationDetailPage } from '../pages/ReservationDetailPage';
import { ReservationsPage } from '../pages/ReservationsPage';
import { UserManagementPage } from '../pages/UserManagementPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { NewServicePage } from '../pages/NewServicePage';

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
