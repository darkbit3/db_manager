const express = require('express');
const router = express.Router();

/**
 * Stage L Routes - Handle Stage L database operations
 * Amount: 200 (same as Stage K)
 */

// Import business logic functions from Stage A
const {
  STAGE_AMOUNTS,
  calculateBusinessValues,
  validateSelectedBoard,
  updateExistingRecords
} = require('./stageARoutes');

// GET /api/v1/stage-l/last-game-id - Get last game ID from stage_l table
router.get('/last-game-id', async (req, res) => {
  try {
    console.log('🔍 DB Manager: Received request for last game ID from Stage L');
    
    const modelManager = global.modelManager;
    if (!modelManager) {
      throw new Error('Model manager not initialized');
    }
    
    const stageLModel = modelManager.getModel('StageL');
    if (!stageLModel) {
      throw new Error('StageL model not found');
    }
    
    await updateExistingRecords(modelManager, 'L');
    
    const query = `SELECT * FROM ${stageLModel.tableName} ORDER BY id DESC, createdAt DESC LIMIT 1`;
    const lastRecord = modelManager.executeQuery('StageL', query);
    
    if (lastRecord && lastRecord.length > 0) {
      const gameData = lastRecord[0];
      const businessValues = calculateBusinessValues('L', gameData.playerId, gameData.selectedBoard);
      
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
        table: stageLModel.tableName,
        stage: 'stage-l'
      });
    } else {
      const firstGameId = `GAME_${Date.now()}_L001`;
      const samplePlayerIds = "+251909090909,+251909090910";
      const sampleSelectedBoard = "+251909090909:2,+251909090910:4";
      
      const businessValues = calculateBusinessValues('L', samplePlayerIds, sampleSelectedBoard);
      
      const insertQuery = `
        INSERT INTO ${stageLModel.tableName} (
          gameId, playerId, payout, amount, totalBet, owner, 
          winnerBoard, winnerPlayerId, selectedBoard, status, 
          registrationData, stage, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const insertParams = [
        firstGameId, samplePlayerIds, businessValues.payout, businessValues.amount,
        businessValues.totalBet, businessValues.owner, null, null, sampleSelectedBoard,
        'active', JSON.stringify({createdAt: new Date().toISOString(), isInitialGame: true, stage: 'L', businessLogic: 'applied'}),
        'L', JSON.stringify({created: 'system', purpose: 'initial_game', timestamp: new Date().toISOString(), businessRules: 'stage_l_applied'})
      ];
      
      const result = modelManager.executeRun('StageL', insertQuery, insertParams);
      
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
            message: 'First game ID created with Stage L business logic'
          },
          source: 'database_new',
          table: stageLModel.tableName,
          stage: 'stage-l'
        });
      } else {
        throw new Error('Failed to create first game record');
      }
    }
  } catch (error) {
    console.error('❌ Error getting last game ID from Stage L:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get last game ID from Stage L',
      details: error.message,
      stage: 'stage-l'
    });
  }
});

// POST /api/v1/stage-l/create - Create new Stage L record
router.post('/create', async (req, res) => {
  try {
    const modelManager = global.modelManager;
    if (!modelManager) throw new Error('Model manager not initialized');
    
    const stageLModel = modelManager.getModel('StageL');
    if (!stageLModel) throw new Error('StageL model not found');
    
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
    
    const businessValues = calculateBusinessValues('L', gameData.playerId, gameData.selectedBoard);
    
    const insertQuery = `
      INSERT INTO ${stageLModel.tableName} (
        gameId, playerId, payout, amount, totalBet, owner, 
        winnerBoard, winnerPlayerId, selectedBoard, status, 
        stage, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const insertParams = [
      gameData.gameId, gameData.playerId, businessValues.payout, businessValues.amount,
      businessValues.totalBet, businessValues.owner, gameData.winnerBoard || null,
      gameData.winnerPlayerId || null, gameData.selectedBoard, gameData.status || 'active',
      gameData.stage || 'L', JSON.stringify(gameData.metadata || {})
    ];
    
    const result = modelManager.executeRun('StageL', insertQuery, insertParams);
    
    if (result && result.lastInsertRowid) {
      const newRecord = modelManager.executeQuery('StageL', 
        `SELECT * FROM ${stageLModel.tableName} WHERE id = ?`, 
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
        message: 'Stage L record created with business logic',
        stage: 'stage-l'
      });
    } else {
      throw new Error('Failed to create Stage L record');
    }
  } catch (error) {
    console.error('❌ Error creating Stage L record:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create Stage L record',
      details: error.message
    });
  }
});

// GET /api/v1/stage-l/status - Check Stage L table status
router.get('/status', async (req, res) => {
  try {
    const modelManager = global.modelManager;
    if (!modelManager) throw new Error('Model manager not initialized');
    
    const stageLModel = modelManager.getModel('StageL');
    if (!stageLModel) throw new Error('StageL model not found');
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN winnerPlayerId IS NOT NULL THEN 1 END) as withWinners,
        COALESCE(SUM(payout), 0) as totalPayout
      FROM ${stageLModel.tableName}
    `;
    
    const stats = modelManager.executeQuery('StageL', statsQuery);
    const result = stats[0] || {};
    
    res.json({
      success: true,
      data: {
        table: stageLModel.tableName,
        database: 'tertiary',
        statistics: {
          total: result.total || 0,
          active: result.active || 0,
          completed: result.completed || 0,
          withWinners: result.withWinners || 0,
          totalPayout: result.totalPayout || 0
        },
        model: 'StageL',
        amount: STAGE_AMOUNTS.L
      },
      stage: 'stage-l'
    });
  } catch (error) {
    console.error('❌ Error getting Stage L status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get Stage L status',
      details: error.message
    });
  }
});

module.exports = router;
