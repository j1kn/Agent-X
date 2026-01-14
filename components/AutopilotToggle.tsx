'use client'

import { useEffect, useState } from 'react'

export function AutopilotToggle() {
  const [autopilotEnabled, setAutopilotEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchAutopilotStatus()
  }, [])

  const fetchAutopilotStatus = async () => {
    try {
      const response = await fetch('/api/autopilot/status')
      const data = await response.json()
      
      if (data.profile) {
        setAutopilotEnabled(data.profile.autopilot_enabled || false)
      }
    } catch (error) {
      console.error('Failed to fetch autopilot status:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleAutopilot = async () => {
    setUpdating(true)
    
    try {
      const newStatus = !autopilotEnabled
      
      const response = await fetch('/api/autopilot/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ autopilot_enabled: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to toggle autopilot')
      }

      setAutopilotEnabled(newStatus)
    } catch (error) {
      console.error('Failed to toggle autopilot:', error)
      alert('Failed to toggle autopilot')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return null
  }

  return (
    <div className="flex items-center space-x-3">
      <span className={`text-sm font-medium ${autopilotEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
        {autopilotEnabled ? 'Autopilot ON' : 'Autopilot OFF'}
      </span>
      <button
        onClick={toggleAutopilot}
        disabled={updating}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 ${
          autopilotEnabled ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
        }`}
        role="switch"
        aria-checked={autopilotEnabled}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            autopilotEnabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

