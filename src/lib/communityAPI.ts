import { supabase } from './supabase';

// =====================================================
// TYPES & INTERFACES
// =====================================================

export interface CommunityCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  icon: string;
  post_count: number;
  member_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommunityPost {
  id: string;
  category_id: string;
  user_id: string;
  title: string;
  content: string;
  content_type: 'text' | 'image' | 'video';
  media_url?: string | null;
  like_count: number;
  reply_count: number;
  view_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields from view
  category_name?: string;
  category_slug?: string;
  category_color?: string;
  user_display_name?: string;
  user_avatar_url?: string;
  is_liked_by_current_user?: boolean;
}

export interface CommunityReply {
  id: string;
  post_id: string;
  user_id: string;
  parent_reply_id: string | null;
  content: string;
  like_count: number;
  reply_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields from view
  user_display_name?: string;
  user_avatar_url?: string;
  is_liked_by_current_user?: boolean;
}

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  join_date: string;
  post_count: number;
  reply_count: number;
  like_count: number;
  is_moderator: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePostData {
  category_id: string;
  title: string;
  content: string;
  content_type?: 'text' | 'image' | 'video';
  media_url?: string;
}

export interface CreateReplyData {
  post_id: string;
  content: string;
  parent_reply_id?: string;
}

// =====================================================
// CATEGORY FUNCTIONS
// =====================================================

export const getCommunityCategories = async (): Promise<CommunityCategory[]> => {
  try {
    console.log('🔍 Fetching community categories...');
    
    // Check authentication status
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('👤 Current user:', user?.email || 'Not authenticated');
    
    if (authError) {
      console.warn('⚠️ Auth error:', authError);
    }
    
    const { data, error } = await supabase
      .from('community_categories')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true }); // Change to created_at to show Introduce Yourself first

    if (error) {
      console.error('❌ Supabase error fetching categories:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log('✅ Categories fetched successfully:', data?.length || 0, data);
    return data || [];
  } catch (error) {
    console.error('❌ Error in getCommunityCategories:', error);
    throw error;
  }
};

export const getCategoryBySlug = async (slug: string): Promise<CommunityCategory | null> => {
  try {
    const { data, error } = await supabase
      .from('community_categories')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching category by slug:', error);
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error('Error in getCategoryBySlug:', error);
    throw error;
  }
};

export const joinCategory = async (categoryId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('category_memberships')
      .insert({
        user_id: user.id,
        category_id: categoryId,
      });

    if (error) {
      console.error('Error joining category:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in joinCategory:', error);
    throw error;
  }
};

export const leaveCategory = async (categoryId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('category_memberships')
      .delete()
      .eq('user_id', user.id)
      .eq('category_id', categoryId);

    if (error) {
      console.error('Error leaving category:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in leaveCategory:', error);
    throw error;
  }
};

export const getUserCategoryMemberships = async (userId?: string): Promise<string[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    
    if (!targetUserId) return [];

    const { data, error } = await supabase
      .from('category_memberships')
      .select('category_id')
      .eq('user_id', targetUserId);

    if (error) {
      console.error('Error fetching user category memberships:', error);
      throw error;
    }

    return data?.map(m => m.category_id) || [];
  } catch (error) {
    console.error('Error in getUserCategoryMemberships:', error);
    return [];
  }
};

// =====================================================
// POST FUNCTIONS
// =====================================================

export const getCommunityPosts = async (
  categoryId?: string,
  sortBy: 'created_at' | 'like_count' | 'reply_count' = 'created_at',
  limit: number = 20,
  offset: number = 0
): Promise<CommunityPost[]> => {
  try {
    let query = supabase
      .from('community_posts_view')
      .select('*');

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const ascending = sortBy === 'created_at' ? false : false; // Most recent first, highest counts first
    
    const { data, error } = await query
      .order(sortBy, { ascending })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching community posts:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getCommunityPosts:', error);
    throw error;
  }
};

export const getPostById = async (postId: string): Promise<CommunityPost | null> => {
  try {
    const { data, error } = await supabase
      .from('community_posts_view')
      .select('*')
      .eq('id', postId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching post by ID:', error);
      throw error;
    }

    // Increment view count
    if (data) {
      await supabase
        .from('community_posts')
        .update({ view_count: data.view_count + 1 })
        .eq('id', postId);
    }

    return data || null;
  } catch (error) {
    console.error('Error in getPostById:', error);
    throw error;
  }
};

export const createPost = async (postData: CreatePostData): Promise<CommunityPost> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        ...postData,
        user_id: user.id,
        content_type: postData.content_type || 'text',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating post:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createPost:', error);
    throw error;
  }
};

