-- Migration: Add AI Image Generation Support
-- This migration adds support for AI-generated images using Gemini + Stability AI

-- Add API key columns to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS gemini_api_key TEXT,
ADD COLUMN IF NOT EXISTS stability_api_key TEXT;

-- Add image generation settings to schedule_config table
ALTER TABLE schedule_config
ADD COLUMN IF NOT EXISTS image_generation_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS image_times TEXT[] DEFAULT '{}';

-- Add image storage columns to posts table
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS image_data TEXT;

-- Add comments for documentation
COMMENT ON COLUMN user_profiles.gemini_api_key IS 'Google Gemini API key for creating image prompts';
COMMENT ON COLUMN user_profiles.stability_api_key IS 'Stability AI API key for generating images';
COMMENT ON COLUMN schedule_config.image_generation_enabled IS 'Whether to enable AI image generation for posts';
COMMENT ON COLUMN schedule_config.image_times IS 'Array of times (HH:MM format) when posts should include AI-generated images';
COMMENT ON COLUMN posts.image_url IS 'Public URL of the generated image from Supabase Storage';
COMMENT ON COLUMN posts.image_data IS 'Base64-encoded image data (backup)';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_gemini_key ON user_profiles(gemini_api_key) WHERE gemini_api_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_stability_key ON user_profiles(stability_api_key) WHERE stability_api_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_schedule_config_image_enabled ON schedule_config(image_generation_enabled) WHERE image_generation_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_posts_with_images ON posts(image_url) WHERE image_url IS NOT NULL;

-- Note: You also need to create a Supabase Storage bucket named 'post-images'
-- Go to Supabase Dashboard → Storage → Create bucket
-- Bucket name: post-images
-- Public: Yes (so images can be accessed via URL)
