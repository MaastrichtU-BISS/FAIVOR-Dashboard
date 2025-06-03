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

### Database Connection Usage

**Always use `sql` from `$lib/db` for database operations**, not `pool`:

```typescript
// ✅ Correct - Use sql for application queries
import { sql } from "$lib/db";

const users = await sql`SELECT * FROM users WHERE id = ${userId}`;
const result = await sql`
  INSERT INTO model_validations (model_name, status, metadata)
  VALUES (${modelName}, ${status}, ${metadata})
  RETURNING *
`;

// ❌ Incorrect - Don't use pool for application queries
import { pool } from "$lib/db"; // Only for auth adapter
```

**Key differences:**

- `sql` (postgres.js): Use for all application database operations - provides better TypeScript support, automatic prepared statements, and cleaner syntax
- `pool` (pg Pool): Used exclusively by the authentication system - never use directly in application code

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

-- Query JSONB fields with sql
const validations = await sql`
  SELECT * FROM model_validations
  WHERE metadata->>'status' = 'completed'
`;
```

## API Integration

### Backend Validator Service (FAIVOR API)

The project integrates with the FAIVOR ML Validator backend service running at **http://localhost:8000**. This backend provides the core validation engine for evaluating ML models against FAIR principles.

#### Backend API Endpoints

Based on the actual FAIVOR-ML-Validator implementation, the backend provides these endpoints:

- `GET /` - Root endpoint returning welcome message
- `POST /validate-csv/` - Validate CSV file against model metadata
- `POST /validate-model` - Full model validation with metrics calculation

#### API Data Structures

The backend expects FAIR model metadata in a specific JSON-LD format:

```typescript
// FAIR Model Metadata structure (based on actual implementation)
interface FAIRModelMetadata {
  "@context": Record<string, any>;
  "General Model Information": {
    Title: { "@value": string };
    "Editor Note": { "@value": string };
    "Created by": { "@value": string };
    "FAIRmodels image name": { "@value": string };
    "Contact email": { "@value": string };
    "References to papers": Array<{ "@value": string }>;
  };
  "Input data": Array<{
    "Input label": { "@value": string };
    Description: { "@value": string };
    "Type of input": { "@value": "numerical" | "categorical" };
    "Minimum - for numerical"?: { "@value": string; "@type": "xsd:decimal" };
    "Maximum - for numerical"?: { "@value": string; "@type": "xsd:decimal" };
    Categories?: Array<any>;
    "Input feature": {
      "@id": string;
      "rdfs:label": string;
    };
  }>;
  Outcome: {
    "@value": string;
  };
  "Outcome label": {
    "@value": string;
  };
}

// CSV Validation Response
interface CSVValidationResponse {
  valid: boolean;
  message?: string;
  csv_columns: string[];
  model_input_columns: string[];
}

// Model Validation Response
interface ModelValidationResponse {
  model_name: string;
  metrics: Record<string, number>;
}
```

#### Integration Architecture

```typescript
// src/lib/api/faivor-backend.ts - Backend API client
export class FaivorBackendAPI {
  private static readonly BASE_URL = "http://localhost:8000";

  static async validateCSV(
    modelMetadata: FAIRModelMetadata,
    csvFile: File
  ): Promise<CSVValidationResponse> {
    const formData = new FormData();
    formData.append("model_metadata", JSON.stringify(modelMetadata));
    formData.append("csv_file", csvFile);

    const response = await fetch(`${this.BASE_URL}/validate-csv/`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`CSV validation failed: ${response.statusText}`);
    }

