-- Up Migration
ALTER TABLE validations
ADD COLUMN deleted_at TIMESTAMPTZ;

-- Down Migration
ALTER TABLE validations
DROP COLUMN deleted_at;
