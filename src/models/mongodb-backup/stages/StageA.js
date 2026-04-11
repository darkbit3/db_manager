const mongoose = require('mongoose');

/**
 * Stage A Model
 * Registration Stage - Initial player and game setup
 */
const stageASchema = new mongoose.Schema({
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
  
  // Stage A specific fields
  registrationData: {
    playerName: { type: String, required: true },
    playerEmail: { type: String, required: true },
    registrationTime: { type: Date, default: Date.now },
    gameMode: { type: String, default: 'standard' },
    maxPlayers: { type: Number, default: 100 }
  },
  
  // Metadata
  stage: {
    type: String,
    default: 'A',
    description: 'Stage identifier'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'Additional game metadata'
  }
}, {
  timestamps: true,
  collection: 'stage_a'
});

// Indexes
stageASchema.index({ gameId: 1, playerId: 1 });
stageASchema.index({ playerId: 1, status: 1 });
stageASchema.index({ 'registrationData.playerEmail': 1 });
stageASchema.index({ createdAt: -1 });

module.exports = mongoose.model('StageA', stageASchema);
