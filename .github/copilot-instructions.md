# FAIRmodels-validator Copilot Instructions

## Project Overview

FAIRmodels-validator is a web application for validating machine learning models against FAIR (Findable, Accessible, Interoperable, Reusable) principles. The project consists of a SvelteKit dashboard frontend with PostgreSQL backend and integrates with an external ML validator service.

## Technology Stack

### Frontend

- **SvelteKit** - Full-stack web framework with TypeScript
- **Svelte 5** - Component framework using modern runes syntax ($state, $derived, $effect)
- **TypeScript** - Static typing throughout the application
- **TailwindCSS** - Utility-first CSS framework
- **DaisyUI** - Component library built on Tailwind
- **Vite** - Build tool and dev server

### Backend & Database

- **PostgreSQL** - Primary database with JSONB support
- **@auth/sveltekit** - Authentication library with multiple providers
- **Bun** - JavaScript runtime for development
- **Docker** - Containerization for database and services

### Icons & Assets

- **unplugin-icons** - Icon system with Iconify collections
- **Lucide**, **Heroicons**, **Tabler** - Primary icon sets

## Architecture Patterns

### Project Structure

```
dashboard/                 # Main SvelteKit application
├── src/
│   ├── lib/              # Shared utilities and components
│   │   ├── components/   # Reusable Svelte components
│   │   ├── db/          # Database utilities and types
│   │   ├── server/      # Server-side utilities
│   │   └── stores/      # Svelte stores
│   ├── routes/          # SvelteKit file-based routing
│   └── auth.ts          # Authentication configuration
├── migrations/          # Database migration files
└── static/             # Static assets
```

### Database Schema

- **Users table**: Authentication data with provider support
- **Sessions table**: Session management
- **Accounts table**: OAuth provider linkage
- **Model_validations table**: Core validation data with JSONB metadata
- **Verification_tokens table**: Email verification

## Coding Conventions

### Svelte 5 Syntax

Use modern Svelte 5 runes syntax:

```typescript
// State management
let count = $state(0);
let doubled = $derived(count * 2);

// Effects
$effect(() => {
  console.log("Count changed:", count);
});

// Props in components
interface Props {
  title: string;
  items: string[];
}

let { title, items }: Props = $props();
```

### TypeScript Patterns

- Use interfaces for component props and data structures
- Leverage JSONB types for flexible metadata storage
- Define strict types for database models and API responses

```typescript
interface ModelValidation {
  id: string;
  model_name: string;
  status: "pending" | "completed" | "failed";
  metadata: Record<string, any>; // JSONB field
  created_at: Date;
}
```

### Styling Guidelines

#### TailwindCSS + DaisyUI

- Use DaisyUI components as base: `btn`, `card`, `modal`, `table`
- Customize with Tailwind utilities: `btn btn-primary hover:bg-primary/90`
- Follow consistent spacing: `p-4`, `m-6`, `gap-4`
- Use semantic color classes: `text-primary`, `bg-base-100`, `border-base-300`

#### Component Structure

```svelte
<script lang="ts">
  // Props and state
  interface Props {
    title: string;
  }

  let { title }: Props = $props();
  let isOpen = $state(false);
</script>

<div class="card bg-base-100 shadow-xl">
  <div class="card-body">
    <h2 class="card-title">{title}</h2>
    <!-- Content -->
  </div>
</div>
```

### Icon Usage

Import icons from collections using the pattern:

```typescript
import IconName from "~icons/lucide/icon-name";
import IconName from "~icons/heroicons/icon-name";
import IconName from "~icons/tabler/icon-name";
```

Use in components:

```svelte
<IconName class="w-5 h-5 text-primary" />
```

## Authentication System

### Providers Configuration

- **Google OAuth** - Primary social login
- **Email (Resend)** - Magic link authentication
- **Credentials** - Username/password fallback

### Session Management

