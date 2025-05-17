import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import env from '../config';

const TakeInspectionScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { inspectionId } = route.params;
    const [inspection, setInspection] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInspection = async () => {
            try {
                const { API_URL } = env();
                const res = await fetch(`${API_URL}/inspections?id=${inspectionId}`, { credentials: 'include' });
                const data = await res.json();
                if (data.inspections && data.inspections.length > 0) {
                    setInspection(data.inspections.find(i => i.id === inspectionId));
                } else {
                    setInspection(null);
                }
            } catch (e) {
                setInspection(null);
            } finally {
                setLoading(false);
            }
        };
        fetchInspection();
    }, [inspectionId]);

    const handleTakeInspection = async () => {
        try {
            const { API_URL } = env();
            const res = await fetch(`${API_URL}/inspections`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ id: inspection.id, status: 'PENDIENTE' })
            });
            if (!res.ok) {
                const errorText = await res.text();
                console.log('PATCH error:', errorText);
                throw new Error('No se pudo actualizar la inspección');
            }
            Alert.alert(
                'Éxito',
                'Inspección tomada con éxito.',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.navigate('Home')
                    }
                ]
            );
        } catch (e) {
            Alert.alert('Error', 'No se pudo tomar la inspección. Intenta nuevamente.');
        }
    };

    if (loading) return <ActivityIndicator style={{ margin: 40 }} size="large" color="#FFA500" />;
    if (!inspection) return <Text style={{ margin: 40 }}>Inspección no encontrada</Text>;

    const property = inspection.property || {};

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.card}>
                <TouchableOpacity style={styles.backCircle} onPress={() => navigation.goBack()}>
                    <Text style={styles.backCircleText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{property.estateProject || 'Inspección'}</Text>
                <Image source={{ uri: property.photos?.[0]?.url || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80' }} style={styles.image} />
                {/* Sección Propiedad */}
                <View style={styles.sectionBox}>
                    <Text style={styles.sectionTitle}>Propiedad</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Proyecto:</Text> {property.estateProject}</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Tipo:</Text> {property.propertyType?.name}</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Dormitorios:</Text> {property.bedrooms}</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Baños:</Text> {property.bathrooms}</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Superficie (m²):</Text> {property.innerArea}</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Sup. Terraza (m²):</Text> {property.terraceArea}</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Inmobiliaria:</Text> {property.estateCompany}</Text>
                </View>
                {/* Sección Ubicación */}
                <View style={styles.sectionBox}>
                    <Text style={styles.sectionTitle}>Ubicación</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Región:</Text> {inspection.region?.name}</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Ciudad:</Text> {inspection.city?.name}</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Comuna:</Text> {inspection.commune?.name}</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Dirección:</Text> {property.address}</Text>

                </View>
                {/* Sección Detalles */}
                <View style={styles.sectionBox}>
                    <Text style={styles.sectionTitle}>Detalles de la Inspección</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Fecha de visita:</Text> {new Date(inspection.visitDate).toLocaleDateString()} {new Date(inspection.visitDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hrs</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Status:</Text> {inspection.status}</Text>
                </View>
                {/* Sección Comentarios */}
                <View style={styles.commentBox}>
                    <Text style={styles.sectionTitle}>Comentarios</Text>
                    <Text style={styles.comments}>{inspection.instructions || 'Sin comentarios'}</Text>
                </View>
                {inspection.status === 'SOLICITADO' && (
                    <TouchableOpacity style={styles.button} onPress={handleTakeInspection}>
                        <Text style={styles.buttonText}>Tomar Inspección</Text>
                    </TouchableOpacity>
                )}
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
    title: {
        fontWeight: 'bold',
        fontSize: 18,
        marginBottom: 10,
        textAlign: 'center',
    },
    image: {
        width: 120,
        height: 80,
        borderRadius: 8,
        marginBottom: 10,
        alignSelf: 'center',
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
    label: {
        fontSize: 14,
        marginBottom: 2,
    },
    bold: {
        fontWeight: 'bold',
    },
    comments: {
        fontSize: 13,
        marginTop: 4,
        color: '#333',
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
    sectionBox: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#FFA500',
        borderRadius: 8,
        padding: 15,
        marginBottom: 20,
        backgroundColor: '#fff',
    },
    sectionTitle: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 10,
    },
    commentBox: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#FFA500',
        borderRadius: 8,
        padding: 15,
        marginBottom: 20,
        backgroundColor: '#fff',
    },
});

export default TakeInspectionScreen; 