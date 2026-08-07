import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { initDatabase, saveDatabase } from './database.js';
import db from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, 'migrations');

async function runMigrations() {
  console.log('Initializing database...');
  await initDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const applied = db.prepare('SELECT name FROM _migrations').all().map(r => r.name);

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js'))
    .sort();

  for (const file of files) {
    if (applied.includes(file)) {
      console.log(`  Skipping (already applied): ${file}`);
      continue;
    }

    console.log(`  Applying: ${file}`);
    const migration = await import(pathToFileURL(path.join(migrationsDir, file)).href);

    try {
      db.exec(migration.up);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
      saveDatabase();
      console.log(`  Applied successfully: ${file}`);
    } catch (err) {
      console.error(`  Failed to apply ${file}:`, err.message);
      process.exit(1);
    }
  }

  console.log('\nAll migrations applied successfully!');
  process.exit(0);
}

async function rollbackMigration() {
  console.log('Initializing database...');
  await initDatabase();

  const applied = db.prepare('SELECT name FROM _migrations ORDER BY id DESC LIMIT 1').all();
  if (!applied.length) {
    console.log('No migrations to rollback.');
    process.exit(0);
  }

  const lastMigration = applied[0].name;
  console.log(`Rolling back: ${lastMigration}`);

  const migration = await import(pathToFileURL(path.join(migrationsDir, lastMigration)).href);
  try {
    db.exec(migration.down);
    db.prepare('DELETE FROM _migrations WHERE name = ?').run(lastMigration);
    saveDatabase();
    console.log('Rolled back successfully!');
  } catch (err) {
    console.error('Rollback failed:', err.message);
    process.exit(1);
  }

  process.exit(0);
}

async function status() {
  await initDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const applied = db.prepare('SELECT name, applied_at FROM _migrations ORDER BY id').all().map(r => r.name);
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js')).sort();

  console.log('\nMigration Status:');
  console.log('─'.repeat(50));
  for (const file of files) {
    const isApplied = applied.includes(file);
    console.log(`  ${isApplied ? '✓' : '○'} ${file}`);
  }
  console.log('─'.repeat(50));
  console.log(`  ${applied.length}/${files.length} migrations applied\n`);
  process.exit(0);
}

const command = process.argv[2];

switch (command) {
  case 'up':
    runMigrations();
    break;
  case 'down':
    rollbackMigration();
    break;
  case 'status':
    status();
    break;
  default:
    console.log('Usage:');
    console.log('  node config/migrate.js up      - Run pending migrations');
    console.log('  node config/migrate.js down    - Rollback last migration');
    console.log('  node config/migrate.js status  - Show migration status');
    process.exit(1);
}
