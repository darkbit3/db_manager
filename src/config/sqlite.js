const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// SQLite database configuration for backup
const dbPath = process.env.SQLITE_BACKUP_PATH || path.join(__dirname, '../../data', 'backup.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create SQLite connection
const connectSQLite = () => {
  try {
    const db = new Database(dbPath);
    console.log('✅ Connected to SQLite database');
    return db;
  } catch (error) {
    console.error('❌ SQLite connection error:', error);
    throw error;
  }
};

// Initialize SQLite tables
const initializeSQLite = (db) => {
  try {
    // Create backups table
    db.exec(`
      CREATE TABLE IF NOT EXISTS backups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        database_name TEXT NOT NULL,
        backup_type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        file_size INTEGER,
        status TEXT DEFAULT 'completed'
      )
    `);

    // Create backup_logs table
    db.exec(`
      CREATE TABLE IF NOT EXISTS backup_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backup_id INTEGER,
        operation TEXT NOT NULL,
        message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (backup_id) REFERENCES backups (id)
      )
    `);

    console.log('✅ SQLite tables initialized');
  } catch (error) {
    console.error('❌ Error creating SQLite tables:', error);
    throw error;
  }
};

// Close SQLite connection
const closeSQLite = (db) => {
  try {
    db.close();
    console.log('✅ SQLite connection closed');
  } catch (error) {
    console.error('❌ SQLite close error:', error);
    throw error;
  }
};

module.exports = {
  connectSQLite,
  initializeSQLite,
  closeSQLite,
  dbPath
};
