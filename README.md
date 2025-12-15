![](https://github.com/NLeSC/.github/blob/main/profile/escience.png)

# FAIVOR @ eScience Center

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Research Software Directory](https://img.shields.io/badge/rsd-faivor-00a3e3.svg)](https://research-software-directory.org/projects/faivor)

## FAIRmodels-validator Dashboard

FAIRmodels-validator Dashboard is a web application that allows users to validate their FAIRmodels.

Architecture
![techstack](./docs/techstack.excalidraw.png)

Database schema
![database](./docs/db-schema.drawio.png)

## Running with Docker

### Development (default)

```bash
docker compose up
```

Visit [http://localhost:5173](http://localhost:5173). Changes to the code in `dashboard/` will automatically hot reload.

This setup:
- Mounts your local `dashboard/` code into the container
- Runs `bun dev` with hot module replacement
- Runs database migrations automatically
- Uses pre-built backend image
- No need to install anything locally

### Backend Development (optional)

To also develop the ML-Validator backend with hot reload, first clone the backend repo:

```bash
git clone https://github.com/MaastrichtU-BISS/FAIVOR-ML-Validator.git
docker compose --profile backend-dev up --scale faivor-backend=0
```

This mounts `FAIVOR-ML-Validator/src/` and enables Python hot reload.

### Production

For production deployment, use the pre-built images:

```bash
docker compose -f docker-compose.prod.yml up
```

Visit [http://localhost:3000](http://localhost:3000). This uses pre-built images from the GitHub Container Registry (built by CI/CD).

### Production Considerations

- The application requires HTTPS in production for authentication to work properly.
- For **development**, no `.env` file is needed - sensible defaults are used automatically.
- For **production**, copy `.env.example` to `.env` and set a secure `AUTH_SECRET`. Generate one with `npx auth secret`.

### Reverse Proxy Configuration

When deploying behind a reverse proxy (e.g., Nginx, Traefik, Caddy), the following security measures should be configured at the proxy level:

1. **Origin Header Validation**: The application has `checkOrigin: false` to support reverse proxy setups. Your proxy should validate the `Origin` header to prevent CSRF attacks.

2. **Required Headers**: Ensure your proxy forwards these headers:
   - `X-Forwarded-For`
   - `X-Forwarded-Proto`
   - `X-Forwarded-Host`
   - `Origin`

3. **Environment Variables**: Set `PUBLIC_DASHBOARD_ORIGIN` to your public URL(s) for CORS:
   ```
   PUBLIC_DASHBOARD_ORIGIN=https://your-domain.com
   ```

4. **Example Nginx configuration**:
   ```nginx
   location / {
       proxy_pass http://dashboard:3000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_set_header X-Forwarded-Host $host;
   }
   ```

## CI/CD & Docker Images

Docker images are automatically built and pushed to GitHub Container Registry on every push.

### Dashboard
- **Workflow**: `.github/workflows/dashboard-docker-build.yml`
- **Trigger**: Push to any branch
- **Image**: `ghcr.io/maastrichtu-biss/faivor-dashboard:{branch}`
- **Dockerfile**: `dashboard/Dockerfile`

### ML-Validator Backend
- **Workflow**: `FAIVOR-ML-Validator/.github/workflows/publish-docker.yml`
- **Trigger**: Push/PR to main
- **Image**: `ghcr.io/maastrichtu-biss/faivor-ml-validator:latest`
- **Dockerfile**: `FAIVOR-ML-Validator/Dockerfile`

### Flow
```
Push to main → GitHub Actions → Build image → Push to ghcr.io → Production pulls image
```

## Features

- Validate FAIRmodels via a user-friendly dashboard
- Import models by URL
- Delete models from the list with immediate UI update (no page reload required)
- View model details and validation results
- Search for models by title or description
- Export model metadata to FAIR models repository
