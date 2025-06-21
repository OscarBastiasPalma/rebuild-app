import env from '../config';
import { useAuth } from '../context/AuthContext';

/**
 * Servicio para subir imágenes al backend que luego las sube a Cloudinary
 * @param {string} imageUri - URI local de la imagen
 * @param {string} folder - Carpeta en Cloudinary (opcional)
 * @param {object} authHeaders - Headers de autenticación
 * @returns {Promise<string>} - URL de la imagen subida
 */
export const uploadImageToBackend = async (imageUri, folder = 'inspection-items', authHeaders = {}) => {
    try {
        console.log('🚀 Subiendo imagen vía backend:', { imageUri, folder });

        const { API_URL } = env();

        // Preparar FormData
        const formData = new FormData();

        const imageFile = {
            uri: imageUri,
            type: 'image/jpeg',
            name: `image_${Date.now()}.jpg`
        };

        formData.append('file', imageFile);
        formData.append('folder', folder);

        // Subir via backend
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData,
            headers: {
                ...authHeaders,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Error del backend:', errorData);
            throw new Error(errorData.error || 'Error al subir imagen');
        }

        const result = await response.json();
        console.log('✅ Imagen subida exitosamente vía backend:', result.url);

        return result.url;
    } catch (error) {
        console.error('❌ Error al subir imagen vía backend:', error);
        throw error;
    }
};

/**
 * Función para procesar múltiples imágenes de un reporte de inspección
 * @param {Array} items - Items del reporte con fotos
 * @param {object} authHeaders - Headers de autenticación
 * @returns {Promise<Array>} - Items con URLs de Cloudinary actualizadas
 */
export const uploadReportImages = async (items, authHeaders = {}) => {
    console.log('🖼️ Procesando múltiples imágenes del reporte...');

    const updatedItems = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let updatedItem = { ...item };

        if (item.foto && item.foto.startsWith('file://')) {
            try {
                console.log(`📸 Subiendo imagen del item ${i}...`);

                // Subir la imagen al backend
                const cloudinaryUrl = await uploadImageToBackend(
                    item.foto,
                    'inspection-items',
                    authHeaders
                );

                // Actualizar el item con la URL de Cloudinary
                updatedItem.cloudinaryUrl = cloudinaryUrl;
                updatedItem.foto = cloudinaryUrl; // También actualizar foto para compatibilidad

                console.log(`✅ Imagen del item ${i} subida exitosamente:`, cloudinaryUrl);

            } catch (error) {
                console.error(`❌ Error al subir imagen del item ${i}:`, error);
                // Mantener la imagen local si falla la subida
            }
        }

        updatedItems.push(updatedItem);
    }

    console.log('📊 Resumen de subida de imágenes:', {
        total: items.length,
        conImagen: items.filter(item => item.foto).length,
        exitosas: updatedItems.filter(item => item.cloudinaryUrl).length
    });

    return updatedItems;
};

/**
 * Hook personalizado para usar el servicio de subida con autenticación
 */
export const useImageUpload = () => {
    const { getAuthHeaders } = useAuth();

    const uploadImage = async (imageUri, folder = 'inspection-items') => {
        const authHeaders = getAuthHeaders();
        return uploadImageToBackend(imageUri, folder, authHeaders);
    };

    const uploadMultipleImages = async (items) => {
        const authHeaders = getAuthHeaders();
        return uploadReportImages(items, authHeaders);
    };

    return {
        uploadImage,
        uploadMultipleImages
    };
};

export default {
    uploadImageToBackend,
    uploadReportImages,
    useImageUpload
};

/**
 * Servicio de carga de imágenes y PDFs para la aplicación móvil
 * Utiliza el backend con recursos autenticados de Cloudinary
 */

const API_BASE_URL = 'http://localhost:3000';

/**
 * Sube una imagen al servidor y devuelve la URL de Cloudinary
 * @param {string} imageUri - URI local de la imagen
 * @param {string} folder - Carpeta de destino ('properties' o 'profiles')
 * @param {string} token - Token de autenticación
 * @returns {Promise<string>} URL de la imagen subida
 */
export const uploadImage = async (imageUri, folder = 'properties', token = null) => {
    try {
        console.log('📸 Iniciando carga de imagen:', { imageUri, folder });

        // Crear FormData
        const formData = new FormData();
        formData.append('image', {
            uri: imageUri,
            type: 'image/jpeg',
            name: `image_${Date.now()}.jpg`,
        });
        formData.append('folder', folder);

        // Preparar headers
        const headers = {
        };

        // Agregar token si está disponible
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        console.log('🚀 Enviando imagen al servidor...');

        const response = await fetch(`${API_BASE_URL}/api/upload`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Imagen subida exitosamente:', data.imageUrl);

        return data.imageUrl;
    } catch (error) {
        console.error('❌ Error subiendo imagen:', error);
        throw new Error(`Error al subir imagen: ${error.message}`);
    }
};

/**
 * Sube un PDF al servidor como recurso autenticado
 * @param {string} pdfUri - URI local del PDF
 * @param {string} inspectionId - ID de la inspección
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>} Información del PDF subido con URLs firmadas
 */
export const uploadPDF = async (pdfUri, inspectionId, token = null) => {
    try {
        console.log('📄 Iniciando carga de PDF:', { pdfUri, inspectionId });

        // Crear FormData
        const formData = new FormData();
        formData.append('pdf', {
            uri: pdfUri,
            type: 'application/pdf',
            name: `inspection_${inspectionId}_report_${Date.now()}.pdf`,
        });

        // Preparar headers
        const headers = {
        };

        // Agregar token si está disponible
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        console.log('🚀 Enviando PDF al servidor...');

        const response = await fetch(`${API_BASE_URL}/api/inspections/${inspectionId}/upload-pdf`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ PDF subido exitosamente:', {
            message: data.message,
            securityLevel: data.accessInfo?.securityLevel,
            urlType: data.accessInfo?.urlType,
            expiresAt: data.accessInfo?.expiresAt
        });

        return {
            success: true,
            pdfUrl: data.pdfUrl,
            downloadUrl: data.reportpdf,
            alternativeUrls: data.alternativeUrls,
            accessInfo: data.accessInfo,
            inspectionReport: data.inspectionReport,
        };
    } catch (error) {
        console.error('❌ Error subiendo PDF:', error);
        throw new Error(`Error al subir PDF: ${error.message}`);
    }
};

