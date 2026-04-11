const fs = require('fs');
const path = require('path');

// Fix INSERT queries for stages C-L to remove registrationData column
const stages = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

stages.forEach(stage => {
  const filePath = path.join(__dirname, `src/routes/stage${stage}Routes.js`);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace the INSERT query to remove registrationData
    const oldQuery = `INSERT INTO ${stage.toLowerCase()}_${stage.toLowerCase()}Model.tableName} (
        gameId, playerId, payout, amount, totalBet, owner, 
        winnerBoard, winnerPlayerId, selectedBoard, status, 
        registrationData, stage, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const newQuery = `INSERT INTO ${stage.toLowerCase()}_${stage.toLowerCase()}Model.tableName} (
        gameId, playerId, payout, amount, totalBet, owner, 
        winnerBoard, winnerPlayerId, selectedBoard, status, 
        stage, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    // This is a more complex replacement, let's do it step by step
    content = content.replace(
      /INSERT INTO \$\{stage\w+Model\.tableName\} \(\s*gameId, playerId, payout, amount, totalBet, owner,\s*\n\s*winnerBoard, winnerPlayerId, selectedBoard, status,\s*\n\s*registrationData, stage, metadata\s*\n\s*\) VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?\)/g,
      `INSERT INTO ${stage.toLowerCase()}${stage.toLowerCase()}Model.tableName} (
        gameId, playerId, payout, amount, totalBet, owner, 
        winnerBoard, winnerPlayerId, selectedBoard, status, 
        stage, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    
    // Remove registrationData from insertParams
    content = content.replace(
      /JSON\.stringify\(newRecordData\.registrationData \|\| \{\}\),\s*\n\s*(newRecordData\.stage \|\| '[A-L]'),/g,
      '$1'
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed Stage ${stage} route`);
  } else {
    console.log(`❌ Stage ${stage} route not found`);
  }
});

console.log('\n🎉 Fixed all stage routes!');
