import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, homeFor, useAuth } from './lib/auth';
import type { Role } from './lib/types';
import { PageLoader, PublicLayout } from './components/Layout';
import { LinkButton } from './components/ui';

import { Home } from './pages/public/Home';
import { Browse } from './pages/public/Browse';
import { Categories } from './pages/public/Categories';
import { ProfilePage } from './pages/public/ProfilePage';
import { Login, Signup } from './pages/public/Auth';
import { ForProfessionals, HowItWorks } from './pages/public/ForProfessionals';
import { Join } from './pages/public/Join';

import { Account } from './pages/client/Account';
import { ClientBookingDetail } from './pages/client/BookingDetail';

import { ProOverview } from './pages/pro/Overview';
import { ProRates } from './pages/pro/Rates';
import { ProProfile } from './pages/pro/Profile';
import { ProBookings } from './pages/pro/Bookings';
import { ProBookingDetail } from './pages/pro/BookingDetail';
import { ProBilling } from './pages/pro/Billing';

import { AdminOverviewPage } from './pages/admin/Overview';
import { AdminProfessionals } from './pages/admin/Professionals';
import { OnboardProfessional } from './pages/admin/OnboardProfessional';
import { AdminProfessionalDetail } from './pages/admin/ProfessionalDetail';
import { AdminPlans } from './pages/admin/Plans';
import { AdminCategories } from './pages/admin/Categories';
import { AdminAudit, AdminBookings } from './pages/admin/BookingsAndAudit';

function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}

function NotFound() {
  return (
    <div className="container-page py-28 text-center">
      <p className="text-brand-600 text-sm font-semibold tracking-wide uppercase">404</p>
      <h1 className="text-ink-950 mt-2 text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-ink-500 mt-3">The page you were looking for doesn’t exist.</p>
      <div className="mt-8 flex justify-center gap-3">
        <LinkButton to="/">Back to home</LinkButton>
        <LinkButton to="/browse" variant="secondary">
          Find a professional
        </LinkButton>
      </div>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/pro/:slug" element={<ProfilePage />} />
          <Route path="/for-professionals" element={<ForProfessionals />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/join" element={<Join />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route
          path="/account"
          element={
            <RequireRole roles={['client']}>
              <Account />
            </RequireRole>
          }
        />
        <Route
          path="/account/bookings/:id"
          element={
            <RequireRole roles={['client']}>
              <ClientBookingDetail />
            </RequireRole>
          }
        />

        <Route
          path="/dashboard"
          element={
            <RequireRole roles={['professional']}>
              <ProOverview />
            </RequireRole>
          }
        />
        <Route
          path="/dashboard/bookings"
          element={
            <RequireRole roles={['professional']}>
              <ProBookings />
            </RequireRole>
          }
        />
        <Route
          path="/dashboard/bookings/:id"
          element={
            <RequireRole roles={['professional']}>
              <ProBookingDetail />
            </RequireRole>
          }
        />
        <Route
          path="/dashboard/rates"
          element={
            <RequireRole roles={['professional']}>
              <ProRates />
            </RequireRole>
          }
        />
        <Route
          path="/dashboard/profile"
          element={
            <RequireRole roles={['professional']}>
              <ProProfile />
            </RequireRole>
          }
        />
        <Route
          path="/dashboard/billing"
          element={
            <RequireRole roles={['professional']}>
              <ProBilling />
            </RequireRole>
          }
        />

        <Route
          path="/admin"
          element={
            <RequireRole roles={['admin']}>
              <AdminOverviewPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/professionals"
          element={
            <RequireRole roles={['admin']}>
              <AdminProfessionals />
            </RequireRole>
          }
        />
        <Route
          path="/admin/professionals/new"
          element={
            <RequireRole roles={['admin']}>
              <OnboardProfessional />
            </RequireRole>
          }
        />
        <Route
          path="/admin/professionals/:id"
          element={
            <RequireRole roles={['admin']}>
              <AdminProfessionalDetail />
            </RequireRole>
          }
        />
        <Route
          path="/admin/plans"
          element={
            <RequireRole roles={['admin']}>
              <AdminPlans />
            </RequireRole>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <RequireRole roles={['admin']}>
              <AdminCategories />
            </RequireRole>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <RequireRole roles={['admin']}>
              <AdminBookings />
            </RequireRole>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <RequireRole roles={['admin']}>
              <AdminAudit />
            </RequireRole>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
