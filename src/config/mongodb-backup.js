const mongoose = require('mongoose');
const logger = require('./logger');

// Database connections object
const connections = {};

// Model distribution across databases
const DATABASE_DISTRIBUTION = {
  primary: {
    name: 'Database 1 (Primary)',
    models: ['SectionManagement', 'StageA', 'StageB', 'StageC']
  },
  secondary: {
    name: 'Database 2 (Secondary)', 
    models: ['StageD', 'StageE', 'StageF', 'StageG']
  },
  tertiary: {
    name: 'Database 3 (Tertiary)',
    models: ['StageH', 'StageI', 'StageJ', 'StageK', 'StageL']
  }
};

const connectMongoDB = async () => {
  const databases = [
    {
      name: 'Database 1 (Primary)',
      uri: process.env.MONGODB_URI,
      connectionKey: 'primary'
    },
    {
      name: 'Database 2 (Secondary)',
      uri: process.env.MONGODB_SECONDARY_URI,
      connectionKey: 'secondary'
    },
    {
      name: 'Database 3 (Tertiary)',
      uri: process.env.MONGODB_TERTIARY_URI,
      connectionKey: 'tertiary'
    }
  ];

  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  console.log('\n🔗 Connecting to MongoDB Databases...');
  console.log('─'.repeat(60));

  const connectionResults = [];

  for (const db of databases) {
    try {
      console.log(`\n📡 Connecting to ${db.name}...`);
      
      // Create a new mongoose instance for each database
      const connection = mongoose.createConnection();
      
      await connection.asPromise().then(() => {
        return connection.openUri(db.uri, options);
      });

      connections[db.connectionKey] = connection;
      
      console.log(`✅ ${db.name} - CONNECTED`);
      console.log(`   Host: ${connection.host}`);
      console.log(`   Database: ${connection.name}`);
      console.log(`   Models: ${DATABASE_DISTRIBUTION[db.connectionKey].models.join(', ')}`);
      
      connectionResults.push({
        name: db.name,
        connectionKey: db.connectionKey,
        status: 'connected',
        host: connection.host,
        database: connection.name,
        models: DATABASE_DISTRIBUTION[db.connectionKey].models
      });

      // Handle connection events for each database
      connection.on('error', (err) => {
        logger.error(`${db.name} connection error:`, err);
        console.log(`❌ ${db.name} - CONNECTION ERROR: ${err.message}`);
      });
      
      connection.on('disconnected', () => {
        logger.warn(`${db.name} disconnected`);
        console.log(`⚠️  ${db.name} - DISCONNECTED`);
      });
      
      connection.on('reconnected', () => {
        logger.info(`${db.name} reconnected`);
        console.log(`🔄 ${db.name} - RECONNECTED`);
      });

    } catch (error) {
      logger.error(`${db.name} connection failed:`, error);
      console.log(`❌ ${db.name} - FAILED TO CONNECT`);
      console.log(`   Error: ${error.message}`);
      
      connectionResults.push({
        name: db.name,
        connectionKey: db.connectionKey,
        status: 'failed',
        error: error.message,
        models: DATABASE_DISTRIBUTION[db.connectionKey].models
      });
    }
  }

  console.log('\n📊 MongoDB Connection Summary:');
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
    console.log('💡 Please check your MongoDB configuration and network connectivity.');
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
    status[key] = {
      readyState: connection.readyState,
      host: connection.host,
      name: connection.name,
      isConnected: connection.readyState === 1,
      models: DATABASE_DISTRIBUTION[key]?.models || []
    };
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

module.exports = { 
  connectMongoDB, 
  getConnection, 
  getAllConnections, 
  checkConnectionStatus,
  getDatabaseForModel,
  getModelsForDatabase,
  getModelDistribution
};
