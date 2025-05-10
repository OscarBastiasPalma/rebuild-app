import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import { useRoute, useNavigation } from '@react-navigation/native';
import inspectionTemplates from '../../assets/inspectionTemplates.json';
import * as Print from 'expo-print';

const InspectionSummaryScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { inspectionId, items } = route.params;
    const inspection = inspectionTemplates.find(i => i.id === inspectionId);
    const [signature, setSignature] = useState(null);
    const signatureRef = useRef();

    const handleOK = (sig) => {
        setSignature(sig);
        console.log('Firma base64:', sig);
        Alert.alert('Firma guardada', 'La firma ha sido registrada.');
    };

    const handleClear = () => {
        signatureRef.current.clearSignature();
        setSignature(null);
    };

    const handleGeneratePDF = async () => {
        let signatureSrc = signature;
        if (signature) {
            // Elimina saltos de línea y espacios
            signatureSrc = signature.replace(/(\r\n|\n|\r)/gm, '').replace(/ /g, '');
            if (!signatureSrc.startsWith('data:image')) {
                signatureSrc = `data:image/png;base64,${signatureSrc}`;
            }
        }
        const html = `
            <html>
                <body>
                    <h2>Revisión Informe de Inspección</h2>
                    <p><b>${inspection.titulo}</b></p>
                    <p><b>Proyecto:</b> ${inspection.proyecto}</p>
                    <p><b>Dirección:</b> ${inspection.direccion}</p>
                    <p><b>Fecha de visita:</b> ${inspection.fechaVisita}</p>
                    <hr/>
                    ${items.map((item, idx) => `
                        <div>
                            <h4>Item ${idx + 1}</h4>
                            ${item.foto ? `<img src="${item.foto}" width="120" /><br/>` : ''}
                            <b>Partida:</b> ${item.partida}<br/>
                            <b>Descripción:</b> ${item.descripcion}<br/>
                            <b>Cantidad:</b> ${item.cantidad}<br/>
                            <b>Precio unitario:</b> ${item.precioUnitario ? 'Sí' : 'No'}<br/>
                        </div>
                        <hr/>
                    `).join('')}
                    <h3>Firma del propietario</h3>
                    ${signatureSrc ? `<img src="${signatureSrc}" width="300" height="120" />` : '<p>Sin firma</p>'}
                </body>
            </html>
        `;
        const { uri } = await Print.printToFileAsync({ html });
        console.log('PDF generado en:', uri);
        Alert.alert('PDF generado', `El PDF se guardó en:\n${uri}`);
    };

    if (!inspection) return <Text style={{ margin: 40 }}>Inspección no encontrada</Text>;

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.card}>
                {/* Header usuario e inspección */}
                <View style={styles.headerRow}>
                    <View style={styles.avatar} />
                    <View style={{ marginLeft: 10 }}>
                        <Text style={styles.headerTitle}>Revisión Informe de Inspección</Text>
                        <Text style={styles.headerSubtitle}>{inspection.titulo}</Text>
                    </View>
                </View>
                <View style={styles.infoBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Image source={{ uri: inspection.imagen }} style={styles.image} />
                        <View style={{ marginLeft: 10 }}>
                            <Text style={styles.label}><Text style={styles.bold}>Proyecto:</Text> {inspection.proyecto}</Text>
                            <Text style={styles.label}><Text style={styles.bold}>Dirección</Text>  {inspection.direccion}</Text>
                            <Text style={styles.label}><Text style={styles.bold}>Fecha de visita</Text></Text>
                            <Text style={styles.bold}>{inspection.fechaVisita}</Text>
                        </View>
                    </View>
                </View>
                {/* Lista de ítems agregados */}
                {items && items.map((item, idx) => (
                    <View key={idx} style={styles.itemBox}>
                        <Text style={styles.itemTitle}>Item {idx + 1}</Text>
                        {item.foto ? <Image source={{ uri: item.foto }} style={styles.itemPhoto} /> : null}
                        <Text style={styles.label}><Text style={styles.bold}>Partida:</Text> {item.partida}</Text>
                        <Text style={styles.label}><Text style={styles.bold}>Descripción:</Text> {item.descripcion}</Text>
                        <Text style={styles.label}><Text style={styles.bold}>Cantidad:</Text> {item.cantidad}</Text>
                        <Text style={styles.label}><Text style={styles.bold}>Precio unitario:</Text> {item.precioUnitario ? 'Sí' : 'No'}</Text>
                    </View>
                ))}
                {/* Recuadro de firma */}
                <Text style={styles.label}>Firma del propietario</Text>
                {signature ? (
                    <View style={styles.signatureBox}>
                        <Image source={{ uri: signature }} style={styles.signatureImage} />
                        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                            <Text style={styles.clearButtonText}>Borrar firma</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.signature}>
                        <SignatureCanvas
                            ref={signatureRef}
                            onOK={handleOK}
                            onEmpty={() => Alert.alert('Firma vacía', 'Por favor, firma en el recuadro.')}
                            descriptionText="Firma aquí"
                            clearText="Borrar"
                            confirmText="Guardar firma"
                            webStyle={`.m-signature-pad--footer {display: none; margin: 0px;}`}
                            autoClear={false}
                            imageType="image/png"
                            backgroundColor="#fff"
                            penColor="#FFA500"
                            dataURL={signature}
                            style={{ flex: 1, height: 120, width: Dimensions.get('window').width * 0.8 }}
                        />
                    </View>
                )}
                <TouchableOpacity style={styles.button} onPress={handleGeneratePDF}>
                    <Text style={styles.buttonText}>Generar PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
                    <Text style={styles.buttonText}>Cerrar Inspección</Text>
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
    signature: {
        width: 300,
        height: 120,
        borderWidth: 1,
        borderColor: '#FFA500',
        borderRadius: 8,
        backgroundColor: '#fff',
        marginBottom: 10,
    },
    signatureBox: {
        alignItems: 'center',
        marginBottom: 10,
    },
    signatureImage: {
        width: 300,
        height: 120,
        borderWidth: 1,
        borderColor: '#FFA500',
        borderRadius: 8,
        backgroundColor: '#fff',
    },
    clearButton: {
        marginTop: 8,
        backgroundColor: '#FFA500',
        borderRadius: 5,
        paddingVertical: 6,
        paddingHorizontal: 18,
    },
    clearButtonText: {
        color: '#fff',
        fontWeight: 'bold',
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

export default InspectionSummaryScreen; 