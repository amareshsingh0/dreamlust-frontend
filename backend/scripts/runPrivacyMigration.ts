import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('Running privacy features migration...');

    // Create user_preferences table
    await prisma.$executeRaw`
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
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
    `;

    // Create account_deletions table
    await prisma.$executeRaw`
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
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_account_deletions_user_id ON account_deletions(user_id);
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_account_deletions_scheduled_for ON account_deletions(scheduled_for);
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_account_deletions_status ON account_deletions(status);
    `;

    console.log('✅ Privacy features migration completed successfully!');
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('✅ Tables already exist, skipping...');
    } else {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();

