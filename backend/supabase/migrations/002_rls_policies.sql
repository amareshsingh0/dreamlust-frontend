-- Row Level Security Policies for DreamLust Platform
-- Run this after 001_initial_schema.sql

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
ON users FOR SELECT
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow public to read basic user info (for profiles)
CREATE POLICY "Public can read user profiles"
ON users FOR SELECT
USING (true);

-- ============================================================================
-- CREATORS TABLE POLICIES
-- ============================================================================

-- Allow public to read creator profiles
CREATE POLICY "Public can read creators"
ON creators FOR SELECT
USING (true);

-- Allow creators to update their own profile
CREATE POLICY "Creators can update own profile"
ON creators FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = creators.user_id
    AND users.id = auth.uid()
  )
);

-- ============================================================================
-- CONTENT TABLE POLICIES
-- ============================================================================

-- Allow public to read published content
CREATE POLICY "Public can read published content"
ON content FOR SELECT
USING (is_public = true AND deleted_at IS NULL);

-- Allow creators to read their own content
CREATE POLICY "Creators can read own content"
ON content FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM creators
    WHERE creators.id = content.creator_id
    AND creators.user_id = auth.uid()
  )
);

-- Allow creators to insert their own content
CREATE POLICY "Creators can insert own content"
ON content FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM creators
    WHERE creators.id = content.creator_id
    AND creators.user_id = auth.uid()
  )
);

-- Allow creators to update their own content
CREATE POLICY "Creators can update own content"
ON content FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM creators
    WHERE creators.id = content.creator_id
    AND creators.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM creators
    WHERE creators.id = content.creator_id
    AND creators.user_id = auth.uid()
  )
);

-- ============================================================================
-- VIEWS TABLE POLICIES
-- ============================================================================

-- Allow anyone to insert views (tracking)
CREATE POLICY "Anyone can insert views"
ON views FOR INSERT
WITH CHECK (true);

-- Allow users to read their own views
CREATE POLICY "Users can read own views"
ON views FOR SELECT
USING (user_id = auth.uid() OR user_id IS NULL);

-- ============================================================================
-- LIKES TABLE POLICIES
-- ============================================================================

-- Allow authenticated users to like content
CREATE POLICY "Users can like content"
ON likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to read all likes
CREATE POLICY "Public can read likes"
ON likes FOR SELECT
USING (true);

-- Allow users to unlike (delete their own likes)
CREATE POLICY "Users can delete own likes"
ON likes FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS TABLE POLICIES
-- ============================================================================

-- Allow public to read comments on public content
CREATE POLICY "Public can read comments"
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

-- Allow authenticated users to insert comments
CREATE POLICY "Users can insert comments"
ON comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own comments
CREATE POLICY "Users can update own comments"
ON comments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- PLAYLISTS TABLE POLICIES
-- ============================================================================

-- Allow users to read their own playlists
CREATE POLICY "Users can read own playlists"
ON playlists FOR SELECT
USING (user_id = auth.uid() OR is_public = true);

-- Allow users to insert their own playlists
CREATE POLICY "Users can insert own playlists"
ON playlists FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own playlists
CREATE POLICY "Users can update own playlists"
ON playlists FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

-- Allow users to read their own notifications
CREATE POLICY "Users can read own notifications"
ON notifications FOR SELECT
USING (user_id = auth.uid());

-- Allow system to insert notifications
CREATE POLICY "System can insert notifications"
ON notifications FOR INSERT
WITH CHECK (true);

-- Allow users to update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- TESTING POLICY (Temporary - Remove in production)
-- ============================================================================

-- For testing: Allow all operations on users table
-- REMOVE THIS IN PRODUCTION!
CREATE POLICY "Allow all for testing - REMOVE IN PRODUCTION"
ON users
FOR ALL
USING (true)
WITH CHECK (true);

