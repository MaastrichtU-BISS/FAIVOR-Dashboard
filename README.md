# FAIRmodels-validator Dashboard


FAIRmodels-validator Dashboard is a web application that allows users to validate their FAIRmodels.

Architecture
![techstack](./techstack.excalidraw.png)

Database schema
![database](./db-schema.drawio.png)

## Docker Setup

This project includes Docker configuration for easy deployment and development. Follow these steps to run the application using Docker:

### Prerequisites
- Docker installed on your system
- Docker Compose installed on your system

### Running with Docker Compose

1. Clone the repository:
```bash
git clone https://github.com/your-username/FAIRmodels-validator.git
cd FAIRmodels-validator
```

2. Build and start the containers:
```bash
docker compose up --build
```

This will:
- Build the frontend container
- Start the development server
- The application will be available at `http://localhost:5173`

### Development with Docker

- The frontend application is configured with hot-reload enabled
- Any changes made to the source code will automatically reflect in the running container
- Logs will be visible in the terminal where you ran `docker compose up`

### Stopping the Application

To stop the running containers:
```bash
docker compose down
```

### Additional Docker Commands

- View running containers:
```bash
docker ps
```

- View container logs:
```bash
docker compose logs frontend
```

- Rebuild containers after dependencies change:
```bash
docker compose up --build
