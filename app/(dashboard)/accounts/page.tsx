'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [showTelegramModal, setShowTelegramModal] = useState(false)
  const [telegramData, setTelegramData] = useState({ botToken: '', channelUsername: '' })
  const [showXModal, setShowXModal] = useState(false)
  const [xData, setXData] = useState({ apiKey: '', apiSecret: '', accessToken: '', accessTokenSecret: '' })
  const [showLinkedInModal, setShowLinkedInModal] = useState(false)
  const [linkedInOrgs, setLinkedInOrgs] = useState<any[]>([])
  const [linkedInAuthData, setLinkedInAuthData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    fetchAccounts()
    
    // Check for success/error params from OAuth redirect
    const successParam = searchParams.get('success')
    const errorParam = searchParams.get('error')
    const linkedInAuth = searchParams.get('linkedin_auth')
    const linkedInData = searchParams.get('data')
    
    if (successParam === 'x_connected') {
      setSuccess('X account connected successfully!')
      // Clean URL
      router.replace('/accounts')
      fetchAccounts()
    } else if (linkedInAuth === 'success' && linkedInData) {
      // LinkedIn OAuth callback - decode organization data
      try {
        const decoded = JSON.parse(Buffer.from(decodeURIComponent(linkedInData), 'base64').toString())
        setLinkedInAuthData(decoded)
        setLinkedInOrgs(decoded.organizations || [])
        setShowLinkedInModal(true)
        // Clean URL
        router.replace('/accounts')
      } catch (err) {
        setError('Failed to process LinkedIn connection')
        router.replace('/accounts')
      }
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

  const handleConnectX = () => {
    setShowXModal(true)
    setError(null)
  }

  const handleXSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setConnecting(true)
    setError(null)

    try {
      const response = await fetch('/api/accounts/x/manual-connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: xData.apiKey,
          apiSecret: xData.apiSecret,
          accessToken: xData.accessToken,
          accessTokenSecret: xData.accessTokenSecret,
        }),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else if (data.success) {
        setSuccess(`X account @${data.username} connected successfully!`)
        setShowXModal(false)
        setXData({ apiKey: '', apiSecret: '', accessToken: '', accessTokenSecret: '' })
        fetchAccounts()
      }
    } catch (error) {
      console.error('Failed to connect:', error)
      setError('Failed to connect X account')
    } finally {
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

  const handleConnectLinkedIn = () => {
    // Redirect to LinkedIn OAuth flow
    window.location.href = '/api/accounts/linkedin/connect'
  }

  const handleLinkedInOrgSelect = async (orgId: string, orgName: string) => {
    setConnecting(true)
    setError(null)

    try {
      const response = await fetch('/api/accounts/linkedin/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: linkedInAuthData.access_token,
          expires_in: linkedInAuthData.expires_in,
          organization_id: orgId,
          organization_name: orgName,
        }),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else if (data.success) {
        setSuccess(`LinkedIn Company Page "${orgName}" connected successfully!`)
        setShowLinkedInModal(false)
        setLinkedInAuthData(null)
        setLinkedInOrgs([])
        fetchAccounts()
      }
    } catch (error) {
      console.error('Failed to save LinkedIn connection:', error)
      setError('Failed to save LinkedIn connection')
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
        <div className="flex space-x-4 flex-wrap gap-2">
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
            {connecting ? 'Connecting...' : 'Connect X (Manual)'}
          </button>
          <button
            onClick={handleConnectLinkedIn}
            disabled={connecting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50"
          >
            Connect LinkedIn Company Page
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
                      {account.platform === 'telegram' && 'Telegram'}
                      {account.platform === 'x' && 'X (Twitter)'}
                      {account.platform === 'linkedin' && 'LinkedIn Company Page'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {account.platform === 'linkedin' ? account.username : `@${account.username}`}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {account.is_active ? 'Active' : 'Inactive'}
                      {account.platform === 'linkedin' && account.token_expires_at && (
                        <span className="ml-2">
                          {new Date(account.token_expires_at) <= new Date() 
                            ? '• Token expired' 
                            : new Date(account.token_expires_at) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                              ? '• Token expires soon'
                              : ''
                          }
                        </span>
                      )}
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

      {/* X Manual Connect Modal */}
      {showXModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Connect X Account (Manual)
            </h3>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enter your X API credentials. Get these from your X Developer Portal.
            </p>
            
            <form onSubmit={handleXSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Key
                </label>
                <input
                  type="text"
                  value={xData.apiKey}
                  onChange={(e) => setXData({ ...xData, apiKey: e.target.value })}
                  placeholder="Enter your X API Key"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Secret
                </label>
                <input
                  type="password"
                  value={xData.apiSecret}
                  onChange={(e) => setXData({ ...xData, apiSecret: e.target.value })}
                  placeholder="Enter your X API Secret"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Access Token
                </label>
                <input
                  type="text"
                  value={xData.accessToken}
                  onChange={(e) => setXData({ ...xData, accessToken: e.target.value })}
                  placeholder="Enter your X Access Token"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Access Token Secret
                </label>
                <input
                  type="password"
                  value={xData.accessTokenSecret}
                  onChange={(e) => setXData({ ...xData, accessTokenSecret: e.target.value })}
                  placeholder="Enter your X Access Token Secret"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowXModal(false)
                    setXData({ apiKey: '', apiSecret: '', accessToken: '', accessTokenSecret: '' })
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connecting}
                  className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50"
                >
                  {connecting ? 'Validating...' : 'Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LinkedIn Organization Selection Modal */}
      {showLinkedInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Select LinkedIn Company Page
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Choose which Company Page you want to connect for posting:
            </p>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {linkedInOrgs.map((org: any) => (
                <button
                  key={org.id}
                  onClick={() => handleLinkedInOrgSelect(org.id, org.name)}
                  disabled={connecting}
                  className="w-full text-left px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  <p className="font-medium text-gray-900 dark:text-white">{org.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">ID: {org.id}</p>
                </button>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowLinkedInModal(false)
                  setLinkedInOrgs([])
                  setLinkedInAuthData(null)
                }}
                disabled={connecting}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

