# Debugging 403 Forbidden on /auth/callback/credentials

## Your Current Error

```
POST https://faivor.fairmodels.org/auth/callback/credentials? 403 (Forbidden)
Sign in error: SyntaxError: Unexpected token 'C', "Cross-site"... is not valid JSON
```

This means:
1. ✅ CORS preflight is working (request reaches server)
2. ❌ The POST request is being rejected with 403
3. ❌ The error response doesn't have proper CORS headers

## Root Cause Analysis

The 403 is likely coming from **your reverse proxy** (Nginx/Traefik/Apache), NOT from the SvelteKit application. Here's why:

### If Nginx

Nginx might be blocking the request due to:
- Missing headers being forwarded
- CORS configuration in Nginx conflicting with app
- POST request size limits
- Missing proxy headers

### If Traefik

Traefik might be:
- Not forwarding the `X-Forwarded-*` headers properly
- Has middleware that's blocking the request
- CORS middleware misconfigured

## Solution: Fix Your Reverse Proxy Configuration

### For Nginx

Your Nginx configuration needs these critical headers:

```nginx
server {
    listen 443 ssl http2;
    server_name faivor.fairmodels.org;

    # SSL configuration
    ssl_certificate /path/to/your/fullchain.pem;
    ssl_certificate_key /path/to/your/privkey.pem;

    location / {
        # Proxy to your Docker container
        proxy_pass http://localhost:3000;
        
        # Essential headers for SvelteKit + Auth.js
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # HTTP/1.1 support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Allow large POST bodies (for file uploads)
        client_max_body_size 100M;
        
        # DON'T add CORS headers here - let the app handle it
        # Remove any add_header 'Access-Control-*' directives
    }
}
```

**Critical:** Make sure you're NOT adding CORS headers in Nginx if the application is handling them!

### For Traefik (Docker Labels)

```yaml
services:
  dashboard:
    image: ghcr.io/maastrichtu-biss/faivor-dashboard:latest
    env_file:
      - .env-test
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`faivor.fairmodels.org`)"
      - "traefik.http.routers.dashboard.entrypoints=websecure"
      - "traefik.http.routers.dashboard.tls.certresolver=letsencrypt"
      
      # Essential middleware for headers
      - "traefik.http.middlewares.dashboard-headers.headers.customrequestheaders.X-Forwarded-Proto=https"
      - "traefik.http.middlewares.dashboard-headers.headers.customrequestheaders.X-Forwarded-Host=faivor.fairmodels.org"
      - "traefik.http.routers.dashboard.middlewares=dashboard-headers"
      
      # DO NOT add CORS middleware here - let the app handle it
```

## Immediate Debugging Steps

### Step 1: Check if it's the Reverse Proxy

Try accessing the app directly without the reverse proxy:

```bash
# If dashboard is on port 3000
curl -I http://localhost:3000/

# If working, try login directly
curl -X POST http://localhost:3000/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

If this works but the domain doesn't, **the issue is in your reverse proxy**.

### Step 2: Check Reverse Proxy Logs

```bash
# For Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# For Traefik
docker-compose logs -f traefik
```

Look for:
- 403 errors
- "CORS" related messages
- "upstream" errors
- "too large" errors

### Step 3: Test with curl

```bash
# Test OPTIONS (preflight)
curl -X OPTIONS https://faivor.fairmodels.org/auth/callback/credentials \
  -H "Origin: https://faivor.fairmodels.org" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v

# Should return 200 with CORS headers

# Test POST
curl -X POST https://faivor.fairmodels.org/auth/callback/credentials \
  -H "Origin: https://faivor.fairmodels.org" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' \
  -v

# Look for the 403 response
```

### Step 4: Check Browser Console Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Try to log in
4. Click on the `/auth/callback/credentials` request
5. Check **Response Headers** - look for:
   ```
   Server: nginx/1.x.x  (or cloudflare, etc.)
   ```
   
If you see your reverse proxy's server header, the 403 is coming from there!

## Common Reverse Proxy Issues

### Issue 1: Nginx has `add_header` for CORS

**Problem:** Nginx CORS conflicts with app CORS

**Solution:** Remove ALL `add_header 'Access-Control-*'` from your Nginx config

```nginx
# REMOVE these if present:
# add_header 'Access-Control-Allow-Origin' '*';
# add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
# add_header 'Access-Control-Allow-Headers' 'Content-Type';
```

### Issue 2: Missing X-Forwarded headers

**Problem:** App doesn't know it's behind HTTPS

**Solution:** Add to Nginx:
```nginx
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Port $server_port;
```

### Issue 3: Nginx blocking OPTIONS requests

**Problem:** Nginx intercepts OPTIONS before app sees it

**Solution:** Make sure there's NO `if ($request_method = 'OPTIONS')` block in Nginx that returns a response. Let the app handle it.

### Issue 4: Request body too large

**Problem:** Nginx rejecting POST with large body

**Solution:** Add to Nginx:
```nginx
client_max_body_size 100M;
```

### Issue 5: Traefik stripprefix middleware

**Problem:** Path being modified before reaching app

**Solution:** Don't use stripprefix for the dashboard route

## Updated Configuration Files

I've updated these files to fix the CORS + Auth issues:

1. **`dashboard/src/hooks.server.ts`**
   - Improved CORS handler to include `Cookie` header
   - Added `Vary: Origin` header
   - CORS headers now applied to ALL responses including errors

2. **`dashboard/src/auth.ts`**
   - Fixed cookie configuration for reverse proxy
   - Changed cookie name to work without HTTPS internally
   - Added explicit CSRF token configuration
   - Using `env` instead of `process.env`

3. **`.env-test`**
   - Set `NODE_ENV=production` for proper cookie handling
   - Added `AUTH_TRUST_HOST=true`

## Apply the Fixes

```bash
# 1. Update your reverse proxy config (see above)

# 2. Restart reverse proxy
sudo systemctl restart nginx
# or
docker-compose restart traefik

# 3. Rebuild and restart dashboard
docker-compose down
docker-compose build dashboard
docker-compose up -d

# 4. Check logs
docker-compose logs -f dashboard

# 5. Clear browser cache or use incognito mode

# 6. Try logging in again
```

## Still Not Working?

If you're still getting 403 after fixing the reverse proxy, check:

1. **Firewall blocking?**
   ```bash
   sudo ufw status
   sudo iptables -L
   ```

2. **ModSecurity (if using Apache)?**
   ```bash
   # Check if ModSecurity is blocking
   sudo tail -f /var/log/apache2/modsec_audit.log
   ```

3. **Cloudflare or CDN?**
   - Check Cloudflare firewall rules
   - Check "Under Attack" mode isn't enabled
   - Check CORS settings in Cloudflare

4. **Container networking issue?**
   ```bash
   # Test from host to container
   curl -I http://localhost:3000/auth/signin
   ```

## Share This Information

If you need more help, please provide:

1. Your reverse proxy software (Nginx/Traefik/Apache)
2. Your reverse proxy configuration file
3. Output of: `docker-compose logs dashboard | tail -50`
4. Output of: `curl -v https://faivor.fairmodels.org/auth/signin`
5. Browser Network tab screenshot of the 403 request showing all headers
