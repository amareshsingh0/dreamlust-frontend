import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script to update existing content with sample duration values
 * This helps demonstrate the UI changes for the content cards
 */
async function updateContentDuration() {
  try {
    console.log('🔄 Updating content durations...\n');

    // Get all content without duration
    const contentWithoutDuration = await prisma.content.findMany({
      where: {
        OR: [
          { duration: null },
          { duration: 0 }
        ]
      },
      select: {
        id: true,
        title: true,
        type: true,
      }
    });

    console.log(`Found ${contentWithoutDuration.length} content items without duration\n`);

    // Update each content with a random duration based on type
    for (const content of contentWithoutDuration) {
      // Generate random duration based on content type
      let duration: number;
      let resolution: string | null = null;
      let isPremium: boolean = false;

      switch (content.type) {
        case 'VIDEO':
          // Video: 1-15 minutes (60-900 seconds)
          duration = Math.floor(Math.random() * 840) + 60;
          // Random quality
          const qualities = ['1920x1080', '3840x2160', '1280x720'];
          resolution = qualities[Math.floor(Math.random() * qualities.length)];
          // 30% chance of being premium
          isPremium = Math.random() < 0.3;
          break;
        case 'AUDIO':
          // Audio: 2-6 minutes (120-360 seconds)
          duration = Math.floor(Math.random() * 240) + 120;
          break;
        case 'PHOTO':
          // Photos don't have duration
          duration = 0;
          break;
        case 'LIVE_STREAM':
          // Live streams: 30min-2hours (1800-7200 seconds)
          duration = Math.floor(Math.random() * 5400) + 1800;
          break;
        case 'VR':
          // VR: 5-20 minutes (300-1200 seconds)
          duration = Math.floor(Math.random() * 900) + 300;
          resolution = '3840x2160'; // VR is typically 4K
          isPremium = Math.random() < 0.5; // 50% chance of being premium
          break;
        default:
          // Default: 2-8 minutes
          duration = Math.floor(Math.random() * 360) + 120;
      }

      // Update the content
      await prisma.content.update({
        where: { id: content.id },
        data: {
          duration,
          resolution: resolution || undefined,
          isPremium,
        }
      });

      const durationStr = duration > 0
        ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`
        : 'N/A';

      console.log(`✅ Updated: "${content.title}"`);
      console.log(`   Duration: ${durationStr}, Resolution: ${resolution || 'unchanged'}, Premium: ${isPremium}\n`);
    }

    console.log('✨ Content duration update completed!');

    // Show summary
    const contentWithDuration = await prisma.content.count({
      where: {
        duration: { gt: 0 }
      }
    });
    console.log(`\n📊 Total content with duration: ${contentWithDuration}`);

  } catch (error: any) {
    console.error('❌ Error updating content:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateContentDuration();
