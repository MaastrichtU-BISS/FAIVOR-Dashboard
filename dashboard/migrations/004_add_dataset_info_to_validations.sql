-- Up Migration
ALTER TABLE validations
ADD COLUMN dataset_info JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN validations.dataset_info IS 'Stores dataset information such as dataset name, username, date, description, characteristics, etc.';

-- Down Migration
ALTER TABLE validations
DROP COLUMN dataset_info;
