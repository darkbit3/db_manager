const SQLiteModelManager = require('./src/models/SQLiteModelManager');
const { connectSQLiteMulti, getConnection, getModelDistribution } = require('./src/config/sqlite-multi');

/**
 * Database Table Creation Script
 * This script creates all database tables for every model defined in the system
 */

async function createAllDatabaseTables() {
  console.log('🚀 Starting Database Table Creation Process...');
  console.log('='.repeat(80));
  
  try {
    // Step 1: Connect to all databases
    console.log('\n📡 Step 1: Connecting to all databases...');
    await connectSQLiteMulti();
    
    // Step 2: Initialize Model Manager
    console.log('\n🏗️  Step 2: Initializing Model Manager...');
    const modelManager = new SQLiteModelManager();
    
    // Step 3: Create Section Management Table
    console.log('\n📋 Step 3: Creating Section Management Table...');
    try {
      await modelManager.initializeSectionManagement();
      console.log('✅ Section Management table created successfully');
    } catch (error) {
      console.error('❌ Failed to create Section Management table:', error.message);
    }
    
    // Step 4: Create User Table
    console.log('\n👤 Step 4: Creating User Table...');
    try {
      await modelManager.initializeUserModel();
      console.log('✅ User table created successfully');
    } catch (error) {
      console.error('❌ Failed to create User table:', error.message);
    }
    
    // Step 5: Create All Stage Tables
    console.log('\n🎮 Step 5: Creating All Stage Tables...');
    try {
      await modelManager.initializeStageModels();
      console.log('✅ All stage tables created successfully');
    } catch (error) {
      console.error('❌ Failed to create stage tables:', error.message);
    }
    
    // Step 6: Verify All Tables Were Created
    console.log('\n🔍 Step 6: Verifying All Tables Were Created...');
    await verifyTablesCreated();
    
    // Step 7: Display Summary
    console.log('\n📊 Step 7: Database Creation Summary...');
    await displayDatabaseSummary();
    
    console.log('\n🎉 Database table creation process completed successfully!');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n💥 Critical error during database table creation:', error);
    process.exit(1);
  }
}

/**
 * Verify that all tables were created successfully
 */
async function verifyTablesCreated() {
  const distribution = getModelDistribution();
  const expectedTables = {
    'primary': ['section_management', 'users', 'stage_a', 'stage_b', 'stage_c'],
    'secondary': ['stage_d', 'stage_e', 'stage_f', 'stage_g'],
    'tertiary': ['stage_h', 'stage_i', 'stage_j', 'stage_k', 'stage_l']
  };
  
  console.log('\n🔍 Verifying table creation...');
  console.log('─'.repeat(60));
  
  for (const [dbKey, expectedTablesList] of Object.entries(expectedTables)) {
    const connection = getConnection(dbKey);
    if (!connection) {
      console.log(`❌ ${dbKey} - No connection available`);
      continue;
    }
    
    console.log(`\n📋 Checking ${distribution[dbKey].name}:`);
    
    for (const tableName of expectedTablesList) {
      try {
        const result = connection.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name=?
        `).get(tableName);
        
        if (result) {
          console.log(`  ✅ ${tableName}`);
          
          // Check if table has records
          const count = connection.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
          console.log(`     Records: ${count.count}`);
        } else {
          console.log(`  ❌ ${tableName} - NOT FOUND`);
        }
      } catch (error) {
        console.log(`  ❌ ${tableName} - ERROR: ${error.message}`);
      }
    }
  }
  
  console.log('─'.repeat(60));
}

/**
 * Display database summary with table information
 */
async function displayDatabaseSummary() {
  const distribution = getModelDistribution();
  
  console.log('\n📊 Database Summary');
  console.log('='.repeat(80));
  
  for (const [dbKey, dbConfig] of Object.entries(distribution)) {
    const connection = getConnection(dbKey);
    if (!connection) {
      console.log(`❌ ${dbConfig.name} - No connection`);
      continue;
    }
    
    console.log(`\n🗄️  ${dbConfig.name}`);
    console.log('─'.repeat(40));
    console.log(`File: ${connection.name}`);
    console.log(`Models: ${dbConfig.models.join(', ')}`);
    
    try {
      // Get all tables
      const tables = connection.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all();
      
      console.log(`\nTables (${tables.length}):`);
      tables.forEach(table => {
        const count = connection.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
        console.log(`  • ${table.name} (${count.count} records)`);
      });
      
      // Get database size
      const stats = connection.prepare(`
        SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()
      `).get();
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`\nDatabase Size: ${sizeInMB} MB`);
      
    } catch (error) {
      console.error(`Error getting summary for ${dbConfig.name}:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Create individual table manually (for troubleshooting)
 */
async function createIndividualTable(modelName, databaseKey = null) {
  const modelManager = new SQLiteModelManager();
  
  if (!databaseKey) {
    databaseKey = getDatabaseForModel(modelName);
  }
  
  const connection = getConnection(databaseKey);
  if (!connection) {
    throw new Error(`No connection available for database: ${databaseKey}`);
  }
  
  try {
    await modelManager.createTable(modelName, connection);
    console.log(`✅ Successfully created table for ${modelName} in ${databaseKey}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to create table for ${modelName}:`, error.message);
    return false;
  }
}

/**
 * Drop and recreate a specific table
 */
async function dropAndRecreateTable(modelName, databaseKey = null) {
  if (!databaseKey) {
    databaseKey = getDatabaseForModel(modelName);
  }
  
  const connection = getConnection(databaseKey);
  if (!connection) {
    throw new Error(`No connection available for database: ${databaseKey}`);
  }
  
  const modelManager = new SQLiteModelManager();
  const schema = modelManager.schemas[modelName];
  
  if (!schema) {
    throw new Error(`Schema not found for model: ${modelName}`);
  }
  
  try {
    console.log(`🗑️  Dropping table ${schema.tableName}...`);
    connection.exec(`DROP TABLE IF EXISTS ${schema.tableName}`);
    
    console.log(`🏗️  Recreating table ${schema.tableName}...`);
    await modelManager.createTable(modelName, connection);
    
    console.log(`✅ Successfully recreated table for ${modelName}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to recreate table for ${modelName}:`, error.message);
    return false;
  }
}

// Export functions for use in other modules
module.exports = {
  createAllDatabaseTables,
  verifyTablesCreated,
  displayDatabaseSummary,
  createIndividualTable,
  dropAndRecreateTable
};

// Run the script if called directly
if (require.main === module) {
  createAllDatabaseTables()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}
