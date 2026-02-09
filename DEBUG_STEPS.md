# Debug Steps for AI Search

## 🔍 Let's Debug Step by Step

### Step 1: Check if API endpoints are working

1. **Restart your development server**:
   ```bash
   # Stop current server (Ctrl+C)
   # Then restart
   npm run dev
   ```

2. **Test the embedding API directly**:
   Open browser console and run:
   ```javascript
   fetch('/api/generate-embedding', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ text: 'test monetization' })
   }).then(r => r.json()).then(console.log)
   ```

### Step 2: Upload Test Content First

Before searching, you need content in the database:

1. Go to `/content-manager`
2. Upload this test content:
   - **Title**: "Monetization Strategies"
   - **Description**: "How to monetize your app with ads and in-app purchases"
   - **Tags**: "monetization, ads, revenue, in-app purchases"
   - **Type**: Document
   - **URL**: https://example.com/monetization

### Step 3: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Try uploading content - look for any errors
4. Try searching - look for detailed logs

### Step 4: Check Network Tab

1. Open DevTools → Network tab
2. Try searching
3. Look for the `/api/search-content` request
4. Check if it returns 200 or error status
5. Look at the response body

## 🚨 Common Issues & Solutions

### Issue 1: "Search failed" 
**Cause**: No content in database or API error
**Solution**: Upload content first, check console logs

### Issue 2: API Key Error
**Cause**: GEMINI_API_KEY not set or invalid
**Solution**: Check `.env.local` file, restart server

### Issue 3: Firestore Permission Error
**Cause**: Rules not deployed
**Solution**: Deploy firestore rules via Firebase console

### Issue 4: Empty Results
**Cause**: No content uploaded yet
**Solution**: Upload test content first

## 🧪 Quick Test Sequence

1. **Upload test content** (use the sample above)
2. **Wait for success message**
3. **Search for "monetization"**
4. **Should return the uploaded content**

## 📝 What to Check in Console

Look for these logs:
- ✅ "Starting upload process..."
- ✅ "Embedding response status: 200"
- ✅ "Content uploaded successfully!"
- ✅ "Starting search for: monetization"
- ✅ "Response status: 200"
- ✅ "Found X results"

If you see errors, copy them and let me know!