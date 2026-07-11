import { Navigate, useLocation } from 'react-router';
import { useAppSelector } from '../../app/hooks';
import { FullPageLoader } from '../../shared/components/FullPageLoader';
import { AppLayout } from '../../shared/layout/AppLayout';

export function ProtectedRoute() {
  const status = useAppSelector((state) => state.auth.status);
  const location = useLocation();

  if (status === 'checking') {
    return <FullPageLoader />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <AppLayout />;
}
