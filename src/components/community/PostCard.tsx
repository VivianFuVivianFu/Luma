import React, { useState } from 'react';
import { 
  Heart, 
  MessageSquare, 
  Eye, 
  MoreHorizontal,
  Share,
  Clock,
  User
} from 'lucide-react';
import { togglePostLike, type CommunityPost } from '../../lib/communityAPI';

interface PostCardProps {
  post: CommunityPost;
  showCategory?: boolean;
  onPostUpdate?: () => void;
  onPostClick?: (post: CommunityPost) => void;
}

const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  showCategory = false, 
  onPostUpdate,
  onPostClick 
}) => {
  const [isLiking, setIsLiking] = useState(false);
  const [currentLikes, setCurrentLikes] = useState(post.like_count);
  const [isLiked, setIsLiked] = useState(post.is_liked_by_current_user || false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isLiking) return;
    
    setIsLiking(true);
    try {
      const newLikedState = await togglePostLike(post.id);
      setIsLiked(newLikedState);
      setCurrentLikes(prev => newLikedState ? prev + 1 : prev - 1);
      
      if (onPostUpdate) {
        onPostUpdate();
      }
    } catch (error) {
      console.error('Error liking post:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handlePostClick = () => {
    if (onPostClick) {
      onPostClick(post);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div 
      className="p-4 sm:p-6 hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={handlePostClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
            {post.user_avatar_url ? (
              <img 
                src={post.user_avatar_url} 
                alt={post.user_display_name || 'User'} 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-medium text-gray-900 text-sm truncate">
                {post.user_display_name || 'Anonymous'}
              </span>
              {showCategory && post.category_name && (
                <>
                  <span className="text-gray-400">•</span>
                  <span 
                    className="text-xs px-2 py-1 rounded-full text-white font-medium"
                    style={{ backgroundColor: post.category_color || '#6366f1' }}
                  >
                    {post.category_name}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{formatTimeAgo(post.created_at)}</span>
            </div>
          </div>
        </div>
        
        <button className="p-1 hover:bg-gray-200 rounded-full transition-colors" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <h3 className="font-semibold text-gray-900 text-base sm:text-lg mb-2 line-clamp-2 leading-tight">
        {post.title}
      </h3>

      <div className="text-gray-600 text-sm mb-4 leading-relaxed">
        {post.content_type === 'text' ? (
          <p className="line-clamp-3">{truncateContent(post.content)}</p>
        ) : (
          <div>
            {post.media_url && (
              <div className="mb-2">
                {post.content_type === 'image' ? (
                  <img 
                    src={post.media_url} 
                    alt="Post media" 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ) : (
                  <video 
                    src={post.media_url} 
                    controls 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}
              </div>
            )}
            <p className="line-clamp-3">{truncateContent(post.content)}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-sm transition-colors ${ 
              isLiked 
                ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                : 'text-gray-600 hover:bg-gray-100'
            } disabled:opacity-50`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            <span className="font-medium">{currentLikes}</span>
          </button>

          <button className="flex items-center space-x-1 px-2 py-1 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
            <MessageSquare className="w-4 h-4" />
            <span className="font-medium">{post.reply_count}</span>
          </button>

          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <Eye className="w-4 h-4" />
            <span>{post.view_count}</span>
          </div>
        </div>

        <button 
          className="p-1 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Share className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PostCard;