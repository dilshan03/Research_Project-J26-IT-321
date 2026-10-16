import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const target = user?.role === 'teacher' ? '/teacher/dashboard/settings' : '/parent/dashboard/settings';
  return <Navigate to={target} replace />;
};

export default ProfilePage;

