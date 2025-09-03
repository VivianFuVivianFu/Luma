// App.tsx - Main React Native App Component for Luma AI
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AndroidAuthService, AndroidNotificationService } from '../android-luma-app-complete';

// Component imports
import AuthScreen from './AuthScreen';
import ChatScreen from './ChatScreen';
import JournalScreen from './JournalScreen';
import SettingsScreen from './SettingsScreen';

// Simple icon components (using text icons for now)
const ChatIcon = ({ focused }: { focused: boolean }) => (
  <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>💬</Text>
);

const JournalIcon = ({ focused }: { focused: boolean }) => (
  <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>📝</Text>
);

const SettingsIcon = ({ focused }: { focused: boolean }) => (
  <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>⚙️</Text>
);

const Tab = createBottomTabNavigator();

interface User {
  id: string;
  email: string;
  user_metadata?: any;
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const authService = new AndroidAuthService();
  const notificationService = new AndroidNotificationService();

  useEffect(() => {
    checkAuthStatus();
    initializeNotifications();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeNotifications = async () => {
    try {
      const result = await notificationService.initialize();
      if (!result.success) {
        console.warn('Notification initialization failed:', result.error);
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    Alert.alert('Welcome!', `Hello ${authenticatedUser.email}! Welcome to Luma AI.`);
  };

  const handleSignOut = () => {
    setUser(null);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <View style={styles.loadingContent}>
          <View style={styles.loadingLogo}>
            <Text style={styles.loadingLogoText}>L</Text>
          </View>
          <Text style={styles.loadingTitle}>Luma AI</Text>
          <Text style={styles.loadingSubtitle}>Loading your companion...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: '#8B5CF6',
            tabBarInactiveTintColor: '#9CA3AF',
            tabBarLabelStyle: styles.tabLabel,
          }}
        >
          <Tab.Screen
            name="Chat"
            component={ChatScreen}
            options={{
              tabBarIcon: ({ focused }) => <ChatIcon focused={focused} />,
            }}
          />
          <Tab.Screen
            name="Journal"
            component={JournalScreen}
            options={{
              tabBarIcon: ({ focused }) => <JournalIcon focused={focused} />,
            }}
          />
          <Tab.Screen
            name="Settings"
            options={{
              tabBarIcon: ({ focused }) => <SettingsIcon focused={focused} />,
            }}
          >
            {() => <SettingsScreen onSignOut={handleSignOut} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingLogoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 8,
    paddingTop: 8,
    height: 68,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  tabIcon: {
    fontSize: 24,
    opacity: 0.6,
  },
  tabIconActive: {
    opacity: 1,
  },
});

export default App;