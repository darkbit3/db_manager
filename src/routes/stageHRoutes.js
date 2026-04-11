const express = require('express');
const router = express.Router();

/**
 * Stage H Routes - Handle Stage H database operations
 * Amount: 50 (same as Stage G)
 */

// Import business logic functions from Stage A
const {
  STAGE_AMOUNTS,
  calculateBusinessValues,
  validateSelectedBoard,
  updateExistingRecords
} = require('./stageARoutes');

// GET /api/v1/stage-h/last-game-id - Get last game ID from stage_h table
router.get('/last-game-id', async (req, res) => {
  try {
    console.log('🔍 DB Manager: Received request for last game ID from Stage H');
    
    const modelManager = global.modelManager;
    if (!modelManager) {
      throw new Error('Model manager not initialized');
    }
    
    const stageHModel = modelManager.getModel('StageH');
    if (!stageHModel) {
      throw new Error('StageH model not found');
    }
    
    // Update existing records with new business logic
    await updateExistingRecords(modelManager, 'H');
    
    console.log('📋 Querying stage_h table for highest game ID...');
    
    const query = `
      SELECT * FROM ${stageHModel.tableName} 
      ORDER BY id DESC, createdAt DESC 
      LIMIT 1
    `;
    
    const lastRecord = modelManager.executeQuery('StageH', query);
    
    if (lastRecord && lastRecord.length > 0) {
      const gameData = lastRecord[0];
      console.log('✅ Found existing game record:', gameData);
      
      const businessValues = calculateBusinessValues('H', gameData.playerId, gameData.selectedBoard);
      
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
        table: stageHModel.tableName,
        stage: 'stage-h'
      });
      
    } else {
      // Create first game ID with Stage H business logic (amount = 50)
      console.log('📝 No records found, creating first game ID for Stage H...');
      
      const firstGameId = `GAME_${Date.now()}_H001`;
      const samplePlayerIds = "+251909090909,+251909090910";
      const sampleSelectedBoard = "+251909090909:2,+251909090910:4";
      
      const boardValidation = validateSelectedBoard(sampleSelectedBoard);
      if (!boardValidation.isValid) {
        throw new Error(`Invalid selectedBoard format: ${boardValidation.error}`);
      }
      
      const businessValues = calculateBusinessValues('H', samplePlayerIds, sampleSelectedBoard);
      
      const firstRecord = {
        gameId: firstGameId,
        playerId: samplePlayerIds,
        payout: businessValues.payout,
        amount: businessValues.amount,
        totalBet: businessValues.totalBet,
        owner: businessValues.owner,
        winnerBoard: null,
        winnerPlayerId: null,
        selectedBoard: sampleSelectedBoard,
        status: 'active',
        registrationData: JSON.stringify({
          createdAt: new Date().toISOString(),
          isInitialGame: true,
          stage: 'H',
          businessLogic: 'applied'
        }),
        stage: 'H',
        metadata: JSON.stringify({
          created: 'system',
          purpose: 'initial_game',
          timestamp: new Date().toISOString(),
          businessRules: 'stage_h_applied'
        })
      };
      
      const insertQuery = `
        INSERT INTO ${stageHModel.tableName} (
          gameId, playerId, payout, amount, totalBet, owner, 
          winnerBoard, winnerPlayerId, selectedBoard, status, 
          registrationData, stage, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const insertParams = [
        firstRecord.gameId,
        firstRecord.playerId,
        firstRecord.payout,
        firstRecord.amount,
        firstRecord.totalBet,
        firstRecord.owner,
        firstRecord.winnerBoard,
        firstRecord.winnerPlayerId,
        firstRecord.selectedBoard,
        firstRecord.status,
        firstRecord.registrationData,
        firstRecord.stage,
        firstRecord.metadata
      ];
      
      const result = modelManager.executeRun('StageH', insertQuery, insertParams);
      
      if (result && result.lastInsertRowid) {
        const newRecord = modelManager.executeQuery('StageH', 
          `SELECT * FROM ${stageHModel.tableName} WHERE id = ?`, 
          [result.lastInsertRowid]
        );
        
        console.log('✅ Created first Stage H game record with business logic:', newRecord[0]);
        
        res.json({
          success: true,
          data: {
            gameId: firstRecord.gameId,
            lastId: result.lastInsertRowid,
            payout: firstRecord.payout,
            numberOfPlayerIds: businessValues.playerIdCount,
            selectedBoard: firstRecord.selectedBoard,
            isNew: true,
            message: 'First game ID created with Stage H business logic'
          },
          source: 'database_new',
          table: stageHModel.tableName,
          stage: 'stage-h'
        });
      } else {
        throw new Error('Failed to create first game record');
      }
    }
    
  } catch (error) {
    console.error('❌ Error getting last game ID from Stage H:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get last game ID from Stage H',
      details: error.message,
      stage: 'stage-h'
    });
  }
});

// POST /api/v1/stage-h/create - Create new Stage H record
router.post('/create', async (req, res) => {
  try {
    const modelManager = global.modelManager;
    if (!modelManager) {
      throw new Error('Model manager not initialized');
    }
    
    const stageHModel = modelManager.getModel('StageH');
    if (!stageHModel) {
      throw new Error('StageH model not found');
    }
    
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
    
    const businessValues = calculateBusinessValues('H', gameData.playerId, gameData.selectedBoard);
    
    const newRecordData = {
      ...gameData,
      payout: businessValues.payout,
      amount: businessValues.amount,
      totalBet: businessValues.totalBet,
      owner: businessValues.owner
    };
    
    const insertQuery = `
      INSERT INTO ${stageHModel.tableName} (
        gameId, playerId, payout, amount, totalBet, owner, 
        winnerBoard, winnerPlayerId, selectedBoard, status, 
        stage, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const insertParams = [
      newRecordData.gameId,
      newRecordData.playerId,
      newRecordData.payout,
      newRecordData.amount,
      newRecordData.totalBet,
      newRecordData.owner,
      newRecordData.winnerBoard || null,
      newRecordData.winnerPlayerId || null,
      newRecordData.selectedBoard,
      newRecordData.status || 'active',
      newRecordData.stage || 'H',
      JSON.stringify(newRecordData.metadata || {})
    ];
    
    const result = modelManager.executeRun('StageH', insertQuery, insertParams);
    
    if (result && result.lastInsertRowid) {
      const newRecord = modelManager.executeQuery('StageH', 
        `SELECT * FROM ${stageHModel.tableName} WHERE id = ?`, 
        [result.lastInsertRowid]
      );
      
      console.log('✅ Created new Stage H record with business logic:', newRecord[0]);
      
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
        message: 'Stage H record created with business logic',
        stage: 'stage-h'
      });
    } else {
      throw new Error('Failed to create Stage H record');
    }
    
  } catch (error) {
    console.error('❌ Error creating Stage H record:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create Stage H record',
      details: error.message
    });
  }
});

// GET /api/v1/stage-h/status - Check Stage H table status
router.get('/status', async (req, res) => {
  try {
    const modelManager = global.modelManager;
    if (!modelManager) {
      throw new Error('Model manager not initialized');
    }
    
    const stageHModel = modelManager.getModel('StageH');
    if (!stageHModel) {
      throw new Error('StageH model not found');
    }
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN winnerPlayerId IS NOT NULL THEN 1 END) as withWinners,
        COALESCE(SUM(payout), 0) as totalPayout
      FROM ${stageHModel.tableName}
    `;
    
    const stats = modelManager.executeQuery('StageH', statsQuery);
    const result = stats[0] || {};
    
    res.json({
      success: true,
      data: {
        table: stageHModel.tableName,
        database: 'tertiary',
        statistics: {
          total: result.total || 0,
          active: result.active || 0,
          completed: result.completed || 0,
          withWinners: result.withWinners || 0,
          totalPayout: result.totalPayout || 0
        },
        model: 'StageH',
        amount: STAGE_AMOUNTS.H
      },
      stage: 'stage-h'
    });
    
  } catch (error) {
    console.error('❌ Error getting Stage H status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get Stage H status',
      details: error.message
    });
  }
});

module.exports = router;
