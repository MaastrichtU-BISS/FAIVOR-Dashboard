# Auth.js Redirect URL Fix

## Problem
After fixing the CSRF 403 error, login attempts were redirecting to the internal Docker service name instead of the public domain:
```
http://faivor-dashboard:3000/auth/signin?error=CredentialsSignin&code=credentials
```

## Root Cause
Auth.js was using the internal Docker service hostname (`faivor-dashboard`) to construct callback URLs instead of the public domain (`faivor.fairmodels.org`).

## Solution
Set the `AUTH_URL` environment variable to explicitly tell Auth.js what the public URL is.

### Changes Made

#### 1. docker-compose.yml
```yaml
dashboard:
  environment:
    - ORIGIN=https://faivor.fairmodels.org
    - PROTOCOL_HEADER=x-forwarded-proto
    - HOST_HEADER=x-forwarded-host
    - AUTH_URL=https://faivor.fairmodels.org  # Added
```

#### 2. .env-test
```bash
AUTH_URL="https://faivor.fairmodels.org"
```

#### 3. dashboard/src/auth.ts
Simplified the Auth.js configuration to rely on environment variables instead of trying to dynamically detect the URL:

```typescript
export const { handle: handleAuth, signIn, signOut } = SvelteKitAuth(async (event) => {
  return {
    trustHost: true,  // Trust forwarded headers
    adapter: PostgresAdapter(pool),
    secret: env.AUTH_SECRET,
    // Auth.js will automatically use AUTH_URL env var
    ...
  };
});
```

## Deployment Steps

After pushing the changes:

1. **Wait for CI/CD to rebuild the image**, or manually build:
   ```bash
   docker build -t ghcr.io/maastrichtu-biss/faivor-dashboard:build_image_dashboard ./dashboard
   docker push ghcr.io/maastrichtu-biss/faivor-dashboard:build_image_dashboard
   ```

2. **Pull and restart on remote server**:
   ```bash
   cd /fair4ai/faivor
   docker-compose pull dashboard
   docker-compose down
   docker-compose up -d
   ```

3. **Verify environment variables**:
   ```bash
   docker-compose exec faivor-dashboard printenv | grep -E "AUTH_URL|ORIGIN"
   # Should show:
   # AUTH_URL=https://faivor.fairmodels.org
   # ORIGIN=https://faivor.fairmodels.org
   ```

4. **Test login**:
   - Go to https://faivor.fairmodels.org/auth/signin
   - Enter credentials
   - Should redirect to https://faivor.fairmodels.org (not http://faivor-dashboard:3000)

## How Auth.js Uses AUTH_URL

Auth.js checks for the `AUTH_URL` environment variable in this order:
1. `AUTH_URL` - explicitly set public URL
2. `NEXTAUTH_URL` - legacy Next.js variable (also works)
3. Auto-detection from request headers (unreliable behind proxy)

By setting `AUTH_URL`, we ensure Auth.js always uses the correct public domain for:
- OAuth callback URLs
- Sign-in redirects
- Sign-out redirects
- CSRF token validation

## References

- [Auth.js Environment Variables](https://authjs.dev/reference/core#environment-variables)
- [Auth.js Deployment](https://authjs.dev/getting-started/deployment)
- Previous fix: [CSRF Configuration](./CSRF-FINAL-FIX.md)
