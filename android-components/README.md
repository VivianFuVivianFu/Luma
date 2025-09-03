# Luma AI Android App

A React Native/Expo mobile application for the Luma AI companion system. This app provides a native mobile experience with full chat functionality, journaling features, and intelligent memory system integration.

## Features

### 🤖 AI Chat Interface
- Real-time conversations with Luma AI companion
- Multi-model architecture (Claude 3.5 Haiku, Claude 3 Haiku, Llama 3.1 70B)
- Session management and conversation history
- Typing indicators and message status

### 📝 Intelligent Journaling
- AI-generated writing prompts based on conversation context
- Four prompt types: Future Vision, Growth Reflection, Gratitude Reflection, Values Clarification
- Rich text editor with character counting
- Journal entry history and search

### 🧠 Memory System
- Automatic memory extraction from conversations
- Context-aware response generation
- Long-term memory persistence
- Growth tracking and insights

### 🔔 Smart Notifications
- Daily check-in reminders
- Journal writing prompts
- Memory insights and growth notifications
- FCM integration with Supabase Edge Functions

### 🔐 Secure Authentication
- Supabase Authentication integration
- JWT token management
- Secure user session handling
- Profile management

## Architecture

### Core Components
- **App.tsx** - Main application with navigation and authentication flow
- **AuthScreen.tsx** - Login/signup interface with form validation
- **ChatScreen.tsx** - Real-time chat interface with message history
- **JournalScreen.tsx** - Journal writing interface with AI prompts
- **SettingsScreen.tsx** - User preferences and account management

### Integration Layer
- **android-luma-app-complete.ts** - Complete Android integration service
- **AndroidAuthService** - Authentication management
- **AndroidChatService** - Chat functionality
- **AndroidJournalingService** - Journal operations
- **AndroidMemoryService** - Memory system integration
- **AndroidNotificationService** - Push notification handling

## Setup Instructions

### Prerequisites
1. Node.js 18+ installed
2. Expo CLI installed globally: `npm install -g @expo/cli`
3. Android Studio with Android SDK
4. Physical Android device or emulator

### Environment Setup
1. Copy environment variables:
   ```bash
   cp ../.env .env
   ```

2. Update Supabase configuration in `android-luma-app-complete.ts`:
   ```typescript
   const SUPABASE_URL = 'your-supabase-url'
   const SUPABASE_ANON_KEY = 'your-supabase-anon-key'
   ```

### Installation
```bash
# Install dependencies
npm install

# Install Expo CLI if not already installed
npm install -g @expo/cli

# Start development server
npm run start

# Run on Android device/emulator
npm run android
```

### Building for Production

#### Development Build
```bash
# Install EAS CLI
npm install -g @expo/cli

# Configure project
expo login
expo init --template

# Create development build
expo build:android
```

#### Production Build
```bash
# Build APK for testing
expo build:android -t apk

# Build AAB for Play Store
expo build:android -t app-bundle
```

## Key Integration Points

### Supabase Edge Functions
The app integrates with the following Edge Functions:
- `generate-journal-prompt` - AI prompt generation
- `submit-journal-entry` - Journal entry processing
- `daily-checkin-generator` - Automated check-ins

### Database Tables
- `profiles` - User profile information
- `sessions` - Chat session management  
- `messages` - Conversation history
- `journal_entries` - Journal entry storage
- `user_memory` - Extracted memory insights

### Push Notifications
- FCM integration via Supabase
- Daily scheduled notifications
- Context-aware reminder system
- Growth insight notifications

## File Structure
```
android-components/
├── App.tsx                          # Main app component
├── AuthScreen.tsx                   # Authentication interface
├── ChatScreen.tsx                   # Chat interface
├── JournalScreen.tsx               # Journaling interface  
├── SettingsScreen.tsx              # Settings and preferences
├── android-luma-app-complete.ts    # Integration services
├── package.json                    # Dependencies and scripts
├── app.config.js                   # Expo configuration
└── README.md                       # This file
```

## Development Notes

### State Management
- React hooks for local state management
- Persistent storage via Supabase
- Real-time synchronization

### Styling
- React Native StyleSheet
- Consistent design system
- Mobile-first responsive design
- Dark/light theme support

### Error Handling
- Comprehensive error boundaries
- Network failure resilience
- User-friendly error messages
- Automatic retry mechanisms

### Performance
- Lazy loading for chat history
- Optimized re-renders
- Efficient memory usage
- Background processing

## Testing

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Chat message sending and receiving
- [ ] Journal prompt generation
- [ ] Journal entry submission
- [ ] Push notification delivery
- [ ] Settings preferences
- [ ] Offline behavior
- [ ] Error handling

### Automated Testing
```bash
# Unit tests (to be implemented)
npm test

# E2E tests (to be implemented) 
npm run test:e2e
```

## Deployment

### Play Store Deployment
1. Build production AAB: `expo build:android -t app-bundle`
2. Upload to Google Play Console
3. Complete store listing
4. Submit for review

### Over-the-Air Updates
```bash
# Publish update
expo publish

# Create release channel
expo publish --release-channel production
```

## Support

### Troubleshooting
- Check network connectivity
- Verify Supabase configuration
- Ensure FCM setup is complete
- Check device permissions

### Logs and Debugging
```bash
# View logs
expo logs

# Debug on device
expo start --dev-client
```

## Contributing

1. Follow React Native best practices
2. Maintain TypeScript strict mode
3. Test on multiple devices
4. Update documentation as needed

## License

Private - Luma AI Companion System