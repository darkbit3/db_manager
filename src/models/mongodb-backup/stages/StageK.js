const mongoose = require('mongoose');

/**
 * Stage K Model
 * Compliance & Audit Stage - Regulatory compliance and auditing
 */
const stageKSchema = new mongoose.Schema({
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
  
  // Stage K specific fields
  complianceAudit: {
    complianceChecks: [{
      checkType: { type: String, enum: ['kyc', 'aml', 'fairness', 'license', 'data_protection'] },
      status: { type: String, enum: ['passed', 'failed', 'pending', 'skipped'], default: 'pending' },
      checkedAt: { type: Date, default: Date.now },
      checkedBy: { type: String },
      results: { type: mongoose.Schema.Types.Mixed },
      riskScore: { type: Number, min: 0, max: 100 },
      recommendations: [{ type: String }]
    }],
    auditTrail: [{
      eventId: { type: String, required: true },
      eventType: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      userId: { type: String },
      action: { type: String },
      resource: { type: String },
      oldValue: { type: mongoose.Schema.Types.Mixed },
      newValue: { type: mongoose.Schema.Types.Mixed },
      ipAddress: { type: String },
      userAgent: { type: String },
      sessionId: { type: String },
      riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' }
    }],
    regulatoryReporting: {
      lastReportDate: { type: Date },
      nextReportDate: { type: Date },
      reportingFrequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly'], default: 'monthly' },
      jurisdiction: { type: String, default: 'US' },
      licenseNumber: { type: String },
      complianceOfficer: { type: String }
    }
  },
  
  // Risk management
  riskManagement: {
    riskAssessment: {
      overallRiskScore: { type: Number, min: 0, max: 100, default: 0 },
      playerRiskProfile: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
      gameRiskFactors: [{
        factor: { type: String },
        score: { type: Number },
        mitigation: { type: String }
      }],
      lastAssessed: { type: Date, default: Date.now }
    },
    alerts: [{
      alertId: { type: String, required: true },
      alertType: { type: String, enum: ['suspicious_activity', 'compliance_violation', 'system_anomaly', 'fraud_detection'] },
      severity: { type: String, enum: ['info', 'warning', 'error', 'critical'], default: 'info' },
      message: { type: String },
      triggeredAt: { type: Date, default: Date.now },
      resolvedAt: { type: Date },
      resolvedBy: { type: String },
      status: { type: String, enum: ['active', 'investigating', 'resolved', 'false_positive'], default: 'active' },
      details: { type: mongoose.Schema.Types.Mixed }
    }]
  },
  
  // Data protection
  dataProtection: {
    gdprCompliance: {
      dataProcessingConsent: { type: Boolean, default: false },
      consentDate: { type: Date },
      dataRetentionPeriod: { type: Number, default: 365 },
      rightToDeletion: { type: Boolean, default: true },
      dataPortability: { type: Boolean, default: true }
    },
    encryptionStatus: {
      dataAtRest: { type: Boolean, default: true },
      dataInTransit: { type: Boolean, default: true },
      encryptionAlgorithm: { type: String, default: 'AES-256' },
      keyRotationDate: { type: Date }
    }
  },
  
  // Metadata
  stage: {
    type: String,
    default: 'K',
    description: 'Stage identifier'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'Additional game metadata'
  }
}, {
  timestamps: true,
  collection: 'stage_k'
});

// Indexes
stageKSchema.index({ gameId: 1, playerId: 1 });
stageKSchema.index({ playerId: 1, status: 1 });
stageKSchema.index({ 'complianceAudit.complianceChecks.checkType': 1 });
stageKSchema.index({ 'complianceAudit.complianceChecks.status': 1 });
stageKSchema.index({ 'complianceAudit.auditTrail.timestamp': -1 });
stageKSchema.index({ 'riskManagement.alerts.alertType': 1 });
stageKSchema.index({ 'riskManagement.alerts.status': 1 });
stageKSchema.index({ 'riskManagement.riskAssessment.lastAssessed': -1 });
stageKSchema.index({ createdAt: -1 });

module.exports = mongoose.model('StageK', stageKSchema);
