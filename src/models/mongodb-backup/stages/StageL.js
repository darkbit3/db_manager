const mongoose = require('mongoose');

/**
 * Stage L Model
 * System Integration Stage - Final integration and system-wide coordination
 */
const stageLSchema = new mongoose.Schema({
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
  
  // Stage L specific fields
  systemIntegration: {
    integrationPoints: [{
      serviceName: { type: String, required: true },
      serviceType: { type: String, enum: ['internal', 'external', 'third_party'], default: 'internal' },
      endpoint: { type: String },
      status: { type: String, enum: ['connected', 'disconnected', 'error', 'maintenance'], default: 'connected' },
      lastPing: { type: Date, default: Date.now },
      responseTime: { type: Number, default: 0 },
      errorCount: { type: Number, default: 0 },
      lastError: { type: String },
      config: { type: mongoose.Schema.Types.Mixed }
    }],
    dataFlow: {
      inbound: [{
        source: { type: String },
        dataType: { type: String },
        volume: { type: Number, default: 0 },
        lastReceived: { type: Date },
        processingStatus: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' }
      }],
      outbound: [{
        destination: { type: String },
        dataType: { type: String },
        volume: { type: Number, default: 0 },
        lastSent: { type: Date },
        deliveryStatus: { type: String, enum: ['pending', 'delivered', 'failed'], default: 'pending' }
      }]
    },
    synchronization: {
      lastSyncTime: { type: Date, default: Date.now },
      syncStatus: { type: String, enum: ['in_sync', 'out_of_sync', 'syncing', 'error'], default: 'in_sync' },
      syncErrors: [{ type: String }],
      dataIntegrity: {
        checksum: { type: String },
        lastVerified: { type: Date, default: Date.now },
        isValid: { type: Boolean, default: true }
      }
    }
  },
  
  // System health monitoring
  systemHealth: {
    performanceMetrics: {
      cpuUsage: { type: Number, default: 0 },
      memoryUsage: { type: Number, default: 0 },
      diskUsage: { type: Number, default: 0 },
      networkLatency: { type: Number, default: 0 },
      uptime: { type: Number, default: 0 }
    },
    serviceHealth: [{
      serviceName: { type: String },
      status: { type: String, enum: ['healthy', 'degraded', 'unhealthy'], default: 'healthy' },
      lastCheck: { type: Date, default: Date.now },
      responseTime: { type: Number },
      errorRate: { type: Number, default: 0 }
    }],
    alerts: [{
      alertId: { type: String, required: true },
      severity: { type: String, enum: ['info', 'warning', 'error', 'critical'], default: 'info' },
      message: { type: String },
      component: { type: String },
      triggeredAt: { type: Date, default: Date.now },
      acknowledgedAt: { type: Date },
      resolvedAt: { type: Date },
      status: { type: String, enum: ['active', 'acknowledged', 'resolved'], default: 'active' }
    }]
  },
  
  // Final stage processing
  finalProcessing: {
    stageCompletionStatus: {
      stageA: { type: String, enum: ['completed', 'in_progress', 'failed', 'not_started'], default: 'not_started' },
      stageB: { type: String, enum: ['completed', 'in_progress', 'failed', 'not_started'], default: 'not_started' },
      stageC: { type: String, enum: ['completed', 'in_progress', 'failed', 'not_started'], default: 'not_started' },
      stageD: { type: String, enum: ['completed', 'in_progress', 'failed', 'not_started'], default: 'not_started' },
      stageE: { type: String, enum: ['completed', 'in_progress', 'failed', 'not_started'], default: 'not_started' },
      stageF: { type: String, enum: ['completed', 'in_progress', 'failed', 'not_started'], default: 'not_started' },
      stageG: { type: String, enum: ['completed', 'in_progress', 'failed', 'not_started'], default: 'not_started' },
      stageH: { type: String, enum: ['completed', 'in_progress', 'failed', 'not_started'], default: 'not_started' },
      stageI: { type: String, enum: ['completed', 'in_progress', 'failed', 'not_started'], default: 'not_started' },
      stageJ: { type: String, enum: ['completed', 'in_progress', 'failed', 'not_started'], default: 'not_started' },
      stageK: { type: String, enum: ['completed', 'in_progress', 'failed', 'not_started'], default: 'not_started' }
    },
    overallProgress: {
      completedStages: { type: Number, default: 0 },
      totalStages: { type: Number, default: 12 },
      completionPercentage: { type: Number, default: 0 },
      estimatedCompletionTime: { type: Date }
    },
    finalValidation: {
      isValid: { type: Boolean, default: false },
      validatedAt: { type: Date },
      validationErrors: [{ type: String }],
      validationWarnings: [{ type: String }],
      approvedBy: { type: String }
    }
  },
  
  // Metadata
  stage: {
    type: String,
    default: 'L',
    description: 'Stage identifier'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'Additional game metadata'
  }
}, {
  timestamps: true,
  collection: 'stage_l'
});

// Indexes
stageLSchema.index({ gameId: 1, playerId: 1 });
stageLSchema.index({ playerId: 1, status: 1 });
stageLSchema.index({ 'systemIntegration.integrationPoints.serviceName': 1 });
stageLSchema.index({ 'systemIntegration.integrationPoints.status': 1 });
stageLSchema.index({ 'systemHealth.serviceHealth.status': 1 });
stageLSchema.index({ 'systemHealth.alerts.severity': 1 });
stageLSchema.index({ 'finalProcessing.overallProgress.completionPercentage': 1 });
stageLSchema.index({ createdAt: -1 });

module.exports = mongoose.model('StageL', stageLSchema);
