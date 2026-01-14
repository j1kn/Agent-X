'use client'

import { useEffect, useState } from 'react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'anthropic'>('gemini')
  const [aiApiKey, setAiApiKey] = useState('')
  const [defaultModel, setDefaultModel] = useState('')
  const [topics, setTopics] = useState<string[]>([])
  const [newTopic, setNewTopic] = useState('')
  const [tone, setTone] = useState('')
  const [frequency, setFrequency] = useState<'daily' | 'twice_daily' | 'weekly'>('daily')
  const [success, setSuccess] = useState(false)
  const [isAiConnected, setIsAiConnected] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')
  const [validationStatus, setValidationStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      const data = await response.json()

      if (data.profile) {
        setAiProvider(data.profile.ai_provider || 'gemini')
        setDefaultModel(data.profile.default_model || '')
        setTopics(data.profile.topics || [])
        setTone(data.profile.tone || '')
        setFrequency(data.profile.posting_frequency || 'daily')
      }
      
      setIsAiConnected(data.isAiConnected || false)
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    if (!aiApiKey) {
      setValidationMessage('Please enter an API key to test')
      setValidationStatus('error')
      return
    }

    setValidating(true)
    setValidationMessage('')
    setValidationStatus('idle')

    try {
      const response = await fetch('/api/settings/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: aiProvider, api_key: aiApiKey }),
      })

      const data = await response.json()

      if (data.valid) {
        setValidationStatus('success')
        setValidationMessage(data.message || 'Connection successful!')
      } else {
        setValidationStatus('error')
        setValidationMessage(data.message || 'Connection failed')
      }
    } catch (error) {
      setValidationStatus('error')
      setValidationMessage('Failed to test connection')
    } finally {
      setValidating(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)

    try {
      const payload: any = {
        ai_provider: aiProvider,
        default_model: defaultModel,
        topics,
        tone,
        posting_frequency: frequency,
      }

      if (aiApiKey) {
        payload.ai_api_key = aiApiKey
      }

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      setSuccess(true)
      if (aiApiKey) {
        setIsAiConnected(true) // Update connection status
        setAiApiKey('') // Clear API key input after saving
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const addTopic = () => {
    if (newTopic.trim() && !topics.includes(newTopic.trim())) {
      setTopics([...topics, newTopic.trim()])
      setNewTopic('')
    }
  }

  const removeTopic = (topic: string) => {
    setTopics(topics.filter(t => t !== topic))
  }

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'gemini': return 'Google Gemini'
      case 'openai': return 'OpenAI'
      case 'anthropic': return 'Anthropic'
      default: return provider
    }
  }

  if (loading) {
    return <div className="text-gray-900 dark:text-white">Loading...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Settings
      </h1>

      <form onSubmit={handleSave} className="space-y-6">
        {success && (
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">Settings saved successfully!</p>
          </div>
        )}

        {/* AI Connection Status Card */}
        <div className={`rounded-lg p-6 ${isAiConnected ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isAiConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <div>
                <h3 className={`font-semibold ${isAiConnected ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
                  {isAiConnected ? '✓ AI Model Connected' : '⚠ AI Model Not Connected'}
                </h3>
                <p className={`text-sm ${isAiConnected ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                  {isAiConnected 
                    ? `Using ${getProviderName(aiProvider)} for content generation` 
                    : 'Add your API key below to enable AI-powered post generation'}
                </p>
              </div>
            </div>
            {isAiConnected && (
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                Ready for Autopilot
              </span>
            )}
          </div>
        </div>

        {/* AI Provider */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            AI Configuration
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                AI Provider
              </label>
              <select
                value={aiProvider}
                onChange={(e) => {
                  setAiProvider(e.target.value as any)
                  setValidationStatus('idle')
                  setValidationMessage('')
                }}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-gray-900"
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI (GPT-4)</option>
                <option value="anthropic">Anthropic (Claude)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                API Key
              </label>
              <div className="mt-1 flex space-x-2">
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => {
                    setAiApiKey(e.target.value)
                    setValidationStatus('idle')
                    setValidationMessage('')
                  }}
                  className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                  placeholder={isAiConnected ? 'API key saved • Enter new key to replace' : 'Paste your API key here'}
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={validating || !aiApiKey}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {validating ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
              
              {/* Validation feedback */}
              {validationMessage && (
                <p className={`mt-2 text-sm ${validationStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {validationStatus === 'success' ? '✓ ' : '✗ '}{validationMessage}
                </p>
              )}
              
              <p className="mt-1 text-xs text-gray-500">
                Your API key is stored securely and never exposed to the client.
                {aiProvider === 'gemini' && ' Get your key from Google AI Studio.'}
                {aiProvider === 'openai' && ' Get your key from OpenAI Dashboard.'}
                {aiProvider === 'anthropic' && ' Get your key from Anthropic Console.'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Default Model
              </label>
              <select
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-gray-900"
              >
                <option value="">Auto (provider default)</option>
                {aiProvider === 'gemini' && (
                  <>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast)</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro (Advanced)</option>
                  </>
                )}
                {aiProvider === 'openai' && (
                  <>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </>
                )}
                {aiProvider === 'anthropic' && (
                  <>
                    <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                    <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                    <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                  </>
                )}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Select the AI model for content generation.
              </p>
            </div>
          </div>
        </div>

        {/* Topics */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Topics
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Add topics that Agent X will post about. The autopilot will rotate through these intelligently.
          </p>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                placeholder="e.g., AI automation, developer productivity"
              />
              <button
                type="button"
                onClick={addTopic}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {topics.length === 0 && (
                <p className="text-sm text-gray-500">No topics added yet. Add at least one topic for autopilot to work.</p>
              )}
              {topics.map((topic) => (
                <span
                  key={topic}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                >
                  {topic}
                  <button
                    type="button"
                    onClick={() => removeTopic(topic)}
                    className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full text-indigo-600 hover:bg-indigo-200"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Tone & Frequency */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Posting Preferences
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tone
              </label>
              <input
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                placeholder="e.g., professional, casual, humorous"
              />
              <p className="mt-1 text-xs text-gray-500">
                The tone Agent X will use when generating posts.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Posting Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-gray-900"
              >
                <option value="daily">Daily</option>
                <option value="twice_daily">Twice Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
        </div>

        {/* Setup Checklist */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Autopilot Checklist
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Complete these steps to enable fully autonomous posting:
          </p>
          <ul className="space-y-2">
            <li className="flex items-center space-x-2">
              <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs ${isAiConnected ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                {isAiConnected ? '✓' : '1'}
              </span>
              <span className={isAiConnected ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}>
                Connect AI Model (above)
              </span>
            </li>
            <li className="flex items-center space-x-2">
              <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs ${topics.length > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                {topics.length > 0 ? '✓' : '2'}
              </span>
              <span className={topics.length > 0 ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}>
                Add at least one topic
              </span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-5 h-5 flex items-center justify-center rounded-full text-xs bg-gray-100 text-gray-400">3</span>
              <span className="text-gray-600 dark:text-gray-400">
                <a href="/accounts" className="text-indigo-600 hover:text-indigo-500">Connect social accounts</a> (X, Telegram)
              </span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-5 h-5 flex items-center justify-center rounded-full text-xs bg-gray-100 text-gray-400">4</span>
              <span className="text-gray-600 dark:text-gray-400">
                <a href="/schedule" className="text-indigo-600 hover:text-indigo-500">Configure schedule</a> (days & times)
              </span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-5 h-5 flex items-center justify-center rounded-full text-xs bg-gray-100 text-gray-400">5</span>
              <span className="text-gray-600 dark:text-gray-400">
                Turn on Autopilot (toggle in top navigation)
              </span>
            </li>
          </ul>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
