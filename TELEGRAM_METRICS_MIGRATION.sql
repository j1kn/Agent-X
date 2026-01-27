-- =====================================================
-- TELEGRAM METRICS TRACKING MIGRATION
-- =====================================================
-- This migration updates the post_metrics table to support
-- platform-specific metrics (Telegram, X, LinkedIn)
-- =====================================================

-- Step 1: Add new columns to post_metrics table
ALTER TABLE post_metrics
ADD COLUMN IF NOT EXISTS platform text DEFAULT 'x',
ADD COLUMN IF NOT EXISTS forwards integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS reactions integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS engagement_score float DEFAULT 0;

-- Step 2: Create index for faster queries by platform
CREATE INDEX IF NOT EXISTS idx_post_metrics_platform ON post_metrics(platform);
CREATE INDEX IF NOT EXISTS idx_post_metrics_collected_at ON post_metrics(collected_at DESC);

-- Step 3: Add index on posts table for faster metrics collection queries
CREATE INDEX IF NOT EXISTS idx_posts_platform_status ON posts(platform, status);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC) WHERE status = 'published';

-- Step 4: Update existing metrics to have platform = 'x' (for backward compatibility)
UPDATE post_metrics
SET platform = 'x'
WHERE platform IS NULL;

-- Step 5: Create a view for easy metrics aggregation
CREATE OR REPLACE VIEW post_metrics_summary AS
SELECT 
  pm.post_id,
  p.platform,
  p.content,
  p.published_at,
  p.platform_post_id,
  p.user_id,
  pm.views,
  pm.likes,
  pm.retweets,
  pm.forwards,
  pm.reactions,
  pm.comments,
  pm.engagement_score,
  pm.collected_at,
  pm.created_at
FROM post_metrics pm
JOIN posts p ON pm.post_id = p.id
WHERE p.status = 'published'
ORDER BY pm.collected_at DESC;

-- Step 6: Add RLS policies for post_metrics (if not already present)
ALTER TABLE post_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own post metrics" ON post_metrics;
DROP POLICY IF EXISTS "Users can insert their own post metrics" ON post_metrics;

-- Create new policies
CREATE POLICY "Users can view their own post metrics" ON post_metrics
  FOR SELECT
  USING (
    post_id IN (
      SELECT id FROM posts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own post metrics" ON post_metrics
  FOR INSERT
  WITH CHECK (
    post_id IN (
      SELECT id FROM posts WHERE user_id = auth.uid()
    )
  );

-- Step 7: Create a function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(
  p_views integer,
  p_likes integer,
  p_retweets integer,
  p_forwards integer,
  p_reactions integer,
  p_comments integer
)
RETURNS float
LANGUAGE plpgsql
AS $$
BEGIN
  -- Engagement formula:
  -- views * 0.2 + forwards * 3 + reactions * 2 + comments * 4
  -- (likes and retweets are for X platform, included for backward compatibility)
  RETURN (
    COALESCE(p_views, 0) * 0.2 +
    COALESCE(p_forwards, 0) * 3.0 +
    COALESCE(p_reactions, 0) * 2.0 +
    COALESCE(p_comments, 0) * 4.0 +
    COALESCE(p_likes, 0) * 2.0 +
    COALESCE(p_retweets, 0) * 3.0
  );
END;
$$;

-- Step 8: Create trigger to auto-calculate engagement_score on insert/update
CREATE OR REPLACE FUNCTION update_engagement_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.engagement_score := calculate_engagement_score(
    NEW.views,
    NEW.likes,
    NEW.retweets,
    NEW.forwards,
    NEW.reactions,
    NEW.comments
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_engagement_score ON post_metrics;

CREATE TRIGGER trigger_update_engagement_score
  BEFORE INSERT OR UPDATE ON post_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_engagement_score();

-- =====================================================
-- VERIFICATION QUERIES (Run these to verify)
-- =====================================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'post_metrics'
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'post_metrics';

-- Test engagement score calculation
-- SELECT calculate_engagement_score(100, 10, 5, 3, 8, 2) as test_score;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
