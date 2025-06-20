# FAIRmodels-validator Copilot Instructions

## Project Overview

FAIRmodels-validator is a SvelteKit web application for validating ML models against FAIR principles. It consists of a TypeScript frontend with PostgreSQL backend, integrating with an external ML validator service.

**Key Technologies**: SvelteKit, Svelte 5, TypeScript, PostgreSQL, TailwindCSS, DaisyUI, Docker

## Architecture & Patterns

### Project Structure

```
dashboard/
├── src/
│   ├── lib/
│   │   ├── components/     # Reusable Svelte components
│   │   ├── stores/         # Reactive state (*.store.svelte.ts)
│   │   ├── services/       # Business logic
│   │   ├── api/           # API clients
│   │   └── db/            # Database utilities
│   └── routes/            # SvelteKit file-based routing
```

### Core Principles

- **Modular Design**: Single responsibility, loose coupling, domain separation
- **Reactive State**: ALL shared state lives in Svelte 5 stores using `$state`, `$derived`, `$effect`
- **Business Logic**: Centralized in services/stores, NOT in components
- **Type Safety**: Full TypeScript throughout

## Svelte 5 Reactive State Management

### Store Architecture (CRITICAL)

**ALL shared state must use `.store.svelte.ts` files with pure Svelte 5 runes:**

```typescript
// src/lib/stores/validation.store.svelte.ts
function createValidationStore() {
  // Reactive state
  let validations = $state<ModelValidation[]>([]);
  let isValidating = $state(false);

  // Derived state
  let validationStats = $derived({
    total: validations.length,
    completed: validations.filter((v) => v.status === "completed").length,
  });

  // Business logic methods
  const loadValidations = async () => {
    const response = await fetch("/api/validations");
    validations = await response.json();
  };

  // Read-only interface
  return {
    get validations() {
      return validations;
    },
    get isValidating() {
      return isValidating;
    },
    get validationStats() {
      return validationStats;
    },
    loadValidations,
  };
}

export const validationStore = createValidationStore();
```

### Component Usage

Components are thin presentation layers:

```svelte
<script lang="ts">
  import { validationStore } from '$lib/stores/validation.store.svelte';

  const { validations, validationStats } = validationStore;

  const handleAction = () => validationStore.loadValidations();
</script>

<div class="stats">
  <div class="stat-value">{validationStats.total}</div>
</div>
```

## Coding Standards

### Svelte 5 Syntax

```typescript
// Use modern runes
let count = $state(0);
let doubled = $derived(count * 2);

$effect(() => {
  console.log("Count:", count);
});

// Component props
interface Props {
  title: string;
}
let { title }: Props = $props();
```

### Styling (TailwindCSS + DaisyUI)

- Base: `btn`, `card`, `modal`, `table`
- Utilities: `btn-primary`, `bg-base-100`, `text-primary`
- Spacing: `p-4`, `m-6`, `gap-4`

### Icons

```typescript
import IconName from "~icons/lucide/icon-name";
<IconName class="w-5 h-5 text-primary" />;
```

## Database & API

### Database Usage

```typescript
// ✅ Always use sql (postgres.js)
import { sql } from "$lib/db";
const users = await sql`SELECT * FROM users WHERE id = ${userId}`;

// ❌ Never use pool directly (auth only)
```

### API Integration Pattern

```typescript
// External API client
export class FaivorBackendAPI {
  static async validateModel(data: any): Promise<ValidationResult> {
    const response = await fetch("http://localhost:8000/validate-model", {
      method: "POST",
      body: formData,
    });
    return response.json();
  }
}

// Internal API route
export async function POST({ request, locals }) {
  const session = await locals.auth();
  const result = await FaivorBackendAPI.validateModel(data);
  return json(result);
}
```

## Backend Integration

### FAIVOR ML Validator Service

- **URL**: `http://localhost:8000`
- **Endpoints**:
  - `POST /validate-csv/` - CSV validation
  - `POST /validate-model` - Full model validation
- **Data Format**: FAIR JSON-LD metadata + CSV file
- **Integration**: Synchronous validation workflow

### Validation Workflow

1. Frontend uploads metadata + CSV
2. Validate CSV format via `/validate-csv/`
3. If valid, proceed to `/validate-model`
4. Store results in PostgreSQL
5. Update UI via reactive stores

## Authentication & Security

### Auth Providers

- Google OAuth (primary)
- Email magic links
- Credentials fallback

### Route Protection

```typescript
export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user) throw redirect(302, "/auth/signin");
  return { session };
};
```

## Development Workflow

### Setup

```bash
# Environment
cp _example.env .env

# Dependencies
bun install

# Services (includes backend at :8000)
docker-compose up -d

# Database
bun run migrate
```

### Commands

```bash
bun run dev      # Development server
bun run build    # Production build
bun run check    # Type checking
```

## Module Organization

### Services Layer

```typescript
// src/lib/services/validation-service.ts
export class ValidationService {
  static async validateModel(data: ModelData): Promise<ValidationResult> {
    // Pure business logic
  }
}
```

### Repository Layer

```typescript
// src/lib/repositories/validation-repository.ts
export class ValidationRepository {
  static async save(validation: ModelValidation): Promise<void> {
    // Pure database operations
  }
}
```

### Store Organization

```
src/lib/stores/
├── validation.store.svelte.ts    # Validation state
├── user.store.svelte.ts          # Auth state
├── notifications.store.svelte.ts # UI notifications
└── ui.store.svelte.ts            # Global UI state
```

## Best Practices

### Performance

- Use `$derived` for computed values
- Lazy load components
- Optimize database queries

### Security

- Validate all inputs
- Use parameterized queries
- Implement CSRF protection

### Accessibility

- Semantic HTML
- ARIA labels
- Keyboard navigation

## External Dependencies

**Key Packages**: `@auth/sveltekit`, `postgres`, `zod`, `@tailwindcss/typography`
**Icons**: `@iconify-json/lucide`, `@iconify-json/heroicons`, `@iconify-json/tabler`

## MCP Integration

**Always use MCP servers** for up-to-date documentation:

- SvelteKit patterns and APIs
- Authentication flows
- TailwindCSS/DaisyUI components
- Database integration patterns

**Available**: Context7 MCP Server (`https://mcp.context7.com/mcp`)

---

**Remember**: This is a FAIR principles validator - maintain focus on Findable, Accessible, Interoperable, and Reusable code patterns. Keep stores reactive, components thin, and business logic centralized.
