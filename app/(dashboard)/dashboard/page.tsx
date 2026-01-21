'use client'

import { useState } from 'react'

interface PlatformPost {
  postId: string
  platform: 'x' | 'telegram' | 'linkedin'
  content: string
  scheduledFor: string
}

interface GenerateResult {
  success: boolean
  masterContent: string
  posts: PlatformPost[]
  imageUrl?: string
  imagePrompt?: string
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(false)
  const [loadingWithImage, setLoadingWithImage] = useState(false)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGeneratePost = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/posts/generate', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate post')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePostWithImage = async () => {
    setLoadingWithImage(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/posts/generate-with-image', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate post with image')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingWithImage(false)
    }
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 gap-6">
        {/* Generate Post Card */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Generate & Schedule Post
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Generate a new post using AI and schedule it for optimal publishing time.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleGeneratePost}
                disabled={loading || loadingWithImage}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Post'}
              </button>
              <button
                onClick={handleGeneratePostWithImage}
                disabled={loading || loadingWithImage}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
              >
                {loadingWithImage ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating with Image...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Generate Post with Image
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {result && (
              <div className="mt-4 space-y-3">
                <div className="rounded-md bg-green-50 p-4 border border-green-200">
                  <h4 className="text-sm font-medium text-green-800 mb-2">
                    ✅ {result.posts.length} Posts Generated & Scheduled!
                  </h4>
                  <p className="text-xs text-green-600 mb-3">
                    Scheduled for: {new Date(result.posts[0]?.scheduledFor || '').toLocaleString()}
                  </p>
                  
                  {result.imageUrl && (
                    <div className="mt-3 mb-4 p-3 bg-white rounded border border-green-100">
                      <h5 className="text-xs font-semibold text-gray-700 mb-2">🖼️ Generated Image</h5>
                      <img
                        src={result.imageUrl}
                        alt="Generated post image"
                        className="w-full max-w-md rounded-lg shadow-md"
                      />
                      {result.imagePrompt && (
                        <p className="text-xs text-gray-500 mt-2 italic">
                          Prompt: {result.imagePrompt}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {result.posts.map((post) => (
                    <div key={post.postId} className="mt-3 p-3 bg-white rounded border border-green-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-700 uppercase">
                          {post.platform === 'x' ? '𝕏 Twitter' : post.platform === 'telegram' ? '✈️ Telegram' : post.platform}
                        </span>
                        <span className="text-xs text-gray-500">{post.content.length} chars</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Quick Stats
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              View detailed statistics in the Metrics page.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


