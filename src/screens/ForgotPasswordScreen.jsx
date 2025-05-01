import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const ForgotPasswordScreen = () => {
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            <Text style={styles.text}>Pantalla de recuperación de contraseña</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.link}>Volver</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    text: { fontSize: 18 },
    link: { color: 'blue', marginTop: 10 }
});

export default ForgotPasswordScreen;
