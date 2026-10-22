import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Loader2, ShieldAlert, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';
import { dashboardNameFor, dashboardPathFor } from '../roleRoutes';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mq-bg">
        <div className="flex flex-col items-center gap-3 text-mq-primary font-semibold text-sm p-6 bg-white rounded-3xl border border-mq-border shadow-sm">
          <Loader2 size={32} className="animate-spin" />
          <span>Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/sign-in" replace />;
  }

  // Strict Role-Based Route Authorization
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const targetDashboard = dashboardPathFor(user.role);
    const targetName = dashboardNameFor(user.role);

    return (
      <div className="min-h-screen flex items-center justify-center bg-mq-bg p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-mq-danger/30 p-8 shadow-sm text-center animate-fade-in">
          <div className="w-16 h-16 bg-red-50 text-mq-danger rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-mq-text-strong mb-2">
            Access Restricted
          </h2>
          <p className="text-sm text-mq-text-muted mb-4">
            Your account role is <strong className="capitalize text-mq-text">{user.role}</strong>.
            You do not have authorization to view this area.
          </p>
          <p className="text-xs text-mq-text-muted bg-mq-surface-soft p-3 rounded-xl mb-6">
            Authorized roles: {allowedRoles.join(', ')}
          </p>
          <Link
            to={targetDashboard}
            className="btn btn-primary w-full justify-center py-2.5 rounded-full text-sm font-bold inline-flex items-center gap-2"
          >
            <span>Go to {targetName} Dashboard</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
