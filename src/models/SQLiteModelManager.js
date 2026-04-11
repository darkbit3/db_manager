const { getConnection, getDatabaseForModel, getModelDistribution } = require('../config/sqlite-multi');

class SQLiteModelManager {
  constructor() {
    this.models = {};
    this.schemas = {};
    this.initializeSchemas();
  }

  /**
   * Initialize all schemas (converted from MongoDB to SQLite)
   */
  initializeSchemas() {
    // Section Management Schema
    this.schemas.SectionManagement = {
      tableName: 'section_management',
      fields: `
        id TEXT PRIMARY KEY,
        playerId TEXT NOT NULL,
        stageA TEXT,
        stageB TEXT,
        stageC TEXT,
        stageD TEXT,
        stageE TEXT,
        stageF TEXT,
        stageG TEXT,
        stageH TEXT,
        stageI TEXT,
        stageJ TEXT,
        stageK TEXT,
        stageL TEXT,
        currentStage TEXT DEFAULT 'A',
        stageProgress TEXT DEFAULT '{}',
        stageStatus TEXT DEFAULT '{}',
        isActive INTEGER DEFAULT 1,
        metadata TEXT DEFAULT '{}',
        lastActiveAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        completedStages TEXT DEFAULT '[]',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      `,
      indexes: [
        'CREATE INDEX IF NOT EXISTS idx_section_playerId ON section_management(playerId)',
        'CREATE INDEX IF NOT EXISTS idx_section_currentStage ON section_management(currentStage)',
        'CREATE INDEX IF NOT EXISTS idx_section_isActive ON section_management(isActive)',
        'CREATE INDEX IF NOT EXISTS idx_section_lastActiveAt ON section_management(lastActiveAt)'
      ]
    };

    // User Schema
    this.schemas.User = {
      tableName: 'users',
      fields: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        databases TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      `,
      indexes: [
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)',
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)',
        'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)'
      ]
    };

    // Stage A Schema
    this.schemas.StageA = {
      tableName: 'stage_a',
      fields: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gameId TEXT NOT NULL,
        playerId TEXT NOT NULL,
        payout REAL DEFAULT 0,
        amount REAL DEFAULT 0,
        totalBet REAL DEFAULT 0,
        owner TEXT NOT NULL,
        winnerBoard TEXT,
        winnerPlayerId TEXT,
        selectedBoard TEXT,
        status TEXT DEFAULT 'active',
        registrationData TEXT DEFAULT '{}',
        stage TEXT DEFAULT 'A',
        metadata TEXT DEFAULT '{}',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      `,
      indexes: [
        'CREATE INDEX IF NOT EXISTS idx_stageA_gameId ON stage_a(gameId)',
        'CREATE INDEX IF NOT EXISTS idx_stageA_playerId ON stage_a(playerId)',
        'CREATE INDEX IF NOT EXISTS idx_stageA_status ON stage_a(status)',
        'CREATE INDEX IF NOT EXISTS idx_stageA_gamePlayer ON stage_a(gameId, playerId)',
        'CREATE INDEX IF NOT EXISTS idx_stageA_createdAt ON stage_a(createdAt)'
      ]
    };

    // Stage B Schema
    this.schemas.StageB = {
      tableName: 'stage_b',
      fields: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gameId TEXT NOT NULL,
        playerId TEXT NOT NULL,
        payout REAL DEFAULT 0,
        amount REAL DEFAULT 0,
        totalBet REAL DEFAULT 0,
        owner TEXT NOT NULL,
        winnerBoard TEXT,
        winnerPlayerId TEXT,
        selectedBoard TEXT,
        status TEXT DEFAULT 'active',
        gameData TEXT DEFAULT '{}',
        stage TEXT DEFAULT 'B',
        metadata TEXT DEFAULT '{}',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      `,
      indexes: [
        'CREATE INDEX IF NOT EXISTS idx_stageB_gameId ON stage_b(gameId)',
        'CREATE INDEX IF NOT EXISTS idx_stageB_playerId ON stage_b(playerId)',
        'CREATE INDEX IF NOT EXISTS idx_stageB_status ON stage_b(status)',
        'CREATE INDEX IF NOT EXISTS idx_stageB_gamePlayer ON stage_b(gameId, playerId)'
      ]
    };

    // Stage C Schema
    this.schemas.StageC = {
      tableName: 'stage_c',
      fields: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gameId TEXT NOT NULL,
        playerId TEXT NOT NULL,
        payout REAL DEFAULT 0,
        amount REAL DEFAULT 0,
        totalBet REAL DEFAULT 0,
        owner TEXT NOT NULL,
        winnerBoard TEXT,
        winnerPlayerId TEXT,
        selectedBoard TEXT,
        status TEXT DEFAULT 'active',
        gameProgress TEXT DEFAULT '{}',
        stage TEXT DEFAULT 'C',
        metadata TEXT DEFAULT '{}',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      `,
      indexes: [
        'CREATE INDEX IF NOT EXISTS idx_stageC_gameId ON stage_c(gameId)',
        'CREATE INDEX IF NOT EXISTS idx_stageC_playerId ON stage_c(playerId)',
        'CREATE INDEX IF NOT EXISTS idx_stageC_status ON stage_c(status)',
        'CREATE INDEX IF NOT EXISTS idx_stageC_gamePlayer ON stage_c(gameId, playerId)'
      ]
    };

    // Stage D Schema
    this.schemas.StageD = {
      tableName: 'stage_d',
      fields: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gameId TEXT NOT NULL,
        playerId TEXT NOT NULL,
        payout REAL DEFAULT 0,
        amount REAL DEFAULT 0,
        totalBet REAL DEFAULT 0,
        owner TEXT NOT NULL,
        winnerBoard TEXT,
        winnerPlayerId TEXT,
        selectedBoard TEXT,
        status TEXT DEFAULT 'active',
        competitionData TEXT DEFAULT '{}',
        stage TEXT DEFAULT 'D',
        metadata TEXT DEFAULT '{}',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      `,
      indexes: [
        'CREATE INDEX IF NOT EXISTS idx_stageD_gameId ON stage_d(gameId)',
        'CREATE INDEX IF NOT EXISTS idx_stageD_playerId ON stage_d(playerId)',
        'CREATE INDEX IF NOT EXISTS idx_stageD_status ON stage_d(status)',
        'CREATE INDEX IF NOT EXISTS idx_stageD_gamePlayer ON stage_d(gameId, playerId)'
      ]
    };

    // Stage E Schema
    this.schemas.StageE = {
      tableName: 'stage_e',
      fields: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gameId TEXT NOT NULL,
        playerId TEXT NOT NULL,
        payout REAL DEFAULT 0,
        amount REAL DEFAULT 0,
        totalBet REAL DEFAULT 0,
        owner TEXT NOT NULL,
        winnerBoard TEXT,
        winnerPlayerId TEXT,
        selectedBoard TEXT,
        status TEXT DEFAULT 'active',
        tournamentData TEXT DEFAULT '{}',
        stage TEXT DEFAULT 'E',
        metadata TEXT DEFAULT '{}',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      `,
      indexes: [
        'CREATE INDEX IF NOT EXISTS idx_stageE_gameId ON stage_e(gameId)',
        'CREATE INDEX IF NOT EXISTS idx_stageE_playerId ON stage_e(playerId)',
        'CREATE INDEX IF NOT EXISTS idx_stageE_status ON stage_e(status)',
        'CREATE INDEX IF NOT EXISTS idx_stageE_gamePlayer ON stage_e(gameId, playerId)'
      ]
    };

    // Stage F Schema
    this.schemas.StageF = {
      tableName: 'stage_f',
      fields: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gameId TEXT NOT NULL,
        playerId TEXT NOT NULL,
        payout REAL DEFAULT 0,
        amount REAL DEFAULT 0,
        totalBet REAL DEFAULT 0,
        owner TEXT NOT NULL,
        winnerBoard TEXT,
        winnerPlayerId TEXT,
        selectedBoard TEXT,
        status TEXT DEFAULT 'active',
        championshipData TEXT DEFAULT '{}',
        stage TEXT DEFAULT 'F',
        metadata TEXT DEFAULT '{}',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      `,
      indexes: [
        'CREATE INDEX IF NOT EXISTS idx_stageF_gameId ON stage_f(gameId)',
        'CREATE INDEX IF NOT EXISTS idx_stageF_playerId ON stage_f(playerId)',
        'CREATE INDEX IF NOT EXISTS idx_stageF_status ON stage_f(status)',
        'CREATE INDEX IF NOT EXISTS idx_stageF_gamePlayer ON stage_f(gameId, playerId)'
      ]
    };

    // Stage G Schema
    this.schemas.StageG = {
      tableName: 'stage_g',
      fields: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gameId TEXT NOT NULL,
        playerId TEXT NOT NULL,
        payout REAL DEFAULT 0,
        amount REAL DEFAULT 0,
        totalBet REAL DEFAULT 0,
        owner TEXT NOT NULL,
        winnerBoard TEXT,
        winnerPlayerId TEXT,
        selectedBoard TEXT,
        status TEXT DEFAULT 'active',
        finaleData TEXT DEFAULT '{}',
        stage TEXT DEFAULT 'G',
        metadata TEXT DEFAULT '{}',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      `,
      indexes: [
        'CREATE INDEX IF NOT EXISTS idx_stageG_gameId ON stage_g(gameId)',
        'CREATE INDEX IF NOT EXISTS idx_stageG_playerId ON stage_g(playerId)',
        'CREATE INDEX IF NOT EXISTS idx_stageG_status ON stage_g(status)',
        'CREATE INDEX IF NOT EXISTS idx_stageG_gamePlayer ON stage_g(gameId, playerId)'
      ]
    };

    // Stage H Schema
    this.schemas.StageH = {
      tableName: 'stage_h',
      fields: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gameId TEXT NOT NULL,
        playerId TEXT NOT NULL,
        payout REAL DEFAULT 0,
        amount REAL DEFAULT 0,
        totalBet REAL DEFAULT 0,
        owner TEXT NOT NULL,
        winnerBoard TEXT,
        winnerPlayerId TEXT,
        selectedBoard TEXT,
        status TEXT DEFAULT 'active',
        eliteData TEXT DEFAULT '{}',
        stage TEXT DEFAULT 'H',
        metadata TEXT DEFAULT '{}',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      `,
      indexes: [
        'CREATE INDEX IF NOT EXISTS idx_stageH_gameId ON stage_h(gameId)',
        'CREATE INDEX IF NOT EXISTS idx_stageH_playerId ON stage_h(playerId)',
        'CREATE INDEX IF NOT EXISTS idx_stageH_status ON stage_h(status)',
        'CREATE INDEX IF NOT EXISTS idx_stageH_gamePlayer ON stage_h(gameId, playerId)'
      ]
    };

    // Stage I Schema
    this.schemas.StageI = {
      tableName: 'stage_i',
      fields: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gameId TEXT NOT NULL,
        playerId TEXT NOT NULL,
        payout REAL DEFAULT 0,
        amount REAL DEFAULT 0,
        totalBet REAL DEFAULT 0,
        owner TEXT NOT NULL,
        winnerBoard TEXT,
        winnerPlayerId TEXT,
        selectedBoard TEXT,
        status TEXT DEFAULT 'active',
        masterData TEXT DEFAULT '{}',
        stage TEXT DEFAULT 'I',
        metadata TEXT DEFAULT '{}',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      `,
      indexes: [
        'CREATE INDEX IF NOT EXISTS idx_stageI_gameId ON stage_i(gameId)',
        'CREATE INDEX IF NOT EXISTS idx_stageI_playerId ON stage_i(playerId)',
        'CREATE INDEX IF NOT EXISTS idx_stageI_status ON stage_i(status)',
        'CREATE INDEX IF NOT EXISTS idx_stageI_gamePlayer ON stage_i(gameId, playerId)'
      ]
    };

    // Stage J Schema
    this.schemas.StageJ = {
      tableName: 'stage_j',
      fields: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gameId TEXT NOT NULL,
        playerId TEXT NOT NULL,
        payout REAL DEFAULT 0,
        amount REAL DEFAULT 0,
        totalBet REAL DEFAULT 0,
        owner TEXT NOT NULL,
        winnerBoard TEXT,
        winnerPlayerId TEXT,
        selectedBoard TEXT,
        status TEXT DEFAULT 'active',
        grandmasterData TEXT DEFAULT '{}',
        stage TEXT DEFAULT 'J',
        metadata TEXT DEFAULT '{}',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      `,
      indexes: [
        'CREATE INDEX IF NOT EXISTS idx_stageJ_gameId ON stage_j(gameId)',
        'CREATE INDEX IF NOT EXISTS idx_stageJ_playerId ON stage_j(playerId)',
        'CREATE INDEX IF NOT EXISTS idx_stageJ_status ON stage_j(status)',
        'CREATE INDEX IF NOT EXISTS idx_stageJ_gamePlayer ON stage_j(gameId, playerId)'
      ]
    };

    // Stage K Schema
    this.schemas.StageK = {
      tableName: 'stage_k',
      fields: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gameId TEXT NOT NULL,
        playerId TEXT NOT NULL,
        payout REAL DEFAULT 0,
        amount REAL DEFAULT 0,
        totalBet REAL DEFAULT 0,
        owner TEXT NOT NULL,
        winnerBoard TEXT,
        winnerPlayerId TEXT,
        selectedBoard TEXT,
        status TEXT DEFAULT 'active',
        legendaryData TEXT DEFAULT '{}',
        stage TEXT DEFAULT 'K',
        metadata TEXT DEFAULT '{}',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      `,
      indexes: [
        'CREATE INDEX IF NOT EXISTS idx_stageK_gameId ON stage_k(gameId)',
        'CREATE INDEX IF NOT EXISTS idx_stageK_playerId ON stage_k(playerId)',
        'CREATE INDEX IF NOT EXISTS idx_stageK_status ON stage_k(status)',
        'CREATE INDEX IF NOT EXISTS idx_stageK_gamePlayer ON stage_k(gameId, playerId)'
      ]
    };

    // Stage L Schema
    this.schemas.StageL = {
      tableName: 'stage_l',
      fields: `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gameId TEXT NOT NULL,
        playerId TEXT NOT NULL,
        payout REAL DEFAULT 0,
        amount REAL DEFAULT 0,
        totalBet REAL DEFAULT 0,
        owner TEXT NOT NULL,
        winnerBoard TEXT,
        winnerPlayerId TEXT,
        selectedBoard TEXT,
        status TEXT DEFAULT 'active',
        ultimateData TEXT DEFAULT '{}',
        stage TEXT DEFAULT 'L',
        metadata TEXT DEFAULT '{}',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      `,
      indexes: [
        'CREATE INDEX IF NOT EXISTS idx_stageL_gameId ON stage_l(gameId)',
        'CREATE INDEX IF NOT EXISTS idx_stageL_playerId ON stage_l(playerId)',
        'CREATE INDEX IF NOT EXISTS idx_stageL_status ON stage_l(status)',
        'CREATE INDEX IF NOT EXISTS idx_stageL_gamePlayer ON stage_l(gameId, playerId)'
      ]
    };
  }

