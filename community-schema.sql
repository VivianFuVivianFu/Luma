-- =====================================================
-- LUMA COMMUNITY DATABASE SCHEMA
-- Reddit-like community system with categories, posts, replies, and likes
-- =====================================================

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- =====================================================
-- 1. COMMUNITY CATEGORIES TABLE
-- =====================================================
CREATE TABLE community_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6366f1', -- Hex color for category
  icon VARCHAR(50) DEFAULT 'message-circle', -- Lucide icon name
  post_count INTEGER DEFAULT 0,
  member_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. COMMUNITY POSTS TABLE
-- =====================================================
CREATE TABLE community_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES community_categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  content TEXT NOT NULL,
  content_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'video'
  media_url TEXT, -- For image/video posts
  like_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. COMMUNITY REPLIES TABLE
-- =====================================================
CREATE TABLE community_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES community_replies(id) ON DELETE CASCADE, -- For nested replies
  content TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0, -- Count of replies to this reply
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. COMMUNITY LIKES TABLE
-- =====================================================
CREATE TABLE community_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES community_replies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure user can only like a post OR reply, not both
  CONSTRAINT check_like_target CHECK (
    (post_id IS NOT NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND reply_id IS NOT NULL)
  ),
  
  -- Unique constraint to prevent duplicate likes
  UNIQUE(user_id, post_id),
  UNIQUE(user_id, reply_id)
);

-- =====================================================
-- 5. USER PROFILES EXTENSION
-- =====================================================
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name VARCHAR(50),
  avatar_url TEXT,
  bio TEXT,
  join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  post_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  is_moderator BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. CATEGORY MEMBERSHIPS TABLE
-- =====================================================
CREATE TABLE category_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES community_categories(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, category_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Posts indexes
CREATE INDEX idx_community_posts_category_id ON community_posts(category_id);
CREATE INDEX idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX idx_community_posts_like_count ON community_posts(like_count DESC);

-- Replies indexes
CREATE INDEX idx_community_replies_post_id ON community_replies(post_id);
CREATE INDEX idx_community_replies_user_id ON community_replies(user_id);
CREATE INDEX idx_community_replies_parent_reply_id ON community_replies(parent_reply_id);
CREATE INDEX idx_community_replies_created_at ON community_replies(created_at ASC);

-- Likes indexes
CREATE INDEX idx_community_likes_post_id ON community_likes(post_id);
CREATE INDEX idx_community_likes_reply_id ON community_likes(reply_id);
CREATE INDEX idx_community_likes_user_id ON community_likes(user_id);

-- Category memberships indexes
CREATE INDEX idx_category_memberships_user_id ON category_memberships(user_id);
CREATE INDEX idx_category_memberships_category_id ON category_memberships(category_id);

-- =====================================================
-- TRIGGERS FOR COUNT UPDATES
-- =====================================================

-- Function to update post counts
CREATE OR REPLACE FUNCTION update_post_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment category post count
    UPDATE community_categories 
    SET post_count = post_count + 1 
    WHERE id = NEW.category_id;
    
    -- Increment user post count
    UPDATE user_profiles 
    SET post_count = post_count + 1 
    WHERE id = NEW.user_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement category post count
    UPDATE community_categories 
    SET post_count = post_count - 1 
    WHERE id = OLD.category_id;
    
    -- Decrement user post count
    UPDATE user_profiles 
    SET post_count = post_count - 1 
    WHERE id = OLD.user_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update reply counts
CREATE OR REPLACE FUNCTION update_reply_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment post reply count
    UPDATE community_posts 
    SET reply_count = reply_count + 1 
    WHERE id = NEW.post_id;
    
    -- Increment parent reply count if this is a nested reply
    IF NEW.parent_reply_id IS NOT NULL THEN
      UPDATE community_replies 
      SET reply_count = reply_count + 1 
      WHERE id = NEW.parent_reply_id;
    END IF;
    
    -- Increment user reply count
    UPDATE user_profiles 
    SET reply_count = reply_count + 1 
    WHERE id = NEW.user_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement post reply count
    UPDATE community_posts 
    SET reply_count = reply_count - 1 
    WHERE id = OLD.post_id;
    
    -- Decrement parent reply count if this was a nested reply
    IF OLD.parent_reply_id IS NOT NULL THEN
      UPDATE community_replies 
      SET reply_count = reply_count - 1 
      WHERE id = OLD.parent_reply_id;
    END IF;
    
    -- Decrement user reply count
    UPDATE user_profiles 
    SET reply_count = reply_count - 1 
    WHERE id = OLD.user_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update like counts
CREATE OR REPLACE FUNCTION update_like_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment post like count
    IF NEW.post_id IS NOT NULL THEN
      UPDATE community_posts 
      SET like_count = like_count + 1 
      WHERE id = NEW.post_id;
    END IF;
    
    -- Increment reply like count
    IF NEW.reply_id IS NOT NULL THEN
      UPDATE community_replies 
      SET like_count = like_count + 1 
      WHERE id = NEW.reply_id;
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement post like count
    IF OLD.post_id IS NOT NULL THEN
      UPDATE community_posts 
      SET like_count = like_count - 1 
      WHERE id = OLD.post_id;
    END IF;
    
    -- Decrement reply like count
    IF OLD.reply_id IS NOT NULL THEN
      UPDATE community_replies 
      SET like_count = like_count - 1 
      WHERE id = OLD.reply_id;
    END IF;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update category member counts
CREATE OR REPLACE FUNCTION update_category_member_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_categories 
    SET member_count = member_count + 1 
    WHERE id = NEW.category_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_categories 
    SET member_count = member_count - 1 
    WHERE id = OLD.category_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_post_counts
  AFTER INSERT OR DELETE ON community_posts
  FOR EACH ROW EXECUTE FUNCTION update_post_counts();

CREATE TRIGGER trigger_update_reply_counts
  AFTER INSERT OR DELETE ON community_replies
  FOR EACH ROW EXECUTE FUNCTION update_reply_counts();

CREATE TRIGGER trigger_update_like_counts
  AFTER INSERT OR DELETE ON community_likes
  FOR EACH ROW EXECUTE FUNCTION update_like_counts();

CREATE TRIGGER trigger_update_category_member_counts
  AFTER INSERT OR DELETE ON category_memberships
  FOR EACH ROW EXECUTE FUNCTION update_category_member_counts();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE community_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_memberships ENABLE ROW LEVEL SECURITY;

-- Categories: Everyone can read, only moderators can write
CREATE POLICY "Categories are viewable by everyone" ON community_categories
  FOR SELECT USING (true);

CREATE POLICY "Categories can be created by moderators" ON community_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_moderator = true
    )
  );

