import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Stop words and common phrases to remove from search queries
const STOP_WORDS = [
  'what', 'is', 'are', 'how', 'to', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'for', 'with', 'by',
  'from', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off',
  'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'all', 'any',
  'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now'
];

const COMMON_PHRASES = [
  'what is', 'how to', 'what are', 'how do', 'how can', 'what does', 'how does', 'tell me about',
  'explain', 'describe', 'show me', 'give me', 'find', 'search for', 'look for'
];

// Clean and extract meaningful keywords from query
function extractKeywords(query: string): string {
  let cleanQuery = query.toLowerCase().trim();
  
  // Remove common phrases first
  COMMON_PHRASES.forEach(phrase => {
    cleanQuery = cleanQuery.replace(new RegExp(`\\b${phrase}\\b`, 'gi'), ' ');
  });
  
  // Split into words and remove stop words
  const words = cleanQuery
    .split(/\s+/)
    .filter(word => word.length > 2) // Remove very short words
    .filter(word => !STOP_WORDS.includes(word))
    .filter(word => /^[a-zA-Z0-9]+$/.test(word)); // Only alphanumeric words
  
  // Join meaningful keywords
  const meaningfulQuery = words.join(' ').trim();
  
  console.log(`Original query: "${query}"`);
  console.log(`Extracted keywords: "${meaningfulQuery}"`);
  
  return meaningfulQuery || query; // Fallback to original if no keywords found
}

// Two-stage search: Fast pre-filtering + Deep analysis
export async function POST(request: NextRequest) {
  try {
    console.log('Hybrid search API called');
    
    const { query, documents, threshold = 0.3 } = await request.json();
    console.log('Search query:', query, 'Documents:', documents.length);

    if (!query || !documents) {
      return NextResponse.json({ error: 'Query and documents are required' }, { status: 400 });
    }

    const startTime = Date.now();

    // Extract meaningful keywords from query
    const cleanedQuery = extractKeywords(query);
    
    if (!cleanedQuery.trim()) {
      return NextResponse.json({
        success: true,
        results: [],
        query,
        cleanedQuery,
        message: 'No meaningful keywords found in query. Try using specific terms.',
        totalProcessed: 0,
        totalReturned: 0,
        processingTimeMs: 0,
        searchType: 'hybrid'
      });
    }

    // Stage 1: Fast pre-filtering using basic info only
    console.log('Stage 1: Fast pre-filtering...');
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const queryResult = await model.embedContent(cleanedQuery); // Use cleaned query
    const queryEmbedding = queryResult.embedding.values;

    // Generate embeddings for basic info (title + description + tags)
    const basicTexts = documents.map(doc => 
      `${doc.title} ${doc.description} ${doc.tags.join(' ')}`
    );

    const basicEmbeddings = await Promise.all(
      basicTexts.map(text => model.embedContent(text))
    );

    // Calculate basic similarities and pre-filter
    const preFilteredDocs = [];
    for (let i = 0; i < documents.length; i++) {
      const basicEmbedding = basicEmbeddings[i].embedding.values;
      const basicSimilarity = cosineSimilarity(queryEmbedding, basicEmbedding);
      
      // Lower threshold for pre-filtering (cast wider net)
      if (basicSimilarity >= threshold * 0.7) {
        preFilteredDocs.push({
          ...documents[i],
          index: i,
          basicSimilarity
        });
      }
    }

    console.log(`Pre-filtered to ${preFilteredDocs.length}/${documents.length} documents`);

    // Stage 2: Deep analysis only on pre-filtered documents
    console.log('Stage 2: Deep content analysis...');
    const finalResults = [];

    // Process pre-filtered documents in parallel (limited batch)
    const batchSize = 3;
    for (let i = 0; i < preFilteredDocs.length; i += batchSize) {
      const batch = preFilteredDocs.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (doc) => {
        try {
          // Quick content extraction with timeout
          const extractedContent = await extractContentQuick(doc.url, doc.type);
          const fullText = `${doc.title} ${doc.description} ${doc.tags.join(' ')} ${extractedContent}`;
          
          // Generate full embedding
          const fullResult = await model.embedContent(fullText);
          const fullEmbedding = fullResult.embedding.values;
          const fullSimilarity = cosineSimilarity(queryEmbedding, fullEmbedding);
          
          return {
            ...doc,
            similarity: fullSimilarity,
            extractedContentLength: extractedContent.length,
            hasExtractedContent: extractedContent.length > 0
          };
        } catch (error) {
          console.error(`Error in deep analysis for ${doc.title}:`, error);
          // Fallback to basic similarity
          return {
            ...doc,
            similarity: doc.basicSimilarity,
            extractedContentLength: 0,
            hasExtractedContent: false
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      const validResults = batchResults
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value)
        .filter(result => result.similarity >= threshold);

      finalResults.push(...validResults);
    }

    // Sort by final similarity and apply additional filtering
    const sortedResults = finalResults.sort((a, b) => b.similarity - a.similarity);
    
    // Apply additional filtering for better accuracy
    const filteredResults = sortedResults
      .filter(result => {
        // Additional filtering: require minimum similarity for very short queries
        if (query.length <= 3) {
          return result.similarity >= 0.7; // Higher threshold for short queries like "ADX"
        }
        return true;
      });

    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`Hybrid search completed in ${processingTime}ms`);
    console.log(`Returning ${filteredResults.length} results above threshold ${threshold}`);

    return NextResponse.json({
      success: true,
      results: filteredResults,
      query,
      cleanedQuery,
      threshold,
      totalProcessed: documents.length,
      preFiltered: preFilteredDocs.length,
      totalReturned: filteredResults.length,
      processingTimeMs: processingTime,
      searchType: 'hybrid'
    });

  } catch (error) {
    console.error('Hybrid search error:', error);
    return NextResponse.json(
      { 
        error: 'Hybrid search failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Quick content extraction with aggressive timeout
async function extractContentQuick(url: string, type: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AI-Search-Bot/1.0)' },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return '';

    const contentType = response.headers.get('content-type') || '';
    let content = '';

    if (url.includes('docs.google.com')) {
      const docId = url.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
      if (docId) {
        const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
        const exportController = new AbortController();
        const exportTimeoutId = setTimeout(() => exportController.abort(), 1500);
        
        const exportResponse = await fetch(exportUrl, { signal: exportController.signal });
        clearTimeout(exportTimeoutId);
        
        if (exportResponse.ok) {
          content = await exportResponse.text();
        }
      }
    } else if (contentType.includes('text') || contentType.includes('html')) {
      const text = await response.text();
      content = contentType.includes('html') 
        ? text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
        : text;
    }

    return content.substring(0, 2000); // Smaller limit for speed
  } catch (error) {
    return '';
  }
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length === 0 || vecB.length === 0) return 0;
  
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}