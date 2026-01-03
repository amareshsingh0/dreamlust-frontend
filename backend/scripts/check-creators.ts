import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCreators() {
  const creators = await prisma.creator.findMany({
    select: { handle: true, displayName: true, isVerified: true }
  });
  console.log('Creators:');
  creators.forEach(c => {
    console.log(`  ${c.handle} (${c.displayName}) - Verified: ${c.isVerified}`);
  });
  await prisma.$disconnect();
}

checkCreators();
