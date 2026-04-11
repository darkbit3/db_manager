const express = require('express');
const router = express.Router();

/**
 * Stage A Routes - Handle Stage A database operations
 * This handles requests from Stage 1 backend service
 */

// Stage-specific amount constants
const STAGE_AMOUNTS = {
  'A': 10, 'B': 10,
  'C': 20, 'D': 20,
  'E': 30, 'F': 30,
  'G': 50, 'H': 50,
  'I': 100, 'J': 100,
  'K': 200, 'L': 200
};

/**
 * Calculate business values based on stage rules
 */
function calculateBusinessValues(stage, playerIds, selectedBoard) {
  const amount = STAGE_AMOUNTS[stage] || 10;
  
  // Count playerIds (handle both string and array formats)
  let playerIdCount = 0;
  let parsedPlayerIds = [];
  
  if (typeof playerIds === 'string') {
    // Parse comma-separated playerIds
    parsedPlayerIds = playerIds.split(',').map(id => id.trim()).filter(id => id);
  } else if (Array.isArray(playerIds)) {
    parsedPlayerIds = playerIds;
  }
  
  playerIdCount = parsedPlayerIds.length;
  
  // Calculate totalBet = playerIdCount × amount
  const totalBet = playerIdCount * amount;
  
  // Calculate payout = totalBet × 80%
  const payout = totalBet * 0.8;
  
  // Calculate owner = totalBet × 20%
  const owner = totalBet * 0.2;
  
  return {
    amount,
    playerIdCount,
    totalBet,
    payout,
    owner,
    parsedPlayerIds
  };
}

/**
 * Validate selectedBoard format: "+251909090909:2","+251909090909:4"
 */
function validateSelectedBoard(selectedBoard) {
  if (!selectedBoard) return { isValid: false, error: 'selectedBoard is required' };
  
  try {
    const boards = selectedBoard.split(',');
    const parsedBoards = [];
    
    for (const board of boards) {
      const trimmed = board.trim();
      if (!trimmed) continue;
      
      // Check format: +phonenumber:boardNumber
      const match = trimmed.match(/^\+(\d+):(\d+)$/);
      if (!match) {
        return { 
          isValid: false, 
          error: `Invalid format: ${trimmed}. Expected format: +phonenumber:boardNumber` 
        };
      }
      
      const [, playerId, boardNumber] = match;
      parsedBoards.push({
        playerId: `+${playerId}`,
        boardNumber: parseInt(boardNumber),
        original: trimmed
      });
    }
    
    return { 
      isValid: true, 
      parsedBoards,
      playerIds: parsedBoards.map(b => b.playerId)
    };
  } catch (error) {
    return { isValid: false, error: error.message };
  }
}

/**
 * Generate sequential game ID starting from 1
 */
