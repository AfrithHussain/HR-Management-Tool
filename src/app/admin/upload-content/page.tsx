"use client";

import { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import useAuth from '../../../context/AuthContext';

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

export default function UploadContent() {
  const { profile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [allContent, setAllContent] = useState<ContentItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    type: 'document' as 'document' | 'video' | 'pdf',
    url: ''
  });

  // Load content on mount
  useEffect(() => {
    loadAllContent();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const searchableText = `${formData.title} ${formData.description} ${tagsArray.join(' ')}`;

      const embeddingResponse = await fetch('/api/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: searchableText })
      });

      const embeddingData = await embeddingResponse.json();

      if (!embeddingData.success) {
        throw new Error(embeddingData.error || 'Failed to generate embedding');
      }

      await addDoc(collection(db, 'content'), {
        title: formData.title,
        description: formData.description,
        tags: tagsArray,
        type: formData.type,
        url: formData.url,
        searchableText,
        embedding: embeddingData.embedding,
        createdAt: new Date(),
        uploadedBy: profile?.email || 'unknown'
      });

      toast.success('Content uploaded successfully!');
      
      setFormData({
        title: '',
        description: '',
        tags: '',
        type: 'document',
        url: ''
      });

      // Close modal and reload content
      setIsModalOpen(false);
      await loadAllContent();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const loadAllContent = async () => {
    setIsLoading(true);
    try {
      const contentQuery = query(collection(db, 'content'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(contentQuery);
      const content: ContentItem[] = [];
      snapshot.forEach((doc) => {
        content.push({ id: doc.id, ...doc.data() } as ContentItem);
      });
      setAllContent(content);
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error('Failed to load content');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteContent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;

    try {
      await deleteDoc(doc(db, 'content', id));
      toast.success('Content deleted successfully');
      await loadAllContent();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete content');
    }
  };

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
      case 'document': return 'bg-blue-500/20 text-blue-400';
      case 'video': return 'bg-purple-500/20 text-purple-400';
      case 'pdf': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Upload Content</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 md:px-6 py-2 md:py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-semibold transition-all shadow-lg text-sm md:text-base"
        >
          + Add New Content
        </button>
      </div>

      {/* Uploaded Content List */}
      <div className="bg-gray-50/50 backdrop-blur-sm border border-gray-200 rounded-lg p-4 md:p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">Uploaded Content ({allContent.length})</h2>
          <button
            onClick={loadAllContent}
            disabled={isLoading}
            className="px-3 md:px-4 py-2 bg-white hover:bg-gray-50 disabled:bg-gray-100 text-gray-900 rounded-lg text-xs md:text-sm transition-colors flex items-center gap-2 border border-gray-300"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Loading...
              </>
            ) : (
              <>🔄 Refresh</>
            )}
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-emerald-500"></div>
          </div>
        ) : allContent.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
              📄
            </div>
            <p className="text-lg font-medium text-gray-600">No content uploaded yet.</p>
            <p className="text-sm mt-2">Click "Add New Content" to upload your first document!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allContent.map((item) => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-2xl md:text-3xl ${getTypeColor(item.type)}`}>
                    {getTypeIcon(item.type)}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded capitalize ${getTypeColor(item.type)}`}>
                    {item.type}
                  </span>
                </div>
                
                <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2 line-clamp-2">{item.title}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-3">{item.description}</p>
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {item.tags?.slice(0, 3).map((tag, index) => (
                    <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                  {item.tags?.length > 3 && (
                    <span className="text-xs text-gray-500 px-2 py-0.5">
                      +{item.tags.length - 3} more
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-500">
                    {item.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                  </span>
                  <div className="flex gap-2">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                    >
                      View
                    </a>
                    <button
                      onClick={() => deleteContent(item.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Content Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-50 border border-gray-200 p-5  rounded-2xl shadow-2xl w-full max-w-2xl max-h-[100vh] overflow-y-auto">
            <h2 className="text-xl md:text-2xl font-bold mb-6 text-gray-900">Add New Content</h2>
            
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-600">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., App Monetization Strategies"
                  className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-600">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed description of the content..."
                  className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 h-24 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-600">Tags * (comma separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="e.g., revenue, monetization, gaming, ads"
                  className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1.5">Add relevant keywords to help with search accuracy</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-600">Content Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="document">📄 Document</option>
                  <option value="video">🎥 Video</option>
                  <option value="pdf">📋 PDF</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-600">URL * (Public Link)</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://docs.google.com/document/d/..."
                  className="w-full px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1.5">Make sure the link is publicly accessible</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex-1 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                >
                  {isUploading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {isUploading ? 'Uploading...' : '📤 Upload Content'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormData({
                      title: '',
                      description: '',
                      tags: '',
                      type: 'document',
                      url: ''
                    });
                  }}
                  disabled={isUploading}
                  className="flex-1 py-2.5 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-900 rounded-lg font-semibold transition-all border border-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
