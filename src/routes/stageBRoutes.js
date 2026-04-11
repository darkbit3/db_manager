const express = require('express');
const router = express.Router();

/**
 * Stage B Routes - Handle Stage B database operations
 * Amount: 10 (same as Stage A)
 */

// Import business logic functions from Stage A
const {
  STAGE_AMOUNTS,
  calculateBusinessValues,
  validateSelectedBoard,
  updateExistingRecords,
  generateSequentialGameId
} = require('./stageARoutes');

// GET /api/v1/stage-b/last-game-id - Get last game ID from stage_b table
router.get('/last-game-id', async (req, res) => {
  try {
    console.log('🔍 DB Manager: Received request for last game ID from Stage B');
    
    const modelManager = global.modelManager;
    if (!modelManager) {
      throw new Error('Model manager not initialized');
    }
    
    const stageBModel = modelManager.getModel('StageB');
    if (!stageBModel) {
      throw new Error('StageB model not found');
    }
    
    // Update existing records with new business logic
    await updateExistingRecords(modelManager, 'B');
    
    console.log('📋 Querying stage_b table for highest game ID...');
    
    const query = `
      SELECT * FROM ${stageBModel.tableName} 
      ORDER BY id DESC, createdAt DESC 
      LIMIT 1
    `;
    
    const lastRecord = modelManager.executeQuery('StageB', query);
    
    if (lastRecord && lastRecord.length > 0) {
      const gameData = lastRecord[0];
      console.log('✅ Found existing game record:', gameData);
      
      const businessValues = calculateBusinessValues('B', gameData.playerId, gameData.selectedBoard);
      
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
        table: stageBModel.tableName,
        stage: 'stage-b'
      });
      
    } else {
      // Create first game ID with Stage B business logic (amount = 10)
      console.log('📝 No records found, creating first game ID for Stage B...');
      
      const firstGameId = generateSequentialGameId(modelManager, 'B');
      const samplePlayerIds = "+251909090909,+251909090910";
      const sampleSelectedBoard = "+251909090909:2,+251909090910:4";
      
      console.log(`🎯 Generated first game ID for Stage B: ${firstGameId}`);
      
      const boardValidation = validateSelectedBoard(sampleSelectedBoard);
      if (!boardValidation.isValid) {
        throw new Error(`Invalid selectedBoard format: ${boardValidation.error}`);
      }
      
      const businessValues = calculateBusinessValues('B', samplePlayerIds, sampleSelectedBoard);
      
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
        gameData: JSON.stringify({
          createdAt: new Date().toISOString(),
          isInitialGame: true,
          stage: 'B',
          businessLogic: 'applied',
          gameSequence: 1
        }),
        stage: 'B',
        metadata: JSON.stringify({
          created: 'system',
          purpose: 'initial_game',
          timestamp: new Date().toISOString(),
          businessRules: 'stage_b_applied',
          gameSequence: 1
        })
      };
      
      const insertQuery = `
        INSERT INTO ${stageBModel.tableName} (
          gameId, playerId, payout, amount, totalBet, owner, 
          winnerBoard, winnerPlayerId, selectedBoard, status, 
          gameData, stage, metadata
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
        JSON.stringify({
          createdAt: new Date().toISOString(),
          isInitialGame: true,
          stage: 'B',
          businessLogic: 'applied'
        }),
        firstRecord.stage,
        JSON.stringify({
          created: 'system',
          purpose: 'initial_game',
          timestamp: new Date().toISOString(),
          businessRules: 'stage_b_applied'
        })
      ];
      
      const result = modelManager.executeRun('StageB', insertQuery, insertParams);
      
      if (result && result.lastInsertRowid) {
        const newRecord = modelManager.executeQuery('StageB', 
          `SELECT * FROM ${stageBModel.tableName} WHERE id = ?`, 
          [result.lastInsertRowid]
        );
        
        console.log('✅ Created first Stage B game record with business logic:', newRecord[0]);
        
        res.json({
          success: true,
          data: {
            gameId: firstRecord.gameId,
            lastId: result.lastInsertRowid,
            payout: firstRecord.payout,
            numberOfPlayerIds: businessValues.playerIdCount,
            selectedBoard: firstRecord.selectedBoard,
            isNew: true,
            message: 'First game ID created with Stage B business logic'
          },
          source: 'database_new',
          table: stageBModel.tableName,
          stage: 'stage-b'
        });
      } else {
        throw new Error('Failed to create first game record');
      }
    }
    
  } catch (error) {
    console.error('❌ Error getting last game ID from Stage B:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get last game ID from Stage B',
      details: error.message,
      stage: 'stage-b'
    });
  }
});

// POST /api/v1/stage-b/create - Create new Stage B record
router.post('/create', async (req, res) => {
  try {
    const modelManager = global.modelManager;
    if (!modelManager) {
      throw new Error('Model manager not initialized');
    }
    
    const stageBModel = modelManager.getModel('StageB');
    if (!stageBModel) {
      throw new Error('StageB model not found');
    }
    
    const gameData = req.body;
    
    if (!gameData.playerId || !gameData.selectedBoard) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: playerId, selectedBoard'
      });
    }
    
    const boardValidation = validateSelectedBoard(gameData.selectedBoard);
    if (!boardValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: `Invalid selectedBoard format: ${boardValidation.error}`
      });
    }
    
    // Generate sequential game ID if not provided
    const gameId = gameData.gameId || generateSequentialGameId(modelManager, 'B');
    console.log(`🎯 Generated game ID for Stage B: ${gameId}`);
    
    const businessValues = calculateBusinessValues('B', gameData.playerId, gameData.selectedBoard);
    
    // Extract game sequence number from the generated ID
    const gameSequenceMatch = gameId.match(new RegExp(`GAME_B_(\\d+)$`));
    const gameSequence = gameSequenceMatch ? parseInt(gameSequenceMatch[1]) : 1;
    
    const newRecordData = {
      ...gameData,
      gameId: gameId,
      payout: businessValues.payout,
      amount: businessValues.amount,
      totalBet: businessValues.totalBet,
      owner: businessValues.owner,
      gameData: JSON.stringify({
        ...JSON.parse(gameData.gameData || '{}'),
        createdAt: new Date().toISOString(),
        businessLogic: 'applied',
        gameSequence: gameSequence
      }),
      metadata: JSON.stringify({
        ...JSON.parse(gameData.metadata || '{}'),
        created: 'api',
        timestamp: new Date().toISOString(),
        businessRules: 'stage_b_applied',
        gameSequence: gameSequence
      })
    };
    
    const insertQuery = `
      INSERT INTO ${stageBModel.tableName} (
        gameId, playerId, payout, amount, totalBet, owner, 
        winnerBoard, winnerPlayerId, selectedBoard, status, 
        gameData, stage, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      newRecordData.gameData,
      newRecordData.stage || 'B',
      newRecordData.metadata
    ];
    
    const result = modelManager.executeRun('StageB', insertQuery, insertParams);
    
    if (result && result.lastInsertRowid) {
      const newRecord = modelManager.executeQuery('StageB', 
        `SELECT * FROM ${stageBModel.tableName} WHERE id = ?`, 
        [result.lastInsertRowid]
      );
      
      console.log('✅ Created new Stage B record with sequential game ID:', newRecord[0]);
      
      res.json({
        success: true,
        data: {
          ...newRecord[0],
          businessLogic: {
            amount: businessValues.amount,
            playerIdCount: businessValues.playerIdCount,
            totalBet: businessValues.totalBet,
            payout: businessValues.payout,
            owner: businessValues.owner,
            gameSequence: gameSequence
          }
        },
        message: 'Stage B record created with sequential game ID',
        stage: 'stage-b'
      });
    } else {
      throw new Error('Failed to create Stage B record');
    }
    
  } catch (error) {
    console.error('❌ Error creating Stage B record:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create Stage B record',
      details: error.message
    });
  }
});

