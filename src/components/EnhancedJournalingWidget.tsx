// Enhanced Journaling Widget - More prominent and user-friendly
import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, Send, X, FileText, Calendar, Clock } from 'lucide-react';
import { generateJournalPrompt, submitJournalEntry } from '../lib/auth';
import { getCurrentUser } from '../lib/auth';

interface JournalEntry {
  id: string;
  created_at: string;
  prompt: string;
  content: string;
  word_count: number;
}

interface EnhancedJournalingWidgetProps {
  onClose: () => void;
}

const EnhancedJournalingWidget: React.FC<EnhancedJournalingWidgetProps> = ({ onClose }) => {
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [promptType, setPromptType] = useState('');
  const [journalContent, setJournalContent] = useState('');
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'write' | 'history'>('write');

  useEffect(() => {
    loadRecentEntries();
  }, []);

  const loadRecentEntries = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      // This would typically fetch from Supabase
      // For now, we'll show a placeholder
      console.log('Loading recent journal entries for user:', user.id);
    } catch (error) {
      console.error('Error loading recent entries:', error);
    }
  };

  const handleGeneratePrompt = async () => {
    try {
      setIsGeneratingPrompt(true);
      setMessage('');
      
      const user = await getCurrentUser();
      if (!user) {
        setMessage('Please log in to generate journal prompts');
        return;
      }

      console.log('Generating journal prompt for user:', user.id);
      const result = await generateJournalPrompt(user.id);
      
      if (result && result.data) {
        setCurrentPrompt(result.data.prompt || 'What emotions are you experiencing right now, and what might be causing them?');
        setPromptType(result.data.type || 'reflection');
        setMessage('✨ New AI-generated prompt based on your recent conversations!');
      } else {
        // Fallback prompt
        setCurrentPrompt('What emotions are you experiencing right now, and what might be causing them?');
        setMessage('✨ Here\'s a thoughtful prompt to get you started!');
      }
    } catch (error) {
      console.error('Error generating prompt:', error);
      // Provide a fallback prompt even on error
      setCurrentPrompt('Take a moment to reflect on your day. What stood out to you most?');
      setMessage('Here\'s a reflective prompt to begin your journaling journey.');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleSubmitEntry = async () => {
    if (!journalContent.trim() || !currentPrompt) {
      setMessage('Please write something before submitting');
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage('');
      
      const user = await getCurrentUser();
      if (!user) {
        setMessage('Please log in to save journal entries');
        return;
      }

      console.log('Submitting journal entry for user:', user.id);
      await submitJournalEntry(user.id, currentPrompt, journalContent);
      setMessage('✅ Journal entry saved successfully! Your thoughts have been captured.');
      setJournalContent('');
      setCurrentPrompt('');
      setPromptType('');
      loadRecentEntries(); // Refresh the list
    } catch (error) {
      console.error('Error submitting journal entry:', error);
      setMessage('Failed to save entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPromptTypeColor = (type: string) => {
    const colors = {
      'future_vision': 'bg-purple-100 text-purple-800 border-purple-200',
      'growth_reflection': 'bg-green-100 text-green-800 border-green-200',
      'gratitude_reflection': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'values_clarification': 'bg-blue-100 text-blue-800 border-blue-200',
      'reflection': 'bg-indigo-100 text-indigo-800 border-indigo-200'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BookOpen className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold">AI-Powered Journaling</h2>
                <p className="text-indigo-100 text-sm">Reflect, grow, and discover insights about yourself</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl font-bold hover:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('write')}
            className={`flex-1 py-3 px-4 font-medium text-sm transition-colors ${
              activeTab === 'write'
                ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Write Entry
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 font-medium text-sm transition-colors ${
              activeTab === 'history'
                ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            My Entries
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'write' && (
            <div className="p-6 space-y-6">
              {/* Prompt Generation */}
              {!currentPrompt && (
                <div className="text-center py-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-dashed border-indigo-200">
                  <BookOpen className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
                  <p className="text-gray-700 mb-4 text-lg">
                    Ready to start journaling? Let AI create a personalized prompt for you.
                  </p>
                  <p className="text-gray-500 text-sm mb-6">
                    Our AI analyzes your recent conversations to suggest meaningful topics for reflection.
                  </p>
                  <button
                    onClick={handleGeneratePrompt}
                    disabled={isGeneratingPrompt}
                    className="flex items-center space-x-2 mx-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all transform hover:scale-105 disabled:transform-none"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span className="font-medium">
                      {isGeneratingPrompt ? 'Creating Your Prompt...' : 'Generate AI Prompt'}
                    </span>
                  </button>
                </div>
              )}

              {/* Current Prompt */}
              {currentPrompt && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-indigo-900 text-lg">Your Personalized Prompt</h3>
                    {promptType && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPromptTypeColor(promptType)}`}>
                        {promptType.replace('_', ' ').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-indigo-800 text-lg leading-relaxed mb-4">{currentPrompt}</p>
                  <button
                    onClick={handleGeneratePrompt}
                    disabled={isGeneratingPrompt}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium underline transition-colors"
                  >
                    {isGeneratingPrompt ? 'Generating...' : 'Generate New Prompt'}
                  </button>
                </div>
              )}

              {/* Journal Input */}
              {currentPrompt && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">Your Reflection</h3>
                    <span className="text-sm text-gray-500 flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Take your time
                    </span>
                  </div>
                  <textarea
                    value={journalContent}
                    onChange={(e) => setJournalContent(e.target.value)}
                    placeholder="Start writing your thoughts here... Let your mind wander and explore your feelings."
                    className="w-full h-48 p-4 border-2 border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700 leading-relaxed"
                    style={{ fontFamily: 'Georgia, serif' }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {journalContent.length} characters • {Math.ceil(journalContent.split(' ').length)} words
                    </span>
                    <button
                      onClick={handleSubmitEntry}
                      disabled={isSubmitting || !journalContent.trim()}
                      className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all transform hover:scale-105 disabled:transform-none font-medium"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmitting ? 'Saving...' : 'Save Entry'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Message */}
              {message && (
                <div className={`p-4 rounded-xl border-l-4 ${
                  message.includes('✅') || message.includes('✨') 
                    ? 'bg-green-50 border-green-400 text-green-800' 
                    : 'bg-red-50 border-red-400 text-red-800'
                }`}>
                  <p className="font-medium">{message}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="p-6">
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">Your Journal History</h3>
                <p className="text-gray-500">
                  Your past journal entries will appear here. Start writing to build your collection of reflections!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedJournalingWidget;