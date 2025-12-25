/**
 * Create Admin User Script
 * Run with: bun run src/scripts/createAdmin.ts
 */

import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/auth/password';
// UserRole enum from Prisma
type UserRole = 'USER' | 'CREATOR' | 'MODERATOR' | 'ADMIN';

async function createAdmin() {
  const email = 'dreamlustproject@gmail.com';
  const username = 'dreamlust';
  const displayName = 'DreamLust';
  const password = '$Amaresh@1234$';

  try {
    console.log('Creating admin user...');

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ],
        deletedAt: null,
      },
    });

    if (existingUser) {
      // Update existing user to admin
      const hashedPassword = await hashPassword(password);
      const updated = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email,
          username,
          displayName: displayName,
          password: hashedPassword,
          role: 'ADMIN' as UserRole,
          emailVerified: true,
        },
      });

      console.log('✅ Admin user updated successfully!');
      console.log('Email:', updated.email);
      console.log('Username:', updated.username);
      console.log('Role:', updated.role);
      return;
    }

    // Create new admin user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        displayName: displayName,
        password: hashedPassword,
        role: 'ADMIN' as UserRole,
        emailVerified: true,
        status: 'ACTIVE',
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email:', user.email);
    console.log('Username:', user.username);
    console.log('Role:', user.role);
    console.log('ID:', user.id);
  } catch (error: any) {
    console.error('❌ Error creating admin user:', error);
    if (error.code === 'P2002') {
      console.error('User with this email or username already exists');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createAdmin();

