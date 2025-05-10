// Configuración de entorno
const ENV = {
    dev: {
        API_URL: 'http://192.168.1.36:3000/api',  // Usa la IP de tu máquina
    },
    staging: {
        API_URL: 'https://staging-api.rebuild.com/api', // Reemplazar con la URL real de staging
    },
    prod: {
        API_URL: 'https://api.rebuild.com/api', // Reemplazar con la URL real de producción
    }
};

// Función para obtener la configuración según el entorno
const getEnvVars = (env = 'dev') => {
    return ENV[env];
};

export default getEnvVars; 