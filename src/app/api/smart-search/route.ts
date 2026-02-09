import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Cache for extracted content (in-memory cache)
const contentCache = new Map<string, { content: string, timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Extract content from URL with caching
async function extractContentFromUrl(url: string, type: string): Promise<string> {
  // Check cache first
  const cached = contentCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Using cached content for:', url);
    return cached.content;
  }

  try {
    console.log('Extracting content from:', url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-Search-Bot/1.0)'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log('Failed to fetch URL:', response.status);
      return '';
    }

    const contentType = response.headers.get('content-type') || '';
    let content = '';

    if (url.includes('docs.google.com')) {
      // Google Docs - try export URL
      const docId = url.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
      if (docId) {
        const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
        try {
          const exportController = new AbortController();
          const exportTimeoutId = setTimeout(() => exportController.abort(), 3000);
          
          const exportResponse = await fetch(exportUrl, { signal: exportController.signal });
          clearTimeout(exportTimeoutId);
          
          if (exportResponse.ok) {
            content = await exportResponse.text();
          }
        } catch (err) {
          console.log('Google Docs export failed');
        }
      }
    } else if (contentType.includes('text') || contentType.includes('html')) {
      const text = await response.text();
      
      if (contentType.includes('html')) {
        // Optimized HTML cleaning
        content = text
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/<style[^>]*>.*?<\/style>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      } else {
        content = text;
      }
    }

    // Limit content size and cache it
    content = content.substring(0, 4000); // Reduced from 8000
    contentCache.set(url, { content, timestamp: Date.now() });
    
    return content;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Content extraction timed out for:', url);
    } else {
      console.error('Content extraction error:', error);
    }
    return '';
  }
}

// Batch embedding generation
async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
  const embeddings: number[][] = [];
  
  // Process in smaller batches to avoid rate limits
  const batchSize = 3;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchPromises = batch.map(text => model.embedContent(text));
    
    try {
      const batchResults = await Promise.all(batchPromises);
      embeddings.push(...batchResults.map(result => result.embedding.values));
    } catch (error) {
      console.error('Batch embedding error:', error);
      // Fallback: process individually
      for (const text of batch) {
        try {
          const result = await model.embedContent(text);
          embeddings.push(result.embedding.values);
        } catch (individualError) {
          console.error('Individual embedding error:', individualError);
          embeddings.push([]); // Empty embedding as fallback
        }
      }
    }
  }
  
  return embeddings;
}

// Cosine similarity function
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length === 0 || vecB.length === 0) return 0;
  
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export async function POST(request: NextRequest) {
  try {
    console.log('Optimized smart search API called');
    
    const { query, documents, threshold = 0.3 } = await request.json();
    console.log('Search query:', query);
    console.log('Documents to search:', documents.length);

    if (!query || !documents) {
      return NextResponse.json({ error: 'Query and documents are required' }, { status: 400 });
    }

    const startTime = Date.now();

    // 1. Generate query embedding first
    console.log('Generating query embedding...');
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const queryResult = await model.embedContent(query);
    const queryEmbedding = queryResult.embedding.values;

    // 2. Extract content from all documents in parallel (with timeout)
    console.log('Extracting content from all documents in parallel...');
    const contentExtractionPromises = documents.map(async (doc, index) => {
      try {
        const extractedContent = await extractContentFromUrl(doc.url, doc.type);
        const fullText = `${doc.title} ${doc.description} ${doc.tags.join(' ')} ${extractedContent}`;
        
        return {
          index,
          doc,
          fullText,
          extractedContentLength: extractedContent.length,
          hasExtractedContent: extractedContent.length > 0
        };
      } catch (error) {
        console.error(`Error processing ${doc.title}:`, error);
        // Fallback to basic info
        const basicText = `${doc.title} ${doc.description} ${doc.tags.join(' ')}`;
        return {
          index,
          doc,
          fullText: basicText,
          extractedContentLength: 0,
          hasExtractedContent: false
        };
      }
    });

    // Wait for all content extraction with timeout
    const contentResults = await Promise.allSettled(contentExtractionPromises);
    const validResults = contentResults
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);

    console.log(`Content extraction completed: ${validResults.length}/${documents.length} successful`);

    // 3. Generate embeddings for all documents in batch
    console.log('Generating embeddings in batch...');
    const allTexts = validResults.map(result => result.fullText);
    const documentEmbeddings = await generateBatchEmbeddings(allTexts);

    // 4. Calculate similarities and filter
    const results = [];
    for (let i = 0; i < validResults.length; i++) {
      const result = validResults[i];
      const embedding = documentEmbeddings[i];
      
      if (embedding && embedding.length > 0) {
        const similarity = cosineSimilarity(queryEmbedding, embedding);
        
        if (similarity >= threshold) {
          results.push({
            ...result.doc,
            similarity,
            extractedContentLength: result.extractedContentLength,
            hasExtractedContent: result.hasExtractedContent
          });
        }
      }
    }

    // 5. Sort by similarity
    const sortedResults = results.sort((a, b) => b.similarity - a.similarity);
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`Search completed in ${processingTime}ms`);
    console.log(`Returning ${sortedResults.length} results above threshold ${threshold}`);

    return NextResponse.json({
      success: true,
      results: sortedResults,
      query,
      threshold,
      totalProcessed: documents.length,
      totalReturned: sortedResults.length,
      processingTimeMs: processingTime,
      cacheHits: Array.from(contentCache.keys()).length
    });

  } catch (error) {
    console.error('Optimized smart search error:', error);
    return NextResponse.json(
      { 
        error: 'Smart search failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}