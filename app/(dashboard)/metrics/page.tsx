'use client'

import { useEffect, useState } from 'react'

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/metrics')
      const data = await response.json()
      setMetrics(data.metrics || [])
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-gray-900 dark:text-white">Loading...</div>
  }

  // Calculate aggregate stats
  const totalLikes = metrics.reduce((sum, m) => sum + (m.likes || 0), 0)
  const totalRetweets = metrics.reduce((sum, m) => sum + (m.retweets || 0), 0)
  const totalViews = metrics.reduce((sum, m) => sum + (m.views || 0), 0)
  const avgLikes = metrics.length > 0 ? (totalLikes / metrics.length).toFixed(1) : 0

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Metrics
      </h1>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Total Posts
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
              {metrics.length}
            </dd>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Total Likes
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
              {totalLikes}
            </dd>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Avg Likes per Post
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
              {avgLikes}
            </dd>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Total Views
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
              {totalViews}
            </dd>
          </div>
        </div>
      </div>

      {/* Metrics Table */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Recent Metrics
          </h3>
        </div>
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {metrics.length === 0 ? (
            <li className="px-4 py-4 sm:px-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No metrics available yet.
              </p>
            </li>
          ) : (
            metrics.map((metric) => (
              <li key={metric.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Post ID: {metric.post_id.substring(0, 8)}...
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Collected: {new Date(metric.collected_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex space-x-6 text-sm">
                    <div className="text-center">
                      <p className="text-gray-500 dark:text-gray-400">Likes</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {metric.likes}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500 dark:text-gray-400">Retweets</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {metric.retweets}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500 dark:text-gray-400">Views</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {metric.views}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}

