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

When deploying behind a reverse proxy (Nginx, Traefik, etc.), you need to configure CORS properly:

1. Set `PUBLIC_FAIVOR_BACKEND_URL` to your backend URL
2. Set `ALLOWED_ORIGINS` to your frontend domain(s)

Example for production:
```env
PUBLIC_FAIVOR_BACKEND_URL="https://api.yourdomain.com"
ALLOWED_ORIGINS="https://app.yourdomain.com"
```

📚 **See detailed guides:**
- [Quick Start: Reverse Proxy Setup](./docs/REVERSE-PROXY-SETUP.md)
- [Complete CORS Configuration Guide](./docs/CORS-CONFIGURATION.md)

## Features

- Validate FAIRmodels via a user-friendly dashboard
- Import models by URL
- Delete models from the list with immediate UI update (no page reload required)
- View model details and validation results
- Search for models by title or description
- Export model metadata to FAIR models repository