    return await response.json();
  }

  static async validateModel(
    modelMetadata: FAIRModelMetadata,
    csvFile: File,
    dataMetadata: Record<string, any>
  ): Promise<ModelValidationResponse> {
    const formData = new FormData();
    formData.append("model_metadata", JSON.stringify(modelMetadata));
    formData.append("csv_file", csvFile);
    formData.append("data_metadata", JSON.stringify(dataMetadata));

    const response = await fetch(`${this.BASE_URL}/validate-model`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Model validation failed: ${response.statusText}`);
    }

    return await response.json();
  }

  static async healthCheck(): Promise<{ message: string }> {
    const response = await fetch(`${this.BASE_URL}/`);
    return await response.json();
  }
}
```

#### Validation Workflow Integration

The validation process follows this synchronous pattern:

1. **Frontend uploads model metadata and CSV** via validation form
2. **Internal API validates CSV format** using `POST /validate-csv/`
3. **On successful CSV validation**, proceed to full model validation
4. **Internal API calls backend** `POST /validate-model` for complete validation
5. **Backend returns metrics immediately** (no async polling needed)
6. **Database stores validation results** with `completed` status and metrics

#### Service Layer Implementation

```typescript
// src/lib/services/validation-service.ts
export class ValidationService {
  static async validateCSVFormat(
    modelMetadata: FAIRModelMetadata,
    csvFile: File
  ): Promise<CSVValidationResponse> {
    return await FaivorBackendAPI.validateCSV(modelMetadata, csvFile);
  }

  static async performFullValidation(
    modelMetadata: FAIRModelMetadata,
    csvFile: File,
    dataMetadata: Record<string, any>
  ): Promise<ModelValidationResponse> {
    // First validate CSV format
    const csvValidation = await this.validateCSVFormat(modelMetadata, csvFile);

    if (!csvValidation.valid) {
      throw new Error(`CSV validation failed: ${csvValidation.message}`);
    }

    // Proceed with full model validation
    return await FaivorBackendAPI.validateModel(
      modelMetadata,
      csvFile,
      dataMetadata
    );
  }

  static transformToFAIRFormat(internalMetadata: any): FAIRModelMetadata {
    // Transform internal validation data to FAIR model metadata format
    return {
      "@context": {
        rdfs: "http://www.w3.org/2000/01/rdf-schema#",
        xsd: "http://www.w3.org/2001/XMLSchema#",
        // ... other context definitions
      },
      "General Model Information": {
        Title: { "@value": internalMetadata.model_name },
        "Editor Note": { "@value": internalMetadata.description || "" },
        "Created by": { "@value": internalMetadata.author || "" },
        "FAIRmodels image name": {
          "@value": internalMetadata.docker_image || "",
        },
        "Contact email": { "@value": internalMetadata.contact_email || "" },
        "References to papers":
          internalMetadata.references?.map((ref) => ({ "@value": ref })) || [],
      },
      "Input data":
        internalMetadata.inputs?.map((input) => ({
          "Input label": { "@value": input.label },
          Description: { "@value": input.description },
          "Type of input": { "@value": input.type },
          ...(input.type === "numerical" && {
            "Minimum - for numerical": {
              "@value": input.min?.toString(),
              "@type": "xsd:decimal",
            },
            "Maximum - for numerical": {
              "@value": input.max?.toString(),
              "@type": "xsd:decimal",
            },
          }),
          "Input feature": {
            "@id": input.feature_id || "",
            "rdfs:label": input.feature_label || input.label,
          },
        })) || [],
      Outcome: { "@value": internalMetadata.outcome_description || "" },
      "Outcome label": { "@value": internalMetadata.outcome_label || "" },
    };
  }
}
```

### Internal API Routes

```typescript
// src/routes/api/validations/+server.ts
export async function POST({ request, locals }) {
  const session = await locals.auth();
  const { modelMetadata, csvFile, dataMetadata } = await request.formData();

  try {
    // Transform to FAIR format
    const fairMetadata = ValidationService.transformToFAIRFormat(
      JSON.parse(modelMetadata)
    );

    // Perform validation with backend
    const results = await ValidationService.performFullValidation(
      fairMetadata,
      csvFile,
      JSON.parse(dataMetadata)
    );

    // Save validation to database
    const validation = await ValidationRepository.create({
      user_id: session.user.id,
      model_name: fairMetadata["General Model Information"]["Title"]["@value"],
      status: "completed",
      validation_result: {
        model_name: results.model_name,
        metrics: results.metrics,
        csv_validation: true,
      },
      metadata: fairMetadata,
    });

    return json({ success: true, validation });
  } catch (error) {
    console.error("Validation failed:", error);
    return json({ error: error.message }, { status: 500 });
  }
}

// src/routes/api/validations/csv-check/+server.ts - CSV validation endpoint
export async function POST({ request, locals }) {
  const session = await locals.auth();
  const { modelMetadata, csvFile } = await request.formData();

  try {
    const fairMetadata = ValidationService.transformToFAIRFormat(
      JSON.parse(modelMetadata)
    );
    const csvValidation = await ValidationService.validateCSVFormat(
      fairMetadata,
      csvFile
    );

    return json({
      success: true,
      validation: csvValidation,
      canProceed: csvValidation.valid,
    });
  } catch (error) {
    console.error("CSV validation failed:", error);
    return json({ error: error.message }, { status: 400 });
  }
}
```

#### Data Transformation Patterns

Transform between internal validation data and FAIR metadata formats:

```typescript
// src/lib/utils/validation-transform.ts
export function transformToFAIRFormat(
  internalData: InternalValidationData
): FAIRModelMetadata {
  return {
    "@context": {
      rdfs: "http://www.w3.org/2000/01/rdf-schema#",
      xsd: "http://www.w3.org/2001/XMLSchema#",
      pav: "http://purl.org/pav/",
      schema: "http://schema.org/",
      // ... complete context definition
    },
    "General Model Information": {
      Title: { "@value": internalData.model_name },
      "Editor Note": { "@value": internalData.description || "" },
      "Created by": { "@value": internalData.author || "" },
      "FAIRmodels image name": { "@value": internalData.docker_image || "" },
      "Contact email": { "@value": internalData.contact_email || "" },
      "References to papers":
        internalData.references?.map((ref) => ({ "@value": ref })) || [],
    },
    "Input data":
      internalData.input_features?.map((input) => ({
        "Input label": { "@value": input.label },
        Description: { "@value": input.description },
        "Type of input": { "@value": input.data_type },
        ...(input.data_type === "numerical" && {
          "Minimum - for numerical": {
            "@value": input.min_value?.toString(),
            "@type": "xsd:decimal",
          },
          "Maximum - for numerical": {
            "@value": input.max_value?.toString(),
            "@type": "xsd:decimal",
          },
        }),
        "Input feature": {
          "@id":
            input.feature_uri || `http://example.org/features/${input.label}`,
          "rdfs:label": input.feature_label || input.label,
        },
      })) || [],
    Outcome: { "@value": internalData.outcome_description || "" },
    "Outcome label": { "@value": internalData.outcome_label || "" },
  };
}

