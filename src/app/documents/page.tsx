"use client";

import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { toast, Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

interface ContentItem {
  id: string;
  title: string;
  description: string;
  tags: string[];
  type: 'document' | 'video' | 'pdf';
  url: string;
  createdAt: any;
  uploadedBy?: string;
}

export default function DocumentsPage() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const router = useRouter();

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setIsLoading(true);
    try {
      const userCookie = Cookies.get("user");
      if (!userCookie) {
        router.push('/login');
        return;
      }

      const contentQuery = query(collection(db, 'content'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(contentQuery);
      const contentData: ContentItem[] = [];
      
      snapshot.forEach((doc) => {
        contentData.push({ id: doc.id, ...doc.data() } as ContentItem);
      });
      
      setContent(contentData);
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContent = content.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = selectedType === 'all' || item.type === selectedType;
    
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'document': return '📄';
      case 'video': return '🎥';
      case 'pdf': return '📋';
      default: return '📄';
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'document': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'video': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'pdf': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto py-10 px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Learning Resources
            </h1>
            <p className="text-gray-400">Access study materials and documentation</p>
          </div>
          <button 
            onClick={() => router.back()} 
            className="px-5 py-2.5 border border-gray-700 rounded-lg text-sm hover:bg-gray-800 transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by title, description, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pl-12 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <svg 
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Type Filter */}
            <div className="flex gap-2">
              {['all', 'document', 'video', 'pdf'].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all border ${
                    selectedType === type
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'
                  }`}
                >
                  {type === 'all' ? '📚 All' : `${getTypeIcon(type)} ${type.charAt(0).toUpperCase() + type.slice(1)}`}
                </button>
              ))}
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-500">
            Showing {filteredContent.length} of {content.length} resources
          </div>
        </div>

        {/* Content Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-emerald-500 mb-4"></div>
            <p className="text-gray-500 animate-pulse">Loading resources...</p>
          </div>
        ) : filteredContent.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
              {searchQuery ? '🔍' : '📂'}
            </div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              {searchQuery ? 'No results found' : 'No resources available'}
            </h3>
            <p className="text-gray-500">
              {searchQuery ? 'Try adjusting your search terms' : 'Check back later for new content'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContent.map((item) => (
              <div 
                key={item.id} 
                className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 hover:border-emerald-500/50 transition-all duration-300 group"
              >
                {/* Type Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getTypeColor(item.type)}`}>
                    {getTypeIcon(item.type)} {item.type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {item.createdAt?.toDate?.()?.toLocaleDateString() || 'Recent'}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-emerald-400 transition-colors">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                  {item.description}
                </p>

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {item.tags.slice(0, 3).map((tag, idx) => (
                      <span 
                        key={idx} 
                        className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded border border-gray-700"
                      >
                        #{tag}
                      </span>
                    ))}
                    {item.tags.length > 3 && (
                      <span className="text-xs text-gray-500 px-2 py-1">
                        +{item.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Action Button */}
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white rounded-lg font-medium transition-all shadow-lg group-hover:shadow-emerald-500/20"
                >
                  <span>View Resource</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
