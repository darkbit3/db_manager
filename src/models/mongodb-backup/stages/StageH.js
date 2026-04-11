const mongoose = require('mongoose');

/**
 * Stage H Model
 * Analytics Processing Stage - Game data analysis and insights
 */
const stageHSchema = new mongoose.Schema({
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
  
  // Stage H specific fields
  analyticsProcessing: {
    processedData: {
      playerPerformance: {
        gamesPlayed: { type: Number, default: 0 },
        gamesWon: { type: Number, default: 0 },
        winRate: { type: Number, default: 0 },
        totalWinnings: { type: Number, default: 0 },
        averageBet: { type: Number, default: 0 },
        favoritePatterns: [{ type: String }]
      },
      gameMetrics: {
        averageGameDuration: { type: Number, default: 0 },
        averageCallsPerGame: { type: Number, default: 0 },
        peakActivePlayers: { type: Number, default: 0 },
        totalRevenueGenerated: { type: Number, default: 0 }
      },
      patternAnalysis: {
        mostWonPatterns: [{
          pattern: { type: String },
          wins: { type: Number },
          percentage: { type: Number }
        }],
        averageCallsToWin: { type: Number, default: 0 },
        patternDistribution: {
          type: Map,
          of: Number,
          default: {}
        }
      }
    },
    processingStatus: {
      isProcessed: { type: Boolean, default: false },
      processedAt: { type: Date },
      processingDuration: { type: Number },
      processingErrors: [{ type: String }],
      nextProcessingTime: { type: Date }
    },
    insights: [{
      type: { type: String, enum: ['trend', 'anomaly', 'recommendation', 'alert'] },
      title: { type: String },
      description: { type: String },
      confidence: { type: Number, min: 0, max: 1 },
      generatedAt: { type: Date, default: Date.now },
      data: { type: mongoose.Schema.Types.Mixed }
    }]
  },
  
  // Real-time metrics
  realTimeMetrics: {
    currentActivePlayers: { type: Number, default: 0 },
    currentGameProgress: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
    performanceScore: { type: Number, default: 0 }
  },
  
  // Metadata
  stage: {
    type: String,
    default: 'H',
    description: 'Stage identifier'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'Additional game metadata'
  }
}, {
  timestamps: true,
  collection: 'stage_h'
});

// Indexes
stageHSchema.index({ gameId: 1, playerId: 1 });
stageHSchema.index({ playerId: 1, status: 1 });
stageHSchema.index({ 'analyticsProcessing.processingStatus.isProcessed': 1 });
stageHSchema.index({ 'analyticsProcessing.insights.generatedAt': -1 });
stageHSchema.index({ 'analyticsProcessing.insights.type': 1 });
stageHSchema.index({ createdAt: -1 });

module.exports = mongoose.model('StageH', stageHSchema);
