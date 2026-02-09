import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url, type } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    console.log('Extracting content from:', url, 'type:', type);

    let extractedContent = '';

    try {
      // Fetch the document
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      console.log('Content type:', contentType);

      if (type === 'pdf' || contentType.includes('pdf')) {
        // For PDFs, we'd need a PDF parsing library
        // For now, return a message about PDF support
        extractedContent = 'PDF content extraction requires additional setup. Currently using title, description, and tags for search.';
      } else if (type === 'document' || contentType.includes('text') || contentType.includes('html')) {
        // For text/HTML documents
        const text = await response.text();
        
        // Basic HTML tag removal if it's HTML
        if (contentType.includes('html')) {
          extractedContent = text
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/<style[^>]*>.*?<\/style>/gi, '')
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 5000); // Limit to first 5000 characters
        } else {
          extractedContent = text.substring(0, 5000);
        }
      } else if (url.includes('docs.google.com')) {
        // For Google Docs, try to get the export URL
        const docId = url.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
        if (docId) {
          const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
          try {
            const exportResponse = await fetch(exportUrl);
            if (exportResponse.ok) {
              extractedContent = (await exportResponse.text()).substring(0, 5000);
            } else {
              extractedContent = 'Unable to extract Google Docs content. Using title, description, and tags for search.';
            }
          } catch (err) {
            extractedContent = 'Google Docs content extraction failed. Using title, description, and tags for search.';
          }
        }
      } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
        // For YouTube videos, we can't extract transcript without YouTube API
        extractedContent = 'Video transcript extraction requires YouTube API. Currently using title, description, and tags for search.';
      } else {
        // Try to fetch as text
        try {
          const text = await response.text();
          extractedContent = text.substring(0, 5000);
        } catch (err) {
          extractedContent = 'Unable to extract content from this URL type. Using title, description, and tags for search.';
        }
      }

    } catch (fetchError) {
      console.error('Content extraction error:', fetchError);
      extractedContent = 'Unable to fetch content from URL. Using title, description, and tags for search.';
    }

    console.log('Extracted content length:', extractedContent.length);

    return NextResponse.json({
      success: true,
      content: extractedContent,
      contentLength: extractedContent.length
    });

  } catch (error) {
    console.error('Content extraction error:', error);
    return NextResponse.json(
      { 
        error: 'Content extraction failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}