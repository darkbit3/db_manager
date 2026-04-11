const Database = require('better-sqlite3');
const path = require('path');

/**
 * Database Inspection Script
 * Shows detailed table information using raw SQL queries
 */

function inspectDatabase(dbPath, dbName) {
  console.log(`\n🔍 Inspecting ${dbName}`);
  console.log('='.repeat(60));
  console.log(`Database File: ${dbPath}`);
  
  try {
    const db = new Database(dbPath);
    
    // Get all tables
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();
    
    console.log(`\n📋 Found ${tables.length} tables:`);
    
    tables.forEach(table => {
      console.log(`\n📄 Table: ${table.name}`);
      
      // Get table schema
      const schema = db.prepare(`PRAGMA table_info(${table.name})`).all();
      console.log('   Columns:');
      schema.forEach(col => {
        const nullable = col.notnull ? 'NOT NULL' : 'NULL';
        const pk = col.pk ? 'PRIMARY KEY' : '';
        console.log(`     • ${col.name} (${col.type}) ${nullable} ${pk}`.trim());
      });
      
      // Get record count
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
      console.log(`   Records: ${count.count}`);
      
      // Get indexes
      const indexes = db.prepare(`
        SELECT name, sql FROM sqlite_master 
        WHERE type='index' AND tbl_name=? AND name NOT LIKE 'sqlite_%'
      `).all(table.name);
      
      if (indexes.length > 0) {
        console.log('   Indexes:');
        indexes.forEach(idx => {
          console.log(`     • ${idx.name}`);
        });
      }
      
      // Show sample data if table has records
      if (count.count > 0) {
        const sample = db.prepare(`SELECT * FROM ${table.name} LIMIT 3`).all();
        console.log('   Sample Data:');
        sample.forEach((row, i) => {
          console.log(`     Row ${i + 1}:`, JSON.stringify(row, null, 6));
        });
      }
    });
    
    // Get database info
    const pageCount = db.prepare('PRAGMA page_count()').get();
    const pageSize = db.prepare('PRAGMA page_size()').get();
    const sizeInMB = ((pageCount.page_count * pageSize.page_size) / (1024 * 1024)).toFixed(2);
    
    console.log(`\n💾 Database Size: ${sizeInMB} MB`);
    console.log(`📄 Pages: ${pageCount.page_count}, Page Size: ${pageSize.page_size} bytes`);
    
    db.close();
    
  } catch (error) {
    console.error(`❌ Error inspecting ${dbName}:`, error.message);
  }
}

async function main() {
  console.log('🔍 Database Inspection Tool');
  console.log('='.repeat(80));
  
  const dataDir = path.join(process.cwd(), 'data');
  
  const databases = [
    { path: path.join(dataDir, 'database_primary.db'), name: 'Database 1 (Primary)' },
    { path: path.join(dataDir, 'database_secondary.db'), name: 'Database 2 (Secondary)' },
    { path: path.join(dataDir, 'database_tertiary.db'), name: 'Database 3 (Tertiary)' }
  ];
  
  for (const db of databases) {
    inspectDatabase(db.path, db.name);
  }
  
  console.log('\n✅ Database inspection completed');
  console.log('\n💡 If you want to use SQLite command line tool:');
  console.log('   sqlite3 data/database_primary.db ".tables"');
  console.log('   sqlite3 data/database_primary.db ".schema section_management"');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { inspectDatabase, main };
