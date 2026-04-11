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
    new winston.transports.File({ filename: 'grpc-server.log' })
  ]
});

class DatabaseGrpcServer {
  constructor(modelManager) {
    this.modelManager = modelManager;
    this.server = new grpc.Server();
    this.activeConnections = new Map();
    this.gameSubscriptions = new Map();
    this.betSubscriptions = new Map();
    
    this.setupServices();
  }

  setupServices() {
    this.server.addService(databaseProto.DatabaseService.service, {
      streamUpdates: this.handleStreamUpdates.bind(this),
      getGameData: this.handleGetGameData.bind(this),
      streamGameData: this.handleStreamGameData.bind(this),
      placeBet: this.handlePlaceBet.bind(this),
      streamBets: this.handleStreamBets.bind(this),
      getStatus: this.handleGetStatus.bind(this)
    });
  }

  async handleStreamUpdates(call) {
    const clientId = call.request.getClientId();
    const serviceName = call.request.getServiceName();
    
    logger.info(`gRPC: Stream updates requested from ${serviceName} (Client: ${clientId})`);
    
    // Add to active connections
    this.activeConnections.set(clientId, {
      call,
      serviceName,
      connectedAt: new Date(),
      lastActivity: new Date()
    });

    // Send initial connection confirmation
    call.write({
      success: true,
      message: 'Connection established with Database Manager',
      updateType: databaseProto.UpdateType.UPDATE_TYPE_CONNECTION_ESTABLISHED,
      timestamp: Date.now()
    });

    // Handle incoming updates from client
    call.on('data', (request) => {
      this.handleClientUpdate(clientId, request, call);
    });

    call.on('end', () => {
      this.activeConnections.delete(clientId);
      logger.info(`gRPC: Client ${clientId} disconnected`);
      
      // Notify other clients about disconnection
      this.broadcastToOthers(clientId, {
        success: true,
        message: `Client ${clientId} disconnected`,
        updateType: databaseProto.UpdateType.UPDATE_TYPE_CONNECTION_LOST,
        timestamp: Date.now()
      });
    });

    call.on('error', (error) => {
      logger.error(`gRPC: Stream error for client ${clientId}:`, error);
      this.activeConnections.delete(clientId);
    });
  }

