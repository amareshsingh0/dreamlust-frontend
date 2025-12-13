-- DreamLust Platform - Initial Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('USER', 'CREATOR', 'MODERATOR', 'ADMIN');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'INACTIVE');
CREATE TYPE creator_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TYPE content_type AS ENUM ('VIDEO', 'PHOTO', 'VR', 'LIVE_STREAM', 'AUDIO');
CREATE TYPE content_status AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED', 'REJECTED', 'DELETED');
CREATE TYPE subscription_tier AS ENUM ('BASIC', 'PREMIUM', 'VIP', 'CUSTOM');
CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'CANCELED', 'EXPIRED', 'PENDING', 'FAILED');
CREATE TYPE transaction_type AS ENUM ('SUBSCRIPTION', 'TIP', 'PREMIUM_CONTENT', 'REFUND', 'WITHDRAWAL');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELED');
CREATE TYPE notification_type AS ENUM ('NEW_FOLLOWER', 'NEW_COMMENT', 'NEW_LIKE', 'NEW_SUBSCRIBER', 'CONTENT_APPROVED', 'CONTENT_REJECTED', 'PAYMENT_RECEIVED', 'SYSTEM_ANNOUNCEMENT', 'MENTION', 'MESSAGE');
CREATE TYPE report_type AS ENUM ('SPAM', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'COPYRIGHT_VIOLATION', 'FAKE_ACCOUNT', 'OTHER');
CREATE TYPE report_status AS ENUM ('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED', 'ACTION_TAKEN');

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  
  -- Profile Information
  display_name TEXT,
  avatar TEXT,
  bio TEXT,
  location TEXT,
  website TEXT,
  birth_date TIMESTAMP,
  
  -- Preferences
  theme TEXT DEFAULT 'dark',
  language TEXT DEFAULT 'en',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  
  -- Status & Metadata
  role user_role DEFAULT 'USER',
  status user_status DEFAULT 'ACTIVE',
  is_creator BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  version INTEGER DEFAULT 0,
  
  -- Indexes
  CONSTRAINT users_email_key UNIQUE (email),
  CONSTRAINT users_username_key UNIQUE (username)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_users_id_created_at ON users(id, created_at);

-- ============================================================================
-- CREATORS TABLE
-- ============================================================================

CREATE TABLE creators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Creator Profile
  display_name TEXT NOT NULL,
  handle TEXT UNIQUE NOT NULL,
  avatar TEXT,
  banner TEXT,
  bio TEXT,
  location TEXT,
  website TEXT,
  
  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  verification_badge TEXT,
  
  -- Stats (denormalized)
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  content_count INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  
  -- Monetization
  is_monetized BOOLEAN DEFAULT FALSE,
  monetization_enabled_at TIMESTAMP,
  payout_email TEXT,
  payout_method TEXT,
  
  -- Status
  status creator_status DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  version INTEGER DEFAULT 0,
  
  CONSTRAINT creators_user_id_key UNIQUE (user_id),
  CONSTRAINT creators_handle_key UNIQUE (handle)
);

CREATE INDEX idx_creators_user_id ON creators(user_id);
CREATE INDEX idx_creators_handle ON creators(handle);
CREATE INDEX idx_creators_is_verified ON creators(is_verified);
CREATE INDEX idx_creators_status ON creators(status);
CREATE INDEX idx_creators_created_at ON creators(created_at);
CREATE INDEX idx_creators_deleted_at ON creators(deleted_at);

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================

CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  CONSTRAINT categories_name_key UNIQUE (name),
  CONSTRAINT categories_slug_key UNIQUE (slug)
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_is_active ON categories(is_active);
CREATE INDEX idx_categories_sort_order ON categories(sort_order);

-- ============================================================================
-- TAGS TABLE
-- ============================================================================

CREATE TABLE tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT tags_name_key UNIQUE (name),
  CONSTRAINT tags_slug_key UNIQUE (slug)
);

CREATE INDEX idx_tags_slug ON tags(slug);
CREATE INDEX idx_tags_usage_count ON tags(usage_count);

-- ============================================================================
-- CONTENT TABLE
-- ============================================================================

CREATE TABLE content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  
  -- Content Details
  title TEXT NOT NULL,
  description TEXT,
  type content_type NOT NULL,
  status content_status DEFAULT 'DRAFT',
  
  -- Media Files
  thumbnail TEXT,
  media_url TEXT NOT NULL,
  media_type TEXT,
  duration INTEGER, -- in seconds
  file_size BIGINT, -- in bytes
  resolution TEXT,
  is_vr BOOLEAN DEFAULT FALSE,
  
  -- Engagement Stats (denormalized)
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  
  -- Visibility & Moderation
  is_public BOOLEAN DEFAULT TRUE,
  is_nsfw BOOLEAN DEFAULT FALSE,
  age_restricted BOOLEAN DEFAULT FALSE,
  allow_comments BOOLEAN DEFAULT TRUE,
  allow_downloads BOOLEAN DEFAULT FALSE,
  
  -- Pricing
  is_premium BOOLEAN DEFAULT FALSE,
  price DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  
  -- Timestamps
  published_at TIMESTAMP,
  scheduled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  version INTEGER DEFAULT 0
);

