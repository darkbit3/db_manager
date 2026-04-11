const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('Testing multi-database SQLite creation...');

const databases = [
  { name: 'Database 1 (Primary)', filename: 'database_primary.db' },
  { name: 'Database 2 (Secondary)', filename: 'database_secondary.db' },
  { name: 'Database 3 (Tertiary)', filename: 'database_tertiary.db' }
];

const basePath = path.join(__dirname, 'data');
console.log('Base path:', basePath);

if (!fs.existsSync(basePath)) {
  fs.mkdirSync(basePath, { recursive: true });
  console.log('Created data directory');
}

const connections = {};

for (const db of databases) {
  try {
    console.log(`\n📡 Connecting to ${db.name}...`);
    
    const dbPath = path.join(basePath, db.filename);
    console.log(`   File path: ${dbPath}`);
    
    const connection = new Database(dbPath);
    
    // Enable foreign keys
    connection.pragma('foreign_keys = ON');
    
    // Set WAL mode for better performance
    connection.pragma('journal_mode = WAL');
    
    console.log(`✅ ${db.name} - CONNECTED`);
    
    // Test the connection with a simple query
    const result = connection.prepare('SELECT 1').get();
    console.log(`   Test query successful: ${result}`);
    
    connections[db.filename] = connection;
    
  } catch (error) {
    console.error(`❌ ${db.name} - FAILED TO CONNECT`);
    console.error(`   Error: ${error.message}`);
  }
}

console.log('\n📊 Connection Summary:');
console.log(`Connected: ${Object.keys(connections).length}/${databases.length} databases`);

// Close connections
Object.keys(connections).forEach(filename => {
  try {
    connections[filename].close();
    console.log(`✅ Closed ${filename}`);
  } catch (error) {
    console.error(`❌ Error closing ${filename}:`, error.message);
  }
});

console.log('\n🎉 Multi-database test completed!');
