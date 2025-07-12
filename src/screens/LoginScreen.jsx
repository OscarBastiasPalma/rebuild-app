import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../context/SessionContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import env from '../config';

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();
    const { login } = useAuth();
    const { updateSession } = useSession();

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleLogin = async () => {
        if (!validateEmail(email)) {
            Alert.alert('Error', 'Por favor, ingresa un correo válido.');
            return;
        }
        if (!password) {
            Alert.alert('Error', 'Por favor, ingresa tu contraseña.');
            return;
        }

        setLoading(true);
        try {
            // Usar la función login del contexto de autenticación
            const { data, token } = await login(email, password, 'PROFESSIONAL');

            // Actualizar la sesión con los datos del usuario y el token
            await updateSession({
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.name,
                    userType: data.user.userType,
                    profileCompleted: data.user.profileCompleted
                },
                token: token
            });

            // Navegar según el estado del perfil
            if (!data.user.profileCompleted) {
                navigation.replace('CompleteProfile');
            } else {
                navigation.replace('Home');
            }
        } catch (error) {
            console.error('Login error details:', error);
            Alert.alert('Error', error.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <View style={styles.card}>
                <Image source={require('../../assets/logo.png')} style={styles.logo} />
                <Text style={styles.title}>Bienvenido!</Text>

                <Text style={styles.label}>Email</Text>
                <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Ingresa tu email"
                    placeholderTextColor="#999"
                    editable={!loading}
                />

                <Text style={styles.label}>Contraseña</Text>
                <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="Ingresa tu contraseña"
                    placeholderTextColor="#999"
                    editable={!loading}
                />

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    activeOpacity={0.7}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.buttonText}>Iniciar Sesión</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.navigate('ForgotPassword')}
                    activeOpacity={0.7}
                    disabled={loading}
                >
                    <Text style={styles.link}>¿Perdiste tu contraseña?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.navigate('Register')}
                    activeOpacity={0.7}
                    disabled={loading}
                >
                    <Text style={styles.link}>¿No tienes una cuenta? Regístrate</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9a825'
    },
    card: {
        width: '90%',
        maxWidth: 300,
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 10,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    logo: {
        width: 50,
        height: 50,
        marginBottom: 10
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20
    },
    label: {
        alignSelf: 'flex-start',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 5
    },
    input: {
        width: '100%',
        height: 45,
        borderColor: '#ddd',
        borderWidth: 1,
        marginBottom: 15,
        paddingHorizontal: 10,
        backgroundColor: '#fff',
        borderRadius: 5,
        fontSize: 16
    },
    button: {
        backgroundColor: '#f57c00',
        padding: 12,
        borderRadius: 5,
        marginTop: 10,
        width: '100%',
        alignItems: 'center'
    },
    buttonDisabled: {
        opacity: 0.7
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    },
    link: {
        color: '#f57c00',
        marginTop: 15,
        textDecorationLine: 'underline',
        fontSize: 14
    }
});

export default LoginScreen;
