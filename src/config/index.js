import { Platform } from 'react-native';

// Importar la configuración específica de la plataforma
const env = Platform.select({
    ios: require('./env').default,
    android: require('./env.android').default,
    default: require('./env').default,
});

export default env; 