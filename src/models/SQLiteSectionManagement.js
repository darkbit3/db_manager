const { getConnection } = require('../config/sqlite-multi');

class SQLiteSectionManagement {
  constructor() {
    this.connection = null;
    this.tableName = 'section_management';
  }

  /**
   * Initialize the model with database connection
   */
  async initialize(connection) {
    this.connection = connection;
    return this;
  }

  /**
   * Create a new section management record
   */
  async create(data) {
    try {
      const query = `
        INSERT INTO ${this.tableName} (
          id, playerId, stageA, stageB, stageC, stageD, stageE, stageF, 
          stageG, stageH, stageI, stageJ, stageK, stageL, currentStage,
          stageProgress, stageStatus, isActive, metadata, lastActiveAt, completedStages
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        data.id,
        data.playerId,
        JSON.stringify(data.stageA || null),
        JSON.stringify(data.stageB || null),
        JSON.stringify(data.stageC || null),
        JSON.stringify(data.stageD || null),
        JSON.stringify(data.stageE || null),
        JSON.stringify(data.stageF || null),
        JSON.stringify(data.stageG || null),
        JSON.stringify(data.stageH || null),
        JSON.stringify(data.stageI || null),
        JSON.stringify(data.stageJ || null),
        JSON.stringify(data.stageK || null),
        JSON.stringify(data.stageL || null),
        data.currentStage || 'A',
        JSON.stringify(data.stageProgress || {}),
        JSON.stringify(data.stageStatus || {}),
        data.isActive !== undefined ? data.isActive ? 1 : 0 : 1,
        JSON.stringify(data.metadata || {}),
        data.lastActiveAt || new Date().toISOString(),
        JSON.stringify(data.completedStages || [])
      ];

      const stmt = this.connection.prepare(query);
      const result = stmt.run(params);
      
      return this.findById(data.id);
    } catch (error) {
      console.error('❌ Error creating section management record:', error);
      throw error;
    }
  }

  /**
   * Find a record by ID
   */
  async findById(id) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      const stmt = this.connection.prepare(query);
      const result = stmt.get([id]);
      
      if (result) {
        return this.parseRecord(result);
      }
      return null;
    } catch (error) {
      console.error('❌ Error finding section management by ID:', error);
      throw error;
    }
  }

  /**
   * Find records by player ID
   */
  async findByPlayerId(playerId) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE playerId = ? ORDER BY lastActiveAt DESC`;
      const stmt = this.connection.prepare(query);
      const results = stmt.all([playerId]);
      
      return results.map(record => this.parseRecord(record));
    } catch (error) {
      console.error('❌ Error finding section management by player ID:', error);
      throw error;
    }
  }

