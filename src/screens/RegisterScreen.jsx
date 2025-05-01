import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

const RegisterScreen = () => {
    const navigation = useNavigation();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleRegister = async () => {
        if (password !== confirmPassword) {
            Alert.alert("Error", "Las contraseñas no coinciden");
            return;
        }
        console.log('Nombre Completo:', fullName);
        console.log('Correo:', email);
        console.log('Contraseña:', password);
        console.log('Confirmar Contraseña:', confirmPassword);

        // Llamada al microservicio (comentado hasta que esté disponible)
        /*
        try {
            const response = await fetch('https://tu-microservicio.com/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fullName, email, password })
            });
            
            if (response.status === 200) {
                Alert.alert("Éxito", "Registro exitoso");
                navigation.goBack();
            } else {
                Alert.alert("Error", "No se pudo completar el registro");
            }
        } catch (error) {
            Alert.alert("Error", "Ocurrió un problema con el registro");
        }
        */
    };

    const testAsset = async () => {
        try {
            const asset = Asset.fromModule(require('../../assets/data/mockUserData.json'));
            await asset.downloadAsync();
            console.log('asset.localUri:', asset.localUri);
            const data = await FileSystem.readAsStringAsync(asset.localUri);
            console.log('Contenido:', data);
        } catch (err) {
            console.log('Error test asset:', err);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Crear Cuenta</Text>
            <TextInput
                style={styles.input}
                placeholder="Nombre Completo"
                value={fullName}
                onChangeText={setFullName}
            />
            <TextInput
                style={styles.input}
                placeholder="Correo"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
            />
            <TextInput
                style={styles.input}
                placeholder="Contraseña"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />
            <TextInput
                style={styles.input}
                placeholder="Confirmar Contraseña"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
            />
            <TouchableOpacity style={styles.button} onPress={handleRegister}>
                <Text style={styles.buttonText}>Registrarse</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.link}>¿Ya tienes una cuenta? Inicia Sesión</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFA500' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    input: { width: '80%', height: 40, borderColor: '#000', borderWidth: 1, marginBottom: 10, paddingHorizontal: 10, backgroundColor: '#FFF' },
    button: { backgroundColor: '#FF8C00', padding: 10, borderRadius: 5, marginTop: 10 },
    buttonText: { color: '#FFF', fontWeight: 'bold' },
    link: { color: 'blue', marginTop: 10 }
});

export default RegisterScreen;