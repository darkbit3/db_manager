const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const socketIo = require('socket.io');
const http = require('http');
require('dotenv').config();

// Import gRPC server
const DatabaseGrpcServer = require('./grpc/database-server');

// Import configurations
const { connectSQLiteMulti, getAllConnections, checkConnectionStatus, initializeAllTables } = require('./config/sqlite-multi');
const { connectSQLite, initializeSQLite } = require('./config/sqlite');
const logger = require('./config/logger');
const SQLiteModelManager = require('./models/SQLiteModelManager');

const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins for now, can be restricted later
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Initialize database connections and models
const initializeDatabases = async () => {
  try {
    // Connect to all SQLite databases
    await connectSQLiteMulti();
    
    // Initialize all tables across databases
    initializeAllTables();
    
    // Initialize SQLite Model Manager
    const modelManager = new SQLiteModelManager();
    
    // Initialize Section Management on Database 1 (Primary)
    await modelManager.initializeSectionManagement();
    
    // Initialize User model
    await modelManager.initializeUserModel();
    
    // Initialize all stage models across their respective databases
    await modelManager.initializeStageModels();
    
    // Connect to and initialize SQLite for backup
    const sqliteDb = connectSQLite();
    initializeSQLite(sqliteDb);
    
    logger.info('SQLite database connections and models established successfully');
    logger.info('SQLite: Multiple databases with distributed models');
    logger.info('SQLite Backup: Connected');
    
    // Make model manager available globally
    global.modelManager = modelManager;
    
  } catch (error) {
    logger.error('Database initialization error:', error);
    process.exit(1);
  }
};

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 1) * 60 * 1000, // 1 minute window
  max: process.env.RATE_LIMIT_MAX || 1000 // allow up to 1000 requests per minute
});
app.use(limiter);

app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger configuration
if (process.env.SWAGGER_ENABLED === 'true') {
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Database Manager API',
        version: '1.0.0',
        description: 'Database Manager Backend API Documentation'
      },
      servers: [
        {
          url: `http://localhost:${process.env.PORT || 5000}`,
          description: 'Database Manager Server'
        }
      ]
    },
    apis: ['./src/routes/*.js']
  };
  
  const specs = swaggerJsdoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
}

// API Routes
const apiPrefix = process.env.API_PREFIX || '/api/v1';
app.use(`${apiPrefix}/databases`, require('./routes/databaseRoutes'));
app.use(`${apiPrefix}/backups`, require('./routes/backupRoutes'));
app.use(`${apiPrefix}/users`, require('./routes/userRoutes'));
const { router: stageARouter } = require('./routes/stageARoutes');
app.use(`${apiPrefix}/stage-a`, stageARouter);
app.use(`${apiPrefix}/stage-b`, require('./routes/stageBRoutes'));
app.use(`${apiPrefix}/stage-c`, require('./routes/stageCRoutes'));
app.use(`${apiPrefix}/stage-d`, require('./routes/stageDRoutes'));
app.use(`${apiPrefix}/stage-e`, require('./routes/stageERoutes'));
app.use(`${apiPrefix}/stage-f`, require('./routes/stageFRoutes'));
app.use(`${apiPrefix}/stage-g`, require('./routes/stageGRoutes'));
app.use(`${apiPrefix}/stage-h`, require('./routes/stageHRoutes'));
app.use(`${apiPrefix}/stage-i`, require('./routes/stageIRoutes'));
app.use(`${apiPrefix}/stage-j`, require('./routes/stageJRoutes'));
app.use(`${apiPrefix}/stage-k`, require('./routes/stageKRoutes'));
app.use(`${apiPrefix}/stage-l`, require('./routes/stageLRoutes'));

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = checkConnectionStatus();
  const connectedCount = Object.values(dbStatus).filter(db => db.isConnected).length;
  const totalCount = Object.keys(dbStatus).length;
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    databases: {
      sqlite: {
        total: totalCount,
        connected: connectedCount,
        status: connectedCount === totalCount ? 'all_connected' : 
                connectedCount > 0 ? 'partial' : 'disconnected',
        details: dbStatus
      },
      mongodb: 'not_used',
      postgresql: 'not_used',
      mysql: 'not_used',
      redis: 'not_used'
    }
  });
});

