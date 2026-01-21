'use client'

import { useEffect, useState } from 'react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [topics, setTopics] = useState<string[]>([])
  const [newTopic, setNewTopic] = useState('')
  const [tone, setTone] = useState('')
  const [frequency, setFrequency] = useState<'daily' | 'twice_daily' | 'weekly'>('daily')
  const [success, setSuccess] = useState(false)
  const [isAiConnected, setIsAiConnected] = useState(false)
  const [isGeminiConnected, setIsGeminiConnected] = useState(false)
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [stabilityApiKey, setStabilityApiKey] = useState('')
  const [showStabilityKey, setShowStabilityKey] = useState(false)
  const [isStabilityConnected, setIsStabilityConnected] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      const data = await response.json()

      if (data.profile) {
        setTopics(data.profile.topics || [])
        setTone(data.profile.tone || '')
        setFrequency(data.profile.posting_frequency || 'daily')
        // Don't set the actual key, just show if it exists
        if (data.profile.gemini_api_key) {
          setGeminiApiKey('') // Keep empty, user can update if needed
        }
      }
      
      setIsAiConnected(data.isAiConnected || false)
      setIsGeminiConnected(data.isGeminiConnected || false)
      setIsStabilityConnected(data.isStabilityConnected || false)
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)

    try {
      const payload = {
        topics,
        tone,
        posting_frequency: frequency,
        gemini_api_key: geminiApiKey || null,
        stability_api_key: stabilityApiKey || null,
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

        {/* AI Status Card - Read Only */}
        <div className={`rounded-lg p-6 ${isAiConnected ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isAiConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <div>
                <h3 className={`font-semibold ${isAiConnected ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
                  {isAiConnected ? '✓ AI Powered by Claude' : '⚠ AI Not Available'}
                </h3>
                <p className={`text-sm ${isAiConnected ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                  {isAiConnected 
                    ? 'Using built-in Claude 3.5 Sonnet for content generation' 
                    : 'Contact administrator to configure Claude API key'}
                </p>
              </div>
            </div>
            {isAiConnected && (
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                Ready
              </span>
            )}
          </div>
        </div>

        {/* AI Image Generation */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border-2 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white text-xl">🎨</span>
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  AI Image Generation
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Gemini + Stability AI for stunning images
                </p>
              </div>
            </div>
            {isGeminiConnected && isStabilityConnected && (
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100">
                Fully Connected
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* Gemini API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gemini API Key (for image prompts)
              </label>
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <input
                    type={showGeminiKey ? 'text' : 'password'}
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-gray-900 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    placeholder={isGeminiConnected ? '••••••••••••••••' : 'AIza...'}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {showGeminiKey ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Get from{' '}
                <a
                  href="https://makersuite.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-500 dark:text-purple-400"
                >
                  Google AI Studio
                </a>
              </p>
            </div>

            {/* Stability API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stability AI API Key (for image generation)
              </label>
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <input
                    type={showStabilityKey ? 'text' : 'password'}
                    value={stabilityApiKey}
                    onChange={(e) => setStabilityApiKey(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-gray-900 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    placeholder={isStabilityConnected ? '••••••••••••••••' : 'sk-...'}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowStabilityKey(!showStabilityKey)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {showStabilityKey ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Get from{' '}
                <a
                  href="https://platform.stability.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-500 dark:text-purple-400"
                >
                  Stability AI Platform
                </a>
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md p-4">
              <h3 className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-2">
                ✨ Complete Image Pipeline
              </h3>
              <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1 list-disc list-inside">
                <li><strong>Step 1:</strong> Claude generates post content</li>
                <li><strong>Step 2:</strong> Gemini creates detailed image prompt</li>
                <li><strong>Step 3:</strong> Stability AI generates high-quality image</li>
                <li><strong>Step 4:</strong> Image uploaded to Supabase Storage</li>
                <li><strong>Step 5:</strong> Post published with image attached</li>
              </ul>
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
                className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:bg-gray-700 dark:text-white dark:border-gray-600"
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
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-200"
                >
                  {topic}
                  <button
                    type="button"
                    onClick={() => removeTopic(topic)}
                    className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full text-indigo-600 hover:bg-indigo-200 dark:text-indigo-400 dark:hover:bg-indigo-800"
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
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                placeholder="e.g., professional, casual, humorous"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-gray-900 dark:bg-gray-700 dark:text-white dark:border-gray-600"
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
                AI Powered by Claude (built-in)
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
                <a href="/training" className="text-indigo-600 hover:text-indigo-500">Configure training</a> (optional requirements)
              </span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-5 h-5 flex items-center justify-center rounded-full text-xs bg-gray-100 text-gray-400">5</span>
              <span className="text-gray-600 dark:text-gray-400">
                <a href="/schedule" className="text-indigo-600 hover:text-indigo-500">Configure schedule</a> (days & times)
              </span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-5 h-5 flex items-center justify-center rounded-full text-xs bg-gray-100 text-gray-400">6</span>
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
