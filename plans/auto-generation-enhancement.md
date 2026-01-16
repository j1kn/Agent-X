# Agent X Auto-Generation Enhancement Plan

## Overview
Enhance the legacy cron publish endpoint ([`/api/cron/publish`](../app/api/cron/publish/route.ts)) to automatically generate and publish new content when no scheduled posts are found. This ensures continuous content flow without manual intervention.

## Current System Analysis

### Existing Components

#### 1. **Workflow Runner** ([`/api/workflows/run`](../app/api/workflows/run/route.ts))
- Runs every 5 minutes via Supabase cron
- Checks if current time matches user's schedule
- Auto-generates content and publishes immediately
- Uses autopilot_enabled flag
- Prevents duplicates via workflow_runs table

#### 2. **Legacy Cron Publisher** ([`/api/cron/publish`](../app/api/cron/publish/route.ts))
- Runs every 5 minutes via Supabase cron
- Publishes manually scheduled posts (status='scheduled', scheduled_for <= NOW)
- Does NOT generate new content
- Uses row locking to prevent duplicates

#### 3. **Supabase Cron Jobs** ([`SUPABASE_CRON_SETUP.sql`](../SUPABASE_CRON_SETUP.sql))
- Two cron jobs configured:
  - `workflow-runner-cron`: Calls `/api/workflows/run` every 5 minutes
  - `publish-posts-cron`: Calls `/api/cron/publish` every 5 minutes

## Requirements

### Primary Goal
Modify [`/api/cron/publish`](../app/api/cron/publish/route.ts) to:
1. First, publish any scheduled posts (existing behavior)
2. If NO scheduled posts exist, auto-generate and publish new content
3. Maintain all existing functionality (no breaking changes)

### Key Constraints
- ✅ Keep existing manual post scheduling working
- ✅ Respect autopilot_enabled flag
- ✅ Prevent duplicate posts
- ✅ Support X and Telegram platforms
- ✅ Use existing generation and publishing logic
- ✅ Maintain idempotency

## Solution Design

### Architecture Decision

**Approach:** Enhance the legacy cron publisher to be "smart" - it will:
1. Check for scheduled posts first (priority)
2. If none found, check if user has autopilot enabled
3. If autopilot is ON, trigger auto-generation workflow
4. Publish generated content immediately

### Flow Diagram

```mermaid
graph TD
    A[Supabase Cron Every 5 min] --> B[/api/cron/publish]
    B --> C{Scheduled posts exist?}
    C -->|Yes| D[Publish scheduled posts]
    C -->|No| E{Autopilot enabled?}
    E -->|No| F[Exit - Nothing to do]
    E -->|Yes| G[Get all autopilot users]
    G --> H{For each user}
    H --> I{Time matches schedule?}
    I -->|No| J[Skip user]
    I -->|Yes| K{Already ran this time slot?}
    K -->|Yes| L[Skip user - prevent duplicate]
    K -->|No| M[Select topic]
    M --> N[Generate content with Claude]
    N --> O[Create platform variants]
    O --> P[Publish to X and Telegram]
    P --> Q[Record workflow run]
    Q --> H
    J --> H
    L --> H
    H --> R[Return results]
    D --> R
    F --> R
```

### Implementation Strategy

#### Phase 1: Enhance Cron Publish Endpoint
Modify [`/api/cron/publish/route.ts`](../app/api/cron/publish/route.ts):

1. **Keep existing logic** for publishing scheduled posts
2. **Add new logic** after scheduled posts are processed:
   - Query users with `autopilot_enabled = true`
   - For each user:
     - Check schedule configuration
     - Verify time matches (within 5-minute window)
     - Check workflow_runs table for duplicates
     - If all checks pass, generate and publish

3. **Reuse existing functions** from workflow runner:
   - [`selectNextTopic()`](../lib/autopilot/topicSelector.ts) - Topic selection
   - [`generateContent()`](../lib/ai/generator.ts) - Claude API call
   - [`createPlatformVariants()`](../lib/platforms/transformers.ts) - Platform-specific formatting
   - [`publishToX()`](../lib/platforms/x.ts) and [`publishToTelegram()`](../lib/platforms/telegram.ts) - Publishing

#### Phase 2: Update Supabase Cron Configuration
Verify [`SUPABASE_CRON_SETUP.sql`](../SUPABASE_CRON_SETUP.sql):
- Confirm `publish-posts-cron` runs every 5 minutes (`*/5 * * * *`)
- No changes needed (already configured correctly)

#### Phase 3: Testing Strategy
1. **Test scheduled posts** (existing functionality)
   - Create manual scheduled post
   - Verify it publishes at scheduled time
   
2. **Test auto-generation** (new functionality)
   - Enable autopilot
   - Ensure no scheduled posts exist
   - Wait for cron to run
   - Verify content is generated and published