// Database status endpoint
app.get('/database-status', (req, res) => {
  const dbStatus = checkConnectionStatus();
  const connections = getAllConnections();
  
  const statusDetails = Object.keys(dbStatus).map(key => {
    const db = dbStatus[key];
    return {
      name: key === 'primary' ? 'Database 1 (Primary)' : 
            key === 'secondary' ? 'Database 2 (Secondary)' : 
            'Database 3 (Tertiary)',
      key,
      isConnected: db.isConnected,
      host: db.host,
      database: db.name,
      readyState: db.readyState,
      readyStateText: db.readyState === 1 ? 'connected' : 
                      db.readyState === 2 ? 'connecting' :
                      db.readyState === 3 ? 'disconnecting' : 'disconnected'
    };
  });
  
  const connectedCount = statusDetails.filter(db => db.isConnected).length;
  
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    summary: {
      totalDatabases: statusDetails.length,
      connectedDatabases: connectedCount,
      connectionStatus: connectedCount === statusDetails.length ? 'all_connected' : 
                        connectedCount > 0 ? 'partial' : 'disconnected'
    },
    databases: statusDetails
  });
});

// Model status endpoint
app.get('/model-status', (req, res) => {
  try {
    const modelManager = global.modelManager;
    if (!modelManager) {
      return res.status(503).json({
        success: false,
        error: 'Model manager not initialized'
      });
    }

    const { getModelDistribution } = require('./config/sqlite-multi');
    const distribution = getModelDistribution();
    const allModels = modelManager.getAllModels();
    const areAllInitialized = modelManager.areAllModelsInitialized();

    const statusDetails = Object.keys(distribution).map(dbKey => {
      const dbConfig = distribution[dbKey];
      const modelsForDb = modelManager.getModelsForDatabase(dbKey);
      
      return {
        database: dbConfig.name,
        connectionKey: dbKey,
        expectedModels: dbConfig.models,
        createdModels: Object.keys(modelsForDb),
        modelCount: Object.keys(modelsForDb).length,
        totalExpected: dbConfig.models.length,
        isComplete: Object.keys(modelsForDb).length === dbConfig.models.length
      };
    });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalExpectedModels: Object.values(distribution).reduce((sum, db) => sum + db.models.length, 0),
        totalCreatedModels: Object.keys(allModels).length,
        allModelsInitialized: areAllInitialized,
        distributionCount: Object.keys(distribution).length
      },
      databases: statusDetails
    });
  } catch (error) {
    logger.error('Error getting model status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get model status',
      message: error.message
    });
  }
});

