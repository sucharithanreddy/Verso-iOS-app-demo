# Optimism Engine - Mobile App Build Instructions

This project is configured with **Capacitor** to build native mobile apps for Android and iOS.

## Prerequisites

### For Android:
- Node.js 18+
- Android Studio (latest version)
- Android SDK (API 33+)
- Java JDK 17+

### For iOS (macOS only):
- Xcode 15+
- CocoaPods (`sudo gem install cocoapods`)

## Quick Start

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd optimism-engine
npm install
```

### 2. Build Android APK

```bash
# Sync Capacitor
npm run cap:sync

# Open in Android Studio
npm run cap:android

# Or build directly from command line
cd android
./gradlew assembleDebug
```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### 3. Build iOS App (macOS only)

```bash
# Add iOS platform
npx cap add ios

# Sync
npm run cap:sync

# Open in Xcode
npm run cap:ios
```

In Xcode:
1. Select your target device or simulator
2. Click Run (▶️) or Product → Build

## Build Release APK (for distribution)

### Android:

1. Generate a signing key:
```bash
keytool -genkey -v -keystore optimism-engine.keystore -alias optimism-engine -keyalg RSA -keysize 2048 -validity 10000
```

2. Create `android/key.properties`:
```properties
storePassword=YOUR_PASSWORD
keyPassword=YOUR_PASSWORD
keyAlias=optimism-engine
storeFile=../optimism-engine.keystore
```

3. Build release APK:
```bash
cd android
./gradlew assembleRelease
```

The release APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

## App Configuration

The app is configured to load from your deployed Vercel URL:
- **URL**: `https://optimism-engine.vercel.app`
- **App ID**: `com.optimismengine.app`
- **App Name**: Optimism Engine

To change the URL, edit `capacitor.config.ts`:
```typescript
server: {
  url: 'https://your-new-url.com',
  cleartext: true
}
```

## Project Structure

```
optimism-engine/
├── android/                 # Android native project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── res/        # Icons, splash screens
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   └── gradlew
├── ios/                     # iOS native project (after `npx cap add ios`)
├── capacitor.config.ts      # Capacitor configuration
└── package.json
```

## Troubleshooting

### Android build fails:
- Make sure ANDROID_HOME is set
- Install Android SDK Platform 33
- Sync project: `npx cap sync android`

### iOS build fails:
- Run `pod install` in `ios/` folder
- Open `.xcworkspace` file, not `.xcodeproj`

### White screen on app launch:
- Check if the URL in `capacitor.config.ts` is correct
- Ensure the deployed app is accessible

## Distributing Your App

### Android:
1. Upload APK to Google Play Console
2. Or share APK directly for testing

### iOS:
1. Archive in Xcode (Product → Archive)
2. Upload to App Store Connect
3. Or use TestFlight for beta testing

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run cap:sync` | Sync web assets to native projects |
| `npm run cap:android` | Open Android project in Android Studio |
| `npm run cap:ios` | Open iOS project in Xcode |
| `npm run android:build` | Build debug APK |
| `npm run android:release` | Build release APK |
