import React, { useState } from 'react';
import { X, Image, Video, Type, Send, Loader2 } from 'lucide-react';
import { createPost, type CommunityCategory } from '../../lib/communityAPI';

interface CreatePostModalProps {
  categories: CommunityCategory[];
  preselectedCategory?: string;
  onClose: () => void;
  onPostCreated: () => void;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ 
  categories, 
  preselectedCategory,
  onClose, 
  onPostCreated 
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(preselectedCategory || '');
  const [contentType, setContentType] = useState<'text' | 'image' | 'video'>('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length > 300) {
      newErrors.title = 'Title must be less than 300 characters';
    }
    
    if (!content.trim()) {
      newErrors.content = 'Content is required';
    } else if (content.length > 5000) {
      newErrors.content = 'Content must be less than 5000 characters';
    }
    
    if (!selectedCategory) {
      newErrors.category = 'Please select a category';
    }
    
    if (contentType !== 'text' && !mediaUrl.trim()) {
      newErrors.mediaUrl = 'Media URL is required for this content type';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      await createPost({
        category_id: selectedCategory,
        title: title.trim(),
        content: content.trim(),
        content_type: contentType,
        media_url: contentType !== 'text' ? mediaUrl.trim() : undefined,
      });
      
      onPostCreated();
    } catch (error) {
      console.error('Error creating post:', error);
      setErrors({ submit: 'Failed to create post. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSelectedCategory = () => {
    return categories.find(cat => cat.id === selectedCategory);
  };

  const getContentTypeIcon = (type: 'text' | 'image' | 'video') => {
    switch (type) {
      case 'text': return <Type className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
    }
  };

  const getContentTypeClass = (type: 'text' | 'image' | 'video') => {
    return `flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
      contentType === type
        ? 'bg-purple-600 text-white'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Post</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-100px)] overflow-y-auto">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${ 
                errors.category ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select a category...</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-red-600 text-sm mt-1">{errors.category}</p>
            )}
            {selectedCategory && getSelectedCategory() && (
              <div className="mt-2 flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: getSelectedCategory()!.color }}
                />
                <span className="text-sm text-gray-600">
                  {getSelectedCategory()!.description}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Post Type
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setContentType('text')}
                className={getContentTypeClass('text')}
              >
                {getContentTypeIcon('text')}
                <span>Text</span>
              </button>
              <button
                type="button"
                onClick={() => setContentType('image')}
                className={getContentTypeClass('image')}
              >
                {getContentTypeIcon('image')}
                <span>Image</span>
              </button>
              <button
                type="button"
                onClick={() => setContentType('video')}
                className={getContentTypeClass('video')}
              >
                {getContentTypeIcon('video')}
                <span>Video</span>
              </button>
            </div>
          </div>

          {contentType !== 'text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {contentType === 'image' ? 'Image URL' : 'Video URL'} *
              </label>
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder={`Enter ${contentType} URL...`}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${ 
                  errors.mediaUrl ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.mediaUrl && (
                <p className="text-red-600 text-sm mt-1">{errors.mediaUrl}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter an engaging title for your post..."
              maxLength={300}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${ 
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.title ? (
                <p className="text-red-600 text-sm">{errors.title}</p>
              ) : (
                <div />
              )}
              <span className="text-sm text-gray-500">{title.length}/300</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your story, thoughts, or ask for support..."
              rows={6}
              maxLength={5000}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none ${ 
                errors.content ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.content ? (
                <p className="text-red-600 text-sm">{errors.content}</p>
              ) : (
                <div />
              )}
              <span className="text-sm text-gray-500">{content.length}/5000</span>
            </div>
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !content.trim() || !selectedCategory}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Create Post</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;