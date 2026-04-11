#!/usr/bin/env node

/**
 * Database Management Utility
 * A simple CLI tool to manage database tables
 */

const { 
  createAllDatabaseTables, 
  verifyTablesCreated, 
  displayDatabaseSummary,
  createIndividualTable,
  dropAndRecreateTable
} = require('./create-all-tables');

const { connectSQLiteMulti, getConnection, getModelDistribution } = require('./src/config/sqlite-multi');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  console.log('🗄️  Database Management Utility');
  console.log('='.repeat(50));

  try {
    // Ensure databases are connected
    await connectSQLiteMulti();

    switch (command) {
      case 'create':
      case 'create-all':
        await createAllDatabaseTables();
        break;

      case 'verify':
        await verifyTablesCreated();
        break;

      case 'summary':
        await displayDatabaseSummary();
        break;

      case 'list':
        await listAllModels();
        break;

      case 'create-table':
        if (!args[1]) {
          console.error('❌ Please specify a model name');
          console.log('Usage: node db-manager.js create-table <ModelName>');
          process.exit(1);
        }
        await createIndividualTable(args[1]);
        break;

      case 'recreate-table':
        if (!args[1]) {
          console.error('❌ Please specify a model name');
          console.log('Usage: node db-manager.js recreate-table <ModelName>');
          process.exit(1);
        }
        await dropAndRecreateTable(args[1]);
        break;

      case 'status':
        await showDatabaseStatus();
        break;

      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
    process.exit(1);
  }
}

/**
 * List all available models
 */
async function listAllModels() {
  const distribution = getModelDistribution();
  
  console.log('\n📋 Available Models:');
  console.log('─'.repeat(50));
  
  for (const [dbKey, dbConfig] of Object.entries(distribution)) {
    console.log(`\n🗄️  ${dbConfig.name}:`);
    dbConfig.models.forEach(model => {
      console.log(`  • ${model}`);
    });
  }
  
  console.log('\n👤 Additional Models:');
  console.log('  • User');
  console.log('  • SectionManagement');
  
  console.log('\n' + '─'.repeat(50));
}

/**
 * Show database connection status
 */
async function showDatabaseStatus() {
  const distribution = getModelDistribution();
  
  console.log('\n📊 Database Status:');
  console.log('─'.repeat(50));
  
  for (const [dbKey, dbConfig] of Object.entries(distribution)) {
    const connection = getConnection(dbKey);
    
    if (connection) {
      console.log(`✅ ${dbConfig.name} - CONNECTED`);
      console.log(`   File: ${connection.name}`);
      
      try {
        const tables = connection.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `).all();
        
        console.log(`   Tables: ${tables.length}`);
      } catch (error) {
        console.log(`   Tables: Error - ${error.message}`);
      }
    } else {
      console.log(`❌ ${dbConfig.name} - NOT CONNECTED`);
    }
    console.log('');
  }
  
  console.log('─'.repeat(50));
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
📖 Database Management Commands:

  create, create-all     Create all database tables for every model
  verify                Verify that all tables were created
  summary               Show detailed database summary
  list                  List all available models
  status                Show database connection status
  create-table <name>   Create a specific table for a model
  recreate-table <name> Drop and recreate a specific table
  help                  Show this help message

📝 Examples:
  node db-manager.js create-all
  node db-manager.js verify
  node db-manager.js create-table StageA
  node db-manager.js recreate-table User
  node db-manager.js summary

🎯 Available Models:
  • SectionManagement
  • User
  • StageA, StageB, StageC
  • StageD, StageE, StageF, StageG
  • StageH, StageI, StageJ, StageK, StageL
`);
}

// Run the main function
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Command completed successfully');
    })
    .catch((error) => {
      console.error('\n❌ Command failed:', error);
      process.exit(1);
    });
}

module.exports = {
  main,
  listAllModels,
  showDatabaseStatus,
  showHelp
};
