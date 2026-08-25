import { env } from "$env/dynamic/private"

import { dev } from '$app/environment';

import postgres from 'postgres';
import pkg from 'pg';
const { Pool } = pkg;

const dbaccess = {
  host: env.DB_HOST || 'localhost',
  port: Number(env.DB_PORT) || 5432,
  user: env.DB_USER || 'postgres',
  password: env.DB_PASSWORD || '',
  database: env.DB_NAME || 'faivor',
  ssl: dev ? false : true,
  max: 5, // Lower max connections since this is only for auth
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
};
// Configure postgres.js connection for application queries
export const sql = postgres(dbaccess);

// Configure pg Pool for auth adapter
export const pool = new Pool(dbaccess);

// Log which environment we're using
console.log(`Database connected in ${dev ? 'development' : 'production'} mode`);

// Close connections gracefully when the application is shutting down
process.on('SIGINT', async () => {
  await Promise.all([
    sql.end(),
    pool.end()
  ]);
  console.log('Database connections closed');
  process.exit(0);
});
