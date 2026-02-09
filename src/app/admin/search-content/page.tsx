"use client";

import { useState } from 'react';
import { db } from '../../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

interface ContentItem {
  id: string;
  title: string;
  description: string;
  tags: string[];
  type: 'document' | 'video' | 'pdf';
  url: string;
  createdAt: any;
  similarity?: number;
  extractedContentLength?: number;
  hasExtractedContent?: boolean;
}

export default function SearchContent() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.5); // Higher default threshold
  const [lastSearchTime, setLastSearchTime] = useState<number | null>(null);
  const [lastCleanedQuery, setLastCleanedQuery] = useState<string>('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);

    try {
      const contentRef = collection(db, 'content');
      const snapshot = await getDocs(contentRef);

      if (snapshot.empty) {
        setSearchResults([]);
        toast.success('No content found in database. Please upload some content first.');
        return;
      }

      const documents = [];
      snapshot.forEach((doc) => {
        const docData = doc.data();
        documents.push({
          id: doc.id,
          title: docData.title,
          description: docData.description,
          tags: docData.tags || [],
          type: docData.type,
          url: docData.url,
          createdAt: docData.createdAt
        });
      });

      const response = await fetch('/api/hybrid-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: searchQuery, 
          documents: documents,
          threshold: similarityThreshold 
        })
      });

      const data = await response.json();

      if (data.success) {
        setSearchResults(data.results);
        setLastSearchTime(data.processingTimeMs);
        setLastCleanedQuery(data.cleanedQuery || '');
        
        if (data.results.length === 0) {
          const message = data.message || `No relevant results found above ${(similarityThreshold * 100).toFixed(0)}% threshold.`;
          toast.success(message);
        } else {
          const extractedCount = data.results.filter(r => r.hasExtractedContent).length;
          const keywordInfo = data.cleanedQuery !== data.query ? ` (keywords: "${data.cleanedQuery}")` : '';
          toast.success(`Found ${data.results.length} results in ${data.processingTimeMs}ms! ${extractedCount} documents analyzed${keywordInfo}.`);
        }
      } else {
        throw new Error(data.details || data.error || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setLastSearchTime(null);
    setLastCleanedQuery('');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">AI Content Search</h1>

      {/* Search Form */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Search Your Content</h2>
        
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2">Search Query</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g., how to increase revenue, monetization strategies, user engagement"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            />
            <p className="text-xs text-gray-400 mt-1">Use natural language - AI will understand context and meaning</p>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">
              Relevance Threshold: {(similarityThreshold * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.2"
              max="0.9"
              step="0.1"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>More Results (20%)</span>
              <span>Higher Accuracy (90%)</span>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setSimilarityThreshold(0.3)}
                className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
              >
                Loose (30%)
              </button>
              <button
                type="button"
                onClick={() => setSimilarityThreshold(0.5)}
                className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
              >
                Balanced (50%)
              </button>
              <button
                type="button"
                onClick={() => setSimilarityThreshold(0.7)}
                className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
              >
                Strict (70%)
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isSearching && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {isSearching ? 'Analyzing Documents...' : '🔍 Search with AI'}
            </button>
            
            {(searchQuery || searchResults.length > 0) && (
              <button
                type="button"
                onClick={clearSearch}
                className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">
              Search Results ({searchResults.length})
            </h2>
            <div className="flex items-center gap-4">
              {lastCleanedQuery && lastCleanedQuery !== searchQuery && (
                <span className="text-sm text-blue-400">
                  Keywords: "{lastCleanedQuery}"
                </span>
              )}
              {lastSearchTime && (
                <span className="text-sm text-gray-400">
                  Found in {lastSearchTime}ms
                </span>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            {searchResults.map((item, index) => (
              <div key={item.id} className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm bg-gray-600 text-gray-300 px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                      <h3 className="text-lg font-medium text-white">{item.title}</h3>
                    </div>
                    
                    <p className="text-gray-300 mt-1">{item.description}</p>
                    
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-sm bg-emerald-600 text-white px-2 py-1 rounded">
                        {item.type}
                      </span>
                      
                      {item.similarity && (
                        <span className={`text-sm px-2 py-1 rounded font-medium ${
                          item.similarity > 0.7 
                            ? 'bg-green-600 text-white' 
                            : item.similarity > 0.5 
                            ? 'bg-yellow-600 text-white' 
                            : 'bg-red-600 text-white'
                        }`}>
                          {(item.similarity * 100).toFixed(1)}% match
                        </span>
                      )}
                      
                      {item.hasExtractedContent && (
                        <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                          📄 Content Analyzed ({item.extractedContentLength} chars)
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags?.map((tag, tagIndex) => (
                        <span key={tagIndex} className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                    >
                      View Document
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results State */}
      {searchQuery && searchResults.length === 0 && !isSearching && (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
          <div className="text-center py-8 text-gray-400">
            <p className="text-lg mb-2">No results found for "{searchQuery}"</p>
            <div className="text-sm space-y-1">
              <p>Try:</p>
              <p>• Lowering the relevance threshold</p>
              <p>• Using different keywords</p>
              <p>• Adding more context to your query</p>
              <p>• Checking if content is uploaded</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!searchQuery && searchResults.length === 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
          <div className="text-center py-8 text-gray-400">
            <h3 className="text-lg font-medium text-white mb-2">Ready to Search!</h3>
            <p>Enter a search query above to find relevant content using AI.</p>
            <div className="mt-4 text-sm">
              <p className="font-medium text-gray-300 mb-2">Example searches:</p>
              <div className="space-y-1">
                <p>• "how to increase app revenue"</p>
                <p>• "user engagement strategies"</p>
                <p>• "monetization best practices"</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}