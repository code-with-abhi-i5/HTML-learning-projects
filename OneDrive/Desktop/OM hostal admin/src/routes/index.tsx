import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// Lazy load all pages
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const StudentsPage = lazy(() => import('@/pages/StudentsPage'));
const AddStudentPage = lazy(() => import('@/pages/AddStudentPage'));
const StudentDetailsPage = lazy(() => import('@/pages/StudentDetailsPage'));
const EditStudentPage = lazy(() => import('@/pages/EditStudentPage'));
const PaymentsPage = lazy(() => import('@/pages/PaymentsPage'));
const ReceiptsPage = lazy(() => import('@/pages/ReceiptsPage'));
const RoomsPage = lazy(() => import('@/pages/RoomsPage'));
const FeesPage = lazy(() => import('@/pages/FeesPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const AuditLogsPage = lazy(() => import('@/pages/AuditLogsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicRoute>
        <Suspense fallback={<PageLoader />}>
          <LoginPage />
        </Suspense>
      </PublicRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>,
      },
      {
        path: 'students',
        element: <Suspense fallback={<PageLoader />}><StudentsPage /></Suspense>,
      },
      {
        path: 'students/add',
        element: <Suspense fallback={<PageLoader />}><AddStudentPage /></Suspense>,
      },
      {
        path: 'students/:id',
        element: <Suspense fallback={<PageLoader />}><StudentDetailsPage /></Suspense>,
      },
      {
        path: 'students/:id/edit',
        element: <Suspense fallback={<PageLoader />}><EditStudentPage /></Suspense>,
      },
      {
        path: 'payments',
        element: <Suspense fallback={<PageLoader />}><PaymentsPage /></Suspense>,
      },
      {
        path: 'receipts',
        element: <Suspense fallback={<PageLoader />}><ReceiptsPage /></Suspense>,
      },
      {
        path: 'rooms',
        element: <Suspense fallback={<PageLoader />}><RoomsPage /></Suspense>,
      },
      {
        path: 'fees',
        element: <Suspense fallback={<PageLoader />}><FeesPage /></Suspense>,
      },
      {
        path: 'reports',
        element: <Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>,
      },
      {
        path: 'audit-logs',
        element: <Suspense fallback={<PageLoader />}><AuditLogsPage /></Suspense>,
      },
      {
        path: 'settings',
        element: <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
