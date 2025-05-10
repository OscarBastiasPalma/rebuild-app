// Configuración de entorno para Android
const ENV = {
    dev: {
        API_URL: 'http://10.0.2.2:3000/api', // 10.0.2.2 es el localhost en el emulador de Android
    },
    staging: {
        API_URL: 'https://staging-api.rebuild.com/api', // Reemplazar con tu URL de staging
    },
    prod: {
        API_URL: 'https://api.rebuild.com/api', // Reemplazar con tu URL de producción
    }
};

// Función para obtener la configuración según el entorno
const getEnvVars = (env = 'dev') => {
    return ENV[env] || ENV.dev;
};

export default getEnvVars; 