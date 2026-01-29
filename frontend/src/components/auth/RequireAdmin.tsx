import { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';

interface RequireAdminProps {
  children: ReactElement;
}

const RequireAdmin = ({ children }: RequireAdminProps) => {
  const { loading, isAuthenticated, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-honey"></div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/books" replace />;
  }

  return children;
};

export default RequireAdmin;
