import { prisma } from '../src/lib/prisma';

async function createCreatorProfile(email: string) {
  try {
    console.log(`🔍 Looking for user with email: ${email}`);
    
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, username: true, display_name: true, role: true },
    });

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.username} (${user.email})`);

    // Check if creator profile already exists
    const existingCreator = await prisma.creator.findFirst({
      where: { user_id: user.id },
      select: { id: true, handle: true },
    });

    if (existingCreator) {
      console.log(`ℹ️  Creator profile already exists: ${existingCreator.handle}`);
      return;
    }

    console.log('⏳ Creating creator profile...');
    
    // Create creator profile
    const creator = await prisma.creator.create({
      data: {
        user_id: user.id,
        display_name: user.display_name || user.username,
        handle: user.username,
        status: 'APPROVED', // Auto-approve for admins
      },
      select: { id: true, handle: true, display_name: true, status: true },
    });

    console.log('✅ Successfully created creator profile!');
    console.log(`📊 Creator: ${creator.display_name} (@${creator.handle})`);
    console.log(`📊 Status: ${creator.status}`);
  } catch (error: any) {
    console.error('❌ Error creating creator profile:', error.message);
    if (error.code === 'P2002') {
      console.error('⚠️  A creator profile with this handle already exists');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: bun run scripts/create-creator-profile.ts <email>');
  process.exit(1);
}

createCreatorProfile(email);