/**
 * Obtiene la información del PDF de una inspección
 * @param {string} inspectionId - ID de la inspección
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>} Información del PDF con URLs de acceso
 */
export const getPDFInfo = async (inspectionId, token = null) => {
    try {
        console.log('📄 Obteniendo información del PDF:', inspectionId);

        // Preparar headers
        const headers = {
        };

        // Agregar token si está disponible
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}/api/inspections/${inspectionId}/upload-pdf`, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.exists) {
            return {
                exists: false,
                message: data.message,
            };
        }

        console.log('✅ Información del PDF obtenida:', {
            exists: data.exists,
            securityLevel: data.accessInfo?.securityLevel,
            urlType: data.accessInfo?.currentUrl ? 'available' : 'unavailable',
            hasAlternatives: data.accessInfo?.hasAlternatives,
            expiresAt: data.accessInfo?.expiresAt
        });

        return {
            exists: true,
            pdfUrl: data.pdfUrl,
            downloadUrl: data.reportpdf,
            alternativeUrls: data.alternativeUrls,
            accessInfo: data.accessInfo,
            inspectionReport: data.inspectionReport,
        };
    } catch (error) {
        console.error('❌ Error obteniendo información del PDF:', error);
        throw new Error(`Error al obtener PDF: ${error.message}`);
    }
};

/**
 * Descarga un PDF usando la mejor URL disponible
 * @param {string} inspectionId - ID de la inspección
 * @param {string} fileName - Nombre del archivo (opcional)
 * @param {string} token - Token de autenticación
 * @returns {Promise<string>} URL de descarga directa
 */
export const downloadPDF = async (inspectionId, fileName = null, token = null) => {
    try {
        console.log('📥 Iniciando descarga de PDF:', { inspectionId, fileName });

        // Obtener información del PDF
        const pdfInfo = await getPDFInfo(inspectionId, token);

        if (!pdfInfo.exists) {
            throw new Error('El PDF no está disponible para esta inspección');
        }

        // Determinar la mejor URL para descarga
        let downloadUrl = pdfInfo.downloadUrl;

        // Priorizar URL firmada de descarga si está disponible
        if (pdfInfo.alternativeUrls?.signedDownload) {
            downloadUrl = pdfInfo.alternativeUrls.signedDownload;
            console.log('🔐 Usando URL firmada con attachment para descarga directa');
        } else if (pdfInfo.accessInfo?.securityLevel === 'authenticated') {
            console.log('🔐 Usando URL autenticada para descarga');
        } else {
            console.log('📄 Usando URL básica para descarga');
        }

        console.log('✅ URL de descarga preparada:', {
            url: downloadUrl,
            securityLevel: pdfInfo.accessInfo?.securityLevel,
            expiresAt: pdfInfo.accessInfo?.expiresAt
        });

        return downloadUrl;
    } catch (error) {
        console.error('❌ Error preparando descarga de PDF:', error);
        throw new Error(`Error al descargar PDF: ${error.message}`);
    }
};

/**
 * Obtiene múltiples imágenes de una inspección
 * @param {string} inspectionId - ID de la inspección
 * @param {string} token - Token de autenticación
 * @returns {Promise<Array>} Lista de URLs de imágenes
 */
export const getInspectionImages = async (inspectionId, token = null) => {
    try {
        console.log('🖼️ Obteniendo imágenes de inspección:', inspectionId);

        // Preparar headers
        const headers = {
        };

        // Agregar token si está disponible
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}/api/inspections/${inspectionId}`, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Extraer URLs de imágenes del reporte de inspección
        const images = [];

        if (data.inspection?.inspectionReport?.items) {
            data.inspection.inspectionReport.items.forEach(item => {
                if (item.photos && Array.isArray(item.photos)) {
                    images.push(...item.photos);
                }
            });
        }

        console.log('✅ Imágenes obtenidas:', images.length);
        return images;
    } catch (error) {
        console.error('❌ Error obteniendo imágenes:', error);
        throw new Error(`Error al obtener imágenes: ${error.message}`);
    }
};

/**
 * Ejemplo de uso del servicio
 */
export const exampleUsage = {
    // Subir imagen
    uploadImageExample: async () => {
        try {
            const imageUrl = await uploadImage('file:///path/to/image.jpg', 'properties', 'your-token');
            console.log('Imagen subida:', imageUrl);
        } catch (error) {
            console.error('Error:', error.message);
        }
    },

    // Subir PDF
    uploadPDFExample: async () => {
        try {
            const result = await uploadPDF('file:///path/to/report.pdf', 'inspection-id', 'your-token');
            console.log('PDF subido:', result);
        } catch (error) {
            console.error('Error:', error.message);
        }
    },

    // Descargar PDF
    downloadPDFExample: async () => {
        try {
            const downloadUrl = await downloadPDF('inspection-id', 'mi-reporte.pdf', 'your-token');
            console.log('URL de descarga:', downloadUrl);
            // Usar la URL con Linking o WebBrowser para abrir/descargar
        } catch (error) {
            console.error('Error:', error.message);
        }
    },
}; 