class SQLiteStage {
  constructor(stageName) {
    this.connection = null;
    this.tableName = `stage_${stageName.toLowerCase()}`;
    this.stageName = stageName;
  }

  /**
   * Initialize the model with database connection
   */
  async initialize(connection) {
    this.connection = connection;
    return this;
  }

  /**
   * Create a new stage record
   */
  async create(data) {
    try {
      // Determine the data field based on stage
      const dataField = this.getDataFieldName();
      
      const query = `
        INSERT INTO ${this.tableName} (
          gameId, playerId, payout, amount, totalBet, owner, winnerBoard, 
          winnerPlayerId, selectedBoard, status, ${dataField}, stage, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        data.gameId,
        data.playerId,
        data.payout || 0,
        data.amount || 0,
        data.totalBet || 0,
        data.owner,
        data.winnerBoard ? JSON.stringify(data.winnerBoard) : null,
        data.winnerPlayerId || null,
        data.selectedBoard ? JSON.stringify(data.selectedBoard) : null,
        data.status || 'active',
        JSON.stringify(data[dataField] || data.metadata || {}),
        this.stageName,
        JSON.stringify(data.metadata || {})
      ];

      const stmt = this.connection.prepare(query);
      const result = stmt.run(params);
      
      return this.findById(result.lastInsertRowid);
    } catch (error) {
      console.error(`❌ Error creating ${this.tableName} record:`, error);
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
      console.error(`❌ Error finding ${this.tableName} by ID:`, error);
      throw error;
    }
  }

  /**
   * Find records by game ID
   */
  async findByGameId(gameId) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE gameId = ? ORDER BY createdAt DESC`;
      const stmt = this.connection.prepare(query);
      const results = stmt.all([gameId]);
      
      return results.map(record => this.parseRecord(record));
    } catch (error) {
      console.error(`❌ Error finding ${this.tableName} by game ID:`, error);
      throw error;
    }
  }

  /**
   * Find records by player ID
   */
  async findByPlayerId(playerId) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE playerId = ? ORDER BY createdAt DESC`;
      const stmt = this.connection.prepare(query);
      const results = stmt.all([playerId]);
      
      return results.map(record => this.parseRecord(record));
    } catch (error) {
      console.error(`❌ Error finding ${this.tableName} by player ID:`, error);
      throw error;
    }
  }

  /**
   * Find records by game and player ID
   */
  async findByGameAndPlayerId(gameId, playerId) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE gameId = ? AND playerId = ? ORDER BY createdAt DESC`;
      const stmt = this.connection.prepare(query);
      const result = stmt.get([gameId, playerId]);
      
      if (result) {
        return this.parseRecord(result);
      }
      return null;
    } catch (error) {
      console.error(`❌ Error finding ${this.tableName} by game and player ID:`, error);
      throw error;
    }
  }

  /**
   * Find records by status
   */
  async findByStatus(status) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY createdAt DESC`;
      const stmt = this.connection.prepare(query);
      const results = stmt.all([status]);
      
      return results.map(record => this.parseRecord(record));
    } catch (error) {
      console.error(`❌ Error finding ${this.tableName} by status:`, error);
      throw error;
    }
  }

  /**
   * Find all records
   */
  async findAll(limit = 100, offset = 0) {
    try {
      const query = `SELECT * FROM ${this.tableName} ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
      const stmt = this.connection.prepare(query);
      const results = stmt.all([limit, offset]);
      
      return results.map(record => this.parseRecord(record));
    } catch (error) {
      console.error(`❌ Error finding all ${this.tableName} records:`, error);
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
          if (['winnerBoard', 'selectedBoard', 'metadata', this.getDataFieldName()].includes(key)) {
            params.push(JSON.stringify(updateData[key]));
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
      console.error(`❌ Error updating ${this.tableName} record:`, error);
      throw error;
    }
  }

  /**
   * Update status
   */
  async updateStatus(id, status) {
    try {
      const query = `
        UPDATE ${this.tableName} 
        SET status = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      const stmt = this.connection.prepare(query);
      const result = stmt.run([status, id]);
      
      if (result.changes > 0) {
        return this.findById(id);
      }
      return null;
    } catch (error) {
      console.error(`❌ Error updating ${this.tableName} status:`, error);
      throw error;
    }
  }

  /**
   * Update winner information
   */
  async updateWinner(id, winnerPlayerId, winnerBoard) {
    try {
      const query = `
        UPDATE ${this.tableName} 
        SET winnerPlayerId = ?, winnerBoard = ?, status = 'completed', updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      const stmt = this.connection.prepare(query);
      const result = stmt.run([
        winnerPlayerId,
        winnerBoard ? JSON.stringify(winnerBoard) : null,
        id
      ]);
      
      if (result.changes > 0) {
        return this.findById(id);
      }
      return null;
    } catch (error) {
      console.error(`❌ Error updating ${this.tableName} winner:`, error);
      throw error;
    }
  }

  /**
   * Update payout
   */
  async updatePayout(id, payout) {
    try {
      const query = `
        UPDATE ${this.tableName} 
        SET payout = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      const stmt = this.connection.prepare(query);
      const result = stmt.run([payout, id]);
      
      if (result.changes > 0) {
        return this.findById(id);
      }
      return null;
    } catch (error) {
      console.error(`❌ Error updating ${this.tableName} payout:`, error);
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
      console.error(`❌ Error deleting ${this.tableName} record:`, error);
      throw error;
    }
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    try {
      const queries = [
        'SELECT COUNT(*) as total FROM ' + this.tableName,
        'SELECT COUNT(*) as active FROM ' + this.tableName + ' WHERE status = "active"',
        'SELECT COUNT(*) as completed FROM ' + this.tableName + ' WHERE status = "completed"',
        'SELECT SUM(payout) as totalPayout FROM ' + this.tableName + ' WHERE status = "completed"',
        'SELECT COUNT(*) as withWinners FROM ' + this.tableName + ' WHERE winnerPlayerId IS NOT NULL'
      ];

      const results = {};
      results.total = this.connection.prepare(queries[0]).get().total;
      results.active = this.connection.prepare(queries[1]).get().active;
      results.completed = this.connection.prepare(queries[2]).get().completed;
      results.totalPayout = this.connection.prepare(queries[3]).get().totalPayout || 0;
      results.withWinners = this.connection.prepare(queries[4]).get().withWinners;

      return results;
    } catch (error) {
      console.error(`❌ Error getting ${this.tableName} statistics:`, error);
      throw error;
    }
  }

  /**
   * Get the data field name for this stage
   */
  getDataFieldName() {
    const dataFieldMap = {
      'A': 'registrationData',
      'B': 'gameData',
      'C': 'registrationData',
      'D': 'registrationData',
      'E': 'registrationData',
      'F': 'registrationData',
      'G': 'registrationData',
      'H': 'registrationData',
      'I': 'registrationData',
      'J': 'registrationData',
      'K': 'registrationData',
      'L': 'registrationData'
    };
    
    return dataFieldMap[this.stageName] || 'metadata';
  }

  /**
   * Parse database record to JavaScript object
   */
  parseRecord(record) {
    if (!record) return null;
    
    const parsed = { ...record };
    
    // Parse JSON fields
    const jsonFields = ['winnerBoard', 'selectedBoard', 'metadata', 'registrationData', 'gameData'];
    
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
    
    return parsed;
  }
}

module.exports = SQLiteStage;
