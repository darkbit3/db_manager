const mongoose = require('mongoose');

/**
 * Stage J Model
 * Archive Management Stage - Long-term data storage
 */
const stageJSchema = new mongoose.Schema({
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
  
  // Stage J specific fields
  archiveManagement: {
    archiveConfig: {
      retentionPeriod: { type: Number, default: 365 }, // days
      compressionEnabled: { type: Boolean, default: true },
      archiveFormat: { type: String, enum: ['json', 'bson', 'compressed'], default: 'compressed' },
      storageLocation: { type: String, default: 'cold_storage' },
      autoArchive: { type: Boolean, default: true }
    },
    archiveHistory: [{
      archiveId: { type: String, required: true },
      archivedAt: { type: Date, default: Date.now },
      archivedBy: { type: String },
      recordCount: { type: Number },
      originalSize: { type: Number },
      compressedSize: { type: Number },
      compressionRatio: { type: Number },
      storagePath: { type: String },
      checksum: { type: String },
      status: { type: String, enum: ['in_progress', 'completed', 'failed'], default: 'in_progress' }
    }],
    restoreHistory: [{
      restoreId: { type: String, required: true },
      archiveId: { type: String, required: true },
      restoredAt: { type: Date },
      restoredBy: { type: String },
      restoreReason: { type: String },
      recordCount: { type: Number },
      status: { type: String, enum: ['in_progress', 'completed', 'failed'], default: 'in_progress' }
    }]
  },
  
  // Archived data reference
  archivedData: {
    originalCollection: { type: String },
    archiveDate: { type: Date },
    dataHash: { type: String },
    isArchived: { type: Boolean, default: false },
    archiveLocation: { type: String },
    retrievalKey: { type: String }
  },
  
  // Lifecycle management
  lifecycle: {
    createdAt: { type: Date, default: Date.now },
    lastAccessed: { type: Date, default: Date.now },
    accessCount: { type: Number, default: 0 },
    expiryDate: { type: Date },
    deletionScheduled: { type: Boolean, default: false },
    deletionDate: { type: Date }
  },
  
  // Metadata
  stage: {
    type: String,
    default: 'J',
    description: 'Stage identifier'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'Additional game metadata'
  }
}, {
  timestamps: true,
  collection: 'stage_j'
});

// Indexes
stageJSchema.index({ gameId: 1, playerId: 1 });
stageJSchema.index({ playerId: 1, status: 1 });
stageJSchema.index({ 'archiveManagement.archiveHistory.archiveId': 1 });
stageJSchema.index({ 'archiveManagement.archiveHistory.archivedAt': -1 });
stageJSchema.index({ 'archivedData.isArchived': 1 });
stageJSchema.index({ 'lifecycle.expiryDate': 1 });
stageJSchema.index({ 'lifecycle.deletionScheduled': 1 });
stageJSchema.index({ createdAt: -1 });

module.exports = mongoose.model('StageJ', stageJSchema);
