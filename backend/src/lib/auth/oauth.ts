import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { env } from '../../config/env';
import { prisma } from '../prisma';
import { hashPassword } from './password';
import { generateTokenPair } from './jwt';
import { UserRole } from '../../config/constants';

// Google OAuth Strategy
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${env.API_URL}/api/auth/oauth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
          }

          // Find or create user
          let user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            // Create new user
            const username = profile.displayName?.toLowerCase().replace(/\s+/g, '_') || `user_${Date.now()}`;
            
            // Ensure unique username
            let uniqueUsername = username;
            let counter = 1;
            while (await prisma.user.findUnique({ where: { username: uniqueUsername } })) {
              uniqueUsername = `${username}_${counter}`;
              counter++;
            }

            user = await prisma.user.create({
              data: {
                email,
                username: uniqueUsername,
                password: await hashPassword(Math.random().toString(36) + Date.now()), // Random password
                displayName: profile.displayName || profile.name?.givenName || 'User',
                avatar: profile.photos?.[0]?.value,
                emailVerified: true, // OAuth emails are pre-verified
                role: UserRole.USER,
              },
            });
          } else if (user.deletedAt) {
            return done(new Error('Account has been deleted'), undefined);
          }

          return done(null, user);
        } catch (error) {
          return done(error, undefined);
        }
      }
    )
  );
}

// Twitter OAuth Strategy
if (env.TWITTER_CLIENT_ID && env.TWITTER_CLIENT_SECRET) {
  passport.use(
    new TwitterStrategy(
      {
        consumerKey: env.TWITTER_CLIENT_ID,
        consumerSecret: env.TWITTER_CLIENT_SECRET,
        callbackURL: `${env.API_URL}/api/auth/oauth/twitter/callback`,
        includeEmail: true,
      },
      async (token, tokenSecret, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email found in Twitter profile'), undefined);
          }

          // Find or create user
          let user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            // Create new user
            const username = profile.username || `user_${Date.now()}`;
            
            // Ensure unique username
            let uniqueUsername = username;
            let counter = 1;
            while (await prisma.user.findUnique({ where: { username: uniqueUsername } })) {
              uniqueUsername = `${username}_${counter}`;
              counter++;
            }

            user = await prisma.user.create({
              data: {
                email,
                username: uniqueUsername,
                password: await hashPassword(Math.random().toString(36) + Date.now()), // Random password
                displayName: profile.displayName || profile.username || 'User',
                avatar: profile.photos?.[0]?.value,
                emailVerified: true, // OAuth emails are pre-verified
                role: UserRole.USER,
              },
            });
          } else if (user.deletedAt) {
            return done(new Error('Account has been deleted'), undefined);
          }

          return done(null, user);
        } catch (error) {
          return done(error, undefined);
        }
      }
    )
  );
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;

