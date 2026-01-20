# Gemini Image Generation - Testing Checklist

## Pre-Deployment Steps

### 1. Database Migration
- [ ] Run the migration in Supabase SQL Editor
  ```sql
  -- Copy and paste contents from GEMINI_IMAGE_MIGRATION.sql
  ```
- [ ] Verify columns were added:
  ```sql
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'user_profiles' AND column_name = 'gemini_api_key';
  
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'schedule_config' 
  AND column_name IN ('image_generation_enabled', 'image_times');
  ```

### 2. Environment Variables
- [ ] Verify Claude API key is set in Vercel:
  ```
  CLAUDE_API_KEY=sk-ant-api03-YOUR-CLAUDE-API-KEY-HERE
  ```
- [ ] Note: Gemini API key is user-specific (not an env var)

### 3. Deploy to Vercel
- [ ] Push changes to Git
- [ ] Verify deployment succeeds
- [ ] Check build logs for errors

## Testing Steps

### Test 1: Settings Page - Gemini Configuration

1. **Navigate to Settings**
   - [ ] Go to `/settings`
   - [ ] Verify purple "Gemini Image Generation" card is visible
   - [ ] Card should have 🎨 icon and gradient background

2. **Add Gemini API Key**
   - [ ] Enter test API key: `AIzaSyA54uMXa8AToYAWjpjT0zsSVaMeuTlNjz8`
   - [ ] Toggle show/hide button (👁️) works
   - [ ] Click "Save Settings"
   - [ ] Verify success message appears
   - [ ] Refresh page - key should show as masked (`••••••••`)
   - [ ] "Connected" badge should appear

3. **Verify API Response**
   - [ ] Open browser DevTools → Network tab
   - [ ] Reload `/settings`
   - [ ] Check GET `/api/settings` response:
     ```json
     {
       "isGeminiConnected": true,
       "profile": {
         "gemini_api_key": "••••••••"
       }
     }
     ```

### Test 2: Schedule Page - Image Time Configuration

1. **Navigate to Schedule**
   - [ ] Go to `/schedule`
   - [ ] Verify purple "Image Generation with Gemini" card is visible
   - [ ] Card should have 🎨 icon and toggle switch

2. **Configure Image Times**
   - [ ] Set up at least 2 posting times (e.g., 09:00, 15:00)
   - [ ] Toggle "Image Generation" ON
   - [ ] Select specific times for images (e.g., only 09:00)
   - [ ] Click "Save Schedule"
   - [ ] Verify success message

3. **Test "Select All" Feature**
   - [ ] Click "Select all times"
   - [ ] All posting times should be checked
   - [ ] Click "Clear all"
   - [ ] All checkboxes should be unchecked

4. **Verify API Response**
   - [ ] Check POST `/api/schedule` request includes:
     ```json
     {
       "image_generation_enabled": true,
       "image_times": ["09:00"]
     }
     ```

### Test 3: Database Verification

1. **Check User Profile**
   ```sql
   SELECT id, gemini_api_key 
   FROM user_profiles 
   WHERE id = 'YOUR_USER_ID';
   ```
   - [ ] `gemini_api_key` should contain the API key

2. **Check Schedule Config**
   ```sql
   SELECT user_id, image_generation_enabled, image_times 
   FROM schedule_config 
   WHERE user_id = 'YOUR_USER_ID';
   ```
   - [ ] `image_generation_enabled` should be `true`
   - [ ] `image_times` should be array like `{09:00}`

### Test 4: Workflow Integration (Manual Post Generation)

1. **Generate a Test Post**
   - [ ] Go to `/posts`
   - [ ] Click "Generate Post" (if available)
   - [ ] Or trigger via API: `POST /api/posts/generate`

2. **Check Pipeline Logs**
   ```sql
   SELECT step, status, message, metadata 
   FROM pipeline_logs 
   WHERE user_id = 'YOUR_USER_ID' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```
   - [ ] Look for "Image prompt generated" message
   - [ ] Check metadata contains `imagePrompt`

3. **Check Post Metadata**
   ```sql
   SELECT id, generation_metadata 
   FROM posts 
   WHERE user_id = 'YOUR_USER_ID' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   - [ ] `generation_metadata` should contain:
     ```json
     {
       "image_prompt": "A detailed description...",
       "image_generation_enabled": true
     }
     ```

### Test 5: Automated Workflow (Cron Job)

1. **Set Up Test Schedule**
   - [ ] Configure schedule for current time + 5 minutes
   - [ ] Enable image generation for that time
   - [ ] Enable autopilot

2. **Wait for Cron Execution**
   - [ ] Wait for scheduled time
   - [ ] Check workflow_runs table:
     ```sql
     SELECT * FROM workflow_runs 
     WHERE user_id = 'YOUR_USER_ID' 
     ORDER BY created_at DESC 
     LIMIT 1;
     ```

3. **Verify Image Prompt in Logs**
   - [ ] Check server logs for:
     - `[Gemini Image] Enhanced prompt:`
     - `Image generation: ENABLED for time XX:XX`
     - `✓ Image prompt created:`

### Test 6: Error Handling

1. **Invalid API Key**
   - [ ] Enter invalid key: `invalid_key_123`
   - [ ] Save settings
   - [ ] Try to generate post
   - [ ] Should see error in pipeline_logs
   - [ ] Post should still be created (without image)

2. **Missing API Key**
   - [ ] Clear Gemini API key
   - [ ] Enable image generation
   - [ ] Generate post
   - [ ] Should skip image generation gracefully

3. **Image Generation Disabled**
   - [ ] Toggle image generation OFF
   - [ ] Generate post at scheduled time
   - [ ] Verify no image prompt in metadata

## Visual Verification

### Settings Page
- [ ] Purple gradient card stands out
- [ ] Toggle button for show/hide works
- [ ] "Connected" badge appears when configured
- [ ] Link to Google AI Studio works

### Schedule Page
- [ ] Purple gradient card matches settings style
- [ ] Toggle switch is prominent
- [ ] Checkboxes for each time slot work
- [ ] "Select all" / "Clear all" buttons work
- [ ] Info box explains the feature

## Performance Checks

- [ ] Settings page loads without errors
- [ ] Schedule page loads without errors
- [ ] Saving settings is fast (< 1 second)
- [ ] Saving schedule is fast (< 1 second)
- [ ] Image prompt generation adds < 3 seconds to workflow

## Browser Console Checks

Open DevTools Console and verify:
- [ ] No TypeScript errors
- [ ] No React warnings
- [ ] No 404 errors for API calls
- [ ] Successful API responses (200 status)

## Final Verification

- [ ] All database migrations applied
- [ ] All UI components render correctly
- [ ] All API endpoints work
- [ ] Image prompts are generated when enabled
- [ ] Image prompts are skipped when disabled
- [ ] Error handling works gracefully
- [ ] Documentation is complete

## Known Limitations

- ✅ Image **prompts** are generated (not actual images)
- ✅ Requires user to have Gemini API key
- ✅ Only works with Gemini Pro model (text generation)
- ✅ Future: Integrate actual image generation API

## Success Criteria

✅ **Feature is working if:**
1. Users can configure Gemini API key in Settings
2. Users can enable/disable image generation in Schedule
3. Users can select specific times for images
4. Image prompts appear in post metadata when enabled
5. System gracefully handles missing/invalid API keys
6. UI is visually distinct with purple theme

## Troubleshooting

If tests fail, check:
1. Database migration completed successfully
2. TypeScript types are up to date
3. All files saved and deployed
4. Browser cache cleared
5. Vercel deployment successful
6. Environment variables set correctly
