-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Clean existing data
DELETE FROM validations;
DELETE FROM data_statistics;
DELETE FROM model_checkpoints;

-- Seed models data
-- DeepLabV3+ Segmentation Model
WITH model_data AS (
  SELECT
    encode(digest('DeepLabV3+ Segmentation Model', 'sha256'), 'hex') as checkpoint_id,
    'DeepLabV3+ Segmentation Model' as model_name,
    'https://github.com/tensorflow/models/tree/master/research/deeplab' as model_url,
    'Advanced semantic segmentation model based on DeepLabV3+ architecture with enhanced atrous spatial pyramid pooling' as description,
    jsonb_build_object(
      'applicabilityCriteria', jsonb_build_array(
        'High-resolution medical imaging data',
        'Minimum input resolution of 512x512 pixels',
        'RGB or grayscale input formats'
      ),
      'primaryIntendedUse', 'Medical image segmentation for tumor detection and organ boundary delineation',
      'users', jsonb_build_object(
        'intendedUsers', jsonb_build_array('Medical imaging specialists', 'Radiologists', 'Clinical researchers'),
        'requiredExpertise', 'Advanced knowledge in medical imaging and basic ML model deployment'
      ),
      'reference', jsonb_build_object(
        'paper', 'https://arxiv.org/abs/1802.02611',
        'codeRepository', 'https://github.com/tensorflow/models/tree/master/research/deeplab',
        'documentation', 'https://github.com/tensorflow/models/blob/master/research/deeplab/g3doc/model_zoo.md'
      ),
      'datasetRequirements', jsonb_build_object(
        'format', 'DICOM or NIfTI',
        'minimumSamples', 1000,
        'annotations', 'Pixel-level segmentation masks',
        'preprocessing', 'Intensity normalization and standard slice thickness'
      ),
      'metricsAndValidation', jsonb_build_object(
        'metrics', jsonb_build_object(
          'diceCoefficient', 0.92,
          'meanIoU', 0.89,
          'precision', 0.94,
          'recall', 0.91
        ),
        'validationDataset', 'MICCAI 2023 Challenge Dataset',
        'crossValidation', '5-fold cross-validation'
      )
    ) as metadata
)
INSERT INTO model_checkpoints (checkpoint_id, fair_model_id, fair_model_url, metadata, description)
SELECT checkpoint_id, model_name, model_url, metadata, description
FROM model_data;

-- Insert validation for DeepLabV3+
INSERT INTO validations (model_checkpoint_id, fair_model_id, validation_status, data, start_datetime)
SELECT
  encode(digest('DeepLabV3+ Segmentation Model', 'sha256'), 'hex'),
  'DeepLabV3+ Segmentation Model',
  'completed',
  jsonb_build_object(
    'validation_name', 'Medical Imaging Validation',
    'dataset_info', jsonb_build_object(
      'userName', 'Medical Imaging Team',
      'date', '2024-06-01',
      'datasetName', 'MICCAI 2023 Challenge Dataset',
      'description', 'Comprehensive medical imaging dataset for tumor detection',
      'characteristics', 'High-resolution CT and MRI scans with pixel-level annotations'
    ),
    'validation_result', jsonb_build_object(
      'dataProvided', true,
      'dataCharacteristics', true,
      'metrics', true,
      'published', true,
      'fairness_metrics', jsonb_build_object(
        'diceCoefficient', 0.92,
        'meanIoU', 0.89,
        'precision', 0.94,
        'recall', 0.91
      ),
      'performance_metrics', jsonb_build_object(
        'validationDataset', 'MICCAI 2023 Challenge Dataset',
        'crossValidation', '5-fold cross-validation'
      ),
      'metrics_description', 'Comprehensive evaluation using standard medical imaging metrics',
      'performance_description', 'Excellent performance on medical imaging segmentation tasks'
    ),
    'metadata', jsonb_build_object(
      'validation_type', 'medical_imaging',
      'domain', 'healthcare'
    )
  ),
  NOW();

