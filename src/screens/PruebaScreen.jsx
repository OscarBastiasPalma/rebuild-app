// FirmaScreen.js
import React, { useRef, useState } from 'react';
import { View, Text, Button, StyleSheet, Image, Alert, ScrollView } from 'react-native';
import Signature from 'react-native-signature-canvas';
import * as FileSystem from 'expo-file-system';

export default function FirmaScreen() {
    const [firmaBase64, setFirmaBase64] = useState(null);
    const [rutaLocal, setRutaLocal] = useState(null);
    const firmaRef = useRef();

    const handleOK = async (signature) => {
        setFirmaBase64(signature);
        console.log('Firma base64 capturada.');
        // console.log('Base64 completo:', signature);
        console.log('Base64 sin prefijo:', signature.replace('data:image/png;base64,', ''));

        const path = FileSystem.documentDirectory + 'firma.png';
        const base64Data = signature.replace('data:image/png;base64,', '');

        try {
            await FileSystem.writeAsStringAsync(path, base64Data, {
                encoding: FileSystem.EncodingType.Base64,
            });
            setRutaLocal(path);
            console.log('Firma guardada localmente en:', path);
            Alert.alert('Guardado', 'Firma guardada en el dispositivo');
        } catch (error) {
            console.error('Error al guardar firma:', error);
            Alert.alert('Error', 'No se pudo guardar la firma');
        }
    };

    const handleClear = () => {
        firmaRef.current.clearSignature();
        setFirmaBase64(null);
        setRutaLocal(null);
    };

    const enviarFirma = () => {
        if (firmaRef.current) {
            firmaRef.current.readSignature(); // Forzar la captura de la firma dibujada
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.titulo}>Firma aquí:</Text>

            <View style={styles.signatureContainer}>
                <Signature
                    ref={firmaRef}
                    onOK={handleOK}
                    onEmpty={() => Alert.alert('Error', 'No se detectó firma')}
                    descriptionText="Firme dentro del recuadro"
                    clearText="Borrar"
                    confirmText="Guardar"
                    webStyle={styleWebview}
                />
            </View>

            {rutaLocal && (
                <View style={styles.imagenContainer}>
                    <Text style={styles.subtitulo}>Firma guardada:</Text>
                    <Image source={{ uri: rutaLocal }} style={styles.imagenFirma} />
                </View>
            )}

            <View style={styles.botones}>
                <Button title="Enviar Firma" onPress={enviarFirma} />
                <Button title="Borrar Firma" onPress={handleClear} color="#FF4444" />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#fff',
        flexGrow: 1,
        alignItems: 'center',
    },
    titulo: {
        fontSize: 20,
        marginBottom: 10,
    },
    signatureContainer: {
        width: '100%',
        height: 300,
        borderColor: '#000',
        borderWidth: 1,
        marginBottom: 20,
    },
    imagenContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    subtitulo: {
        fontSize: 16,
        marginBottom: 10,
    },
    imagenFirma: {
        width: 300,
        height: 120,
        borderColor: '#000',
        borderWidth: 1,
    },
    botones: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 20,
    },
});

const styleWebview = `
  .m-signature-pad--footer {
    display: none;
  }
`;
