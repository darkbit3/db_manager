const mongoose = require('mongoose');

/**
 * Section Management Model
 * This table manages player data across all stages (A-L)
 * All stage columns use the same structure for consistency
 */
const sectionManagementSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true,
    description: 'Unique identifier for section record'
  },
  playerId: {
    type: String,
    required: true,
    index: true,
    description: 'Player identifier'
  },
  
  // Unified stage structure for all stages A-L
  // Each stage follows the same pattern for consistency
  stageA: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    description: 'Stage A - Registration data'
  },
  stageB: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    description: 'Stage B - Card generation data'
  },
  stageC: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    description: 'Stage C - Game management data'
  },
  stageD: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    description: 'Stage D - Number calling data'
  },
  stageE: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    description: 'Stage E - Winning detection data'
  },
  stageF: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    description: 'Stage F - Prize distribution data'
  },
  stageG: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    description: 'Stage G - Results recording data'
  },
  stageH: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    description: 'Stage H - Analytics processing data'
  },
  stageI: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    description: 'Stage I - Reporting data'
  },
  stageJ: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    description: 'Stage J - Archive management data'
  },
  stageK: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    description: 'Stage K - Compliance and audit data'
  },
  stageL: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
    description: 'Stage L - System integration data'
  },

  // Additional fields for management
  currentStage: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'],
    default: 'A',
    description: 'Current active stage for player'
  },
  stageProgress: {
    type: Map,
    of: String,
    default: {},
    description: 'Progress tracking for each stage'
  },
  stageStatus: {
    type: Map,
    of: String,
    enum: ['not_started', 'in_progress', 'completed', 'locked', 'unlocked'],
    default: {},
    description: 'Status of each stage'
  },
  
  // Metadata
  isActive: {
    type: Boolean,
    default: true,
    index: true,
    description: 'Whether this section is active'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    description: 'Additional metadata for the section'
  },
  
  // Timestamps
  lastActiveAt: {
    type: Date,
    default: Date.now,
    description: 'Last time the player was active'
  },
  completedStages: {
    type: [String],
    default: [],
    description: 'List of completed stages'
  }
}, {
  timestamps: true,
  collection: 'section_management'
});

// Indexes for performance
sectionManagementSchema.index({ playerId: 1, isActive: 1 });
sectionManagementSchema.index({ id: 1 });
sectionManagementSchema.index({ currentStage: 1 });
sectionManagementSchema.index({ lastActiveAt: -1 });

// Static methods
sectionManagementSchema.statics = {
  /**
   * Find section by player ID
   */
  findByPlayerId: function(playerId) {
    return this.findOne({ playerId, isActive: true });
  },

  /**
   * Get player progress across all stages
   */
  getPlayerProgress: function(playerId) {
    return this.findOne({ playerId, isActive: true })
      .select('stageA stageB stageC stageD stageE stageF stageG stageH stageI stageJ stageK stageL stageProgress stageStatus currentStage completedStages');
  },

  /**
   * Update stage data for a player
   */
  updateStageData: function(playerId, stage, data) {
    const stageField = `stage${stage.toUpperCase()}`;
    const update = { 
      $set: { 
        [stageField]: data,
        lastActiveAt: new Date()
      }
    };
    
    return this.findOneAndUpdate(
      { playerId, isActive: true },
      update,
      { new: true, upsert: true }
    );
  },

  /**
   * Mark stage as completed
   */
  completeStage: function(playerId, stage, progressData = {}) {
    const stageField = `stage${stage.toUpperCase()}`;
    const update = {
      $set: { 
        [`stageStatus.${stage}`]: 'completed',
        lastActiveAt: new Date()
      },
      $addToSet: { completedStages: stage },
      $set: { [`stageProgress.${stage}`]: JSON.stringify(progressData) }
    };
    
    return this.findOneAndUpdate(
      { playerId, isActive: true },
      update,
      { new: true, upsert: true }
    );
  },

  /**
   * Get players in specific stage
   */
  getPlayersInStage: function(stage) {
    const stageField = `stage${stage.toUpperCase()}`;
    return this.find({
      [stageField]: { $exists: true, $ne: null },
      isActive: true
    }).select('playerId currentStage lastActiveAt');
  },

  /**
   * Get stage statistics
   */
  getStageStatistics: function(stage) {
    const stageField = `stage${stage.toUpperCase()}`;
    return this.aggregate([
      { $match: { [stageField]: { $exists: true, $ne: null }, isActive: true } },
      {
        $group: {
          _id: null,
          totalPlayers: { $sum: 1 },
          completedPlayers: {
            $sum: { $cond: [{ $eq: [`$stageStatus.${stage}`, 'completed'] }, 1, 0] }
          },
          inProgressPlayers: {
            $sum: { $cond: [{ $eq: [`$stageStatus.${stage}`, 'in_progress'] }, 1, 0] }
          }
        }
      }
    ]);
  }
};

// Instance methods
sectionManagementSchema.methods = {
  /**
   * Get data for a specific stage
   */
  getStageData: function(stage) {
    const stageField = `stage${stage.toUpperCase()}`;
    return this[stageField];
  },

  /**
   * Set data for a specific stage
   */
  setStageData: function(stage, data) {
    const stageField = `stage${stage.toUpperCase()}`;
    this[stageField] = data;
    this.lastActiveAt = new Date();
    return this.save();
  },

  /**
   * Update player's current stage
   */
  setCurrentStage: function(stage) {
    this.currentStage = stage.toUpperCase();
    this.lastActiveAt = new Date();
    return this.save();
  },

  /**
   * Mark stage as completed
   */
  markStageCompleted: function(stage, progressData = {}) {
    const stageField = `stage${stage.toUpperCase()}`;
    this.stageStatus.set(stage, 'completed');
    this.stageProgress.set(stage, JSON.stringify(progressData));
    
    if (!this.completedStages.includes(stage)) {
      this.completedStages.push(stage);
    }
    
    this.lastActiveAt = new Date();
    return this.save();
  },

  /**
   * Check if stage is completed
   */
  isStageCompleted: function(stage) {
    return this.stageStatus.get(stage) === 'completed';
  },

  /**
   * Get completion percentage
   */
  getCompletionPercentage: function() {
    const totalStages = 12; // A-L
    const completedCount = this.completedStages.length;
    return Math.round((completedCount / totalStages) * 100);
  }
};

module.exports = sectionManagementSchema;
