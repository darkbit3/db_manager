const express = require('express');
const router = express.Router();

/**
 * Stage F Routes - Handle Stage F database operations
 * Amount: 30 (same as Stage E)
 */

// Import business logic functions from Stage A
const {
  STAGE_AMOUNTS,
  calculateBusinessValues,
  validateSelectedBoard,
  updateExistingRecords
} = require('./stageARoutes');

// GET /api/v1/stage-f/last-game-id - Get last game ID from stage_f table
router.get('/last-game-id', async (req, res) => {
  try {
    console.log('🔍 DB Manager: Received request for last game ID from Stage F');
    
    const modelManager = global.modelManager;
    if (!modelManager) {
      throw new Error('Model manager not initialized');
    }
    
    const stageFModel = modelManager.getModel('StageF');
    if (!stageFModel) {
      throw new Error('StageF model not found');
    }
    
    // Update existing records with new business logic
    await updateExistingRecords(modelManager, 'F');
    
    console.log('📋 Querying stage_f table for highest game ID...');
    
    const query = `
      SELECT * FROM ${stageFModel.tableName} 
      ORDER BY id DESC, createdAt DESC 
      LIMIT 1
    `;
    
    const lastRecord = modelManager.executeQuery('StageF', query);
    
    if (lastRecord && lastRecord.length > 0) {
      const gameData = lastRecord[0];
      console.log('✅ Found existing game record:', gameData);
      
      const businessValues = calculateBusinessValues('F', gameData.playerId, gameData.selectedBoard);
      
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
        table: stageFModel.tableName,
        stage: 'stage-f'
      });
      
    } else {
      // Create first game ID with Stage F business logic (amount = 30)
      console.log('📝 No records found, creating first game ID for Stage F...');
      
      const firstGameId = `GAME_${Date.now()}_F001`;
      const samplePlayerIds = "+251909090909,+251909090910";
      const sampleSelectedBoard = "+251909090909:2,+251909090910:4";
      
      const boardValidation = validateSelectedBoard(sampleSelectedBoard);
      if (!boardValidation.isValid) {
        throw new Error(`Invalid selectedBoard format: ${boardValidation.error}`);
      }
      
      const businessValues = calculateBusinessValues('F', samplePlayerIds, sampleSelectedBoard);
      
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
          stage: 'F',
          businessLogic: 'applied'
        }),
        stage: 'F',
        metadata: JSON.stringify({
          created: 'system',
          purpose: 'initial_game',
          timestamp: new Date().toISOString(),
          businessRules: 'stage_f_applied'
        })
      };
      
      const insertQuery = `
        INSERT INTO ${stageFModel.tableName} (
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
      
      const result = modelManager.executeRun('StageF', insertQuery, insertParams);
      
      if (result && result.lastInsertRowid) {
        const newRecord = modelManager.executeQuery('StageF', 
          `SELECT * FROM ${stageFModel.tableName} WHERE id = ?`, 
          [result.lastInsertRowid]
        );
        
        console.log('✅ Created first Stage F game record with business logic:', newRecord[0]);
        
        res.json({
          success: true,
          data: {
            gameId: firstRecord.gameId,
            lastId: result.lastInsertRowid,
            payout: firstRecord.payout,
            numberOfPlayerIds: businessValues.playerIdCount,
            selectedBoard: firstRecord.selectedBoard,
            isNew: true,
            message: 'First game ID created with Stage F business logic'
          },
          source: 'database_new',
          table: stageFModel.tableName,
          stage: 'stage-f'
        });
      } else {
        throw new Error('Failed to create first game record');
      }
    }
    
  } catch (error) {
    console.error('❌ Error getting last game ID from Stage F:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get last game ID from Stage F',
      details: error.message,
      stage: 'stage-f'
    });
  }
});

// POST /api/v1/stage-f/create - Create new Stage F record
router.post('/create', async (req, res) => {
  try {
    const modelManager = global.modelManager;
    if (!modelManager) {
      throw new Error('Model manager not initialized');
    }
    
    const stageFModel = modelManager.getModel('StageF');
    if (!stageFModel) {
      throw new Error('StageF model not found');
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
    
    const businessValues = calculateBusinessValues('F', gameData.playerId, gameData.selectedBoard);
    
    const newRecordData = {
      ...gameData,
      payout: businessValues.payout,
      amount: businessValues.amount,
      totalBet: businessValues.totalBet,
      owner: businessValues.owner
    };
    
    const insertQuery = `
      INSERT INTO ${stageFModel.tableName} (
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
      newRecordData.stage || 'F',
      JSON.stringify(newRecordData.metadata || {})
    ];
    
    const result = modelManager.executeRun('StageF', insertQuery, insertParams);
    
    if (result && result.lastInsertRowid) {
      const newRecord = modelManager.executeQuery('StageF', 
        `SELECT * FROM ${stageFModel.tableName} WHERE id = ?`, 
        [result.lastInsertRowid]
      );
      
      console.log('✅ Created new Stage F record with business logic:', newRecord[0]);
      
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
        message: 'Stage F record created with business logic',
        stage: 'stage-f'
      });
    } else {
      throw new Error('Failed to create Stage F record');
    }
    
  } catch (error) {
    console.error('❌ Error creating Stage F record:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create Stage F record',
      details: error.message
    });
  }
});

// GET /api/v1/stage-f/status - Check Stage F table status
router.get('/status', async (req, res) => {
  try {
    const modelManager = global.modelManager;
    if (!modelManager) {
      throw new Error('Model manager not initialized');
    }
    
    const stageFModel = modelManager.getModel('StageF');
    if (!stageFModel) {
      throw new Error('StageF model not found');
    }
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN winnerPlayerId IS NOT NULL THEN 1 END) as withWinners,
        COALESCE(SUM(payout), 0) as totalPayout
      FROM ${stageFModel.tableName}
    `;
    
    const stats = modelManager.executeQuery('StageF', statsQuery);
    const result = stats[0] || {};
    
    res.json({
      success: true,
      data: {
        table: stageFModel.tableName,
        database: 'secondary',
        statistics: {
          total: result.total || 0,
          active: result.active || 0,
          completed: result.completed || 0,
          withWinners: result.withWinners || 0,
          totalPayout: result.totalPayout || 0
        },
        model: 'StageF',
        amount: STAGE_AMOUNTS.F
      },
      stage: 'stage-f'
    });
    
  } catch (error) {
    console.error('❌ Error getting Stage F status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get Stage F status',
      details: error.message
    });
  }
});

module.exports = router;
