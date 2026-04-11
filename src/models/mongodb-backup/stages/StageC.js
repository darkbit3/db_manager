const mongoose = require('mongoose');

/**
 * Stage C Model
 * Game Management Stage - Game control and configuration
 */
const stageCSchema = new mongoose.Schema({
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
  
  // Stage C specific fields
  gameManagement: {
    gameSettings: {
      autoCallNumbers: { type: Boolean, default: true },
      callInterval: { type: Number, default: 5000 },
      winPatterns: [{ type: String }],
      maxWinners: { type: Number, default: 3 }
    },
    gameControl: {
      isPaused: { type: Boolean, default: false },
      isStarted: { type: Boolean, default: false },
      isStopped: { type: Boolean, default: false },
      startTime: { type: Date },
      endTime: { type: Date },
      duration: { type: Number }
    },
    playerActions: {
      joinedAt: { type: Date, default: Date.now },
      lastAction: { type: Date },
      actionHistory: [{
        action: { type: String },
        timestamp: { type: Date },
        details: { type: mongoose.Schema.Types.Mixed }
      }]
    }
  },
  
  // Metadata
  stage: {
    type: String,
    default: 'C',
    description: 'Stage identifier'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'Additional game metadata'
  }
}, {
  timestamps: true,
  collection: 'stage_c'
});

// Indexes
stageCSchema.index({ gameId: 1, playerId: 1 });
stageCSchema.index({ playerId: 1, status: 1 });
stageCSchema.index({ 'gameManagement.gameControl.isStarted': 1 });
stageCSchema.index({ 'gameManagement.gameControl.isPaused': 1 });
stageCSchema.index({ createdAt: -1 });

module.exports = mongoose.model('StageC', stageCSchema);
