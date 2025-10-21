# Quick Start: Reverse Proxy Deployment

This guide will help you quickly configure CORS for a reverse proxy deployment.

## Step 1: Update Environment Configuration

### For Production Deployment

Edit your `.env` or `.env-test` file:

```bash
# Replace with your actual backend URL (as seen from the dashboard container)
PUBLIC_FAIVOR_BACKEND_URL="http://faivor-backend:8000"

# Replace with your actual frontend domain(s)
ALLOWED_ORIGINS="https://yourdomain.com,https://app.yourdomain.com"
```

### Common Scenarios

#### Scenario A: Single Domain with Different Subpaths
- Frontend: `https://yourdomain.com/`
- Backend: `https://yourdomain.com/api/`

```env
PUBLIC_FAIVOR_BACKEND_URL="https://yourdomain.com/api"
ALLOWED_ORIGINS="https://yourdomain.com"
```

#### Scenario B: Separate Subdomains
- Frontend: `https://app.yourdomain.com`
- Backend: `https://api.yourdomain.com`

```env
PUBLIC_FAIVOR_BACKEND_URL="https://api.yourdomain.com"
ALLOWED_ORIGINS="https://app.yourdomain.com"
```

#### Scenario C: Docker Compose with Traefik/Nginx
- Frontend: `https://faivor.yourdomain.com`
- Backend: Container-to-container communication

```env
PUBLIC_FAIVOR_BACKEND_URL="http://faivor-backend:8000"
ALLOWED_ORIGINS="https://faivor.yourdomain.com"
```

## Step 2: Update Docker Compose (if needed)

Make sure your `docker-compose.yml` loads the environment file:

```yaml
services:
  dashboard:
    image: ghcr.io/maastrichtu-biss/faivor-dashboard:latest
    env_file:
      - .env-test  # or .env
    ports:
      - "3000:3000"
    # ... rest of config
```

## Step 3: Rebuild and Restart

```bash
# If you're using the Dockerfile
docker-compose build dashboard

# Restart all services
docker-compose down
docker-compose up -d

# Check logs for any issues
docker-compose logs -f dashboard
```

## Step 4: Verify Configuration

```bash
# Test that environment variables are loaded
docker-compose exec dashboard env | grep PUBLIC_FAIVOR_BACKEND_URL
docker-compose exec dashboard env | grep ALLOWED_ORIGINS

# Test backend connectivity from dashboard container
docker-compose exec dashboard curl http://faivor-backend:8000/

# Check dashboard is responding
curl -I http://localhost:3000/
```

## Step 5: Test CORS

From your browser's DevTools console (on your domain):

```javascript
// Test a simple API request
fetch('/api/models/list', {
  method: 'GET',
  credentials: 'include'
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

If you see CORS errors, check:

1. ✅ Is your domain in `ALLOWED_ORIGINS`?
2. ✅ Is the protocol correct (http vs https)?
3. ✅ Did you restart the container after changing `.env`?
4. ✅ Is your reverse proxy passing the correct `Origin` header?

## Troubleshooting Quick Fixes

### Issue: "No 'Access-Control-Allow-Origin' header is present"

**Solution:**
```bash
# 1. Check environment variable is set
docker-compose exec dashboard printenv ALLOWED_ORIGINS

# 2. If empty, update .env and restart
nano .env-test  # or .env
docker-compose restart dashboard

# 3. Verify the correct origin
# Should match exactly what's in your browser address bar
```

### Issue: Backend request fails with 404 or connection refused

**Solution:**
```bash
# 1. Test backend from dashboard container
docker-compose exec dashboard curl -v http://faivor-backend:8000/

# 2. If it fails, check service is running
docker-compose ps

# 3. Check Docker network
docker network ls
docker network inspect faivor_default

# 4. Verify service name matches in docker-compose.yml
```

### Issue: Environment variables not loading

**Solution:**
```bash
# Option 1: Pass environment directly in docker-compose.yml
services:
  dashboard:
    environment:
      - PUBLIC_FAIVOR_BACKEND_URL=http://faivor-backend:8000
      - ALLOWED_ORIGINS=https://yourdomain.com

# Option 2: Rebuild the image if Dockerfile copies .env
docker-compose build --no-cache dashboard
docker-compose up -d dashboard
```

## Production Checklist

Before deploying to production:

- [ ] Set `PUBLIC_FAIVOR_BACKEND_URL` to correct backend URL
- [ ] Set `ALLOWED_ORIGINS` to your actual domain(s) (no wildcards!)
- [ ] Use HTTPS for production domains
- [ ] Set a secure `AUTH_SECRET` (use `npx auth secret`)
- [ ] Configure proper SSL/TLS certificates in reverse proxy
- [ ] Test CORS from production domain
- [ ] Verify backend connectivity
- [ ] Check logs for any CORS errors: `docker-compose logs dashboard | grep -i cors`

## Example Complete Configuration

Here's a complete example for a production deployment:

### `.env-test` or `.env`
```env
# Database
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=secure_password_here
DB_NAME=faivor

# Auth
AUTH_SECRET=your_secret_from_npx_auth_secret

# Application
PUBLIC_ORGANIZATION_NAME="FAIVOR"
NODE_ENV="production"

# Backend API - internal Docker network communication
PUBLIC_FAIVOR_BACKEND_URL="http://faivor-backend:8000"

# CORS - your actual production domain
ALLOWED_ORIGINS="https://faivor.yourdomain.com"
```

### Nginx Reverse Proxy Config
```nginx
server {
    listen 443 ssl http2;
    server_name faivor.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Need More Help?

See the full documentation: [CORS-CONFIGURATION.md](./CORS-CONFIGURATION.md)
