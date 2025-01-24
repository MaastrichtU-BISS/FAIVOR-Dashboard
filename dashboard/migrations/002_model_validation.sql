-- Up Migration

-- Create ENUMs
CREATE TYPE data_type_enum AS ENUM ('training', 'evaluation');
CREATE TYPE validation_status_enum AS ENUM ('pending', 'running', 'completed', 'failed');

-- Create Model Checkpoints table
CREATE TABLE model_checkpoints (
    checkpoint_id TEXT PRIMARY KEY, -- SHA-256
    fair_model_id TEXT NOT NULL,
    fair_model_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    description TEXT,
    training_dataset TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create Data Statistics table
CREATE TABLE data_statistics (
    ds_id SERIAL PRIMARY KEY,
    hash TEXT NOT NULL,
    statistics JSONB DEFAULT '{}'::jsonb,
    categorical_histograms JSONB DEFAULT '{}'::jsonb,
    data_type data_type_enum NOT NULL,
    additional_desc TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create Validations table
CREATE TABLE validations (
    val_id SERIAL PRIMARY KEY,
    model_checkpoint_id TEXT REFERENCES model_checkpoints(checkpoint_id),
    fair_model_id TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id),
    description TEXT,
    validation_result JSONB DEFAULT '{}'::jsonb,
    validation_status validation_status_enum DEFAULT 'pending',
    validation_dataset TEXT,
    start_datetime TIMESTAMPTZ,
    end_datetime TIMESTAMPTZ,
    fairvor_val_lib_version TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_model_checkpoints_fair_model_id ON model_checkpoints(fair_model_id);
CREATE INDEX idx_validations_model_checkpoint_id ON validations(model_checkpoint_id);
CREATE INDEX idx_validations_user_id ON validations(user_id);
CREATE INDEX idx_validations_status ON validations(validation_status);
CREATE INDEX idx_data_statistics_hash ON data_statistics(hash);
CREATE INDEX idx_data_statistics_data_type ON data_statistics(data_type);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_model_checkpoints_updated_at
    BEFORE UPDATE ON model_checkpoints
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_statistics_updated_at
    BEFORE UPDATE ON data_statistics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_validations_updated_at
    BEFORE UPDATE ON validations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Down Migration
DROP TRIGGER IF EXISTS update_validations_updated_at ON validations;
DROP TRIGGER IF EXISTS update_data_statistics_updated_at ON data_statistics;
DROP TRIGGER IF EXISTS update_model_checkpoints_updated_at ON model_checkpoints;
DROP FUNCTION IF EXISTS update_updated_at_column();

DROP TABLE IF EXISTS validations;
DROP TABLE IF EXISTS data_statistics;
DROP TABLE IF EXISTS model_checkpoints;

DROP TYPE IF EXISTS validation_status_enum;
DROP TYPE IF EXISTS data_type_enum;