```typescript
// Check authentication in load functions
export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user) {
    throw redirect(302, "/auth/signin");
  }
  return { session };
};
```

### Protected Routes

Use `+layout.server.ts` files to protect route groups:

```typescript
export const load: LayoutServerLoad = async ({ locals, route }) => {
  const session = await locals.auth();
  // Authentication logic
};
```

## Database Patterns

### Migrations

- Use numbered migration files: `001_init.sql`, `002_feature.sql`
- Include rollback instructions in comments
- Use JSONB for flexible metadata storage

### JSONB Usage

```sql
-- Store validation metadata as JSONB
CREATE TABLE model_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Query JSONB fields
SELECT * FROM model_validations
WHERE metadata->>'status' = 'completed';
```

## API Integration

### External Validator Service

- Integrate with ML model validation API
- Handle async validation processes
- Store results in JSONB format for flexibility

### Internal API Routes

```typescript
// src/routes/api/validate/+server.ts
export async function POST({ request, locals }) {
  const session = await locals.auth();
  // API logic
  return json({ success: true });
}
```

## Development Workflow

### Environment Setup

1. Copy `_example .env` to `.env`
2. Configure database and auth providers
3. Run `bun install` for dependencies
4. Use `docker-compose up` for local services

### Database Management

```bash
# Run migrations
bun run migrate

# Seed database
psql -h localhost -U postgres -d fairmodels < seed-database/seed.sql
```

### Development Commands

```bash
bun run dev          # Start development server
bun run build        # Build for production
bun run preview      # Preview built app
bun run check        # Type checking
```

## Component Guidelines

### Reusable Components

- Place in `src/lib/components/`
- Use TypeScript interfaces for props
- Follow DaisyUI + Tailwind patterns
- Include proper accessibility attributes

### Form Handling

- Use SvelteKit form actions
- Implement progressive enhancement
- Handle validation client and server-side

### Data Loading

- Use `+page.server.ts` for server-side data
- Implement proper error handling
- Cache frequently accessed data

## Best Practices

### Performance

- Use `$derived` for computed values
- Minimize reactive statements
- Lazy load heavy components
- Optimize database queries with proper indexing

### Security

- Validate all user inputs
- Use parameterized queries
- Implement proper CSRF protection
- Follow authentication best practices

### Accessibility

- Use semantic HTML elements
- Include proper ARIA labels
- Ensure keyboard navigation
- Test with screen readers

### Code Organization

- Group related functionality in modules
- Use barrel exports for clean imports
- Keep components focused and single-purpose
- Document complex business logic

## Modularity and Separation of Concerns

### Core Principles

The application code should be **as modular as possible within reasonable terms**, following these principles:

- **Single Responsibility**: Each module, component, and function should have one clear purpose
- **Loose Coupling**: Minimize dependencies between modules
- **High Cohesion**: Related functionality should be grouped together
- **Clear Interfaces**: Define explicit contracts between modules
- **Domain Separation**: Organize code by business domains rather than technical layers

### Module Structure Guidelines

#### Business Logic Separation

Separate concerns into distinct layers:

```typescript
// src/lib/services/validation-service.ts - Business logic
export class ValidationService {
  static async validateModel(modelData: ModelData): Promise<ValidationResult> {
    // Core validation logic - no database or UI concerns
    return await ExternalValidatorAPI.validate(modelData);
  }

  static async processValidationResult(
    result: ValidationResult
  ): Promise<ProcessedResult> {
    // Business rules for processing results
  }
}

// src/lib/repositories/validation-repository.ts - Data access
export class ValidationRepository {
  static async saveValidation(validation: ModelValidation): Promise<void> {
    // Pure database operations - no business logic
  }

  static async findValidationsByUser(
    userId: string
  ): Promise<ModelValidation[]> {
    // Data retrieval logic
  }
}

// src/routes/api/validate/+server.ts - API layer
export async function POST({ request, locals }) {
  const session = await locals.auth();
  const data = await request.json();

  // Orchestrate services - minimal logic here
  const result = await ValidationService.validateModel(data);
  await ValidationRepository.saveValidation(result);

  return json(result);
}
```

