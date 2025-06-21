import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    const [token, setToken] = useState(null);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            // Primero obtener el token del AsyncStorage
            const storedToken = await AsyncStorage.getItem('auth-token');
            if (!storedToken) {
                setLoading(false);
                return;
            }

            setToken(storedToken);

            const { API_URL } = env();
            const response = await fetch(`${API_URL}/auth/check`, {
                headers: {
                    'Authorization': `Bearer ${storedToken}`,
                    'Content-Type': 'application/json'
                }
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
                                headers: {
                                    'Authorization': `Bearer ${storedToken}`,
                                    'Content-Type': 'application/json'
                                }
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
            } else {
                // Si el token no es válido, limpiarlo
                await AsyncStorage.removeItem('auth-token');
                setToken(null);
            }
        } catch (error) {
            console.error('Auth check error:', error);
            // En caso de error, limpiar el token
            await AsyncStorage.removeItem('auth-token');
            setToken(null);
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
                body: JSON.stringify({ email, password, userType })
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
            const authToken = data.token;
            if (!authToken) {
                console.error('❌ No se encontró token en la respuesta');
                throw new Error('No se pudo obtener el token de autenticación');
            }

            // Guardar el token en AsyncStorage
            await AsyncStorage.setItem('auth-token', authToken);
            setToken(authToken);

            console.log('✅ Login exitoso para usuario:', data.user?.email);
            setUser(data.user);
            return { data, token: authToken };
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
            const storedToken = await AsyncStorage.getItem('auth-token');

            if (storedToken) {
                await fetch(`${API_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${storedToken}`,
                        'Content-Type': 'application/json'
                    }
                });
            }

            // Limpiar el token del AsyncStorage
            await AsyncStorage.removeItem('auth-token');
            setToken(null);
            setUser(null);
        } catch (error) {
            console.error('Logout error:', error);
            // Aún así limpiar el estado local
            await AsyncStorage.removeItem('auth-token');
            setToken(null);
            setUser(null);
        }
    };

    // Función helper para obtener headers con autenticación
    const getAuthHeaders = () => {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    };

    const value = {
        user,
        setUser,
        loading,
        login,
        logout,
        token,
        getAuthHeaders
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
