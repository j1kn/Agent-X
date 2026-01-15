'use client'

import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGeneratePost = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/cf448d43-4ded-4ee7-8c96-eedcb592b608',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:10',message:'CLIENT - Generate Post button clicked',data:{environment:'client',hasProcessEnv:typeof process!=='undefined',windowDefined:typeof window!=='undefined'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    try {
      const response = await fetch('/api/posts/generate', {
        method: 'POST',
      })

      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/cf448d43-4ded-4ee7-8c96-eedcb592b608',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:16',message:'CLIENT - Received response from API',data:{status:response.status,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      const data = await response.json()

      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/cf448d43-4ded-4ee7-8c96-eedcb592b608',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:20',message:'CLIENT - Parsed JSON response',data:{hasError:!!data.error,errorMsg:data.error||'none'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate post')
      }

      setResult(data)
    } catch (err: any) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/cf448d43-4ded-4ee7-8c96-eedcb592b608',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:27',message:'CLIENT - Error caught',data:{errorMessage:err.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      setError(err.message)
    } finally {
      setLoading(false)
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
            <button
              onClick={handleGeneratePost}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Post'}
            </button>

            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {result && (
              <div className="mt-4 rounded-md bg-green-50 p-4">
                <h4 className="text-sm font-medium text-green-800 mb-2">Post Generated!</h4>
                <p className="text-sm text-green-700 mb-2">{result.content}</p>
                <p className="text-xs text-green-600">
                  Scheduled for: {new Date(result.scheduledFor).toLocaleString()}
                </p>
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


