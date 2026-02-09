import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Cosine similarity function
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export async function POST(request: NextRequest) {
  try {
    console.log('Search API called');
    
    const { query, limit = 10 } = await request.json();
    console.log('Search query:', query);

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not found');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // 1. Generate embedding for search query
    console.log('Generating embedding for query...');
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const queryResult = await model.embedContent(query);
    const queryEmbedding = queryResult.embedding.values;
    console.log('Query embedding generated, length:', queryEmbedding.length);

    // 2. Use Firestore REST API to get documents
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      return NextResponse.json({ error: 'Firebase project ID not configured' }, { status: 500 });
    }

    console.log('Fetching documents from Firestore via REST API...');
    
    // Use Firestore REST API
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/content`;
    
    try {
      const firestoreResponse = await fetch(firestoreUrl);
      
      if (!firestoreResponse.ok) {
        console.error('Firestore REST API error:', firestoreResponse.status, firestoreResponse.statusText);
        return NextResponse.json({
          success: true,
          results: [],
          query,
          totalFound: 0,
          message: 'Unable to fetch content from database. Please try uploading content first.'
        });
      }

      const firestoreData = await firestoreResponse.json();
      console.log('Firestore response:', firestoreData);

      if (!firestoreData.documents || firestoreData.documents.length === 0) {
        return NextResponse.json({
          success: true,
          results: [],
          query,
          totalFound: 0,
          message: 'No content found in database. Please upload some content first.'
        });
      }

      // 3. Process documents and calculate similarities
      const results: any[] = [];
      
      for (const doc of firestoreData.documents) {
        const docId = doc.name.split('/').pop();
        const fields = doc.fields;
        
        // Extract data from Firestore format
        const docData = {
          title: fields.title?.stringValue || '',
          description: fields.description?.stringValue || '',
          tags: fields.tags?.arrayValue?.values?.map((v: any) => v.stringValue) || [],
          type: fields.type?.stringValue || '',
          url: fields.url?.stringValue || '',
          embedding: fields.embedding?.arrayValue?.values?.map((v: any) => v.doubleValue || v.integerValue) || null,
          createdAt: fields.createdAt?.timestampValue || null
        };

        console.log('Processing document:', docId, 'has embedding:', !!docData.embedding);
        
        if (docData.embedding && Array.isArray(docData.embedding)) {
          try {
            const similarity = cosineSimilarity(queryEmbedding, docData.embedding);
            results.push({
              id: docId,
              similarity,
              title: docData.title,
              description: docData.description,
              tags: docData.tags,
              type: docData.type,
              url: docData.url,
              createdAt: docData.createdAt
            });
          } catch (err) {
            console.error('Error calculating similarity for doc:', docId, err);
          }
        }
      }

      console.log('Results calculated:', results.length);

      // 4. Sort by similarity and return top results
      const sortedResults = results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      console.log('Returning sorted results:', sortedResults.length);

      return NextResponse.json({
        success: true,
        results: sortedResults,
        query,
        totalFound: results.length
      });

    } catch (firestoreError) {
      console.error('Firestore access error:', firestoreError);
      return NextResponse.json({
        success: true,
        results: [],
        query,
        totalFound: 0,
        message: 'Unable to access database. Please ensure you have uploaded content and try again.'
      });
    }

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { 
        error: 'Search failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}