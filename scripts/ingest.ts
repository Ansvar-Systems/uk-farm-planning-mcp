#!/usr/bin/env tsx
/**
 * Ingestion script for UK Farm Planning MCP.
 *
 * Currently seeds the database from hardcoded data. Future versions will
 * fetch from AHDB, HMRC, and legislation.gov.uk APIs.
 *
 * Usage:
 *   npm run ingest
 *   npm run ingest:fetch  (--fetch-only: download sources without rebuilding)
 */

import { createDatabase } from '../src/db.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'data', 'database.db');

console.log('Ingesting UK farm planning data...');
console.log(`Database: ${dbPath}`);

const db = createDatabase(dbPath);

// Set metadata
const today = new Date().toISOString().split('T')[0];
db.run("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('last_ingest', ?)", [today]);
db.run("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('build_date', ?)", [today]);

console.log(`Ingest complete. Date: ${today}`);
db.close();
