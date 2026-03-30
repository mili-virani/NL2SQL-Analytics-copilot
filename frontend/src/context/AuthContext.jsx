import React, { createContext, useContext, useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('access_token'));
    const [loading, setLoading] = useState(true);

    const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8001";

    useEffect(() => {
        if (token) {
            localStorage.setItem('access_token', token);
            fetchUser();
        } else {
            localStorage.removeItem('access_token');
            setUser(null);
            setLoading(false);
        }
    }, [token]);

    const fetchUser = async (overrideToken) => {
        const activeToken = overrideToken || token;
        if (!activeToken) return false;
        
        try {
            const res = await fetch(`${API_BASE}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${activeToken}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data);
                return true;
            } else {
                setToken(null);
                setUser(null);
                return false;
            }
        } catch (e) {
            console.error(e);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleAuthSuccess = async (newToken) => {
        localStorage.setItem('access_token', newToken);
        setToken(newToken);
        await fetchUser(newToken);
    };

    const login = async (credential) => {
        const res = await fetch(`${API_BASE}/auth/google/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential })
        });
        if (res.ok) {
            const data = await res.json();
            await handleAuthSuccess(data.access_token);
            return true;
        }
        return false;
    };

    const loginGuest = async () => {
        const res = await fetch(`${API_BASE}/auth/guest/login`, {
            method: 'POST',
        });
        if (res.ok) {
            const data = await res.json();
            await handleAuthSuccess(data.access_token);
            return true;
        }
        return false;
    };

    const loginLocal = async (email, password) => {
        const res = await fetch(`${API_BASE}/auth/local/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (res.ok) {
            const data = await res.json();
            await handleAuthSuccess(data.access_token);
            return { success: true };
        }
        const err = await res.json();
        return { success: false, message: err.detail };
    };

    const signupLocal = async (email, username, password, full_name) => {
        const res = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password, full_name })
        });
        if (res.ok) {
            const data = await res.json();
            await handleAuthSuccess(data.access_token);
            return { success: true };
        }
        const err = await res.json();
        return { success: false, message: err.detail };
    };

    const logout = () => {
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, loginGuest, loginLocal, signupLocal, logout }}>
            <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "placeholder-client-id.apps.googleusercontent.com"}>
                {children}
            </GoogleOAuthProvider>
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
