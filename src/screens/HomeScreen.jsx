import React, { useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

const HomeScreen = () => {
    const { user } = useAuth();

    return (
        <View style={styles.container}>
            <Text style={styles.text}>Bienvenido {user?.email}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 18,
    }
});

export default HomeScreen;
