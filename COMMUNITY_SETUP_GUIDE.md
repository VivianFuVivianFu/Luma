# Luma Community Setup Guide

## Manual Tasks You Need to Complete

### 1. Database Setup (Critical - Do First)

#### Step 1: Run the Database Schema
1. Open your Supabase dashboard: https://supabase.com/dashboard
2. Go to your Luma project
3. Navigate to SQL Editor
4. Copy the entire contents of `community-schema.sql` 
5. Paste and run the SQL script
6. Verify all tables were created successfully

#### Step 2: Create User Profiles for Existing Users
Since this adds a new `user_profiles` table, you need to create profiles for existing users:

```sql
-- Run this in Supabase SQL Editor to create profiles for existing users
INSERT INTO user_profiles (id, display_name, join_date)
SELECT 
  id, 
  COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name', 
    email
  ) as display_name,
  created_at as join_date
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles);
```

#### Step 3: Set Up First Moderator Account
Replace `YOUR_USER_EMAIL` with your actual email:

```sql
-- Make yourself a moderator
UPDATE user_profiles 
SET is_moderator = true 
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'YOUR_USER_EMAIL'
);
```

### 2. Environment Variables (Optional)
If you plan to add image/media upload later, you'll need:
- `VITE_SUPABASE_STORAGE_BUCKET` - for community images
- Configure storage bucket in Supabase dashboard

### 3. Content Moderation Setup (Recommended)

#### Create Content Guidelines
1. Write community rules/guidelines
2. Set up moderation workflows
3. Consider automated content filtering

#### Suggested Community Rules:
- **Be Respectful**: Treat all members with kindness and respect
- **Stay On Topic**: Keep posts relevant to mental wellness and personal growth
- **No Medical Advice**: Share experiences, not medical recommendations
- **Privacy First**: Don't share personal identifying information
- **Support Over Judgment**: Offer support rather than criticism
- **Report Issues**: Use the report function for inappropriate content

### 4. Initial Categories (Already Seeded)
The database includes these default categories:
- **Mental Wellness** - Share your journey, challenges, and victories
- **Self-Reflection** - Deep thoughts, personal insights, growth experiences  
- **Daily Practices** - Routines, habits, and practices for wellbeing
- **Support & Encouragement** - Safe space to seek and offer support
- **Success Stories** - Celebrate breakthroughs and positive transformations
- **Resources & Tips** - Helpful tools, articles, techniques, recommendations

You can modify these or add new ones through the moderator interface once it's built.

### 5. Testing Strategy
Once the frontend is built, test these workflows:

#### User Journey Testing:
1. **New User Flow**:
   - Sign up → Auto-create profile → Browse categories → Join category → Create first post

2. **Engagement Flow**:
   - Browse posts → Like/Unlike → Reply to posts → Get notifications

3. **Community Building**:
   - Create quality content → Receive likes/replies → Build reputation

4. **Moderation Flow**:
   - Report inappropriate content → Moderator review → Take action

### 6. Launch Preparation

#### Soft Launch (Recommended):
1. Start with existing Luma users only
2. Seed with 10-15 high-quality posts across categories
3. Monitor engagement and gather feedback
4. Iterate based on user behavior

#### Content Seeding Ideas:
- **Mental Wellness**: "My anxiety management journey" 
- **Self-Reflection**: "What I learned from my biggest failure"
- **Daily Practices**: "5-minute morning meditation routine"
- **Support**: "Feeling overwhelmed with work stress"
- **Success Stories**: "3 months of consistent self-care"
- **Resources**: "Best mental health apps I've discovered"

### 7. Analytics & Monitoring

#### Key Metrics to Track:
- **User Engagement**: Posts per day, replies per post, likes per post
- **Community Health**: Active users, retention rate, category participation
- **Content Quality**: Reports/post ratio, moderator actions needed
- **Growth**: New members per week, cross-category participation

#### Tools You'll Need:
- Supabase Analytics (built-in)
- Google Analytics for page views
- Custom dashboard for community-specific metrics

### 8. Future Enhancements (Phase 2)

#### Advanced Features to Consider:
- **User Badges**: Achievement system for active contributors
- **Notifications**: Email/push notifications for replies and likes  
- **Advanced Search**: Filter by category, user, date, content type
- **Media Support**: Image uploads for posts and replies
- **Mobile App**: React Native version of the community
- **AI Moderation**: Automated content filtering using AI
- **Events System**: Community challenges and group activities

### 9. Legal & Compliance

#### Important Considerations:
- **Privacy Policy**: Update to include community features
- **Terms of Service**: Add community guidelines and moderation policies
- **Data Protection**: Ensure GDPR compliance for user-generated content
- **Content Ownership**: Clarify who owns user-posted content
- **Reporting System**: Legal compliance for handling inappropriate content

### 10. Technical Maintenance

#### Regular Tasks:
- **Database Cleanup**: Archive old posts, clean up deleted content
- **Performance Monitoring**: Watch query performance as community grows
- **Backup Strategy**: Regular backups of community content
- **Security Updates**: Keep Supabase and dependencies updated

---

## Next Steps After Setup

1. **Run the database schema** (most critical)
2. **Create your moderator account**
3. **Review and approve the UI/UX design** when I present it
4. **Test the frontend components** as they're built
5. **Seed initial content** before launch
6. **Set up monitoring and analytics**

Would you like me to proceed with implementing the frontend components once you've completed the database setup?