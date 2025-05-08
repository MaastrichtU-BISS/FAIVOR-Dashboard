# Technical Context

## Technology Stack

### Frontend
- Framework: SvelteKit
- UI Framework: DaisyUI/Tailwind CSS
- State Management: Svelte stores
- TypeScript for type safety
- Vite for build tooling

### Backend
- SvelteKit API routes
- Node.js runtime
- TypeScript
- PostgreSQL database
- Authentication: Custom + Google OAuth

### Development Tools
- ESLint for code linting
- Prettier for code formatting
- PostCSS for CSS processing
- MDSvex for Markdown processing

### Infrastructure
- Docker for containerization
- Docker Compose for local development

## Development Setup

### Prerequisites
- Node.js
- Docker and Docker Compose
- PostgreSQL (via Docker)
- pnpm package manager

### Environment Configuration
- `.env` file required in dashboard/
- Database configuration in docker-compose.yml
- API keys for external services

### Local Development
1. Start database:
   ```bash
   docker-compose up -d
   ```
2. Install dependencies:
   ```bash
   cd dashboard && pnpm install
   ```
3. Run migrations:
   ```bash
   pnpm migrate up
   ```
4. Start development server:
   ```bash
   pnpm dev
   ```

## Technical Constraints

### Database
- PostgreSQL required for JSON support
- Migrations must be reversible
- Seed data provided for development

#### Database Schema

##### Auth Tables
1. `users`
   - `id`: SERIAL PRIMARY KEY
   - `name`: VARCHAR(255)
   - `email`: VARCHAR(255) UNIQUE
   - `password`: VARCHAR(255)
   - `emailVerified`: TIMESTAMPTZ
   - `image`: TEXT
   - `role`: VARCHAR(50)
   - Indexes: `users_email_idx`
   - Triggers: `auto_assign_admin_role` (assigns admin role to specific emails)

##### Model Validation Tables

1. `model_checkpoints`
   - `checkpoint_id`: TEXT PRIMARY KEY (SHA-256)
   - `fair_model_id`: TEXT NOT NULL
   - `fair_model_url`: TEXT
   - `metadata`: JSONB
   - `description`: TEXT
   - `training_dataset`: TEXT
   - `created_at`: TIMESTAMPTZ
   - `updated_at`: TIMESTAMPTZ
   - Indexes: `idx_model_checkpoints_fair_model_id`

2. `data_statistics`
   - `ds_id`: SERIAL PRIMARY KEY
   - `hash`: TEXT NOT NULL
   - `statistics`: JSONB
   - `categorical_histograms`: JSONB
   - `data_type`: data_type_enum ('training', 'evaluation')
   - `additional_desc`: TEXT
   - `created_at`: TIMESTAMPTZ
   - `updated_at`: TIMESTAMPTZ
   - Indexes:
     - `idx_data_statistics_hash`
     - `idx_data_statistics_data_type`

3. `validations`
   - `val_id`: SERIAL PRIMARY KEY
   - `model_checkpoint_id`: TEXT (FK to model_checkpoints)
   - `fair_model_id`: TEXT NOT NULL
   - `user_id`: INTEGER (FK to users)
   - `description`: TEXT
   - `validation_result`: JSONB
   - `validation_status`: validation_status_enum ('pending', 'running', 'completed', 'failed')
   - `validation_dataset`: TEXT
   - `start_datetime`: TIMESTAMPTZ
   - `end_datetime`: TIMESTAMPTZ
   - `fairvor_val_lib_version`: TEXT
   - `created_at`: TIMESTAMPTZ
   - `updated_at`: TIMESTAMPTZ
   - Indexes:
     - `idx_validations_model_checkpoint_id`
     - `idx_validations_user_id`
     - `idx_validations_status`

##### Automatic Updates
- All tables with timestamps (`model_checkpoints`, `data_statistics`, `validations`) have triggers to automatically update `updated_at` on record changes

### Authentication
- Email verification required
- Password complexity requirements
- API key rotation support
- Session management

### API
- RESTful design principles
- Rate limiting implementation
- CORS configuration
- Request size limits

### Frontend
- Mobile-first responsive design
- Accessibility compliance (WCAG)
- Browser compatibility requirements
- Progressive enhancement

### Security
- HTTPS required in production
- CSP headers configured
- XSS prevention measures
- CSRF protection enabled