function generateSequentialGameId(modelManager, stage) {
  try {
    const model = modelManager.getModel(`Stage${stage.toUpperCase()}`);
    if (!model) return "1";
    
    // Get the highest existing game number
    const query = `
      SELECT CAST(gameId AS INTEGER) as gameNumber FROM ${model.tableName} 
      WHERE gameId GLOB '*[0-9]*'
      ORDER BY CAST(gameId AS INTEGER) DESC 
      LIMIT 1
    `;
    
    const lastRecord = modelManager.executeQuery(`Stage${stage.toUpperCase()}`, query);
    
    let nextNumber = 1;
    if (lastRecord && lastRecord.length > 0) {
      const lastGameNumber = lastRecord[0].gameNumber;
      if (lastGameNumber && !isNaN(lastGameNumber)) {
        nextNumber = parseInt(lastGameNumber) + 1;
      }
    }
    
    // Return simple number as string
    return nextNumber.toString();
    
  } catch (error) {
    console.error(`Error generating game ID for Stage ${stage}:`, error.message);
    return `GAME_${Date.now()}_001`;
  }
}
function updateExistingRecords(modelManager, stage) {
  try {
    const model = modelManager.getModel(`Stage${stage.toUpperCase()}`);
    if (!model) return false;
    
    console.log(`🔄 Updating existing records for Stage ${stage}...`);
    
    // Get all records
    const records = modelManager.executeQuery(`Stage${stage.toUpperCase()}`, 
      `SELECT * FROM ${model.tableName}`
    );
    
    let updatedCount = 0;
    
    for (const record of records) {
      let needsUpdate = false;
      const updates = {};
      
      // Calculate amount based on stage
      const amount = STAGE_AMOUNTS[stage.toUpperCase()] || 10;
      if (record.amount !== amount) {
        updates.amount = amount;
        needsUpdate = true;
      }
      
      // Calculate totalBet based on playerIds
      if (record.playerId) {
        const businessValues = calculateBusinessValues(stage.toUpperCase(), record.playerId, record.selectedBoard);
        
        if (record.totalBet !== businessValues.totalBet) {
          updates.totalBet = businessValues.totalBet;
          needsUpdate = true;
        }
        
        if (record.payout !== businessValues.payout) {
          updates.payout = businessValues.payout;
          needsUpdate = true;
        }
        
        // Update owner column (convert to numeric if needed)
        const ownerValue = businessValues.owner;
        if (record.owner != ownerValue) {
          updates.owner = ownerValue;
          needsUpdate = true;
        }
      }
      
      // Update record if needed
      if (needsUpdate) {
        const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        values.push(record.id);
        
        const updateQuery = `UPDATE ${model.tableName} SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
        modelManager.executeRun(`Stage${stage.toUpperCase()}`, updateQuery, values);
        updatedCount++;
      }
    }
    
    console.log(`✅ Updated ${updatedCount} records for Stage ${stage}`);
    return updatedCount;
  } catch (error) {
    console.error(`❌ Error updating records for Stage ${stage}:`, error.message);
    return false;
  }
}

// GET /api/v1/stage-a/last-game-id - Get last game ID from stage_a table
router.get('/last-game-id', async (req, res) => {
  try {
    console.log('🔍 DB Manager: Received request for last game ID from Stage A');
    
    // Get the model manager from global scope
    const modelManager = global.modelManager;
    if (!modelManager) {
      throw new Error('Model manager not initialized');
    }
    
    // Get the StageA model
    const stageAModel = modelManager.getModel('StageA');
    if (!stageAModel) {
      throw new Error('StageA model not found');
    }
    
    // Update existing records with new business logic
    await updateExistingRecords(modelManager, 'A');
    
    console.log('📋 Querying stage_a table for highest game ID...');
    
    // Query for the highest record (highest ID or most recent)
    const query = `
      SELECT * FROM ${stageAModel.tableName} 
      ORDER BY id DESC, createdAt DESC 
      LIMIT 1
    `;
    
    const lastRecord = modelManager.executeQuery('StageA', query);
    
    if (lastRecord && lastRecord.length > 0) {
      // Found existing record
      const gameData = lastRecord[0];
      console.log('✅ Found existing game record:', gameData);
      
      // Return only the required fields for Stage1
      const businessValues = calculateBusinessValues('A', gameData.playerId, gameData.selectedBoard);
      
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
        table: stageAModel.tableName,
        stage: 'stage-a'
      });
      
    } else {
      // No records found - create the first game ID with business logic
      console.log('📝 No records found, creating first game ID...');
      
      const firstGameId = generateSequentialGameId(modelManager, 'A');
      const samplePlayerIds = "+251909090909,+251909090910";
      const sampleSelectedBoard = "+251909090909:2,+251909090910:4";
      
      console.log(`🎯 Generated first game ID: ${firstGameId}`);
      
      // Validate selectedBoard format
      const boardValidation = validateSelectedBoard(sampleSelectedBoard);
      if (!boardValidation.isValid) {
        throw new Error(`Invalid selectedBoard format: ${boardValidation.error}`);
      }
      
      // Calculate business values
      const businessValues = calculateBusinessValues('A', samplePlayerIds, sampleSelectedBoard);
      
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
          stage: 'A',
          businessLogic: 'applied',
          gameSequence: 1
        }),
        stage: 'A',
        metadata: JSON.stringify({
          created: 'system',
          purpose: 'initial_game',
          timestamp: new Date().toISOString(),
          businessRules: 'stage_a_applied',
          gameSequence: 1
        })
      };
      
      // Insert the first record
      const insertQuery = `
        INSERT INTO ${stageAModel.tableName} (
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
      
      const result = modelManager.executeRun('StageA', insertQuery, insertParams);
      
      if (result && result.lastInsertRowid) {
        // Get the inserted record
        const newRecord = modelManager.executeQuery('StageA', 
          `SELECT * FROM ${stageAModel.tableName} WHERE id = ?`, 
          [result.lastInsertRowid]
        );
        
        console.log('✅ Created first game record with business logic:', newRecord[0]);
        
        res.json({
          success: true,
          data: {
            gameId: firstRecord.gameId,
            lastId: result.lastInsertRowid,
            payout: firstRecord.payout,
            numberOfPlayerIds: businessValues.playerIdCount,
            selectedBoard: firstRecord.selectedBoard,
            isNew: true,
            message: 'First game ID created with business logic'
          },
          source: 'database_new',
          table: stageAModel.tableName,
          stage: 'stage-a'
        });
        
      } else {
        throw new Error('Failed to create first game record');
      }
    }
    
  } catch (error) {
    console.error('❌ Error getting last game ID from Stage A:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get last game ID from Stage A',
      details: error.message,
      stage: 'stage-a'
    });
  }
});

