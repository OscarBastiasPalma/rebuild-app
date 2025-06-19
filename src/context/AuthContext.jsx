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
                // Verificar content-type antes de parsear
                const contentType = response.headers.get('content-type');
                let data;

                try {
                    if (contentType && contentType.includes('application/json')) {
                        data = await response.json();
                    } else {
                        const textResponse = await response.text();
                        data = JSON.parse(textResponse);
                    }
                } catch (parseError) {
                    console.error('Error al parsear respuesta de auth check:', parseError);
                    return;
                }

                if (data.user) {
                    // Si el usuario es profesional, asegurarnos de que tenga su perfil
                    if (data.user.userType === 'PROFESSIONAL') {
                        try {
                            const profileResponse = await fetch(`${API_URL}/professionals/profile`, {
                                credentials: 'include'
                            });
                            if (profileResponse.ok) {
                                const profileContentType = profileResponse.headers.get('content-type');
                                let profileData;

                                if (profileContentType && profileContentType.includes('application/json')) {
                                    profileData = await profileResponse.json();
                                } else {
                                    const textResponse = await profileResponse.text();
                                    profileData = JSON.parse(textResponse);
                                }

                                data.user.professionalProfile = profileData;
                            }
                        } catch (profileError) {
                            console.error('Error al obtener perfil profesional:', profileError);
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
            console.log('🌐 Intentando login en:', `${API_URL}/auth/login`);
            console.log('📋 Datos enviados:', { email, userType });

            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, userType }),
                credentials: 'include'
            });

            console.log('📡 Status de respuesta:', response.status);
            console.log('📡 Headers de respuesta:', Object.fromEntries(response.headers.entries()));

            // Verificar el content-type antes de parsear JSON
            const contentType = response.headers.get('content-type');
            console.log('📄 Content-Type:', contentType);

            let data;
            try {
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    // Si no es JSON, obtener como texto para debugging
                    const textResponse = await response.text();
                    console.log('📄 Respuesta como texto:', textResponse);

                    // Intentar parsear como JSON de todos modos
                    try {
                        data = JSON.parse(textResponse);
                    } catch (parseError) {
                        console.error('❌ Error al parsear JSON:', parseError);
                        throw new Error(`El servidor devolvió una respuesta inválida. Status: ${response.status}. Respuesta: ${textResponse.substring(0, 200)}...`);
                    }
                }
            } catch (jsonError) {
                console.error('❌ Error al procesar respuesta:', jsonError);
                throw new Error('El servidor devolvió una respuesta inválida. Verifica tu conexión e intenta nuevamente.');
            }

            console.log('✅ Datos parseados:', data);

            if (!response.ok) {
                const errorMessage = data?.error || data?.message || `Error del servidor (${response.status})`;
                console.error('❌ Error de login:', errorMessage);
                throw new Error(errorMessage);
            }

            // Extract token from the response data
            const token = data.token;
            if (!token) {
                console.error('❌ No se encontró token en la respuesta');
                throw new Error('No se pudo obtener el token de autenticación');
            }

            console.log('✅ Login exitoso para usuario:', data.user?.email);
            setUser(data.user);
            return { data, token };
        } catch (error) {
            console.error('❌ Login error completo:', error);

            // Si es un error de red, dar un mensaje más específico
            if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
                throw new Error('Error de conexión. Verifica tu conexión a internet e intenta nuevamente.');
            }

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
