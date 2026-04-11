const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Database connections object
const connections = {};

// Model distribution across databases (same as MongoDB structure)
const DATABASE_DISTRIBUTION = {
  primary: {
    name: 'Database 1 (Primary)',
    models: ['SectionManagement', 'StageA', 'StageB', 'StageC'],
    filename: 'database_primary.db'
  },
  secondary: {
    name: 'Database 2 (Secondary)', 
    models: ['StageD', 'StageE', 'StageF', 'StageG'],
    filename: 'database_secondary.db'
  },
  tertiary: {
    name: 'Database 3 (Tertiary)',
    models: ['StageH', 'StageI', 'StageJ', 'StageK', 'StageL'],
    filename: 'database_tertiary.db'
  }
};

// Get database path
const getDatabasePath = (filename) => {
  const basePath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data');
  return path.join(basePath, filename);
};

// Ensure data directory exists
const ensureDataDirectory = () => {
  const basePath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data');
  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
  }
};

// Connect to all SQLite databases
const connectSQLiteMulti = async () => {
  ensureDataDirectory();
  
  console.log('\n🔗 Connecting to SQLite Databases...');
  console.log('─'.repeat(60));

  const connectionResults = [];

  for (const [dbKey, dbConfig] of Object.entries(DATABASE_DISTRIBUTION)) {
    try {
      console.log(`\n📡 Connecting to ${dbConfig.name}...`);
      
      const dbPath = getDatabasePath(dbConfig.filename);
      console.log(`   Attempting to connect to: ${dbPath}`);
      console.log(`   Directory exists: ${fs.existsSync(path.dirname(dbPath))}`);
      console.log(`   File exists: ${fs.existsSync(dbPath)}`);
      
      const connection = new Database(dbPath);
      
      // Enable foreign keys
      connection.pragma('foreign_keys = ON');
      
      // Set WAL mode for better performance
      connection.pragma('journal_mode = WAL');
      
      connections[dbKey] = connection;
      
      console.log(`✅ ${dbConfig.name} - CONNECTED`);
      console.log(`   File: ${dbPath}`);
      console.log(`   Models: ${dbConfig.models.join(', ')}`);
      
      connectionResults.push({
        name: dbConfig.name,
        connectionKey: dbKey,
        status: 'connected',
        filePath: dbPath,
        models: dbConfig.models
      });

    } catch (error) {
      console.error(`❌ ${dbConfig.name} - FAILED TO CONNECT`);
      console.error(`   Error: ${error.message}`);
      
      connectionResults.push({
        name: dbConfig.name,
        connectionKey: dbKey,
        status: 'failed',
        error: error.message,
        models: dbConfig.models
      });
    }
  }

  console.log('\n📊 SQLite Connection Summary:');
  console.log('─'.repeat(60));
  
  const connectedCount = connectionResults.filter(r => r.status === 'connected').length;
  const totalCount = connectionResults.length;
  
  connectionResults.forEach(result => {
    const status = result.status === 'connected' ? '✅ CONNECTED' : '❌ FAILED';
    const statusColor = result.status === 'connected' ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';
    
    console.log(`${result.name.padEnd(25)} | ${statusColor}${status}${reset}`);
    console.log(`${''.padEnd(25)} | Models: ${result.models.join(', ')}`);
    if (result.error) {
      console.log(`${''.padEnd(25)} | Error: ${result.error}`);
    }
  });
  
  console.log('─'.repeat(60));
  console.log(`📈 Connection Status: ${connectedCount}/${totalCount} databases connected`);
  console.log('─'.repeat(60));
  
  if (connectedCount === 0) {
    console.log('\n❌ No databases are connected!');
    console.log('💡 Please check your SQLite configuration and file permissions.');
  } else if (connectedCount < totalCount) {
    console.log(`\n⚠️  ${totalCount - connectedCount} database(s) failed to connect.`);
    console.log('🔧 Some features may be limited until all databases are connected.');
  } else {
    console.log('\n🎉 All databases are connected and ready!');
  }
  
  // Display model distribution
  console.log('\n📋 Model Distribution Across Databases:');
  console.log('─'.repeat(60));
  Object.keys(DATABASE_DISTRIBUTION).forEach(key => {
    const db = DATABASE_DISTRIBUTION[key];
    console.log(`${db.name.padEnd(25)} | ${db.models.join(', ')}`);
  });
  console.log('─'.repeat(60));
  console.log('');

  return connections;
};

// Get specific database connection
const getConnection = (connectionKey = 'primary') => {
  return connections[connectionKey];
};

// Get all connections
const getAllConnections = () => {
  return connections;
};

// Check connection status
const checkConnectionStatus = () => {
  const status = {};
  Object.keys(connections).forEach(key => {
    const connection = connections[key];
    try {
      // Test the connection with a simple query
      const result = connection.prepare('SELECT 1').get();
      status[key] = {
        isConnected: true,
        filePath: getDatabasePath(DATABASE_DISTRIBUTION[key].filename),
        models: DATABASE_DISTRIBUTION[key]?.models || []
      };
    } catch (error) {
      status[key] = {
        isConnected: false,
        filePath: getDatabasePath(DATABASE_DISTRIBUTION[key].filename),
        error: error.message,
        models: DATABASE_DISTRIBUTION[key]?.models || []
      };
    }
  });
  return status;
};

// Get database for a specific model
const getDatabaseForModel = (modelName) => {
  for (const [dbKey, dbConfig] of Object.entries(DATABASE_DISTRIBUTION)) {
    if (dbConfig.models.includes(modelName)) {
      return dbKey;
    }
  }
  return 'primary'; // fallback
};

// Get all models for a specific database
const getModelsForDatabase = (databaseKey) => {
  return DATABASE_DISTRIBUTION[databaseKey]?.models || [];
};

// Get model distribution mapping
const getModelDistribution = () => {
  return DATABASE_DISTRIBUTION;
};

// Close all connections
const closeAllConnections = () => {
  Object.keys(connections).forEach(key => {
    try {
      connections[key].close();
      console.log(`✅ Closed connection to ${DATABASE_DISTRIBUTION[key].name}`);
    } catch (error) {
      console.error(`❌ Error closing ${DATABASE_DISTRIBUTION[key].name}:`, error);
    }
  });
};

// Initialize tables for all databases
const initializeAllTables = () => {
  console.log('\n🏗️  Initializing SQLite tables across all databases...');
  console.log('─'.repeat(60));
  
  for (const [dbKey, connection] of Object.entries(connections)) {
    try {
      const dbConfig = DATABASE_DISTRIBUTION[dbKey];
      console.log(`\n📋 Initializing tables for ${dbConfig.name}...`);
      
      // Create basic tables structure (will be expanded in model initialization)
      connection.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          model_name TEXT NOT NULL,
          version TEXT NOT NULL,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS schema_info (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log(`✅ Tables initialized for ${dbConfig.name}`);
      
    } catch (error) {
      console.error(`❌ Error initializing tables for ${DATABASE_DISTRIBUTION[dbKey].name}:`, error);
    }
  }
  
  console.log('\n✅ All database tables initialized');
  console.log('─'.repeat(60));
};

module.exports = { 
  connectSQLiteMulti,
  getConnection, 
  getAllConnections, 
  checkConnectionStatus,
  getDatabaseForModel,
  getModelsForDatabase,
  getModelDistribution,
  closeAllConnections,
  initializeAllTables,
  getDatabasePath
};
