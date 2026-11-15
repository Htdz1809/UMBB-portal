'use strict';

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (error) => {
  console.error('[db] Unexpected idle client error:', error.message);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function waitForDatabase({ attempts = 30, delayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      console.log('[db] Connection established.');
      return;
    } catch (error) {
      console.warn(
        `[db] Database not ready (attempt ${attempt}/${attempts}): ${error.message}`
      );
      if (attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

function readSqlFile(name) {
  return fs.readFileSync(path.join(config.rootDir, 'db', name), 'utf8');
}

async function ensureSchema() {
  await pool.query(readSqlFile('schema.sql'));
  console.log('[db] Schema verified.');
}

async function seed() {
  await pool.query(readSqlFile('seed.sql'));
  console.log('[db] Seed data verified.');
}

async function healthCheck() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

async function close() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  waitForDatabase,
  ensureSchema,
  seed,
  healthCheck,
  close,
};
