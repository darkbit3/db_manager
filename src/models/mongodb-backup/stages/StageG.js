const mongoose = require('mongoose');

/**
 * Stage G Model
 * Results Recording Stage - Documenting game outcomes
 */
const stageGSchema = new mongoose.Schema({
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
  
  // Stage G specific fields
  resultsRecording: {
    gameSummary: {
      startTime: { type: Date },
      endTime: { type: Date },
      duration: { type: Number },
      totalPlayers: { type: Number },
      totalCards: { type: Number },
      totalPrizePool: { type: Number },
      totalPayouts: { type: Number }
    },
    winnerDetails: [{
      playerId: { type: String },
      playerName: { type: String },
      cardId: { type: String },
      winningPattern: { type: String },
      winningNumbers: [{ type: Number }],
      prizeAmount: { type: Number },
      position: { type: Number },
      wonAt: { type: Date }
    }],
    gameStatistics: {
      averageCallsPerWin: { type: Number },
      fastestWin: { type: Number },
      slowestWin: { type: Number },
      totalRevenue: { type: Number },
      totalProfit: { type: Number }
    },
    recordingStatus: {
      isRecorded: { type: Boolean, default: false },
      recordedAt: { type: Date },
      recordedBy: { type: String },
      verified: { type: Boolean, default: false },
      verifiedAt: { type: Date }
    }
  },
  
  // Audit trail
  auditTrail: [{
    action: { type: String },
    timestamp: { type: Date, default: Date.now },
    userId: { type: String },
    details: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String }
  }],
  
  // Metadata
  stage: {
    type: String,
    default: 'G',
    description: 'Stage identifier'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'Additional game metadata'
  }
}, {
  timestamps: true,
  collection: 'stage_g'
});

// Indexes
stageGSchema.index({ gameId: 1, playerId: 1 });
stageGSchema.index({ playerId: 1, status: 1 });
stageGSchema.index({ 'resultsRecording.winnerDetails.playerId': 1 });
stageGSchema.index({ 'resultsRecording.recordingStatus.isRecorded': 1 });
stageGSchema.index({ 'auditTrail.timestamp': -1 });
stageGSchema.index({ createdAt: -1 });

module.exports = mongoose.model('StageG', stageGSchema);