// GET /api/v1/stage-b/status - Check Stage B table status
router.get('/status', async (req, res) => {
  try {
    const modelManager = global.modelManager;
    if (!modelManager) {
      throw new Error('Model manager not initialized');
    }
    
    const stageBModel = modelManager.getModel('StageB');
    if (!stageBModel) {
      throw new Error('StageB model not found');
    }
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN winnerPlayerId IS NOT NULL THEN 1 END) as withWinners,
        COALESCE(SUM(payout), 0) as totalPayout
      FROM ${stageBModel.tableName}
    `;
    
    const stats = modelManager.executeQuery('StageB', statsQuery);
    const result = stats[0] || {};
    
    res.json({
      success: true,
      data: {
        table: stageBModel.tableName,
        database: 'primary',
        statistics: {
          total: result.total || 0,
          active: result.active || 0,
          completed: result.completed || 0,
          withWinners: result.withWinners || 0,
          totalPayout: result.totalPayout || 0
        },
        model: 'StageB',
        amount: STAGE_AMOUNTS.B
      },
      stage: 'stage-b'
    });
    
  } catch (error) {
    console.error('❌ Error getting Stage B status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get Stage B status',
      details: error.message
    });
  }
});

// PUT /api/v1/stage-b/update-game - Update existing game with new bet
router.put('/update-game', async (req, res) => {
  try {
    const modelManager = global.modelManager;
    if (!modelManager) {
      throw new Error('Model manager not initialized');
    }
    
    const stageBModel = modelManager.getModel('StageB');
    if (!stageBModel) {
      throw new Error('StageB model not found');
    }
    
    const { newPlayerId, newBoardNumber, amount } = req.body;
    
    if (!newPlayerId || !newBoardNumber || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: newPlayerId, newBoardNumber, amount'
      });
    }
    
    console.log(`🎯 DB Manager: Updating Stage B game - Player: ${newPlayerId}, Board: ${newBoardNumber}, Amount: ${amount}`);
    
    // Get the highest game ID record
    const query = `
      SELECT * FROM ${stageBModel.tableName} 
      WHERE gameId = (
        SELECT MAX(CAST(gameId AS INTEGER)) FROM ${stageBModel.tableName}
      )
    `;
    
    const existingGame = modelManager.executeQuery('StageB', query);
    
    if (!existingGame || existingGame.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No existing game found to update'
      });
    }
    
    const game = existingGame[0];
    console.log(`📋 Found existing game: ID=${game.gameId}, Players=${game.playerId}, Boards=${game.selectedBoard}`);
    
    // Parse existing data
    const existingPlayerIds = game.playerId ? game.playerId.split(',').map(id => id.trim()).filter(id => id) : [];
    const existingBoards = game.selectedBoard ? game.selectedBoard.split(',').map(board => board.trim()).filter(board => board) : [];
    
    // Check if this player already has a bet
    if (existingPlayerIds.includes(newPlayerId)) {
      return res.status(400).json({
        success: false,
        error: 'Player already has a bet in this game'
      });
    }
    
    // Check if this board is already taken
    if (existingBoards.includes(newBoardNumber.toString())) {
      return res.status(400).json({
        success: false,
        error: 'Board already taken in this game'
      });
    }
    
    // Add new player and board
    const updatedPlayerIds = [...existingPlayerIds, newPlayerId];
    const updatedBoards = [...existingBoards, newBoardNumber.toString()];
    
    // Create new selectedBoard format: "+251909090999:123,+251909090888:456"
    const newSelectedBoard = updatedPlayerIds.map((playerId, index) => {
      return `${playerId}:${updatedBoards[index]}`;
    }).join(',');
    
    // Calculate new business values
    const businessValues = calculateBusinessValues('B', updatedPlayerIds.join(','), newSelectedBoard);
    
    console.log(`💰 Updated business values - Total Bet: ${businessValues.totalBet}, Payout: ${businessValues.payout}`);
    
    // Update the game record
    const updateQuery = `
      UPDATE ${stageBModel.tableName} SET
        playerId = ?,
        selectedBoard = ?,
        payout = ?,
        totalBet = ?,
        owner = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const updateParams = [
      updatedPlayerIds.join(','),
      newSelectedBoard,
      businessValues.payout,
      businessValues.totalBet,
      businessValues.owner,
      game.id
    ];
    
    const result = modelManager.executeRun('StageB', updateQuery, updateParams);
    
    if (result && result.changes > 0) {
      // Get the updated record
      const updatedRecord = modelManager.executeQuery('StageB', 
        `SELECT * FROM ${stageBModel.tableName} WHERE id = ?`, 
        [game.id]
      );
      
      if (updatedRecord && updatedRecord.length > 0) {
        const updatedGame = updatedRecord[0];
        console.log(`✅ Stage B game updated successfully - Game ID: ${updatedGame.gameId}, Total Players: ${updatedPlayerIds.length}`);
        
        res.json({
          success: true,
          data: {
            gameId: updatedGame.gameId,
            playerId: updatedGame.playerId,
            selectedBoard: updatedGame.selectedBoard,
            payout: updatedGame.payout,
            totalBet: updatedGame.totalBet,
            owner: updatedGame.owner,
            totalPlayers: updatedPlayerIds.length,
            boards: updatedBoards.join(','),
            timestamp: updatedGame.updatedAt
          },
          message: 'Game updated successfully with new bet'
        });
      } else {
        throw new Error('Failed to retrieve updated game record');
      }
    } else {
      throw new Error('Failed to update game record');
    }
    
  } catch (error) {
    console.error('❌ Error updating Stage B game:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update game',
      details: error.message
    });
  }
});

module.exports = router;