-- Insert data statistics for DeepLabV3+
INSERT INTO data_statistics (hash, statistics, data_type, additional_desc)
SELECT
  encode(digest('DeepLabV3+ Segmentation Model_stats', 'sha256'), 'hex'),
  jsonb_build_object(
    'diceCoefficient', 0.92,
    'meanIoU', 0.89,
    'precision', 0.94,
    'recall', 0.91
  ),
  'training',
  'Training data statistics for DeepLabV3+ Segmentation Model';

-- LightGBM Time Series Forecaster
WITH model_data AS (
  SELECT
    encode(digest('LightGBM Time Series Forecaster', 'sha256'), 'hex') as checkpoint_id,
    'LightGBM Time Series Forecaster' as model_name,
    'https://github.com/microsoft/LightGBM' as model_url,
    'Gradient boosting framework optimized for time series forecasting with custom feature engineering' as description,
    jsonb_build_object(
      'applicabilityCriteria', jsonb_build_array(
        'Temporal data with minimum 1000 timestamps',
        'Regular time intervals required',
        'Supports multiple seasonality patterns'
      ),
      'primaryIntendedUse', 'Energy consumption forecasting and demand prediction',
      'users', jsonb_build_object(
        'intendedUsers', jsonb_build_array('Data scientists', 'Energy analysts', 'Utility companies'),
        'requiredExpertise', 'Time series analysis and feature engineering'
      ),
      'reference', jsonb_build_object(
        'paper', 'https://papers.nips.cc/paper/6907-lightgbm-a-highly-efficient-gradient-boosting',
        'codeRepository', 'https://github.com/microsoft/LightGBM',
        'documentation', 'https://lightgbm.readthedocs.io/en/latest/'
      ),
      'datasetRequirements', jsonb_build_object(
        'format', 'CSV with timestamp column',
        'minimumSamples', '1000 time points',
        'features', 'At least 3 numerical features',
        'preprocessing', 'Handling missing values and outliers'
      ),
      'metricsAndValidation', jsonb_build_object(
        'metrics', jsonb_build_object(
          'mape', 4.2,
          'rmse', 0.087,
          'mae', 0.065,
          'r2Score', 0.93
        ),
        'validationDataset', 'Public utility data 2022-2023',
        'crossValidation', 'Time series walk-forward validation'
      )
    ) as metadata
)
INSERT INTO model_checkpoints (checkpoint_id, fair_model_id, fair_model_url, metadata, description)
SELECT checkpoint_id, model_name, model_url, metadata, description
FROM model_data;

-- Insert validation for LightGBM
INSERT INTO validations (model_checkpoint_id, fair_model_id, validation_status, data, start_datetime)
SELECT
  encode(digest('LightGBM Time Series Forecaster', 'sha256'), 'hex'),
  'LightGBM Time Series Forecaster',
  'completed',
  jsonb_build_object(
    'validation_name', 'Energy Forecasting Validation',
    'dataset_info', jsonb_build_object(
      'userName', 'Energy Analytics Team',
      'date', '2024-05-15',
      'datasetName', 'Public utility data 2022-2023',
      'description', 'Comprehensive energy consumption data with seasonal patterns',
      'characteristics', 'Hourly energy consumption data with weather features'
    ),
    'validation_result', jsonb_build_object(
      'dataProvided', true,
      'dataCharacteristics', true,
      'metrics', true,
      'published', true,
      'performance_metrics', jsonb_build_object(
        'mape', 4.2,
        'rmse', 0.087,
        'mae', 0.065,
        'r2Score', 0.93
      ),
      'metrics_description', 'Time series forecasting evaluation using standard regression metrics',
      'performance_description', 'Excellent performance on energy demand forecasting with low error rates'
    ),
    'configuration', jsonb_build_object(
      'validation_parameters', jsonb_build_object(
        'crossValidation', 'Time series walk-forward validation',
        'testSize', 0.2,
        'seasonality', 'daily_weekly'
      )
    ),
    'metadata', jsonb_build_object(
      'validation_type', 'time_series_forecasting',
      'domain', 'energy'
    )
  ),
  NOW();

-- Insert data statistics for LightGBM
INSERT INTO data_statistics (hash, statistics, data_type, additional_desc)
SELECT
  encode(digest('LightGBM Time Series Forecaster_stats', 'sha256'), 'hex'),
  jsonb_build_object(
    'mape', 4.2,
    'rmse', 0.087,
    'mae', 0.065,
    'r2Score', 0.93
  ),
  'training',
  'Training data statistics for LightGBM Time Series Forecaster';

