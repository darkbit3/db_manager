const mongoose = require('mongoose');

/**
 * Stage D Model
 * Number Calling Stage - Bingo number generation and calling
 */
const stageDSchema = new mongoose.Schema({
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
  
  // Stage D specific fields
  numberCalling: {
    currentNumber: { type: Number, default: null },
    calledNumbers: [{ type: Number }],
    callHistory: [{
      number: { type: Number },
      letter: { type: String },
      calledAt: { type: Date, default: Date.now },
      callOrder: { type: Number }
    }],
    callingPattern: { type: String, default: 'random' },
    callInterval: { type: Number, default: 5000 },
    lastCallTime: { type: Date },
    autoCallEnabled: { type: Boolean, default: true }
  },
  
  // Number statistics
  numberStats: {
    totalCalled: { type: Number, default: 0 },
    averageCallTime: { type: Number, default: 0 },
    letterDistribution: {
      B: { type: Number, default: 0 },
      I: { type: Number, default: 0 },
      N: { type: Number, default: 0 },
      G: { type: Number, default: 0 },
      O: { type: Number, default: 0 }
    }
  },
  
  // Metadata
  stage: {
    type: String,
    default: 'D',
    description: 'Stage identifier'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'Additional game metadata'
  }
}, {
  timestamps: true,
  collection: 'stage_d'
});

// Indexes
stageDSchema.index({ gameId: 1, playerId: 1 });
stageDSchema.index({ playerId: 1, status: 1 });
stageDSchema.index({ 'numberCalling.currentNumber': 1 });
stageDSchema.index({ 'numberCalling.calledNumbers': 1 });
stageDSchema.index({ createdAt: -1 });

module.exports = mongoose.model('StageD', stageDSchema);
