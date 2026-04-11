const mongoose = require('mongoose');

/**
 * Stage F Model
 * Prize Distribution Stage - Managing payouts and rewards
 */
const stageFSchema = new mongoose.Schema({
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
  
  // Stage F specific fields
  prizeDistribution: {
    prizePool: { type: Number, default: 0 },
    prizeStructure: [{
      position: { type: Number },
      amount: { type: Number },
      percentage: { type: Number },
      pattern: { type: String }
    }],
    distributionHistory: [{
      playerId: { type: String },
      amount: { type: Number },
      position: { type: Number },
      pattern: { type: String },
      distributedAt: { type: Date, default: Date.now },
      transactionId: { type: String },
      status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' }
    }],
    totalDistributed: { type: Number, default: 0 },
    distributionMethod: { type: String, default: 'automatic' }
  },
  
  // Payment processing
  paymentProcessing: {
    paymentGateway: { type: String, default: 'internal' },
    transactionFees: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    exchangeRate: { type: Number, default: 1.0 },
    paymentStatus: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
    processedAt: { type: Date }
  },
  
  // Metadata
  stage: {
    type: String,
    default: 'F',
    description: 'Stage identifier'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'Additional game metadata'
  }
}, {
  timestamps: true,
  collection: 'stage_f'
});

// Indexes
stageFSchema.index({ gameId: 1, playerId: 1 });
stageFSchema.index({ playerId: 1, status: 1 });
stageFSchema.index({ 'prizeDistribution.distributionHistory.playerId': 1 });
stageFSchema.index({ 'prizeDistribution.distributionHistory.status': 1 });
stageFSchema.index({ 'paymentProcessing.paymentStatus': 1 });
stageFSchema.index({ createdAt: -1 });

module.exports = mongoose.model('StageF', stageFSchema);