-- Insert additional validations for LightGBM Time Series Forecaster (Industrial IoT)
INSERT INTO validations (model_checkpoint_id, fair_model_id, validation_status, data, start_datetime)
SELECT
  encode(digest('LightGBM Time Series Forecaster', 'sha256'), 'hex'),
  'LightGBM Time Series Forecaster',
  'running',
  jsonb_build_object(
    'validation_name', 'Industrial IoT Sensor Validation',
    'dataset_info', jsonb_build_object(
      'userName', 'IoT Analytics Team',
      'date', '2024-06-01',
      'datasetName', 'Industrial IoT sensor data 2023-2024',
      'description', 'Multi-sensor industrial monitoring data',
      'characteristics', 'High-frequency sensor readings with anomaly detection'
    ),
    'validation_result', jsonb_build_object(
      'dataProvided', true,
      'dataCharacteristics', true,
      'metrics', true,
      'performance_metrics', jsonb_build_object(
        'mape', 3.8,
        'rmse', 0.072,
        'mae', 0.058,
        'r2Score', 0.95
      )
    ),
    'configuration', jsonb_build_object(
      'validation_parameters', jsonb_build_object(
        'crossValidation', 'Sequential time series validation'
      )
    ),
    'metadata', jsonb_build_object(
      'validation_type', 'industrial_monitoring',
      'domain', 'manufacturing'
    )
  ),
  NOW() - interval '2 hours';

-- Insert failed validation for LightGBM (Financial Market Data)
INSERT INTO validations (model_checkpoint_id, fair_model_id, validation_status, data, start_datetime)
SELECT
  encode(digest('LightGBM Time Series Forecaster', 'sha256'), 'hex'),
  'LightGBM Time Series Forecaster',
  'failed',
  jsonb_build_object(
    'validation_name', 'Financial Market Forecasting',
    'dataset_info', jsonb_build_object(
      'userName', 'Quantitative Analysis Team',
      'date', '2024-05-30',
      'datasetName', 'Financial market data 2023',
      'description', 'High-frequency trading data with market indicators',
      'characteristics', 'Minute-level stock prices with volatility features'
    ),
    'validation_result', jsonb_build_object(
      'dataProvided', true,
      'dataCharacteristics', true,
      'metrics', true,
      'performance_metrics', jsonb_build_object(
        'mape', 12.5,
        'rmse', 0.245,
        'mae', 0.198,
        'r2Score', 0.67
      ),
      'metrics_description', 'Performance below acceptable thresholds for financial forecasting',
      'performance_description', 'Model showed poor performance on volatile market conditions'
    ),
    'configuration', jsonb_build_object(
      'validation_parameters', jsonb_build_object(
        'crossValidation', 'Time series walk-forward validation',
        'failureReason', 'Performance metrics below acceptable thresholds for financial forecasting'
      )
    ),
    'metadata', jsonb_build_object(
      'validation_type', 'financial_forecasting',
      'domain', 'finance',
      'failure_analysis', 'High volatility periods caused significant prediction errors'
    )
  ),
  NOW() - interval '1 day';

-- Insert completed validation for LightGBM (Weather Data)
INSERT INTO validations (model_checkpoint_id, fair_model_id, validation_status, data, start_datetime)
SELECT
  encode(digest('LightGBM Time Series Forecaster', 'sha256'), 'hex'),
  'LightGBM Time Series Forecaster',
  'completed',
  jsonb_build_object(
    'validation_name', 'Weather Forecasting Validation',
    'dataset_info', jsonb_build_object(
      'userName', 'Meteorology Research Team',
      'date', '2024-06-01',
      'datasetName', 'Weather forecasting data 2022-2024',
      'description', 'Comprehensive weather station data with atmospheric conditions',
      'characteristics', 'Multi-parameter weather data with geographical features'
    ),
    'validation_result', jsonb_build_object(
      'dataProvided', true,
      'dataCharacteristics', true,
      'metrics', true,
      'published', true,
      'performance_metrics', jsonb_build_object(
        'mape', 4.5,
        'rmse', 0.092,
        'mae', 0.071,
        'r2Score', 0.91
      ),
      'metrics_description', 'Weather forecasting evaluation with seasonal adjustment',
      'performance_description', 'Strong performance across different weather patterns and seasons'
    ),
    'configuration', jsonb_build_object(
      'validation_parameters', jsonb_build_object(
        'crossValidation', 'Rolling window validation',
        'seasonality', 'monthly_yearly'
      )
    ),
    'metadata', jsonb_build_object(
      'validation_type', 'weather_forecasting',
      'domain', 'meteorology'
    )
  ),
  NOW() - interval '12 hours';

