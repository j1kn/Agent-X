'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [showTelegramModal, setShowTelegramModal] = useState(false)
  const [telegramData, setTelegramData] = useState({ botToken: '', channelUsername: '' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    fetchAccounts()
    
    // Check for success/error params from OAuth redirect
    const successParam = searchParams.get('success')
    const errorParam = searchParams.get('error')
    
    if (successParam === 'x_connected') {
      setSuccess('X account connected successfully!')
      // Clean URL
      router.replace('/accounts')
      fetchAccounts()
    } else if (errorParam) {
      setError(`Connection failed: ${errorParam}`)
      router.replace('/accounts')
    }
  }, [searchParams, router])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      const data = await response.json()
      setAccounts(data.accounts || [])
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectX = async () => {
    setConnecting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/accounts/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ platform: 'x' }),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
        setConnecting(false)
      } else if (data.authUrl) {
        // Redirect to X OAuth
        window.location.href = data.authUrl
      }
    } catch (error) {
      console.error('Failed to connect:', error)
      setError('Failed to initiate connection')
      setConnecting(false)
    }
  }

  const handleConnectTelegram = () => {
    setShowTelegramModal(true)
    setError(null)
  }

  const handleTelegramSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setConnecting(true)
    setError(null)

    try {
      const response = await fetch('/api/accounts/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: 'telegram',
          botToken: telegramData.botToken,
          channelUsername: telegramData.channelUsername,
        }),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else if (data.success) {
        setSuccess(`Telegram channel @${data.username} connected successfully!`)
        setShowTelegramModal(false)
        setTelegramData({ botToken: '', channelUsername: '' })
        fetchAccounts()
      }
    } catch (error) {
      console.error('Failed to connect:', error)
      setError('Failed to connect Telegram')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) {
      return
    }

    try {
      await fetch('/api/accounts/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId }),
      })

      setSuccess('Account disconnected')
      fetchAccounts()
    } catch (error) {
      console.error('Failed to disconnect:', error)
      setError('Failed to disconnect account')
    }
  }

  if (loading) {
    return <div className="text-gray-900 dark:text-white">Loading...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Connected Accounts
      </h1>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
          <button
            onClick={() => setSuccess(null)}
            className="text-green-600 dark:text-green-400 text-sm underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-600 dark:text-red-400 text-sm underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Connect New Account
        </h2>
        <div className="flex space-x-4">
          <button
            onClick={handleConnectTelegram}
            disabled={connecting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Connect Telegram
          </button>
          <button
            onClick={handleConnectX}
            disabled={connecting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50"
          >
            {connecting ? 'Connecting...' : 'Connect X (Twitter)'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {accounts.length === 0 ? (
            <li className="px-4 py-4 sm:px-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No accounts connected yet.
              </p>
            </li>
          ) : (
            accounts.map((account) => (
              <li key={account.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {account.platform === 'telegram' ? 'Telegram' : 'X (Twitter)'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      @{account.username}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {account.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDisconnect(account.id)}
                    className="text-sm text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Disconnect
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Telegram Modal */}
      {showTelegramModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Connect Telegram Bot
            </h3>
            
            <form onSubmit={handleTelegramSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bot Token
                </label>
                <input
                  type="text"
                  value={telegramData.botToken}
                  onChange={(e) => setTelegramData({ ...telegramData, botToken: e.target.value })}
                  placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Get this from @BotFather on Telegram
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Channel Username
                </label>
                <input
                  type="text"
                  value={telegramData.channelUsername}
                  onChange={(e) => setTelegramData({ ...telegramData, channelUsername: e.target.value })}
                  placeholder="@yourchannel or yourchannel"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Bot must be added as admin to this channel
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowTelegramModal(false)
                    setTelegramData({ botToken: '', channelUsername: '' })
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  disabled={connecting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connecting}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {connecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

