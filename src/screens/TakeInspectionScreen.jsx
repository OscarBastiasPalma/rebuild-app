import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import inspectionTemplates from '../../assets/inspectionTemplates.json';
import { useRoute, useNavigation } from '@react-navigation/native';

const TakeInspectionScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { inspectionId } = route.params;
    const inspection = inspectionTemplates.find(i => i.id === inspectionId);

    if (!inspection) return <Text style={{ margin: 40 }}>Inspección no encontrada</Text>;

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.card}>
                <TouchableOpacity style={styles.backCircle} onPress={() => navigation.goBack()}>
                    <Text style={styles.backCircleText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{inspection.titulo}</Text>
                <Image source={{ uri: inspection.imagen }} style={styles.image} />
                <View style={styles.infoBox}>
                    <Text style={styles.label}><Text style={styles.bold}>Proyecto:</Text> {inspection.proyecto}</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Dirección</Text>  {inspection.direccion}</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Fecha de visita</Text></Text>
                    <Text style={styles.bold}>{inspection.fechaVisita}</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Región:</Text> {inspection.region}</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Ciudad:</Text> {inspection.ciudad}</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Comuna:</Text> {inspection.comuna}</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Status:</Text> {inspection.status}</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Tipo:</Text> {inspection.tipo}</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Dormitorios:</Text> {inspection.dormitorios}</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Baños:</Text> {inspection.banos}</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Superficie (m²):</Text> {inspection.superficie}</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Sup. Terraza (m²):</Text> {inspection.terraza}</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Inmobiliaria:</Text> {inspection.inmobiliaria}</Text>
                    <Text style={styles.label}><Text style={styles.bold}>Comentarios:</Text></Text>
                    <Text style={styles.comments}>{inspection.comentarios}</Text>
                </View>
                <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('InspectionReport', { inspectionId: inspection.id })}>
                    <Text style={styles.buttonText}>Tomar Inspección</Text>
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
});

export default TakeInspectionScreen; 