-- Fix Performance INFO-level Issues
-- This migration addresses:
-- 1. Unindexed foreign keys
-- 2. Tables without primary keys
-- Note: Unused indexes are intentionally kept for now as they may be used in production

-- ============================================================================
-- ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================

-- Index on comments.user_id (unindexed foreign key)
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- Index on live_chat_messages.user_id (unindexed foreign key)
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_user_id ON live_chat_messages(user_id);

-- ============================================================================
-- FIX TABLES WITHOUT PRIMARY KEYS
-- ============================================================================

-- Add primary key to daily_stats (using date as primary key since it should be unique per day)
-- First check if column exists and add id if needed
DO $$
BEGIN
  -- Check if daily_stats has an id column, if not add one
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_stats' AND column_name = 'id'
  ) THEN
    ALTER TABLE daily_stats ADD COLUMN id UUID DEFAULT gen_random_uuid();
  END IF;

  -- Add primary key if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'daily_stats' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE daily_stats ADD PRIMARY KEY (id);
  END IF;
END $$;

-- Add primary key to experiment_assignments
DO $$
BEGIN
  -- Check if experiment_assignments has an id column, if not add one
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'experiment_assignments' AND column_name = 'id'
  ) THEN
    ALTER TABLE experiment_assignments ADD COLUMN id UUID DEFAULT gen_random_uuid();
  END IF;

  -- Add primary key if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'experiment_assignments' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE experiment_assignments ADD PRIMARY KEY (id);
  END IF;
END $$;
