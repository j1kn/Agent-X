import { createClient } from '@/lib/supabase/server'

export interface PlanningResult {
  topic: string
  accountId: string
  platform: 'telegram' | 'x'
  scheduledTime: Date
  format?: string
}

export async function planNextPost(userId: string): Promise<PlanningResult> {
  const supabase = await createClient()

  // 1. Get user profile (topics, tone, frequency)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('topics, posting_frequency')
    .eq('id', userId)
    .single()

  // @ts-expect-error - Profile type inference issue
  if (!profile || !profile.topics || profile.topics.length === 0) {
    throw new Error('User has no topics configured')
  }

  // 2. Get connected accounts
  const { data: accounts } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (!accounts || accounts.length === 0) {
    throw new Error('No active connected accounts')
  }

  // Select first active account (round-robin could be implemented)
  const account = accounts[0]

  // 3. Get recent posts to avoid repetition
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: recentPosts } = await supabase
    .from('posts')
    .select('generation_prompt')
    .eq('user_id', userId)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(10)

  const usedTopics = new Set(
    recentPosts?.map((p: { generation_prompt: string | null }) => {
      // Extract topic from prompt (simple approach)
      const match = p.generation_prompt?.match(/about "([^"]+)"/)
      return match ? match[1] : null
    }).filter(Boolean) || []
  )

  // 4. Select topic (avoid recently used)
  // @ts-expect-error - Profile type inference issue
  const availableTopics = profile.topics.filter((t: string) => !usedTopics.has(t))
  const topic = availableTopics.length > 0
    ? availableTopics[Math.floor(Math.random() * availableTopics.length)]
    // @ts-expect-error - Profile type inference issue
    : profile.topics[Math.floor(Math.random() * profile.topics.length)]

  // 5. Get learning data for optimal timing
  const { data: learningData } = await supabase
    .from('learning_data')
    .select('*')
    .eq('user_id', userId)
    // @ts-expect-error - Account type inference issue
    .eq('account_id', account.id)
    .single()

  // 6. Determine scheduled time based on frequency and learning data
  const scheduledTime = calculateScheduledTime(
    // @ts-expect-error - Profile type inference issue
    profile.posting_frequency || 'daily',
    learningData
  )

  return {
    topic,
    // @ts-expect-error - Account type inference issue
    accountId: account.id,
    // @ts-expect-error - Account type inference issue
    platform: account.platform,
    scheduledTime,
    // @ts-expect-error - Learning data type inference issue
    format: learningData?.best_format || undefined,
  }
}

function calculateScheduledTime(
  frequency: string,
  learningData: any
): Date {
  const now = new Date()
  const scheduledTime = new Date()

  // Determine interval based on frequency
  switch (frequency) {
    case 'twice_daily':
      scheduledTime.setHours(scheduledTime.getHours() + 12)
      break
    case 'weekly':
      scheduledTime.setDate(scheduledTime.getDate() + 7)
      break
    case 'daily':
    default:
      scheduledTime.setDate(scheduledTime.getDate() + 1)
      break
  }

  // Apply learning data for optimal time of day
  if (learningData?.best_time_of_day) {
    switch (learningData.best_time_of_day) {
      case 'morning':
        scheduledTime.setHours(9, 0, 0, 0)
        break
      case 'afternoon':
        scheduledTime.setHours(14, 0, 0, 0)
        break
      case 'evening':
        scheduledTime.setHours(19, 0, 0, 0)
        break
    }
  }

  // Apply learning data for optimal day of week
  if (learningData?.best_day_of_week && frequency === 'weekly') {
    const targetDay = getDayNumber(learningData.best_day_of_week)
    const currentDay = scheduledTime.getDay()
    const daysToAdd = (targetDay - currentDay + 7) % 7
    scheduledTime.setDate(scheduledTime.getDate() + daysToAdd)
  }

  return scheduledTime
}

function getDayNumber(day: string): number {
  const days: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  }
  return days[day.toLowerCase()] || 1
}