// Refresh database connections
app.post('/database-refresh', async (req, res) => {
  try {
    console.log('\n🔄 Refreshing database connections and models...');
    await initializeDatabases();
    
    const dbStatus = checkConnectionStatus();
    const connectedCount = Object.values(dbStatus).filter(db => db.isConnected).length;
    const totalCount = Object.keys(dbStatus).length;
    
    res.json({
      success: true,
      message: 'Database connections and models refreshed',
      timestamp: new Date().toISOString(),
      summary: {
        totalDatabases: totalCount,
        connectedDatabases: connectedCount,
        connectionStatus: connectedCount === totalCount ? 'all_connected' : 
                          connectedCount > 0 ? 'partial' : 'disconnected'
      }
    });
  } catch (error) {
    logger.error('Error refreshing database connections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh database connections',
      message: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Database Manager API is running!',
    version: '1.0.0',
    documentation: '/api-docs'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 3007;

const startServer = async () => {
  server.listen(PORT, async () => {
    console.log(`🚀 Database Manager API is running on port ${PORT}`);
    console.log(`📋 Health Check: http://localhost:${PORT}/health`);
    console.log(`🔗 Database Status: http://localhost:${PORT}/database-status`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`🔌 Socket.IO Server: WebSocket connections enabled`);
    console.log(`🔌 gRPC Server: Real-time streaming enabled on port 50051`);
    console.log('─'.repeat(60));
    
    // Initialize database connections
    await initializeDatabases();
    
    // Initialize and start gRPC server
    const grpcServer = new DatabaseGrpcServer(global.modelManager);
    grpcServer.start(50051);
    
    // Socket.IO connection handling
    io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);
      
      // Handle stage1 connection
      socket.on('stage1-connect', (data) => {
        console.log(`🎯 Stage1 connected: ${socket.id}`, data);
        socket.join('stage1-room');
        
        // Send welcome message
        socket.emit('db-manager-connected', {
          message: 'Connected to Database Manager',
          timestamp: new Date().toISOString(),
          socketId: socket.id
        });
      });
      
      // Handle stage2 connection
      socket.on('stage2-connect', (data) => {
        console.log(`🎯 Stage2 connected: ${socket.id}`, data);
        socket.join('stage2-room');
        
        // Send welcome message
        socket.emit('db-manager-connected', {
          message: 'Connected to Database Manager',
          timestamp: new Date().toISOString(),
          socketId: socket.id
        });
      });
      
      // Handle stage3 connection
      socket.on('stage3-connect', (data) => {
        console.log(`🎯 Stage3 connected: ${socket.id}`, data);
        socket.join('stage3-room');
        
        // Send welcome message
        socket.emit('db-manager-connected', {
          message: 'Connected to Database Manager',
          timestamp: new Date().toISOString(),
          socketId: socket.id
        });
      });
      
      // Handle stage4 connection
      socket.on('stage4-connect', (data) => {
        console.log(`🎯 Stage4 connected: ${socket.id}`, data);
        socket.join('stage4-room');
        
        // Send welcome message
        socket.emit('db-manager-connected', {
          message: 'Connected to Database Manager',
          timestamp: new Date().toISOString(),
          socketId: socket.id
        });
      });
      
      // Handle stage5 connection
      socket.on('stage5-connect', (data) => {
        console.log(`🎯 Stage5 connected: ${socket.id}`, data);
        socket.join('stage5-room');
        
        // Send welcome message
        socket.emit('db-manager-connected', {
          message: 'Connected to Database Manager',
          timestamp: new Date().toISOString(),
          socketId: socket.id
        });
      });
      
      // Handle stage6 connection
      socket.on('stage6-connect', (data) => {
        console.log(`🎯 Stage6 connected: ${socket.id}`, data);
        socket.join('stage6-room');
        
        // Send welcome message
        socket.emit('db-manager-connected', {
          message: 'Connected to Database Manager',
          timestamp: new Date().toISOString(),
          socketId: socket.id
        });
      });
            // Handle BigServer connection
      socket.on('bigserver-connect', (data) => {
        console.log(`🎯 BigServer connected: ${socket.id}`, data);
        socket.join('bigserver-room');
        
        socket.emit('db-manager-connected', {
          message: 'BigServer connected to Database Manager',
          timestamp: new Date().toISOString(),
          socketId: socket.id
        });
      });
            // Handle bigserver connection
      socket.on('bigserver-connect', (data) => {
        console.log(`BigServer connected: ${socket.id}`, data);
        socket.join('bigserver-room');
        
        // Send welcome message
        socket.emit('db-manager-connected', {
          message: 'Connected to Database Manager',
          timestamp: new Date().toISOString(),
          socketId: socket.id
        });
      });
      
      // Handle game data requests
      socket.on('request-game-data', async (data) => {
        try {
          const { stage = 'a' } = data;
          console.log(`📊 Real-time game data request for Stage ${stage.toUpperCase()} from ${socket.id}`);
          
          // Get latest game data from database
          const modelManager = global.modelManager;
          if (!modelManager) {
            socket.emit('game-data-error', { error: 'Model manager not initialized' });
            return;
          }

          // Use getModel('StageX') instead of getStageModel
          const modelName = 'Stage' + stage.toUpperCase();
          const stageModel = modelManager.getModel(modelName);
          if (!stageModel) {
            socket.emit('game-data-error', { error: `Stage ${stage} model not found` });
            return;
          }

          // Get the latest game record (assume getLatestGame exists or fallback)
          let latestGame = null;
          if (typeof stageModel.getLatestGame === 'function') {
            latestGame = stageModel.getLatestGame();
          } else {
            // Fallback: try to get the latest game by max id
            try {
              const query = `SELECT * FROM ${stageModel.tableName} ORDER BY id DESC LIMIT 1`;
              latestGame = stageModel.connection.prepare(query).get();
            } catch (e) {
              latestGame = null;
            }
          }

          if (latestGame) {
            socket.emit('game-data-update', {
              stage: stage.toUpperCase(),
              data: latestGame,
              timestamp: new Date().toISOString(),
              source: 'db_manager'
            });
          } else {
            socket.emit('game-data-update', {
              stage: stage.toUpperCase(),
              data: null,
              message: 'No game data available',
              timestamp: new Date().toISOString(),
              source: 'db_manager'
            });
          }
        } catch (error) {
          console.error('Error handling game data request:', error);
          socket.emit('game-data-error', { 
            error: 'Failed to fetch game data',
            details: error.message 
          });
        }
      });
      
      // Handle bet placement notifications
      socket.on('bet-placed', (data) => {
        console.log(`🎯 Bet placed notification from ${socket.id}:`, data);
        
        // Broadcast to all connected clients (stage1 through stage6)
        io.to('stage1-room').emit('bet-update', {
          ...data,
          timestamp: new Date().toISOString(),
          source: 'db_manager'
        });
        io.to('stage2-room').emit('bet-update', {
          ...data,
          timestamp: new Date().toISOString(),
          source: 'db_manager'
        });
        io.to('stage3-room').emit('bet-update', {
          ...data,
          timestamp: new Date().toISOString(),
          source: 'db_manager'
        });
        io.to('stage4-room').emit('bet-update', {
          ...data,
          timestamp: new Date().toISOString(),
          source: 'db_manager'
        });
        io.to('stage5-room').emit('bet-update', {
          ...data,
          timestamp: new Date().toISOString(),
          source: 'db_manager'
        });
        io.to('stage6-room').emit('bet-update', {
          ...data,
          timestamp: new Date().toISOString(),
          source: 'db_manager'
        });
      });
      
      // Handle database status requests
      socket.on('request-db-status', () => {
        const dbStatus = checkConnectionStatus();
        socket.emit('db-status-update', {
          status: dbStatus,
          timestamp: new Date().toISOString()
        });
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });
    });
    
    // Periodic database status check every 30 seconds
    setInterval(() => {
      console.log('\n🔄 Checking Database Status...');
      console.log('─'.repeat(40));
      
      const dbStatus = checkConnectionStatus();
      const connectedCount = Object.values(dbStatus).filter(db => db.isConnected).length;
      const totalCount = Object.keys(dbStatus).length;
      
      Object.keys(dbStatus).forEach(key => {
        const db = dbStatus[key];
        const name = key === 'primary' ? 'Database 1 (Primary)' : 
                     key === 'secondary' ? 'Database 2 (Secondary)' : 'Database 3 (Tertiary)';
        const status = db.isConnected ? '✅ Connected' : '❌ Disconnected';
        const statusColor = db.isConnected ? '\x1b[32m' : '\x1b[31m';
        const reset = '\x1b[0m';
        
        console.log(`${name.padEnd(25)} | ${statusColor}${status}${reset}`);
      });
      
      console.log('─'.repeat(40));
      console.log(`📈 Status: ${connectedCount}/${totalCount} databases connected`);
      
      if (connectedCount === 0) {
        console.log('⚠️  All databases are disconnected!');
      } else if (connectedCount < totalCount) {
        console.log(`⚠️  ${totalCount - connectedCount} database(s) disconnected`);
      }
      
    }, 30000);
  });
};

startServer().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

// Export both app and io for testing
module.exports = { app, io, server };
