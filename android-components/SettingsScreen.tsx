// SettingsScreen.tsx - React Native Settings Component for Luma AI
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert
} from 'react-native';
import { AndroidNotificationService, AndroidAuthService } from '../android-luma-app-complete';

interface SettingsScreenProps {
  onSignOut: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onSignOut }) => {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [dailyCheckins, setDailyCheckins] = useState(true);
  const [journalReminders, setJournalReminders] = useState(true);
  const [memoryInsights, setMemoryInsights] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const notificationService = new AndroidNotificationService();
  const authService = new AndroidAuthService();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const status = await notificationService.getNotificationStatus();
      setPushNotifications(status.enabled);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handlePushNotificationsToggle = async (value: boolean) => {
    try {
      setIsLoading(true);
      
      if (value) {
        const result = await notificationService.requestPermissions();
        if (result.success) {
          setPushNotifications(true);
          Alert.alert('Success', 'Push notifications enabled');
        } else {
          Alert.alert('Error', result.error || 'Failed to enable push notifications');
        }
      } else {
        setPushNotifications(false);
        Alert.alert('Info', 'Push notifications disabled');
      }
    } catch (error) {
      console.error('Error toggling push notifications:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await authService.signOut();
              onSignOut();
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear Data',
      'This will clear all your conversation history and journal entries. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Feature Coming Soon', 'Data clearing functionality will be available in a future update');
          }
        }
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert('Feature Coming Soon', 'Data export functionality will be available in a future update');
  };

  const SettingItem = ({ 
    title, 
    subtitle, 
    value, 
    onValueChange, 
    disabled = false 
  }: {
    title: string;
    subtitle?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
  }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingTextContainer}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled || isLoading}
        trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
        thumbColor={value ? '#FFFFFF' : '#FFFFFF'}
        ios_backgroundColor="#E5E7EB"
      />
    </View>
  );

  const ActionItem = ({
    title,
    subtitle,
    onPress,
    destructive = false
  }: {
    title: string;
    subtitle?: string;
    onPress: () => void;
    destructive?: boolean;
  }) => (
    <TouchableOpacity
      style={styles.actionItem}
      onPress={onPress}
      disabled={isLoading}
    >
      <View style={styles.settingTextContainer}>
        <Text style={[styles.settingTitle, destructive && styles.destructiveText]}>
          {title}
        </Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <Text style={[styles.arrow, destructive && styles.destructiveText]}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              title="Push Notifications"
              subtitle="Receive notifications from Luma"
              value={pushNotifications}
              onValueChange={handlePushNotificationsToggle}
            />
            <SettingItem
              title="Daily Check-ins"
              subtitle="Get reminded to check in daily"
              value={dailyCheckins}
              onValueChange={setDailyCheckins}
              disabled={!pushNotifications}
            />
            <SettingItem
              title="Journal Reminders"
              subtitle="Reminders to write in your journal"
              value={journalReminders}
              onValueChange={setJournalReminders}
              disabled={!pushNotifications}
            />
            <SettingItem
              title="Memory Insights"
              subtitle="Notifications about your growth and patterns"
              value={memoryInsights}
              onValueChange={setMemoryInsights}
              disabled={!pushNotifications}
            />
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Data</Text>
          <View style={styles.sectionContent}>
            <ActionItem
              title="Export Data"
              subtitle="Download your conversation and journal data"
              onPress={handleExportData}
            />
            <ActionItem
              title="Clear Data"
              subtitle="Delete all your conversations and entries"
              onPress={handleClearData}
              destructive
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.sectionContent}>
            <View style={styles.infoItem}>
              <Text style={styles.settingTitle}>Version</Text>
              <Text style={styles.settingSubtitle}>1.0.0</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.settingTitle}>Build</Text>
              <Text style={styles.settingSubtitle}>2024.01</Text>
            </View>
          </View>
        </View>

        {/* Sign Out Section */}
        <View style={[styles.section, styles.signOutSection]}>
          <View style={styles.sectionContent}>
            <ActionItem
              title="Sign Out"
              subtitle="Sign out of your Luma account"
              onPress={handleSignOut}
              destructive
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    paddingTop: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  arrow: {
    fontSize: 20,
    color: '#9CA3AF',
    fontWeight: '300',
  },
  destructiveText: {
    color: '#EF4444',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  signOutSection: {
    marginBottom: 40,
  },
});

export default SettingsScreen;