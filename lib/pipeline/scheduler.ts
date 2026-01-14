import { createClient } from '@/lib/supabase/server'

export async function schedulePost(
  postId: string,
  scheduledTime: Date
): Promise<void> {
  const supabase = await createClient()

  // Update post status to 'scheduled' with scheduled_for timestamp
  const { error } = await supabase
    .from('posts')
    .update({
      status: 'scheduled',
      scheduled_for: scheduledTime.toISOString(),
    })
    .eq('id', postId)

  if (error) {
    throw new Error('Failed to schedule post')
  }
}

