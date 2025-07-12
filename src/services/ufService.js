/**
 * Servicio para obtener el valor de la UF desde mindicador.cl
 * @returns {Promise<Object>} - Objeto con el valor de la UF y la fecha
 */
export const getUFValue = async () => {
    try {
        console.log('🔄 Consultando valor de UF desde mindicador.cl...');

        const response = await fetch('https://mindicador.cl/api/uf', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 10000 // 10 segundos de timeout
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        console.log('✅ Valor de UF obtenido:', {
            valor: data.serie?.[0]?.valor,
            fecha: data.serie?.[0]?.fecha,
            codigo: data.codigo,
            nombre: data.nombre
        });

        if (!data.serie || !data.serie[0] || !data.serie[0].valor) {
            throw new Error('No se pudo obtener el valor de la UF');
        }

        const ufValue = data.serie[0].valor;
        const ufDate = data.serie[0].fecha;

        return {
            success: true,
            valor: ufValue,
            fecha: ufDate,
            fechaFormateada: new Date(ufDate).toLocaleDateString('es-CL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            codigo: data.codigo,
            nombre: data.nombre
        };

    } catch (error) {
        console.error('❌ Error al obtener valor de UF:', error);

        // Retornar un valor por defecto en caso de error
        const today = new Date();
        return {
            success: false,
            valor: 0,
            fecha: today.toISOString(),
            fechaFormateada: today.toLocaleDateString('es-CL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            error: error.message,
            codigo: 'uf',
            nombre: 'Unidad de Fomento'
        };
    }
};

/**
 * Función para calcular el total con UF
 * @param {number} total - Total del item (cantidad * apuTotal)
 * @param {number} ufValue - Valor de la UF
 * @returns {number} - Total calculado (total * ufValue)
 */
export const calculateTotalWithUF = (total, ufValue) => {
    const totalWithUF = total * ufValue;
    console.log('🧮 Cálculo con UF:', {
        total,
        ufValue,
        totalWithUF
    });
    return totalWithUF;
};

/**
 * Función para formatear el total con UF
 * @param {number} total - Total a formatear
 * @returns {string} - Total formateado con separadores de miles
 */
export const formatTotalWithUF = (total) => {
    return total.toLocaleString('es-CL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
};

export default {
    getUFValue,
    calculateTotalWithUF,
    formatTotalWithUF
}; 