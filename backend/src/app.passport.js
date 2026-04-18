const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { prisma } = require('./app.config');

// Ensure you have these variables in your .env file
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || process.env.GOOGLE_REDIRECT_URI || '/api/auth/google/callback';

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // 1. Check if user already exists with this Google ID
          let user = await prisma.user.findFirst({
            where: { oauthId: profile.id, provider: 'google' },
            include: {
              userRoles: {
                include: {
                  role: true
                }
              }
            }
          });

          if (!user) {
            // 2. If not found by OAuth ID, check if email already exists
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            
            if (email) {
              user = await prisma.user.findUnique({
                where: { email },
                include: {
                  userRoles: {
                    include: {
                      role: true
                    }
                  }
                }
              });
            }

            if (user) {
              // 3. Email exists: link Google ID to existing account
              user = await prisma.user.update({
                where: { id: user.id },
                data: { 
                  oauthId: profile.id, 
                  provider: 'google' 
                },
                include: {
                  userRoles: {
                    include: {
                      role: true
                    }
                  }
                }
              });
            } else {
              // 4. Do NOT create a new user if email doesn't exist
              // Instead, return an error (user must be pre-created by admin)
              return done(null, false, { message: 'Account not found. Please contact your administrator.' });
            }
          }
          
          return done(null, user);
        } catch (err) {
          console.error("Passport Google Strategy Error:", err);
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn("⚠️ Google OAuth credentials missing in .env file. Google login will not work.");
}

module.exports = passport;
