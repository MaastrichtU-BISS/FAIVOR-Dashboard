# Fixing Login CORS Errors

## The Problem

You're seeing this error when trying to log in:
```
Sign in error: SyntaxError: Unexpected token 'C', "Cross-site"... is not valid JSON
```

This happens because:
1. Your application is running behind a reverse proxy on a remote server
2. The browser is sending requests from your domain (e.g., `https://yourdomain.com`)
3. But `ALLOWED_ORIGINS` only includes `localhost` addresses
4. The CORS middleware is blocking the authentication requests

## The Solution

You need to add your actual domain(s) to the `ALLOWED_ORIGINS` environment variable.

### Step 1: Identify Your Domain

First, determine what domain you're accessing the application from. For example:
- `https://faivor.yourdomain.com`
- `https://app.yourdomain.com`
- `http://your-server-ip:3000`

### Step 2: Update .env-test (or .env)

Edit your `.env-test` file and update the `ALLOWED_ORIGINS` line:

**Example for a single domain:**
```env
ALLOWED_ORIGINS="https://faivor.yourdomain.com"
```

**Example for multiple domains (comma-separated):**
```env
ALLOWED_ORIGINS="https://faivor.yourdomain.com,https://app.yourdomain.com,http://localhost:3000"
```

**Example for HTTP (non-SSL) deployment:**
```env
ALLOWED_ORIGINS="http://your-server-ip:3000,http://localhost:3000"
```

**Important:**
- Include the full protocol (`https://` or `http://`)
- Do NOT include trailing slashes
- Use commas to separate multiple origins (no spaces after commas)
- For production, always use HTTPS domains

### Step 3: Restart Your Application

```bash
# Stop containers
docker-compose down

# Rebuild dashboard (to pick up environment changes)
docker-compose build dashboard

# Start everything
docker-compose up -d

# Check logs
docker-compose logs -f dashboard
```

### Step 4: Verify Configuration

```bash
# Check that environment variable is set correctly
docker-compose exec dashboard printenv ALLOWED_ORIGINS

# Should output something like:
# https://faivor.yourdomain.com
```

### Step 5: Test Login

1. Open your browser to your domain (e.g., `https://faivor.yourdomain.com`)
2. Open Developer Tools (F12)
3. Go to the Network tab
4. Try to log in
5. Check the `/auth/signin` request:
   - Look for `Access-Control-Allow-Origin` header in the response
   - It should match your domain

## Common Issues

### Issue 1: Still getting CORS errors after updating

**Cause:** Browser cached the old CORS policy

**Solution:**
```bash
# Hard refresh your browser
# Chrome/Firefox: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

# Or clear browser cache completely
# Or try in an incognito/private window
```

### Issue 2: Working on localhost but not on domain

**Cause:** Missing domain in ALLOWED_ORIGINS

**Solution:**
```env
# Add both localhost AND your domain
ALLOWED_ORIGINS="http://localhost:3000,https://yourdomain.com"
```

### Issue 3: "Mixed Content" errors (HTTP/HTTPS)

**Cause:** Trying to mix HTTP and HTTPS

**Solution:**
```env
# Use matching protocols
# For production with SSL:
ALLOWED_ORIGINS="https://yourdomain.com"

# For development without SSL:
ALLOWED_ORIGINS="http://localhost:3000,http://your-server-ip:3000"
```

### Issue 4: Multiple subdomains not working

**Cause:** Need to list each subdomain explicitly

**Solution:**
```env
# List all subdomains
ALLOWED_ORIGINS="https://app.yourdomain.com,https://api.yourdomain.com,https://admin.yourdomain.com"
```

## Complete Configuration Example

Here's a complete `.env-test` for a production deployment:

```env
# *************************
#* Database               *
# *************************
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_NAME=faivor

# Auth
AUTH_SECRET="your_secret_from_npx_auth_secret"

# Application Settings
PUBLIC_ORGANIZATION_NAME="FAIVOR"
NODE_ENV="production"

# Backend API Configuration
# Use service name for Docker internal communication
PUBLIC_FAIVOR_BACKEND_URL="http://faivor-backend:8000"

# CORS Configuration
# YOUR ACTUAL DOMAIN HERE (with https://)
ALLOWED_ORIGINS="https://faivor.yourdomain.com"
```

## Debugging Tips

### Check CORS Headers in Browser

1. Open DevTools (F12)
2. Go to Network tab
3. Try to log in
4. Click on the `/auth/signin` request
5. Check the Response Headers:
   - Should see: `Access-Control-Allow-Origin: https://yourdomain.com`
   - Should see: `Access-Control-Allow-Credentials: true`

### Check What Origin Browser is Sending

1. In Network tab, click on the request
2. Look at Request Headers:
   - `Origin: https://yourdomain.com`
3. Make sure this EXACT value is in your `ALLOWED_ORIGINS`

### Enable Detailed Logging

Add this to your `.env-test`:
```env
DEBUG=true
```

Then check logs:
```bash
docker-compose logs dashboard | grep -i cors
docker-compose logs dashboard | grep -i auth
```

## Quick Fix Checklist

- [ ] My domain is added to `ALLOWED_ORIGINS`
- [ ] I included the protocol (`https://` or `http://`)
- [ ] No trailing slashes in the URL
- [ ] I restarted Docker containers after changing `.env-test`
- [ ] I verified the environment variable loaded: `docker-compose exec dashboard printenv ALLOWED_ORIGINS`
- [ ] I cleared my browser cache / tried incognito mode
- [ ] The origin in browser matches exactly what's in `ALLOWED_ORIGINS`

## Still Having Issues?

If you're still experiencing problems:

1. **Check the actual error in console:**
   ```javascript
   // Open browser console and run:
   console.log(window.location.origin)
   // Copy this exact value to ALLOWED_ORIGINS
   ```

2. **Verify backend connectivity:**
   ```bash
   docker-compose exec dashboard curl http://faivor-backend:8000/
   ```

3. **Check Auth.js routes are accessible:**
   ```bash
   curl -I https://yourdomain.com/auth/signin
   # Should return 200 or 302, not 404
   ```

4. **Review all logs:**
   ```bash
   docker-compose logs dashboard --tail=100
   ```

## What Changed in This Fix

1. **Added `/auth` routes** to allowed paths in `hooks.server.ts`
2. **Improved Auth.js configuration** with proper cookie settings
3. **Better CORS handling** for authentication flows
4. **Fixed middleware order** to ensure CORS runs before auth

These changes ensure that Auth.js authentication flows work properly behind a reverse proxy.