CREATE INDEX idx_content_creator_id ON content(creator_id);
CREATE INDEX idx_content_creator_created ON content(creator_id, created_at);
CREATE INDEX idx_content_type ON content(type);
CREATE INDEX idx_content_status ON content(status);
CREATE INDEX idx_content_is_public ON content(is_public);
CREATE INDEX idx_content_published_at ON content(published_at);
CREATE INDEX idx_content_created_at ON content(created_at);
CREATE INDEX idx_content_view_count ON content(view_count);
CREATE INDEX idx_content_deleted_at ON content(deleted_at);
CREATE INDEX idx_content_id_view_count ON content(id, view_count);

-- ============================================================================
-- CONTENT-CATEGORY JUNCTION TABLE
-- ============================================================================

CREATE TABLE content_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT content_categories_unique UNIQUE (content_id, category_id)
);

CREATE INDEX idx_content_categories_content ON content_categories(content_id);
CREATE INDEX idx_content_categories_category ON content_categories(category_id);

-- ============================================================================
-- CONTENT-TAG JUNCTION TABLE
-- ============================================================================

CREATE TABLE content_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT content_tags_unique UNIQUE (content_id, tag_id)
);

CREATE INDEX idx_content_tags_content ON content_tags(content_id);
CREATE INDEX idx_content_tags_tag ON content_tags(tag_id);

-- ============================================================================
-- CREATOR-CATEGORY JUNCTION TABLE
-- ============================================================================

CREATE TABLE creator_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT creator_categories_unique UNIQUE (creator_id, category_id)
);

CREATE INDEX idx_creator_categories_creator ON creator_categories(creator_id);
CREATE INDEX idx_creator_categories_category ON creator_categories(category_id);

-- ============================================================================
-- VIEWS TABLE
-- ============================================================================

CREATE TABLE views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- View Details
  ip_address TEXT,
  user_agent TEXT,
  duration INTEGER, -- View duration in seconds
  watched_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_views_content ON views(content_id);
CREATE INDEX idx_views_user ON views(user_id);
CREATE INDEX idx_views_content_created ON views(content_id, created_at);
CREATE INDEX idx_views_watched_at ON views(watched_at);

-- ============================================================================
-- LIKES TABLE
-- ============================================================================

CREATE TABLE likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT likes_unique UNIQUE (content_id, user_id)
);

CREATE INDEX idx_likes_content ON likes(content_id);
CREATE INDEX idx_likes_user ON likes(user_id);
CREATE INDEX idx_likes_created_at ON likes(created_at);

-- ============================================================================
-- COMMENTS TABLE
-- ============================================================================

CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Comment Details
  text TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  
  -- Engagement
  like_count INTEGER DEFAULT 0,
  
  -- Moderation
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 0
);

CREATE INDEX idx_comments_content ON comments(content_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_content_created ON comments(content_id, created_at);
CREATE INDEX idx_comments_created_at ON comments(created_at);

-- ============================================================================
-- PLAYLISTS TABLE
-- ============================================================================

CREATE TABLE playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Playlist Details
  name TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  
  -- Stats
  item_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  version INTEGER DEFAULT 0
);

CREATE INDEX idx_playlists_user ON playlists(user_id);
CREATE INDEX idx_playlists_user_created ON playlists(user_id, created_at);
CREATE INDEX idx_playlists_is_public ON playlists(is_public);

-- ============================================================================
-- PLAYLIST ITEMS TABLE
-- ============================================================================

CREATE TABLE playlist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  
  sort_order INTEGER DEFAULT 0,
  added_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT playlist_items_unique UNIQUE (playlist_id, content_id)
);

CREATE INDEX idx_playlist_items_playlist ON playlist_items(playlist_id);
CREATE INDEX idx_playlist_items_content ON playlist_items(content_id);
CREATE INDEX idx_playlist_items_playlist_order ON playlist_items(playlist_id, sort_order);

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  
  -- Subscription Details
  tier subscription_tier DEFAULT 'BASIC',
  status subscription_status DEFAULT 'ACTIVE',
  is_recurring BOOLEAN DEFAULT TRUE,
  
  -- Pricing
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  interval TEXT DEFAULT 'monthly',
  
  -- Dates
  started_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  canceled_at TIMESTAMP,
  renewed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 0,
  
  CONSTRAINT subscriptions_unique UNIQUE (subscriber_id, creator_id)
);

CREATE INDEX idx_subscriptions_subscriber ON subscriptions(subscriber_id);
CREATE INDEX idx_subscriptions_creator ON subscriptions(creator_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_subscriber_created ON subscriptions(subscriber_id, created_at);

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- Transaction Details
  type transaction_type NOT NULL,
  status transaction_status DEFAULT 'PENDING',
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Payment Processing
  payment_method TEXT,
  payment_id TEXT,
  receipt_url TEXT,
  
  -- Metadata
  description TEXT,
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 0
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_subscription ON transactions(subscription_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_user_created ON transactions(user_id, created_at);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification Details
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  
  -- Metadata
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ============================================================================
-- REPORTS TABLE
-- ============================================================================

CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  
  -- Report Details
  type report_type NOT NULL,
  reason TEXT NOT NULL,
  status report_status DEFAULT 'PENDING',
  
  -- Moderation
  moderator_id UUID,
  moderator_notes TEXT,
  resolved_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 0
);

CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX idx_reports_content ON reports(content_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Enable for all tables
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE views ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

