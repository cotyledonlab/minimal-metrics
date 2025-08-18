import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DATABASE_PATH || './data/metrics.db';
const dbDir = dirname(dbPath);

mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);

const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');

try {
  db.exec(schema);
  console.log('✓ Database initialized successfully');
  
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('✓ Created tables:', tables.map(t => t.name).join(', '));
  
} catch (error) {
  console.error('✗ Database initialization failed:', error);
  process.exit(1);
} finally {
  db.close();
}