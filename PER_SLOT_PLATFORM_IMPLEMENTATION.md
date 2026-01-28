# Per-Slot Platform Selection - Implementation Guide

## ✅ Completed

### Database Migration
- ✅ Added `platform_preferences` JSONB column to `schedule_config` table
- ✅ Created GIN index for performance
- ✅ Migrated existing users to default (all platforms selected)
- ✅ Verified migration: Existing schedule has all platforms enabled

**Current Data:**
```json
{
  "15:25": ["linkedin", "x", "telegram"]
}
```

---

## 🔧 Implementation Steps

### Step 1: Update TypeScript Types

**File: `types/database.ts`**

Add to `schedule_config` Row/Insert/Update:
```typescript
platform_preferences: Json | null  // { "09:00": ["linkedin", "x"], ... }
```

### Step 2: Create Helper Types and Functions

**File: `lib/autopilot/workflow-helpers.ts`**

Add these types and function:

```typescript
export type PlatformPreferences = {
  [timeSlot: string]: Platform[]
}

export type ScheduleConfig = {
  days_of_week: string[] | null
  times: string[] | null
  timezone: string | null
  image_generation_enabled?: boolean | null
  image_times?: string[] | null
  platform_preferences?: PlatformPreferences | null
}

/**
 * Get platforms to post to for a specific time slot
 */
export function getPlatformsForTime(
  schedule: ScheduleConfig,
  matchedTime?: string
): Platform[] {
  if (!matchedTime) {
    return []
  }

  if (!schedule.platform_preferences) {
    return ['linkedin', 'x', 'telegram']
  }

  const platforms = schedule.platform_preferences[matchedTime]

  if (!platforms || platforms.length === 0) {
    return ['linkedin', 'x', 'telegram']
  }

  return platforms
}
```

### Step 3: Update Platform Variants

**File: `lib/platforms/transformers.ts`**

Update interface and function:

```typescript
export interface PlatformVariants {
  x: string
  telegram: string
  linkedin: string  // ADD THIS
}

export function createPlatformVariants(masterContent: string): PlatformVariants {
  return {
    x: optimizeForX(masterContent),
    telegram: optimizeForTelegram(masterContent),
    linkedin: optimizeForLinkedIn(masterContent),  // ADD THIS
  }
}
```

### Step 4: Update Cron Workflow

**File: `app/api/cron/publish/route.ts`**

**Line ~207 - Replace hardcoded platforms:**

```typescript
// BEFORE:
.in('platform', ['x', 'telegram'])

// AFTER:
const platformsToPost = getPlatformsForTime(schedule, matchResult.matchedTime)

if (platformsToPost.length === 0) {
  console.log('[Auto-Gen] No platforms configured for this time slot')
  results.push({ userId: user.id, status: 'skipped', error: 'No platforms configured' })
  continue
}

console.log(`[Auto-Gen] Platforms for ${matchResult.matchedTime}:`, platformsToPost)

const { data: accountsData } = await supabase
  .from('connected_accounts')
  .select('id, platform, access_token, platform_user_id, username, token_expires_at')
  .eq('user_id', user.id)
  .eq('is_active', true)
  .in('platform', platformsToPost)  // DYNAMIC
```

**Line ~336 - Update content selection:**

```typescript
// BEFORE:
const content = platform === 'x' ? variants.x : variants.telegram

// AFTER:
let content: string
switch (platform) {
  case 'x':
    content = variants.x
    break
  case 'telegram':
    content = variants.telegram
    break
  case 'linkedin':
    content = variants.linkedin
    break
  default:
    console.warn(`[Auto-Gen] Unknown platform: ${platform}`)
    continue
}
```

### Step 5: Update Schedule API

**File: `app/api/schedule/route.ts`**

**In POST handler, add platform_preferences:**

```typescript
const {
  days_of_week,
  times,
  frequency,
  timezone,
  image_generation_enabled,
  image_times,
  platform_preferences  // ADD THIS
} = await request.json()

// Validate platform_preferences
if (platform_preferences) {
  if (typeof platform_preferences !== 'object') {
    return NextResponse.json(
      { error: 'platform_preferences must be an object' },
      { status: 400 }
    )
  }
  
  // Validate each time slot has valid platforms
  for (const [time, platforms] of Object.entries(platform_preferences)) {
    if (!Array.isArray(platforms)) {
      return NextResponse.json(
        { error: `platform_preferences['${time}'] must be an array` },
        { status: 400 }
      )
    }
    
    const validPlatforms = ['linkedin', 'x', 'telegram']
    for (const platform of platforms) {
      if (!validPlatforms.includes(platform)) {
        return NextResponse.json(
          { error: `Invalid platform: ${platform}` },
          { status: 400 }
        )
      }
    }
  }
}

// In upsert, add platform_preferences
const { error } = await supabase
  .from('schedule_config')
  .upsert({
    user_id: user.id,
    days_of_week,
    times,
    frequency,
    timezone,
    image_generation_enabled,
    image_times,
    platform_preferences,  // ADD THIS
    updated_at: new Date().toISOString(),
  })
```

### Step 6: Update Schedule Page UI

**File: `app/(dashboard)/schedule/page.tsx`**

This is the most complex change. Add after the "Posting Times" section (around line 257):

