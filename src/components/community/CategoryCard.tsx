import React, { useState } from 'react';
import { 
  Users, 
  MessageSquare, 
  Heart,
  Calendar,
  Star,
  Bookmark,
  UserCheck,
  UserPlus,
  ChevronRight
} from 'lucide-react';
import { joinCategory, leaveCategory, type CommunityCategory } from '../../lib/communityAPI';

interface CategoryCardProps {
  category: CommunityCategory;
  isJoined: boolean;
  onMembershipChange: () => void;
  compact?: boolean;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ 
  category, 
  isJoined, 
  onMembershipChange,
  compact = false 
}) => {
  const [loading, setLoading] = useState(false);

  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      'heart': Heart,
      'calendar': Calendar,
      'users': Users,
      'star': Star,
      'bookmark': Bookmark,
      'message-circle': MessageSquare,
    };
    
    const IconComponent = iconMap[iconName] || Users;
    return <IconComponent className="w-5 h-5" style={{ color: category.color }} />;
  };

  const handleMembershipToggle = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      if (isJoined) {
        await leaveCategory(category.id);
      } else {
        await joinCategory(category.id);
      }
      onMembershipChange();
    } catch (error) {
      console.error('Error toggling membership:', error);
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${category.color}20` }}>
            {getIconComponent(category.icon)}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 text-sm">{category.name}</h3>
            <p className="text-xs text-gray-500">{category.post_count} posts</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-sm">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center" 
              style={{ backgroundColor: `${category.color}20` }}
            >
              {getIconComponent(category.icon)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{category.name}</h3>
              <div className="flex items-center space-x-3 mt-1">
                <span className="text-xs text-gray-500 flex items-center">
                  <Users className="w-3 h-3 mr-1" />
                  {category.member_count}
                </span>
                <span className="text-xs text-gray-500 flex items-center">
                  <MessageSquare className="w-3 h-3 mr-1" />
                  {category.post_count}
                </span>
              </div>
            </div>
          </div>
        </div>

        {category.description && (
          <p className="text-xs text-gray-600 mb-3 line-clamp-2 leading-relaxed">
            {category.description}
          </p>
        )}

        <button
          onClick={handleMembershipToggle}
          disabled={loading}
          className={`w-full py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center space-x-1 ${ 
            isJoined
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'text-white hover:opacity-90'
          } disabled:opacity-50`}
          style={!isJoined ? { backgroundColor: category.color } : {}}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {isJoined ? (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Joined</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Join</span>
                </>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CategoryCard;