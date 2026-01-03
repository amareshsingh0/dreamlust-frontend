-- Enable RLS on community tables
-- These tables were missing RLS which is a security issue
-- Following the same pattern as 003_fix_rls_performance.sql

-- ============================================================================
-- ENABLE RLS ON COMMUNITY TABLES
-- ============================================================================

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_comments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP EXISTING POLICIES (if any)
-- ============================================================================

DROP POLICY IF EXISTS "community_posts_select_policy" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_insert_policy" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_update_policy" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_delete_policy" ON public.community_posts;
DROP POLICY IF EXISTS "Community posts read policy" ON public.community_posts;
DROP POLICY IF EXISTS "Community posts insert policy" ON public.community_posts;
DROP POLICY IF EXISTS "Community posts update policy" ON public.community_posts;
DROP POLICY IF EXISTS "Community posts delete policy" ON public.community_posts;

DROP POLICY IF EXISTS "community_post_likes_select_policy" ON public.community_post_likes;
DROP POLICY IF EXISTS "community_post_likes_insert_policy" ON public.community_post_likes;
DROP POLICY IF EXISTS "community_post_likes_delete_policy" ON public.community_post_likes;
DROP POLICY IF EXISTS "Community post likes read policy" ON public.community_post_likes;
DROP POLICY IF EXISTS "Community post likes insert policy" ON public.community_post_likes;
DROP POLICY IF EXISTS "Community post likes delete policy" ON public.community_post_likes;

DROP POLICY IF EXISTS "community_post_comments_select_policy" ON public.community_post_comments;
DROP POLICY IF EXISTS "community_post_comments_insert_policy" ON public.community_post_comments;
DROP POLICY IF EXISTS "community_post_comments_update_policy" ON public.community_post_comments;
DROP POLICY IF EXISTS "community_post_comments_delete_policy" ON public.community_post_comments;
DROP POLICY IF EXISTS "Community post comments read policy" ON public.community_post_comments;
DROP POLICY IF EXISTS "Community post comments insert policy" ON public.community_post_comments;
DROP POLICY IF EXISTS "Community post comments update policy" ON public.community_post_comments;
DROP POLICY IF EXISTS "Community post comments delete policy" ON public.community_post_comments;

-- ============================================================================
-- COMMUNITY_POSTS TABLE POLICIES
-- Note: community_posts has creator_id (linked to creators table), not user_id
-- ============================================================================

-- Anyone can read public community posts
CREATE POLICY "Community posts read policy"
ON public.community_posts FOR SELECT
USING (is_public = true OR EXISTS (
  SELECT 1 FROM creators
  WHERE creators.id = community_posts.creator_id
  AND creators.user_id = (select auth.uid())
));

-- Creators can insert their own posts
CREATE POLICY "Community posts insert policy"
ON public.community_posts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM creators
    WHERE creators.id = community_posts.creator_id
    AND creators.user_id = (select auth.uid())
  )
);

-- Creators can update their own posts
CREATE POLICY "Community posts update policy"
ON public.community_posts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM creators
    WHERE creators.id = community_posts.creator_id
    AND creators.user_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM creators
    WHERE creators.id = community_posts.creator_id
    AND creators.user_id = (select auth.uid())
  )
);

-- Creators can delete their own posts
CREATE POLICY "Community posts delete policy"
ON public.community_posts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM creators
    WHERE creators.id = community_posts.creator_id
    AND creators.user_id = (select auth.uid())
  )
);

-- ============================================================================
-- COMMUNITY_POST_LIKES TABLE POLICIES
-- Note: community_post_likes has user_id column
-- ============================================================================

-- Anyone can read likes
CREATE POLICY "Community post likes read policy"
ON public.community_post_likes FOR SELECT
USING (true);

-- Users can insert their own likes
CREATE POLICY "Community post likes insert policy"
ON public.community_post_likes FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Users can delete their own likes
CREATE POLICY "Community post likes delete policy"
ON public.community_post_likes FOR DELETE
USING ((select auth.uid()) = user_id);

-- ============================================================================
-- COMMUNITY_POST_COMMENTS TABLE POLICIES
-- Note: community_post_comments has user_id column
-- ============================================================================

-- Anyone can read comments
CREATE POLICY "Community post comments read policy"
ON public.community_post_comments FOR SELECT
USING (true);

-- Users can insert their own comments
CREATE POLICY "Community post comments insert policy"
ON public.community_post_comments FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Users can update their own comments
CREATE POLICY "Community post comments update policy"
ON public.community_post_comments FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Users can delete their own comments
CREATE POLICY "Community post comments delete policy"
ON public.community_post_comments FOR DELETE
USING ((select auth.uid()) = user_id);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.community_post_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_post_comments TO authenticated;

-- Grant read access to anonymous users
GRANT SELECT ON public.community_posts TO anon;
GRANT SELECT ON public.community_post_likes TO anon;
GRANT SELECT ON public.community_post_comments TO anon;
