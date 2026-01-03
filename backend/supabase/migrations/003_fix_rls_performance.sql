-- Fix RLS Performance Issues
-- This migration addresses Supabase Performance Advisor warnings:
-- 1. auth_rls_initplan: Wrap auth.uid() in (select auth.uid()) for better performance
-- 2. multiple_permissive_policies: Consolidate overlapping policies
-- 3. Remove testing policy that should not be in production

-- ============================================================================
-- DROP ALL EXISTING POLICIES (both old and new names)
-- ============================================================================

-- Users table (old names)
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Public can read user profiles" ON users;
DROP POLICY IF EXISTS "Allow all for testing - REMOVE IN PRODUCTION" ON users;
-- Users table (new names)
DROP POLICY IF EXISTS "Users read policy" ON users;
DROP POLICY IF EXISTS "Users update policy" ON users;

-- Creators table (old names)
DROP POLICY IF EXISTS "Public can read creators" ON creators;
DROP POLICY IF EXISTS "Creators can update own profile" ON creators;
-- Creators table (new names)
DROP POLICY IF EXISTS "Creators read policy" ON creators;
DROP POLICY IF EXISTS "Creators update policy" ON creators;

-- Content table (old names)
DROP POLICY IF EXISTS "Public can read published content" ON content;
DROP POLICY IF EXISTS "Creators can read own content" ON content;
DROP POLICY IF EXISTS "Creators can insert own content" ON content;
DROP POLICY IF EXISTS "Creators can update own content" ON content;
-- Content table (new names)
DROP POLICY IF EXISTS "Content read policy" ON content;
DROP POLICY IF EXISTS "Content insert policy" ON content;
DROP POLICY IF EXISTS "Content update policy" ON content;

-- Views table (old names)
DROP POLICY IF EXISTS "Anyone can insert views" ON views;
DROP POLICY IF EXISTS "Users can read own views" ON views;
-- Views table (new names)
DROP POLICY IF EXISTS "Views insert policy" ON views;
DROP POLICY IF EXISTS "Views read policy" ON views;

-- Likes table (old names)
DROP POLICY IF EXISTS "Users can like content" ON likes;
DROP POLICY IF EXISTS "Public can read likes" ON likes;
DROP POLICY IF EXISTS "Users can delete own likes" ON likes;
-- Likes table (new names)
DROP POLICY IF EXISTS "Likes read policy" ON likes;
DROP POLICY IF EXISTS "Likes insert policy" ON likes;
DROP POLICY IF EXISTS "Likes delete policy" ON likes;

-- Comments table (old names)
DROP POLICY IF EXISTS "Public can read comments" ON comments;
DROP POLICY IF EXISTS "Users can insert comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
-- Comments table (new names)
DROP POLICY IF EXISTS "Comments read policy" ON comments;
DROP POLICY IF EXISTS "Comments insert policy" ON comments;
DROP POLICY IF EXISTS "Comments update policy" ON comments;

-- Playlists table (old names)
DROP POLICY IF EXISTS "Users can read own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can insert own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can update own playlists" ON playlists;
-- Playlists table (new names)
DROP POLICY IF EXISTS "Playlists read policy" ON playlists;
DROP POLICY IF EXISTS "Playlists insert policy" ON playlists;
DROP POLICY IF EXISTS "Playlists update policy" ON playlists;

-- Notifications table (old names)
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
-- Notifications table (new names)
DROP POLICY IF EXISTS "Notifications read policy" ON notifications;
DROP POLICY IF EXISTS "Notifications insert policy" ON notifications;
DROP POLICY IF EXISTS "Notifications update policy" ON notifications;

-- Categories table
DROP POLICY IF EXISTS "Categories read policy" ON categories;

-- Tags table
DROP POLICY IF EXISTS "Tags read policy" ON tags;

