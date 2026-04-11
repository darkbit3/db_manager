const fs = require('fs');
const path = require('path');

// Add update-game endpoint to all stage routes
const stages = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

const updateGameEndpoint = `
// PUT /api/v1/stage-{stage}/update-game - Update existing game with new bet
router.put('/update-game', async (req, res) => {
  try {
    const modelManager = global.modelManager;
    if (!modelManager) {
      throw new Error('Model manager not initialized');
    }
    
    const stage{stage}Model = modelManager.getModel('Stage{stage}');
    if (!stage{stage}Model) {
      throw new Error('Stage{stage} model not found');
    }
    
    const { newPlayerId, newBoardNumber, amount } = req.body;
    
    if (!newPlayerId || !newBoardNumber || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: newPlayerId, newBoardNumber, amount'
      });
    }
    
    console.log(\`🎯 DB Manager: Updating Stage {stage} game - Player: \${newPlayerId}, Board: \${newBoardNumber}, Amount: \${amount}\`);
    
    // Get the highest game ID record
    const query = \`
      SELECT * FROM \${stage{stage}Model.tableName} 
      WHERE gameId = (
        SELECT MAX(CAST(gameId AS INTEGER)) FROM \${stage{stage}Model.tableName}
      )
    \`;
    
    const existingGame = modelManager.executeQuery('Stage{stage}', query);
    
    if (!existingGame || existingGame.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No existing game found to update'
      });
    }
    
    const game = existingGame[0];
    console.log(\`📋 Found existing game: ID=\${game.gameId}, Players=\${game.playerId}, Boards=\${game.selectedBoard}\`);
    
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
      return \`\${playerId}:\${updatedBoards[index]}\`;
    }).join(',');
    
    // Calculate new business values
    const businessValues = calculateBusinessValues('{stage}', updatedPlayerIds.join(','), newSelectedBoard);
    
    console.log(\`💰 Updated business values - Total Bet: \${businessValues.totalBet}, Payout: \${businessValues.payout}\`);
    
    // Update the game record
    const updateQuery = \`
      UPDATE \${stage{stage}Model.tableName} SET
        playerId = ?,
        selectedBoard = ?,
        payout = ?,
        totalBet = ?,
        owner = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    \`;
    
    const updateParams = [
      updatedPlayerIds.join(','),
      newSelectedBoard,
      businessValues.payout,
      businessValues.totalBet,
      businessValues.owner,
      game.id
    ];
    
    const result = modelManager.executeRun('Stage{stage}', updateQuery, updateParams);
    
    if (result && result.changes > 0) {
      // Get the updated record
      const updatedRecord = modelManager.executeQuery('Stage{stage}', 
        \`SELECT * FROM \${stage{stage}Model.tableName} WHERE id = ?\`, 
        [game.id]
      );
      
      if (updatedRecord && updatedRecord.length > 0) {
        const updatedGame = updatedRecord[0];
        console.log(\`✅ Stage {stage} game updated successfully - Game ID: \${updatedGame.gameId}, Total Players: \${updatedPlayerIds.length}\`);
        
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
    console.error('❌ Error updating Stage {stage} game:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update game',
      details: error.message
    });
  }
});
`;

stages.forEach(stage => {
  const filePath = path.join(__dirname, `src/routes/stage${stage}Routes.js`);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add the endpoint before module.exports
    const endpointCode = updateGameEndpoint.replace(/{stage}/g, stage);
    
    if (!content.includes('update-game')) {
      // Find the position before module.exports
      const moduleExportsIndex = content.indexOf('module.exports');
      if (moduleExportsIndex !== -1) {
        content = content.slice(0, moduleExportsIndex) + endpointCode + '\n\n' + content.slice(moduleExportsIndex);
        fs.writeFileSync(filePath, content);
        console.log(`✅ Added update-game endpoint to Stage ${stage}`);
      } else {
        console.log(`❌ Could not find module.exports in Stage ${stage}`);
      }
    } else {
      console.log(`⚠️ Stage ${stage} already has update-game endpoint`);
    }
  } else {
    console.log(`❌ Stage ${stage} route file not found`);
  }
});

console.log('\n🎉 Update-game endpoints added to all stages!');
