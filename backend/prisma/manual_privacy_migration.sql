-- Manual migration to add privacy features
-- This matches the actual database schema (UUIDs, snake_case)

-- Create user_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    theme TEXT DEFAULT 'auto',
    language TEXT DEFAULT 'en',
    region TEXT,
    hide_history BOOLEAN DEFAULT false,
    anonymous_mode BOOLEAN DEFAULT false,
    allow_personalization BOOLEAN DEFAULT true,
    show_activity_status BOOLEAN DEFAULT true,
    allow_messages TEXT DEFAULT 'everyone',
    show_watch_history TEXT DEFAULT 'private',
    show_playlists TEXT DEFAULT 'public',
    show_liked_content TEXT DEFAULT 'private',
    history_lock_enabled BOOLEAN DEFAULT false,
    history_lock_pin_hash TEXT,
    default_quality TEXT DEFAULT 'auto',
    autoplay BOOLEAN DEFAULT true,
    notifications JSONB DEFAULT '{"email":{},"push":{},"inApp":{}}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT user_preferences_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for user_preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Create account_deletions table if it doesn't exist
CREATE TABLE IF NOT EXISTS account_deletions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    requested_at TIMESTAMP DEFAULT NOW(),
    scheduled_for TIMESTAMP NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT account_deletions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for account_deletions
CREATE INDEX IF NOT EXISTS idx_account_deletions_user_id ON account_deletions(user_id);
CREATE INDEX IF NOT EXISTS idx_account_deletions_scheduled_for ON account_deletions(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_account_deletions_status ON account_deletions(status);
