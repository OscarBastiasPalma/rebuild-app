import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import mockUserData from '../../assets/mockUserData.json';

const STORAGE_KEY = 'userProfileData';

const ProfileScreen = () => {
    const [user, setUser] = useState(null);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({});
    const navigation = useNavigation();

    // Cargar datos del usuario desde AsyncStorage o mock
    useEffect(() => {
        const loadUser = async () => {
            try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    setUser(parsed);
                    setForm(parsed);
                } else {
                    setUser(mockUserData);
                    setForm(mockUserData);
                }
            } catch (err) {
                Alert.alert('Error', 'No se pudo cargar el perfil.');
            }
        };
        loadUser();
    }, []);

    const handleEdit = () => {
        setEditing(true);
    };

    const handleChange = (key, value) => {
        setForm({ ...form, [key]: value });
    };

    const handleSave = async () => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(form));
            setUser(form);
            setEditing(false);
            Alert.alert('Éxito', 'Perfil actualizado.');
        } catch (err) {
            Alert.alert('Error', 'No se pudo guardar el perfil.');
        }
    };

    if (!user) return <Text style={{ marginTop: 50, textAlign: 'center' }}>Cargando perfil...</Text>;

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.card}>
                <TouchableOpacity style={styles.backCircle} onPress={() => navigation.goBack()}>
                    <Text style={styles.backCircleText}>←</Text>
                </TouchableOpacity>
                <View style={styles.avatar} />
                <Text style={styles.name}>{user.nombre}</Text>
                <Text style={styles.profession}>{user.profesion}</Text>
                <View style={styles.profileBox}>
                    <View style={styles.profileHeader}>
                        <Text style={styles.profileTitle}>Perfil de usuario</Text>
                        {!editing && (
                            <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                                <Text style={styles.editButtonText}>Editar</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {editing ? (
                        <>
                            <Text style={styles.label}>Correo:</Text>
                            <TextInput style={styles.input} value={form.email} onChangeText={v => handleChange('email', v)} />
                            <Text style={styles.label}>RUT:</Text>
                            <TextInput style={styles.input} value={form.rut} onChangeText={v => handleChange('rut', v)} />
                            <Text style={styles.label}>Teléfono:</Text>
                            <TextInput style={styles.input} value={form.telefono} onChangeText={v => handleChange('telefono', v)} />
                            <Text style={styles.label}>Región:</Text>
                            <TextInput style={styles.input} value={form.region} onChangeText={v => handleChange('region', v)} />
                            <Text style={styles.label}>Ciudad:</Text>
                            <TextInput style={styles.input} value={form.ciudad} onChangeText={v => handleChange('ciudad', v)} />
                            <Text style={styles.label}>Comuna:</Text>
                            <TextInput style={styles.input} value={form.comuna} onChangeText={v => handleChange('comuna', v)} />
                            <Text style={styles.label}>Dirección:</Text>
                            <TextInput style={styles.input} value={form.direccion} onChangeText={v => handleChange('direccion', v)} />
                            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                                <Text style={styles.saveButtonText}>Guardar</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={styles.item}><Text style={styles.label}>Correo:</Text> {user.email}</Text>
                            <Text style={styles.item}><Text style={styles.label}>RUT:</Text> {user.rut}</Text>
                            <Text style={styles.item}><Text style={styles.label}>Teléfono:</Text> {user.telefono}</Text>
                            <Text style={styles.item}><Text style={styles.label}>Región:</Text> {user.region}</Text>
                            <Text style={styles.item}><Text style={styles.label}>Ciudad:</Text> {user.ciudad}</Text>
                            <Text style={styles.item}><Text style={styles.label}>Comuna:</Text> {user.comuna}</Text>
                            <Text style={styles.item}><Text style={styles.label}>Dirección:</Text> {user.direccion}</Text>
                        </>
                    )}
                </View>
                <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.replace('Login')}>
                    <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFA500',
        paddingVertical: 30,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        width: '90%',
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ccc',
        marginBottom: 10,
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 10,
    },
    profession: {
        fontSize: 16,
        color: '#444',
        marginBottom: 20,
    },
    profileBox: {
        borderWidth: 1,
        borderColor: '#FFA500',
        borderRadius: 8,
        padding: 15,
        width: '100%',
        marginBottom: 20,
        backgroundColor: '#fff',
    },
    profileHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    profileTitle: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    editButton: {
        backgroundColor: '#FFA500',
        borderRadius: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    editButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    item: {
        fontSize: 14,
        marginBottom: 4,
    },
    label: {
        fontWeight: 'bold',
    },
    input: {
        width: '100%',
        borderColor: '#FFA500',
        borderWidth: 1,
        borderRadius: 5,
        padding: 8,
        marginBottom: 8,
        fontSize: 14,
        backgroundColor: '#fff',
    },
    saveButton: {
        backgroundColor: '#28a745',
        borderRadius: 5,
        paddingVertical: 10,
        paddingHorizontal: 30,
        marginTop: 10,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    logoutButton: {
        backgroundColor: 'red',
        borderRadius: 5,
        paddingVertical: 10,
        paddingHorizontal: 30,
        marginTop: 10,
    },
    logoutButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    backCircle: {
        position: 'absolute',
        top: 12,
        left: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#FFA500',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        zIndex: 20,
    },
    backCircleText: {
        color: '#FFA500',
        fontWeight: 'bold',
        fontSize: 22,
        lineHeight: 22,
    },
});

export default ProfileScreen; 