export function transformFromFAIRResults(
  backendResult: ModelValidationResponse
): ValidationResult {
  return {
    model_name: backendResult.model_name,
    validation_metrics: backendResult.metrics,
    performance_scores: extractPerformanceMetrics(backendResult.metrics),
    fairness_scores: extractFairnessMetrics(backendResult.metrics),
    explainability_scores: extractExplainabilityMetrics(backendResult.metrics),
    completed_at: new Date().toISOString(),
  };
}

function extractPerformanceMetrics(
  metrics: Record<string, number>
): Record<string, number> {
  // Extract performance-related metrics
  const performanceKeys = [
    "accuracy",
    "precision",
    "recall",
    "f1_score",
    "auc_roc",
    "mse",
    "rmse",
    "mae",
  ];
  return Object.fromEntries(
    Object.entries(metrics).filter(([key]) =>
      performanceKeys.some((perfKey) => key.toLowerCase().includes(perfKey))
    )
  );
}

function extractFairnessMetrics(
  metrics: Record<string, number>
): Record<string, number> {
  // Extract fairness-related metrics
  const fairnessKeys = [
    "demographic_parity",
    "equalized_odds",
    "calibration",
    "bias",
  ];
  return Object.fromEntries(
    Object.entries(metrics).filter(([key]) =>
      fairnessKeys.some((fairKey) => key.toLowerCase().includes(fairKey))
    )
  );
}