CREATE POLICY "Categories can be updated by moderators" ON community_categories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_moderator = true
    )
  );

-- Posts: Everyone can read, authenticated users can write their own
CREATE POLICY "Posts are viewable by everyone" ON community_posts
  FOR SELECT USING (NOT is_deleted);

CREATE POLICY "Users can create posts" ON community_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON community_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON community_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Replies: Everyone can read, authenticated users can write their own
CREATE POLICY "Replies are viewable by everyone" ON community_replies
  FOR SELECT USING (NOT is_deleted);

CREATE POLICY "Users can create replies" ON community_replies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own replies" ON community_replies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replies" ON community_replies
  FOR DELETE USING (auth.uid() = user_id);

-- Likes: Users can read and manage their own likes
CREATE POLICY "Users can view all likes" ON community_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own likes" ON community_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" ON community_likes
  FOR DELETE USING (auth.uid() = user_id);

-- User profiles: Everyone can read, users can update their own
CREATE POLICY "Profiles are viewable by everyone" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Category memberships: Users can manage their own memberships
CREATE POLICY "Users can view all memberships" ON category_memberships
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own memberships" ON category_memberships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memberships" ON category_memberships
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- SEED DATA - DEFAULT CATEGORIES
-- =====================================================

INSERT INTO community_categories (name, slug, description, color, icon) VALUES
('Mental Wellness', 'mental-wellness', 'Share your journey, challenges, and victories in mental health', '#6366f1', 'heart'),
('Self-Reflection', 'self-reflection', 'Deep thoughts, personal insights, and growth experiences', '#8b5cf6', 'mirror'),
('Daily Practices', 'daily-practices', 'Routines, habits, and practices that support your wellbeing', '#06b6d4', 'calendar'),
('Support & Encouragement', 'support-encouragement', 'A safe space to seek and offer support to fellow community members', '#10b981', 'users'),
('Success Stories', 'success-stories', 'Celebrate breakthroughs, achievements, and positive transformations', '#f59e0b', 'star'),
('Resources & Tips', 'resources-tips', 'Helpful tools, articles, techniques, and recommendations', '#ef4444', 'bookmark');

-- =====================================================
-- HELPFUL VIEWS FOR QUERIES
-- =====================================================

-- View for posts with user and category info
CREATE VIEW community_posts_view AS
SELECT 
  p.*,
  c.name as category_name,
  c.slug as category_slug,
  c.color as category_color,
  up.display_name as user_display_name,
  up.avatar_url as user_avatar_url,
  EXISTS(
    SELECT 1 FROM community_likes cl 
    WHERE cl.post_id = p.id AND cl.user_id = auth.uid()
  ) as is_liked_by_current_user
FROM community_posts p
LEFT JOIN community_categories c ON p.category_id = c.id
LEFT JOIN user_profiles up ON p.user_id = up.id
WHERE NOT p.is_deleted;

-- View for replies with user info
CREATE VIEW community_replies_view AS
SELECT 
  r.*,
  up.display_name as user_display_name,
  up.avatar_url as user_avatar_url,
  EXISTS(
    SELECT 1 FROM community_likes cl 
    WHERE cl.reply_id = r.id AND cl.user_id = auth.uid()
  ) as is_liked_by_current_user
FROM community_replies r
LEFT JOIN user_profiles up ON r.user_id = up.id
WHERE NOT r.is_deleted;