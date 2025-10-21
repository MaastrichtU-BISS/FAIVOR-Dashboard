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

When deploying behind a reverse proxy (Nginx, Traefik, etc.), configure these environment variables:

```env
ORIGIN="https://your-domain.com"
AUTH_URL="https://your-domain.com"
ALLOWED_ORIGINS="https://your-domain.com"
FAIVOR_BACKEND_URL="http://faivor-backend:8000"
```

📚 **See detailed guide:** [Reverse Proxy Deployment](./docs/REVERSE-PROXY-DEPLOYMENT.md)

## Features

- Validate FAIRmodels via a user-friendly dashboard
- Import models by URL
- Delete models from the list with immediate UI update (no page reload required)
- View model details and validation results
- Search for models by title or description
- Export model metadata to FAIR models repository