  /**
   * Find all active records
   */
  async findActive() {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE isActive = 1 ORDER BY lastActiveAt DESC`;
      const stmt = this.connection.prepare(query);
      const results = stmt.all();
      
      return results.map(record => this.parseRecord(record));
    } catch (error) {
      console.error('❌ Error finding active section management records:', error);
      throw error;
    }
  }

  /**
   * Update a record by ID
   */
  async updateById(id, updateData) {
    try {
      const setClauses = [];
      const params = [];
      
      // Build dynamic SET clause
      Object.keys(updateData).forEach(key => {
        if (key !== 'id' && key !== 'createdAt') {
          setClauses.push(`${key} = ?`);
          
          // Convert JSON fields to strings
          if (['stageA', 'stageB', 'stageC', 'stageD', 'stageE', 'stageF', 
               'stageG', 'stageH', 'stageI', 'stageJ', 'stageK', 'stageL',
               'stageProgress', 'stageStatus', 'metadata', 'completedStages'].includes(key)) {
            params.push(JSON.stringify(updateData[key]));
          } else if (key === 'isActive') {
            params.push(updateData[key] ? 1 : 0);
          } else {
            params.push(updateData[key]);
          }
        }
      });
      
      // Add updatedAt
      setClauses.push('updatedAt = CURRENT_TIMESTAMP');
      params.push(id);
      
      const query = `
        UPDATE ${this.tableName} 
        SET ${setClauses.join(', ')} 
        WHERE id = ?
      `;
      
      const stmt = this.connection.prepare(query);
      const result = stmt.run(params);
      
      if (result.changes > 0) {
        return this.findById(id);
      }
      return null;
    } catch (error) {
      console.error('❌ Error updating section management record:', error);
      throw error;
    }
  }

  /**
   * Update stage data for a specific stage
   */
  async updateStage(id, stageName, stageData) {
    try {
      const query = `
        UPDATE ${this.tableName} 
        SET ${stageName} = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      const stmt = this.connection.prepare(query);
      const result = stmt.run([JSON.stringify(stageData), id]);
      
      if (result.changes > 0) {
        return this.findById(id);
      }
      return null;
    } catch (error) {
      console.error(`❌ Error updating ${stageName} for section management:`, error);
      throw error;
    }
  }

  /**
   * Update current stage
   */
  async updateCurrentStage(id, newStage) {
    try {
      const query = `
        UPDATE ${this.tableName} 
        SET currentStage = ?, lastActiveAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      const stmt = this.connection.prepare(query);
      const result = stmt.run([newStage, id]);
      
      if (result.changes > 0) {
        return this.findById(id);
      }
      return null;
    } catch (error) {
      console.error('❌ Error updating current stage:', error);
      throw error;
    }
  }

  /**
   * Add completed stage
   */
  async addCompletedStage(id, stage) {
    try {
      const record = await this.findById(id);
      if (!record) {
        throw new Error('Record not found');
      }
      
      const completedStages = [...new Set([...record.completedStages, stage])];
      
      const query = `
        UPDATE ${this.tableName} 
        SET completedStages = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      const stmt = this.connection.prepare(query);
      const result = stmt.run([JSON.stringify(completedStages), id]);
      
      if (result.changes > 0) {
        return this.findById(id);
      }
      return null;
    } catch (error) {
      console.error('❌ Error adding completed stage:', error);
      throw error;
    }
  }

  /**
   * Deactivate a record
   */
  async deactivate(id) {
    try {
      const query = `
        UPDATE ${this.tableName} 
        SET isActive = 0, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      const stmt = this.connection.prepare(query);
      const result = stmt.run([id]);
      
      return result.changes > 0;
    } catch (error) {
      console.error('❌ Error deactivating section management record:', error);
      throw error;
    }
  }

  /**
   * Delete a record by ID
   */
  async deleteById(id) {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const stmt = this.connection.prepare(query);
      const result = stmt.run([id]);
      
      return result.changes > 0;
    } catch (error) {
      console.error('❌ Error deleting section management record:', error);
      throw error;
    }
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    try {
      const queries = [
        'SELECT COUNT(*) as total FROM section_management',
        'SELECT COUNT(*) as active FROM section_management WHERE isActive = 1',
        'SELECT currentStage, COUNT(*) as count FROM section_management GROUP BY currentStage',
        'SELECT COUNT(*) as withCompletedStages FROM section_management WHERE json_array_length(completedStages) > 0'
      ];

      const results = {};
      results.total = this.connection.prepare(queries[0]).get().total;
      results.active = this.connection.prepare(queries[1]).get().active;
      results.byStage = this.connection.prepare(queries[2]).all();
      results.withCompletedStages = this.connection.prepare(queries[3]).get().withCompletedStages;

      return results;
    } catch (error) {
      console.error('❌ Error getting section management statistics:', error);
      throw error;
    }
  }

  /**
   * Parse database record to JavaScript object
   */
  parseRecord(record) {
    if (!record) return null;
    
    const parsed = { ...record };
    
    // Parse JSON fields
    const jsonFields = [
      'stageA', 'stageB', 'stageC', 'stageD', 'stageE', 'stageF', 
      'stageG', 'stageH', 'stageI', 'stageJ', 'stageK', 'stageL',
      'stageProgress', 'stageStatus', 'metadata', 'completedStages'
    ];
    
    jsonFields.forEach(field => {
      if (parsed[field]) {
        try {
          parsed[field] = JSON.parse(parsed[field]);
        } catch (e) {
          console.warn(`⚠️  Failed to parse ${field} as JSON:`, parsed[field]);
          parsed[field] = null;
        }
      }
    });
    
    // Convert boolean
    if (parsed.isActive !== undefined) {
      parsed.isActive = Boolean(parsed.isActive);
    }
    
    return parsed;
  }
}

module.exports = SQLiteSectionManagement;