  /**
   * Create table for a specific model
   */
  createTable(modelName, dbConnection) {
    const schema = this.schemas[modelName];
    if (!schema) {
      throw new Error(`Schema not found for model: ${modelName}`);
    }

    try {
      // Create table
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS ${schema.tableName} (
          ${schema.fields}
        )
      `;
      dbConnection.exec(createTableSQL);

      // Create indexes
      if (schema.indexes) {
        schema.indexes.forEach(indexSQL => {
          dbConnection.exec(indexSQL);
        });
      }

      console.log(`✅ Created table: ${schema.tableName}`);
      return true;
    } catch (error) {
      console.error(`❌ Error creating table ${schema.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Initialize Section Management on Database 1 (Primary)
   */
  async initializeSectionManagement() {
    try {
      console.log('\n🏗️  Initializing Section Management...');
      
      const primaryConnection = getConnection('primary');
      if (!primaryConnection) {
        throw new Error('Primary database connection not available');
      }

      this.createTable('SectionManagement', primaryConnection);
      
      // Store model reference
      this.models.SectionManagement = {
        connection: primaryConnection,
        tableName: this.schemas.SectionManagement.tableName,
        schema: this.schemas.SectionManagement
      };

      console.log('✅ Section Management initialized');
    } catch (error) {
      console.error('❌ Error initializing Section Management:', error);
      throw error;
    }
  }

  /**
   * Initialize all stage models across their respective databases
   */
  async initializeStageModels() {
    try {
      console.log('\n🏗️  Initializing Stage Models...');
      
      const distribution = getModelDistribution();
      
      for (const [dbKey, dbConfig] of Object.entries(distribution)) {
        const connection = getConnection(dbKey);
        if (!connection) {
          console.warn(`⚠️  No connection available for ${dbConfig.name}`);
          continue;
        }

        console.log(`\n📋 Initializing models for ${dbConfig.name}...`);
        
        for (const modelName of dbConfig.models) {
          if (modelName === 'SectionManagement') continue; // Already initialized
          
          if (this.schemas[modelName]) {
            this.createTable(modelName, connection);
            
            // Store model reference
            this.models[modelName] = {
              connection: connection,
              tableName: this.schemas[modelName].tableName,
              schema: this.schemas[modelName]
            };
          }
        }
      }

      console.log('\n✅ All stage models initialized');
    } catch (error) {
      console.error('❌ Error initializing stage models:', error);
      throw error;
    }
  }

  /**
   * Initialize User model (in primary database)
   */
  async initializeUserModel() {
    try {
      console.log('\n🏗️  Initializing User Model...');
      
      const primaryConnection = getConnection('primary');
      if (!primaryConnection) {
        throw new Error('Primary database connection not available');
      }

      this.createTable('User', primaryConnection);
      
      // Store model reference
      this.models.User = {
        connection: primaryConnection,
        tableName: this.schemas.User.tableName,
        schema: this.schemas.User
      };

      console.log('✅ User model initialized');
    } catch (error) {
      console.error('❌ Error initializing User model:', error);
      throw error;
    }
  }

  /**
   * Get model by name
   */
  getModel(modelName) {
    return this.models[modelName];
  }

  /**
   * Get all models
   */
  getAllModels() {
    return this.models;
  }

  /**
   * Check if all models are initialized
   */
  areAllModelsInitialized() {
    const expectedModels = Object.keys(this.schemas);
    const initializedModels = Object.keys(this.models);
    return expectedModels.length === initializedModels.length;
  }

  /**
   * Get models for a specific database
   */
  getModelsForDatabase(databaseKey) {
    const modelsForDb = {};
    const distribution = getModelDistribution();
    
    if (distribution[databaseKey]) {
      distribution[databaseKey].models.forEach(modelName => {
        if (this.models[modelName]) {
          modelsForDb[modelName] = this.models[modelName];
        }
      });
    }
    
    return modelsForDb;
  }

  /**
   * Helper method to execute queries with proper error handling
   */
  executeQuery(modelName, query, params = []) {
    const model = this.models[modelName];
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    try {
      const stmt = model.connection.prepare(query);
      return stmt.all(params);
    } catch (error) {
      console.error(`❌ Error executing query for ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Helper method to execute a single query (for INSERT, UPDATE, DELETE)
   */
  executeRun(modelName, query, params = []) {
    const model = this.models[modelName];
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    try {
      const stmt = model.connection.prepare(query);
      return stmt.run(params);
    } catch (error) {
      console.error(`❌ Error executing run for ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Helper method to get a single record
   */
  executeGet(modelName, query, params = []) {
    const model = this.models[modelName];
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    try {
      const stmt = model.connection.prepare(query);
      return stmt.get(params);
    } catch (error) {
      console.error(`❌ Error executing get for ${modelName}:`, error);
      throw error;
    }
  }
}

module.exports = SQLiteModelManager;
