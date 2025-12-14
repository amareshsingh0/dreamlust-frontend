-- Add comment features: dislikes, isPinned, and CommentLike table
-- This migration adds the new fields needed for the comment system

-- Add dislikes column to comments table (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' AND column_name = 'dislikes'
    ) THEN
        ALTER TABLE comments ADD COLUMN dislikes INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add is_pinned column to comments table (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' AND column_name = 'is_pinned'
    ) THEN
        ALTER TABLE comments ADD COLUMN is_pinned BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Rename like_count to likes if like_count exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' AND column_name = 'like_count'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' AND column_name = 'likes'
    ) THEN
        ALTER TABLE comments RENAME COLUMN like_count TO likes;
    END IF;
END $$;

-- Add likes column if it doesn't exist (and like_count doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' AND column_name = 'likes'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' AND column_name = 'like_count'
    ) THEN
        ALTER TABLE comments ADD COLUMN likes INTEGER DEFAULT 0;
    END IF;
END $$;

-- Note: Keeping is_deleted column as it may be used by database policies
-- We'll use both is_deleted and deleted_at for compatibility

-- Create comment_likes table if it doesn't exist
-- Check the actual type of comments.id and users.id first
DO $$ 
DECLARE
    comment_id_type TEXT;
    user_id_type TEXT;
BEGIN
    -- Get the data type of comments.id
    SELECT data_type INTO comment_id_type
    FROM information_schema.columns
    WHERE table_name = 'comments' AND column_name = 'id';
    
    -- Get the data type of users.id
    SELECT data_type INTO user_id_type
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'id';
    
    -- Create table with matching types
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS comment_likes (
            id %s PRIMARY KEY,
            comment_id %s NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
            user_id %s NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type TEXT NOT NULL CHECK (type IN (''like'', ''dislike'')),
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(comment_id, user_id)
        )',
        COALESCE(comment_id_type, 'TEXT'),
        COALESCE(comment_id_type, 'TEXT'),
        COALESCE(user_id_type, 'TEXT')
    );
END $$;

-- Create indexes for comment_likes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- Create index for pinned comments if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_comments_content_pinned ON comments(content_id, is_pinned) WHERE is_pinned = true;