-- Content categories table
DROP POLICY IF EXISTS "Content categories read policy" ON content_categories;
DROP POLICY IF EXISTS "Content categories insert policy" ON content_categories;
DROP POLICY IF EXISTS "Content categories delete policy" ON content_categories;

-- Content tags table
DROP POLICY IF EXISTS "Content tags read policy" ON content_tags;
DROP POLICY IF EXISTS "Content tags insert policy" ON content_tags;
DROP POLICY IF EXISTS "Content tags delete policy" ON content_tags;

-- Creator categories table
DROP POLICY IF EXISTS "Creator categories read policy" ON creator_categories;
DROP POLICY IF EXISTS "Creator categories insert policy" ON creator_categories;
DROP POLICY IF EXISTS "Creator categories delete policy" ON creator_categories;

-- Playlist items table
DROP POLICY IF EXISTS "Playlist items read policy" ON playlist_items;
DROP POLICY IF EXISTS "Playlist items insert policy" ON playlist_items;
DROP POLICY IF EXISTS "Playlist items update policy" ON playlist_items;
DROP POLICY IF EXISTS "Playlist items delete policy" ON playlist_items;

-- Subscriptions table
DROP POLICY IF EXISTS "Subscriptions read policy" ON subscriptions;
DROP POLICY IF EXISTS "Subscriptions creator read policy" ON subscriptions;
DROP POLICY IF EXISTS "Subscriptions insert policy" ON subscriptions;
DROP POLICY IF EXISTS "Subscriptions update policy" ON subscriptions;
DROP POLICY IF EXISTS "Subscriptions delete policy" ON subscriptions;

-- Reports table
DROP POLICY IF EXISTS "Reports read policy" ON reports;
DROP POLICY IF EXISTS "Reports insert policy" ON reports;

-- Transactions table
DROP POLICY IF EXISTS "Transactions payer read policy" ON transactions;
DROP POLICY IF EXISTS "Transactions recipient read policy" ON transactions;
DROP POLICY IF EXISTS "Transactions read policy" ON transactions;

-- ============================================================================
-- USERS TABLE POLICIES (Consolidated)
-- ============================================================================

-- Single SELECT policy: users can read their own profile OR public can read basic info
CREATE POLICY "Users read policy"
ON users FOR SELECT
USING (
  id = (select auth.uid())
  OR true  -- Public can read user profiles
);

-- UPDATE policy with optimized auth.uid() call
CREATE POLICY "Users update policy"
ON users FOR UPDATE
USING (id = (select auth.uid()))
WITH CHECK (id = (select auth.uid()));

-- ============================================================================
-- CREATORS TABLE POLICIES
-- ============================================================================

-- Public can read all creators
CREATE POLICY "Creators read policy"
ON creators FOR SELECT
USING (true);

-- Creators can update their own profile (optimized subquery)
CREATE POLICY "Creators update policy"
ON creators FOR UPDATE
USING (
  user_id = (select auth.uid())
);

-- ============================================================================
-- CONTENT TABLE POLICIES (Consolidated)
-- ============================================================================

-- Single SELECT policy: public content OR creator's own content
CREATE POLICY "Content read policy"
ON content FOR SELECT
USING (
  (is_public = true AND deleted_at IS NULL)
  OR
  EXISTS (
    SELECT 1 FROM creators
    WHERE creators.id = content.creator_id
    AND creators.user_id = (select auth.uid())
  )
);

-- Creators can insert their own content (optimized)
CREATE POLICY "Content insert policy"
ON content FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM creators
    WHERE creators.id = content.creator_id
    AND creators.user_id = (select auth.uid())
  )
);

-- Creators can update their own content (optimized)
CREATE POLICY "Content update policy"
ON content FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM creators
    WHERE creators.id = content.creator_id
    AND creators.user_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM creators
    WHERE creators.id = content.creator_id
    AND creators.user_id = (select auth.uid())
  )
);

-- ============================================================================
-- VIEWS TABLE POLICIES
-- ============================================================================

