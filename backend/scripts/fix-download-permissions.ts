/**
 * Script to update existing content to allow downloads by default
 * Run with: npx ts-node scripts/fix-download-permissions.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating content allowDownloads to true...');

  // Update all content where allowDownloads is null or false to true
  const result = await prisma.content.updateMany({
    where: {
      OR: [
        { allowDownloads: null },
        { allowDownloads: false },
      ],
    },
    data: {
      allowDownloads: true,
    },
  });

  console.log(`Updated ${result.count} content items to allow downloads`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
