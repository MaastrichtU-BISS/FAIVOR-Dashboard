# FAIVOR Model Metadata JSON Schema Guide

## Overview

This guide explains the JSON structure required by the FAIVOR Dashboard's `ModelMetadata` class. The JSON file stores comprehensive metadata about AI models following the FAIR principles and CEDAR template standards used in the FAIRmodels registry.

## JSON Structure Explanation

### 1. **General Model Information**
Contains high-level metadata about the model.

```json
"General Model Information": {
  "Title": { "@value": "Model name" },
  "Editor Note": { "@value": "Brief description" },
  "Created by": { "@value": "Author name" },
  "Contact email": { "@value": "email@example.com" },
  "FAIRmodels image name": { "@value": "ghcr.io/org/model:version" },
  "References to papers": [
    { "@value": "https://doi.org/..." }
  ]
}
```

**Required Fields:**
- `Title` - Model name (parsed as `model_name`)
- `Editor Note` - Model description (parsed as `description`)
- `FAIRmodels image name` - Docker container image URI (parsed as `docker_image`)

**Optional Fields:**
- `Created by` - Author/creator
- `Contact email` - Contact information
- `References to papers` - Related publications

### 2. **Input data**
Array of input features/variables the model expects.

```json
"Input data": [
  {
    "Input label": { "@value": "feature_name" },
    "Description": { "@value": "Description of feature" },
    "Type of input": { "@value": "numeric|categorical|text" },
    "Input feature": { "rdfs:label": "http://ontology.uri" }
  }
]
```

**For Each Input Feature:**
- `Input label` - Machine-readable feature name (required)
- `Description` - Human-readable description
- `Type of input` - Data type (numeric, categorical, text, etc.)
- `Input feature.rdfs:label` - Semantic URI from ontology (e.g., SNOMED CT)

**Parsed Into:** `inputs` (List of `ModelInput` objects)

### 3. **Outcome label**
The model's output or target variable.

```json
"Outcome label": {
  "@value": "output_label_name"
}
```

**Parsed Into:** `output_label` and `output` (string)

### 4. **Output data**
Detailed information about model outputs.

```json
"Output data": {
  "Output label": { "@value": "Label" },
  "Description": { "@value": "Description" },
  "Type of output": { "@value": "probability|classification|regression" },
  "Output feature": { "rdfs:label": "http://ontology.uri" }
}
```

### 5. **Model Performance**
Training and evaluation metrics.

```json
"Model Performance": {
  "Training population": { "@value": "Dataset name" },
  "Training sample size": { "@value": "5000" },
  "Evaluation metrics": {
    "sensitivity": { "@value": "0.89" },
    "specificity": { "@value": "0.92" },
    "accuracy": { "@value": "0.91" },
    "precision": { "@value": "0.87" },
    "f1_score": { "@value": "0.88" },
    "auroc": { "@value": "0.94" }
  }
}
```

### 6. **Model Framework**
Technical framework and architecture details.

```json
"Model Framework": {
  "Framework": { "@value": "PyTorch|TensorFlow|scikit-learn" },
  "Framework version": { "@value": "2.0.1" },
  "Model architecture": { "@value": "Neural Network|Random Forest" },
  "Number of layers": { "@value": "5" }
}
```

### 7. **Dependencies**
Software dependencies and versions.

```json
"Dependencies": [
  {
    "Package name": { "@value": "torch" },
    "Package version": { "@value": "2.0.1" }
  },
  {
    "Package name": { "@value": "numpy" },
    "Package version": { "@value": "1.24.0" }
  }
]
```

### 8. **Known Limitations**
Important constraints and limitations.

```json
"Known Limitations": [
  { "@value": "Limitation 1" },
  { "@value": "Limitation 2" }
]
```

### 9. **Fairness Metrics**
Bias and fairness evaluation metrics.

```json
"Fairness Metrics": {
  "Demographic parity": { "@value": "0.92" },
  "Equalized odds": { "@value": "0.88" },
  "Calibration": { "@value": "0.95" },
  "Group disparities": {
    "Caucasian": { "@value": "0.94" },
    "African American": { "@value": "0.89" }
  }
}
```

### 10. **Model DOI**
Digital Object Identifier for persistent identification.

```json
"Model DOI": {
  "@value": "10.21384/faivor-diabetes-001"
}
```

### 11. **Model License**
Licensing information (SPDX identifier).

```json
"Model License": {
  "@value": "CC-BY-4.0"
}
```

### 12. **Container Information**
Docker container and registry details.

```json
"Container Information": {
  "Registry": { "@value": "ghcr.io" },
  "Registry type": { "@value": "GitHub Container Registry" },
  "Image URL": { "@value": "ghcr.io/org/model:version" },
  "Image digest": { "@value": "sha256:..." },
  "Base image": { "@value": "python:3.11-slim" },
  "Exposed port": { "@value": "8000" },
  "API endpoints": [
    { "@value": "/health" },
    { "@value": "/predict" }
  ],
  "Image size MB": { "@value": "1200" }
}
```

### 13. **FAIR Metadata**
Compliance with FAIR principles (Findable, Accessible, Interoperable, Reusable).

