import React, { createContext, useContext, useState, useEffect } from 'react';
import env from '../config';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const { API_URL } = env();
            const response = await fetch(`${API_URL}/auth/check`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.user) {
                    // Si el usuario es profesional, asegurarnos de que tenga su perfil
                    if (data.user.userType === 'PROFESSIONAL') {
                        const profileResponse = await fetch(`${API_URL}/professionals/profile`, {
                            credentials: 'include'
                        });
                        if (profileResponse.ok) {
                            const profileData = await profileResponse.json();
                            data.user.professionalProfile = profileData;
                        }
                    }
                    setUser(data.user);
                }
            }
        } catch (error) {
            console.error('Auth check error:', error);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password, userType) => {
        try {
            const { API_URL } = env();
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, userType }),
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al iniciar sesión');
            }

            setUser(data.user);
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            const { API_URL } = env();
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            setUser(null);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const value = {
        user,
        setUser,
        loading,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
