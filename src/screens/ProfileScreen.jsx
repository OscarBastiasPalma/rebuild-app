import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DropDownPicker from 'react-native-dropdown-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import env from '../config';

const STORAGE_KEY = 'userProfileData';

const ProfileScreen = () => {
    const [profile, setProfile] = useState(null);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({});
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();

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
    useEffect(() => {
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
    useEffect(() => {
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
    }, [form.regionId]);

    // Cargar comunas cuando cambia la ciudad
    useEffect(() => {
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
    }, [form.cityId]);

    // Cargar datos del usuario desde el backend
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { API_URL } = env();
                const res = await fetch(`${API_URL}/profile/professional`, { credentials: 'include' });
                const data = await res.json();
                setProfile(data);
                setForm(data);
            } catch (err) {
                Alert.alert('Error', 'No se pudo cargar el perfil.');
            }
        };
        fetchProfile();
    }, []);

    const handleEdit = () => {
        setEditing(true);
    };

    const handleChange = (key, value) => {
        setForm({ ...form, [key]: value });
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const { API_URL } = env();

            const dataToSend = {
                phone: form.phone,
                profession: form.profession,
                regionId: form.regionId,
                cityId: form.cityId,
                communeId: form.communeId
            };

            if (form.user?.email) {
                dataToSend.user = { email: form.user.email };
            }

            console.log('Enviando datos:', dataToSend);

            const res = await fetch(`${API_URL}/profile/professional`, {
                method: 'PATCH',
                body: JSON.stringify(dataToSend),
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            const responseData = await res.json();
            console.log('Respuesta del servidor:', responseData);

            if (!res.ok) {
                throw new Error(responseData.error || 'Error al actualizar el perfil');
            }

            setProfile({ ...profile, ...responseData });
            setEditing(false);
            Alert.alert('Éxito', 'Perfil actualizado correctamente.');
        } catch (err) {
            console.error('Error al guardar perfil:', err);
            Alert.alert(
                'Error',
                err.message || 'No se pudo guardar el perfil. Por favor, intenta nuevamente.'
            );
        } finally {
            setLoading(false);
        }
    };

    if (!profile) return <Text style={{ marginTop: 50, textAlign: 'center' }}>Cargando perfil...</Text>;

    return (
        <KeyboardAwareScrollView contentContainerStyle={styles.container}>
            <View style={styles.card}>
                <TouchableOpacity style={styles.backCircle} onPress={() => navigation.goBack()}>
                    <Text style={styles.backCircleText}>←</Text>
                </TouchableOpacity>

                {editing ? (
                    <View style={styles.avatarContainer}>
                        {(form.profilePicture?.uri || profile?.profilePicture) ? (
                            <Image
                                source={{ uri: form.profilePicture?.uri || profile?.profilePicture }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={styles.avatar}>
                                <Text style={styles.avatarPlaceholder}>+</Text>
                            </View>
                        )}
                    </View>
                ) : (
                    profile?.profilePicture ? (
                        <Image
                            source={{ uri: profile.profilePicture }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={styles.avatar}>
                            <Text style={styles.avatarPlaceholder}>👤</Text>
                        </View>
                    )
                )}
                <Text style={styles.name}>{profile.user?.name || 'Usuario'}</Text>
                <Text style={styles.profession}>{profile.profession || ''}</Text>
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
                            <TextInput style={styles.input} value={form.user?.email} onChangeText={v => handleChange('user', { ...form.user, email: v })} />
                            <Text style={styles.label}>Teléfono:</Text>
                            <TextInput style={styles.input} value={form.phone} onChangeText={v => handleChange('phone', v)} />

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
                                style={styles.dropdown}
                                dropDownContainerStyle={styles.dropdownContainer}
                                zIndex={3000}
                            />

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
                                disabled={!form.regionId}
                                style={styles.dropdown}
                                dropDownContainerStyle={styles.dropdownContainer}
                                zIndex={2000}
                            />

                            <Text style={styles.label}>Comuna</Text>
                            <DropDownPicker
                                open={communeOpen}
                                value={form.communeId}
                                items={communeItems}
                                setOpen={setCommuneOpen}
                                setValue={callback => {
                                    const value = callback(form.communeId);
                                    handleChange('communeId', value);
                                }}
                                setItems={setCommuneItems}
                                placeholder="Selecciona una Comuna"
                                disabled={!form.cityId}
                                style={styles.dropdown}
                                dropDownContainerStyle={styles.dropdownContainer}
                                zIndex={1000}
                            />

                            <Text style={styles.label}>Profesión:</Text>
                            <TextInput style={styles.input} value={form.profession} onChangeText={v => handleChange('profession', v)} />

                            <TouchableOpacity
                                style={[styles.saveButton, loading && styles.buttonDisabled]}
                                onPress={handleSave}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Guardar</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={styles.item}><Text style={styles.label}>Correo:</Text> {profile.user?.email}</Text>
                            <Text style={styles.item}><Text style={styles.label}>Teléfono:</Text> {profile.phone}</Text>
                            <Text style={styles.item}><Text style={styles.label}>Región:</Text> {regionItems.find(r => r.value === profile.regionId)?.label || profile.regionId}</Text>
                            <Text style={styles.item}><Text style={styles.label}>Ciudad:</Text> {cityItems.find(c => c.value === profile.cityId)?.label || profile.cityId}</Text>
                            <Text style={styles.item}><Text style={styles.label}>Comuna:</Text> {communeItems.find(c => c.value === profile.communeId)?.label || profile.communeId}</Text>
                            <Text style={styles.item}><Text style={styles.label}>Profesión:</Text> {profile.profession}</Text>
                        </>
                    )}
                </View>
                <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.replace('Login')}>
                    <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
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
    avatarContainer: {
        position: 'relative',
        marginBottom: 10,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFA500',
    },
    avatarPlaceholder: {
        fontSize: 40,
        color: '#666',
    },
    avatarEditOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 5,
        borderBottomLeftRadius: 50,
        borderBottomRightRadius: 50,
    },
    avatarEditText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 12,
    },
    buttonDisabled: {
        opacity: 0.7,
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