import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed categories with emoji icons
 * Run with: npx ts-node scripts/seed-categories.ts
 */
const categories = [
  { name: 'Art & Design', slug: 'art-design', icon: '🎨', description: 'Creative artwork and design content', sortOrder: 1 },
  { name: 'Adventure', slug: 'adventure', icon: '⛰️', description: 'Adventure and exploration content', sortOrder: 2 },
  { name: 'Photography', slug: 'photography', icon: '📷', description: 'Photography and visual art', sortOrder: 3 },
  { name: 'VR Experience', slug: 'vr-experience', icon: '🥽', description: 'Virtual reality experiences', sortOrder: 4 },
  { name: 'Music', slug: 'music', icon: '🎵', description: 'Music and audio content', sortOrder: 5 },
  { name: 'Documentary', slug: 'documentary', icon: '🎬', description: 'Documentary films and series', sortOrder: 6 },
  { name: 'Gaming', slug: 'gaming', icon: '🎮', description: 'Gaming content and streams', sortOrder: 7 },
  { name: 'Technology', slug: 'technology', icon: '💻', description: 'Technology and software content', sortOrder: 8 },
  { name: 'Lifestyle', slug: 'lifestyle', icon: '✨', description: 'Lifestyle and wellness', sortOrder: 9 },
  { name: 'Education', slug: 'education', icon: '📚', description: 'Educational content and tutorials', sortOrder: 10 },
  { name: 'Fitness', slug: 'fitness', icon: '💪', description: 'Fitness and workout content', sortOrder: 11 },
  { name: 'Food & Cooking', slug: 'food-cooking', icon: '🍳', description: 'Food recipes and cooking shows', sortOrder: 12 },
  { name: 'Travel', slug: 'travel', icon: '✈️', description: 'Travel vlogs and guides', sortOrder: 13 },
  { name: 'Nature', slug: 'nature', icon: '🌿', description: 'Nature and wildlife content', sortOrder: 14 },
  { name: 'Comedy', slug: 'comedy', icon: '😂', description: 'Comedy and entertainment', sortOrder: 15 },
  { name: 'Science', slug: 'science', icon: '🔬', description: 'Science and discovery', sortOrder: 16 },
  { name: 'Fashion', slug: 'fashion', icon: '👗', description: 'Fashion and style content', sortOrder: 17 },
  { name: 'Sports', slug: 'sports', icon: '⚽', description: 'Sports and athletics', sortOrder: 18 },
  { name: 'News', slug: 'news', icon: '📰', description: 'News and current events', sortOrder: 19 },
  { name: 'Entertainment', slug: 'entertainment', icon: '🎭', description: 'Entertainment and shows', sortOrder: 20 },
];

async function seedCategories() {
  try {
    console.log('🌱 Seeding categories...\n');

    for (const category of categories) {
      const existing = await prisma.category.findFirst({
        where: {
          OR: [
            { slug: category.slug },
            { name: category.name }
          ]
        }
      });

      if (existing) {
        // Update existing category with icon if missing
        await prisma.category.update({
          where: { id: existing.id },
          data: {
            icon: category.icon,
            sortOrder: category.sortOrder,
            description: category.description,
            isActive: true,
          }
        });
        console.log(`✅ Updated: ${category.name} ${category.icon}`);
      } else {
        // Create new category
        await prisma.category.create({
          data: {
            name: category.name,
            slug: category.slug,
            icon: category.icon,
            description: category.description,
            sortOrder: category.sortOrder,
            isActive: true,
          }
        });
        console.log(`✅ Created: ${category.name} ${category.icon}`);
      }
    }

    // Get summary
    const totalCategories = await prisma.category.count({
      where: { isActive: true }
    });

    console.log(`\n🎉 Categories seeded successfully!`);
    console.log(`📊 Total active categories: ${totalCategories}`);

  } catch (error: any) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedCategories();