```typescript
// Add to state
const [platformPreferences, setPlatformPreferences] = useState<{[key: string]: string[]}>({})

// Add helper functions
const togglePlatformForTime = (time: string, platform: string) => {
  setPlatformPreferences(prev => {
    const current = prev[time] || ['linkedin', 'x', 'telegram']
    const updated = current.includes(platform)
      ? current.filter(p => p !== platform)
      : [...current, platform]
    return { ...prev, [time]: updated }
  })
}

const toggleAllPlatformsForTime = (time: string, selectAll: boolean) => {
  setPlatformPreferences(prev => ({
    ...prev,
    [time]: selectAll ? ['linkedin', 'x', 'telegram'] : []
  }))
}

// Update fetchSchedule to load platform_preferences
const fetchSchedule = async () => {
  // ... existing code ...
  if (data) {
    // ... existing setters ...
    setPlatformPreferences(data.platform_preferences || {})
  }
}

// Update handleSave to send platform_preferences
const handleSave = async () => {
  // ... existing code ...
  const response = await fetch('/api/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      days_of_week: daysOfWeek,
      times,
      frequency,
      timezone,
      image_generation_enabled: imageGenerationEnabled,
      image_times: imageTimes,
      platform_preferences: platformPreferences,  // ADD THIS
    }),
  })
}

// Update addTime to default new slots to all platforms
const addTime = () => {
  if (newTime && !times.includes(newTime)) {
    setTimes([...times, newTime])
    setPlatformPreferences(prev => ({
      ...prev,
      [newTime]: ['linkedin', 'x', 'telegram']  // Default to all
    }))
    setNewTime('')
  }
}

// Update removeTime to clean up platform preferences
const removeTime = (timeToRemove: string) => {
  setTimes(times.filter(t => t !== timeToRemove))
  setPlatformPreferences(prev => {
    const updated = { ...prev }
    delete updated[timeToRemove]
    return updated
  })
}

// Add UI component after Posting Times section
<div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-6 mb-6">
  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
    🎯 Platform Selection
  </h3>
  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
    Choose which platforms to post to at each time
  </p>

  {times.length === 0 ? (
    <p className="text-sm text-gray-500 dark:text-gray-400">
      Add posting times above to configure platform selection
    </p>
  ) : (
    <div className="space-y-4">
      {times.map((time) => {
        const selectedPlatforms = platformPreferences[time] || ['linkedin', 'x', 'telegram']
        const allSelected = selectedPlatforms.length === 3
        
        return (
          <div key={time} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium text-gray-900 dark:text-white">{time}</span>
              <button
                type="button"
                onClick={() => toggleAllPlatformsForTime(time, !allSelected)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {/* LinkedIn */}
              <button
                type="button"
                onClick={() => togglePlatformForTime(time, 'linkedin')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  selectedPlatforms.includes('linkedin')
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                }`}
              >
                <div className="text-2xl mb-1">💼</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  LinkedIn
                </div>
              </button>

              {/* X (Twitter) */}
              <button
                type="button"
                onClick={() => togglePlatformForTime(time, 'x')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  selectedPlatforms.includes('x')
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                }`}
              >
                <div className="text-2xl mb-1">𝕏</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  X
                </div>
              </button>

              {/* Telegram */}
              <button
                type="button"
                onClick={() => togglePlatformForTime(time, 'telegram')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  selectedPlatforms.includes('telegram')
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-sky-300'
                }`}
              >
                <div className="text-2xl mb-1">✈️</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Telegram
                </div>
              </button>
            </div>

            {selectedPlatforms.length === 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                ⚠️ No platforms selected - posts will be skipped at this time
              </p>
            )}
          </div>
        )
      })}
    </div>
  )}

  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
    <p className="text-sm text-blue-800 dark:text-blue-300">
      💡 <strong>Platform Tips:</strong>
    </p>
    <ul className="text-xs text-blue-700 dark:text-blue-400 mt-1 space-y-1">
      <li>• LinkedIn works best for professional content and industry insights</li>
      <li>• X is great for quick updates and engaging conversations</li>
      <li>• Telegram is ideal for community updates and longer content</li>
    </ul>
  </div>
</div>
```

---

## 🧪 Testing Checklist

- [ ] Database migration applied successfully
- [ ] Existing users have all platforms selected by default
- [ ] New time slots default to all platforms
- [ ] Can select/deselect individual platforms per time slot
- [ ] "Select all" / "Deselect all" buttons work
- [ ] Warning shows when no platforms selected
- [ ] API validates platform_preferences structure
- [ ] API validates platform names
- [ ] Cron job uses dynamic platform selection
- [ ] LinkedIn content is generated and published
- [ ] X content is generated and published
- [ ] Telegram content is generated and published
- [ ] Can mix platforms (e.g., LinkedIn + X at 9 AM, Telegram at 3 PM)
- [ ] Removing a time slot cleans up platform preferences
- [ ] Dark mode works correctly
- [ ] Mobile responsive layout works

---

## 📝 Summary

This implementation allows users to:
1. **Select different platforms for different time slots**
2. **Include LinkedIn in auto-generation workflow**
3. **Have granular control** (e.g., "LinkedIn at 9 AM, X at 3 PM")
4. **Maintain backward compatibility** (existing users get all platforms)

**Key Benefits:**
- ✅ Professional content on LinkedIn during business hours
- ✅ Quick updates on X throughout the day
- ✅ Community engagement on Telegram in evenings
- ✅ Optimized content for each platform
- ✅ No breaking changes for existing users

---

## 🚀 Deployment

1. Database migration already applied ✅
2. Update TypeScript types
3. Add helper function
4. Update API routes
5. Update cron workflow
6. Update UI
7. Test thoroughly
8. Deploy to production
9. Monitor logs

**Estimated Time:** 4-6 hours for full implementation and testing
