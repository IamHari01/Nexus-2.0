import { NextAuthOptions, DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { env } from './env';
import { logger } from './logger';

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"]
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Email or Mobile', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          throw new Error('Please enter both identifier and password');
        }

        try {
          await dbConnect();
          const user = await User.findOne({
            $or: [
              { email: credentials.identifier },
              { mobile: credentials.identifier },
            ],
          });

          if (user) {
            const isValid = await bcrypt.compare(credentials.password, user.password);
            if (!isValid) {
              throw new Error('Invalid password');
            }
            return {
              id: user._id.toString(),
              email: user.email,
              name: user.mobile || user.email,
            };
          }
          throw new Error('No user found');
        } catch (e) {
          logger.error('Authentication error', e);
          throw new Error('Invalid credentials');
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: env.NEXTAUTH_SECRET,
};
