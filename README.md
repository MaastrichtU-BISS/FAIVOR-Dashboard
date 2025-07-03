# FAIRmodels-validator Dashboard

FAIRmodels-validator Dashboard is a web application that allows users to validate their FAIRmodels.

Architecture
![techstack](./docs/techstack.excalidraw.png)

Database schema
![database](./docs/db-schema.drawio.png)

## Quick Start

1. Copy `.env.example` to `.env` and fill in the required variables

## Runnin with Docker

It will run the database, migrations and dashboard services.

```bash
docker compose up
```

```bash
bun install
bun dev
```

Visit [http://localhost:5173](http://localhost:5173) to open the application.

### Production Considerations

The application requires HTTPS in production for authentication to work properly.

## Features

- Validate FAIRmodels via a user-friendly dashboard
- Import models by URL
- Delete models from the list with immediate UI update (no page reload required)
- View model details and validation results
- Search for models by title or description
- Export model metadata to FAIR models repository
