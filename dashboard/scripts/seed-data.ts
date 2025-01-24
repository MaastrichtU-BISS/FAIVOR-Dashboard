import { pool } from '../src/lib/db/db';
import { models } from '../src/routes/models/models-api-example';
import crypto from 'crypto';

// Generate SHA-256 hash
function generateSHA256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

// Clean existing data
async function cleanData() {
  console.log('Cleaning existing data...');
  await pool.query('DELETE FROM validations');
  await pool.query('DELETE FROM data_statistics');
  await pool.query('DELETE FROM model_checkpoints');
  console.log('Data cleaned successfully');
}

// Insert model checkpoints
async function seedModels() {
  console.log('Seeding models...');

  for (const model of models) {
    const checkpointId = generateSHA256(model.name);
    const metadata = {
      applicabilityCriteria: model.applicabilityCriteria,
      primaryIntendedUse: model.primaryIntendedUse,
      users: model.users,
      reference: model.reference,
      datasetRequirements: model.datasetRequirements,
      metricsAndValidation: model.metricsAndValidation
    };

    await pool.query(
      `INSERT INTO model_checkpoints
       (checkpoint_id, fair_model_id, fair_model_url, metadata, description)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (checkpoint_id) DO UPDATE
       SET fair_model_id = $2,
           fair_model_url = $3,
           metadata = $4,
           description = $5`,
      [
        checkpointId,
        model.name,
        model.reference.codeRepository,
        JSON.stringify(metadata),
        model.description
      ]
    );

    // Add validation records
    const validationStatus = model.status === 'Done'
      ? 'completed'
      : model.status === 'Failed'
        ? 'failed'
        : 'running';

    await pool.query(
      `INSERT INTO validations
       (model_checkpoint_id, fair_model_id, validation_status, validation_result, start_datetime)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        checkpointId,
        model.name,
        validationStatus,
        JSON.stringify({
          metrics: model.metricsAndValidation.metrics,
          validationDataset: model.metricsAndValidation.validationDataset,
          crossValidation: model.metricsAndValidation.crossValidation
        })
      ]
    );

    // Add data statistics
    await pool.query(
      `INSERT INTO data_statistics
       (hash, statistics, data_type, additional_desc)
       VALUES ($1, $2, $3, $4)`,
      [
        generateSHA256(model.name + '_stats'),
        JSON.stringify(model.metricsAndValidation.metrics),
        'training',
        `Training data statistics for ${model.name}`
      ]
    );
  }

  console.log('Seeding completed successfully');
}

async function main() {
  try {
    const shouldClean = process.argv.includes('--clean');

    if (shouldClean) {
      await cleanData();
    }

    await seedModels();
    console.log('All done! 🌱');
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
