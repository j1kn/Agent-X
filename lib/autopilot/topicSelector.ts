/**
 * Intelligent Topic Selector for Agent X
 * 
 * Selects the next topic to post about based on:
 * - User-defined topic list
 * - Recent post history (avoid repetition)
 * - Randomization for variety
 */

export interface TopicSelectionResult {
  topic: string
  reason: string
}

/**
 * Select next topic intelligently
 * Avoids topics used in recent posts and rotates through the list
 */
export async function selectNextTopic(
  userTopics: string[],
  recentPostTopics: string[]
): Promise<TopicSelectionResult> {
  // If no topics configured, throw error
  if (!userTopics || userTopics.length === 0) {
    throw new Error('No topics configured. Please add topics in Settings.')
  }

  // If only one topic, always use it
  if (userTopics.length === 1) {
    return {
      topic: userTopics[0],
      reason: 'Only topic available',
    }
  }

  // Filter out recently used topics (last 5 posts)
  const recentTopicsSet = new Set(recentPostTopics.slice(0, 5))
  const availableTopics = userTopics.filter(topic => !recentTopicsSet.has(topic))

  // If all topics were recently used, reset and use any topic
  if (availableTopics.length === 0) {
    const randomIndex = Math.floor(Math.random() * userTopics.length)
    return {
      topic: userTopics[randomIndex],
      reason: 'All topics recently used, rotating back',
    }
  }

  // Select randomly from available topics
  const randomIndex = Math.floor(Math.random() * availableTopics.length)
  return {
    topic: availableTopics[randomIndex],
    reason: `Selected from ${availableTopics.length} available topics (${recentTopicsSet.size} recently used)`,
  }
}

/**
 * Get recent post topics for a user
 */
export function extractRecentTopics(recentPosts: Array<{ topic: string | null }>): string[] {
  return recentPosts
    .map(post => post.topic)
    .filter((topic): topic is string => topic !== null && topic !== '')
}


