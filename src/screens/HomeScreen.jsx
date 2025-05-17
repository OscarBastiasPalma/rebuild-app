import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput, FlatList, Modal, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import env from '../config';
import { useFocusEffect } from '@react-navigation/native';

const comunas = ['Todas', 'San Miguel', 'La Florida'];

const HomeScreen = ({ navigation, route }) => {
    const [user, setUser] = useState(null);
    const [searchComuna, setSearchComuna] = useState('Todas');
    const [pendingInspections, setPendingInspections] = useState([]);
    const [availableInspections, setAvailableInspections] = useState([]);
    const [filteredInspections, setFilteredInspections] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [loadingUser, setLoadingUser] = useState(true);
    const [loadingInspections, setLoadingInspections] = useState(true);

    // Helper para obtener el nombre completo
    const getFullName = (user) => {
        if (!user) return '';
        if (user.fullName) return user.fullName;
        if (user.nombre && user.apellido) return `${user.nombre} ${user.apellido}`;
        if (user.name) return user.name;
        if (user.user && user.user.name) return user.user.name;
        return user.nombre || '';
    };

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { API_URL } = env();
                let url = `${API_URL}/profile/professional`;
                if (route && route.params && route.params.id) {
                    url += `?id=${route.params.id}`;
                }
                const res = await fetch(url, { credentials: 'include' });
                if (!res.ok) throw new Error('No se pudo obtener el perfil');
                const data = await res.json();
                console.log('Respuesta del endpoint:', data);
                setUser(data);
            } catch (e) {
                setUser(null);
            } finally {
                setLoadingUser(false);
            }
        };
        fetchUser();
    }, [route]);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;
            const fetchInspections = async () => {
                try {
                    const { API_URL } = env();
                    // Fetch pendientes
                    const resPend = await fetch(`${API_URL}/inspections?status=PENDIENTE`, { credentials: 'include' });
                    const dataPend = resPend.ok ? await resPend.json() : { inspections: [] };
                    if (isActive) setPendingInspections(dataPend.inspections || []);
                    // Fetch disponibles
                    const resDisp = await fetch(`${API_URL}/inspections?status=SOLICITADO`, { credentials: 'include' });
                    const dataDisp = resDisp.ok ? await resDisp.json() : { inspections: [] };
                    if (isActive) {
                        setAvailableInspections(dataDisp.inspections || []);
                        setFilteredInspections(dataDisp.inspections || []);
                    }
                } catch (e) {
                    if (isActive) {
                        setPendingInspections([]);
                        setAvailableInspections([]);
                        setFilteredInspections([]);
                    }
                } finally {
                    if (isActive) setLoadingInspections(false);
                }
            };
            setLoadingInspections(true);
            fetchInspections();
            return () => { isActive = false; };
        }, [])
    );

    useEffect(() => {
        if (searchComuna === 'Todas') {
            setFilteredInspections([...availableInspections]);
        } else {
            setFilteredInspections(
                availableInspections.filter((insp) => insp.commune.name === searchComuna)
            );
        }
    }, [searchComuna, availableInspections]);

    const handleLogout = async () => {
        await AsyncStorage.removeItem('userProfileData');
        setModalVisible(false);
        navigation.replace('Login');
    };

    // Helper para iniciales
    const getInitials = (name) => {
        if (!name) return '';
        const parts = name.trim().split(' ');
        if (parts.length === 1) return parts[0][0].toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    if (loadingUser) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFA500' }}>
                <ActivityIndicator size="large" color="#fff" />
            </View>
        );
    }

    const fullName = getFullName(user);
    console.log('URL de la imagen de perfil:', user?.profilePicture);

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.card}>
                {/* Botón de perfil (iniciales) en la esquina superior izquierda */}
                <TouchableOpacity style={styles.profileCircleLeft} onPress={() => navigation.navigate('Profile')}>
                    <Text style={styles.profileCircleText}>{getInitials(fullName)}</Text>
                </TouchableOpacity>
                {/* Botón de cerrar sesión en la esquina superior derecha */}
                <TouchableOpacity style={styles.logoutCircleRight} onPress={() => setModalVisible(true)}>
                    <Text style={styles.logoutCircleText}>✕</Text>
                </TouchableOpacity>
                {/* Header usuario */}
                <View style={styles.header}>
                    {user?.profilePicture ? (
                        <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
                    ) : (
                        <Image source={{ uri: 'https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg?t=st=1746854255~exp=1746857855~hmac=e5883b0482cfda0e123ef9760502ffe974bcf4f0657d844db49129093b88fbd7&w=1380' }} style={styles.avatar} />
                    )}
                    <Text style={styles.name}>{fullName || 'Usuario'}</Text>
                    <Text style={styles.profession}>{user?.profesion || ''}</Text>
                </View>

                {/* Inspecciones Pendientes */}
                <View style={styles.pendingBox}>
                    <Text style={styles.pendingTitle}>Inspecciones Pendientes</Text>
                    {pendingInspections.length === 0 ? (
                        <Text style={styles.noInspectionsText}>No hay inspecciones pendientes</Text>
                    ) : (
                        pendingInspections.map((insp, idx) => (
                            <View
                                key={idx}
                                style={styles.pendingItem}
                            >
                                <Text style={styles.pendingDate}>{new Date(insp.visitDate).toLocaleDateString()}</Text>
                                <Text style={styles.pendingTime}>
                                    {new Date(insp.visitDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hrs. - {insp.property?.address}
                                </Text>
                            </View>
                        ))
                    )}
                </View>

                {/* Botón buscar inspecciones disponibles */}
                <View style={{ alignItems: 'center', marginVertical: 10 }}>
                    <TouchableOpacity style={styles.searchButton}>
                        <Text style={styles.searchButtonText}>Buscar inspecciones disponibles</Text>
                    </TouchableOpacity>
                </View>

                {/* Filtro por comuna */}
                <View style={styles.filterRow}>
                    <Text style={styles.filterLabel}>Filtrar por comuna:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {comunas.map((com, idx) => (
                            <TouchableOpacity
                                key={com}
                                style={[styles.filterChip, searchComuna === com && styles.filterChipSelected]}
                                onPress={() => setSearchComuna(com)}
                            >
                                <Text style={searchComuna === com ? styles.filterChipTextSelected : styles.filterChipText}>{com}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Inspecciones disponibles */}
                {loadingInspections ? (
                    <ActivityIndicator size="large" color="#FFA500" style={{ marginTop: 20 }} />
                ) : filteredInspections.length === 0 ? (
                    <Text style={styles.noInspectionsText}>No hay inspecciones disponibles</Text>
                ) : (
                    <FlatList
                        data={filteredInspections}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => navigation.navigate('TakeInspection', { inspectionId: item.id })}
                            >
                                <View style={styles.availableCard}>
                                    <Image
                                        source={{
                                            uri: item.property?.photos?.[0]?.url || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'
                                        }}
                                        style={styles.availableImage}
                                    />
                                    <View style={styles.availableInfo}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={styles.availableType}>{item.property?.bedrooms}D + {item.property?.bathrooms}B</Text>
                                            <Text style={styles.availableComuna}>{item.commune?.name}</Text>
                                        </View>
                                        <Text style={styles.availableSize}>{item.property?.innerArea || '-'}m2</Text>
                                        <Text style={styles.availableAddress}>{item.property?.address}</Text>
                                        <Text style={styles.availableDate}>
                                            {new Date(item.visitDate).toLocaleDateString()}   {new Date(item.visitDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hrs
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}
                        style={{ width: '100%' }}
                        contentContainerStyle={{ alignItems: 'center' }}
                        scrollEnabled={false}
                    />
                )}
            </View>
            {/* Modal de confirmación de cierre de sesión */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>¿Estás seguro de que deseas cerrar sesión?</Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalButton} onPress={handleLogout}>
                                <Text style={styles.modalButtonText}>Sí, cerrar sesión</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#ccc' }]} onPress={() => setModalVisible(false)}>
                                <Text style={[styles.modalButtonText, { color: '#333' }]}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    header: {
        alignItems: 'center',
        marginBottom: 10,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#ccc',
        marginBottom: 10,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#ccc',
        marginBottom: 10,
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 5,
    },
    profession: {
        fontSize: 16,
        color: '#444',
        marginBottom: 10,
    },
    pendingBox: {
        backgroundColor: '#FFA500',
        borderRadius: 10,
        padding: 15,
        width: '100%',
        marginBottom: 15,
    },
    pendingTitle: {
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 8,
        fontSize: 16,
    },
    pendingItem: {
        backgroundColor: '#fff',
        borderRadius: 5,
        padding: 8,
        marginBottom: 8,
    },
    pendingDate: {
        color: '#FFA500',
        fontWeight: 'bold',
        fontSize: 13,
    },
    pendingTime: {
        color: '#333',
        fontSize: 13,
    },
    searchButton: {
        borderWidth: 1,
        borderColor: '#FFA500',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 20,
        marginBottom: 10,
        backgroundColor: '#fff',
    },
    searchButtonText: {
        color: '#FFA500',
        fontWeight: 'bold',
        fontSize: 15,
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        width: '100%',
    },
    filterLabel: {
        fontWeight: 'bold',
        marginRight: 10,
        color: '#FFA500',
    },
    filterChip: {
        borderWidth: 1,
        borderColor: '#FFA500',
        borderRadius: 15,
        paddingVertical: 4,
        paddingHorizontal: 12,
        marginRight: 8,
        backgroundColor: '#fff',
    },
    filterChipSelected: {
        backgroundColor: '#FFA500',
    },
    filterChipText: {
        color: '#FFA500',
        fontWeight: 'bold',
    },
    filterChipTextSelected: {
        color: '#fff',
        fontWeight: 'bold',
    },
    availableCard: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: '#FFA500',
        borderRadius: 10,
        padding: 10,
        marginBottom: 15,
        width: 320,
        backgroundColor: '#fff',
    },
    availableImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
        marginRight: 10,
    },
    availableInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    availableType: {
        fontWeight: 'bold',
        fontSize: 15,
        color: '#FFA500',
    },
    availableComuna: {
        color: '#333',
        fontWeight: 'normal',
        marginLeft: 10,
    },
    availableSize: {
        fontSize: 13,
        color: '#444',
    },
    availableAddress: {
        fontSize: 13,
        color: '#444',
    },
    availableDate: {
        fontSize: 13,
        color: '#888',
        marginTop: 2,
    },
    logoutButton: {
        backgroundColor: 'red',
        borderRadius: 5,
        paddingVertical: 8,
        paddingHorizontal: 20,
        marginTop: 10,
    },
    logoutButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },
    logoutCircleRight: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: 'red',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        zIndex: 20,
    },
    logoutCircleText: {
        color: 'red',
        fontWeight: 'bold',
        fontSize: 22,
        lineHeight: 22,
    },
    profileCircleLeft: {
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
    profileCircleText: {
        color: '#FFA500',
        fontWeight: 'bold',
        fontSize: 20,
        lineHeight: 22,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 25,
        alignItems: 'center',
        width: 300,
    },
    modalTitle: {
        fontWeight: 'bold',
        fontSize: 17,
        marginBottom: 20,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    modalButton: {
        backgroundColor: 'red',
        borderRadius: 5,
        paddingVertical: 10,
        paddingHorizontal: 15,
        marginHorizontal: 5,
        marginTop: 5,
        flex: 1,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 10
        ,
    },
    noInspectionsText: {
        color: '#666',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
    },
    availableInstructions: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
        marginTop: 4,
    },
});

export default HomeScreen;