function extractExplainabilityMetrics(
  metrics: Record<string, number>
): Record<string, number> {
  // Extract explainability-related metrics
  const explainabilityKeys = [
    "feature_importance",
    "shap",
    "lime",
    "permutation",
  ];
  return Object.fromEntries(
    Object.entries(metrics).filter(([key]) =>
      explainabilityKeys.some((explainKey) =>
        key.toLowerCase().includes(explainKey)
      )
    )
  );
}
```

#### Form Handling Integration

Create forms that work with the FAIR metadata structure:

```typescript
// src/lib/components/validation/ValidationForm.svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { FAIRModelMetadata } from '$lib/types/validation';

  interface Props {
    onValidationComplete?: (result: any) => void;
  }

  let { onValidationComplete }: Props = $props();

  let modelMetadata = $state<Partial<FAIRModelMetadata>>({
    "General Model Information": {
      "Title": { "@value": "" },
      "Editor Note": { "@value": "" },
      "Created by": { "@value": "" },
      "FAIRmodels image name": { "@value": "" },
      "Contact email": { "@value": "" },
      "References to papers": []
    },
    "Input data": [],
    "Outcome": { "@value": "" },
    "Outcome label": { "@value": "" }
  });

  let csvFile = $state<File | null>(null);
  let csvValidation = $state<any>(null);
  let isValidatingCSV = $state(false);
  let canProceedToValidation = $state(false);

  async function validateCSV() {
    if (!csvFile || !modelMetadata) return;

    isValidatingCSV = true;
    try {
      const formData = new FormData();
      formData.append('modelMetadata', JSON.stringify(modelMetadata));
      formData.append('csvFile', csvFile);

      const response = await fetch('/api/validations/csv-check', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      csvValidation = result.validation;
      canProceedToValidation = result.canProceed;
    } catch (error) {
      console.error('CSV validation failed:', error);
    } finally {
      isValidatingCSV = false;
    }
  }

  const submitValidation = enhance(({ formData }) => {
    formData.append('modelMetadata', JSON.stringify(modelMetadata));
    if (csvFile) formData.append('csvFile', csvFile);

    return async ({ result }) => {
      if (result.type === 'success' && onValidationComplete) {
        onValidationComplete(result.data);
      }
    };
  });
</script>

<form method="POST" action="/api/validations" use:submitValidation enctype="multipart/form-data">
  <!-- Model Information Section -->
  <div class="card bg-base-100 shadow-xl mb-6">
    <div class="card-body">
      <h2 class="card-title">Model Information</h2>

      <div class="form-control">
        <label class="label" for="model-title">
          <span class="label-text">Model Title</span>
        </label>
        <input
          id="model-title"
          type="text"
          class="input input-bordered"
          bind:value={modelMetadata["General Model Information"]["Title"]["@value"]}
          required
        />
      </div>

      <div class="form-control">
        <label class="label" for="model-description">
          <span class="label-text">Description</span>
        </label>
        <textarea
          id="model-description"
          class="textarea textarea-bordered"
          bind:value={modelMetadata["General Model Information"]["Editor Note"]["@value"]}
        ></textarea>
      </div>

      <!-- Additional model fields... -->
    </div>
  </div>

  <!-- CSV Upload Section -->
  <div class="card bg-base-100 shadow-xl mb-6">
    <div class="card-body">
      <h2 class="card-title">Data Upload</h2>

      <div class="form-control">
        <label class="label" for="csv-file">
          <span class="label-text">CSV Data File</span>
        </label>
        <input
          id="csv-file"
          type="file"
          accept=".csv"
          class="file-input file-input-bordered"
          onchange={(e) => {
            csvFile = e.target.files?.[0] || null;
            csvValidation = null;
            canProceedToValidation = false;
          }}
          required
        />
      </div>

      {#if csvFile}
        <button
          type="button"
          class="btn btn-outline"
          onclick={validateCSV}
          disabled={isValidatingCSV}
        >
          {isValidatingCSV ? 'Validating...' : 'Validate CSV Format'}
        </button>
      {/if}

      {#if csvValidation}
        <div class="alert {csvValidation.valid ? 'alert-success' : 'alert-error'}">
          <span>{csvValidation.message || (csvValidation.valid ? 'CSV format is valid' : 'CSV format is invalid')}</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Submit Button -->
  <button
    type="submit"
    class="btn btn-primary"
    disabled={!canProceedToValidation}
  >
    Start Model Validation
  </button>
</form>
```

## Development Workflow

### Environment Setup

1. Copy `_example .env` to `.env`
2. Configure database and auth providers
3. Run `bun install` for dependencies
4. Use `docker-compose up` for local services (includes backend API at localhost:8000)

### Backend Service Integration

The FAIVOR ML Validator backend service runs as part of the Docker Compose stack:

```yaml
# docker-compose.yml
services:
  faivor-backend:
    image: ghcr.io/maastrichtu-biss/faivor-ml-validator
    ports:
      - "8000:8000"
```

- Backend API available at `http://localhost:8000`
- Health check endpoint: `GET /`
- CSV validation: `POST /validate-csv/`
- Model validation: `POST /validate-model`
- Provides ML validation engine integration with FAIR metadata format

#### API Integration Testing

Test the backend integration:

```bash
# Health check
curl http://localhost:8000/

# CSV validation test (requires proper FAIR metadata JSON and CSV file)
curl -X POST http://localhost:8000/validate-csv/ \
  -F "model_metadata=@path/to/metadata.json" \
  -F "csv_file=@path/to/data.csv"

# Model validation test
curl -X POST http://localhost:8000/validate-model \
  -F "model_metadata=@path/to/metadata.json" \
  -F "csv_file=@path/to/data.csv" \
  -F "data_metadata={}"
```

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
// src/lib/api/faivor-backend.ts - External API client
export class FaivorBackendAPI {
  private static readonly BASE_URL = "http://localhost:8000";

  static async startEvaluation(
    modelData: ModelEvaluationRequest
  ): Promise<EvaluationResponse> {
    const response = await fetch(`${this.BASE_URL}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(modelData),
    });

    if (!response.ok) {
      throw new Error(`Backend evaluation failed: ${response.statusText}`);
    }

    return await response.json();
  }

  static async getEvaluationStatus(jobId?: string): Promise<EvaluationStatus> {
    const response = await fetch(`${this.BASE_URL}/evaluation_status`);

    if (!response.ok) {
      throw new Error(
        `Failed to get evaluation status: ${response.statusText}`
      );
    }

    return await response.json();
  }

  static async getEvaluationResult(jobId?: string): Promise<EvaluationResult> {
    const response = await fetch(`${this.BASE_URL}/evaluation_result`);

    if (!response.ok) {
      throw new Error(
        `Failed to get evaluation result: ${response.statusText}`
      );
    }

    return await response.json();
  }
}

// src/lib/api/internal-api.ts - Internal API client
export class InternalAPI {
  static async saveValidation(validation: ModelValidation): Promise<void> {
    const response = await fetch("/api/validations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validation),
    });

    if (!response.ok) {
      throw new Error(`Failed to save validation: ${response.statusText}`);
    }
  }

  static async updateValidationStatus(
    validationId: string,
    status: ValidationStatus,
    results?: ValidationResult
  ): Promise<void> {
    const response = await fetch(`/api/validations/${validationId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, results }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update validation: ${response.statusText}`);
    }
  }
}

// src/routes/api/validations/+server.ts - Route handler
export async function POST({ request, locals }) {
  try {
    const session = await locals.auth();
    const formData = await request.json();

    // Start backend validation
    const jobId = await ValidationService.startValidation(formData);

    // Save validation with pending status
    const validation = await ValidationRepository.create({
      ...formData,
      status: "pending",
      external_validation: { job_id: jobId },
    });

    // Start async polling for results
    ValidationPollingService.pollValidationStatus(jobId, validation.val_id);

    return json({ success: true, validation });
  } catch (error) {
    console.error("Validation creation failed:", error);
    return json({ error: error.message }, { status: 500 });
  }
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
  backendApiUrl: "http://localhost:8000",
  pollingInterval: 5000, // 5 seconds
  maxPollingAttempts: 120, // 10 minutes
  timeoutDuration: 600000, // 10 minutes in milliseconds
};

// src/lib/config/backend-api.ts
export const backendApiConfig = {
  baseUrl: process.env.FAIVOR_BACKEND_URL || "http://localhost:8000",
  endpoints: {
    evaluate: "/evaluate",
    status: "/evaluation_status",
    result: "/evaluation_result",
    health: "/",
  },
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
};

// src/lib/config/index.ts
export * from "./database";
export * from "./validation";
export * from "./backend-api";
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
