-- Migration: Add Gemini Image Generation Support
-- This migration adds support for AI-generated images using Google Gemini

-- Add gemini_api_key column to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;

-- Add image generation settings to schedule_config table
ALTER TABLE schedule_config
ADD COLUMN IF NOT EXISTS image_generation_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS image_times TEXT[] DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN user_profiles.gemini_api_key IS 'Google Gemini API key for image generation';
COMMENT ON COLUMN schedule_config.image_generation_enabled IS 'Whether to enable AI image generation for posts';
COMMENT ON COLUMN schedule_config.image_times IS 'Array of times (HH:MM format) when posts should include AI-generated images';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_gemini_key ON user_profiles(gemini_api_key) WHERE gemini_api_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_schedule_config_image_enabled ON schedule_config(image_generation_enabled) WHERE image_generation_enabled = TRUE;
