const mongoose = require('mongoose');

/**
 * Base Schema for Stage Games (A-L)
 * This schema is used for all stage game data
 */
const stageGameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    index: true,
    description: 'Unique identifier for the game'
  },
  playerId: {
    type: String,
    required: true,
    index: true,
    description: 'Unique identifier for the player'
  },
  payout: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Payout amount for the player'
  },
  amount: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Total amount involved in the game'
  },
  totalBet: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Total bet amount placed by player'
  },
  owner: {
    type: String,
    required: true,
    description: 'Owner of the game or session'
  },
  winnerBoard: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    description: 'Board configuration of the winner'
  },
  winnerPlayerId: {
    type: String,
    default: null,
    description: 'ID of the winning player'
  },
  selectedBoard: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    description: 'Board selected by the player'
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'pending', 'expired'],
    default: 'active',
    description: 'Current status of the game'
  },
  // Additional metadata
  gameType: {
    type: String,
    default: 'bingo',
    description: 'Type of game being played'
  },
  stage: {
    type: String,
    required: true,
    description: 'Stage identifier (A-L)'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'Additional game metadata'
  }
}, {
  timestamps: true,
  // Enable automatic index creation
  autoIndex: true
});

// Compound indexes for better query performance
stageGameSchema.index({ gameId: 1, playerId: 1 });
stageGameSchema.index({ playerId: 1, status: 1 });
stageGameSchema.index({ stage: 1, status: 1 });
stageGameSchema.index({ createdAt: -1 });
stageGameSchema.index({ winnerPlayerId: 1 });

// Static methods
stageGameSchema.statics = {
  /**
   * Find games by player ID
   */
  findByPlayerId: function(playerId, options = {}) {
    const query = { playerId };
    if (options.status) query.status = options.status;
    if (options.stage) query.stage = options.stage;
    
    return this.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 50);
  },

  /**
   * Find games by game ID
   */
  findByGameId: function(gameId) {
    return this.find({ gameId })
      .sort({ createdAt: -1 });
  },

  /**
   * Find winning games
   */
  findWinningGames: function(options = {}) {
    const query = { 
      winnerPlayerId: { $exists: true, $ne: null },
      status: 'completed'
    };
    if (options.playerId) query.playerId = options.playerId;
    if (options.stage) query.stage = options.stage;
    
    return this.find(query)
      .sort({ updatedAt: -1 })
      .limit(options.limit || 20);
  },

  /**
   * Get game statistics
   */
  getGameStats: function(stage, playerId) {
    const matchStage = { stage };
    if (playerId) matchStage.playerId = playerId;
    
    return this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalGames: { $sum: 1 },
          totalBet: { $sum: '$totalBet' },
          totalPayout: { $sum: '$payout' },
          totalAmount: { $sum: '$amount' },
          completedGames: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledGames: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          winningGames: {
            $sum: { $cond: [{ $and: [
              { $eq: ['$status', 'completed'] },
              { $ne: ['$winnerPlayerId', null] }
            ]}, 1, 0] }
          }
        }
      }
    ]);
  }
};

// Instance methods
stageGameSchema.methods = {
  /**
   * Mark game as completed with winner
   */
  completeGame: function(winnerPlayerId, winnerBoard, payout) {
    this.status = 'completed';
    this.winnerPlayerId = winnerPlayerId;
    this.winnerBoard = winnerBoard;
    if (payout !== undefined) this.payout = payout;
    return this.save();
  },

  /**
   * Cancel game
   */
  cancelGame: function(reason) {
    this.status = 'cancelled';
    this.metadata = { ...this.metadata, cancelReason: reason };
    return this.save();
  },

  /**
   * Update player board selection
   */
  updateBoardSelection: function(board) {
    this.selectedBoard = board;
    return this.save();
  }
};

module.exports = stageGameSchema;
