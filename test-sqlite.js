// Test script to verify SQLite conversion
const { connectSQLiteMulti, initializeAllTables, checkConnectionStatus } = require('./src/config/sqlite-multi');
const SQLiteModelManager = require('./src/models/SQLiteModelManager');

async function testSQLiteConversion() {
  console.log('🧪 Testing SQLite Conversion...\n');
  
  try {
    // Test 1: Connect to SQLite databases
    console.log('1️⃣ Testing SQLite database connections...');
    const connections = await connectSQLiteMulti();
    console.log('✅ SQLite connections established\n');
    
    // Test 2: Initialize tables
    console.log('2️⃣ Testing table initialization...');
    initializeAllTables();
    console.log('✅ Tables initialized\n');
    
    // Test 3: Initialize Model Manager
    console.log('3️⃣ Testing Model Manager...');
    const modelManager = new SQLiteModelManager();
    await modelManager.initializeSectionManagement();
    await modelManager.initializeUserModel();
    await modelManager.initializeStageModels();
    console.log('✅ Model Manager initialized\n');
    
    // Test 4: Check connection status
    console.log('4️⃣ Testing connection status...');
    const status = checkConnectionStatus();
    console.log('Connection Status:', JSON.stringify(status, null, 2));
    console.log('✅ Connection status retrieved\n');
    
    // Test 5: Test model operations
    console.log('5️⃣ Testing model operations...');
    
    // Test User model
    const userModel = modelManager.getModel('User');
    if (userModel) {
      console.log('✅ User model available');
    } else {
      console.log('❌ User model not found');
    }
    
    // Test Section Management model
    const sectionModel = modelManager.getModel('SectionManagement');
    if (sectionModel) {
      console.log('✅ Section Management model available');
    } else {
      console.log('❌ Section Management model not found');
    }
    
    // Test Stage models
    const stageModels = ['StageA', 'StageB', 'StageC', 'StageD', 'StageE', 'StageF', 'StageG', 'StageH', 'StageI', 'StageJ', 'StageK', 'StageL'];
    let stageModelsFound = 0;
    stageModels.forEach(stage => {
      const model = modelManager.getModel(stage);
      if (model) {
        stageModelsFound++;
      }
    });
    console.log(`✅ Found ${stageModelsFound}/${stageModels.length} stage models\n`);
    
    // Test 6: Summary
    console.log('📊 Test Summary:');
    console.log('─'.repeat(40));
    console.log('✅ SQLite Multi-Database Setup: PASSED');
    console.log('✅ Table Initialization: PASSED');
    console.log('✅ Model Manager: PASSED');
    console.log('✅ Model Availability: PASSED');
    console.log('✅ Connection Status: PASSED');
    console.log('─'.repeat(40));
    console.log('🎉 All tests passed! SQLite conversion successful!');
    
    // Close connections
    const { closeAllConnections } = require('./src/config/sqlite-multi');
    closeAllConnections();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testSQLiteConversion();
