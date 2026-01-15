/**
 * Smart Scheduler
 * 
 * Calculates next post time based on user's schedule configuration.
 * NO hardcoded +24h delays. Respects user timezone, posting days, and times.
 */

export interface ScheduleConfig {
  days_of_week?: string[] | null  // e.g., ['monday', 'wednesday', 'friday']
  times?: string[] | null          // e.g., ['09:00', '14:00']
  frequency?: 'daily' | 'weekly' | null
  timezone?: string | null          // e.g., 'America/New_York' (future)
}

/**
 * Get the next scheduled post time based on user's schedule
 */
export function getNextScheduledAt(schedule: ScheduleConfig): Date {
  const now = new Date()
  
  // If no schedule configured, default to 24 hours from now (fallback)
  if (!schedule.frequency || !schedule.times || schedule.times.length === 0) {
    const fallback = new Date(now)
    fallback.setHours(now.getHours() + 24)
    return fallback
  }

  // For daily posting
  if (schedule.frequency === 'daily') {
    return getNextDailyTime(now, schedule.times)
  }

  // For weekly posting
  if (schedule.frequency === 'weekly') {
    if (!schedule.days_of_week || schedule.days_of_week.length === 0) {
      // No days configured, fall back to daily
      return getNextDailyTime(now, schedule.times)
    }
    return getNextWeeklyTime(now, schedule.days_of_week, schedule.times)
  }

  // Fallback for unknown frequency
  const fallback = new Date(now)
  fallback.setHours(now.getHours() + 24)
  return fallback
}

/**
 * Get next daily posting time
 * If today's times have passed, schedule for tomorrow
 */
function getNextDailyTime(now: Date, times: string[]): Date {
  const sortedTimes = [...times].sort()
  
  const nowHour = now.getHours()
  const nowMinute = now.getMinutes()
  const nowTotalMinutes = nowHour * 60 + nowMinute

  // Try to find a time slot today
  for (const timeStr of sortedTimes) {
    const [hour, minute] = parseTime(timeStr)
    const timeTotalMinutes = hour * 60 + minute

    if (timeTotalMinutes > nowTotalMinutes) {
      // Found a slot today
      const scheduled = new Date(now)
      scheduled.setHours(hour, minute, 0, 0)
      return scheduled
    }
  }

  // All times today have passed, schedule for tomorrow's first slot
  const [firstHour, firstMinute] = parseTime(sortedTimes[0])
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(firstHour, firstMinute, 0, 0)
  return tomorrow
}

/**
 * Get next weekly posting time
 * Finds the next valid day + time combination
 */
function getNextWeeklyTime(
  now: Date,
  daysOfWeek: string[],
  times: string[]
): Date {
  const validDayNumbers = daysOfWeek.map(dayNameToNumber).sort((a, b) => a - b)
  const sortedTimes = [...times].sort()
  const currentDayNumber = now.getDay()

  const nowHour = now.getHours()
  const nowMinute = now.getMinutes()
  const nowTotalMinutes = nowHour * 60 + nowMinute

  // Check if we can post today
  if (validDayNumbers.includes(currentDayNumber)) {
    for (const timeStr of sortedTimes) {
      const [hour, minute] = parseTime(timeStr)
      const timeTotalMinutes = hour * 60 + minute

      if (timeTotalMinutes > nowTotalMinutes) {
        // Found a slot today
        const scheduled = new Date(now)
        scheduled.setHours(hour, minute, 0, 0)
        return scheduled
      }
    }
  }

  // Find next valid day
  const nextDay = findNextValidDay(currentDayNumber, validDayNumbers)
  const daysUntilNext = (nextDay - currentDayNumber + 7) % 7 || 7

  // Schedule for that day's first time slot
  const [firstHour, firstMinute] = parseTime(sortedTimes[0])
  const scheduled = new Date(now)
  scheduled.setDate(scheduled.getDate() + daysUntilNext)
  scheduled.setHours(firstHour, firstMinute, 0, 0)
  return scheduled
}

/**
 * Parse time string "HH:MM" into [hour, minute]
 */
function parseTime(timeStr: string): [number, number] {
  const parts = timeStr.split(':')
  return [parseInt(parts[0], 10), parseInt(parts[1] || '0', 10)]
}

/**
 * Convert day name to JavaScript day number (0 = Sunday, 6 = Saturday)
 */
function dayNameToNumber(dayName: string): number {
  const normalized = dayName.toLowerCase()
  const mapping: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  }
  return mapping[normalized] ?? 1 // Default to Monday
}

/**
 * Find the next valid day number after the current day
 */
function findNextValidDay(currentDay: number, validDays: number[]): number {
  // Find next day in the list
  for (const day of validDays) {
    if (day > currentDay) {
      return day
    }
  }
  // Wrap around to first day of next week
  return validDays[0]
}

