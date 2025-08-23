import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Clock, 
  Plus,
  Heart,
  ChevronRight
} from 'lucide-react';
import { 
  getCommunityCategories, 
  getCommunityPosts, 
  getUserCategoryMemberships,
  ensureUserProfile,
  type CommunityCategory,
  type CommunityPost
} from '../../lib/communityAPI';
import CategoryCard from './CategoryCard';
import PostCard from './PostCard';
import CreatePostModal from './CreatePostModal';

interface CommunityHomeProps {
  onClose: () => void;
}

const CommunityHome: React.FC<CommunityHomeProps> = () => {
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [recentPosts, setRecentPosts] = useState<CommunityPost[]>([]);
  const [userMemberships, setUserMemberships] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [sortBy, setSortBy] = useState<'created_at' | 'like_count' | 'reply_count'>('created_at');

  useEffect(() => {
    loadCommunityData();
  }, []);

  const loadCommunityData = async () => {
    try {
      setLoading(true);
      
      await ensureUserProfile();
      
      const [categoriesData, postsData, membershipsData] = await Promise.all([
        getCommunityCategories(),
        getCommunityPosts(undefined, sortBy, 10),
        getUserCategoryMemberships()
      ]);
      
      console.log('Categories loaded:', categoriesData?.length || 0, categoriesData);
      console.log('Posts loaded:', postsData?.length || 0);
      console.log('Memberships loaded:', membershipsData?.length || 0);
      
      setCategories(categoriesData);
      setRecentPosts(postsData);
      setUserMemberships(membershipsData);
    } catch (error) {
      console.error('Error loading community data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = async (newSort: 'created_at' | 'like_count' | 'reply_count') => {
    setSortBy(newSort);
    try {
      const postsData = await getCommunityPosts(undefined, newSort, 10);
      setRecentPosts(postsData);
    } catch (error) {
      console.error('Error sorting posts:', error);
    }
  };

  const handlePostCreated = () => {
    loadCommunityData();
    setShowCreatePost(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading community...</span>
        </div>
      </div>
    );
  }

  const getSortButtonClass = (sort: string) => {
    return `px-3 py-1 text-sm rounded-lg transition-colors ${ 
      sortBy === sort 
        ? 'bg-purple-600 text-white' 
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Welcome to Luma Community
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Share your wellness journey and connect with like-minded individuals
            </p>
          </div>
          
          <button
            onClick={() => setShowCreatePost(true)}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>Create Post</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-purple-600" />
                Community Categories
              </h2>
              
              <div className="space-y-3">
                {categories.length === 0 && !loading ? (
                  <div className="text-center p-6">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-3">No categories found</p>
                    <p className="text-xs text-gray-400">
                      Please ensure the database has been set up with default categories.
                    </p>
                  </div>
                ) : (
                  categories.map((category) => (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      isJoined={userMemberships.includes(category.id)}
                      onMembershipChange={loadCommunityData}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Community Stats</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600">Total Members</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {categories.reduce((sum, cat) => sum + cat.member_count, 0)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-600">Total Posts</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {categories.reduce((sum, cat) => sum + cat.post_count, 0)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Heart className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-gray-600">Active Today</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {recentPosts.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
                    Recent Posts
                  </h2>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Sort by:</span>
                    <button
                      onClick={() => handleSortChange('created_at')}
                      className={getSortButtonClass('created_at')}
                    >
                      <Clock className="w-4 h-4 mr-1" />
                      Recent
                    </button>
                    <button
                      onClick={() => handleSortChange('like_count')}
                      className={getSortButtonClass('like_count')}
                    >
                      <Heart className="w-4 h-4 mr-1" />
                      Popular
                    </button>
                    <button
                      onClick={() => handleSortChange('reply_count')}
                      className={getSortButtonClass('reply_count')}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Discussed
                    </button>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {recentPosts.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
                    <p className="text-gray-600 mb-4">Be the first to share your story with the community!</p>
                    <button
                      onClick={() => setShowCreatePost(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                      Create First Post
                    </button>
                  </div>
                ) : (
                  recentPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      showCategory={true}
                      onPostUpdate={loadCommunityData}
                    />
                  ))
                )}
              </div>

              {recentPosts.length >= 10 && (
                <div className="p-4 sm:p-6 border-t border-gray-200 text-center">
                  <button className="text-purple-600 hover:text-purple-700 font-medium flex items-center space-x-1 mx-auto">
                    <span>Load More Posts</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showCreatePost && (
        <CreatePostModal
          categories={categories}
          onClose={() => setShowCreatePost(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  );
};

export default CommunityHome;