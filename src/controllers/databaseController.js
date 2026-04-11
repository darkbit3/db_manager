const logger = require('../config/logger');
const { checkConnectionStatus, getModelDistribution } = require('../config/sqlite-multi');

const getAllDatabases = async (req, res) => {
  try {
    // Get SQLite database status
    const dbStatus = checkConnectionStatus();
    const distribution = getModelDistribution();
    
    // Format database information
    const databases = Object.keys(distribution).map(key => ({
      id: key,
      name: distribution[key].name,
      type: 'sqlite',
      connectionKey: key,
      status: dbStatus[key]?.isConnected ? 'connected' : 'disconnected',
      models: distribution[key].models,
      filePath: dbStatus[key]?.filePath || null
    }));
    
    res.json({
      success: true,
      data: databases,
      count: databases.length
    });
  } catch (error) {
    logger.error('Error getting all databases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve databases'
    });
  }
};

const getDatabaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const dbStatus = checkConnectionStatus();
    const distribution = getModelDistribution();
    
    const dbConfig = distribution[id];
    if (!dbConfig) {
      return res.status(404).json({
        success: false,
        error: 'Database not found'
      });
    }
    
    const database = {
      id: id,
      name: dbConfig.name,
      type: 'sqlite',
      connectionKey: id,
      status: dbStatus[id]?.isConnected ? 'connected' : 'disconnected',
      models: dbConfig.models,
      filePath: dbStatus[id]?.filePath || null
    };
    
    res.json({
      success: true,
      data: database
    });
  } catch (error) {
    logger.error('Error getting database by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve database'
    });
  }
};

const createDatabase = async (req, res) => {
  try {
    // SQLite databases are pre-configured, so this operation is not supported
    res.status(400).json({
      success: false,
      error: 'Creating new SQLite databases is not supported. Databases are pre-configured.'
    });
  } catch (error) {
    logger.error('Error creating database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create database'
    });
  }
};

const updateDatabase = async (req, res) => {
  try {
    const { id } = req.params;
    const dbStatus = checkConnectionStatus();
    
    if (!dbStatus[id]) {
      return res.status(404).json({
        success: false,
        error: 'Database not found'
      });
    }
    
    // For SQLite, we can test connection as an "update"
    const isConnected = dbStatus[id].isConnected;
    
    res.json({
      success: true,
      data: {
        id: id,
        status: isConnected ? 'connected' : 'disconnected',
        lastChecked: new Date().toISOString()
      },
      message: 'Database status updated successfully'
    });
  } catch (error) {
    logger.error('Error updating database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update database'
    });
  }
};

const deleteDatabase = async (req, res) => {
  try {
    // SQLite databases are essential for the application, deletion is not supported
    res.status(400).json({
      success: false,
      error: 'Deleting SQLite databases is not supported as they are essential for the application.'
    });
  } catch (error) {
    logger.error('Error deleting database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete database'
    });
  }
};

const testDatabaseConnection = async (req, res) => {
  try {
    const { id } = req.params;
    const dbStatus = checkConnectionStatus();
    
    const databaseStatus = dbStatus[id];
    if (!databaseStatus) {
      return res.status(404).json({
        success: false,
        error: 'Database not found'
      });
    }
    
    const result = {
      databaseId: id,
      isConnected: databaseStatus.isConnected,
      filePath: databaseStatus.filePath,
      models: databaseStatus.models,
      testedAt: new Date().toISOString(),
      error: databaseStatus.error || null
    };
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error testing database connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test database connection'
    });
  }
};

const getDatabaseModels = async (req, res) => {
  try {
    const modelManager = global.modelManager;
    if (!modelManager) {
      return res.status(500).json({
        success: false,
        error: 'Model manager not initialized'
      });
    }

    const { id } = req.params;
    const models = modelManager.getModelsForDatabase(id);
    
    res.json({
      success: true,
      data: {
        databaseId: id,
        models: Object.keys(models),
        modelCount: Object.keys(models).length
      }
    });
  } catch (error) {
    logger.error('Error getting database models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get database models'
    });
  }
};

module.exports = {
  getAllDatabases,
  getDatabaseById,
  createDatabase,
  updateDatabase,
  deleteDatabase,
  testDatabaseConnection,
  getDatabaseModels
};
