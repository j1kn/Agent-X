/**
 * Workflow Helper Functions
 * 
 * Shared utilities for autopilot workflow execution.
 * Used by both /api/workflows/run and /api/cron/publish endpoints.
 */

import type { Database, Json } from '@/types/database'

type PipelineStep = Database['public']['Tables']['pipeline_logs']['Row']['step']
type PipelineStatus = Database['public']['Tables']['pipeline_logs']['Row']['status']
type PipelineLogInsert = Database['public']['Tables']['pipeline_logs']['Insert']

// Schedule configuration type
export type ScheduleConfig = {
  days_of_week: string[] | null
  times: string[] | null
  timezone: string | null
}

// Time match result type
export type TimeMatchResult = {
  matches: boolean
  matchedTime?: string
  timeSlot: string
  currentTime: string
}

/**
 * Check if current time matches any scheduled time within a 5-minute window
 * 
 * @param schedule - User's schedule configuration
 * @returns TimeMatchResult with match status and time slot identifier
 */
export function checkTimeMatch(schedule: ScheduleConfig): TimeMatchResult {
  const timezone = schedule.timezone || 'UTC'
  const now = new Date()
  
  // Convert to user's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'long',
  })
  
  const parts = formatter.formatToParts(now)
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || ''
  
  const year = getPart('year')
  const month = getPart('month')
  const day = getPart('day')
  const hour = parseInt(getPart('hour'), 10)
  const minute = parseInt(getPart('minute'), 10)
  const weekday = getPart('weekday').toLowerCase()
  
  const currentTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  const currentTotalMinutes = hour * 60 + minute
  
  // Check if today is in schedule (if days_of_week is specified)
  if (schedule.days_of_week && schedule.days_of_week.length > 0) {
    if (!schedule.days_of_week.includes(weekday)) {
      return {
        matches: false,
        timeSlot: `${year}-${month}-${day} ${currentTime}`,
        currentTime,
      }
    }
  }
  
  // Check each scheduled time
  for (const timeStr of schedule.times || []) {
    const [schedHour, schedMinute] = timeStr.split(':').map(Number)
    const schedTotalMinutes = schedHour * 60 + schedMinute
    
    // Check if within 5-minute window (0 to +4 minutes after scheduled time)
    const diff = currentTotalMinutes - schedTotalMinutes
    if (diff >= 0 && diff < 5) {
      return {
        matches: true,
        matchedTime: timeStr,
        timeSlot: `${year}-${month}-${day} ${timeStr}`,
        currentTime,
      }
    }
  }
  
  return {
    matches: false,
    timeSlot: `${year}-${month}-${day} ${currentTime}`,
    currentTime,
  }
}

/**
 * Log pipeline step to database
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID
 * @param step - Pipeline step name
 * @param status - Step status (success, error, warning)
 * @param message - Log message
 * @param metadata - Optional metadata object
 */
export async function logPipeline(
  supabase: any, // Using any to avoid circular dependency with supabase client types
  userId: string,
  step: PipelineStep,
  status: PipelineStatus,
  message: string,
  metadata?: Json
): Promise<void> {
  const logEntry: PipelineLogInsert = {
    user_id: userId,
    step,
    status,
    message,
    metadata: metadata ?? {},
  }
  
  await supabase.from('pipeline_logs').insert(logEntry)
}

/**
 * Extract recent topics from posts to avoid repetition
 * 
 * @param posts - Array of recent posts with topic field
 * @returns Array of unique topics
 */
export function extractRecentTopics(posts: Array<{ topic: string | null }>): string[] {
  return posts
    .map(p => p.topic)
    .filter((topic): topic is string => topic !== null && topic.trim() !== '')
}
