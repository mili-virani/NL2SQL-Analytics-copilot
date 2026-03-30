import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children, allowedRoles }) {
    const { user, loading, token } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div style={{ padding: 40, color: '#fff' }}>Loading identity...</div>;
    }

    if (!token || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return (
            <div style={{ padding: 40, color: '#e24b4a', background: '#080b12', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <h2>Access Denied</h2>
                <p>Your role ({user.role}) does not have permission to view this page.</p>
                <a href="/" style={{ color: '#4a9eff', marginTop: 20 }}>Return Home</a>
            </div>
        );
    }

    return children;
}
