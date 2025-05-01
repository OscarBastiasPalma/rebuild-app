import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import mockUserData from '../../assets/mockUserData.json';

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigation = useNavigation();
    const { login } = useAuth();

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleLogin = async () => {
        console.log('Login attempt:', { email, password });
        if (!validateEmail(email)) {
            Alert.alert('Error', 'Por favor, ingresa un correo válido.');
            return;
        }
        if (!password) {
            Alert.alert('Error', 'Por favor, ingresa tu contraseña.');
            return;
        }

        // Usar directamente el mock importado
        const userData = mockUserData;
        console.log('Contenido mockUserData.json:', userData);

        if (email === userData.email && password === userData.password) {
            login(email);
            if (userData.firstLogin) {
                navigation.replace('CompleteProfile');
            } else {
                navigation.replace('Home');
            }
        } else {
            Alert.alert('Error', 'Correo o contraseña incorrectos.');
        }
    };

    // FUTURA CONEXIÓN AL MICROSERVICIO
    /*
    fetch('https://tu-api.com/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            login(email);
            navigation.replace('Home');
        } else {
            Alert.alert('Error', 'Credenciales inválidas.');
        }
    })
    .catch(error => {
        Alert.alert('Error', 'No se pudo conectar al servicio.');
        console.error(error);
    });
    */

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <View style={styles.card}>
                <Image source={require('../../assets/icon.png')} style={styles.logo} />
                <Text style={styles.title}>Bienvenido!</Text>

                <Text style={styles.label}>Email</Text>
                <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={text => {
                        setEmail(text);
                        console.log('Input email:', text);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Ingresa tu email"
                    placeholderTextColor="#999"
                />

                <Text style={styles.label}>Contraseña</Text>
                <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={text => {
                        setPassword(text);
                        console.log('Input password:', text);
                    }}
                    secureTextEntry
                    placeholder="Ingresa tu contraseña"
                    placeholderTextColor="#999"
                />

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleLogin}
                    activeOpacity={0.7}
                >
                    <Text style={styles.buttonText}>Iniciar Sesión</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.navigate('ForgotPassword')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.link}>¿Perdiste tu contraseña?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.navigate('Register')}
                    activeOpacity={0.7}
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
