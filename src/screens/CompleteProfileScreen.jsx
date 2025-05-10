import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import DropDownPicker from 'react-native-dropdown-picker';
import env from '../config';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

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

// Eliminar arrays mock
// const REGIONS = [...];
// const CITIES = [...];
// const COMMUNES = [...];

const CompleteProfileScreen = () => {
    const navigation = useNavigation();
    const [form, setForm] = useState({
        phone: '',
        profession: '',
        experience: '',
        specialties: [],
        regionId: '',
        cityId: '',
        communeId: '',
        profilePicture: null,
    });
    const [loading, setLoading] = useState(false);

    // Estado para DropDownPicker
    const [regionOpen, setRegionOpen] = useState(false);
    const [cityOpen, setCityOpen] = useState(false);
    const [communeOpen, setCommuneOpen] = useState(false);
    const [regionItems, setRegionItems] = useState([]);
    const [cityItems, setCityItems] = useState([]);
    const [communeItems, setCommuneItems] = useState([]);
    // Guardar datos completos para dependencias
    const [allCities, setAllCities] = useState([]);
    const [allCommunes, setAllCommunes] = useState([]);

    // Cargar regiones al montar
    React.useEffect(() => {
        const fetchRegions = async () => {
            try {
                const { API_URL } = env();
                const res = await fetch(`${API_URL}/locations/regions`);
                const data = await res.json();
                setRegionItems(data.map(r => ({ label: r.name, value: r.id })));
            } catch (e) {
                Alert.alert('Error', 'No se pudieron cargar las regiones');
            }
        };
        fetchRegions();
    }, []);

    // Cargar ciudades cuando cambia la región
    React.useEffect(() => {
        if (!form.regionId) {
            setCityItems([]);
            setCommuneItems([]);
            setAllCities([]);
            return;
        }
        const fetchCities = async () => {
            try {
                const { API_URL } = env();
                const res = await fetch(`${API_URL}/locations/cities?regionId=${form.regionId}`);
                const data = await res.json();
                setAllCities(data);
                setCityItems(data.map(c => ({ label: c.name, value: c.id })));
            } catch (e) {
                Alert.alert('Error', 'No se pudieron cargar las ciudades');
            }
        };
        fetchCities();
        setForm(f => ({ ...f, cityId: '', communeId: '' }));
    }, [form.regionId]);

    // Cargar comunas cuando cambia la ciudad
    React.useEffect(() => {
        if (!form.cityId) {
            setCommuneItems([]);
            setAllCommunes([]);
            return;
        }
        const fetchCommunes = async () => {
            try {
                const { API_URL } = env();
                const res = await fetch(`${API_URL}/locations/communes?cityId=${form.cityId}`);
                const data = await res.json();
                setAllCommunes(data);
                setCommuneItems(data.map(c => ({ label: c.name, value: c.id })));
            } catch (e) {
                Alert.alert('Error', 'No se pudieron cargar las comunas');
            }
        };
        fetchCommunes();
        setForm(f => ({ ...f, communeId: '' }));
    }, [form.cityId]);

    const handleChange = (key, value) => {
        setForm({ ...form, [key]: value });
    };

    const handleSpecialty = (spec) => {
        setForm((prev) => {
            const exists = prev.specialties.includes(spec);
            return {
                ...prev,
                specialties: exists
                    ? prev.specialties.filter((s) => s !== spec)
                    : [...prev.specialties, spec],
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
            setForm({ ...form, profilePicture: result.assets[0] });
        }
    };

    const handleSave = async () => {
        if (!form.phone || !form.profession || !form.experience || !form.regionId || !form.cityId || !form.communeId) {
            Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
            return;
        }

        if (form.specialties.length === 0) {
            Alert.alert('Error', 'Por favor selecciona al menos una especialidad');
            return;
        }

        if (!form.profilePicture) {
            Alert.alert('Error', 'Por favor selecciona una foto de perfil');
            return;
        }

        setLoading(true);
        try {
            const { API_URL } = env();
            const formData = new FormData();

            // Agregar la imagen
            const imageUri = form.profilePicture.uri;
            const imageName = imageUri.split('/').pop();
            const match = /\.(\w+)$/.exec(imageName);
            const imageType = match ? `image/${match[1]}` : 'image/jpeg';

            formData.append('profilePicture', {
                uri: imageUri,
                name: imageName,
                type: imageType
            });

            // Agregar el resto de los datos
            formData.append('phone', form.phone);
            formData.append('profession', form.profession);
            formData.append('experience', form.experience);
            formData.append('specialties', JSON.stringify(form.specialties));
            formData.append('regionId', form.regionId);
            formData.append('cityId', form.cityId);
            formData.append('communeId', form.communeId);

            const response = await fetch(`${API_URL}/profile/professional`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al guardar el perfil');
            }

            Alert.alert(
                'Éxito',
                'Perfil completado exitosamente',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.replace('Home')
                    }
                ]
            );
        } catch (error) {
            Alert.alert('Error', error.message || 'Error al guardar el perfil');
        } finally {
            setLoading(false);
        }
    };

    // Manejo de selección de comuna para actualizar ciudad y región
    const handleCommuneChange = (communeId) => {
        handleChange('communeId', communeId);
        const selectedCommune = allCommunes.find(commune => commune.id === communeId);
        if (selectedCommune) {
            const selectedCity = allCities.find(city => city.id === selectedCommune.cityId);
            if (selectedCity) {
                if (form.cityId !== selectedCity.id) {
                    handleChange('cityId', selectedCity.id);
                }
                // Para región, puedes usar regionId de la ciudad
                if (selectedCity.regionId && form.regionId !== selectedCity.regionId) {
                    handleChange('regionId', selectedCity.regionId);
                }
            }
        }
    };

    return (
        <KeyboardAwareScrollView contentContainerStyle={styles.container}>
            <View style={styles.card}>
                <View style={styles.headerRow}>
                    <Image source={require('../../assets/icon.png')} style={styles.icon} />
                    <Text style={styles.title}>Completa tu Perfil</Text>
                </View>
                <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                    {form.profilePicture ? (
                        <Image source={{ uri: form.profilePicture.uri }} style={styles.profileImage} />
                    ) : (
                        <Text style={styles.photoText}>+ Foto de Perfil</Text>
                    )}
                </TouchableOpacity>
                <Text style={styles.label}>Teléfono</Text>
                <TextInput
                    style={styles.input}
                    value={form.phone}
                    onChangeText={v => handleChange('phone', v)}
                    keyboardType="phone-pad"
                    editable={!loading}
                />
                <Text style={styles.label}>Profesión</Text>
                <TextInput
                    style={styles.input}
                    value={form.profession}
                    onChangeText={v => handleChange('profession', v)}
                    editable={!loading}
                />
                <Text style={styles.label}>Años de experiencia</Text>
                <TextInput
                    style={styles.input}
                    value={form.experience}
                    onChangeText={v => handleChange('experience', v)}
                    keyboardType="numeric"
                    editable={!loading}
                />
                {/* Región DropDownPicker */}
                <Text style={styles.label}>Región</Text>
                <DropDownPicker
                    open={regionOpen}
                    value={form.regionId}
                    items={regionItems}
                    setOpen={setRegionOpen}
                    setValue={callback => {
                        const value = callback(form.regionId);
                        handleChange('regionId', value);
                    }}
                    setItems={setRegionItems}
                    placeholder="Selecciona una Región"
                    disabled={loading}
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownContainer}
                    zIndex={3000}
                />
                {/* Ciudad DropDownPicker */}
                <Text style={styles.label}>Ciudad</Text>
                <DropDownPicker
                    open={cityOpen}
                    value={form.cityId}
                    items={cityItems}
                    setOpen={setCityOpen}
                    setValue={callback => {
                        const value = callback(form.cityId);
                        handleChange('cityId', value);
                    }}
                    setItems={setCityItems}
                    placeholder="Selecciona una Ciudad"
                    disabled={loading || !form.regionId}
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownContainer}
                    zIndex={2000}
                />
                {/* Comuna DropDownPicker */}
                <Text style={styles.label}>Comuna</Text>
                <DropDownPicker
                    open={communeOpen}
                    value={form.communeId}
                    items={communeItems}
                    setOpen={setCommuneOpen}
                    setValue={callback => {
                        const value = callback(form.communeId);
                        handleCommuneChange(value);
                    }}
                    setItems={setCommuneItems}
                    placeholder="Selecciona una Comuna"
                    disabled={loading || !form.cityId}
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownContainer}
                    zIndex={1000}
                />
                <Text style={styles.label}>Especialidades</Text>
                <View style={styles.specialtiesContainer}>
                    {SPECIALTIES.map((spec) => (
                        <TouchableOpacity
                            key={spec}
                            style={[
                                styles.checkbox,
                                form.specialties.includes(spec) && styles.checkboxSelected
                            ]}
                            onPress={() => handleSpecialty(spec)}
                            disabled={loading}
                        >
                            <Text style={styles.checkboxLabel}>{spec}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <TouchableOpacity
                    style={[styles.saveButton, loading && styles.buttonDisabled]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.saveButtonText}>Guardar Perfil</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAwareScrollView>
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
    dropdown: {
        borderColor: '#FFA500',
        marginBottom: 10,
    },
    dropdownContainer: {
        borderColor: '#FFA500',
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
    saveButton: {
        backgroundColor: '#FFA500',
        borderRadius: 5,
        paddingVertical: 12,
        paddingHorizontal: 30,
        marginTop: 20,
        alignItems: 'center',
        width: '80%',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default CompleteProfileScreen; 