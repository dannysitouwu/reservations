import { Route, Routes } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { AuthPage } from '../pages/AuthPage';
import { CreateReservationPage } from '../pages/CreateReservationPage';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ReservationOptionsPage } from '../pages/ReservationOptionsPage';
import { ReservationStatusPage } from '../pages/ReservationStatusPage';
import { MyReservationsPage } from '../pages/MyReservationsPage';

export function AppRoutes() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/reservations/new" element={<CreateReservationPage />} />
        <Route path="/reservations/status" element={<ReservationStatusPage />} />
        <Route path="/reservations/options" element={<ReservationOptionsPage />} />
        <Route path="/reservations/mine" element={<MyReservationsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MainLayout>
  );
}