  async handleGetGameData(call, callback) {
    try {
      const { stage, game_id } = call.request;
      logger.info(`gRPC: Game data request for Stage ${stage}, Game ${game_id}`);
      
      const stageModel = this.modelManager.getStageModel(stage.toLowerCase());
      if (!stageModel) {
        return callback(null, {
          success: false,
          message: `Stage ${stage} model not found`,
          timestamp: Date.now()
        });
      }

      let gameData;
      if (game_id) {
        gameData = stageModel.getGameById(game_id);
      } else {
        gameData = stageModel.getLatestGame();
      }

      callback(null, {
        success: true,
        message: 'Game data retrieved successfully',
        gameData: this.formatGameData(gameData),
        isRealTimeUpdate: false,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('gRPC: Error getting game data:', error);
      callback(null, {
        success: false,
        message: 'Failed to retrieve game data',
        timestamp: Date.now()
      });
    }
  }

  async handleStreamGameData(call) {
    const { stage, game_id, subscribe_updates, client_id } = call.request;
    
    logger.info(`gRPC: Game data stream requested for Stage ${stage} (Client: ${client_id})`);
    
    // Add to game subscriptions
    if (!this.gameSubscriptions.has(stage)) {
      this.gameSubscriptions.set(stage, new Set());
    }
    this.gameSubscriptions.get(stage).add(client_id);

    try {
      const stageModel = this.modelManager.getStageModel(stage.toLowerCase());
      if (!stageModel) {
        call.write({
          success: false,
          message: `Stage ${stage} model not found`,
          timestamp: Date.now()
        });
        return;
      }

      // Send initial game data
      const latestGame = stageModel.getLatestGame();
      if (latestGame) {
        call.write({
          success: true,
          message: 'Initial game data',
          gameData: this.formatGameData(latestGame),
          isRealTimeUpdate: false,
          timestamp: Date.now()
        });
      }

      if (subscribe_updates) {
        // Set up real-time updates for this stage
        this.setupGameDataStream(stage, client_id, call);
      }
    } catch (error) {
      logger.error(`gRPC: Error setting up game stream for ${stage}:`, error);
    }
  }

  async handlePlaceBet(call, callback) {
    try {
      const { player_id, stage, amount, board_selection, client_id } = call.request;
      
      logger.info(`gRPC: Bet placement request - Player: ${player_id}, Stage: ${stage}, Amount: ${amount}`);
      
      const stageModel = this.modelManager.getStageModel(stage.toLowerCase());
      if (!stageModel) {
        return callback(null, {
          success: false,
          message: `Stage ${stage} model not found`,
          timestamp: Date.now()
        });
      }

      // Validate and place bet
      const betResult = await stageModel.placeBet({
        playerId: player_id,
        amount,
        boardSelection: board_selection,
        timestamp: Date.now()
      });

      callback(null, {
        success: betResult.success,
        message: betResult.message,
        betId: betResult.betId,
        playerId: player_id,
        amount,
        status: betResult.success ? databaseProto.BetStatus.BET_STATUS_CONFIRMED : databaseProto.BetStatus.BET_STATUS_REJECTED,
        timestamp: Date.now()
      });

      // Broadcast bet update to all subscribers
      if (betResult.success) {
        this.broadcastBetUpdate({
          betId: betResult.betId,
          playerId: player_id,
          stage,
          amount,
          boardSelection: board_selection,
          status: databaseProto.BetStatus.BET_STATUS_CONFIRMED,
          placedAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    } catch (error) {
      logger.error('gRPC: Error placing bet:', error);
      callback(null, {
        success: false,
        message: 'Failed to place bet',
        timestamp: Date.now()
      });
    }
  }

  async handleStreamBets(call) {
    const { stage, client_id, subscribe_all_stages } = call.request;
    
    logger.info(`gRPC: Bet stream requested for Stage ${stage} (Client: ${client_id})`);
    
    // Add to bet subscriptions
    if (subscribe_all_stages) {
      for (const stage of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l']) {
        if (!this.betSubscriptions.has(stage)) {
          this.betSubscriptions.set(stage, new Set());
        }
        this.betSubscriptions.get(stage).add(client_id);
      }
    } else if (stage) {
      if (!this.betSubscriptions.has(stage)) {
        this.betSubscriptions.set(stage, new Set());
      }
      this.betSubscriptions.get(stage).add(client_id);
    }

    // Send confirmation
    call.write({
      success: true,
      message: 'Bet stream established',
      timestamp: Date.now()
    });
  }

  async handleGetStatus(call, callback) {
    try {
      const { client_id, detailed } = call.request;
      
      const status = {
        activeConnections: this.activeConnections.size,
        totalGames: await this.getTotalGames(),
        totalBets: await this.getTotalBets(),
        systemLoad: process.cpuUsage().user / 1000000 // Convert to percentage
      };

      callback(null, {
        success: true,
        message: 'Status retrieved successfully',
        status: detailed ? status : { 
          activeConnections: this.activeConnections.size,
          status: databaseProto.DatabaseStatus.DB_STATUS_HEALTHY 
        },
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('gRPC: Error getting status:', error);
      callback(null, {
        success: false,
        message: 'Failed to retrieve status',
        timestamp: Date.now()
      });
    }
  }

  // Helper methods
  handleClientUpdate(clientId, request, call) {
    const updateType = request.getUpdateType();
    
    switch (updateType) {
      case databaseProto.UpdateType.UPDATE_TYPE_GAME_DATA:
        this.handleGameDataUpdate(clientId, request.getGameData(), call);
        break;
      case databaseProto.UpdateType.UPDATE_TYPE_BET_PLACED:
        this.handleBetUpdate(clientId, request.getBetData(), call);
        break;
      default:
        logger.warn(`gRPC: Unknown update type: ${updateType}`);
    }
  }

  handleGameDataUpdate(clientId, gameData, call) {
    // Broadcast game data update to all subscribers of this stage
    const stage = gameData.getStage();
    this.broadcastToGameSubscribers(stage, {
      success: true,
      message: 'Game data updated',
      updateType: databaseProto.UpdateType.UPDATE_TYPE_GAME_DATA,
      gameData,
      timestamp: Date.now()
    });
  }

  handleBetUpdate(clientId, betData, call) {
    // Broadcast bet update to all subscribers
    this.broadcastBetUpdate(betData);
  }

  setupGameDataStream(stage, clientId, call) {
    // Set up periodic updates or change notifications
    const interval = setInterval(async () => {
      const stageModel = this.modelManager.getStageModel(stage.toLowerCase());
      const latestGame = stageModel.getLatestGame();
      
      if (latestGame) {
        call.write({
          success: true,
          message: 'Real-time game data update',
          gameData: this.formatGameData(latestGame),
          isRealTimeUpdate: true,
          timestamp: Date.now()
        });
      }
    }, 5000); // Update every 5 seconds

    // Clean up on disconnect
    call.on('end', () => {
      clearInterval(interval);
      if (this.gameSubscriptions.has(stage)) {
        this.gameSubscriptions.get(stage).delete(clientId);
      }
    });
  }

  broadcastToGameSubscribers(stage, data) {
    if (!this.gameSubscriptions.has(stage)) return;
    
    const subscribers = this.gameSubscriptions.get(stage);
    subscribers.forEach(clientId => {
      const connection = this.activeConnections.get(clientId);
      if (connection && connection.call) {
        connection.call.write(data);
      }
    });
  }

  broadcastBetUpdate(betData) {
    const stage = betData.getStage();
    this.broadcastToGameSubscribers(stage, {
      success: true,
      message: 'Bet update',
      updateType: databaseProto.UpdateType.UPDATE_TYPE_BET_UPDATED,
      betData,
      timestamp: Date.now()
    });
  }

  broadcastToOthers(excludeClientId, data) {
    this.activeConnections.forEach((connection, clientId) => {
      if (clientId !== excludeClientId && connection.call) {
        connection.call.write(data);
      }
    });
  }

  formatGameData(gameData) {
    if (!gameData) return null;
    
    return {
      gameId: gameData.gameId || '',
      stage: gameData.stage || '',
      payout: gameData.payout || 0,
      selectedBoard: gameData.selectedBoard || '',
      totalPlayers: gameData.totalPlayers || 0,
      players: gameData.players || [],
      createdAt: gameData.createdAt || Date.now(),
      updatedAt: gameData.updatedAt || Date.now()
    };
  }

  async getTotalGames() {
    let total = 0;
    const stages = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'];
    
    for (const stage of stages) {
      const stageModel = this.modelManager.getStageModel(stage);
      if (stageModel) {
        total += await stageModel.getGameCount();
      }
    }
    
    return total;
  }

  async getTotalBets() {
    let total = 0;
    const stages = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'];
    
    for (const stage of stages) {
      const stageModel = this.modelManager.getStageModel(stage);
      if (stageModel) {
        total += await stageModel.getBetCount();
      }
    }
    
    return total;
  }

  start(port = 50051) {
    this.server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (error, port) => {
        if (error) {
          logger.error(`gRPC: Failed to start server on port ${port}:`, error);
          throw error;
        }
        
        logger.info(`gRPC: Database server running on port ${port}`);
        this.server.start();
      }
    );
  }

  stop() {
    logger.info('gRPC: Stopping database server...');
    this.server.forceShutdown();
  }
}

module.exports = DatabaseGrpcServer;
