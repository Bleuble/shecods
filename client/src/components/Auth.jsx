import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, User, ArrowRight, Github } from 'lucide-react'

export default function Auth({ onLogin }) {
    const [isLogin, setIsLogin] = useState(true)
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({ name: '', email: '', password: '' })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            const apiBase = 'http://127.0.0.1:8000'
            const endpoint = isLogin ? `${apiBase}/login` : `${apiBase}/register`

            let response;
            if (isLogin) {
                const params = new URLSearchParams();
                params.append('username', formData.email);
                params.append('password', formData.password);
                response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: params
                });
            } else {
                response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: formData.name,
                        email: formData.email,
                        password: formData.password
                    })
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                alert(`Authentication failed: ${errorData.detail || 'Unknown error'}`);
                return;
            }

            const data = await response.json();
            localStorage.setItem('token', data.access_token);

            // Fetch user profile
            const userResponse = await fetch(`${apiBase}/me`, {
                headers: { 'Authorization': `Bearer ${data.access_token}` }
            });

            if (!userResponse.ok) {
                const errorData = await userResponse.json();
                alert(`Failed to fetch user profile: ${errorData.detail || 'Unknown error'}`);
                localStorage.removeItem('token'); // Clear token if profile fetch fails
                return;
            }

            const userData = await userResponse.json();

            const userWithAvatar = {
                ...userData,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.email}`,
                background: userData.bio
            };

            localStorage.setItem('user', JSON.stringify(userWithAvatar));
            onLogin(userWithAvatar);
        } catch (err) {
            console.error("Auth error details:", err);
            alert(`Network Error: ${err.message}. Please check if the backend server is running.`);
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: '80vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
        }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass"
                style={{ padding: '3rem', width: '100%', maxWidth: '450px' }}
            >
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                    <p style={{ color: 'var(--text-muted)' }}>{isLogin ? 'Log in to access your personalized career hub' : 'Join thousands of students building their career'}</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={16} /> Full Name</label>
                            <input
                                required
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    )}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={16} /> Email Address</label>
                        <input
                            required
                            type="email"
                            placeholder="john@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lock size={16} /> Password</label>
                        <input
                            required
                            type="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <button className="btn btn-primary" style={{ width: '100%', marginBottom: '1.5rem', height: '3.5rem' }} disabled={isLoading}>
                        {isLoading ? 'Processing...' : (
                            <>
                                {isLogin ? 'Sign In' : 'Get Started'} <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
                            </>
                        )}
                    </button>

                    <div style={{ textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {isLogin ? "Don't have an account?" : "Already have an account?"}
                            <button
                                type="button"
                                onClick={() => setIsLogin(!isLogin)}
                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', marginLeft: '0.5rem', fontWeight: 'bold' }}
                            >
                                {isLogin ? 'Sign Up' : 'Log In'}
                            </button>
                        </p>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}
