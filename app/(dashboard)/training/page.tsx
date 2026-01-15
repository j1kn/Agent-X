'use client'

import { useEffect, useState } from 'react'

export default function TrainingPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [trainingInstructions, setTrainingInstructions] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchTraining()
  }, [])

  const fetchTraining = async () => {
    try {
      const response = await fetch('/api/training')
      const data = await response.json()

      if (data.profile) {
        setTrainingInstructions(data.profile.training_instructions || '')
      }
    } catch (error) {
      console.error('Failed to fetch training:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)

    try {
      const response = await fetch('/api/training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ training_instructions: trainingInstructions }),
      })

      if (!response.ok) {
        throw new Error('Failed to save training instructions')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save training:', error)
      alert('Failed to save training instructions')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-gray-900 dark:text-white">Loading...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Knowledge / Training
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Define Agent X's constitution. These instructions will be included in every post generation.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {success && (
          <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
            <p className="text-sm text-green-800 dark:text-green-200">Training instructions saved successfully!</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Training Instructions
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                What should Agent X focus on?
              </label>
              <textarea
                value={trainingInstructions}
                onChange={(e) => setTrainingInstructions(e.target.value)}
                rows={15}
                className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                placeholder={`Example:

Brand Voice:
- Professional yet approachable
- Data-driven with practical insights
- Avoid jargon, explain complex topics simply

Topics to Emphasize:
- AI automation and productivity
- Developer tools and workflows
- Tech industry trends and analysis

Topics to Avoid:
- Political commentary
- Controversial social issues
- Promotional content for competitors

Posting Style:
- Start with a hook or question
- Use specific examples and data
- End with a clear takeaway or call to action
- Keep it concise and scannable`}
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                This content will be injected into every generation prompt as Agent X's guiding principles.
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                💡 Tips for Effective Training
              </h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                <li>Be specific about brand voice and tone</li>
                <li>List topics to emphasize AND topics to avoid</li>
                <li>Include examples of desired posting style</li>
                <li>Define any constraints (character limits, hashtag usage, etc.)</li>
                <li>These instructions persist across all generations</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Training Instructions'}
          </button>
        </div>
      </form>
    </div>
  )
}