export const updatePost = async (postId: string, updates: Partial<CreatePostData>): Promise<CommunityPost> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('community_posts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', user.id) // Ensure user can only update their own posts
      .select()
      .single();

    if (error) {
      console.error('Error updating post:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updatePost:', error);
    throw error;
  }
};

export const deletePost = async (postId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('community_posts')
      .update({ is_deleted: true })
      .eq('id', postId)
      .eq('user_id', user.id); // Ensure user can only delete their own posts

    if (error) {
      console.error('Error deleting post:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deletePost:', error);
    throw error;
  }
};

// =====================================================
// REPLY FUNCTIONS
// =====================================================

export const getPostReplies = async (postId: string): Promise<CommunityReply[]> => {
  try {
    const { data, error } = await supabase
      .from('community_replies_view')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching post replies:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPostReplies:', error);
    throw error;
  }
};

export const createReply = async (replyData: CreateReplyData): Promise<CommunityReply> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('community_replies')
      .insert({
        ...replyData,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating reply:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createReply:', error);
    throw error;
  }
};

export const updateReply = async (replyId: string, content: string): Promise<CommunityReply> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('community_replies')
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', replyId)
      .eq('user_id', user.id) // Ensure user can only update their own replies
      .select()
      .single();

    if (error) {
      console.error('Error updating reply:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateReply:', error);
    throw error;
  }
};

export const deleteReply = async (replyId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('community_replies')
      .update({ is_deleted: true })
      .eq('id', replyId)
      .eq('user_id', user.id); // Ensure user can only delete their own replies

    if (error) {
      console.error('Error deleting reply:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteReply:', error);
    throw error;
  }
};

// =====================================================
// LIKE FUNCTIONS
// =====================================================

export const togglePostLike = async (postId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('community_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .single();

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from('community_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId);

      if (error) throw error;
      return false; // Now unliked
    } else {
      // Like
      const { error } = await supabase
        .from('community_likes')
        .insert({
          user_id: user.id,
          post_id: postId,
        });

      if (error) throw error;
      return true; // Now liked
    }
  } catch (error) {
    console.error('Error toggling post like:', error);
    throw error;
  }
};

export const toggleReplyLike = async (replyId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('community_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('reply_id', replyId)
      .single();

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from('community_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('reply_id', replyId);

      if (error) throw error;
      return false; // Now unliked
    } else {
      // Like
      const { error } = await supabase
        .from('community_likes')
        .insert({
          user_id: user.id,
          reply_id: replyId,
        });

      if (error) throw error;
      return true; // Now liked
    }
  } catch (error) {
    console.error('Error toggling reply like:', error);
    throw error;
  }
};

// =====================================================
// USER PROFILE FUNCTIONS
// =====================================================

export const getUserProfile = async (userId?: string): Promise<UserProfile | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    
    if (!targetUserId) return null;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', targetUserId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user profile:', error);
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    throw error;
  }
};

export const updateUserProfile = async (updates: Partial<UserProfile>): Promise<UserProfile> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    throw error;
  }
};

export const ensureUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('❌ No authenticated user found');
      return null;
    }

    console.log('👤 User authenticated:', user.email);

    // First try to get existing profile using upsert to handle RLS
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(
        {
          id: user.id,
          display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Anonymous',
          avatar_url: user.user_metadata?.avatar_url || null,
          bio: null,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'id',
          ignoreDuplicates: false
        }
      )
      .select()
      .single();

    if (error) {
      console.error('❌ Error upserting user profile:', error);
      // If RLS blocks us, just return null and continue - categories don't require user profile
      console.log('⚠️ Continuing without user profile due to RLS policy');
      return null;
    }

    console.log('✅ User profile ensured:', data);
    return data;
  } catch (error) {
    console.error('❌ Error in ensureUserProfile:', error);
    // Don't throw error - just return null and continue
    console.log('⚠️ Continuing without user profile');
    return null;
  }
};

// =====================================================
// SEARCH FUNCTIONS
// =====================================================

export const searchPosts = async (
  query: string,
  categoryId?: string,
  limit: number = 20
): Promise<CommunityPost[]> => {
  try {
    let supabaseQuery = supabase
      .from('community_posts_view')
      .select('*')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`);

    if (categoryId) {
      supabaseQuery = supabaseQuery.eq('category_id', categoryId);
    }

    const { data, error } = await supabaseQuery
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching posts:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in searchPosts:', error);
    throw error;
  }
};