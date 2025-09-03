// app.config.js - Expo Configuration for Luma AI Android App
export default {
  expo: {
    name: 'Luma AI',
    slug: 'luma-ai-companion',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#8B5CF6'
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.lumaai.companion',
      buildNumber: '1'
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#8B5CF6'
      },
      package: 'com.lumaai.companion',
      versionCode: 1,
      permissions: [
        'RECEIVE_BOOT_COMPLETED',
        'VIBRATE',
        'WAKE_LOCK',
        'INTERNET',
        'ACCESS_NETWORK_STATE',
        'POST_NOTIFICATIONS'
      ],
      googleServicesFile: './google-services.json'
    },
    web: {
      favicon: './assets/favicon.png'
    },
    plugins: [
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#8B5CF6',
          sounds: [
            './assets/notification-sound.wav'
          ]
        }
      ],
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 34,
            targetSdkVersion: 34,
            buildToolsVersion: '34.0.0'
          }
        }
      ]
    ],
    extra: {
      eas: {
        projectId: 'your-eas-project-id-here'
      }
    }
  }
};