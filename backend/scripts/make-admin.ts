import { prisma } from '../src/lib/prisma';

async function makeAdmin(email: string) {
  try {
    console.log(`🔍 Looking for user with email: ${email}`);
    
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, username: true, role: true },
    });

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.username} (${user.email})`);
    console.log(`📊 Current role: ${user.role || 'USER'}`);

    if (user.role === 'ADMIN') {
      console.log('ℹ️  User is already an ADMIN');
      return;
    }

    console.log('⏳ Updating role to ADMIN...');
    
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
      select: { id: true, email: true, username: true, role: true },
    });

    console.log('✅ Successfully updated user role to ADMIN!');
    console.log(`📊 New role: ${updatedUser.role}`);
    console.log(`👤 User: ${updatedUser.username} (${updatedUser.email})`);
  } catch (error: any) {
    console.error('❌ Error updating user role:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: bun run scripts/make-admin.ts <email>');
  process.exit(1);
}

makeAdmin(email);
