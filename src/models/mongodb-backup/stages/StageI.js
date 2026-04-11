const mongoose = require('mongoose');

/**
 * Stage I Model
 * Reporting Stage - Generating comprehensive reports
 */
const stageISchema = new mongoose.Schema({
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
  
  // Stage I specific fields
  reporting: {
    reportConfig: {
      reportType: { type: String, enum: ['financial', 'player', 'game', 'custom'], default: 'financial' },
      format: { type: String, enum: ['json', 'csv', 'pdf', 'excel'], default: 'json' },
      frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'on_demand'], default: 'on_demand' },
      recipients: [{ type: String }],
      filters: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    generatedReports: [{
      reportId: { type: String, required: true },
      reportName: { type: String, required: true },
      reportType: { type: String, required: true },
      format: { type: String, required: true },
      generatedAt: { type: Date, default: Date.now },
      generatedBy: { type: String },
      fileSize: { type: Number },
      downloadUrl: { type: String },
      expiresAt: { type: Date },
      status: { type: String, enum: ['generating', 'completed', 'failed', 'expired'], default: 'generating' },
      metadata: { type: mongoose.Schema.Types.Mixed }
    }],
    reportData: {
      summary: {
        totalGames: { type: Number, default: 0 },
        totalPlayers: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 },
        totalPayouts: { type: Number, default: 0 },
        profit: { type: Number, default: 0 },
        averageGameDuration: { type: Number, default: 0 }
      },
      detailedData: { type: mongoose.Schema.Types.Mixed },
      charts: [{
        chartType: { type: String },
        title: { type: String },
        data: { type: mongoose.Schema.Types.Mixed },
        config: { type: mongoose.Schema.Types.Mixed }
      }]
    },
    scheduling: {
      nextRunTime: { type: Date },
      lastRunTime: { type: Date },
      isActive: { type: Boolean, default: false },
      timezone: { type: String, default: 'UTC' }
    }
  },
  
  // Report templates
  reportTemplates: [{
    templateId: { type: String, required: true },
    templateName: { type: String, required: true },
    description: { type: String },
    sections: [{ type: String }],
    customFields: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
  }],
  
  // Metadata
  stage: {
    type: String,
    default: 'I',
    description: 'Stage identifier'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'Additional game metadata'
  }
}, {
  timestamps: true,
  collection: 'stage_i'
});

// Indexes
stageISchema.index({ gameId: 1, playerId: 1 });
stageISchema.index({ playerId: 1, status: 1 });
stageISchema.index({ 'reporting.generatedReports.reportId': 1 });
stageISchema.index({ 'reporting.generatedReports.status': 1 });
stageISchema.index({ 'reporting.generatedReports.generatedAt': -1 });
stageISchema.index({ createdAt: -1 });

module.exports = mongoose.model('StageI', stageISchema);
