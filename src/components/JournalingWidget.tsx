// Journaling Widget - Integrates with Edge Functions
import React, { useState } from 'react'
import { BookOpen, Sparkles, Send } from 'lucide-react'
import { generateJournalPrompt, submitJournalEntry } from '../lib/auth'
import { getCurrentUser } from '../lib/auth'

const JournalingWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentPrompt, setCurrentPrompt] = useState('')
  const [journalContent, setJournalContent] = useState('')
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const handleGeneratePrompt = async () => {
    try {
      setIsGeneratingPrompt(true)
      setMessage('')
      
      const user = await getCurrentUser()
      if (!user) {
        setMessage('Please log in to generate journal prompts')
        return
      }

      const result = await generateJournalPrompt(user.id)
      setCurrentPrompt(result.data.prompt)
      setMessage('✨ New prompt generated based on your recent conversations!')
    } catch (error) {
      console.error('Error generating prompt:', error)
      setMessage('Failed to generate prompt. Please try again.')
    } finally {
      setIsGeneratingPrompt(false)
    }
  }

  const handleSubmitEntry = async () => {
    if (!journalContent.trim() || !currentPrompt) {
      setMessage('Please write something before submitting')
      return
    }

    try {
      setIsSubmitting(true)
      setMessage('')
      
      const user = await getCurrentUser()
      if (!user) {
        setMessage('Please log in to save journal entries')
        return
      }

      await submitJournalEntry(user.id, currentPrompt, journalContent)
      setMessage('✅ Journal entry saved successfully!')
      setJournalContent('')
      setCurrentPrompt('')
    } catch (error) {
      console.error('Error submitting journal entry:', error)
      setMessage('Failed to save entry. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-20 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105"
        >
          <BookOpen className="w-6 h-6" />
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-20 right-4 w-80 bg-white rounded-xl shadow-xl border z-50">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5" />
            <h3 className="font-semibold">AI Journaling</h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white text-xl"
          >
            ×
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {/* Prompt Generation */}
        {!currentPrompt && (
          <div className="text-center">
            <p className="text-gray-600 text-sm mb-3">
              Generate a personalized journal prompt based on your recent conversations
            </p>
            <button
              onClick={handleGeneratePrompt}
              disabled={isGeneratingPrompt}
              className="flex items-center space-x-2 mx-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGeneratingPrompt ? 'Generating...' : 'Generate Prompt'}</span>
            </button>
          </div>
        )}

        {/* Current Prompt */}
        {currentPrompt && (
          <div className="bg-indigo-50 p-3 rounded-lg">
            <h4 className="font-medium text-indigo-900 mb-2">Your Prompt:</h4>
            <p className="text-indigo-800 text-sm">{currentPrompt}</p>
            <button
              onClick={handleGeneratePrompt}
              disabled={isGeneratingPrompt}
              className="mt-2 text-indigo-600 hover:text-indigo-800 text-xs underline"
            >
              Generate new prompt
            </button>
          </div>
        )}

        {/* Journal Input */}
        {currentPrompt && (
          <div>
            <textarea
              value={journalContent}
              onChange={(e) => setJournalContent(e.target.value)}
              placeholder="Start writing your thoughts..."
              className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">
                {journalContent.length} characters
              </span>
              <button
                onClick={handleSubmitEntry}
                disabled={isSubmitting || !journalContent.trim()}
                className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm transition-colors"
              >
                <Send className="w-3 h-3" />
                <span>{isSubmitting ? 'Saving...' : 'Save Entry'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`text-sm p-2 rounded ${
            message.includes('✅') || message.includes('✨') 
              ? 'bg-green-50 text-green-800' 
              : 'bg-red-50 text-red-800'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}

export default JournalingWidget