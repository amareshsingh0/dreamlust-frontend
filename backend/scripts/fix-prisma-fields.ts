/**
 * Script to find and report all Prisma field name mismatches
 * Schema uses snake_case, but code might be using camelCase
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Field mappings: camelCase -> snake_case
const fieldMappings: Record<string, string> = {
  // User fields
  displayName: 'display_name',
  emailVerified: 'email_verified',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  isCreator: 'is_creator',
  
  // Creator fields
  isVerified: 'is_verified',
  verifiedAt: 'verified_at',
  followerCount: 'follower_count',
  followingCount: 'following_count',
  contentCount: 'content_count',
  totalViews: 'total_views',
  totalLikes: 'total_likes',
  totalComments: 'total_comments',
  isMonetized: 'is_monetized',
  monetizationEnabledAt: 'monetization_enabled_at',
  
  // Content fields
  viewCount: 'view_count',
  likeCount: 'like_count',
  commentCount: 'comment_count',
  shareCount: 'share_count',
  isPublic: 'is_public',
  isNSFW: 'is_nsfw',
  ageRestricted: 'age_restricted',
  allowComments: 'allow_comments',
  allowDownloads: 'allow_downloads',
  isPremium: 'is_premium',
  publishedAt: 'published_at',
  scheduledAt: 'scheduled_at',
  thumbnailBlur: 'thumbnail_blur',
  mediaUrl: 'media_url',
  mediaType: 'media_type',
  fileSize: 'file_size',
  isVR: 'is_vr',
};

function findFiles(dir: string, extensions: string[] = ['.ts']): string[] {
  const files: string[] = [];
  
  function traverse(currentDir: string) {
    const entries = readdirSync(currentDir);
    
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === 'build') {
        continue;
      }
      
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (stat.isFile()) {
        const ext = entry.substring(entry.lastIndexOf('.'));
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  traverse(dir);
  return files;
}

function findFieldIssues(filePath: string): Array<{ line: number; issue: string; fix: string }> {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const issues: Array<{ line: number; issue: string; fix: string }> = [];
  
  lines.forEach((line, index) => {
    // Check for select statements with camelCase fields
    for (const [camelCase, snakeCase] of Object.entries(fieldMappings)) {
      // Pattern: fieldName: true (in select)
      const selectPattern = new RegExp(`\\b${camelCase}\\s*:\\s*true`, 'g');
      if (selectPattern.test(line)) {
        issues.push({
          line: index + 1,
          issue: `Found ${camelCase} in select statement`,
          fix: `Change ${camelCase} to ${snakeCase}`,
        });
      }
      
      // Pattern: .fieldName (accessing field)
      const accessPattern = new RegExp(`\\.${camelCase}\\b`, 'g');
      if (accessPattern.test(line) && !line.includes(snakeCase)) {
        // Check if it's accessing a Prisma result (not a variable name)
        if (line.includes('item.') || line.includes('user.') || line.includes('creator.') || 
            line.includes('content.') || line.includes('data.')) {
          issues.push({
            line: index + 1,
            issue: `Found ${camelCase} field access`,
            fix: `Change .${camelCase} to .${snakeCase}`,
          });
        }
      }
      
      // Pattern: where: { fieldName: ... }
      const wherePattern = new RegExp(`\\b${camelCase}\\s*:`, 'g');
      if (wherePattern.test(line) && line.includes('where:')) {
        issues.push({
          line: index + 1,
          issue: `Found ${camelCase} in where clause`,
          fix: `Change ${camelCase} to ${snakeCase}`,
        });
      }
    }
  });
  
  return issues;
}

// Main execution
const srcDir = join(__dirname, '..', 'src');
const files = findFiles(srcDir);

console.log(`\n🔍 Scanning ${files.length} files for Prisma field name issues...\n`);

const allIssues: Array<{ file: string; issues: Array<{ line: number; issue: string; fix: string }> }> = [];

files.forEach(file => {
  const issues = findFieldIssues(file);
  if (issues.length > 0) {
    allIssues.push({ file, issues });
  }
});

if (allIssues.length === 0) {
  console.log('✅ No field name issues found!\n');
} else {
  console.log(`❌ Found issues in ${allIssues.length} files:\n`);
  
  allIssues.forEach(({ file, issues }) => {
    const relativePath = file.replace(process.cwd(), '').replace(/\\/g, '/');
    console.log(`📄 ${relativePath}`);
    issues.forEach(({ line, issue, fix }) => {
      console.log(`   Line ${line}: ${issue}`);
      console.log(`   Fix: ${fix}`);
    });
    console.log('');
  });
  
  console.log(`\n📊 Summary: ${allIssues.reduce((sum, f) => sum + f.issues.length, 0)} total issues found\n`);
}