#### Component Modularity

Organize components by feature domains:

```typescript
// src/lib/components/validation/ - Feature-specific components
├── ValidationForm.svelte           # Form handling only
├── ValidationResults.svelte        # Results display only
├── ValidationStatus.svelte         # Status indicator only
├── ValidationMetrics.svelte        # Metrics visualization only
└── index.ts                       # Barrel export

// src/lib/components/validation/index.ts
export { default as ValidationForm } from './ValidationForm.svelte';
export { default as ValidationResults } from './ValidationResults.svelte';
export { default as ValidationStatus } from './ValidationStatus.svelte';
export { default as ValidationMetrics } from './ValidationMetrics.svelte';

// src/lib/components/ui/ - Generic UI components
├── Button.svelte
├── Modal.svelte
├── DataTable.svelte
└── index.ts
```

#### Utility Modules

Create focused utility modules:

```typescript
// src/lib/utils/ - Pure utility functions
├── date-utils.ts        # Date formatting and manipulation
├── validation-utils.ts  # Input validation helpers
├── api-client.ts       # HTTP client utilities
├── file-utils.ts       # File handling utilities
└── types.ts           # Shared type definitions

// Each utility module should be pure functions when possible
// src/lib/utils/date-utils.ts
export const formatValidationDate = (date: Date): string => {
  // Pure function - no side effects
};

export const calculateDuration = (start: Date, end: Date): number => {
  // Pure function
};
```

### Domain-Driven Organization

Organize by business domains when features become complex:

```typescript
// src/lib/domains/validation/
├── services/
│   ├── validation-service.ts
│   └── metrics-service.ts
├── repositories/
│   ├── validation-repository.ts
│   └── metrics-repository.ts
├── components/
│   ├── ValidationForm.svelte
│   └── ValidationResults.svelte
├── types/
│   └── validation-types.ts
└── index.ts

// src/lib/domains/user-management/
├── services/
├── repositories/
├── components/
└── types/

// src/lib/domains/fair-assessment/
├── services/
├── repositories/
├── components/
└── types/
```

### Store Modularity

Create focused stores for specific concerns:

```typescript
// src/lib/stores/validation-store.ts
export const validationStore = () => {
  let validations = $state<ModelValidation[]>([]);
  let currentValidation = $state<ModelValidation | null>(null);

  return {
    get validations() {
      return validations;
    },
    get currentValidation() {
      return currentValidation;
    },

    setValidations: (newValidations: ModelValidation[]) => {
      validations = newValidations;
    },

    addValidation: (validation: ModelValidation) => {
      validations = [...validations, validation];
    },
  };
};

// src/lib/stores/ui-store.ts
export const uiStore = () => {
  let isLoading = $state(false);
  let notifications = $state<Notification[]>([]);

  return {
    get isLoading() {
      return isLoading;
    },
    get notifications() {
      return notifications;
    },

    setLoading: (loading: boolean) => {
      isLoading = loading;
    },
    addNotification: (notification: Notification) => {
      notifications = [...notifications, notification];
    },
  };
};
```

### API Layer Separation

Separate API concerns clearly:

```typescript
// src/lib/api/validation-api.ts - External API client
export class ValidationAPI {
  static async validateModel(model: ModelData): Promise<ValidationResult> {
    // Handle external API communication
  }
}

// src/lib/api/internal-api.ts - Internal API client
export class InternalAPI {
  static async saveValidation(validation: ModelValidation): Promise<void> {
    // Handle internal API calls
  }
}

// src/routes/api/validate/+server.ts - Route handler
export async function POST({ request, locals }) {
  // Minimal orchestration - delegate to services
}
```

### Configuration Management