-- BERT-Based Text Classifier
WITH model_data AS (
  SELECT
    encode(digest('BERT-Based Text Classifier', 'sha256'), 'hex') as checkpoint_id,
    'BERT-Based Text Classifier' as model_name,
    'https://github.com/google-research/bert' as model_url,
    'Fine-tuned BERT model for multi-label document classification with domain adaptation' as description,
    jsonb_build_object(
      'applicabilityCriteria', jsonb_build_array(
        'Text documents in supported languages (EN, ES, FR)',
        'Maximum sequence length of 512 tokens',
        'Plain text or HTML format'
      ),
      'primaryIntendedUse', 'Scientific publication classification and topic modeling',
      'users', jsonb_build_object(
        'intendedUsers', jsonb_build_array('Research librarians', 'Content managers', 'Academic institutions'),
        'requiredExpertise', 'Basic NLP knowledge and data preprocessing skills'
      ),
      'reference', jsonb_build_object(
        'paper', 'https://arxiv.org/abs/1810.04805',
        'codeRepository', 'https://github.com/google-research/bert',
        'documentation', 'https://huggingface.co/docs/transformers/model_doc/bert'
      ),
      'datasetRequirements', jsonb_build_object(
        'format', 'TXT or JSON',
        'minimumSamples', '10000 documents',
        'labeling', 'Multi-label classification schema',
        'preprocessing', 'Text cleaning and tokenization'
      ),
      'metricsAndValidation', jsonb_build_object(
        'metrics', jsonb_build_object(
          'f1Score', 0.88,
          'accuracy', 0.91,
          'precision', 0.89,
          'recall', 0.87
        ),
        'validationDataset', 'arXiv papers 2020-2023',
        'crossValidation', 'Stratified 5-fold'
      )
    ) as metadata
)
INSERT INTO model_checkpoints (checkpoint_id, fair_model_id, fair_model_url, metadata, description)
SELECT checkpoint_id, model_name, model_url, metadata, description
FROM model_data;

-- Insert validation for BERT
INSERT INTO validations (model_checkpoint_id, fair_model_id, validation_status, data, start_datetime)
SELECT
  encode(digest('BERT-Based Text Classifier', 'sha256'), 'hex'),
  'BERT-Based Text Classifier',
  'running',
  jsonb_build_object(
    'validation_name', 'Scientific Publication Classification',
    'dataset_info', jsonb_build_object(
      'userName', 'NLP Research Team',
      'date', '2024-06-02',
      'datasetName', 'arXiv papers 2020-2023',
      'description', 'Large-scale scientific publication dataset for topic classification',
      'characteristics', 'Multi-domain research papers with abstract and full-text content'
    ),
    'validation_result', jsonb_build_object(
      'dataProvided', true,
      'dataCharacteristics', true,
      'metrics', false,
      'performance_metrics', jsonb_build_object(
        'f1Score', 0.88,
        'accuracy', 0.91,
        'precision', 0.89,
        'recall', 0.87
      )
    ),
    'configuration', jsonb_build_object(
      'validation_parameters', jsonb_build_object(
        'max_sequence_length', 512,
        'batch_size', 16,
        'crossValidation', 'Stratified 5-fold'
      )
    ),
    'metadata', jsonb_build_object(
      'validation_type', 'text_classification',
      'domain', 'nlp'
    )
  ),
  NOW();

-- Insert data statistics for BERT
INSERT INTO data_statistics (hash, statistics, data_type, additional_desc)
SELECT
  encode(digest('BERT-Based Text Classifier_stats', 'sha256'), 'hex'),
  jsonb_build_object(
    'f1Score', 0.88,
    'accuracy', 0.91,
    'precision', 0.89,
    'recall', 0.87
  ),
  'training',
  'Training data statistics for BERT-Based Text Classifier';