// GET /api/v1/stage-a/status - Check Stage A table status
router.get('/status', async (req, res) => {
  try {
    const modelManager = global.modelManager;
    if (!modelManager) {
      throw new Error('Model manager not initialized');
    }
    
    const stageAModel = modelManager.getModel('StageA');
    if (!stageAModel) {
      throw new Error('StageA model not found');
    }
    
    // Get table statistics directly
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN winnerPlayerId IS NOT NULL THEN 1 END) as withWinners,
        COALESCE(SUM(payout), 0) as totalPayout
      FROM ${stageAModel.tableName}
    `;
    
    const stats = modelManager.executeQuery('StageA', statsQuery);
    const result = stats[0] || {};
    
    res.json({
      success: true,
      data: {
        table: stageAModel.tableName,
        database: 'primary',
        statistics: {
          total: result.total || 0,
          active: result.active || 0,
          completed: result.completed || 0,
          withWinners: result.withWinners || 0,
          totalPayout: result.totalPayout || 0
        },
        model: 'StageA'
      },
      stage: 'stage-a'
    });
    
  } catch (error) {
    console.error('❌ Error getting Stage A status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get Stage A status',
      details: error.message
    });
  }
});

// POST /api/v1/stage-a/create - Create new Stage A record
router.post('/create', async (req, res) => {
  try {
    const modelManager = global.modelManager;
    if (!modelManager) {
      throw new Error('Model manager not initialized');
    }
    
    const stageAModel = modelManager.getModel('StageA');
    if (!stageAModel) {
      throw new Error('StageA model not found');
    }
    
    const gameData = req.body;
    
    // Validate required fields (gameId is optional - will be generated)
    if (!gameData.playerId || !gameData.selectedBoard) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: playerId, selectedBoard'
      });
    }
    
    // Validate selectedBoard format
    const boardValidation = validateSelectedBoard(gameData.selectedBoard);
    if (!boardValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: `Invalid selectedBoard format: ${boardValidation.error}`
      });
    }
    
    // Generate sequential game ID if not provided
    const gameId = gameData.gameId || generateSequentialGameId(modelManager, 'A');
    console.log(`🎯 Generated game ID for new record: ${gameId}`);
    
    // Calculate business values for Stage A
    const businessValues = calculateBusinessValues('A', gameData.playerId, gameData.selectedBoard);
    
    // Extract game sequence number from the generated ID
    const gameSequenceMatch = gameId.match(new RegExp(`GAME_A_(\\d+)$`));
    const gameSequence = gameSequenceMatch ? parseInt(gameSequenceMatch[1]) : 1;
    
    // Create the record with calculated business values
    const newRecordData = {
      ...gameData,
      gameId: gameId,
      payout: businessValues.payout,
      amount: businessValues.amount,
      totalBet: businessValues.totalBet,
      owner: businessValues.owner,
      registrationData: JSON.stringify({
        ...JSON.parse(gameData.registrationData || '{}'),
        createdAt: new Date().toISOString(),
        businessLogic: 'applied',
        gameSequence: gameSequence
      }),
      metadata: JSON.stringify({
        ...JSON.parse(gameData.metadata || '{}'),
        created: 'api',
        timestamp: new Date().toISOString(),
        businessRules: 'stage_a_applied',
        gameSequence: gameSequence
      })
    };
    
    // Insert the record using the model
    const insertQuery = `
      INSERT INTO ${stageAModel.tableName} (
        gameId, playerId, payout, amount, totalBet, owner, 
        winnerBoard, winnerPlayerId, selectedBoard, status, 
        registrationData, stage, metadata
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
      newRecordData.registrationData,
      newRecordData.stage || 'A',
      newRecordData.metadata
    ];
    
    const result = modelManager.executeRun('StageA', insertQuery, insertParams);
    
    if (result && result.lastInsertRowid) {
      // Get the inserted record
      const newRecord = modelManager.executeQuery('StageA', 
        `SELECT * FROM ${stageAModel.tableName} WHERE id = ?`, 
        [result.lastInsertRowid]
      );
      
      console.log('✅ Created new Stage A record with sequential game ID:', newRecord[0]);
      
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
        message: 'Stage A record created with sequential game ID',
        stage: 'stage-a'
      });
    } else {
      throw new Error('Failed to create Stage A record');
    }
    
  } catch (error) {
    console.error('❌ Error creating Stage A record:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create Stage A record',
      details: error.message
    });
  }
});

