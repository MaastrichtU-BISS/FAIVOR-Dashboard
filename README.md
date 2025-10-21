# FAIRmodels-validator Dashboard

FAIRmodels-validator Dashboard is a web application that allows users to validate their FAIRmodels.

Architecture
![techstack](./docs/techstack.excalidraw.png)

Database schema
![database](./docs/db-schema.drawio.png)

## Running with Docker

To run all required services, please execute the [docker-compose.yml](docker-compose.yml) file in the root of this repository.

```bash
docker compose up
```

Visit [http://localhost:3000](http://localhost:3000) to open the application.

### Production Considerations

- The application requires HTTPS in production for authentication to work properly.
- update .env-test, especially the `AUTH_SECRET` variable to make sure all passwords have a unique hash, not similar to this demo environment variable.

#### Reverse Proxy / CORS Configuration

When deploying behind a reverse proxy (Nginx, Traefik, etc.), proper configuration is essential for authentication redirects to work correctly.

📚 **See detailed deployment guide:** [DEPLOYMENT_REVERSE_PROXY.md](./DEPLOYMENT_REVERSE_PROXY.md)

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
