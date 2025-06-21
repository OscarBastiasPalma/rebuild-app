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

        const html = `
            <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .item-image { max-width: 200px; max-height: 150px; object-fit: cover; margin: 10px 0; }
                        .signature-image { max-width: 300px; max-height: 120px; object-fit: contain; }
                        .item-container { margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 15px; }
                        h2, h3, h4 { color: #333; }
                        .signature-section { text-align: center; margin-top: 30px; }
                        .uf-info { background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <h2>Revisión Informe de Inspección</h2>
                    <p><b>Dirección:</b> ${inspectionData.property?.address}</p>
                    <p><b>Comuna:</b> ${inspectionData.commune?.name}</p>
                    <p><b>Ciudad:</b> ${inspectionData.city?.name}</p>
                    <p><b>Región:</b> ${inspectionData.region?.name}</p>
                    <p><b>Fecha de visita:</b> ${new Date(inspectionData.visitDate).toLocaleDateString()}</p>
                    ${ufData && ufData.success ? `
                    <div class="uf-info">
                        <p><b>Valor UF al día de hoy:</b> $${ufData.valor.toLocaleString('es-CL')}</p>
                        <p><b>Fecha del valor UF:</b> ${ufData.fechaFormateada}</p>
                    </div>
                    ` : ''}
                    <hr/>
                    ${report.items.map((item, idx) => {
            // Determinar qué URL de imagen usar (prioridad: Cloudinary > HTTP > File local > Base64)
            let imageHtml = '';

            if (item.cloudinaryUrl) {
                imageHtml = `<img src="${item.cloudinaryUrl}" class="item-image" alt="Imagen del item ${idx + 1}" /><br/>`;
                console.log(`📷 PDF: Usando Cloudinary URL para item ${idx}:`, item.cloudinaryUrl);
            } else if (item.foto && item.foto.startsWith('http')) {
                imageHtml = `<img src="${item.foto}" class="item-image" alt="Imagen del item ${idx + 1}" /><br/>`;
                console.log(`📷 PDF: Usando URL HTTP para item ${idx}:`, item.foto);
            } else if (item.foto && item.foto.startsWith('data:image')) {
                imageHtml = `<img src="${item.foto}" class="item-image" alt="Imagen del item ${idx + 1}" /><br/>`;
                console.log(`📷 PDF: Usando base64 para item ${idx}`);
            } else if (item.foto && item.foto.startsWith('file://')) {
                // Para archivos locales, intentar convertir a base64 en tiempo real
                console.log(`⚠️ PDF: Archivo local detectado para item ${idx}, esto podría no funcionar en PDF:`, item.foto);
                imageHtml = ''; // Los archivos locales no funcionan en PDF
            } else {
                console.log(`❌ PDF: No hay imagen válida para item ${idx}`);
            }

            // Calcular total con UF
            const totalWithUF = ufData && ufData.success ?
                calculateTotalWithUF(item.apuTotal, ufData.valor) :
                item.apuTotal;

            return `
                        <div class="item-container">
                            <h4>Item ${idx + 1}</h4>
                            ${imageHtml}
                            <b>Partida:</b> ${item.partida}<br/>
                            <b>Descripción:</b> ${item.descripcion}<br/>
                            <b>Cantidad:</b> ${item.cantidad}<br/>
                            <b>Precio Unitario:</b> ${item.precioUnitario?.toLocaleString() || 0} U.F<br/>
                            <b>Total:</b> ${item.apuTotal?.toLocaleString() || 0} U.F
                            ${ufData && ufData.success ? `<br/><b>Total CLP:</b> ${formatTotalWithUF(totalWithUF)}` : ''}
                        </div>
                        `;
        }).join('')}
                    <div class="signature-section">
                        <h3>Firma del propietario</h3>
                        ${signatureSrc ? `<img src="${signatureSrc}" class="signature-image" alt="Firma del propietario" />` : '<p>Sin firma</p>'}
                        <div style="margin-top: 20px;">
                            <p><b>Firmado por:</b> ${ownerName}</p>
                            <p><b>Fecha y hora de firma:</b> ${signatureDate}</p>
                        </div>
                    </div>
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
                            <Text style={styles.label}><Text style={styles.bold}>Cantidad:</Text> {item.cantidad}</Text>
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