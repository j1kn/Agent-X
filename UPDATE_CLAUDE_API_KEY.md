# Update Claude API Key

## New API Key
```
sk-ant-api03-YOUR-NEW-CLAUDE-API-KEY-HERE
```

## Where to Update

Since this project is deployed on Vercel, you need to update the environment variable in the Vercel dashboard:

### Steps to Update on Vercel:

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Select your Agent X project

2. **Navigate to Settings**
   - Click on "Settings" tab
   - Click on "Environment Variables" in the left sidebar

3. **Update CLAUDE_API_KEY**
   - Find the `CLAUDE_API_KEY` variable
   - Click the three dots (⋯) next to it
   - Click "Edit"
   - Replace the old value with the new key:
     ```
     sk-ant-api03-YOUR-NEW-CLAUDE-API-KEY-HERE
     ```
   - Make sure it's enabled for all environments:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
   - Click "Save"

4. **Redeploy (if needed)**
   - Go to the "Deployments" tab
   - Click "Redeploy" on the latest deployment
   - Or push a new commit to trigger automatic deployment

### For Local Development:

If you're running the project locally, create a `.env.local` file in the project root:

```bash
# .env.local
CLAUDE_API_KEY=sk-ant-api03-YOUR-NEW-CLAUDE-API-KEY-HERE
```

**Note:** The `.env.local` file is already in `.gitignore` and won't be committed to version control.

## Verification

After updating:

1. Check the dashboard at `/dashboard` - you should see "✅ AI Connected"
2. Try generating a post to confirm the API key works
3. Check the browser console for any API key errors

## Important Notes

- The old API key will stop working once you update to the new one
- Make sure to update in ALL environments (Production, Preview, Development)
- The new key starts with `sk-ant-api03-` which is the correct format for Anthropic API keys
- Keep this key secure and never commit it to version control
