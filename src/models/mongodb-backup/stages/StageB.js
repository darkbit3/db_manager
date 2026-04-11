const mongoose = require('mongoose');

/**
 * Stage B Model
 * Card Generation Stage - Bingo card creation and management
 */
const stageBSchema = new mongoose.Schema({
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
  
  // Stage B specific fields
  cardData: {
    cardId: { type: String, required: true },
    cardNumbers: [{ type: Number }],
    cardType: { type: String, default: 'standard' },
    generatedAt: { type: Date, default: Date.now },
    cardTemplate: { type: String, default: 'classic' },
    freeSpace: { type: Boolean, default: true }
  },
  
  // Card validation
  cardValidation: {
    isValid: { type: Boolean, default: true },
    validationErrors: [{ type: String }],
    validatedAt: { type: Date }
  },
  
  // Metadata
  stage: {
    type: String,
    default: 'B',
    description: 'Stage identifier'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'Additional game metadata'
  }
}, {
  timestamps: true,
  collection: 'stage_b'
});

// Indexes
stageBSchema.index({ gameId: 1, playerId: 1 });
stageBSchema.index({ playerId: 1, status: 1 });
stageBSchema.index({ 'cardData.cardId': 1 });
stageBSchema.index({ createdAt: -1 });

module.exports = mongoose.model('StageB', stageBSchema);
