import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/auth/password';

// Sample creator data
const creatorsData = [
  {
    email: 'ariadreams@example.com',
    username: 'ariadreams',
    displayName: 'Aria Dreams',
    handle: 'ariadreams',
    bio: 'Creative content creator sharing dreams and inspiration. Join me on this journey! ✨',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ariadreams',
    banner: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&h=400&fit=crop',
    location: 'Los Angeles, CA',
    website: 'https://ariadreams.com',
    isVerified: true,
    followerCount: 125000,
    contentCount: 45,
    totalViews: 2500000,
  },
  {
    email: 'techwizard@example.com',
    username: 'techwizard',
    displayName: 'Tech Wizard',
    handle: 'techwizard',
    bio: 'Exploring the latest in technology, AI, and innovation. Let\'s build the future together! 🚀',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=techwizard',
    banner: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=400&fit=crop',
    location: 'San Francisco, CA',
    website: 'https://techwizard.dev',
    isVerified: true,
    followerCount: 89000,
    contentCount: 32,
    totalViews: 1800000,
  },
  {
    email: 'artisticvision@example.com',
    username: 'artisticvision',
    displayName: 'Artistic Vision',
    handle: 'artisticvision',
    bio: 'Digital artist creating stunning visuals and immersive experiences. Art is my passion! 🎨',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=artisticvision',
    banner: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1200&h=400&fit=crop',
    location: 'New York, NY',
    website: 'https://artisticvision.art',
    isVerified: false,
    followerCount: 67000,
    contentCount: 28,
    totalViews: 1200000,
  },
  {
    email: 'adventure_seeker@example.com',
    username: 'adventure_seeker',
    displayName: 'Adventure Seeker',
    handle: 'adventure_seeker',
    bio: 'Traveling the world, one adventure at a time! Join me as I explore amazing destinations 🌍',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=adventure_seeker',
    banner: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&h=400&fit=crop',
    location: 'Bali, Indonesia',
    website: 'https://adventureseeker.travel',
    isVerified: false,
    followerCount: 45000,
    contentCount: 52,
    totalViews: 950000,
  },
  {
    email: 'musicproducer@example.com',
    username: 'musicproducer',
    displayName: 'Music Producer',
    handle: 'musicproducer',
    bio: 'Creating beats and melodies that move your soul. Music is life! 🎵',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=musicproducer',
    banner: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=400&fit=crop',
    location: 'Nashville, TN',
    website: 'https://musicproducer.studio',
    isVerified: true,
    followerCount: 156000,
    contentCount: 38,
    totalViews: 3200000,
  },
  {
    email: 'fitnesscoach@example.com',
    username: 'fitnesscoach',
    displayName: 'Fitness Coach',
    handle: 'fitnesscoach',
    bio: 'Helping you achieve your fitness goals! Workouts, nutrition tips, and motivation 💪',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fitnesscoach',
    banner: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=400&fit=crop',
    location: 'Miami, FL',
    website: 'https://fitnesscoach.fit',
    isVerified: false,
    followerCount: 78000,
    contentCount: 41,
    totalViews: 1500000,
  },
  {
    email: 'foodiechef@example.com',
    username: 'foodiechef',
    displayName: 'Foodie Chef',
    handle: 'foodiechef',
    bio: 'Culinary adventures and delicious recipes! Cooking is an art form 🍳',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=foodiechef',
    banner: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=400&fit=crop',
    location: 'Paris, France',
    website: 'https://foodiechef.cooking',
    isVerified: true,
    followerCount: 203000,
    contentCount: 67,
    totalViews: 4800000,
  },
  {
    email: 'gamingpro@example.com',
    username: 'gamingpro',
    displayName: 'Gaming Pro',
    handle: 'gamingpro',
    bio: 'Professional gamer and streamer. Epic gameplay, tips, and gaming culture! 🎮',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gamingpro',
    banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=400&fit=crop',
    location: 'Seoul, South Korea',
    website: 'https://gamingpro.gg',
    isVerified: true,
    followerCount: 312000,
    contentCount: 89,
    totalViews: 7500000,
  },
];

async function seedCreators() {
  try {
    console.log('🌱 Starting creator seeding...\n');

    for (const creatorData of creatorsData) {
      try {
        // Check if user already exists
        let user = await prisma.user.findUnique({
          where: { email: creatorData.email },
        });

        if (!user) {
          // Create user first
          console.log(`📝 Creating user: ${creatorData.email}`);
          const hashedPassword = await hashPassword('Test123!@#');
          
          user = await prisma.user.create({
            data: {
              email: creatorData.email,
              username: creatorData.username,
              display_name: creatorData.displayName,
              password: hashedPassword,
              email_verified: true,
              status: 'ACTIVE',
            },
          });
          console.log(`✅ Created user: ${user.username}`);
        } else {
          console.log(`ℹ️  User already exists: ${user.username}`);
        }

        // Check if creator profile already exists
        const existingCreator = await prisma.creator.findFirst({
          where: { user_id: user.id },
        });

        if (existingCreator) {
          // Update existing creator to APPROVED status
          if (existingCreator.status !== 'APPROVED') {
            await prisma.creator.update({
              where: { id: existingCreator.id },
              data: {
                status: 'APPROVED',
                display_name: creatorData.displayName,
                bio: creatorData.bio,
                avatar: creatorData.avatar,
                banner: creatorData.banner,
                location: creatorData.location,
                website: creatorData.website,
                is_verified: creatorData.isVerified,
                follower_count: creatorData.followerCount,
                content_count: creatorData.contentCount,
                total_views: BigInt(creatorData.totalViews),
              },
            });
            console.log(`🔄 Updated creator: @${creatorData.handle} (set to APPROVED)`);
          } else {
            console.log(`ℹ️  Creator already exists and is APPROVED: @${creatorData.handle}`);
          }
        } else {
          // Create creator profile
          console.log(`🎨 Creating creator profile: @${creatorData.handle}`);
          
          const creator = await prisma.creator.create({
            data: {
              user_id: user.id,
              display_name: creatorData.displayName,
              handle: creatorData.handle,
              bio: creatorData.bio,
              avatar: creatorData.avatar,
              banner: creatorData.banner,
              location: creatorData.location,
              website: creatorData.website,
              is_verified: creatorData.isVerified,
              follower_count: creatorData.followerCount,
              content_count: creatorData.contentCount,
              total_views: BigInt(creatorData.totalViews),
              status: 'APPROVED', // Set to APPROVED so they show up (ACTIVE is not in enum, using APPROVED)
            },
          });

          // Create creator earnings record
          await prisma.creatorEarnings.upsert({
            where: { creator_id: creator.id },
            create: {
              creator_id: creator.id,
              balance: 0,
              lifetime_earnings: 0,
              pending_payout: 0,
            },
            update: {},
          });

          console.log(`✅ Created creator: ${creator.display_name} (@${creator.handle})`);
          console.log(`   Followers: ${creator.follower_count}, Content: ${creator.content_count}, Views: ${creator.total_views}\n`);
        }
      } catch (error: any) {
        console.error(`❌ Error creating creator ${creatorData.handle}:`, error.message);
        if (error.code === 'P2002') {
          console.error(`   ⚠️  Handle or email already exists, skipping...\n`);
        } else {
          console.error(`   Full error:`, error);
        }
      }
    }

    console.log('\n✨ Creator seeding completed!');
    
    // Show summary
    const approvedCreators = await prisma.creator.count({
      where: { status: 'APPROVED' },
    });
    console.log(`\n📊 Total APPROVED creators: ${approvedCreators}`);
    
  } catch (error: any) {
    console.error('❌ Fatal error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedCreators();