// PUT /api/v1/stage-a/update-game - Update existing game with new bet
router.put('/update-game', async (req, res) => {
  try {
    const modelManager = global.modelManager;
    if (!modelManager) {
      throw new Error('Model manager not initialized');
    }
    
    const stageAModel = modelManager.getModel('StageA');
    if (!stageAModel) {
      throw new Error('StageA model not found');
    }
    
    const { newPlayerId, newBoardNumber, amount } = req.body;
    
    if (!newPlayerId || !newBoardNumber || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: newPlayerId, newBoardNumber, amount'
      });
    }
    
    console.log(`🎯 DB Manager: Updating Stage A game - Player: ${newPlayerId}, Board: ${newBoardNumber}, Amount: ${amount}`);
    
    // Get the highest game ID record
    const query = `
      SELECT * FROM ${stageAModel.tableName} 
      WHERE gameId = (
        SELECT MAX(CAST(gameId AS INTEGER)) FROM ${stageAModel.tableName}
      )
    `;
    
    const existingGame = modelManager.executeQuery('StageA', query);
    
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
    const selectedBoardData = game.selectedBoard || '';
    
    // Parse complex selectedBoard format: "playerId:board,playerId:board"
    const playerBoardPairs = selectedBoardData.split(',').map(pair => pair.trim()).filter(pair => pair.includes(':'));
    const playerBoardsMap = new Map();
    
    playerBoardPairs.forEach(pair => {
      const parts = pair.split(':');
      if (parts.length >= 2) {
        const playerId = parts[0].trim();
        const boardNumber = parts[1].trim();
        
        if (!playerBoardsMap.has(playerId)) {
          playerBoardsMap.set(playerId, []);
        }
        playerBoardsMap.get(playerId).push(boardNumber);
      }
    });
    
    // Count how many boards this player already has
    const playerBoardCount = playerBoardsMap.get(newPlayerId)?.length || 0;
    
    console.log(`🔍 Player ${newPlayerId} currently has ${playerBoardCount} boards:`, playerBoardsMap.get(newPlayerId));
    
    // Check if this player already has 2 boards (limit reached)
    if (playerBoardCount >= 2) {
      return res.status(400).json({
        success: false,
        error: 'Player has reached maximum limit of 2 boards per game',
        currentBoards: playerBoardCount,
        maxBoards: 2
      });
    }
    
    // Check if this board is already taken
    const allExistingBoards = Array.from(playerBoardsMap.values()).flat();
    if (allExistingBoards.includes(newBoardNumber.toString())) {
      return res.status(400).json({
        success: false,
        error: 'Board already taken in this game'
      });
    }
    
    // Add new player and board to the map
    if (!playerBoardsMap.has(newPlayerId)) {
      playerBoardsMap.set(newPlayerId, []);
    }
    playerBoardsMap.get(newPlayerId).push(newBoardNumber.toString());
    
    // Create new selectedBoard format: "playerId:board,playerId:board"
    const newSelectedBoardPairs = [];
    playerBoardsMap.forEach((boards, playerId) => {
      boards.forEach(board => {
        newSelectedBoardPairs.push(`${playerId}:${board}`);
      });
    });
    const newSelectedBoard = newSelectedBoardPairs.join(',');
    
    // Create updated player IDs list (with duplicates for multiple boards)
    const updatedPlayerIds = [];
    playerBoardsMap.forEach((boards, playerId) => {
      boards.forEach(() => {
        updatedPlayerIds.push(playerId);
      });
    });
    
    // Calculate new business values
    const businessValues = calculateBusinessValues('A', updatedPlayerIds.join(','), newSelectedBoard);
    
    console.log(`💰 Updated business values - Total Bet: ${businessValues.totalBet}, Payout: ${businessValues.payout}`);
    console.log(`📋 New selectedBoard format: ${newSelectedBoard}`);
    
    // Update the game record
    const updateQuery = `
      UPDATE ${stageAModel.tableName} SET
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
    
    const result = modelManager.executeRun('StageA', updateQuery, updateParams);
    
    if (result && result.changes > 0) {
      // Get the updated record
      const updatedRecord = modelManager.executeQuery('StageA', 
        `SELECT * FROM ${stageAModel.tableName} WHERE id = ?`, 
        [game.id]
      );
      
      if (updatedRecord && updatedRecord.length > 0) {
        const updatedGame = updatedRecord[0];
        console.log(`✅ Stage A game updated successfully - Game ID: ${updatedGame.gameId}, Total Players: ${updatedPlayerIds.length}`);
        
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
    console.error('❌ Error updating Stage A game:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update game',
      details: error.message
    });
  }
});

module.exports = {
  router,
  STAGE_AMOUNTS,
  calculateBusinessValues,
  validateSelectedBoard,
  updateExistingRecords,
  generateSequentialGameId
};
