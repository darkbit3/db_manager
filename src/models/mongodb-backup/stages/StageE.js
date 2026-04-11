const mongoose = require('mongoose');

/**
 * Stage E Model
 * Winning Detection Stage - Pattern matching and win validation
 */
const stageESchema = new mongoose.Schema({
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
  
  // Stage E specific fields
  winDetection: {
    markedNumbers: [{ type: Number }],
    winningPatterns: [{
      pattern: { type: String },
      isMatched: { type: Boolean, default: false },
      matchedAt: { type: Date },
      winningNumbers: [{ type: Number }],
      positions: [{ type: Number }]
    }],
    winClaim: {
      claimedAt: { type: Date },
      claimedPattern: { type: String },
      isVerified: { type: Boolean, default: false },
      verifiedAt: { type: Date },
      verifiedBy: { type: String },
      verificationResult: { type: String }
    },
    autoDetection: {
      enabled: { type: Boolean, default: true },
      lastCheck: { type: Date },
      checkInterval: { type: Number, default: 1000 }
    }
  },
  
  // Pattern matching data
  patternMatching: {
    currentPatterns: [{ type: String }],
    completedPatterns: [{ type: String }],
    patternProgress: {
      type: Map,
      of: Number,
      default: {}
    }
  },
  
  // Metadata
  stage: {
    type: String,
    default: 'E',
    description: 'Stage identifier'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'Additional game metadata'
  }
}, {
  timestamps: true,
  collection: 'stage_e'
});

// Indexes
stageESchema.index({ gameId: 1, playerId: 1 });
stageESchema.index({ playerId: 1, status: 1 });
stageESchema.index({ 'winDetection.winClaim.isVerified': 1 });
stageESchema.index({ 'winDetection.winningPatterns.isMatched': 1 });
stageESchema.index({ createdAt: -1 });

module.exports = mongoose.model('StageE', stageESchema);
