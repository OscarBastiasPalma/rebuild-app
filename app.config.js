export default {
    expo: {
        name: 'rebuild-app',
        slug: 'rebuild-app',
        version: '1.0.0',
        orientation: 'portrait',
        icon: './assets/icon.png',
        userInterfaceStyle: 'light',
        splash: {
            image: './assets/splash.png',
            resizeMode: 'contain',
            backgroundColor: '#ffffff'
        },
        assetBundlePatterns: [
            '**/*'
        ],
        ios: {
            supportsTablet: true
        },
        android: {
            adaptiveIcon: {
                foregroundImage: './assets/adaptive-icon.png',
                backgroundColor: '#ffffff'
            }
        },
        web: {
            favicon: './assets/favicon.png'
        },
        extra: {
            apiUrl: process.env.API_URL || 'http://localhost:3000'
        }
    }
}; 