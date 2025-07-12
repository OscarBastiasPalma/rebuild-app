import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, Dimensions, ActivityIndicator } from 'react-native';
import Signature from 'react-native-signature-canvas';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import env from '../config';
import { useSession } from '../context/SessionContext';
import { getUFValue, calculateTotalWithUF, formatTotalWithUF } from '../services/ufService';

const InspectionSummaryScreen = () => {
    // Todos los hooks primero - ANTES de cualquier return early
    const route = useRoute();
    const navigation = useNavigation();
    const { inspectionId, report, inspection } = route.params;
    const [firmaBase64, setFirmaBase64] = useState(null);
    const [rutaLocal, setRutaLocal] = useState(null);
    const signatureRef = useRef();
    const { session } = useSession();
    const [isSigning, setIsSigning] = useState(false);
    const [isLoadingInspectionData, setIsLoadingInspectionData] = useState(false);
    const [isFinalizingInspection, setIsFinalizingInspection] = useState(false);
    // Estado para los datos completos de la inspección
    const [fullInspection, setFullInspection] = useState(inspection);
    // Estado para el valor de la UF
    const [ufData, setUfData] = useState(null);
    const [isLoadingUF, setIsLoadingUF] = useState(false);

    // Función para cargar los datos completos de la inspección incluyendo propietario
    const loadFullInspectionData = async () => {
        try {
            setIsLoadingInspectionData(true);

            // Validaciones previas
            if (!inspectionId) {
                console.error('Error: No se proporcionó inspectionId');
                Alert.alert('Error', 'ID de inspección no válido');
                return;
            }

            if (!session || !session.token) {
                console.error('Error: No hay sesión activa o token');
                Alert.alert('Error', 'Sesión no válida. Por favor inicia sesión nuevamente');
                return;
            }

            const { API_URL } = env();
            if (!API_URL) {
                console.error('Error: API_URL no configurada');
                Alert.alert('Error', 'Error de configuración de la aplicación');
                return;
            }

            const endpoint = `${API_URL}/inspections/${inspectionId}`;
            console.log('Cargando datos completos de inspección desde:', endpoint);
            console.log('🔐 DEBUGGING AUTORIZACIÓN:');
            console.log('- Usuario actual:', session?.user?.name || 'No disponible');
            console.log('- Tipo de usuario:', session?.user?.userType || 'No disponible');
            console.log('- ID de usuario:', session?.user?.id || 'No disponible');
            console.log('- Inspector de la inspección:', inspection?.inspector?.user?.name || 'No disponible');
            console.log('- ID del inspector:', inspection?.inspectorId || 'No disponible');
            console.log('- Propietario de la propiedad:', inspection?.property?.owner?.user?.name || 'No disponible');
            console.log('- ID del propietario:', inspection?.property?.ownerId || 'No disponible');

            // NUEVA VALIDACIÓN: Obtener el perfil profesional del usuario logueado
            console.log('🔍 OBTENIENDO PERFIL PROFESIONAL DEL USUARIO LOGUEADO...');
            const currentUserProfile = await getCurrentUserProfile();

            const currentUserId = session?.user?.id;
            const currentUserName = session?.user?.name;
            const currentUserType = session?.user?.userType;
            const currentProfileId = currentUserProfile?.id; // ID del perfil profesional
            const inspectorId = inspection?.inspectorId; // ID del perfil profesional del inspector
            const inspectorName = inspection?.inspector?.user?.name;
            const ownerId = inspection?.property?.ownerId;

            console.log('🔍 VALIDACIÓN DE PERMISOS MEJORADA:');
            console.log('- Current User ID:', currentUserId);
            console.log('- Current User Name:', currentUserName);
            console.log('- Current User Type:', currentUserType);
            console.log('- Current Profile ID (profesional):', currentProfileId);
            console.log('- Inspector Profile ID:', inspectorId);
            console.log('- Inspector Name:', inspectorName);
            console.log('- Owner ID:', ownerId);
            console.log('- Es inspector por Profile ID?', currentProfileId === inspectorId);
            console.log('- Es inspector por User ID?', currentUserId === inspection?.inspector?.userId);
            console.log('- Es inspector por nombre?', currentUserName === inspectorName);
            console.log('- Es propietario?', currentUserId === ownerId);
            console.log('- Es PROFESSIONAL?', currentUserType === 'PROFESSIONAL');

            // Validación mejorada: usar el ID del perfil profesional
            const isInspectorByProfileId = currentProfileId === inspectorId;
            const isInspectorByUserId = currentUserId === inspection?.inspector?.userId;
            const isInspectorByName = currentUserName === inspectorName && currentUserType === 'PROFESSIONAL';
            const isOwner = currentUserId === ownerId;
            const hasPermission = isInspectorByProfileId || isInspectorByUserId || isInspectorByName || isOwner;

            console.log('🎯 RESULTADO DE VALIDACIÓN MEJORADA:');
            console.log('- Tiene permisos:', hasPermission);
            console.log('- Motivo:',
                isInspectorByProfileId ? 'Inspector por Profile ID (CORRECTO)' :
                    isInspectorByUserId ? 'Inspector por User ID' :
                        isInspectorByName ? 'Inspector por nombre' :
                            isOwner ? 'Propietario' : 'Sin permisos');

            // Si no tiene permisos, mostrar mensaje de error detallado
            if (!hasPermission && currentUserId && (inspectorId || ownerId)) {
                console.log('❌ Usuario sin permisos confirmado');

                const debugInfo = `
INFORMACIÓN DE DEBUG:
- Usuario logueado: ${currentUserName} (ID: ${currentUserId})
- Perfil profesional ID: ${currentProfileId}
- Inspector asignado: ${inspectorName} (Profile ID: ${inspectorId})
- Propietario ID: ${ownerId}

VALIDACIONES:
- Es inspector por Profile ID: ${isInspectorByProfileId}
- Es inspector por User ID: ${isInspectorByUserId}
- Es inspector por nombre: ${isInspectorByName}
- Es propietario: ${isOwner}
                `;

                console.log(debugInfo);

                Alert.alert(
                    'Sin Permisos',
                    `No tienes permisos para ver esta inspección.\n\nUsuario actual: ${currentUserName}\nInspector asignado: ${inspectorName}\n\nSolo el inspector asignado o el propietario pueden verla.`,
                    [
                        {
                            text: 'Ver Debug Info',
                            onPress: () => console.log(debugInfo)
                        },
                        {
                            text: 'Volver',
                            onPress: () => navigation.goBack()
                        }
                    ]
                );
                return;
            }

            // Si es inspector pero con diferente tipo de ID, mostrar advertencia
            if ((isInspectorByName || isInspectorByUserId) && !isInspectorByProfileId) {
                console.log('⚠️ ADVERTENCIA: Inspector detectado pero no por Profile ID');
                console.log('⚠️ Esto puede indicar un problema de datos en la base de datos');
            }

            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${session.token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10 segundos de timeout
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (!response.ok) {
                let errorMessage = 'Error al cargar los datos de la inspección';

                try {
                    const errorData = await response.json();
                    console.error('Error en la respuesta:', errorData);
                    errorMessage = errorData.message || errorData.error || errorMessage;
                } catch (parseError) {
                    console.error('Error al parsear respuesta de error:', parseError);
                }

                // Manejo específico de errores de autorización
                if (response.status === 401) {
                    Alert.alert('Error', 'Sesión expirada. Por favor inicia sesión nuevamente');
                    // Aquí podrías limpiar la sesión y redirigir al login
                    return;
                } else if (response.status === 403) {
                    Alert.alert(
                        'Sin Permisos',
                        'No tienes permisos para ver esta inspección. Verifica que seas el inspector asignado o el propietario de la propiedad.',
                        [
                            {
                                text: 'Volver',
                                onPress: () => navigation.goBack()
                            }
                        ]
                    );
                    return;
                } else if (response.status === 404) {
                    Alert.alert('Error', 'Inspección no encontrada');
                } else if (response.status >= 500) {
                    Alert.alert('Error', 'Error del servidor. Por favor intenta nuevamente');
                } else {
                    Alert.alert('Error', errorMessage);
                }
                return;
            }

            const data = await response.json();

            if (!data || !data.inspection) {
                console.error('Error: Respuesta inválida del servidor');
                Alert.alert('Error', 'Datos de inspección inválidos');
                return;
            }

            console.log('Datos completos de la inspección cargados:', JSON.stringify(data.inspection, null, 2));
            console.log('Propietario encontrado:', data.inspection?.property?.owner?.user?.name);

            setFullInspection(data.inspection);

            // Cargar firma existente si está disponible
            if (data.inspection?.inspectionReport?.ownerSignature) {
                console.log('Cargando firma existente del propietario');
                setFirmaBase64(data.inspection.inspectionReport.ownerSignature);
            }

        } catch (error) {
            console.error('Error al cargar los datos de la inspección:', error);

            // Manejo específico de diferentes tipos de errores
            if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
                Alert.alert('Error', 'Error de conexión. Verifica tu conexión a internet');
            } else if (error.name === 'AbortError') {
                Alert.alert('Error', 'La solicitud tardó demasiado. Por favor intenta nuevamente');
            } else {
                Alert.alert('Error', 'Error inesperado al cargar los datos. Por favor intenta nuevamente');
            }
        } finally {
            setIsLoadingInspectionData(false);
        }
    };

    // useEffect también debe estar con los hooks
    useEffect(() => {
        loadFullInspectionData();
        loadUFValue(); // Cargar valor de UF al montar el componente
    }, []);

    // Función para obtener el perfil profesional del usuario logueado
    const getCurrentUserProfile = async () => {
        try {
            if (!session || !session.token) {
                console.log('❌ No hay sesión para obtener perfil');
                return null;
            }

            const { API_URL } = env();
            const profileResponse = await fetch(`${API_URL}/profile/professional`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${session.token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📋 Response status para perfil:', profileResponse.status);

            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                console.log('✅ Perfil profesional obtenido:', JSON.stringify(profileData, null, 2));
                return profileData;
            } else {
                const errorData = await profileResponse.json();
                console.log('❌ Error al obtener perfil:', errorData);
                return null;
            }
        } catch (error) {
            console.error('❌ Error al obtener perfil profesional:', error);
            return null;
        }
    };

    // Función para cargar el valor de la UF
    const loadUFValue = async () => {
        try {
            setIsLoadingUF(true);
            console.log('🔄 Cargando valor de UF...');

            const ufResult = await getUFValue();
            setUfData(ufResult);

            if (ufResult.success) {
                console.log('✅ Valor de UF cargado exitosamente:', ufResult);
            } else {
                console.warn('⚠️ No se pudo obtener el valor de UF:', ufResult.error);
            }
        } catch (error) {
            console.error('❌ Error al cargar valor de UF:', error);
            setUfData({
                success: false,
                valor: 0,
                fechaFormateada: new Date().toLocaleDateString('es-CL'),
                error: error.message
            });
        } finally {
            setIsLoadingUF(false);
        }
    };

    console.log('Datos recibidos:', { inspectionId, report, inspection });

    // DESPUÉS de todos los hooks, podemos hacer los returns early
    // Verificar si tenemos los datos necesarios
    if (!inspection || !report) {
        console.log('Faltan datos:', { inspection, report });
        return (
            <View style={styles.container}>
                <Text style={{ color: 'white', fontSize: 16 }}>Cargando datos de la inspección...</Text>
            </View>
        );
    }

    // Mostrar loading cuando se están cargando datos adicionales
    if (isLoadingInspectionData) {
        return (
            <View style={styles.container}>
                <Text style={{ color: 'white', fontSize: 16, marginBottom: 10 }}>Cargando datos completos...</Text>
                <ActivityIndicator size="large" color="white" />
            </View>
        );
    }

    // Utility function to format signature
    const formatSignature = (sig) => {
        if (!sig) return null;
        let signatureSrc = sig;
        // Remove line breaks and spaces
        signatureSrc = signatureSrc.replace(/(\r\n|\n|\r)/gm, '').replace(/ /g, '');
        // Add data URI prefix if missing
        if (!signatureSrc.startsWith('data:image')) {
            signatureSrc = `data:image/png;base64,${signatureSrc}`;
        }
        return signatureSrc;
    };

    const handleOK = async (signature) => {
        setFirmaBase64(signature);
        // console.log('Base64 completo:', signature);
        console.log('Base64 sin prefijo:', signature.replace('data:image/png;base64,', ''));
        console.log('Firma base64 capturada.');

        const path = FileSystem.documentDirectory + 'firma.png';
        const base64Data = signature.replace('data:image/png;base64,', '');

        try {
            await FileSystem.writeAsStringAsync(path, base64Data, {
                encoding: FileSystem.EncodingType.Base64,
            });
            setRutaLocal(path);
            console.log('Firma guardada localmente en:', path);
            Alert.alert('Guardado', 'Firma capturada correctamente');
        } catch (error) {
            console.error('Error al guardar firma:', error);
            Alert.alert('Error', 'No se pudo guardar la firma localmente');
        }
    };

    const handleClear = () => {
        signatureRef.current.clearSignature();
        setFirmaBase64(null);
        setRutaLocal(null);
    };

    const enviarFirma = () => {
        if (signatureRef.current) {
            signatureRef.current.readSignature(); // Forzar la captura de la firma dibujada
        }
    };

    // Función para obtener las URLs de Cloudinary actualizadas
    const getUpdatedInspectionReport = async () => {
        try {
            const { API_URL } = env();
            const response = await fetch(`${API_URL}/inspections/${inspectionId}`, {
                headers: {
                    'Authorization': `Bearer ${session.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('🔄 Datos actualizados del reporte obtenidos');

                // Actualizar los items con las URLs de Cloudinary del backend
                if (data.inspection?.inspectionReport?.items) {
                    data.inspection.inspectionReport.items.forEach((backendItem, index) => {
                        if (report.items[index] && backendItem.photo) {
                            report.items[index].cloudinaryUrl = backendItem.photo;
                            console.log(`🔄 URL actualizada para item ${index}:`, backendItem.photo);
                        }
                    });
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error al obtener datos actualizados:', error);
            return false;
        }
    };

    const handleGeneratePDF = async () => {
        console.log('firmaBase64:', firmaBase64);
        if (!firmaBase64 || typeof firmaBase64 !== 'string' || !firmaBase64.startsWith('data:image')) {
            Alert.alert('Error', 'Debes firmar antes de generar el PDF');
            return;
        }

        // Intentar obtener URLs actualizadas si algún item no tiene cloudinaryUrl
        const needsUpdate = report.items.some(item => !item.cloudinaryUrl && item.foto);
        if (needsUpdate) {
            console.log('🔄 Algunos items no tienen URL de Cloudinary, intentando obtener datos actualizados...');
            await getUpdatedInspectionReport();
        }

        const signatureSrc = formatSignature(firmaBase64);

        // Usar los datos completos de la inspección para obtener el propietario
        const inspectionData = fullInspection || inspection;

        // Obtener información del propietario y fecha actual
        let ownerName = 'Propietario';

        // Buscar el nombre del propietario en la cadena de relaciones
        if (inspectionData?.property?.owner?.user?.name) {
            ownerName = inspectionData.property.owner.user.name;
            console.log('✅ Nombre del propietario encontrado:', ownerName);
        } else {
            console.log('❌ No se encontró el nombre del propietario');
            console.log('🔍 Estructura disponible:');
            console.log('- inspectionData:', !!inspectionData);
            console.log('- property:', !!inspectionData?.property);
            console.log('- owner:', !!inspectionData?.property?.owner);
            console.log('- user:', !!inspectionData?.property?.owner?.user);
            console.log('- name:', inspectionData?.property?.owner?.user?.name);
        }

        const signatureDate = new Date().toLocaleString('es-CL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        // DEBUGGING: Revisar qué URLs de imágenes están disponibles
        console.log('🖼️ === DEBUGGING IMÁGENES PARA PDF ===');
        report.items.forEach((item, idx) => {
            console.log(`Item ${idx}:`, {
                hasCloudinaryUrl: !!item.cloudinaryUrl,
                cloudinaryUrl: item.cloudinaryUrl,
                hasFoto: !!item.foto,
                foto: item.foto,
                fotoStartsWithHttp: item.foto?.startsWith('http'),
                fotoStartsWithFile: item.foto?.startsWith('file://'),
                fotoStartsWithData: item.foto?.startsWith('data:image')
            });
        });

        // Calcular totales generales
        const totalUF = report.items.reduce((sum, item) => sum + (item.apuTotal || 0), 0);
        const totalCLP = ufData && ufData.success ? calculateTotalWithUF(totalUF, ufData.valor) : 0;

        // Función para renderizar imagen de item
        const renderItemImage = (item, idx) => {
            if (item.cloudinaryUrl) {
                if (process.env.DEBUG) {
                    console.log(`📷 PDF: Usando Cloudinary URL para item ${idx}:`, item.cloudinaryUrl);
                }
                return `<img src="${item.cloudinaryUrl}" class="item-image" alt="Imagen del item ${idx + 1}" />`;
            } else if (item.foto && item.foto.startsWith('http')) {
                if (process.env.DEBUG) {
                    console.log(`📷 PDF: Usando URL HTTP para item ${idx}:`, item.foto);
                }
                return `<img src="${item.foto}" class="item-image" alt="Imagen del item ${idx + 1}" />`;
            } else if (item.foto && item.foto.startsWith('data:image')) {
                if (process.env.DEBUG) {
                    console.log(`📷 PDF: Usando base64 para item ${idx}`);
                }
                return `<img src="${item.foto}" class="item-image" alt="Imagen del item ${idx + 1}" />`;
            } else {
                if (process.env.DEBUG) {
                    console.log(`❌ PDF: No hay imagen válida para item ${idx}`);
                }
                return `<div class="no-image">Sin imagen disponible</div>`;
            }
        };

        const html = `
            <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        @page {
                            margin: 20px;
                            size: A4 portrait;
                            @bottom-center {
                                content: "Página " counter(page) " de " counter(pages);
                                font-size: 10px;
                                color: #666;
                            }
                        }
                        
                        body { 
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                            margin: 0; 
                            padding: 0;
                            line-height: 1.6;
                            color: #333;
                            background-color: #fff;
                        }
                        
                        /* PÁGINA 1 - Header e información general */
                        .page-1 {
                            page-break-inside: avoid;
                        }
                        
                        .header {
                            background: linear-gradient(135deg, #FFA500, #FF8C00);
                            color: white;
                            padding: 30px;
                            text-align: center;
                            border-radius: 8px;
                            margin-bottom: 40px;
                            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                        }
                        
                        .header h1 {
                            margin: 0;
                            font-size: 32px;
                            font-weight: 700;
                            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                            margin-bottom: 15px;
                        }
                        
                        .header .subtitle {
                            font-size: 18px;
                            font-weight: 300;
                            opacity: 0.9;
                        }
                        
                        .report-info {
                            background-color: #f8f9fa;
                            border-left: 4px solid #FFA500;
                            padding: 25px;
                            margin-bottom: 30px;
                            border-radius: 0 8px 8px 0;
                        }
                        
                        .report-info h2 {
                            color: #FFA500;
                            margin-top: 0;
                            margin-bottom: 20px;
                            font-size: 24px;
                            font-weight: 600;
                        }
                        
                        .info-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 20px;
                            margin-bottom: 25px;
                        }
                        
                        .info-item {
                            background: white;
                            padding: 15px;
                            border-radius: 6px;
                            border: 1px solid #e0e0e0;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                        }
                        
                        .info-label {
                            font-weight: 600;
                            color: #666;
                            font-size: 14px;
                            margin-bottom: 6px;
                        }
                        
                        .info-value {
                            font-size: 16px;
                            color: #333;
                            font-weight: 500;
                            word-break: break-word;
                        }
                        
                        .uf-info {
                            background: linear-gradient(135deg, #e3f2fd, #bbdefb);
                            border: 1px solid #2196F3;
                            border-radius: 8px;
                            padding: 25px;
                            margin: 30px 0;
                            text-align: center;
                        }
                        
                        .uf-info h3 {
                            color: #1976D2;
                            margin-top: 0;
                            margin-bottom: 15px;
                            font-size: 20px;
                        }
                        
                        .uf-value {
                            font-size: 28px;
                            font-weight: 700;
                            color: #1976D2;
                            margin: 15px 0;
                        }
                        
                        .uf-date {
                            color: #666;
                            font-size: 16px;
                        }
                        
                        /* PÁGINAS DE ITEMS - Cada item en su propia página */
                        .item-page {
                            page-break-before: always;
                            page-break-inside: avoid;
                            display: flex;
                            flex-direction: column;
                            padding: 0;
                            margin: 0;
                            box-sizing: border-box;
                        }
                        
                        .item-page:not(:first-of-type) {
                            page-break-before: always;
                        }
                        
                        .item-page-header {
                            background-color: #FFA500;
                            color: white;
                            padding: 15px;
                            text-align: center;
                            border-radius: 8px;
                            margin-bottom: 20px;
                            font-size: 20px;
                            font-weight: 600;
                            flex-shrink: 0;
                        }
                        
                        .item-card {
                            background: white;
                            border: 1px solid #e0e0e0;
                            border-radius: 8px;
                            overflow: hidden;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                            flex: 1;
                            display: flex;
                            flex-direction: column;
                            page-break-inside: avoid;
                        }
                        
                        .item-header {
                            background: linear-gradient(135deg, #f5f5f5, #e8e8e8);
                            padding: 15px;
                            border-bottom: 1px solid #ddd;
                            flex-shrink: 0;
                        }
                        
                        .item-number {
                            font-size: 20px;
                            font-weight: 600;
                            color: #FFA500;
                            margin: 0;
                        }
                        
                        .item-body {
                            padding: 15px;
                            flex: 1;
                            display: flex;
                            flex-direction: column;
                            overflow: hidden;
                        }
                        
                        .item-content {
                            display: flex;
                            flex-direction: row;
                            gap: 20px;
                            height: 100%;
                        }
                        
                        .item-image-container {
                            flex: 0 0 300px;
                            display: flex;
                            align-items: flex-start;
                            justify-content: center;
                        }
                        
                        .item-image {
                            max-width: 300px;
                            max-height: 280px;
                            width: auto;
                            height: auto;
                            border-radius: 8px;
                            border: 1px solid #ddd;
                            object-fit: contain;
                            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                        }
                        
                        .item-details {
                            flex: 1;
                            background: #f8f9fa;
                            padding: 15px;
                            border-radius: 8px;
                            border: 1px solid #e0e0e0;
                            display: flex;
                            flex-direction: column;
                            justify-content: space-between;
                        }
                        
                        .detail-row {
                            display: flex;
                            flex-direction: column;
                            align-items: flex-start;
                            gap: 5px;
                            padding: 8px 0;
                            border-bottom: 1px solid #e0e0e0;
                        }
                        
                        .detail-row:nth-child(odd) {
                            background-color: #fcfcfc;
                        }
                        
                        .detail-row:last-child {
                            border-bottom: none;
                            font-weight: 600;
                            font-size: 16px;
                            color: #FFA500;
                            background: white;
                            padding: 12px;
                            border-radius: 6px;
                            margin-top: 10px;
                        }
                        
                        .detail-label {
                            font-weight: 600;
                            color: #666;
                            width: 100%;
                            font-size: 14px;
                            text-align: left;
                        }
                        
                        .detail-value {
                            color: #333;
                            text-align: left;
                            font-size: 14px;
                            width: 100%;
                            word-break: break-word;
                        }
                        
                        .no-image {
                            width: 300px;
                            height: 200px;
                            background: #f0f0f0;
                            border: 2px dashed #ccc;
                            border-radius: 8px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: #666;
                            font-style: italic;
                            font-size: 14px;
                        }
                        
                        /* PÁGINA FINAL - Resumen y firma */
                        .final-page {
                            page-break-before: always;
                            page-break-inside: avoid;
                            page-break-after: avoid;
                            min-height: auto;
                        }
                        
                        .summary-section {
                            background: linear-gradient(135deg, #fff3cd, #ffeaa7);
                            border: 1px solid #FFA500;
                            border-radius: 8px;
                            padding: 30px;
                            margin: 30px 0;
                            text-align: center;
                            page-break-inside: avoid;
                        }
                        
                        .summary-title {
                            font-size: 24px;
                            font-weight: 600;
                            color: #FFA500;
                            margin-bottom: 25px;
                        }
                        
                        .summary-totals {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 25px;
                            margin-top: 20px;
                        }
                        
                        .total-item {
                            background: white;
                            padding: 20px;
                            border-radius: 8px;
                            border: 1px solid #FFA500;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        
                        .total-label {
                            font-size: 16px;
                            color: #666;
                            margin-bottom: 8px;
                        }
                        
                        .total-value {
                            font-size: 28px;
                            font-weight: 700;
                            color: #FFA500;
                        }
                        
                        .signature-section {
                            background: white;
                            border: 2px solid #FFA500;
                            border-radius: 8px;
                            padding: 30px;
                            margin-top: 40px;
                            text-align: center;
                            page-break-inside: avoid;
                        }
                        
                        .signature-title {
                            font-size: 24px;
                            font-weight: 600;
                            color: #FFA500;
                            margin-bottom: 25px;
                        }
                        
                        .signature-image {
                            max-width: 500px;
                            max-height: 200px;
                            object-fit: contain;
                            border: 1px solid #ddd;
                            border-radius: 8px;
                            margin: 20px 0;
                            background: white;
                        }
                        
                        .signature-info {
                            margin-top: 25px;
                            padding: 20px;
                            background: #f8f9fa;
                            border-radius: 8px;
                        }
                        
                        .signature-name {
                            font-size: 20px;
                            font-weight: 600;
                            color: #333;
                            margin-bottom: 10px;
                        }
                        
                        .signature-date {
                            color: #666;
                            font-size: 16px;
                        }
                        
                        .footer {
                            margin-top: 50px;
                            text-align: center;
                            font-size: 12px;
                            color: #666;
                            border-top: 1px solid #ddd;
                            padding-top: 25px;
                            page-break-inside: avoid;
                            page-break-after: avoid;
                        }
                    </style>
                                </head>
                <body>
                    <!-- PÁGINA 1: Header e Información General -->
                    <main class="page-1">
                        <div class="header">
                            <h1>INFORME DE INSPECCIÓN TÉCNICA</h1>
                            <div class="subtitle">Reporte Profesional de Evaluación de Propiedad</div>
                        </div>
                        
                        <div class="report-info">
                            <h2>Información General</h2>
                            <div class="info-grid">
                                <div class="info-item">
                                    <div class="info-label">Dirección</div>
                                    <div class="info-value">${inspectionData.property?.address || 'No especificada'}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Comuna</div>
                                    <div class="info-value">${inspectionData.commune?.name || 'No especificada'}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Ciudad</div>
                                    <div class="info-value">${inspectionData.city?.name || 'No especificada'}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Región</div>
                                    <div class="info-value">${inspectionData.region?.name || 'No especificada'}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Fecha de Inspección</div>
                                    <div class="info-value">${new Date(inspectionData.visitDate).toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Inspector</div>
                                    <div class="info-value">${inspectionData.inspector?.user?.name || 'No especificado'}</div>
                                </div>
                            </div>
                        </div>

                        ${ufData && ufData.success ? `
                        <div class="uf-info">
                            <h3>Referencia Unidad de Fomento (UF)</h3>
                            <div class="uf-value">$${ufData.valor.toLocaleString('es-CL')}</div>
                            <div class="uf-date">Valor vigente al ${ufData.fechaFormateada}</div>
                        </div>
                        ` : ''}
                    </main>

                                        <!-- PÁGINAS DE ITEMS: Cada item en su propia página -->
                    ${report.items.map((item, idx) => {
            // Calcular total con UF
            const totalWithUF = ufData && ufData.success ?
                calculateTotalWithUF(item.apuTotal, ufData.valor) :
                item.apuTotal;

            return `
                            <article class="item-page">
                                <div class="item-page-header">
                                    DETALLE DE ITEM INSPECCIONADO
                                </div>
                                <div class="item-card">
                                    <div class="item-header">
                                        <h3 class="item-number">Item ${idx + 1}</h3>
                                    </div>
                                    <div class="item-body">
                                        <div class="item-content">
                                            <div class="item-image-container">
                                                ${renderItemImage(item, idx)}
                                            </div>
                                            <div class="item-details">
                                                <div class="detail-row">
                                                    <span class="detail-label">Partida:</span>
                                                    <span class="detail-value">${item.partida || 'No especificada'}</span>
                                                </div>
                                                <div class="detail-row">
                                                    <span class="detail-label">Descripción:</span>
                                                    <span class="detail-value">${item.descripcion || 'No especificada'}</span>
                                                </div>
                                                <div class="detail-row">
                                                    <span class="detail-label">Cantidad:</span>
                                                    <span class="detail-value">${item.cantidad || 0} ${item.unidadMedida ? `(${item.unidadMedida})` : ''}</span>
                                                </div>
                                                <div class="detail-row">
                                                    <span class="detail-label">Precio Unitario:</span>
                                                    <span class="detail-value">${(item.precioUnitario || 0).toLocaleString('es-CL')} UF</span>
                                                </div>
                                                <div class="detail-row">
                                                    <span class="detail-label">Subtotal UF:</span>
                                                    <span class="detail-value">${(item.apuTotal || 0).toLocaleString('es-CL')} UF</span>
                                                </div>
                                                ${ufData && ufData.success ? `
                                                <div class="detail-row">
                                                    <span class="detail-label">Subtotal CLP:</span>
                                                    <span class="detail-value">${formatTotalWithUF(totalWithUF)}</span>
                                                </div>
                                                ` : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        `;
        }).join('')}

                                        <!-- PÁGINA FINAL: Resumen y Firma -->
                    ${report.items.length > 0 ? `
                    <div class="final-page">
                        <div class="summary-section">
                            <div class="summary-title">RESUMEN FINANCIERO</div>
                            <div class="summary-totals">
                                <div class="total-item">
                                    <div class="total-label">Total General (UF)</div>
                                    <div class="total-value">${totalUF.toLocaleString('es-CL')} UF</div>
                                </div>
                                ${ufData && ufData.success ? `
                                <div class="total-item">
                                    <div class="total-label">Total General (CLP)</div>
                                    <div class="total-value">${formatTotalWithUF(totalCLP)}</div>
                                </div>
                                ` : ''}
                            </div>
                        </div>

                        <div class="signature-section">
                            <div class="signature-title">VALIDACIÓN Y FIRMA</div>
                            ${signatureSrc ? `
                                <img src="${signatureSrc}" class="signature-image" alt="Firma del propietario" />
                            ` : '<div style="color: #666; font-style: italic;">Sin firma disponible</div>'}
                            
                            <div class="signature-info">
                                <div class="signature-name">Firmado por: ${ownerName}</div>
                                <div class="signature-date">Fecha y hora: ${signatureDate}</div>
                            </div>
                        </div>

                        <footer class="footer">
                            <p>Este reporte fue generado automáticamente el ${new Date().toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}</p>
                            <p>Documento confidencial - Solo para uso autorizado</p>
                        </footer>
                    </div>
                    ` : ''}
                </body>
            </html>
        `;



        // ACA SUBO EL PDF A CLOUDINARY
        try {
            const { uri } = await Print.printToFileAsync({ html });
            console.log('📄 PDF generado en:', uri);
            console.log('📂 Ruta local del PDF:', uri);

            // Subir PDF a Cloudinary
            await uploadPDFToCloudinary(uri);

            // Verificar si podemos compartir
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Informe de Inspección',
                    UTI: 'com.adobe.pdf'
                });
            } else {
                Alert.alert('Error', 'No se puede compartir el PDF en este dispositivo');
            }
        } catch (error) {
            console.error('Error al generar PDF:', error);
            Alert.alert('Error', 'No se pudo generar el PDF');
        }
    };

    // Función para subir PDF a Cloudinary
    const uploadPDFToCloudinary = async (pdfUri) => {
        try {
            console.log('🚀 Iniciando subida de PDF a Cloudinary...');

            const { API_URL } = env();
            if (!API_URL) {
                console.error('❌ API_URL no configurada');
                return;
            }

            // Crear FormData directamente con el archivo
            const formData = new FormData();

            // En React Native, usamos la URI directamente
            formData.append('pdf', {
                uri: pdfUri,
                type: 'application/pdf',
                name: `inspection_${inspectionId}_report`
            });

            console.log('📤 Enviando PDF al servidor...', {
                uri: pdfUri,
                inspectionId: inspectionId,
                fileName: `inspection_${inspectionId}_report`
            });

            const response = await fetch(`${API_URL}/inspections/${inspectionId}/upload-pdf`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.token}`
                },
                body: formData
            });

            console.log('📡 Response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('✅ PDF subido exitosamente a Cloudinary:', result);

                // Mostrar información sobre las URLs disponibles
                if (result.alternativeUrls) {
                    console.log('🔗 URLs alternativas disponibles:', result.alternativeUrls);

                    // Mostrar un mensaje más informativo al usuario
                    Alert.alert(
                        'PDF Guardado Exitosamente',
                        `El PDF se ha guardado en la nube. ${result.accessInfo?.recommendation || ''}`,
                        [
                            {
                                text: 'Entendido',
                                style: 'default'
                            },
                            {
                                text: 'Ver PDF',
                                style: 'default',
                                onPress: () => {
                                    // Intentar abrir la URL de descarga si está disponible
                                    const urlToOpen = result.alternativeUrls?.download || result.pdfUrl;
                                    console.log('🔗 Abriendo URL:', urlToOpen);
                                    // Aquí podrías usar Linking.openURL(urlToOpen) si quieres abrir el PDF
                                }
                            }
                        ]
                    );
                } else {
                    Alert.alert('Éxito', 'PDF guardado en la nube exitosamente');
                }

                // Guardar información del PDF para uso posterior
                if (result.alternativeUrls) {
                    console.log('💾 Guardando URLs del PDF para uso posterior:', {
                        direct: result.pdfUrl,
                        download: result.alternativeUrls.download,
                        signed: result.alternativeUrls.signed,
                        expiresAt: result.accessInfo?.expiresAt
                    });
                    // Aquí podrías guardar estas URLs en el estado local si necesitas acceso posterior
                }

            } else {
                const errorData = await response.json();
                console.error('❌ Error al subir PDF:', errorData);

                // Mostrar mensaje de error más específico
                const errorMessage = errorData.suggestion
                    ? `${errorData.error}\n\nSugerencia: ${errorData.suggestion}`
                    : errorData.error || 'Error desconocido al subir PDF';

                Alert.alert(
                    'Problema al Guardar PDF',
                    `PDF generado localmente, pero no se pudo guardar en la nube.\n\n${errorMessage}`
                );
            }

        } catch (error) {
            console.error('❌ Error al subir PDF a Cloudinary:', error);

            // Mostrar mensaje de error más informativo
            Alert.alert(
                'Problema de Conexión',
                'PDF generado localmente, pero no se pudo conectar con el servicio de almacenamiento. Verifica tu conexión a internet e intenta nuevamente.'
            );
        }
    };

    const styleWebview = `
        .m-signature-pad--footer {
            display: none;
        }
    `;

    return (
        <ScrollView scrollEnabled={true} contentContainerStyle={styles.container}>
            <View style={styles.card}>
                {/* Header usuario e inspección */}
                <View style={styles.headerRow}>
                    <View style={styles.avatar} />
                    <View style={{ marginLeft: 10 }}>
                        <Text style={styles.headerTitle}>Revisión Informe de Inspección</Text>
                        <Text style={styles.headerSubtitle}>{inspection.property?.address}</Text>
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
                                <Text style={styles.bold}>Ciudad:</Text> {inspection.city?.name}
                            </Text>
                            <Text style={styles.label}>
                                <Text style={styles.bold}>Región:</Text> {inspection.region?.name}
                            </Text>
                            <Text style={styles.label}>
                                <Text style={styles.bold}>Fecha de visita:</Text>
                            </Text>
                            <Text style={styles.bold}>
                                {new Date(inspection.visitDate).toLocaleDateString()} -
                                {new Date(inspection.visitDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    </View>
                </View>
                {/* Información de UF */}
                <View style={styles.ufInfoBox}>
                    <Text style={styles.ufTitle}>Valor UF al día de hoy</Text>
                    {isLoadingUF ? (
                        <View style={styles.ufLoadingContainer}>
                            <ActivityIndicator size="small" color="#FFA500" />
                            <Text style={styles.ufLoadingText}>Cargando valor de UF...</Text>
                        </View>
                    ) : ufData ? (
                        <View style={styles.ufDataContainer}>
                            <Text style={styles.ufValue}>
                                ${ufData.success ? ufData.valor.toLocaleString('es-CL') : 'No disponible'}
                            </Text>
                            <Text style={styles.ufDate}>
                                {ufData.fechaFormateada}
                            </Text>
                            {!ufData.success && (
                                <Text style={styles.ufError}>
                                    Error: {ufData.error}
                                </Text>
                            )}
                        </View>
                    ) : (
                        <Text style={styles.ufError}>No se pudo cargar el valor de UF</Text>
                    )}
                </View>
                {/* Lista de ítems agregados */}
                {report.items && report.items.map((item, idx) => {
                    // Calcular total con UF si está disponible
                    const totalWithUF = ufData && ufData.success ?
                        calculateTotalWithUF(item.apuTotal, ufData.valor) :
                        item.apuTotal;

                    return (
                        <View key={idx} style={styles.itemBox}>
                            <Text style={styles.itemTitle}>Item {idx + 1}</Text>
                            {item.foto ? <Image source={{ uri: item.foto }} style={styles.itemPhoto} /> : null}
                            <Text style={styles.label}><Text style={styles.bold}>Partida:</Text> {item.partida}</Text>
                            <Text style={styles.label}><Text style={styles.bold}>Descripción:</Text> {item.descripcion}</Text>
                            <Text style={styles.label}><Text style={styles.bold}>Cantidad:</Text> {item.cantidad} {item.unidadMedida ? `(${item.unidadMedida})` : ''}</Text>
                            <Text style={styles.label}><Text style={styles.bold}>Precio Unitario:</Text> {item.precioUnitario?.toLocaleString() || 0} U.F</Text>
                            <Text style={styles.label}><Text style={styles.bold}>Total:</Text> {item.apuTotal?.toLocaleString() || 0} U.F</Text>
                            {ufData && ufData.success && (
                                <Text style={styles.label}>
                                    <Text style={styles.bold}>Total CLP:</Text> ${formatTotalWithUF(totalWithUF)}
                                </Text>
                            )}
                        </View>
                    );
                })}
                {/* Recuadro de firma */}
                <Text style={styles.label}>Firma del propietario</Text>

                <View style={styles.signatureContainer}>
                    <Signature
                        ref={signatureRef}
                        onOK={handleOK}
                        onEmpty={() => Alert.alert('Error', 'No se detectó firma')}
                        descriptionText="Firme dentro del recuadro"
                        clearText="Borrar"
                        confirmText="Guardar"
                        webStyle={styleWebview}
                        onBegin={() => setIsSigning(true)}
                        onEnd={() => setIsSigning(false)}
                    />
                </View>

                {/* Comentado: Vista previa de la firma
                {rutaLocal && (
                    <View style={styles.imagenContainer}>
                        <Text style={styles.subtitulo}>Firma guardada:</Text>
                        <Image source={{ uri: rutaLocal }} style={styles.imagenFirma} />
                    </View>
                )}
                */}

                <View style={styles.botonesCompactos}>
                    <TouchableOpacity style={styles.buttonCompacto} onPress={enviarFirma}>
                        <Text style={styles.buttonCompactoText}>Enviar Firma</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.buttonCompacto, styles.secondaryButtonCompacto]} onPress={handleClear}>
                        <Text style={styles.buttonCompactoText}>Borrar Firma</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.button, isFinalizingInspection && styles.buttonDisabled]}
                    disabled={isFinalizingInspection}
                    onPress={async () => {
                        try {
                            if (!firmaBase64) {
                                Alert.alert('Error', 'Debes firmar antes de finalizar');
                                return;
                            }

                            setIsFinalizingInspection(true);

                            // Primero creamos el reporte
                            console.log('Creando reporte de inspección...');

                            // Preparar FormData para enviar imágenes
                            const formData = new FormData();

                            // DEBUGGING: Validar datos recibidos
                            console.log('🔍 DEBUGGING - Datos del reporte recibidos:');
                            console.log('- inspectionId:', inspectionId);
                            console.log('- Total de items:', report.items?.length || 0);
                            console.log('- Items completos:', JSON.stringify(report.items, null, 2));

                            // DEBUGGING: Validar autenticación
                            console.log('🔐 DEBUGGING - Información de autenticación:');
                            console.log('- session completa:', session);
                            console.log('- token presente:', !!session?.token);
                            console.log('- token (primeros 50 chars):', session?.token?.substring(0, 50) + '...');
                            console.log('- usuario:', session?.user?.name || 'No disponible');

                            // DEBUGGING: Validar endpoint
                            const { API_URL: apiUrl } = env();
                            const endpoint = `${apiUrl}/inspections/${inspectionId}/report`;
                            console.log('🌐 DEBUGGING - Endpoint y headers:');
                            console.log('- API_URL:', apiUrl);
                            console.log('- Endpoint completo:', endpoint);
                            console.log('- Headers que se enviarán:', {
                                'Authorization': session?.token ? `Bearer ${session.token.substring(0, 20)}...` : 'NO TOKEN'
                            });

                            // Validar cada item específicamente
                            report.items?.forEach((item, index) => {
                                console.log(`🔍 Item ${index}:`, {
                                    hasPhoto: !!item.foto,
                                    photoValue: item.foto,
                                    photoLength: item.foto?.length || 0,
                                    description: item.descripcion,
                                    amount: item.cantidad,
                                    partida: item.partida
                                });
                            });

                            // Preparar los datos de los items
                            const itemsData = report.items.map(item => ({
                                photo: null, // Se asignará la URL después de subir
                                description: item.descripcion,
                                amount: item.cantidad,
                                apus: {
                                    name: item.partida
                                }
                            }));

                            formData.append('items', JSON.stringify(itemsData));
                            console.log('📋 Items data enviados:', itemsData);

                            // Agregar información de UF al FormData
                            if (ufData && ufData.success) {
                                const ufInfo = {
                                    valor: ufData.valor,
                                    fecha: ufData.fecha,
                                    fechaFormateada: ufData.fechaFormateada
                                };
                                formData.append('ufInfo', JSON.stringify(ufInfo));
                                console.log('📊 Información de UF enviada:', ufInfo);
                            } else {
                                console.log('⚠️ No se enviará información de UF (no disponible)');
                            }

                            // Agregar la imagen de la propiedad al FormData
                            const propertyImageUrl = inspection.property?.photos?.[0]?.url;
                            if (propertyImageUrl && propertyImageUrl.startsWith('http')) {
                                try {
                                    console.log('📷 Procesando imagen de la propiedad:', propertyImageUrl);
                                    const response = await fetch(propertyImageUrl);
                                    const blob = await response.blob();

                                    if (blob && blob.size > 0) {
                                        formData.append('property_image', blob, 'property_image.jpg');
                                        console.log(`✅ Imagen de propiedad agregada, tamaño: ${blob.size} bytes`);
                                    } else {
                                        console.log('❌ Blob vacío para imagen de propiedad');
                                    }
                                } catch (error) {
                                    console.error('❌ Error al procesar imagen de la propiedad:', error);
                                }
                            } else {
                                console.log('⚠️ No hay imagen de propiedad válida para subir');
                            }

                            // Agregar las imágenes de los items al FormData
                            console.log('🖼️ INICIANDO PROCESAMIENTO DE IMÁGENES DE ITEMS');
                            for (let i = 0; i < report.items.length; i++) {
                                const item = report.items[i];
                                console.log(`\n📸 === PROCESANDO ITEM ${i} ===`);
                                console.log(`Datos del item:`, {
                                    hasPhoto: !!item.foto,
                                    photoType: typeof item.foto,
                                    photoValue: item.foto,
                                    photoPreview: item.foto?.substring(0, 100) + '...',
                                    description: item.descripcion,
                                    cantidad: item.cantidad,
                                    partida: item.partida
                                });

                                if (item.foto) {
                                    console.log(`✅ Item ${i} tiene foto, procesando...`);
                                    try {
                                        // NUEVA LÓGICA: Usar el mismo método que CompleteProfileScreen
                                        if (item.foto.startsWith('file://')) {
                                            // Crear objeto de imagen como en CompleteProfileScreen
                                            const imageUri = item.foto;
                                            const imageName = imageUri.split('/').pop();
                                            const match = /\.(\w+)$/.exec(imageName);
                                            const imageType = match ? `image/${match[1]}` : 'image/jpeg';

                                            const imageObject = {
                                                uri: imageUri,
                                                name: imageName,
                                                type: imageType
                                            };

                                            formData.append(`image_${i}`, imageObject);
                                            console.log(`✅ Imagen agregada para item ${i}:`, {
                                                uri: imageUri,
                                                name: imageName,
                                                type: imageType
                                            });
                                        } else if (item.foto.startsWith('data:image')) {
                                            // Para base64, convertir a blob (esto debería funcionar)
                                            console.log(`Convirtiendo base64 para item ${i}`);
                                            const response = await fetch(item.foto);
                                            const blob = await response.blob();

                                            if (blob && blob.size > 0) {
                                                formData.append(`image_${i}`, blob, `item_${i}.jpg`);
                                                console.log(`✅ Imagen base64 agregada para item ${i}, tamaño: ${blob.size} bytes`);
                                            } else {
                                                console.log(`❌ Blob vacío para item ${i}`);
                                            }
                                        } else if (item.foto.startsWith('http')) {
                                            // Para URLs remotas, descargar y convertir a blob
                                            console.log(`Descargando imagen remota para item ${i}:`, item.foto);
                                            const response = await fetch(item.foto);
                                            const blob = await response.blob();

                                            if (blob && blob.size > 0) {
                                                formData.append(`image_${i}`, blob, `item_${i}.jpg`);
                                                console.log(`✅ Imagen remota agregada para item ${i}, tamaño: ${blob.size} bytes`);
                                            } else {
                                                console.log(`❌ Blob vacío para item ${i}`);
                                            }
                                        } else {
                                            console.log(`Formato de imagen no reconocido para item ${i}:`, item.foto);
                                            continue;
                                        }

                                    } catch (error) {
                                        console.error(`❌ Error al procesar imagen del item ${i}:`, error);
                                    }
                                } else {
                                    console.log(`⚠️ No hay foto para item ${i}`);
                                }
                            }

                            // Debug: mostrar contenido completo del FormData
                            console.log('\n📤 === RESUMEN FINAL DEL FORMDATA ===');
                            console.log('Claves del FormData:', Array.from(formData.keys()));

                            let totalImages = 0;
                            for (let [key, value] of formData.entries()) {
                                if (key.startsWith('image_') || key === 'property_image') {
                                    totalImages++;
                                    console.log(`🖼️ ${key}:`, {
                                        type: value.constructor.name,
                                        size: value.size,
                                        name: value.name
                                    });
                                } else {
                                    console.log(`📄 ${key}:`, typeof value === 'string' ? value.substring(0, 200) + '...' : value);
                                }
                            }
                            console.log(`📊 Total de imágenes a enviar: ${totalImages}`);
                            console.log('==========================================\n');

                            const reportResponse = await fetch(`${apiUrl}/inspections/${inspectionId}/report`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${session.token}`,
                                    'Content-Type': 'multipart/form-data'
                                },
                                body: formData
                            });

                            console.log('📡 Respuesta del servidor:', {
                                status: reportResponse.status,
                                statusText: reportResponse.statusText,
                                ok: reportResponse.ok
                            });

                            if (!reportResponse.ok) {
                                const errorData = await reportResponse.json();
                                console.error('❌ Error en la respuesta:', errorData);
                                console.error('❌ Status de respuesta:', reportResponse.status);
                                console.error('❌ Headers de respuesta:', Object.fromEntries(reportResponse.headers.entries()));
                                throw new Error(errorData.error || 'Error al crear el reporte');
                            }

                            // Actualizar los items con las URLs de Cloudinary
                            const reportData = await reportResponse.json();
                            if (reportData.inspectionReport && reportData.inspectionReport.items) {
                                // Actualizar los items del reporte con las URLs de Cloudinary
                                reportData.inspectionReport.items.forEach((backendItem, index) => {
                                    if (report.items[index] && backendItem.photo) {
                                        report.items[index].cloudinaryUrl = backendItem.photo;
                                        console.log(`URL de Cloudinary para item ${index}:`, backendItem.photo);
                                    }
                                });
                            }

                            // Luego enviamos la firma y finalizamos la inspección
                            console.log('Enviando firma y finalizando inspección...');
                            const signatureResponse = await fetch(`${apiUrl}/inspections/${inspectionId}/signature`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${session.token}`
                                },
                                body: JSON.stringify({
                                    signature: firmaBase64
                                })
                            });

                            if (!signatureResponse.ok) {
                                const errorData = await signatureResponse.json();
                                throw new Error(errorData.error || 'Error al finalizar la inspección');
                            }

                            // Mostrar modal para generar PDF
                            Alert.alert(
                                'Inspección Finalizada',
                                '¿Desea generar el informe PDF?',
                                [
                                    {
                                        text: 'No',
                                        style: 'cancel',
                                        onPress: () => navigation.navigate('Home')
                                    },
                                    {
                                        text: 'Sí',
                                        onPress: async () => {
                                            // Intentar obtener URLs actualizadas si algún item no tiene cloudinaryUrl
                                            const needsUpdate = report.items.some(item => !item.cloudinaryUrl && item.foto);
                                            if (needsUpdate) {
                                                console.log('🔄 Algunos items no tienen URL de Cloudinary, intentando obtener datos actualizados...');
                                                await getUpdatedInspectionReport();
                                            }

                                            // Generar PDF
                                            await handleGeneratePDF();

                                            // Ir al home después de generar PDF
                                            navigation.navigate('Home');
                                        }
                                    }
                                ]
                            );

                        } catch (error) {
                            console.error('Error al finalizar inspección:', error);
                            Alert.alert('Error', error.message || 'Error al finalizar la inspección');
                        } finally {
                            setIsFinalizingInspection(false);
                        }
                    }}
                >
                    {isFinalizingInspection ? (
                        <View style={styles.buttonContent}>
                            <ActivityIndicator size="small" color="white" />
                            <Text style={[styles.buttonText, { marginLeft: 10 }]}>Finalizando...</Text>
                        </View>
                    ) : (
                        <Text style={styles.buttonText}>Finalizar</Text>
                    )}
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
        borderColor: '#ccc',
    },
    clearButton: {
        marginTop: 10,
        backgroundColor: '#FF6347',
        padding: 10,
        borderRadius: 5,
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
    signatureContainer: {
        width: '100%',
        height: 300,
        borderColor: '#000',
        borderWidth: 1,
        marginBottom: 20,
        position: 'relative',
    },
    imagenContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    subtitulo: {
        fontSize: 16,
        marginBottom: 10,
        fontWeight: 'bold',
    },
    imagenFirma: {
        width: 300,
        height: 120,
        borderColor: '#000',
        borderWidth: 1,
    },
    botonesCompactos: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginTop: 10,
        marginBottom: 10,
    },
    buttonCompacto: {
        backgroundColor: '#FFA500',
        borderRadius: 5,
        paddingVertical: 8,
        paddingHorizontal: 20,
        alignItems: 'center',
        minWidth: 120,
    },
    buttonCompactoText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    secondaryButtonCompacto: {
        backgroundColor: '#FF4444',
    },
    botones: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 20,
    },
    secondaryButton: {
        backgroundColor: '#FF4444',
        marginLeft: 10,
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
        opacity: 0.7,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ufInfoBox: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#FFA500',
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
        backgroundColor: '#fff',
    },
    ufTitle: {
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 5,
        color: '#333',
    },
    ufLoadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ufLoadingText: {
        marginLeft: 10,
        fontSize: 13,
        color: '#666',
    },
    ufDataContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    ufValue: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#FFA500',
    },
    ufDate: {
        fontSize: 13,
        color: '#666',
    },
    ufError: {
        color: '#FF4444',
        fontSize: 13,
    },
});

export default InspectionSummaryScreen; 