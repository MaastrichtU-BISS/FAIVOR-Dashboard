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

To run all required services, please execute the [docker-compose.yml](docker-compose.yml) file in the root of this repository.

```bash
docker compose up
```

Visit [http://localhost:3000](http://localhost:3000) to open the application.

### Production Considerations

- The application requires HTTPS in production for authentication to work properly.
- update .env-test, especially the `AUTH_SECRET` variable to make sure all passwords have a unique hash, not similar to this demo environment variable.

## Features

- Validate FAIRmodels via a user-friendly dashboard
- Import models by URL
- Delete models from the list with immediate UI update (no page reload required)
- View model details and validation results
- Search for models by title or description
- Export model metadata to FAIR models repository
