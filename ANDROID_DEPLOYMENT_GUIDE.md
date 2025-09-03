# Luma AI Android App - Google Play Store Deployment Guide

## Prerequisites

### 1. Developer Account Setup
- **Google Play Console Account** ($25 one-time fee)
  - Visit: https://play.google.com/console
  - Create developer account
  - Complete identity verification
  - Accept developer agreement

### 2. Required Tools
```bash
# Install EAS CLI (Expo Application Services)
npm install -g @expo/cli
npm install -g eas-cli

# Verify installation
eas --version
expo --version
```

### 3. Project Setup
```bash
# Navigate to android components directory
cd "C:\Users\vivia\OneDrive\Desktop\Luma 3\android-components"

# Initialize EAS project
eas init

# Login to Expo
expo login
```

## Step-by-Step Deployment Process

### Step 1: Configure App for Production

#### Update app.config.js
```javascript
export default {
  expo: {
    name: 'Luma AI',
    slug: 'luma-ai-companion',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    android: {
      package: 'com.lumaai.companion',
      versionCode: 1,
      permissions: [
        'INTERNET',
        'ACCESS_NETWORK_STATE',
        'RECEIVE_BOOT_COMPLETED',
        'VIBRATE',
        'WAKE_LOCK',
        'POST_NOTIFICATIONS'
      ],
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#8B5CF6'
      }
    },
    extra: {
      eas: {
        projectId: "your-project-id-here"
      }
    }
  }
};
```

#### Create eas.json
```json
{
  "cli": {
    "version": ">= 5.9.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

### Step 2: Create Required Assets

#### App Icons (Required Sizes)
Create these icon files in `assets/` directory:
- `icon.png` - 1024x1024px (app icon)
- `adaptive-icon.png` - 1024x1024px (adaptive icon foreground)
- `splash.png` - 1284x2778px (splash screen)
- `favicon.png` - 48x48px (web favicon)

#### Store Listing Assets
Create `store-assets/` directory with:
- App screenshots (phone: 16:9 or 9:16 ratio)
- Feature graphic (1024x500px)
- App icon (512x512px high-res)

### Step 3: Environment Configuration

#### Create production .env file
```bash
# Copy main .env to android-components
cp ../.env .env

# Ensure these are set for production:
SUPABASE_URL=your-production-supabase-url
SUPABASE_ANON_KEY=your-production-anon-key
CLAUDE_API_KEY=your-production-claude-key
```

#### Update android-luma-app-complete.ts
```typescript
// Use environment variables for production
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'your-fallback-url';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-fallback-key';
```

### Step 4: Build Production App

#### Build AAB (Android App Bundle) for Play Store
```bash
# Build production version
eas build --platform android --profile production

# This will:
# 1. Upload your code to EAS servers
# 2. Build the app in the cloud
# 3. Generate a signed AAB file
# 4. Provide download link when complete
```

#### Alternative: Local Build (if preferred)
```bash
# Generate signing credentials
eas credentials

# Build locally
eas build --platform android --local
```

### Step 5: Google Play Console Setup

#### 1. Create New App
- Go to Google Play Console
- Click "Create app"
- Fill in app details:
  - **App name**: Luma AI
  - **Default language**: English (US)
  - **App or game**: App
  - **Free or paid**: Free (or Paid if monetizing)

#### 2. Complete App Information
Navigate through left sidebar:

**Store listing**
- App name: Luma AI
- Short description (80 chars): Your warm, trauma-informed AI companion
- Full description: [Detailed app description]
- App icon: Upload 512x512px icon
- Feature graphic: Upload 1024x500px graphic
- Screenshots: Upload phone screenshots

**App content**
- Privacy policy: Required (create and host online)
- App access: All functionality available without restrictions
- Content ratings: Complete questionnaire
- Target audience: 18+ (due to mental health content)

**Pricing and distribution**
- Countries/regions: Select target markets
- Content guidelines: Confirm compliance
- US export laws: Confirm compliance

#### 3. Upload App Bundle
- Go to "Release" > "Production"
- Click "Create new release"
- Upload the AAB file from Step 4
- Add release notes
- Set rollout percentage (start with 20% for safety)

### Step 6: Pre-Launch Testing

#### Internal Testing Track
```bash
# Create test build first
eas build --platform android --profile preview

# Upload to internal testing
# Add test users via Play Console
```

#### Play Console Testing
- Upload AAB to "Internal testing" track first
- Add test users (emails)
- Test all functionality thoroughly
- Fix any issues before production release

### Step 7: Production Release

#### Final Checklist
- [ ] All store listing information complete
- [ ] Privacy policy live and accessible
- [ ] Content rating completed
- [ ] App bundle uploaded and reviewed
- [ ] Release notes written
- [ ] Target countries selected
- [ ] Pricing set (free/paid)

#### Submit for Review
- Complete all required sections in Play Console
- Submit app for review
- Review typically takes 1-3 days
- Monitor for any policy violations

## Commands Summary

```bash
# Setup
npm install -g @expo/cli eas-cli
cd android-components
eas init
expo login

# Build
eas build --platform android --profile production

# Submit (after manual upload)
eas submit --platform android

# Update app (after initial release)
eas update --branch production
```

## Important Notes

### Security Considerations
- **Never commit**: API keys, signing certificates, service account keys
- **Use environment variables** for all sensitive data
- **Enable Play Protect** for additional security

### App Store Policies
- **Medical/Health apps** require careful content review
- **Mental health content** must comply with sensitive content policies
- **AI/ML features** should be clearly disclosed
- **Privacy policy** must cover data collection and AI usage

### Monetization Options
- **Free with ads**: Implement AdMob
- **Freemium**: In-app purchases for premium features
- **Subscription**: Monthly/yearly premium plans
- **One-time purchase**: Single payment for full access

### Post-Launch
- **Monitor crashes**: Use Firebase Crashlytics
- **Track analytics**: Implement Firebase Analytics
- **Collect feedback**: Play Console reviews and ratings
- **Regular updates**: Bug fixes and new features

## Troubleshooting

### Common Issues
1. **Build failures**: Check dependencies and Expo SDK compatibility
2. **Upload rejected**: Verify app bundle signing and policies
3. **Review rejection**: Address policy violations promptly
4. **Performance issues**: Optimize app size and loading times

### Support Resources
- Expo Documentation: https://docs.expo.dev/
- Google Play Console Help: https://support.google.com/googleplay/android-developer/
- React Native Performance: https://reactnative.dev/docs/performance

## Next Steps After Deployment

1. **Monitor app performance** and user feedback
2. **Implement analytics** to track user engagement
3. **Plan regular updates** with new features
4. **Marketing strategy** to increase downloads
5. **User support system** for issues and feedback

Your Luma AI Android app is now ready for Google Play Store deployment! 🚀