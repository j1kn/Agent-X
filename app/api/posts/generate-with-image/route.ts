import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { planNextPost } from '@/lib/pipeline/planner'
import { generatePost } from '@/lib/pipeline/generator'
import { generateContent } from '@/lib/ai/generator'
import { generateImageWithStability } from '@/lib/ai/providers/stability-image'
import { uploadImageToStorage } from '@/lib/storage/image-upload'

export const runtime = 'nodejs'
export const maxDuration = 60 // Allow up to 60 seconds for image generation

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Plan next post (get topic)
    const plan = await planNextPost(user.id)

    // Log planning success
    // @ts-ignore - Supabase type inference issue
    await supabase.from('pipeline_logs').insert({
      user_id: user.id,
      step: 'planning',
      status: 'success',
      message: `Planned post with image for topic: ${plan.topic}`,
      metadata: { topic: plan.topic, withImage: true },
    })

    // Get user profile for tone
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tone')
      .eq('id', user.id)
      .single()

    // Get recent posts to avoid repetition
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // @ts-expect-error - Type inference issue
    const recentContents = (recentPosts || []).map(p => p.content)

    // Generate content with image prompt
    console.log('[Generate with Image] Generating content and image prompt...')
    const contentResult = await generateContent(user.id, {
      topic: plan.topic,
      // @ts-expect-error - Type inference issue
      tone: profile?.tone || 'professional',
      recentPosts: recentContents,
      generateImagePrompt: true, // Request image prompt
    })

    const masterContent = contentResult.content
    const imagePrompt = contentResult.imagePrompt

    if (!imagePrompt) {
      throw new Error('Failed to generate image prompt')
    }

    console.log('[Generate with Image] Image prompt:', imagePrompt.substring(0, 100) + '...')

    // Generate image with Stability AI
    const stabilityApiKey = process.env.STABILITY_API_KEY

    if (!stabilityApiKey) {
      throw new Error('STABILITY_API_KEY not configured')
    }

    console.log('[Generate with Image] Generating image with Stability AI...')
    const stabilityResult = await generateImageWithStability({
      prompt: imagePrompt,
      apiKey: stabilityApiKey,
    })

    if (!stabilityResult.success || !stabilityResult.base64Data) {
      throw new Error(stabilityResult.error || 'Failed to generate image')
    }

    console.log('[Generate with Image] ✓ Image generated!')

    // Upload image to Supabase Storage
    console.log('[Generate with Image] Uploading image to storage...')
    const uploadResult = await uploadImageToStorage(
      stabilityResult.base64Data,
      user.id
    )

    if (!uploadResult.success || !uploadResult.publicUrl) {
      throw new Error(uploadResult.error || 'Failed to upload image')
    }

    const imageUrl = uploadResult.publicUrl
    console.log('[Generate with Image] ✓ Image uploaded:', imageUrl)

    // Log image generation success
    // @ts-ignore - Supabase type inference issue
    await supabase.from('pipeline_logs').insert({
      user_id: user.id,
      step: 'generation',
      status: 'success',
      message: 'Image generated and uploaded successfully',
      metadata: {
        imagePrompt: imagePrompt.substring(0, 200),
        imageUrl,
        imageSize: stabilityResult.base64Data.length,
      },
    })

    // Generate and schedule posts (this will create the posts in DB)
    const result = await generatePost(user.id, plan.topic, {
      shouldGenerateImage: true,
    })

    // Update all generated posts with the image URL and data
    for (const post of result.posts) {
      await supabase
        .from('posts')
        // @ts-expect-error - Supabase type inference issue
        .update({
          image_url: imageUrl,
          image_data: stabilityResult.base64Data,
          generation_metadata: {
            master_content: result.masterContent,
            image_prompt: imagePrompt,
            image_generation_enabled: true,
            has_image: true,
          },
        })
        .eq('id', post.postId)
    }

    // Log generation success
    // @ts-ignore - Supabase type inference issue
    await supabase.from('pipeline_logs').insert({
      user_id: user.id,
      step: 'generation',
      status: 'success',
      message: `Generated ${result.posts.length} posts with image for ${result.posts.map(p => p.platform).join(', ')}`,
      metadata: {
        master_content: result.masterContent,
        image_url: imageUrl,
        image_prompt: imagePrompt,
        posts: result.posts.map(p => ({
          platform: p.platform,
          post_id: p.postId,
          scheduled_for: p.scheduledFor,
        })),
      },
    })

    return NextResponse.json({
      success: true,
      masterContent: result.masterContent,
      imageUrl,
      imagePrompt,
      posts: result.posts.map(p => ({
        postId: p.postId,
        platform: p.platform,
        content: p.content,
        scheduledFor: p.scheduledFor.toISOString(),
      })),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    console.error('[Generate with Image] Error:', errorMessage)

    // Log error
    // @ts-ignore - Supabase type inference issue
    await supabase.from('pipeline_logs').insert({
      user_id: user.id,
      step: 'generation',
      status: 'error',
      message: `Image generation failed: ${errorMessage}`,
      metadata: { error: errorMessage },
    })

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
