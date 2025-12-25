/**
 * Seed Funnel Templates
 * Creates predefined funnels from templates
 */

import { PrismaClient } from '@prisma/client';
import { FUNNEL_TEMPLATES } from '../lib/analytics/funnelTemplates';

const prisma = new PrismaClient();

async function seedFunnels() {
  console.log('Seeding funnels...');

  // Get admin user (or create a default admin)
  const admin = await prisma.user.findFirst({
    where: {
      role: 'ADMIN',
    },
  });

  if (!admin) {
    console.error('No admin user found. Please create an admin user first.');
    process.exit(1);
  }

  for (const template of FUNNEL_TEMPLATES) {
    // Check if funnel already exists
    const existing = await prisma.funnel.findFirst({
      where: {
        name: template.name,
      },
    });

    if (existing) {
      console.log(`Funnel "${template.name}" already exists, skipping...`);
      continue;
    }

    // Create funnel
    const funnel = await prisma.funnel.create({
      data: {
        name: template.name,
        description: template.description,
        steps: JSON.parse(JSON.stringify(template.steps)),
        createdBy: admin.id,
        template: template.template,
        variant: 'control',
        isActive: true,
      },
    });

    console.log(`✅ Created funnel: ${funnel.name} (${funnel.id})`);
  }

  console.log('✅ Funnel seeding completed');
}

seedFunnels()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


