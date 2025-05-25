import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Switch, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import env from '../config';

const InspectionReportScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { inspectionId, inspection, property, commune, city, region } = route.params;

    const [items, setItems] = useState([]);
    const [partidas, setPartidas] = useState([]);
    const [loadingPartidas, setLoadingPartidas] = useState(true);
    const [current, setCurrent] = useState({
        foto: '',
        partida: '',
        descripcion: '',
        cantidad: 0,
        precioUnitario: false,
    });
    const [modalVisible, setModalVisible] = useState(false);
    const [partidaModalVisible, setPartidaModalVisible] = useState(false);

    useEffect(() => {
        fetchPartidas();
    }, []);

    const fetchPartidas = async () => {
        try {
            setLoadingPartidas(true);
            const { API_URL } = env();
            const url = `${API_URL}/apus`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data && data.apus && Array.isArray(data.apus)) {
                setPartidas(data.apus);
            } else {
                Alert.alert('Error', 'No se pudieron cargar las partidas');
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudieron cargar las partidas');
        } finally {
            setLoadingPartidas(false);
        }
    };

    const pickImage = async () => {
        Alert.alert(
            'Agregar fotografía',
            '¿Qué deseas hacer?',
            [
                {
                    text: 'Tomar foto',
                    onPress: async () => {
                        const { status } = await ImagePicker.requestCameraPermissionsAsync();
                        if (status !== 'granted') {
                            Alert.alert('Permiso denegado', 'Se requiere permiso para acceder a la cámara.');
                            return;
                        }
                        let result = await ImagePicker.launchCameraAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            allowsEditing: true,
                            aspect: [4, 3],
                            quality: 0.5,
                        });
                        if (!result.canceled && result.assets && result.assets.length > 0) {
                            setCurrent({ ...current, foto: result.assets[0].uri });
                        }
                    },
                },
                {
                    text: 'Galería',
                    onPress: async () => {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') {
                            Alert.alert('Permiso denegado', 'Se requiere permiso para acceder a la galería.');
                            return;
                        }
                        let result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            allowsEditing: true,
                            aspect: [4, 3],
                            quality: 0.5,
                        });
                        if (!result.canceled && result.assets && result.assets.length > 0) {
                            setCurrent({ ...current, foto: result.assets[0].uri });
                        }
                    },
                },
                { text: 'Cancelar', style: 'cancel' },
            ]
        );
    };

    const handleCantidad = (delta) => {
        setCurrent((prev) => ({
            ...prev,
            cantidad: Math.max(0.01, parseFloat((prev.cantidad + delta).toFixed(2)))
        }));
    };

    const handleCantidadChange = (value) => {
        // Si el valor está vacío, establecer a 0
        if (value === '') {
            setCurrent(prev => ({ ...prev, cantidad: 0 }));
            return;
        }

        // Permitir un punto decimal al inicio
        if (value === '.') {
            setCurrent(prev => ({ ...prev, cantidad: 0 }));
            return;
        }

        // Remover cualquier carácter que no sea número o punto decimal
        const cleanValue = value.replace(/[^0-9.]/g, '');

        // Asegurar que solo haya un punto decimal
        const parts = cleanValue.split('.');
        const formattedValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleanValue;

        // Si el valor termina en punto, mantenerlo para permitir decimales
        if (value.endsWith('.')) {
            setCurrent(prev => ({ ...prev, cantidad: formattedValue }));
            return;
        }

        // Convertir a número y validar
        const numValue = parseFloat(formattedValue);
        if (!isNaN(numValue)) {
            setCurrent(prev => ({
                ...prev,
                cantidad: numValue
            }));
        }
    };

    const handleAddItem = () => {
        if (!current.partida || !current.descripcion) {
            Alert.alert('Completa todos los campos obligatorios');
            return;
        }
        setItems([...items, current]);
        setCurrent({ foto: '', partida: '', descripcion: '', cantidad: 0, precioUnitario: false });
    };

    const handleFinish = () => {
        if (!current.partida && items.length === 0) {
            Alert.alert('Agrega al menos un ítem');
            return;
        }
        setModalVisible(true);
    };

    const confirmFinish = () => {
        setModalVisible(false);
        navigation.replace('InspectionSummary', { inspectionId, items });
        setItems([]);
        setCurrent({ foto: '', partida: '', descripcion: '', cantidad: 0, precioUnitario: false });
    };

    if (!inspection) return <Text style={{ margin: 40 }}>Inspección no encontrada</Text>;

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.card}>
                {/* Header usuario e inspección */}
                <View style={styles.headerRow}>
                    <View style={styles.avatar} />
                    <View style={{ marginLeft: 10 }}>
                        <Text style={styles.headerTitle}>Informe de Inspección</Text>
                        <Text style={styles.headerSubtitle}>{property?.address || 'Sin dirección'}</Text>
                    </View>
                </View>
                <View style={styles.infoBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Image
                            source={{
                                uri: property?.photos?.[0]?.url ||
                                    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'
                            }}
                            style={styles.image}
                        />
                        <View style={{ marginLeft: 10 }}>
                            <Text style={styles.label}>
                                <Text style={styles.bold}>Dirección:</Text> {property?.address}
                            </Text>
                            <Text style={styles.label}>
                                <Text style={styles.bold}>Comuna:</Text> {commune?.name}
                            </Text>
                            <Text style={styles.label}>
                                <Text style={styles.bold}>Ciudad:</Text> {city?.name}
                            </Text>
                            <Text style={styles.label}>
                                <Text style={styles.bold}>Región:</Text> {region?.name}
                            </Text>
                            <Text style={styles.label}>
                                <Text style={styles.bold}>Fecha programada:</Text>
                            </Text>
                            <Text style={styles.bold}>
                                {new Date(inspection.visitDate).toLocaleDateString()} -
                                {new Date(inspection.visitDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    </View>
                </View>
                {/* Lista de ítems agregados */}
                {items.map((item, idx) => (
                    <View key={idx} style={styles.itemBox}>
                        <Text style={styles.itemTitle}>Item {idx + 1}</Text>
                        {item.foto ? <Image source={{ uri: item.foto }} style={styles.itemPhoto} /> : null}
                        <Text style={styles.label}><Text style={styles.bold}>Partida:</Text> {item.partida}</Text>
                        <Text style={styles.label}><Text style={styles.bold}>Descripción:</Text> {item.descripcion}</Text>
                        <Text style={styles.label}><Text style={styles.bold}>Cantidad:</Text> {item.cantidad}</Text>
                    </View>
                ))}
                {/* Formulario para nuevo ítem */}
                <View style={styles.itemBox}>
                    <Text style={styles.itemTitle}>Item {items.length + 1}</Text>
                    <TouchableOpacity style={styles.photoPicker} onPress={pickImage}>
                        {current.foto ? (
                            <Image source={{ uri: current.foto }} style={styles.itemPhoto} />
                        ) : (
                            <Text style={styles.photoPickerText}>Agregar fotografía</Text>
                        )}
                    </TouchableOpacity>
                    <View style={styles.row}>
                        <TouchableOpacity
                            style={styles.pickerContainer}
                            onPress={() => setPartidaModalVisible(true)}
                            disabled={loadingPartidas}
                        >
                            {loadingPartidas ? (
                                <ActivityIndicator size="small" color="#FFA500" />
                            ) : (
                                <Text style={styles.pickerText}>
                                    {current.partida || "Selecciona una partida"}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.label}>Descripción de la observación</Text>
                    <TextInput
                        style={styles.textarea}
                        value={current.descripcion}
                        onChangeText={v => setCurrent({ ...current, descripcion: v })}
                        multiline
                        numberOfLines={3}
                    />
                    <View style={styles.row}>
                        <Text style={styles.label}>Cantidad</Text>
                        <View style={styles.qtyContainer}>
                            <TextInput
                                style={styles.qtyInput}
                                value={typeof current.cantidad === 'number' ? current.cantidad.toString() : current.cantidad}
                                keyboardType="decimal-pad"
                                onChangeText={handleCantidadChange}
                                placeholder="0.00"
                            />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
                        <Text style={styles.addButtonText}>+ Nuevo Ítem</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.button} onPress={handleFinish}>
                    <Text style={styles.buttonText}>Cerrar Inspección</Text>
                </TouchableOpacity>
            </View>
            {/* Modal de confirmación */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>¿Estás seguro de que la información es correcta?</Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalButton} onPress={confirmFinish}>
                                <Text style={styles.modalButtonText}>Sí, guardar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#ccc' }]} onPress={() => setModalVisible(false)}>
                                <Text style={[styles.modalButtonText, { color: '#333' }]}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            {/* Modal para selección de partida */}
            <Modal
                visible={partidaModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setPartidaModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setPartidaModalVisible(false)}
                >
                    <View style={styles.partidaModalContent}>
                        <View style={styles.partidaModalHeader}>
                            <Text style={styles.partidaModalTitle}>Selecciona una partida</Text>
                            <TouchableOpacity onPress={() => setPartidaModalVisible(false)}>
                                <Text style={styles.partidaModalClose}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        {loadingPartidas ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#FFA500" />
                            </View>
                        ) : (
                            <ScrollView style={styles.partidaList}>
                                {partidas && partidas.length > 0 ? (
                                    partidas.map((partida, index) => (
                                        <TouchableOpacity
                                            key={partida.id || index}
                                            style={styles.partidaOption}
                                            onPress={() => {
                                                setCurrent({ ...current, partida: partida.name });
                                                setPartidaModalVisible(false);
                                            }}
                                        >
                                            <Text style={styles.partidaOptionText}>{partida.name}</Text>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <Text style={styles.noPartidasText}>No hay partidas disponibles</Text>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </TouchableOpacity>
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
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#ccc',
    },
    headerTitle: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 2,
    },
    headerSubtitle: {
        fontWeight: 'bold',
        fontSize: 15,
        color: '#333',
    },
    infoBox: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#FFA500',
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
        backgroundColor: '#fff',
    },
    image: {
        width: 80,
        height: 60,
        borderRadius: 8,
        marginBottom: 10,
        alignSelf: 'center',
    },
    label: {
        fontSize: 13,
        marginBottom: 2,
    },
    bold: {
        fontWeight: 'bold',
    },
    itemBox: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#FFA500',
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
        backgroundColor: '#fff',
    },
    itemTitle: {
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 5,
    },
    itemPhoto: {
        width: 60,
        height: 45,
        borderRadius: 6,
        marginBottom: 5,
        alignSelf: 'center',
    },
    photoPicker: {
        borderWidth: 1,
        borderColor: '#FFA500',
        borderRadius: 5,
        padding: 8,
        marginBottom: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    photoPickerText: {
        color: '#FFA500',
        fontWeight: 'bold',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    input: {
        flex: 1,
        borderColor: '#FFA500',
        borderWidth: 1,
        borderRadius: 5,
        padding: 8,
        fontSize: 13,
        backgroundColor: '#fff',
        marginRight: 8,
    },
    textarea: {
        width: '100%',
        borderColor: '#FFA500',
        borderWidth: 1,
        borderRadius: 5,
        padding: 8,
        fontSize: 13,
        backgroundColor: '#fff',
        minHeight: 60,
        marginBottom: 8,
    },
    qtyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFA500',
        borderRadius: 5,
        backgroundColor: '#fff',
    },
    qtyInput: {
        width: 80,
        padding: 8,
        fontSize: 13,
        textAlign: 'center',
    },
    addButton: {
        backgroundColor: '#FFA500',
        borderRadius: 5,
        paddingVertical: 8,
        paddingHorizontal: 20,
        marginTop: 10,
        alignItems: 'center',
        width: '100%',
    },
    addButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },
    button: {
        backgroundColor: '#FFA500',
        borderRadius: 5,
        paddingVertical: 12,
        paddingHorizontal: 30,
        marginTop: 20,
        alignItems: 'center',
        width: '80%',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
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
        backgroundColor: '#FFA500',
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
        fontSize: 15,
    },
    pickerContainer: {
        flex: 1,
        borderColor: '#FFA500',
        borderWidth: 1,
        borderRadius: 5,
        backgroundColor: '#fff',
        marginRight: 8,
        padding: 10,
        height: 40,
        justifyContent: 'center',
    },
    pickerText: {
        fontSize: 13,
        color: '#333',
    },
    partidaModalContent: {
        backgroundColor: 'white',
        marginTop: 'auto',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    partidaModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    partidaModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    partidaModalClose: {
        fontSize: 20,
        color: '#666',
        padding: 5,
    },
    partidaList: {
        maxHeight: '80%',
    },
    partidaOption: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    partidaOptionText: {
        fontSize: 16,
        color: '#333',
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noPartidasText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
        marginTop: 20,
    },
});

export default InspectionReportScreen; 