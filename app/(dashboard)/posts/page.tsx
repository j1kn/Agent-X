'use client'

import { useEffect, useState } from 'react'

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchPosts()
  }, [filter])

  const fetchPosts = async () => {
    try {
      const url = filter === 'all' ? '/api/posts' : `/api/posts?status=${filter}`
      const response = await fetch(url)
      const data = await response.json()
      setPosts(data.posts || [])
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="text-gray-900 dark:text-white">Loading...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Posts
        </h1>
        <div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-gray-900"
          >
            <option value="all">All Posts</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {posts.length === 0 ? (
            <li className="px-4 py-4 sm:px-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No posts found.
              </p>
            </li>
          ) : (
            posts.map((post) => (
              <li key={post.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                          post.status
                        )}`}
                      >
                        {post.status}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {post.connected_accounts?.platform === 'linkedin'
                          ? '💼 LinkedIn · Personal Profile'
                          : post.connected_accounts?.platform === 'x'
                          ? '𝕏 X (Twitter)'
                          : post.connected_accounts?.platform === 'telegram'
                          ? '✈️ Telegram'
                          : post.connected_accounts?.platform}
                      </span>
                      {post.image_url && (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800">
                          📷 Has Image
                        </span>
                      )}
                    </div>
                    {post.topic && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">
                        Topic: {post.topic}
                      </p>
                    )}
                    <p className="text-sm text-gray-900 dark:text-white mb-2">
                      {post.content}
                    </p>
                    {post.image_url && (
                      <div className="mt-3 mb-3">
                        <img
                          src={post.image_url}
                          alt="Post image"
                          className="max-w-sm rounded-lg shadow-md border border-gray-200"
                        />
                      </div>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      {post.scheduled_for && (
                        <p>
                          Scheduled: {new Date(post.scheduled_for).toLocaleString()}
                        </p>
                      )}
                      {post.published_at && (
                        <p>
                          Published: {new Date(post.published_at).toLocaleString()}
                        </p>
                      )}
                      <p>Created: {new Date(post.created_at).toLocaleString()}</p>
                      {post.generation_model && (
                        <p>Model: {post.generation_model}</p>
                      )}
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

