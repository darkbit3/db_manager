const mongoose = require('mongoose');

// Import ModelManager for distributed model creation
const ModelManager = require('./ModelManager');

// Create global model manager instance
let modelManagerInstance = null;

/**
 * Initialize models across all databases
 * This should be called after database connections are established
 */
const initializeModels = async () => {
  if (!modelManagerInstance) {
    modelManagerInstance = new ModelManager();
    await modelManagerInstance.initializeModels();
  }
  return modelManagerInstance;
};

/**
 * Get the model manager instance
 */
const getModelManager = () => {
  return modelManagerInstance;
};

/**
 * Get a specific model from the correct database
 */
const getModel = (modelName) => {
  if (!modelManagerInstance) {
    throw new Error('Model manager not initialized. Call initializeModels() first.');
  }
  return modelManagerInstance.getModel(modelName);
};

/**
 * Get all models
 */
const getAllModels = () => {
  if (!modelManagerInstance) {
    throw new Error('Model manager not initialized. Call initializeModels() first.');
  }
  return modelManagerInstance.getAllModels();
};

/**
 * Get models for a specific database
 */
const getModelsForDatabase = (databaseKey) => {
  if (!modelManagerInstance) {
    throw new Error('Model manager not initialized. Call initializeModels() first.');
  }
  return modelManagerInstance.getModelsForDatabase(databaseKey);
};

/**
 * Get database for a specific model
 */
const getDatabaseForModel = (modelName) => {
  if (!modelManagerInstance) {
    throw new Error('Model manager not initialized. Call initializeModels() first.');
  }
  return modelManagerInstance.getDatabaseForModel(modelName);
};

/**
 * Check if all models are initialized
 */
const areAllModelsInitialized = () => {
  if (!modelManagerInstance) {
    return false;
  }
  return modelManagerInstance.areAllModelsInitialized();
};

// Export individual stage model schemas (for reference)
const StageGame = require('./StageGame');
const SectionManagement = require('./SectionManagement');

// Legacy exports for backward compatibility
module.exports = {
  // Model management
  initializeModels,
  getModelManager,
  getModel,
  getAllModels,
  getModelsForDatabase,
  getDatabaseForModel,
  areAllModelsInitialized,
  
  // Direct access to model manager (for advanced usage)
  ModelManager,
  
  // Schemas (for reference)
  StageGame,
  SectionManagement,
  
  // Helper functions (legacy)
  getStageNames: () => ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'],
  getCollectionNames: () => ({
    'A': 'stage_a',
    'B': 'stage_b',
    'C': 'stage_c',
    'D': 'stage_d',
    'E': 'stage_e',
    'F': 'stage_f',
    'G': 'stage_g',
    'H': 'stage_h',
    'I': 'stage_i',
    'J': 'stage_j',
    'K': 'stage_k',
    'L': 'stage_l',
    'section_management': 'section_management'
  })
};
