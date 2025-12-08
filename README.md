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
- Copy `.env.example` to `.env` and update values, especially the `AUTH_SECRET` variable. Generate a new secret with `npx auth secret`.

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

## Features

- Validate FAIRmodels via a user-friendly dashboard
- Import models by URL
- Delete models from the list with immediate UI update (no page reload required)
- View model details and validation results
- Search for models by title or description
- Export model metadata to FAIR models repository
