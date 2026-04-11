const express = require('express');
const router = express.Router();

/**
 * Stage K Routes - Handle Stage K database operations
 * Amount: 200
 */

// Import business logic functions from Stage A
const {
  STAGE_AMOUNTS,
  calculateBusinessValues,
  validateSelectedBoard,
  updateExistingRecords
} = require('./stageARoutes');

// GET /api/v1/stage-k/last-game-id - Get last game ID from stage_k table
router.get('/last-game-id', async (req, res) => {
  try {
    console.log('🔍 DB Manager: Received request for last game ID from Stage K');
    
    const modelManager = global.modelManager;
    if (!modelManager) {
      throw new Error('Model manager not initialized');
    }
    
    const stageKModel = modelManager.getModel('StageK');
    if (!stageKModel) {
      throw new Error('StageK model not found');
    }
    
    await updateExistingRecords(modelManager, 'K');
    
    const query = `SELECT * FROM ${stageKModel.tableName} ORDER BY id DESC, createdAt DESC LIMIT 1`;
    const lastRecord = modelManager.executeQuery('StageK', query);
    
    if (lastRecord && lastRecord.length > 0) {
      const gameData = lastRecord[0];
      const businessValues = calculateBusinessValues('K', gameData.playerId, gameData.selectedBoard);
      
      res.json({
        success: true,
        data: {
          gameId: gameData.gameId,
          lastId: gameData.id,
          payout: gameData.payout,
          numberOfPlayerIds: businessValues.playerIdCount,
          selectedBoard: gameData.selectedBoard,
          isNew: false
        },
        source: 'database',
        table: stageKModel.tableName,
        stage: 'stage-k'
      });
    } else {
      const firstGameId = `GAME_${Date.now()}_K001`;
      const samplePlayerIds = "+251909090909,+251909090910";
      const sampleSelectedBoard = "+251909090909:2,+251909090910:4";
      
      const businessValues = calculateBusinessValues('K', samplePlayerIds, sampleSelectedBoard);
      
      const insertQuery = `
        INSERT INTO ${stageKModel.tableName} (
          gameId, playerId, payout, amount, totalBet, owner, 
          winnerBoard, winnerPlayerId, selectedBoard, status, 
          registrationData, stage, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const insertParams = [
        firstGameId, samplePlayerIds, businessValues.payout, businessValues.amount,
        businessValues.totalBet, businessValues.owner, null, null, sampleSelectedBoard,
        'active', JSON.stringify({createdAt: new Date().toISOString(), isInitialGame: true, stage: 'K', businessLogic: 'applied'}),
        'K', JSON.stringify({created: 'system', purpose: 'initial_game', timestamp: new Date().toISOString(), businessRules: 'stage_k_applied'})
      ];
      
      const result = modelManager.executeRun('StageK', insertQuery, insertParams);
      
      if (result && result.lastInsertRowid) {
        res.json({
          success: true,
          data: {
            gameId: firstGameId,
            lastId: result.lastInsertRowid,
            payout: businessValues.payout,
            numberOfPlayerIds: businessValues.playerIdCount,
            selectedBoard: sampleSelectedBoard,
            isNew: true,
            message: 'First game ID created with Stage K business logic'
          },
          source: 'database_new',
          table: stageKModel.tableName,
          stage: 'stage-k'
        });
      } else {
        throw new Error('Failed to create first game record');
      }
    }
  } catch (error) {
    console.error('❌ Error getting last game ID from Stage K:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get last game ID from Stage K',
      details: error.message,
      stage: 'stage-k'
    });
  }
});

// POST /api/v1/stage-k/create - Create new Stage K record
router.post('/create', async (req, res) => {
  try {
    const modelManager = global.modelManager;
    if (!modelManager) throw new Error('Model manager not initialized');
    
    const stageKModel = modelManager.getModel('StageK');
    if (!stageKModel) throw new Error('StageK model not found');
    
    const gameData = req.body;
    if (!gameData.gameId || !gameData.playerId || !gameData.selectedBoard) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: gameId, playerId, selectedBoard'
      });
    }
    
    const boardValidation = validateSelectedBoard(gameData.selectedBoard);
    if (!boardValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: `Invalid selectedBoard format: ${boardValidation.error}`
      });
    }
    
    const businessValues = calculateBusinessValues('K', gameData.playerId, gameData.selectedBoard);
    
    const insertQuery = `
      INSERT INTO ${stageKModel.tableName} (
        gameId, playerId, payout, amount, totalBet, owner, 
        winnerBoard, winnerPlayerId, selectedBoard, status, 
        stage, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const insertParams = [
      gameData.gameId, gameData.playerId, businessValues.payout, businessValues.amount,
      businessValues.totalBet, businessValues.owner, gameData.winnerBoard || null,
      gameData.winnerPlayerId || null, gameData.selectedBoard, gameData.status || 'active',
      gameData.stage || 'K', JSON.stringify(gameData.metadata || {})
    ];
    
    const result = modelManager.executeRun('StageK', insertQuery, insertParams);
    
    if (result && result.lastInsertRowid) {
      const newRecord = modelManager.executeQuery('StageK', 
        `SELECT * FROM ${stageKModel.tableName} WHERE id = ?`, 
        [result.lastInsertRowid]
      );
      
      res.json({
        success: true,
        data: {
          ...newRecord[0],
          businessLogic: {
            amount: businessValues.amount,
            playerIdCount: businessValues.playerIdCount,
            totalBet: businessValues.totalBet,
            payout: businessValues.payout,
            owner: businessValues.owner
          }
        },
        message: 'Stage K record created with business logic',
        stage: 'stage-k'
      });
    } else {
      throw new Error('Failed to create Stage K record');
    }
  } catch (error) {
    console.error('❌ Error creating Stage K record:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create Stage K record',
      details: error.message
    });
  }
});

// GET /api/v1/stage-k/status - Check Stage K table status
router.get('/status', async (req, res) => {
  try {
    const modelManager = global.modelManager;
    if (!modelManager) throw new Error('Model manager not initialized');
    
    const stageKModel = modelManager.getModel('StageK');
    if (!stageKModel) throw new Error('StageK model not found');
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN winnerPlayerId IS NOT NULL THEN 1 END) as withWinners,
        COALESCE(SUM(payout), 0) as totalPayout
      FROM ${stageKModel.tableName}
    `;
    
    const stats = modelManager.executeQuery('StageK', statsQuery);
    const result = stats[0] || {};
    
    res.json({
      success: true,
      data: {
        table: stageKModel.tableName,
        database: 'tertiary',
        statistics: {
          total: result.total || 0,
          active: result.active || 0,
          completed: result.completed || 0,
          withWinners: result.withWinners || 0,
          totalPayout: result.totalPayout || 0
        },
        model: 'StageK',
        amount: STAGE_AMOUNTS.K
      },
      stage: 'stage-k'
    });
  } catch (error) {
    console.error('❌ Error getting Stage K status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get Stage K status',
      details: error.message
    });
  }
});

module.exports = router;
