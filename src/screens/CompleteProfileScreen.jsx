import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import mockUserData from '../../assets/mockUserData.json';

const STORAGE_KEY = 'userProfileData';

const SPECIALTIES = [
    'Obra Gruesa',
    'Instalaciones Sanitarias',
    'Instalaciones de Gas',
    'Restauraciones',
    'Terminaciones',
    'Instalaciones Eléctricas',
    'Pavimentos',
    'Carpintería interior',
];

const REGIONS = ['Metropolitana', 'Valparaíso', 'Biobío'];
const CITIES = ['Santiago', 'Valparaíso', 'Concepción'];
const COMMUNES = ['San Miguel', 'Providencia', 'Las Condes'];

const CompleteProfileScreen = () => {
    const navigation = useNavigation();
    const [form, setForm] = useState({
        telefono: '',
        profesion: '',
        experiencia: '',
        especialidades: [],
        region: '',
        ciudad: '',
        comuna: '',
        fotoPerfil: '',
        ...mockUserData,
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (key, value) => {
        setForm({ ...form, [key]: value });
    };

    const handleSpecialty = (spec) => {
        setForm((prev) => {
            const exists = prev.especialidades.includes(spec);
            return {
                ...prev,
                especialidades: exists
                    ? prev.especialidades.filter((s) => s !== spec)
                    : [...prev.especialidades, spec],
            };
        });
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permiso denegado', 'Se requiere permiso para acceder a la galería.');
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            setForm({ ...form, fotoPerfil: result.assets[0].uri });
        }
    };

    const handleSave = async () => {
        if (!form.telefono || !form.profesion || !form.experiencia || !form.region || !form.ciudad || !form.comuna) {
            Alert.alert('Completa todos los campos obligatorios');
            return;
        }
        setLoading(true);
        try {
            const updated = { ...form, firstLogin: false };
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            setLoading(false);
            navigation.replace('Home');
        } catch (err) {
            setLoading(false);
            Alert.alert('Error', 'No se pudo guardar el perfil.');
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.card}>
                <View style={styles.headerRow}>
                    <Image source={require('../../assets/icon.png')} style={styles.icon} />
                    <Text style={styles.title}>Completa tu Perfil</Text>
                </View>
                <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                    {form.fotoPerfil ? (
                        <Image source={{ uri: form.fotoPerfil }} style={styles.profileImage} />
                    ) : (
                        <Text style={styles.photoText}>+ Foto de Perfil</Text>
                    )}
                </TouchableOpacity>
                <Text style={styles.label}>Teléfono</Text>
                <TextInput style={styles.input} value={form.telefono} onChangeText={v => handleChange('telefono', v)} keyboardType="phone-pad" />
                <Text style={styles.label}>Profesión</Text>
                <TextInput style={styles.input} value={form.profesion} onChangeText={v => handleChange('profesion', v)} />
                <Text style={styles.label}>Años de experiencia</Text>
                <TextInput style={styles.input} value={form.experiencia} onChangeText={v => handleChange('experiencia', v)} keyboardType="numeric" />
                <Text style={styles.label}>Especialidades</Text>
                <View style={styles.specialtiesContainer}>
                    {SPECIALTIES.map((spec) => (
                        <TouchableOpacity
                            key={spec}
                            style={[styles.checkbox, form.especialidades.includes(spec) && styles.checkboxSelected]}
                            onPress={() => handleSpecialty(spec)}
                        >
                            <Text style={styles.checkboxLabel}>{spec}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={styles.label}>Región</Text>
                <View style={styles.pickerContainer}>
                    <TextInput
                        style={styles.input}
                        value={form.region}
                        placeholder="Selecciona una Región"
                        onFocus={() => { }}
                        onChangeText={v => handleChange('region', v)}
                    />
                </View>
                <Text style={styles.label}>Ciudad</Text>
                <View style={styles.pickerContainer}>
                    <TextInput
                        style={styles.input}
                        value={form.ciudad}
                        placeholder="Selecciona una Ciudad"
                        onFocus={() => { }}
                        onChangeText={v => handleChange('ciudad', v)}
                    />
                </View>
                <Text style={styles.label}>Comuna</Text>
                <View style={styles.pickerContainer}>
                    <TextInput
                        style={styles.input}
                        value={form.comuna}
                        placeholder="Selecciona una Comuna"
                        onFocus={() => { }}
                        onChangeText={v => handleChange('comuna', v)}
                    />
                </View>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
                    <Text style={styles.saveButtonText}>{loading ? 'Guardando...' : 'Guardar Perfil'}</Text>
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
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    icon: {
        width: 40,
        height: 40,
        marginRight: 10,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFA500',
    },
    photoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFA500',
        borderRadius: 5,
        padding: 8,
        marginBottom: 15,
        width: '80%',
        justifyContent: 'center',
        minHeight: 50,
    },
    photoText: {
        color: '#FFA500',
        fontWeight: 'bold',
    },
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    label: {
        alignSelf: 'flex-start',
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 2,
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
    specialtiesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 10,
        width: '100%',
    },
    checkbox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFA500',
        borderRadius: 5,
        padding: 6,
        margin: 3,
        backgroundColor: '#fff',
    },
    checkboxSelected: {
        backgroundColor: '#FFA50022',
        borderColor: '#FFA500',
    },
    checkboxLabel: {
        color: '#FFA500',
        fontWeight: 'bold',
        marginLeft: 4,
    },
    pickerContainer: {
        width: '100%',
        marginBottom: 8,
    },
    saveButton: {
        backgroundColor: '#FFA500',
        borderRadius: 5,
        paddingVertical: 12,
        paddingHorizontal: 30,
        marginTop: 20,
        alignItems: 'center',
        width: '80%',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default CompleteProfileScreen; 