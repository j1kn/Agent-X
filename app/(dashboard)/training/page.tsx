'use client'

import { useEffect, useState } from 'react'
import { TrainingProfileV2 } from '@/lib/types/training'

export default function TrainingPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [trainingInstructions, setTrainingInstructions] = useState('')
  const [success, setSuccess] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  // Training Profile V2 state
  const [profileV2, setProfileV2] = useState<TrainingProfileV2>({})

  useEffect(() => {
    fetchTraining()
  }, [])

  const fetchTraining = async () => {
    try {
      const response = await fetch('/api/training')
      const data = await response.json()

      if (data.profile) {
        setTrainingInstructions(data.profile.training_instructions || '')
        
        // Load training_profile_v2 if it exists
        if (data.profile.training_profile_v2) {
          setProfileV2(data.profile.training_profile_v2)
          setShowAdvanced(true) // Auto-expand if data exists
        }
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
        body: JSON.stringify({ 
          training_instructions: trainingInstructions,
          training_profile_v2: Object.keys(profileV2).length > 0 ? profileV2 : null
        }),
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

  const updateProfileV2 = (section: keyof TrainingProfileV2, value: unknown) => {
    setProfileV2(prev => ({
      ...prev,
      [section]: value
    }))
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

        {/* Basic Training Instructions (Existing) */}
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

        {/* Advanced Training (Optional - Training Profile V2) */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-left"
          >
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Advanced Training (Optional)
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Structured training profile for enhanced post quality
              </p>
            </div>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAdvanced && (
            <div className="mt-6 space-y-6">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ <strong>Optional:</strong> These fields are completely optional. Leave them empty to use basic training instructions only.
                </p>
              </div>

              {/* Brand Identity */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                  Brand Identity
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <input
                    type="text"
                    placeholder="Company Name"
                    value={profileV2.brand_identity?.company_name || ''}
                    onChange={(e) => updateProfileV2('brand_identity', {
                      ...profileV2.brand_identity,
                      company_name: e.target.value
                    })}
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                  <input
                    type="text"
                    placeholder="Website URL"
                    value={profileV2.brand_identity?.website_url || ''}
                    onChange={(e) => updateProfileV2('brand_identity', {
                      ...profileV2.brand_identity,
                      website_url: e.target.value
                    })}
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                  <textarea
                    placeholder="Short Description (1-2 sentences)"
                    value={profileV2.brand_identity?.short_description || ''}
                    onChange={(e) => updateProfileV2('brand_identity', {
                      ...profileV2.brand_identity,
                      short_description: e.target.value
                    })}
                    rows={2}
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                  <input
                    type="text"
                    placeholder="Industry (e.g., SaaS, AI, FinTech)"
                    value={profileV2.brand_identity?.industry || ''}
                    onChange={(e) => updateProfileV2('brand_identity', {
                      ...profileV2.brand_identity,
                      industry: e.target.value
                    })}
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                  <input
                    type="text"
                    placeholder="Target Audience"
                    value={profileV2.brand_identity?.target_audience || ''}
                    onChange={(e) => updateProfileV2('brand_identity', {
                      ...profileV2.brand_identity,
                      target_audience: e.target.value
                    })}
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                </div>
              </div>

              {/* Voice Rules */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                  Voice & Tone Rules
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <input
                    type="text"
                    placeholder="Writing Style (e.g., conversational, professional, witty)"
                    value={profileV2.voice_rules?.writing_style || ''}
                    onChange={(e) => updateProfileV2('voice_rules', {
                      ...profileV2.voice_rules,
                      writing_style: e.target.value
                    })}
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                  <input
                    type="text"
                    placeholder="Sentence Length (e.g., short, medium, varied)"
                    value={profileV2.voice_rules?.sentence_length || ''}
                    onChange={(e) => updateProfileV2('voice_rules', {
                      ...profileV2.voice_rules,
                      sentence_length: e.target.value
                    })}
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                  <textarea
                    placeholder="Preferred Phrases (comma-separated)"
                    value={profileV2.voice_rules?.preferred_phrases?.join(', ') || ''}
                    onChange={(e) => updateProfileV2('voice_rules', {
                      ...profileV2.voice_rules,
                      preferred_phrases: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    rows={2}
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                  <textarea
                    placeholder="Forbidden Phrases (comma-separated)"
                    value={profileV2.voice_rules?.forbidden_phrases?.join(', ') || ''}
                    onChange={(e) => updateProfileV2('voice_rules', {
                      ...profileV2.voice_rules,
                      forbidden_phrases: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    rows={2}
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                </div>
              </div>

              {/* Topics */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                  Topics & Keywords
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <textarea
                    placeholder="Primary Topics (comma-separated)"
                    value={profileV2.topics?.primary?.join(', ') || ''}
                    onChange={(e) => updateProfileV2('topics', {
                      ...profileV2.topics,
                      primary: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    rows={2}
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                  <textarea
                    placeholder="Secondary Topics (comma-separated)"
                    value={profileV2.topics?.secondary?.join(', ') || ''}
                    onChange={(e) => updateProfileV2('topics', {
                      ...profileV2.topics,
                      secondary: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    rows={2}
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                  <textarea
                    placeholder="Forbidden Topics (comma-separated)"
                    value={profileV2.topics?.forbidden?.join(', ') || ''}
                    onChange={(e) => updateProfileV2('topics', {
                      ...profileV2.topics,
                      forbidden: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    rows={2}
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                </div>
              </div>

              {/* Image Rules */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                  Image Generation Rules
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <textarea
                    placeholder="Image Style (e.g., modern digital art, photorealistic, minimalist)"
                    value={profileV2.image_rules?.style_profile?.style || ''}
                    onChange={(e) => updateProfileV2('image_rules', {
                      ...profileV2.image_rules,
                      style_profile: {
                        ...profileV2.image_rules?.style_profile,
                        style: e.target.value
                      }
                    })}
                    rows={2}
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                  <input
                    type="text"
                    placeholder="Color Palette (comma-separated)"
                    value={profileV2.image_rules?.style_profile?.colour_palette?.join(', ') || ''}
                    onChange={(e) => updateProfileV2('image_rules', {
                      ...profileV2.image_rules,
                      style_profile: {
                        ...profileV2.image_rules?.style_profile,
                        colour_palette: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }
                    })}
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                  <input
                    type="text"
                    placeholder="Mood (e.g., energetic, calm, professional)"
                    value={profileV2.image_rules?.style_profile?.mood || ''}
                    onChange={(e) => updateProfileV2('image_rules', {
                      ...profileV2.image_rules,
                      style_profile: {
                        ...profileV2.image_rules?.style_profile,
                        mood: e.target.value
                      }
                    })}
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                </div>
              </div>

              {/* CTA Rules */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                  Call-to-Action Rules
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <input
                    type="text"
                    placeholder="Placement (e.g., end, middle, none)"
                    value={profileV2.cta_rules?.placement || ''}
                    onChange={(e) => updateProfileV2('cta_rules', {
                      ...profileV2.cta_rules,
                      placement: e.target.value
                    })}
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                  <textarea
                    placeholder="Reusable CTAs (one per line)"
                    value={profileV2.cta_rules?.reusable_ctas?.join('\n') || ''}
                    onChange={(e) => updateProfileV2('cta_rules', {
                      ...profileV2.cta_rules,
                      reusable_ctas: e.target.value.split('\n').map(s => s.trim()).filter(Boolean)
                    })}
                    rows={3}
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                </div>
              </div>

              {/* Compliance */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                  Compliance & Restrictions
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <textarea
                    placeholder="Restricted Claims (comma-separated)"
                    value={profileV2.compliance?.restricted_claims?.join(', ') || ''}
                    onChange={(e) => updateProfileV2('compliance', {
                      ...profileV2.compliance,
                      restricted_claims: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    rows={2}
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                  <textarea
                    placeholder="Mandatory Disclaimers (one per line)"
                    value={profileV2.compliance?.mandatory_disclaimers?.join('\n') || ''}
                    onChange={(e) => updateProfileV2('compliance', {
                      ...profileV2.compliance,
                      mandatory_disclaimers: e.target.value.split('\n').map(s => s.trim()).filter(Boolean)
                    })}
                    rows={2}
                    className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                </div>
              </div>
            </div>
          )}
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
