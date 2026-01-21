/**
 * Supabase Storage Image Upload
 * 
 * Handles uploading base64 images to Supabase Storage
 * and returning public URLs for use in posts.
 */

import { createServiceClient } from '@/lib/supabase/server'

export interface ImageUploadResult {
  success: boolean
  publicUrl?: string
  error?: string
}

/**
 * Upload a base64 image to Supabase Storage and return public URL
 */
export async function uploadImageToStorage(
  base64Data: string,
  userId: string,
  filename?: string
): Promise<ImageUploadResult> {
  try {
    console.log('[Storage] Uploading image to Supabase Storage...')
    
    const supabase = createServiceClient()

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64')
    console.log('[Storage] Image size:', buffer.length, 'bytes')

    // Generate unique filename
    const timestamp = Date.now()
    const finalFilename = filename || `${userId}/${timestamp}.png`

    // Upload to Supabase Storage bucket 'post-images'
    const { data, error } = await supabase.storage
      .from('post-images')
      .upload(finalFilename, buffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files
      })

    if (error) {
      console.error('[Storage] Upload error:', error)
      return {
        success: false,
        error: `Storage upload failed: ${error.message}`,
      }
    }

    console.log('[Storage] ✓ Image uploaded:', data.path)

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('post-images')
      .getPublicUrl(finalFilename)

    const publicUrl = urlData.publicUrl

    console.log('[Storage] ✓ Public URL:', publicUrl)

    return {
      success: true,
      publicUrl,
    }
  } catch (error) {
    console.error('[Storage] Exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Delete an image from Supabase Storage
 */
export async function deleteImageFromStorage(
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient()

    const { error } = await supabase.storage
      .from('post-images')
      .remove([filePath])

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
