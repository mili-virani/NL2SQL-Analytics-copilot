import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const { user, login, loginGuest, loginLocal, signupLocal } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [isSignup, setIsSignup] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '', username: '', full_name: '' });
    const [error, setError] = useState(null);

    useEffect(() => {
        if (user) {
            let from = location.state?.from?.pathname;
            if (!from || from === "/") {
                from = (user.role === "admin" || user.role === "super_admin") ? "/admin" : "/";
            }
            navigate(from, { replace: true });
        }
    }, [user, navigate, location]);

    const handleGoogleSuccess = async (credentialResponse) => {
        setError(null);
        const success = await login(credentialResponse.credential);
        if (!success) {
            setError("Google Auth Failed to Validate on Backend.");
        }
    };
    
    const handleGuest = async () => {
        setError(null);
        await loginGuest();
    };

    const handleLocalSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (isSignup) {
            const res = await signupLocal(formData.email, formData.username, formData.password, formData.full_name);
            if (!res.success) setError(res.message);
        } else {
            const res = await loginLocal(formData.email, formData.password);
            if (!res.success) setError(res.message);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #0a0d16, #12151f)', fontFamily: "'Inter', sans-serif"
        }}>
            <div style={{
                background: '#0e1017', padding: '40px', borderRadius: '16px', border: '1px solid #1e2230',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)', textAlign: 'center', maxWidth: 400, width: '100%'
            }}>
                <div style={{
                    width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #4adb8a, #4a9eff)',
                    margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff'
                }}>◈</div>
                <h2 style={{ color: '#fff', margin: '0 0 10px 0', fontSize: 24 }}>{isSignup ? "Create an Account" : "Welcome Back"}</h2>
                <p style={{ color: '#8fa1c7', margin: '0 0 20px 0', fontSize: 14 }}>Enterprise NL2SQL Co-pilot</p>
                
                <form onSubmit={handleLocalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                    {isSignup && (
                        <>
                            <input 
                                placeholder="Full Name" type="text" required
                                value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})}
                                style={{ background: '#0a0d16', color: '#fff', border: '1px solid #1e2230', padding: '12px', borderRadius: 8, outline: 'none' }}
                            />
                            <input 
                                placeholder="Username" type="text" required
                                value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})}
                                style={{ background: '#0a0d16', color: '#fff', border: '1px solid #1e2230', padding: '12px', borderRadius: 8, outline: 'none' }}
                            />
                        </>
                    )}
                    <input 
                        placeholder="Email Address" type="email" required
                        value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                        style={{ background: '#0a0d16', color: '#fff', border: '1px solid #1e2230', padding: '12px', borderRadius: 8, outline: 'none' }}
                    />
                    <input 
                        placeholder="Password" type="password" required
                        value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                        style={{ background: '#0a0d16', color: '#fff', border: '1px solid #1e2230', padding: '12px', borderRadius: 8, outline: 'none' }}
                    />
                    
                    {error && <p style={{ color: '#e24b4a', margin: 0, fontSize: 13, textAlign: 'left' }}>{error}</p>}

                    <button type="submit" style={{
                        background: 'linear-gradient(135deg, #4a9eff, #4adb8a)', color: '#000', border: 'none',
                        padding: '12px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', marginTop: 8
                    }}>
                        {isSignup ? "Sign Up" : "Log In"}
                    </button>
                    
                    <p style={{ color: '#8fa1c7', fontSize: 13, marginTop: 8, cursor: 'pointer' }} onClick={() => setIsSignup(!isSignup)}>
                        {isSignup ? "Already have an account? Log In" : "Don't have an account? Sign Up"}
                    </p>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', width: '100%', margin: '16px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: '#1e2230' }}></div>
                    <span style={{ margin: '0 12px', color: '#4a5a7a', fontSize: '12px', fontWeight: 600 }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: '#1e2230' }}></div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError('Google Login Failed')}
                            useOneTap
                            theme="filled_black"
                            shape="pill"
                        />
                    </div>
                    
                    <button 
                        onClick={handleGuest} type="button"
                        style={{
                            background: 'transparent', border: '1px solid #2a3040', borderRadius: '24px', color: '#c8d0e8',
                            padding: '10px 24px', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease',
                            width: '100%', justifyContent: 'center', fontFamily: "'Inter', sans-serif"
                        }}
                    >
                        <span>👤</span> Continue as Guest
                    </button>
                </div>
            </div>
        </div>
    );
}
