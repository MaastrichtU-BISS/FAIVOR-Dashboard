# FAIVOR Dashboard - Quick Deployment Reference

## Choose Your Scenario

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  👨‍💻 Local Development                                           │
│  ├─ Use: docker-compose.local.yml                              │
│  ├─ Env: .env.local                                            │
│  ├─ URL: http://localhost:3000                                 │
│  └─ Quick Setup (One Command):                                │
│     Linux/macOS:                                              │
│       curl -fsSL https://raw.githubusercontent.com/            │
│         MaastrichtU-BISS/FAIVOR-Dashboard/main/               │
│         setup-local.sh | bash                                  │
│     Windows PowerShell (Admin):                               │
│       irm https://raw.githubusercontent.com/                  │
│         MaastrichtU-BISS/FAIVOR-Dashboard/main/               │
│         setup-local.ps1 | iex                                  │
│                                                                 │
│  └─ Manual Setup:                                              │
│     cp .env.local.example .env.local                           │
│     docker compose -f docker-compose.local.yml up              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🏢 Internal Server (No Proxy)                                 │
│  ├─ Use: docker-compose.server.yml                            │
│  ├─ Env: .env.server                                          │
│  ├─ URL: http://SERVER_IP:3000                                │
│  └─ Commands:                                                  │
│     cp .env.server.example .env.server                        │
│     # Edit .env.server: Set PUBLIC_URL, passwords            │
│     docker compose -f docker-compose.server.yml up -d          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🌐 Production (With Reverse Proxy)                            │
│  ├─ Use: docker-compose.proxy.yml                             │
│  ├─ Env: .env.proxy                                           │
│  ├─ URL: https://yourdomain.com                               │
│  └─ Commands:                                                  │
│     cp .env.proxy.example .env.proxy                          │
│     # Edit .env.proxy: Set PUBLIC_URL, DOMAIN, passwords     │
│     docker compose -f docker-compose.proxy.yml up -d           │
│     # Configure reverse proxy with X-Forwarded headers        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Critical Environment Variables

### All Scenarios
```bash
DB_PASSWORD="<secure-password>"
AUTH_SECRET="<generate-with-npx-auth-secret>"
```

### Server & Proxy
```bash
PUBLIC_URL="<your-url-with-protocol>"
AUTH_URL="<same-as-public-url>"
```

### Proxy Only
```bash
PROTOCOL_HEADER="x-forwarded-proto"
HOST_HEADER="x-forwarded-host"
```

## Common Commands

### Start
```bash
docker compose -f docker-compose.[local|server|proxy].yml up -d
```

### Stop
```bash
docker compose -f docker-compose.[local|server|proxy].yml down
```

### View Logs
```bash
docker compose -f docker-compose.[local|server|proxy].yml logs -f
```

### Update
```bash
docker compose -f docker-compose.[local|server|proxy].yml pull
docker compose -f docker-compose.[local|server|proxy].yml up -d
```

## Reverse Proxy Configuration

### Nginx Proxy Manager
Advanced tab - Custom configuration:
```nginx
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

### Traefik
Labels included in docker-compose.proxy.yml

### Caddy
```caddy
yourdomain.com {
    reverse_proxy localhost:3000
}
```

## Troubleshooting Quick Checks

```bash
# Check if containers are running
docker compose -f docker-compose.XXX.yml ps

# Check for errors
docker compose -f docker-compose.XXX.yml logs dashboard | tail -50

# Verify environment variables
docker compose -f docker-compose.XXX.yml exec dashboard env | grep -E "(AUTH_URL|PUBLIC_URL|ORIGIN)"

# Check proxy headers (proxy scenario only)
docker compose -f docker-compose.proxy.yml logs dashboard | grep "Forwarded"
```

## Need More Help?

📚 Full guide: [DEPLOYMENT.md](./DEPLOYMENT.md)
🔧 Proxy issues: [DEPLOYMENT_REVERSE_PROXY.md](./DEPLOYMENT_REVERSE_PROXY.md)
