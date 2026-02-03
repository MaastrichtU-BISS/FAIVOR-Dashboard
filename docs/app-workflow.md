# FAIVOR-ML-Validator: Complete Application Workflow Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [API Endpoints](#api-endpoints)
4. [Core Components](#core-components)
5. [Workflow Process](#workflow-process)
6. [Docker Integration](#docker-integration)
7. [Metrics System](#metrics-system)
8. [Data Flow](#data-flow)
9. [Model Metadata Structure](#model-metadata-structure)
10. [Deployment](#deployment)

## Project Overview

FAIVOR-ML-Validator is a comprehensive validation system for FAIR (Findable, Accessible, Interoperable, Reusable) machine learning models. It provides a REST API service built with FastAPI that enables:

- **Model Validation**: Validates ML models against FAIR principles
- **Containerized Execution**: Runs models in isolated Docker containers
- **Comprehensive Metrics**: Calculates performance, fairness, and explainability metrics
- **Model Type Support**: Handles both classification and regression models
- **Standardized Interface**: Provides a uniform API for diverse ML models

## Architecture

### System Components

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Dashboard (UI)    │────▶│  FAIVOR Backend  │────▶│ Docker Registry │
│    (SvelteKit)      │     │    (FastAPI)     │     │  (Model Images) │
└─────────────────────┘     └──────────────────┘     └─────────────────┘
           │                         │                         │
           ▼                         ▼                         ▼
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    PostgreSQL       │     │ Model Container  │     │ Model Container │
│    (Database)       │     │   (Instance 1)   │     │   (Instance N)  │
└─────────────────────┘     └──────────────────┘     └─────────────────┘
```

### Docker Compose Services

1. **faivor-backend**: Main validation API service (port 8000)
2. **postgres**: PostgreSQL database for storing validation results
3. **dashboard**: Web interface for interacting with the system (port 5173)
4. **migrate**: Database migration service
5. **seed**: Optional service for seeding the database

## API Endpoints

### 1. Root Endpoint
- **GET** `/`
- Returns welcome message
- Used for health checks

### 2. Validate CSV Format
- **POST** `/validate-csv/`
- **Purpose**: Validates CSV data against model metadata
- **Parameters**:
  - `model_metadata` (Form): FAIR model metadata JSON
  - `csv_file` (File): CSV file to validate
  - `column_metadata` (Form, optional): Column naming mappings
- **Response**:
  ```json
  {
    "valid": true,
    "message": null,
    "csv_columns": ["col1", "col2"],
    "model_input_columns": ["input1", "input2"]
  }
  ```

### 3. Retrieve Metrics
- **POST** `/retrieve-metrics`
- **Purpose**: Returns available metrics for the model type
- **Parameters**:
  - `model_metadata` (Form): FAIR model metadata JSON
- **Response**: List of metric descriptions with name, description, and type

### 4. Validate Model (Main Endpoint)
- **POST** `/validate-model`
- **Purpose**: Executes model and calculates all metrics
- **Parameters**:
  - `model_metadata` (Form): FAIR model metadata JSON
  - `csv_file` (File): CSV file with test data
  - `column_metadata` (Form, optional): Column metadata for mappings
- **Response**: Comprehensive metrics results

## Core Components

### 1. API Controller (`api_controller.py`)
- Main FastAPI application
- Handles HTTP requests and responses
- Manages CORS for frontend integration
- Orchestrates the validation workflow

### 2. Model Metadata Handler (`model_metadata.py`)
- Parses FAIR model metadata in JSON-LD format
- Extracts:
  - Model information (name, description, author)
  - Input features with data types
  - Output labels
  - Docker image reference
  - Model type (classification/regression)
See guide for JSON-LD format https://github.com/MaastrichtU-BISS/FAIVOR-Dashboard/blob/main/docs/JSON_Schema_Guide.md

### 3. Data Parser (`parse_data.py`)
- Detects CSV delimiters automatically
- Validates data format against model requirements
- Handles column name mappings
- Creates JSON payloads for model execution

### 4. Docker Runner (`run_docker.py`)
- Manages Docker container lifecycle
- Key functions:
  - `start_docker_container()`: Launches model container
  - `wait_for_container()`: Ensures container readiness
  - `request_prediction()`: Sends data to model
  - `get_status_code()`: Monitors execution status
  - `retrieve_result()`: Collects predictions
  - `stop_docker_container()`: Cleanup

### 5. Metrics Calculator (`calculate_metrics.py`)
- Calculates three categories of metrics:
  - **Performance**: Accuracy, precision, recall, F1, etc.
  - **Fairness**: Demographic parity, equal opportunity
  - **Explainability**: Feature importance ratios
- Special features:
  - Threshold analysis for classification
  - Subgroup analysis for categorical features
  - Probability preprocessing for classification models

## Workflow Process

### Step-by-Step Validation Flow

1. **Data Upload**
   - User uploads model metadata (JSON-LD format)
   - User uploads test data (CSV format)
   - Optional: Column metadata for name mappings

2. **Validation Phase**
   - System validates CSV format against model requirements
   - Checks for required input columns
   - Verifies data types and ranges

3. **Model Execution**
   - System pulls Docker image specified in metadata
   - Starts container on random free port
   - Waits for container to be ready

4. **Prediction Process**
   - Sends JSON payload to `/predict` endpoint
   - Monitors status via `/status` endpoint
   - Status codes:
     - 0: No prediction requested
     - 1: Prediction requested
     - 2: Prediction in progress
     - 3: Prediction completed
     - 4: Prediction failed

5. **Results Collection**
   - Retrieves predictions from `/result` endpoint
   - Stops and removes container

6. **Metrics Calculation**
   - Compares predictions with expected outputs
   - Calculates comprehensive metrics
   - Performs threshold analysis (classification)
   - Conducts subgroup analysis (if categorical features)

7. **Response Generation**
   - Returns JSON with all calculated metrics
   - Includes model information and validation status

## Docker Integration

### Container Requirements

Models must expose three endpoints:
1. **POST** `/predict` - Accepts input data
2. **GET** `/status` - Returns execution status
3. **GET** `/result` - Returns predictions

### Container Communication Flow

```
FAIVOR Backend                    Model Container
     │                                   │
     ├──POST /predict──────────────────▶│
     │   (input data)                    │
     │                                   │
     ├──GET /status────────────────────▶│
     │◀─────────(status: 2)──────────────┤
     │                                   │
     ├──GET /status────────────────────▶│
     │◀─────────(status: 3)──────────────┤
     │                                   │
     ├──GET /result────────────────────▶│
     │◀────────(predictions)─────────────┤
     │                                   │
```

### Dynamic Port Management
- System finds free ports automatically
- Containers are isolated per validation request
- Automatic cleanup after validation

## Metrics System

### Classification Metrics

**Performance Metrics**:
- Accuracy
- Precision
- Recall
- F1 Score
- ROC AUC
- Average Precision

**Fairness Metrics**:
- Demographic Parity Ratio
- Equal Opportunity Difference
- Disparate Impact

**Explainability Metrics**:
- Feature Importance Ratio
- Model Complexity Measures

### Regression Metrics

**Performance Metrics**:
- Mean Squared Error (MSE)
- Root Mean Squared Error (RMSE)
- Mean Absolute Error (MAE)
- R-squared (R²)
- Mean Absolute Percentage Error (MAPE)

**Fairness Metrics**:
- Group Loss Ratio
- Demographic Parity (adapted for regression)

**Explainability Metrics**:
- Feature Importance Distribution
- Prediction Variance Analysis

### Special Features

1. **Threshold Analysis** (Classification only)
   - Calculates metrics at 101 different thresholds (0.00 to 1.00)
   - Generates ROC and Precision-Recall curves
   - Provides confusion matrix at each threshold

2. **Probability Preprocessing**
   - Detects if outputs are probabilities or logits
   - Applies appropriate transformations:
     - Sigmoid for logits
     - Min-max scaling for shifted ranges
     - Clipping as fallback

3. **Subgroup Analysis**
   - Calculates metrics for each categorical feature value
   - Identifies potential bias in model performance
   - Includes sample size for statistical context

## Data Flow

### Input Data Structure

1. **Model Metadata** (JSON-LD):
   ```json
   {
     "General Model Information": {
       "Title": {"@value": "Model Name"},
       "FAIRmodels image name": {"@value": "docker.io/org/model:tag"}
     },
     "Input data1": [
       {
         "Input label": {"@value": "feature1"},
         "Type of input": {"@value": "n"}
       }
     ],
     "Outcome label": {"@value": "target"}
   }
   ```

2. **CSV Data**:
   - Must contain all required input columns
   - Must include the outcome/target column
   - Supports various delimiters (auto-detected)

3. **Column Metadata** (Optional):
   ```json
   {
     "columns": [
       {
         "id": "1",
         "name_csv": "csv_column_name",
         "name_model": "model_expected_name",
         "categorical": true
       }
     ]
   }
   ```

### Output Data Structure

```json
{
  "model_name": "Model Name",
  "metrics": {
    "overall_metrics": {
      "performance.accuracy": 0.85,
      "fairness.demographic_parity_ratio": 0.95,
      "explainability.feature_importance_ratio": {...}
    },
    "threshold_metrics": {
      "probability_preprocessing": "Applied sigmoid transformation",
      "roc_curve": {...},
      "pr_curve": {...},
      "threshold_metrics": {...}
    }
  }
}
```

## Model Metadata Structure

The system uses a comprehensive JSON-LD format for model metadata following FAIR principles:

### Key Sections:

1. **General Model Information**
   - Title, description, author
   - Docker image reference
   - Creation date, references

2. **Input Data Specification**
   - Input features with labels
   - Data types (numerical/categorical)
   - Min/max ranges for validation
   - Feature descriptions

3. **Outcome Specification**
   - Output label
   - Output type (probability/value)

4. **Model Context**
   - Intended use cases
   - Applicability criteria
   - Risk assessments
   - Mitigation strategies

5. **Previous Evaluations**
   - Historical performance metrics
   - Test datasets used
   - Confidence intervals

## Deployment

### Local Development

1. **Prerequisites**:
   - Docker and Docker Compose
   - Python 3.11+
   - Poetry (for Python dependencies)

2. **Setup**:
   ```bash
   # Clone repository
   git clone <repository-url>

   # Install Python dependencies
   cd FAIVOR-ML-Validator
   poetry install
   poetry shell

   # Start services
   docker-compose up
   ```

3. **Access Points**:
   - API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - Dashboard: http://localhost:5173

### Production Deployment

1. **Environment Variables**:
   - Configure `.env` file in dashboard directory
   - Set database credentials
   - Configure CORS origins

2. **Docker Registry**:
   - Models must be available in accessible registry
   - Use private registry for proprietary models

3. **Security Considerations**:
   - Implement authentication for API
   - Use HTTPS in production
   - Limit CORS origins
   - Secure database connections

### Monitoring and Maintenance

1. **Health Checks**:
   - Monitor API endpoint availability
   - Check database connectivity
   - Verify Docker daemon status

2. **Logging**:
   - API request/response logging
   - Model execution logs
   - Error tracking

3. **Performance**:
   - Container startup time optimization
   - Concurrent validation handling
   - Database query optimization

## Conclusion

FAIVOR-ML-Validator provides a robust, standardized approach to validating FAIR machine learning models. Its containerized architecture ensures isolation and reproducibility, while the comprehensive metrics system enables thorough model evaluation across performance, fairness, and explainability dimensions.

The system's modular design allows for easy extension with new metrics, model types, and validation criteria, making it a flexible solution for ML model validation in research and production environments.
