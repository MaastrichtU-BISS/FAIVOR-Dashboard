import { SvelteKitAuth } from "@auth/sveltekit";
import Google from "@auth/sveltekit/providers/google";
import Credentials from "@auth/sveltekit/providers/credentials";
import PostgresAdapter from "@auth/pg-adapter";
import { pool } from "$lib/db";
import type { CustomSession } from "./app";
import bcrypt from 'bcryptjs';
import Resend from "@auth/sveltekit/providers/resend";
import { env } from "$env/dynamic/private";

export const { handle: handleAuth, signIn, signOut } = SvelteKitAuth(async (event) => {
  const authConfig: any = {
    trustHost: true,
    adapter: PostgresAdapter(pool),
    secret: env.AUTH_SECRET,
    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    cookies: {
      sessionToken: {
        name: `authjs.session-token`,
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: env.NODE_ENV === 'production'
        }
      },
      csrfToken: {
        name: `authjs.csrf-token`,
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: env.NODE_ENV === 'production'
        }
      }
    },
    providers: [
      Resend({
        from: "top-sveltekit@ctwhome.com",
        name: "Chat Diamond",
      }),
      Google,
      Credentials({
        name: 'Credentials',
        async authorize(credentials) {
          const { email, password } = credentials as { email: string; password: string };
          if (!email || !password) return null;

          const user = (await pool.query('SELECT * FROM users WHERE email = $1', [email])).rows[0];
          if (!user || !await bcrypt.compare(password, user.password)) return null;

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name || null,
            image: user.image || null
          };
        }
      })
    ],
    callbacks: {
      async jwt({ token, user, account }) {
        if (user) {
          // Get user data including role on initial sign in
          const userData = (await pool.query('SELECT id, role, name FROM users WHERE id = $1', [user.id])).rows[0];
          token.id = userData.id;
          token.role = userData.role || 'user';
          token.name = userData.name;
          // Store the provider in the token
          token.provider = account?.provider || 'credentials';
        }
        return token;
      },
      async session({ session, token }) {
        if (!session?.user || !token) return session;

        return {
          ...session,
          provider: token.provider as string,
          user: {
            ...session.user,
            id: token.id as string,
            name: token.name as string,
            roles: [token.role as string] // Use role from JWT token
          }
        } as CustomSession;
      },
      // Fix redirects to use correct URL from forwarded headers
      async redirect({ url, baseUrl }) {
        // Get the correct base URL from x-forwarded headers
        const proto = event.request.headers.get('x-forwarded-proto');
        const host = event.request.headers.get('x-forwarded-host');
        
        // Priority: 1) forwarded headers, 2) AUTH_URL env var, 3) baseUrl
        let correctBaseUrl = baseUrl;
        if (proto && host) {
          correctBaseUrl = `${proto}://${host}`;
        } else if (env.AUTH_URL) {
          correctBaseUrl = env.AUTH_URL;
        }
        
        console.log(`[Auth Redirect] Original URL: ${url}`);
        console.log(`[Auth Redirect] Base URL: ${baseUrl}`);
        console.log(`[Auth Redirect] X-Forwarded-Proto: ${proto}, X-Forwarded-Host: ${host}`);
        console.log(`[Auth Redirect] Correct Base URL: ${correctBaseUrl}`);
        
        // If URL is relative, prepend the correct base URL
        if (url.startsWith('/')) {
          const finalUrl = `${correctBaseUrl}${url}`;
          console.log(`[Auth Redirect] Relative URL detected, redirecting to: ${finalUrl}`);
          return finalUrl;
        }
        
        // If URL contains an internal hostname (Docker service name or localhost), replace it
        // This handles cases like: http://faivor-dashboard:3000, http://localhost:3000, http://any-service:3000
        try {
          const urlObj = new URL(url);
          const hostname = urlObj.hostname;
          const port = urlObj.port;
          
          // Check if the URL is pointing to an internal address
          const isInternal = 
            hostname === 'localhost' || 
            hostname === '127.0.0.1' ||
            hostname.indexOf('.internal') !== -1 ||
            hostname.indexOf('.') === -1 || // No dots = not a real domain (likely Docker service name)
            port === '3000'; // Port 3000 is our internal container port
          
          if (isInternal && urlObj.origin !== correctBaseUrl) {
            const correctUrl = new URL(urlObj.pathname + urlObj.search, correctBaseUrl);
            console.log(`[Auth Redirect] Internal hostname detected (${hostname}:${port}), redirecting to: ${correctUrl.toString()}`);
            return correctUrl.toString();
          }
        } catch (e) {
          // If URL parsing fails, continue to next checks
          console.error(`[Auth Redirect] Failed to parse URL: ${url}`, e);
        }
        
        // If URL is the same origin, return as-is
        if (url.startsWith(correctBaseUrl)) {
          console.log(`[Auth Redirect] Same origin, keeping URL: ${url}`);
          return url;
        }
        
        // Default: return the correct base URL
        console.log(`[Auth Redirect] Default case, redirecting to base: ${correctBaseUrl}`);
        return correctBaseUrl;
      }
    }
  };
  
  return authConfig;
});
