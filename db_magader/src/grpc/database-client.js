const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const winston = require('winston');

// Load protobuf definition
const PROTO_PATH = path.join(__dirname, '../../proto/database.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const databaseProto = grpc.loadPackageDefinition(packageDefinition).database;

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'grpc-client.log' })
  ]
});

class DatabaseGrpcClient {
  constructor(serverAddress = 'localhost:50051', clientId = null) {
    this.serverAddress = serverAddress;
    this.clientId = clientId || `db-client-${Date.now()}`;
    this.client = null;
    this.isConnected = false;
    this.activeStreams = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    
    this.connect();
  }

  connect() {
    try {
      this.client = new databaseProto.DatabaseService(
        this.serverAddress,
        grpc.credentials.createInsecure()
      );

      logger.info(`gRPC: Connecting to database server at ${this.serverAddress}`);
      
      // Test connection with status check
      this.getStatus((error, response) => {
        if (error) {
          logger.error(`gRPC: Connection failed:`, error);
          this.handleConnectionError(error);
        } else {
          logger.info(`gRPC: Connected to database server successfully`);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.setupBidirectionalStream();
        }
      });
    } catch (error) {
      logger.error(`gRPC: Failed to create client:`, error);
      this.handleConnectionError(error);
    }
  }

  setupBidirectionalStream() {
    try {
      const stream = this.client.streamUpdates();
      
      // Send initial connection request
      stream.write({
        clientId: this.clientId,
        serviceName: 'database-service',
        updateType: databaseProto.UpdateType.UPDATE_TYPE_CONNECTION_ESTABLISHED,
        timestamp: Date.now()
      });

      // Handle server responses
      stream.on('data', (response) => {
        this.handleServerResponse(response);
      });

      stream.on('error', (error) => {
        logger.error(`gRPC: Stream error:`, error);
        this.handleStreamError(error, stream);
      });

      stream.on('end', () => {
        logger.warn(`gRPC: Stream ended, attempting reconnection...`);
        this.isConnected = false;
        this.attemptReconnection();
      });

      this.activeStreams.set('updates', stream);
      logger.info(`gRPC: Bidirectional stream established for client ${this.clientId}`);
      
    } catch (error) {
      logger.error(`gRPC: Failed to setup stream:`, error);
    }
  }

  getGameData(stage, gameId = null, callback) {
    if (!this.isConnected) {
      return callback(new Error('Not connected to database server'), null);
    }

    const request = {
      stage,
      gameId: gameId || '',
      subscribeUpdates: false,
      clientId: this.clientId
    };

    this.client.getGameData(request, (error, response) => {
      if (error) {
        logger.error(`gRPC: Get game data error:`, error);
        callback(error, null);
      } else {
        logger.info(`gRPC: Game data retrieved for Stage ${stage}`);
        callback(null, response);
      }
    });
  }

  streamGameData(stage, gameId = null, callback) {
    if (!this.isConnected) {
      return callback(new Error('Not connected to database server'), null);
    }

    try {
      const stream = this.client.streamGameData({
        stage,
        gameId: gameId || '',
        subscribeUpdates: true,
        clientId: this.clientId
      });

      stream.on('data', (response) => {
        if (callback) {
          callback(null, response);
        }
      });

      stream.on('error', (error) => {
        logger.error(`gRPC: Game stream error:`, error);
        if (callback) callback(error, null);
      });

      stream.on('end', () => {
        logger.info(`gRPC: Game stream ended for Stage ${stage}`);
      });

      this.activeStreams.set(`game-${stage}`, stream);
      logger.info(`gRPC: Game data stream started for Stage ${stage}`);
      
    } catch (error) {
      logger.error(`gRPC: Failed to start game stream:`, error);
      callback(error, null);
    }
  }

  placeBet(playerId, stage, amount, boardSelection, callback) {
    if (!this.isConnected) {
      return callback(new Error('Not connected to database server'), null);
    }

    const request = {
      playerId,
      stage,
      amount,
      boardSelection,
      timestamp: Date.now(),
      clientId: this.clientId
    };

    this.client.placeBet(request, (error, response) => {
      if (error) {
        logger.error(`gRPC: Place bet error:`, error);
        callback(error, null);
      } else {
        logger.info(`gRPC: Bet placed successfully - Player: ${playerId}, Stage: ${stage}, Amount: ${amount}`);
        callback(null, response);
      }
    });
  }

