const express = require('express');
const router = express.Router();

/**
 * Stage J Routes - Handle Stage J database operations
 * Amount: 100 (same as Stage I)
 */

// Import business logic functions from Stage A
const {
  STAGE_AMOUNTS,
  calculateBusinessValues,
  validateSelectedBoard,
  updateExistingRecords
} = require('./stageARoutes');

// GET /api/v1/stage-j/last-game-id - Get last game ID from stage_j table
router.get('/last-game-id', async (req, res) => {
  try {
    console.log('🔍 DB Manager: Received request for last game ID from Stage J');
    
    const modelManager = global.modelManager;
    if (!modelManager) {
      throw new Error('Model manager not initialized');
    }
    
    const stageJModel = modelManager.getModel('StageJ');
    if (!stageJModel) {
      throw new Error('StageJ model not found');
    }
    
    await updateExistingRecords(modelManager, 'J');
    
    const query = `SELECT * FROM ${stageJModel.tableName} ORDER BY id DESC, createdAt DESC LIMIT 1`;
    const lastRecord = modelManager.executeQuery('StageJ', query);
    
    if (lastRecord && lastRecord.length > 0) {
      const gameData = lastRecord[0];
      const businessValues = calculateBusinessValues('J', gameData.playerId, gameData.selectedBoard);
      
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
        table: stageJModel.tableName,
        stage: 'stage-j'
      });
    } else {
      const firstGameId = `GAME_${Date.now()}_J001`;
      const samplePlayerIds = "+251909090909,+251909090910";
      const sampleSelectedBoard = "+251909090909:2,+251909090910:4";
      
      const businessValues = calculateBusinessValues('J', samplePlayerIds, sampleSelectedBoard);
      
      const insertQuery = `
        INSERT INTO ${stageJModel.tableName} (
          gameId, playerId, payout, amount, totalBet, owner, 
          winnerBoard, winnerPlayerId, selectedBoard, status, 
          registrationData, stage, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const insertParams = [
        firstGameId, samplePlayerIds, businessValues.payout, businessValues.amount,
        businessValues.totalBet, businessValues.owner, null, null, sampleSelectedBoard,
        'active', JSON.stringify({createdAt: new Date().toISOString(), isInitialGame: true, stage: 'J', businessLogic: 'applied'}),
        'J', JSON.stringify({created: 'system', purpose: 'initial_game', timestamp: new Date().toISOString(), businessRules: 'stage_j_applied'})
      ];
      
      const result = modelManager.executeRun('StageJ', insertQuery, insertParams);
      
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
            message: 'First game ID created with Stage J business logic'
          },
          source: 'database_new',
          table: stageJModel.tableName,
          stage: 'stage-j'
        });
      } else {
        throw new Error('Failed to create first game record');
      }
    }
  } catch (error) {
    console.error('❌ Error getting last game ID from Stage J:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get last game ID from Stage J',
      details: error.message,
      stage: 'stage-j'
    });
  }
});

// POST /api/v1/stage-j/create - Create new Stage J record
router.post('/create', async (req, res) => {
  try {
    const modelManager = global.modelManager;
    if (!modelManager) throw new Error('Model manager not initialized');
    
    const stageJModel = modelManager.getModel('StageJ');
    if (!stageJModel) throw new Error('StageJ model not found');
    
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
    
    const businessValues = calculateBusinessValues('J', gameData.playerId, gameData.selectedBoard);
    
    const insertQuery = `
      INSERT INTO ${stageJModel.tableName} (
        gameId, playerId, payout, amount, totalBet, owner, 
        winnerBoard, winnerPlayerId, selectedBoard, status, 
        stage, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const insertParams = [
      gameData.gameId, gameData.playerId, businessValues.payout, businessValues.amount,
      businessValues.totalBet, businessValues.owner, gameData.winnerBoard || null,
      gameData.winnerPlayerId || null, gameData.selectedBoard, gameData.status || 'active',
      gameData.stage || 'J', JSON.stringify(gameData.metadata || {})
    ];
    
    const result = modelManager.executeRun('StageJ', insertQuery, insertParams);
    
    if (result && result.lastInsertRowid) {
      const newRecord = modelManager.executeQuery('StageJ', 
        `SELECT * FROM ${stageJModel.tableName} WHERE id = ?`, 
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
        message: 'Stage J record created with business logic',
        stage: 'stage-j'
      });
    } else {
      throw new Error('Failed to create Stage J record');
    }
  } catch (error) {
    console.error('❌ Error creating Stage J record:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create Stage J record',
      details: error.message
    });
  }
});

// GET /api/v1/stage-j/status - Check Stage J table status
router.get('/status', async (req, res) => {
  try {
    const modelManager = global.modelManager;
    if (!modelManager) throw new Error('Model manager not initialized');
    
    const stageJModel = modelManager.getModel('StageJ');
    if (!stageJModel) throw new Error('StageJ model not found');
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN winnerPlayerId IS NOT NULL THEN 1 END) as withWinners,
        COALESCE(SUM(payout), 0) as totalPayout
      FROM ${stageJModel.tableName}
    `;
    
    const stats = modelManager.executeQuery('StageJ', statsQuery);
    const result = stats[0] || {};
    
    res.json({
      success: true,
      data: {
        table: stageJModel.tableName,
        database: 'tertiary',
        statistics: {
          total: result.total || 0,
          active: result.active || 0,
          completed: result.completed || 0,
          withWinners: result.withWinners || 0,
          totalPayout: result.totalPayout || 0
        },
        model: 'StageJ',
        amount: STAGE_AMOUNTS.J
      },
      stage: 'stage-j'
    });
  } catch (error) {
    console.error('❌ Error getting Stage J status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get Stage J status',
      details: error.message
    });
  }
});

module.exports = router;