-- Anyone can insert views (tracking)
CREATE POLICY "Views insert policy"
ON views FOR INSERT
WITH CHECK (true);

-- Users can read their own views (optimized)
CREATE POLICY "Views read policy"
ON views FOR SELECT
USING (user_id = (select auth.uid()) OR user_id IS NULL);

-- ============================================================================
-- LIKES TABLE POLICIES
-- ============================================================================

-- Public can read all likes
CREATE POLICY "Likes read policy"
ON likes FOR SELECT
USING (true);

-- Users can insert their own likes (optimized)
CREATE POLICY "Likes insert policy"
ON likes FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Users can delete their own likes (optimized)
CREATE POLICY "Likes delete policy"
ON likes FOR DELETE
USING ((select auth.uid()) = user_id);

-- ============================================================================
-- COMMENTS TABLE POLICIES
-- ============================================================================

-- Public can read comments on public content
CREATE POLICY "Comments read policy"
ON comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM content
    WHERE content.id = comments.content_id
    AND content.is_public = true
    AND content.deleted_at IS NULL
  )
  AND comments.is_deleted = false
);

-- Users can insert comments (optimized)
CREATE POLICY "Comments insert policy"
ON comments FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Users can update their own comments (optimized)
CREATE POLICY "Comments update policy"
ON comments FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- PLAYLISTS TABLE POLICIES
-- ============================================================================

-- Users can read public playlists or their own (optimized)
CREATE POLICY "Playlists read policy"
ON playlists FOR SELECT
USING (user_id = (select auth.uid()) OR is_public = true);

-- Users can insert their own playlists (optimized)
CREATE POLICY "Playlists insert policy"
ON playlists FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Users can update their own playlists (optimized)
CREATE POLICY "Playlists update policy"
ON playlists FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

-- Users can read their own notifications (optimized)
CREATE POLICY "Notifications read policy"
ON notifications FOR SELECT
USING (user_id = (select auth.uid()));

-- System can insert notifications
CREATE POLICY "Notifications insert policy"
ON notifications FOR INSERT
WITH CHECK (true);

-- Users can update their own notifications (optimized)
CREATE POLICY "Notifications update policy"
ON notifications FOR UPDATE
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

-- ============================================================================
-- CATEGORIES TABLE POLICIES
-- ============================================================================

-- Public can read all categories
CREATE POLICY "Categories read policy"
ON categories FOR SELECT
USING (true);

-- Only admins can modify categories (via service role)

-- ============================================================================
-- TAGS TABLE POLICIES
-- ============================================================================

-- Public can read all tags
CREATE POLICY "Tags read policy"
ON tags FOR SELECT
USING (true);

-- Only admins can modify tags (via service role)

-- ============================================================================
-- CONTENT_CATEGORIES TABLE POLICIES (Junction table)
-- ============================================================================

-- Public can read content categories
CREATE POLICY "Content categories read policy"
ON content_categories FOR SELECT
USING (true);

-- Creators can insert content categories for their own content
CREATE POLICY "Content categories insert policy"
ON content_categories FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM content
    JOIN creators ON content.creator_id = creators.id
    WHERE content.id = content_categories.content_id
    AND creators.user_id = (select auth.uid())
  )
);

-- Creators can delete content categories for their own content
CREATE POLICY "Content categories delete policy"
ON content_categories FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM content
    JOIN creators ON content.creator_id = creators.id
    WHERE content.id = content_categories.content_id
    AND creators.user_id = (select auth.uid())
  )
);

-- ============================================================================
-- CONTENT_TAGS TABLE POLICIES (Junction table)
-- ============================================================================

-- Public can read content tags
CREATE POLICY "Content tags read policy"
ON content_tags FOR SELECT
USING (true);

-- Creators can insert tags for their own content
CREATE POLICY "Content tags insert policy"
ON content_tags FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM content
    JOIN creators ON content.creator_id = creators.id
    WHERE content.id = content_tags.content_id
    AND creators.user_id = (select auth.uid())
  )
);

