# FAIVOR Dashboard Deployment Guide

This guide covers three deployment scenarios for the FAIVOR Dashboard.

## Table of Contents

1. [Scenario 1: Local Development](#scenario-1-local-development)
2. [Scenario 2: Server Deployment (No Reverse Proxy)](#scenario-2-server-deployment-no-reverse-proxy)
3. [Scenario 3: Server with Reverse Proxy](#scenario-3-server-with-reverse-proxy)
4. [Common Operations](#common-operations)

---

## Scenario 1: Local Development

**Use case**: Development on your local machine (laptop/desktop)

### Quick Setup (Recommended)

**One command to download and start everything**:

**Linux/macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/MaastrichtU-BISS/FAIVOR-Dashboard/main/setup-local.sh | bash
```

**Windows (PowerShell as Administrator):**
```powershell
irm https://raw.githubusercontent.com/MaastrichtU-BISS/FAIVOR-Dashboard/main/setup-local.ps1 | iex
```

This script will:
- ✅ Check if Docker is installed and running
- ✅ Download docker-compose.local.yml
- ✅ Download and configure .env.local
- ✅ Generate a secure AUTH_SECRET
- ✅ Pull Docker images
- ✅ Start the application
- ✅ Open your browser automatically

### Manual Setup

1. **Copy environment file**:
   ```bash
   cp .env.local.example .env.local
   ```

2. **Optional: Customize settings** in `.env.local`:
   - Change database password if needed
   - Generate a proper AUTH_SECRET: `npx auth secret`

3. **Start services**:
   ```bash
   docker compose -f docker-compose.local.yml up
   ```

4. **Access the application**:
   - Open browser to http://localhost:3000

### Features

- ✅ Hot reload enabled (when using build with watch mode)
- ✅ Database exposed on port 5432 for local tools
- ✅ Simple configuration
- ✅ No SSL/HTTPS required

### Seeding Database

```bash
docker compose -f docker-compose.local.yml --profile seed up seed
```

---

## Scenario 2: Server Deployment (No Reverse Proxy)

**Use case**: Internal organization server accessed directly by IP or hostname

### Prerequisites

- Docker and Docker Compose installed
- Server has static IP or internal hostname
- Port 3000 accessible to users

### Setup

1. **Copy environment file**:
   ```bash
   cp .env.server.example .env.server
   ```

2. **Edit `.env.server`** and set:
   ```bash
   # REQUIRED: Change these values
   DB_PASSWORD="your_strong_database_password"
   AUTH_SECRET="generate_with_npx_auth_secret"
   
   # REQUIRED: Set to your server's URL
   PUBLIC_URL="http://192.168.1.100:3000"
   # OR if you have internal DNS:
   PUBLIC_URL="http://server.internal.company:3000"
   ```

3. **Pull images** (recommended for production):
   ```bash
   docker compose -f docker-compose.server.yml pull
   ```

4. **Start services**:
   ```bash
   docker compose -f docker-compose.server.yml up -d
   ```

5. **Check logs**:
   ```bash
   docker compose -f docker-compose.server.yml logs -f dashboard
   ```

### Access

Users access the application at: `http://YOUR_SERVER_IP:3000`

### Security Notes

- ⚠️ HTTP only (no encryption) - suitable for trusted internal networks
- ⚠️ Ensure firewall rules are configured appropriately
- ✅ Database only exposed to localhost
- ✅ Backend not exposed externally

### Updating

```bash
docker compose -f docker-compose.server.yml pull
docker compose -f docker-compose.server.yml up -d
```

---

## Scenario 3: Server with Reverse Proxy

**Use case**: Production deployment with domain name and HTTPS (Nginx Proxy Manager, Traefik, Caddy)

### Prerequisites

- Docker and Docker Compose installed
- Domain name configured (DNS pointing to server)
- Reverse proxy installed and configured (Nginx Proxy Manager, Traefik, etc.)

### Setup

1. **Copy environment file**:
   ```bash
   cp .env.proxy.example .env.proxy
   ```

2. **Edit `.env.proxy`** and set:
   ```bash
   # REQUIRED: Change these values
   DB_PASSWORD="your_strong_database_password"
   AUTH_SECRET="generate_with_npx_auth_secret"
   
   # REQUIRED: Set to your public domain
   PUBLIC_URL="https://faivor.yourdomain.com"
   DOMAIN="faivor.yourdomain.com"
   ```

3. **Start services**:
   ```bash
   docker compose -f docker-compose.proxy.yml up -d
   ```

4. **Configure reverse proxy**:

   #### For Nginx Proxy Manager:

   1. Add new Proxy Host:
      - **Domain Names**: `faivor.yourdomain.com`
      - **Scheme**: `http`
      - **Forward Hostname / IP**: `localhost` (or server IP)
      - **Forward Port**: `3000`
      - **Websockets Support**: ✅ Enabled

   2. SSL Tab:
      - Request new SSL Certificate
      - Force SSL: ✅ Enabled

   3. Advanced Tab - Add custom configuration:
      ```nginx
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_set_header X-Forwarded-Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      ```

   #### For Traefik:

   The `docker-compose.proxy.yml` includes Traefik labels. Ensure your Traefik configuration has:
   - Certificate resolver configured
   - Proper entrypoints (web, websecure)

   #### For Caddy:

   Add to your Caddyfile:
   ```caddy
   faivor.yourdomain.com {
       reverse_proxy localhost:3000
   }
   ```

### Access

Users access the application at: `https://faivor.yourdomain.com`

### Verification

After deployment, verify:

1. **Check logs for forwarded headers**:
   ```bash
   docker compose -f docker-compose.proxy.yml logs dashboard | grep "Forwarded"
   ```

   You should see:
   ```
   [Proxy] X-Forwarded-Proto: https, X-Forwarded-Host: faivor.yourdomain.com
   [Auth Redirect] X-Forwarded-Proto: https, X-Forwarded-Host: faivor.yourdomain.com
   ```

2. **Test login/logout** - should redirect to your public domain, not internal hostname

3. **Check browser console** - no CORS errors

### Security Features

- ✅ HTTPS encryption via reverse proxy
- ✅ Services only exposed to localhost
- ✅ Database only accessible internally
- ✅ Automatic redirect handling for authentication
- ✅ CORS properly configured

---

## Common Operations

### View Logs

```bash
# Local
docker compose -f docker-compose.local.yml logs -f

# Server
docker compose -f docker-compose.server.yml logs -f

# Proxy
docker compose -f docker-compose.proxy.yml logs -f
```

### Restart Services

```bash
# Stop
docker compose -f docker-compose.[local|server|proxy].yml down

# Start
docker compose -f docker-compose.[local|server|proxy].yml up -d
```

### Backup Database

```bash
# Get database credentials from your .env file
docker exec -t faivor-[local|server|proxy]-postgres-1 pg_dump -U faivor_user faivor > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database

```bash
cat backup_file.sql | docker exec -i faivor-[local|server|proxy]-postgres-1 psql -U faivor_user faivor
```

### Update Application

```bash
# Pull latest images
docker compose -f docker-compose.[server|proxy].yml pull

# Restart with new images
docker compose -f docker-compose.[server|proxy].yml up -d
```

### View Container Status

```bash
docker compose -f docker-compose.[local|server|proxy].yml ps
```

---

## Troubleshooting

### Issue: "Cannot connect to database"

**Solution**: Check if postgres container is running and healthy:
```bash
docker compose -f docker-compose.XXX.yml ps
docker compose -f docker-compose.XXX.yml logs postgres
```

### Issue: "Authentication redirects to wrong URL"

**Local/Server**: Check `PUBLIC_URL` and `AUTH_URL` in your `.env` file  
**Proxy**: Verify reverse proxy is forwarding headers correctly

### Issue: "CORS errors in browser"

Check that `ALLOWED_ORIGINS` matches your public URL exactly (including protocol)

### Issue: "Model validation fails"

Check that `faivor-backend` container has access to Docker socket:
```bash
docker compose -f docker-compose.XXX.yml logs faivor-backend
```

---

## Migration Between Scenarios

### From Local → Server

1. Export data: `docker exec faivor-local-postgres-1 pg_dump ...`
2. Copy `.env.server.example` → `.env.server` and configure
3. Deploy on server with `docker-compose.server.yml`
4. Import data

### From Server → Proxy

1. Stop server deployment
2. Copy `.env.proxy.example` → `.env.proxy`
3. Update `PUBLIC_URL` to use HTTPS domain
4. Deploy with `docker-compose.proxy.yml`
5. Configure reverse proxy
6. No data migration needed (same volume names)

---

## Summary Table

| Feature | Local | Server | Proxy |
|---------|-------|--------|-------|
| **HTTPS** | ❌ | ❌ | ✅ |
| **Public Access** | ❌ | ⚠️ Internal | ✅ |
| **Domain Name** | ❌ | Optional | Required |
| **Port Exposure** | 3000, 5432 | 3000 | localhost only |
| **Configuration** | Simple | Medium | Complex |
| **Best For** | Development | Internal tools | Production |
| **Security** | Low | Medium | High |

---

## Need Help?

- Check container logs first
- Verify environment variables are set correctly
- Ensure reverse proxy is forwarding headers (for proxy scenario)
- Review the comprehensive troubleshooting section above
