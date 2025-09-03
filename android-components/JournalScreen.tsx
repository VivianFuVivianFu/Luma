// JournalScreen.tsx - React Native Journal Component for Luma AI
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  RefreshControl,
  Modal,
  Dimensions
} from 'react-native';
import { 
  generateJournalPrompt,
  submitJournalEntry,
  getUserJournalEntries
} from '../android-luma-app-complete';

interface JournalEntry {
  id: string;
  created_at: string;
  prompt: string;
  content: string;
  word_count: number;
}

const { height: screenHeight } = Dimensions.get('window');

const JournalScreen: React.FC = () => {
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [promptType, setPromptType] = useState('');
  const [journalContent, setJournalContent] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadJournalEntries();
  }, []);

  const loadJournalEntries = async () => {
    try {
      setIsLoading(true);
      const userEntries = await getUserJournalEntries(20, 0);
      setEntries(userEntries);
    } catch (error) {
      console.error('Error loading journal entries:', error);
      Alert.alert('Error', 'Failed to load journal entries');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJournalEntries();
    setRefreshing(false);
  };

  const handleGeneratePrompt = async () => {
    try {
      setIsGeneratingPrompt(true);
      const { prompt, type, error } = await generateJournalPrompt();
      
      if (error) {
        Alert.alert('Error', error);
        return;
      }

      setCurrentPrompt(prompt);
      setPromptType(type);
      setShowWriteModal(true);
    } catch (error) {
      console.error('Error generating prompt:', error);
      Alert.alert('Error', 'Failed to generate journal prompt');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleSubmitEntry = async () => {
    if (!journalContent.trim()) {
      Alert.alert('Error', 'Please write something before submitting');
      return;
    }

    try {
      setIsSubmitting(true);
      const { success, entryId, error } = await submitJournalEntry(currentPrompt, journalContent);
      
      if (success) {
        Alert.alert('Success', 'Journal entry saved successfully!');
        setJournalContent('');
        setCurrentPrompt('');
        setPromptType('');
        setShowWriteModal(false);
        await loadJournalEntries(); // Refresh the list
      } else {
        Alert.alert('Error', error || 'Failed to save journal entry');
      }
    } catch (error) {
      console.error('Error submitting journal:', error);
      Alert.alert('Error', 'Failed to save journal entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPromptTypeColor = (type: string) => {
    switch (type) {
      case 'future_vision':
        return '#8B5CF6';
      case 'growth_reflection':
        return '#10B981';
      case 'gratitude_reflection':
        return '#F59E0B';
      case 'values_clarification':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const renderJournalEntry = (entry: JournalEntry) => (
    <View key={entry.id} style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <Text style={styles.entryDate}>{formatDate(entry.created_at)}</Text>
        <Text style={styles.wordCount}>{entry.word_count} words</Text>
      </View>
      <Text style={styles.entryPrompt}>{entry.prompt}</Text>
      <Text style={styles.entryContent} numberOfLines={3}>
        {entry.content}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Journal</Text>
        <TouchableOpacity
          onPress={handleGeneratePrompt}
          style={styles.generateButton}
          disabled={isGeneratingPrompt}
        >
          <Text style={styles.generateButtonText}>
            {isGeneratingPrompt ? 'Generating...' : 'New Prompt'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Journal Entries List */}
      <ScrollView
        style={styles.entriesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading journal entries...</Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No journal entries yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap "New Prompt" to get started with AI-generated writing prompts
            </Text>
          </View>
        ) : (
          entries.map(renderJournalEntry)
        )}
      </ScrollView>

      {/* Write Journal Modal */}
      <Modal
        visible={showWriteModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowWriteModal(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Write Journal Entry</Text>
            <TouchableOpacity
              onPress={handleSubmitEntry}
              style={[styles.saveButton, !journalContent.trim() && styles.saveButtonDisabled]}
              disabled={!journalContent.trim() || isSubmitting}
            >
              <Text style={styles.saveButtonText}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Current Prompt */}
            {currentPrompt ? (
              <View style={styles.promptContainer}>
                <View style={styles.promptHeader}>
                  <Text style={styles.promptLabel}>Today's Prompt</Text>
                  {promptType && (
                    <View style={[styles.promptTypeBadge, { backgroundColor: getPromptTypeColor(promptType) }]}>
                      <Text style={styles.promptTypeText}>
                        {promptType.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.promptText}>{currentPrompt}</Text>
                <TouchableOpacity
                  onPress={handleGeneratePrompt}
                  style={styles.newPromptButton}
                  disabled={isGeneratingPrompt}
                >
                  <Text style={styles.newPromptButtonText}>
                    {isGeneratingPrompt ? 'Generating...' : 'Generate New Prompt'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noPromptContainer}>
                <TouchableOpacity
                  onPress={handleGeneratePrompt}
                  style={styles.generatePromptButton}
                  disabled={isGeneratingPrompt}
                >
                  <Text style={styles.generatePromptButtonText}>
                    {isGeneratingPrompt ? 'Generating Prompt...' : 'Generate AI Prompt'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Journal Text Input */}
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.journalTextInput}
                value={journalContent}
                onChangeText={setJournalContent}
                placeholder="Start writing your thoughts..."
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                maxLength={50000}
              />
              <Text style={styles.characterCount}>
                {journalContent.length} characters
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  generateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  entriesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryDate: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  wordCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  entryPrompt: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
    marginBottom: 8,
    lineHeight: 20,
  },
  entryContent: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cancelButton: {
    paddingVertical: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#10B981',
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  promptContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  promptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  promptLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  promptTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  promptTypeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  promptText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 12,
  },
  newPromptButton: {
    alignSelf: 'flex-start',
  },
  newPromptButtonText: {
    fontSize: 14,
    color: '#8B5CF6',
    textDecorationLine: 'underline',
  },
  noPromptContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  generatePromptButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
  },
  generatePromptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  textInputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    minHeight: screenHeight * 0.4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  journalTextInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
    textAlignVertical: 'top',
    minHeight: screenHeight * 0.3,
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 8,
  },
});

export default JournalScreen;