3. **Test idempotency**
   - Verify no duplicate posts within same time slot
   - Check workflow_runs table

## Detailed Implementation Plan

### Step 1: Create Helper Functions
Extract reusable logic from [`/api/workflows/run/route.ts`](../app/api/workflows/run/route.ts):

```typescript
// New file: lib/autopilot/workflow-helpers.ts
- checkTimeMatch() - Check if current time matches schedule
- processUserWorkflow() - Generate and publish for one user
- logPipeline() - Log to pipeline_logs table
```

### Step 2: Modify Cron Publish Endpoint
Update [`/api/cron/publish/route.ts`](../app/api/cron/publish/route.ts):

```typescript
export async function GET() {
  // PHASE 1: Publish scheduled posts (existing)
  const scheduledResult = await publishScheduledPosts()
  
  // PHASE 2: Auto-generate if no scheduled posts (new)
  if (scheduledResult.published === 0) {
    const autoGenResult = await autoGenerateAndPublish()
    return NextResponse.json({
      scheduled: scheduledResult,
      autoGenerated: autoGenResult
    })
  }
  
  return NextResponse.json({ scheduled: scheduledResult })
}

async function autoGenerateAndPublish() {
  // Get users with autopilot enabled
  // For each user:
  //   - Check schedule matches
  //   - Check no duplicate in workflow_runs
  //   - Generate content
  //   - Publish to platforms
  //   - Record workflow run
}
```

### Step 3: Database Schema Verification
Ensure required tables exist:
- ✅ `user_profiles` (autopilot_enabled, topics, tone)
- ✅ `schedule_config` (days_of_week, times, timezone)
- ✅ `workflow_runs` (user_id, time_slot, status, platforms_published)
- ✅ `connected_accounts` (platform, access_token, is_active)
- ✅ `posts` (status, content, platform, published_at)
- ✅ `pipeline_logs` (step, status, message, metadata)

### Step 4: Update Supabase Cron (if needed)
Check current cron configuration:
- Use Supabase MCP to verify cron jobs
- Ensure `publish-posts-cron` runs every 5 minutes
- Update if necessary

## Implementation Checklist

### Code Changes
- [ ] Create [`lib/autopilot/workflow-helpers.ts`](../lib/autopilot/workflow-helpers.ts) with extracted helper functions
- [ ] Update [`app/api/cron/publish/route.ts`](../app/api/cron/publish/route.ts) with auto-generation logic
- [ ] Add proper TypeScript types for all new functions
- [ ] Add comprehensive error handling and logging

### Supabase Configuration
- [ ] Verify cron job runs every 5 minutes using Supabase MCP
- [ ] Update cron schedule if needed
- [ ] Test cron job execution manually

### Testing
- [ ] Test manual scheduled posts still work
- [ ] Test auto-generation when no scheduled posts
- [ ] Test autopilot ON/OFF behavior
- [ ] Test idempotency (no duplicates)
- [ ] Test multi-user scenarios
- [ ] Test timezone handling
- [ ] Test error scenarios (API failures, missing accounts, etc.)

### Documentation
- [ ] Update [`SUPABASE_CRON_SETUP.sql`](../SUPABASE_CRON_SETUP.sql) comments
- [ ] Add inline documentation to modified files
- [ ] Update README if needed

## Risk Mitigation

### Potential Issues
1. **Duplicate Posts**: Mitigated by workflow_runs table check
2. **API Rate Limits**: Existing rate limiting in place
3. **Cost Concerns**: Claude API calls only when needed
4. **Timezone Issues**: Using Intl.DateTimeFormat with user timezone
5. **Breaking Changes**: All existing functionality preserved

### Rollback Plan
If issues occur:
1. Revert [`/api/cron/publish/route.ts`](../app/api/cron/publish/route.ts) to original version
2. Scheduled posts will continue working
3. Workflow runner remains independent fallback

## Success Criteria

### Functional Requirements
✅ Scheduled posts publish at correct time
✅ Auto-generation triggers when no scheduled posts
✅ No duplicate posts within same time slot
✅ Respects autopilot_enabled flag
✅ Works for multiple users simultaneously
✅ Handles errors gracefully

### Non-Functional Requirements
✅ Response time < 60 seconds
✅ Idempotent (safe to retry)
✅ Proper logging for debugging
✅ No breaking changes to existing features

## Timeline Estimate

**Note:** Time estimates are intentionally omitted per project guidelines. Tasks are broken down into clear, actionable steps that can be executed sequentially.

## Next Steps

1. Review this plan with stakeholders
2. Get approval to proceed
3. Switch to Code mode to implement changes
4. Execute implementation checklist
5. Test thoroughly
6. Deploy to production
7. Monitor for issues

---

**Status:** Ready for Review
**Last Updated:** 2026-01-16
**Mode:** Architect
