# AI Search Setup Guide

## 🚀 Quick Setup

### 1. Get Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the generated API key

### 2. Set Environment Variable
1. Create `.env.local` file in your project root:
```bash
GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Test the Implementation
1. Start your development server:
```bash
npm run dev
```

2. Navigate to `/content-manager` in your app
3. Upload some test content
4. Try searching with natural language queries

## 📁 Files Created

### API Routes
- `src/app/api/generate-embedding/route.ts` - Generates AI embeddings
- `src/app/api/search-content/route.ts` - Performs AI-powered search

### Frontend
- `src/app/content-manager/page.tsx` - Complete UI for upload and search
- Updated `src/app/admin/layout.tsx` - Added Content Manager navigation

## 🧪 Test Data Examples

Try uploading these sample contents:

### Sample 1: Gaming Revenue
- **Title**: "Plug Product Overview"
- **Description**: "Comprehensive guide to plug gaming platform with monetization features and revenue strategies"
- **Tags**: "plug, games, monetization, gaming platform, revenue, ads"
- **Type**: Document
- **URL**: https://example.com/plug-overview

### Sample 2: Revenue Strategies
- **Title**: "How to Increase App Revenue"
- **Description**: "Advanced strategies for increasing revenue through in-app purchases, ads, and user engagement"
- **Tags**: "revenue, monetization, ads, in-app purchases, growth, engagement"
- **Type**: Video
- **URL**: https://youtube.com/watch?v=example

### Sample 3: Game Development
- **Title**: "Building Engaging Games with Rewards"
- **Description**: "Best practices for game development focusing on reward systems and user retention"
- **Tags**: "game development, rewards, engagement, user retention, gaming"
- **Type**: PDF
- **URL**: https://drive.google.com/file/example

## 🔍 Test Search Queries

After uploading the sample content, try these searches:

1. **"how to increase revenue"** → Should return revenue-related content
2. **"gaming monetization strategies"** → Should return plug and revenue content
3. **"reward system for games"** → Should return game development content
4. **"ad integration in apps"** → Should return revenue strategies
5. **"user engagement techniques"** → Should return multiple relevant results

## 📊 Expected Results

- **Similarity Scores**: Results show percentage match (higher = more relevant)
- **Semantic Understanding**: Searches work even if exact words don't match
- **Ranked Results**: Most relevant content appears first
- **Fast Response**: Results typically return in 1-2 seconds

## 🔧 Firestore Structure

The system creates documents in the `content` collection:

```javascript
{
  id: "auto-generated",
  title: "Your Title",
  description: "Your Description", 
  tags: ["tag1", "tag2", "tag3"],
  type: "document|video|pdf",
  url: "https://your-url.com",
  searchableText: "combined text for search",
  embedding: [0.123, -0.456, ...], // 768-dimensional vector
  createdAt: timestamp,
  uploadedBy: "user@example.com"
}
```

## 🚨 Troubleshooting

### API Key Issues
- Make sure `.env.local` is in project root
- Restart development server after adding environment variables
- Check API key is valid at Google AI Studio

### Search Not Working
- Verify content has been uploaded with embeddings
- Check browser console for errors
- Ensure Firestore rules allow read/write access

### No Results Found
- Try simpler search terms first
- Upload more content for better testing
- Check that uploaded content has tags and descriptions

## 💡 Usage Tips

1. **Better Tags**: Use descriptive, searchable tags
2. **Rich Descriptions**: Detailed descriptions improve search accuracy
3. **Varied Content**: Upload different types of content for comprehensive testing
4. **Natural Language**: Search using natural questions, not just keywords

## 🔄 Next Steps

1. **Test with your content**: Upload real documents and videos
2. **Refine search**: Adjust similarity thresholds if needed
3. **Add features**: Consider adding filters, categories, or advanced search
4. **Scale up**: Move to paid Gemini tier when ready for production

## 📈 Free Tier Limits

- **Gemini API**: 15 requests/minute, 1,500 requests/day
- **Perfect for POC**: Can handle ~500 uploads and 1,000 searches daily
- **Firestore**: 1GB storage, 50K reads/day (free tier)

Your AI-powered search system is now ready to use! 🎉