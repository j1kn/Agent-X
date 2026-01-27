'use client'

import { useEffect, useState } from 'react'

interface PostMetric {
  id: string
  post_id: string
  platform: 'telegram' | 'x' | 'linkedin'
  platform_post_id: string
  views: number
  likes: number
  retweets: number
  forwards: number
  reactions: number
  comments: number
  engagement_score: number
  collected_at: string
}

interface PostWithMetrics extends PostMetric {
  post_content?: string
  published_at?: string
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<PostMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [collecting, setCollecting] = useState(false)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/metrics')
      const data = await response.json()
      setMetrics(data.metrics || [])
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const collectMetrics = async () => {
    try {
      setCollecting(true)
      const response = await fetch('/api/metrics/collect', {
        method: 'POST',
      })
      const data = await response.json()
      
      if (data.success) {
        alert(`Metrics collected successfully! ${data.collected} posts updated.`)
        // Refresh metrics
        await fetchMetrics()
      } else {
        alert(`Failed to collect metrics: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to collect metrics:', error)
      alert('Failed to collect metrics. Check console for details.')
    } finally {
      setCollecting(false)
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-gray-900 dark:text-white">Loading metrics...</div>
      </div>
    )
  }

  // Filter Telegram metrics
  const telegramMetrics = metrics.filter(m => m.platform === 'telegram')
  
  // Calculate aggregate stats for Telegram
  const totalPosts = telegramMetrics.length
  const totalViews = telegramMetrics.reduce((sum, m) => sum + (m.views || 0), 0)
  const totalForwards = telegramMetrics.reduce((sum, m) => sum + (m.forwards || 0), 0)
  const totalReactions = telegramMetrics.reduce((sum, m) => sum + (m.reactions || 0), 0)
  const avgEngagement = totalPosts > 0 
    ? (telegramMetrics.reduce((sum, m) => sum + (m.engagement_score || 0), 0) / totalPosts).toFixed(1)
    : 0
  
  // Find best performing post
  const bestPost = telegramMetrics.length > 0
    ? telegramMetrics.reduce((best, current) => 
        (current.engagement_score || 0) > (best.engagement_score || 0) ? current : best
      )
    : null

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Telegram Metrics
        </h1>
        <button
          onClick={collectMetrics}
          disabled={collecting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {collecting ? 'Collecting...' : 'Collect Metrics Now'}
        </button>
      </div>

      {/* Global Telegram Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Total Posts
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
              {totalPosts}
            </dd>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Total Views
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
              {totalViews.toLocaleString()}
            </dd>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Avg Engagement Score
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
              {avgEngagement}
            </dd>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Best Post Score
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
              {bestPost ? bestPost.engagement_score.toFixed(1) : '0'}
            </dd>
          </div>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-6">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Total Forwards
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
              {totalForwards}
            </dd>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Total Reactions
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
              {totalReactions}
            </dd>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Avg Views per Post
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
              {totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0}
            </dd>
          </div>
        </div>
      </div>

      {/* Per-post Table */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Post Performance
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Sorted by engagement score (highest first)
          </p>
        </div>
        
        {telegramMetrics.length === 0 ? (
          <div className="px-4 py-8 sm:px-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No Telegram metrics available yet.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Metrics are collected automatically every 6 hours, or click "Collect Metrics Now" to fetch them immediately.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Post ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Views
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Reactions
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Forwards
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Comments
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Engagement Score
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Collected At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {telegramMetrics
                  .sort((a, b) => (b.engagement_score || 0) - (a.engagement_score || 0))
                  .map((metric) => (
                    <tr key={metric.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {metric.post_id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {metric.views.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {metric.reactions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {metric.forwards}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {metric.comments}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {metric.engagement_score.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(metric.collected_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
          📊 About Telegram Metrics
        </h4>
        <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
          <li>• Metrics are collected automatically every 6 hours</li>
          <li>• Engagement Score = (Views × 0.2) + (Forwards × 3) + (Reactions × 2) + (Comments × 4)</li>
          <li>• Only posts from the last 7 days are tracked</li>
          <li>• Historical snapshots are preserved for trend analysis</li>
        </ul>
      </div>
    </div>
  )
}