-- Creators can delete tags for their own content
CREATE POLICY "Content tags delete policy"
ON content_tags FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM content
    JOIN creators ON content.creator_id = creators.id
    WHERE content.id = content_tags.content_id
    AND creators.user_id = (select auth.uid())
  )
);

-- ============================================================================
-- CREATOR_CATEGORIES TABLE POLICIES (Junction table)
-- ============================================================================

-- Public can read creator categories
CREATE POLICY "Creator categories read policy"
ON creator_categories FOR SELECT
USING (true);

-- Creators can manage their own categories
CREATE POLICY "Creator categories insert policy"
ON creator_categories FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM creators
    WHERE creators.id = creator_categories.creator_id
    AND creators.user_id = (select auth.uid())
  )
);

CREATE POLICY "Creator categories delete policy"
ON creator_categories FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM creators
    WHERE creators.id = creator_categories.creator_id
    AND creators.user_id = (select auth.uid())
  )
);

-- ============================================================================
-- PLAYLIST_ITEMS TABLE POLICIES
-- ============================================================================

-- Users can read playlist items for public playlists or their own
CREATE POLICY "Playlist items read policy"
ON playlist_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM playlists
    WHERE playlists.id = playlist_items.playlist_id
    AND (playlists.is_public = true OR playlists.user_id = (select auth.uid()))
  )
);

-- Users can insert items into their own playlists
CREATE POLICY "Playlist items insert policy"
ON playlist_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM playlists
    WHERE playlists.id = playlist_items.playlist_id
    AND playlists.user_id = (select auth.uid())
  )
);

-- Users can update items in their own playlists
CREATE POLICY "Playlist items update policy"
ON playlist_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM playlists
    WHERE playlists.id = playlist_items.playlist_id
    AND playlists.user_id = (select auth.uid())
  )
);

-- Users can delete items from their own playlists
CREATE POLICY "Playlist items delete policy"
ON playlist_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM playlists
    WHERE playlists.id = playlist_items.playlist_id
    AND playlists.user_id = (select auth.uid())
  )
);

-- ============================================================================
-- SUBSCRIPTIONS TABLE POLICIES
-- ============================================================================

-- Consolidated SELECT: users can read their own subscriptions OR creators can read subscriptions to their profile
CREATE POLICY "Subscriptions read policy"
ON subscriptions FOR SELECT
USING (
  subscriber_id = (select auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM creators
    WHERE creators.id = subscriptions.creator_id
    AND creators.user_id = (select auth.uid())
  )
);

-- Users can insert their own subscriptions (follow)
CREATE POLICY "Subscriptions insert policy"
ON subscriptions FOR INSERT
WITH CHECK (subscriber_id = (select auth.uid()));

-- Users can update their own subscriptions
CREATE POLICY "Subscriptions update policy"
ON subscriptions FOR UPDATE
USING (subscriber_id = (select auth.uid()));

-- Users can delete their own subscriptions (unfollow)
CREATE POLICY "Subscriptions delete policy"
ON subscriptions FOR DELETE
USING (subscriber_id = (select auth.uid()));

-- ============================================================================
-- REPORTS TABLE POLICIES
-- ============================================================================

-- Users can read their own reports
CREATE POLICY "Reports read policy"
ON reports FOR SELECT
USING (reporter_id = (select auth.uid()));

-- Users can insert reports
CREATE POLICY "Reports insert policy"
ON reports FOR INSERT
WITH CHECK (reporter_id = (select auth.uid()));

-- ============================================================================
-- TRANSACTIONS TABLE POLICIES
-- ============================================================================

-- Users can read their own transactions
CREATE POLICY "Transactions read policy"
ON transactions FOR SELECT
USING (user_id = (select auth.uid()));

-- Transactions are inserted via service role (payment processing)
