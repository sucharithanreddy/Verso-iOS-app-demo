import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.verso.app',
  appName: 'Verso',
  webDir: 'public',
  server: {
    // Use the deployed Vercel app to keep API routes and auth working
    url: 'https://optimism-engine.vercel.app',
    cleartext: true
  },
  android: {
    backgroundColor: '#0891b2'
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0891b2'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0891b2',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;