```json
"FAIR Metadata": {
  "Findable": {
    "DOI assigned": { "@value": "yes" },
    "Keywords": [ { "@value": "diabetes" } ],
    "Registered in searchable resource": { "@value": "yes" }
  },
  "Accessible": {
    "Persistent identifier": { "@value": "10.21384/..." },
    "Protocol": { "@value": "https" },
    "Authentication required": { "@value": "yes" }
  },
  "Interoperable": {
    "Standard format": { "@value": "Docker container" },
    "API specification": { "@value": "OpenAPI 3.1.0" },
    "Metadata schema": { "@value": "CEDAR templates" }
  },
  "Reusable": {
    "License": { "@value": "CC-BY-4.0" },
    "Provenance": { "@value": "..." },
    "Scope and limitations": { "@value": "..." }
  }
}
```

### 14. **Validation Information**
Historical validation results.

```json
"Validation Information": {
  "Previous validations": [
    {
      "hospital_id": { "@value": "hospital-001" },
      "validation_date": { "@value": "2025-12-15" },
      "status": { "@value": "passed" },
      "accuracy": { "@value": "0.91" },
      "sample_size": { "@value": "500" }
    }
  ],
  "Recommended validation frequency": { "@value": "quarterly" },
  "Last validated": { "@value": "2025-12-15" }
}
```

## Mapping to Python Class

The `ModelMetadata` class extracts the following attributes:

| Class Attribute | JSON Path | Data Type |
|---|---|---|
| `model_name` | `General Model Information > Title > @value` | str |
| `description` | `General Model Information > Editor Note > @value` | str |
| `docker_image` | `General Model Information > FAIRmodels image name > @value` | str |
| `author` | `General Model Information > Created by > @value` | str |
| `contact_email` | `General Model Information > Contact email > @value` | str |
| `references` | `General Model Information > References to papers[*] > @value` | List[str] |
| `inputs` | `Input data[*]` | List[ModelInput] |
| `output` | `Outcome label > @value` | str |
| `output_label` | `Outcome label > @value` | str |

## Usage Example

```python
import json
from model_metadata import ModelMetadata

# Load JSON file
with open('model_metadata.json', 'r') as f:
    metadata_dict = json.load(f)

# Create ModelMetadata object
metadata = ModelMetadata(metadata_dict)

# Access attributes
print(f"Model: {metadata.model_name}")
print(f"Docker Image: {metadata.docker_image}")
print(f"Author: {metadata.author}")

# Validate
if metadata.validate():
    print("Metadata is valid!")

# Get JSON representation
print(metadata)
```

## Validation Requirements

The `ModelMetadata.validate()` method checks for:

1. **model_name** - Must be present (not None or empty)
2. **inputs** - Must be present and non-empty list
3. **output** - Must be present (not None or empty)

## Data Type Conventions

### @value Pattern
Most fields follow the `{"@value": "actual_value"}` pattern. This is from CEDAR metadata templates and enables semantic tagging.

### Type of input Values
Common values:
- `numeric` - Continuous numerical data
- `categorical` - Discrete categories
- `text` - Free text input
- `datetime` - Date/time values
- `binary` - True/False values

### Type of output Values
- `probability` - Probability score [0, 1]
- `classification` - Class label
- `regression` - Continuous value
- `risk_score` - Risk stratification

## Ontology URIs

Input/output features should reference standard ontologies:

**SNOMED CT (Clinical Terms):**
- BMI: `http://purl.bioontology.org/ontology/SNOMEDCT/60621009`
- Blood Glucose: `http://purl.bioontology.org/ontology/SNOMEDCT/34284009`
- Systolic BP: `http://purl.bioontology.org/ontology/SNOMEDCT/271649006`
- Diastolic BP: `http://purl.bioontology.org/ontology/SNOMEDCT/271650006`

**UMLS Semantic Types (STY):**
- T001: Organism
- T005: Virus
- etc.

Reference: https://bioportal.bioontology.org/

## Best Practices

1. **Always include Docker image name** - Essential for container deployment
2. **Use semantic URIs** - Link to ontologies for interoperability
3. **Document limitations** - Critical for responsible AI
4. **Include fairness metrics** - Address bias and equity
5. **Provide contact information** - Enable model stewardship
6. **Reference source datasets** - Enable reproducibility
7. **Version everything** - Track changes over time
8. **Use FAIR-compliant structure** - Follow standard patterns

## Example: Minimal Valid JSON

```json
{
  "General Model Information": {
    "Title": { "@value": "Simple Model" },
    "Editor Note": { "@value": "A basic model" },
    "FAIRmodels image name": { "@value": "ghcr.io/org/model:v1.0" }
  },
  "Input data": [
    {
      "Input label": { "@value": "feature1" },
      "Type of input": { "@value": "numeric" }
    }
  ],
  "Outcome label": { "@value": "output_var" }
}
```

This minimal structure is sufficient to create a valid `ModelMetadata` object.

## Complete Example File

See `model_metadata_schema.json` for a complete, production-ready example with:
- 10 input features (age, BMI, cholesterol, etc.)
- Complete model performance metrics
- Framework and dependency details
- Known limitations and fairness metrics
- Container information
- FAIR compliance documentation
- Validation history

---

**Created**: February 2026  
**Last Updated**: February 3, 2026  
**Version**: 1.0

