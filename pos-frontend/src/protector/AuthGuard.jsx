import { Navigate } from 'react-router';

const AuthGuard = ({ children, requireAdmin = false, requireUser = false }) => {
    const normalizedRole = (sessionStorage.getItem('role') || localStorage.getItem('role') || '').toLowerCase();


    // Check if admin access is required
    if (requireAdmin && normalizedRole !== 'admin') {
        // Redirect to home if not admin
        return <Navigate to="/" replace />;
    }

    // Check if standard user access (Admin, Manager, Cashier) is required
    const allowedRoles = ['admin', 'manager', 'cashier'];
    if (requireUser && !allowedRoles.includes(normalizedRole)) {
        // Redirect to home if role is not authorized or not found
        return <Navigate to="/" replace />;
    }

    // User is authenticated and authorized
    return children;
};

export default AuthGuard;
