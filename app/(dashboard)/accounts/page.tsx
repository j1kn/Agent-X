'use client'

import { useEffect, useState } from 'react'

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    fetchAccounts()
  }, [])

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

  const handleConnect = async (platform: string) => {
    setConnecting(true)
    try {
      const response = await fetch('/api/accounts/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ platform }),
      })

      const data = await response.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (error) {
      console.error('Failed to connect:', error)
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

      fetchAccounts()
    } catch (error) {
      console.error('Failed to disconnect:', error)
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

      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Connect New Account
        </h2>
        <div className="flex space-x-4">
          <button
            onClick={() => handleConnect('telegram')}
            disabled={connecting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Connect Telegram
          </button>
          <button
            onClick={() => handleConnect('x')}
            disabled={connecting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50"
          >
            Connect X (Twitter)
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
    </div>
  )
}

