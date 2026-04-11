const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

console.log('Testing SQLite database creation...');

try {
  const dbPath = path.join(__dirname, 'data', 'test.db');
  console.log('Database path:', dbPath);
  
  // Check if directory exists
  const dir = path.dirname(dbPath);
  console.log('Directory exists:', fs.existsSync(dir));
  console.log('Directory path:', dir);
  
  // Try to create database
  const db = new Database(dbPath);
  console.log('✅ Database created successfully');
  
  // Test a simple query
  const result = db.prepare('SELECT 1 as test').get();
  console.log('Test query result:', result);
  
  db.close();
  console.log('✅ Database closed successfully');
  
  // Clean up
  fs.unlinkSync(dbPath);
  console.log('✅ Test database deleted');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}