Centralize and modularize configuration:

```typescript
// src/lib/config/database.ts
export const databaseConfig = {
  // Database-specific configuration
};

// src/lib/config/validation.ts
export const validationConfig = {
  // Validation-specific configuration
};

// src/lib/config/index.ts
export * from "./database";
export * from "./validation";
export * from "./auth";
```

### Testing Modularity

Structure tests to mirror the modular architecture:

```typescript
// tests/unit/services/validation-service.test.ts
// tests/unit/repositories/validation-repository.test.ts
// tests/integration/api/validation.test.ts
// tests/components/ValidationForm.test.ts
```

### Import Organization

Use consistent import patterns that reinforce modularity:

```typescript
// Group imports by type and source
import type { ModelValidation, ValidationResult } from "$lib/types";
import { ValidationService } from "$lib/services/validation-service";
import { ValidationRepository } from "$lib/repositories/validation-repository";
import { Button, Modal } from "$lib/components/ui";
import { formatDate } from "$lib/utils/date-utils";
```

### Module Boundaries

Enforce clear boundaries between modules:

- **Services** should not import from repositories directly
- **Components** should not contain business logic
- **Utilities** should be pure functions when possible
- **API routes** should orchestrate, not implement business logic
- **Stores** should manage state, not business operations

This modular approach ensures code is maintainable, testable, and follows FAIR principles by making functionality Findable, Accessible, Interoperable, and Reusable.

## External Dependencies

### Key Packages

- `@auth/sveltekit` - Authentication
- `postgres` - Database client
- `zod` - Schema validation
- `@tailwindcss/typography` - Rich text styling
- `@types/pg` - PostgreSQL types

### Icon Collections

- `@iconify-json/lucide` - Primary icon set
- `@iconify-json/heroicons` - UI icons
- `@iconify-json/tabler` - Additional icons

## MCP Servers and Documentation

### Context7 MCP Server

**Always prefer using MCP servers when available** for accessing up-to-date library documentation and best practices. The project is configured with the Context7 MCP server which provides access to the latest documentation for popular libraries and frameworks.

#### When to Use MCP Servers

- **Library Documentation**: When implementing features with external libraries (SvelteKit, TailwindCSS, DaisyUI, etc.)
- **API References**: When working with authentication, database operations, or third-party integrations
- **Best Practices**: When looking for current patterns and recommended approaches
- **Troubleshooting**: When debugging issues with specific libraries or frameworks

#### Available MCP Servers

```json
{
  "servers": {
    "context7": {
      "url": "https://mcp.context7.com/mcp"
    }
  }
}
```

#### Usage Guidelines

1. **Check MCP first** before making assumptions about library APIs or patterns
2. **Verify current documentation** for libraries like:
   - SvelteKit (routing, forms, authentication)
   - Svelte 5 (runes syntax, components)
   - TailwindCSS/DaisyUI (component patterns)
   - @auth/sveltekit (authentication flows)
   - PostgreSQL drivers and ORMs

3. **Use for implementation guidance** when:
   - Setting up new features
   - Integrating external services
   - Following framework-specific patterns
   - Implementing security best practices

4. **Combine with project patterns** by using MCP documentation as a foundation and adapting it to follow the project's modular architecture and coding conventions

#### Example Usage Scenarios

- Implementing new SvelteKit form actions → Check Context7 for latest SvelteKit form patterns
- Adding new authentication providers → Reference current @auth/sveltekit documentation
- Creating responsive layouts → Get latest TailwindCSS/DaisyUI component examples
- Database integration patterns → Check PostgreSQL and relevant driver documentation
- API integration → Reference current HTTP client and validation patterns

Always cross-reference MCP server information with the project's established patterns to maintain consistency while leveraging the most current library documentation and best practices.

When working on this project, always consider the FAIR principles focus, maintain consistency with the established patterns, and ensure proper TypeScript typing throughout.
