'use client'

import { useEffect, useState } from 'react'

interface AutopilotRequirements {
  aiConnected: boolean
  hasTopics: boolean
  hasAccounts: boolean
  hasSchedule: boolean
}

export function AutopilotToggle() {
  const [autopilotEnabled, setAutopilotEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [requirements, setRequirements] = useState<AutopilotRequirements>({
    aiConnected: false,
    hasTopics: false,
    hasAccounts: false,
    hasSchedule: false,
  })
  const [showRequirements, setShowRequirements] = useState(false)

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
      
      if (data.requirements) {
        setRequirements(data.requirements)
      }
    } catch (error) {
      console.error('Failed to fetch autopilot status:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleAutopilot = async () => {
    // If trying to enable, check requirements first
    if (!autopilotEnabled) {
      const allMet = requirements.aiConnected && requirements.hasTopics && requirements.hasAccounts && requirements.hasSchedule
      
      if (!allMet) {
        setShowRequirements(true)
        return
      }
    }
    
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

      const data = await response.json()

      if (!response.ok) {
        if (data.missingRequirements) {
          setShowRequirements(true)
          return
        }
        throw new Error(data.error || 'Failed to toggle autopilot')
      }

      setAutopilotEnabled(newStatus)
      setShowRequirements(false)
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
    <div className="relative">
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

      {/* Requirements Popup */}
      {showRequirements && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50">
          <div className="flex justify-between items-start mb-3">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Enable Autopilot</h4>
            <button 
              onClick={() => setShowRequirements(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            Complete these requirements first:
          </p>
          <ul className="space-y-2 text-xs">
            <li className={`flex items-center space-x-2 ${requirements.aiConnected ? 'text-green-600' : 'text-red-600'}`}>
              <span>{requirements.aiConnected ? '✓' : '✗'}</span>
              <span>AI Model connected</span>
              {!requirements.aiConnected && <a href="/settings" className="text-indigo-600 underline">→ Settings</a>}
            </li>
            <li className={`flex items-center space-x-2 ${requirements.hasTopics ? 'text-green-600' : 'text-red-600'}`}>
              <span>{requirements.hasTopics ? '✓' : '✗'}</span>
              <span>Topics configured</span>
              {!requirements.hasTopics && <a href="/settings" className="text-indigo-600 underline">→ Settings</a>}
            </li>
            <li className={`flex items-center space-x-2 ${requirements.hasAccounts ? 'text-green-600' : 'text-red-600'}`}>
              <span>{requirements.hasAccounts ? '✓' : '✗'}</span>
              <span>Social accounts connected</span>
              {!requirements.hasAccounts && <a href="/accounts" className="text-indigo-600 underline">→ Accounts</a>}
            </li>
            <li className={`flex items-center space-x-2 ${requirements.hasSchedule ? 'text-green-600' : 'text-red-600'}`}>
              <span>{requirements.hasSchedule ? '✓' : '✗'}</span>
              <span>Schedule configured</span>
              {!requirements.hasSchedule && <a href="/schedule" className="text-indigo-600 underline">→ Schedule</a>}
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
