import { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';

interface RequireAuthProps {
  children: ReactElement;
}

const RequireAuth = ({ children }: RequireAuthProps) => {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-coal">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-honey"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login, but save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default RequireAuth;
