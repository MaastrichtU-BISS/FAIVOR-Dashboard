# FAIRmodels-validator Dashboard

FAIRmodels-validator Dashboard is a web application that allows users to validate their FAIRmodels.

Architecture
![techstack](./docs/techstack.excalidraw.png)

Database schema
![database](./docs/db-schema.drawio.png)

## Deployment

The FAIVOR Dashboard supports three deployment scenarios:

### 🖥️ **Quick Start - Local Development**

**One-command setup** (downloads files and starts the application):

**Linux/macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/MaastrichtU-BISS/FAIVOR-Dashboard/main/setup-local.sh | bash
```

**Windows (PowerShell as Administrator):**
```powershell
irm https://raw.githubusercontent.com/MaastrichtU-BISS/FAIVOR-Dashboard/main/setup-local.ps1 | iex
```

**Manual setup**:

```bash
cp .env.local.example .env.local
docker compose -f docker-compose.local.yml up
```

Visit [http://localhost:3000](http://localhost:3000)

### 🏢 **Server Deployment (No Reverse Proxy)**

For internal organization servers accessed directly by IP or hostname:

```bash
cp .env.server.example .env.server
# Edit .env.server with your server's IP/hostname
docker compose -f docker-compose.server.yml up -d
```

### 🌐 **Production with Reverse Proxy**

For production with domain name and HTTPS (Nginx Proxy Manager, Traefik, Caddy):

```bash
cp .env.proxy.example .env.proxy
# Edit .env.proxy with your domain
docker compose -f docker-compose.proxy.yml up -d
```

---

📚 **Complete deployment guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)  
🔧 **Reverse proxy troubleshooting**: [DEPLOYMENT_REVERSE_PROXY.md](./DEPLOYMENT_REVERSE_PROXY.md)

**Quick setup:**

1. Copy the production environment template:
   ```bash
   cp .env.production.example .env.production
   ```

2. Update critical settings in `.env.production`:
   ```env
   AUTH_URL="https://yourdomain.com"
   ORIGIN="https://yourdomain.com"
   ALLOWED_ORIGINS="https://yourdomain.com"
   ```

3. Ensure your reverse proxy forwards these headers:
   - `X-Forwarded-Proto`
   - `X-Forwarded-Host`

4. Deploy with production environment:
   ```bash
   docker compose --env-file .env.production up -d
   ```

## Features

- Validate FAIRmodels via a user-friendly dashboard
- Import models by URL
- Delete models from the list with immediate UI update (no page reload required)
- View model details and validation results
- Search for models by title or description
- Export model metadata to FAIR models repository
