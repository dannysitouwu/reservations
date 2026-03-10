import { Outlet, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ReservationDetailPage } from '../pages/ReservationDetailPage';
import { ReservationsPage } from '../pages/ReservationsPage';
import { UserManagementPage } from '../pages/UserManagementPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
export function AdminRoutes() {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/reservations" element={<ReservationsPage />} />
        <Route path="/reservations/:id" element={<ReservationDetailPage />} />
        <Route path="/users" element={<UserManagementPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AdminLayout>
  );
}
