/**
 * Migration script to add moderation features
 * Run this after updating the Prisma schema
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addModerationFeatures() {
  try {
    console.log('Adding moderation features to database...');

    // Add new columns to reports table
    await prisma.$executeRaw`
      ALTER TABLE reports
      ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'content',
      ADD COLUMN IF NOT EXISTS target_id UUID,
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS reviewed_by UUID,
      ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS action TEXT;
    `;

    // Create content_flags table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS content_flags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
        flag_type TEXT NOT NULL,
        reason TEXT NOT NULL,
        severity TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP,
        CONSTRAINT content_flags_unique UNIQUE (content_id, flag_type, reason)
      );
    `;

    // Create indexes
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_content_flags_content ON content_flags(content_id);
      CREATE INDEX IF NOT EXISTS idx_content_flags_type ON content_flags(flag_type);
      CREATE INDEX IF NOT EXISTS idx_content_flags_severity ON content_flags(severity);
      CREATE INDEX IF NOT EXISTS idx_content_flags_active ON content_flags(is_active);
      CREATE INDEX IF NOT EXISTS idx_content_flags_created ON content_flags(created_at);
      CREATE INDEX IF NOT EXISTS idx_reports_content_type_target ON reports(content_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports(status, created_at);
      CREATE INDEX IF NOT EXISTS idx_reports_reviewed_by ON reports(reviewed_by);
    `;

    console.log('✅ Moderation features added successfully!');
  } catch (error: any) {
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log('✅ Features already exist, skipping...');
    } else {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

addModerationFeatures();

