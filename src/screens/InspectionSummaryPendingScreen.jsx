import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import env from '../config';

const InspectionSummaryPendingScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { inspectionId, inspection: initialInspection } = route.params;
    const [inspection, setInspection] = useState(initialInspection);
    const [loading, setLoading] = useState(!initialInspection);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchInspection = async () => {
            if (!initialInspection) {
                try {
                    setLoading(true);
                    setError(null);
                    const { API_URL } = env();
                    console.log('Fetching inspection with ID:', inspectionId);
                    console.log('API URL:', `${API_URL}/inspections/${inspectionId}`);

                    const response = await fetch(`${API_URL}/inspections/${inspectionId}`, {
                        credentials: 'include',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    });

                    console.log('Response status:', response.status);
                    const data = await response.json();
                    console.log('Response data:', data);

                    if (!response.ok) {
                        throw new Error(data.error || 'No se pudo obtener la inspección');
                    }

                    if (!data.inspection) {
                        throw new Error('No se encontraron datos de la inspección');
                    }

                    setInspection(data.inspection);
                } catch (error) {
                    console.error('Error fetching inspection:', error);
                    setError(error.message);
                    Alert.alert(
                        'Error',
                        'No se pudo cargar la información de la inspección. Por favor, intente nuevamente.'
                    );
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchInspection();
    }, [inspectionId, initialInspection]);

    const handleStartInspection = () => {
        console.log('Navegando a InspectionReport con datos:', {
            inspectionId: inspection.id,
            inspection: inspection
        });
        navigation.navigate('InspectionReport', {
            inspectionId: inspection.id,
            inspection: inspection,
            property: inspection.property,
            commune: inspection.commune,
            city: inspection.city,
            region: inspection.region
        });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFA500" />
                <Text style={styles.loadingText}>Cargando información...</Text>
            </View>
        );
    }

    if (error || !inspection) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                    {error || 'No se encontró la inspección'}
                </Text>
                <TouchableOpacity
                    style={[styles.button, { marginTop: 20 }]}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.buttonText}>Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.card}>
                {/* Header usuario e inspección */}
                <View style={styles.headerRow}>
                    <View style={styles.avatar} />
                    <View style={{ marginLeft: 10 }}>
                        <Text style={styles.headerTitle}>Inspección Pendiente</Text>
                        <Text style={styles.headerSubtitle}>{inspection.property?.address || 'Sin dirección'}</Text>
                    </View>
                </View>

                <View style={styles.infoBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Image
                            source={{
                                uri: inspection.property?.photos?.[0]?.url ||
                                    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'
                            }}
                            style={styles.image}
                        />
                        <View style={{ marginLeft: 10 }}>
                            <Text style={styles.label}>
                                <Text style={styles.bold}>Dirección:</Text> {inspection.property?.address}
                            </Text>
                            <Text style={styles.label}>
                                <Text style={styles.bold}>Comuna:</Text> {inspection.commune?.name}
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

                <View style={styles.descriptionBox}>
                    <Text style={styles.descriptionTitle}>Detalles de la Propiedad</Text>
                    <Text style={styles.descriptionText}>
                        {inspection.property?.bedrooms} Dormitorios - {inspection.property?.bathrooms} Baños
                    </Text>
                    <Text style={styles.descriptionText}>
                        Área: {inspection.property?.innerArea || '-'}m²
                    </Text>
                </View>

                <TouchableOpacity style={styles.button} onPress={handleStartInspection}>
                    <Text style={styles.buttonText}>Comenzar Inspección</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => navigation.goBack()}>
                    <Text style={styles.buttonText}>Volver</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFA500',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFA500',
    },
    errorText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
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
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#ccc',
    },
    headerTitle: {
        fontWeight: 'bold',
        fontSize: 18,
        marginBottom: 2,
    },
    headerSubtitle: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#333',
    },
    infoBox: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#FFA500',
        borderRadius: 8,
        padding: 15,
        marginBottom: 20,
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
        fontSize: 14,
        marginBottom: 4,
    },
    bold: {
        fontWeight: 'bold',
    },
    descriptionBox: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#FFA500',
        borderRadius: 8,
        padding: 15,
        marginBottom: 20,
        backgroundColor: '#fff',
    },
    descriptionTitle: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 10,
    },
    descriptionText: {
        fontSize: 14,
        lineHeight: 20,
        color: '#666',
    },
    button: {
        backgroundColor: '#FFA500',
        borderRadius: 5,
        paddingVertical: 12,
        paddingHorizontal: 30,
        marginTop: 10,
        alignItems: 'center',
        width: '80%',
    },
    secondaryButton: {
        backgroundColor: '#666',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 20,
    },
});

export default InspectionSummaryPendingScreen; 