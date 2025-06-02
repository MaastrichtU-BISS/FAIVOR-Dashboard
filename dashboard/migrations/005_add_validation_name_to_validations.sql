-- Up Migration
ALTER TABLE validations
ADD COLUMN validation_name TEXT;

COMMENT ON COLUMN validations.validation_name IS 'User-defined name for the validation job to help identify and organize validations';

-- Down Migration
-- ALTER TABLE validations
-- DROP COLUMN validation_name;