-- ResNet50 Transfer Learning Model
WITH model_data AS (
  SELECT
    encode(digest('ResNet50 Transfer Learning Model', 'sha256'), 'hex') as checkpoint_id,
    'ResNet50 Transfer Learning Model' as model_name,
    'https://github.com/keras-team/keras-applications' as model_url,
    'Transfer learning implementation of ResNet50 for specialized image classification' as description,
    jsonb_build_object(
      'applicabilityCriteria', jsonb_build_array(
        'RGB images only',
        'Minimum resolution 224x224',
        'Maximum batch size of 32'
      ),
      'primaryIntendedUse', 'Industrial quality control and defect detection',
      'users', jsonb_build_object(
        'intendedUsers', jsonb_build_array('Quality control engineers', 'Manufacturing specialists', 'Production line managers'),
        'requiredExpertise', 'Computer vision basics and model deployment knowledge'
      ),
      'reference', jsonb_build_object(
        'paper', 'https://arxiv.org/abs/1512.03385',
        'codeRepository', 'https://github.com/keras-team/keras-applications',
        'documentation', 'https://keras.io/api/applications/resnet/'
      ),
      'datasetRequirements', jsonb_build_object(
        'format', 'JPG or PNG',
        'minimumSamples', '5000 per class',
        'annotations', 'Binary classification labels',
        'preprocessing', 'Resize and normalization'
      ),
      'metricsAndValidation', jsonb_build_object(
        'metrics', jsonb_build_object(
          'accuracy', 0.95,
          'precision', 0.94,
          'recall', 0.93,
          'f1Score', 0.935
        ),
        'validationDataset', 'Industrial defect dataset 2023',
        'crossValidation', '3-fold cross-validation'
      )
    ) as metadata
)
INSERT INTO model_checkpoints (checkpoint_id, fair_model_id, fair_model_url, metadata, description)
SELECT checkpoint_id, model_name, model_url, metadata, description
FROM model_data;

-- Insert validation for ResNet50
INSERT INTO validations (model_checkpoint_id, fair_model_id, validation_status, data, start_datetime)
SELECT
  encode(digest('ResNet50 Transfer Learning Model', 'sha256'), 'hex'),
  'ResNet50 Transfer Learning Model',
  'failed',
  jsonb_build_object(
    'validation_name', 'Industrial Quality Control Validation',
    'dataset_info', jsonb_build_object(
      'userName', 'Quality Control Team',
      'date', '2024-05-20',
      'datasetName', 'Industrial defect dataset 2023',
      'description', 'High-resolution images of manufactured products for defect detection',
      'characteristics', 'RGB images with binary classification labels for defect/no-defect'
    ),
    'validation_result', jsonb_build_object(
      'dataProvided', true,
      'dataCharacteristics', true,
      'metrics', true,
      'performance_metrics', jsonb_build_object(
        'accuracy', 0.95,
        'precision', 0.94,
        'recall', 0.93,
        'f1Score', 0.935
      ),
      'metrics_description', 'Computer vision evaluation with confusion matrix analysis',
      'performance_description', 'Model failed validation due to bias in defect detection across different product types'
    ),
    'configuration', jsonb_build_object(
      'validation_parameters', jsonb_build_object(
        'crossValidation', '3-fold cross-validation',
        'image_size', '224x224',
        'batch_size', 32,
        'failureReason', 'Bias detected in classification across different product categories'
      )
    ),
    'metadata', jsonb_build_object(
      'validation_type', 'computer_vision',
      'domain', 'manufacturing',
      'failure_analysis', 'Model shows significant bias toward certain product types'
    )
  ),
  NOW();

-- Insert data statistics for ResNet50
INSERT INTO data_statistics (hash, statistics, data_type, additional_desc)
SELECT
  encode(digest('ResNet50 Transfer Learning Model_stats', 'sha256'), 'hex'),
  jsonb_build_object(
    'accuracy', 0.95,
    'precision', 0.94,
    'recall', 0.93,
    'f1Score', 0.935
  ),
  'training',
  'Training data statistics for ResNet50 Transfer Learning Model';
