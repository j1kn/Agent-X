'use client'

import { useEffect, useState } from 'react'

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' },
]

export default function SchedulePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [times, setTimes] = useState<string[]>(['09:00'])
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchSchedule()
  }, [])

  const fetchSchedule = async () => {
    try {
      const response = await fetch('/api/schedule')
      const data = await response.json()

      if (data.schedule) {
        setSelectedDays(data.schedule.days_of_week || [])
        setTimes(data.schedule.times || ['09:00'])
        setFrequency(data.schedule.frequency || 'daily')
      }
    } catch (error) {
      console.error('Failed to fetch schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)

    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          days_of_week: selectedDays,
          times,
          frequency,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save schedule')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save schedule:', error)
      alert('Failed to save schedule')
    } finally {
      setSaving(false)
    }
  }

  const toggleDay = (dayId: string) => {
    if (selectedDays.includes(dayId)) {
      setSelectedDays(selectedDays.filter(d => d !== dayId))
    } else {
      setSelectedDays([...selectedDays, dayId])
    }
  }

  const addTime = () => {
    setTimes([...times, '12:00'])
  }

  const updateTime = (index: number, value: string) => {
    const newTimes = [...times]
    newTimes[index] = value
    setTimes(newTimes)
  }

  const removeTime = (index: number) => {
    if (times.length > 1) {
      setTimes(times.filter((_, i) => i !== index))
    }
  }

  if (loading) {
    return <div className="text-gray-900 dark:text-white">Loading...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Scheduling
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Configure when Agent X should automatically generate and publish posts.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {success && (
          <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
            <p className="text-sm text-green-800 dark:text-green-200">Schedule saved successfully!</p>
          </div>
        )}

        {/* Frequency */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Posting Frequency
          </h2>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="radio"
                value="daily"
                checked={frequency === 'daily'}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                <strong>Daily</strong> - Post every selected day
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="weekly"
                checked={frequency === 'weekly'}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                <strong>Weekly</strong> - Post once per week on selected days
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="monthly"
                checked={frequency === 'monthly'}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                <strong>Monthly</strong> - Post once per month
              </span>
            </label>
          </div>
        </div>

        {/* Days of Week */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Days of Week
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day.id}
                type="button"
                onClick={() => toggleDay(day.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedDays.includes(day.id)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
          {selectedDays.length === 0 && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              Please select at least one day
            </p>
          )}
        </div>

        {/* Times */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Posting Times
          </h2>
          <div className="space-y-3">
            {times.map((time, index) => (
              <div key={index} className="flex items-center space-x-3">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => updateTime(index, e.target.value)}
                  className="block border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                />
                {times.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTime(index)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addTime}
              className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              + Add another time
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Times are in your local timezone. Agent X will post at these times on selected days.
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            ℹ️ How Scheduling Works
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
            <li>Agent X checks the schedule every hour via cron job</li>
            <li>When autopilot is ON and it's time to post, a post is automatically generated</li>
            <li>Posts are published to all connected accounts</li>
            <li>You can view post history in the Posts page</li>
          </ul>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || selectedDays.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </form>
    </div>
  )
}