  streamBets(stage = null, callback) {
    if (!this.isConnected) {
      return callback(new Error('Not connected to database server'), null);
    }

    try {
      const request = {
        stage: stage || '',
        clientId: this.clientId,
        subscribeAllStages: !stage
      };

      const stream = this.client.streamBets(request);

      stream.on('data', (response) => {
        if (callback) {
          callback(null, response);
        }
      });

      stream.on('error', (error) => {
        logger.error(`gRPC: Bet stream error:`, error);
        if (callback) callback(error, null);
      });

      stream.on('end', () => {
        logger.info(`gRPC: Bet stream ended`);
      });

      this.activeStreams.set('bets', stream);
      logger.info(`gRPC: Bet stream started for ${stage || 'all stages'}`);
      
    } catch (error) {
      logger.error(`gRPC: Failed to start bet stream:`, error);
      callback(error, null);
    }
  }

  getStatus(detailed = false, callback) {
    if (!this.isConnected) {
      return callback(new Error('Not connected to database server'), null);
    }

    const request = {
      clientId: this.clientId,
      detailed
    };

    this.client.getStatus(request, (error, response) => {
      if (error) {
        logger.error(`gRPC: Get status error:`, error);
        callback(error, null);
      } else {
        callback(null, response);
      }
    });
  }

  // Real-time update methods
  sendGameDataUpdate(stage, gameData) {
    const updateStream = this.activeStreams.get('updates');
    if (updateStream && !updateStream.destroyed) {
      updateStream.write({
        clientId: this.clientId,
        serviceName: 'database-service',
        updateType: databaseProto.UpdateType.UPDATE_TYPE_GAME_DATA,
        data: { gameData },
        timestamp: Date.now()
      });
    }
  }

  sendBetUpdate(betData) {
    const updateStream = this.activeStreams.get('updates');
    if (updateStream && !updateStream.destroyed) {
      updateStream.write({
        clientId: this.clientId,
        serviceName: 'database-service',
        updateType: databaseProto.UpdateType.UPDATE_TYPE_BET_PLACED,
        data: { betData },
        timestamp: Date.now()
      });
    }
  }

  // Event handlers
  handleServerResponse(response) {
    const updateType = response.getUpdateType();
    
    switch (updateType) {
      case databaseProto.UpdateType.UPDATE_TYPE_CONNECTION_ESTABLISHED:
        logger.info(`gRPC: Connection confirmed by server`);
        break;
      case databaseProto.UpdateType.UPDATE_TYPE_GAME_DATA:
        logger.info(`gRPC: Received game data update`);
        this.emit('gameDataUpdate', response.getGameData());
        break;
      case databaseProto.UpdateType.UPDATE_TYPE_BET_UPDATED:
        logger.info(`gRPC: Received bet update`);
        this.emit('betUpdate', response.getBetData());
        break;
      case databaseProto.UpdateType.UPDATE_TYPE_STATUS_CHANGE:
        logger.info(`gRPC: Received status update`);
        this.emit('statusUpdate', response.getStatusData());
        break;
      default:
        logger.warn(`gRPC: Unknown response type: ${updateType}`);
    }
  }

  handleConnectionError(error) {
    this.isConnected = false;
    this.attemptReconnection();
  }

  handleStreamError(error, stream) {
    logger.error(`gRPC: Stream error, cleaning up...`);
    
    // Clean up the stream
    if (stream) {
      stream.destroy();
    }
    
    // Attempt reconnection
    this.attemptReconnection();
  }

  attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`gRPC: Max reconnection attempts reached`);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    logger.info(`gRPC: Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Event emitter functionality
  emit(event, data) {
    // Simple event emitter implementation
    if (this.listeners && this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  on(event, callback) {
    if (!this.listeners) {
      this.listeners = {};
    }
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  // Utility methods
  isClientConnected() {
    return this.isConnected;
  }

  getActiveStreams() {
    return Array.from(this.activeStreams.keys());
  }

  disconnect() {
    logger.info(`gRPC: Disconnecting client ${this.clientId}`);
    
    // Close all active streams
    this.activeStreams.forEach((stream, key) => {
      try {
        stream.destroy();
      } catch (error) {
        logger.error(`gRPC: Error closing stream ${key}:`, error);
      }
    });
    
    this.activeStreams.clear();
    this.isConnected = false;
    
    // Close gRPC channel
    if (this.client) {
      try {
        grpc.closeClient(this.client);
      } catch (error) {
        logger.error(`gRPC: Error closing client:`, error);
      }
    }
  }
}

module.exports = DatabaseGrpcClient;
