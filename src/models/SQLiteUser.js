const bcrypt = require('bcryptjs');

class SQLiteUser {
  constructor() {
    this.connection = null;
    this.tableName = 'users';
  }

  /**
   * Initialize the model with database connection
   */
  async initialize(connection) {
    this.connection = connection;
    return this;
  }

  /**
   * Create a new user
   */
  async create(userData) {
    try {
      // Hash password before saving
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      const query = `
        INSERT INTO ${this.tableName} (
          username, email, password, role, databases
        ) VALUES (?, ?, ?, ?, ?)
      `;
      
      const params = [
        userData.username,
        userData.email,
        hashedPassword,
        userData.role || 'user',
        JSON.stringify(userData.databases || [])
      ];

      const stmt = this.connection.prepare(query);
      const result = stmt.run(params);
      
      return this.findById(result.lastInsertRowid);
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  /**
   * Find a user by ID
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
      console.error('❌ Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Find a user by username
   */
  async findByUsername(username) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE username = ?`;
      const stmt = this.connection.prepare(query);
      const result = stmt.get([username]);
      
      if (result) {
        return this.parseRecord(result);
      }
      return null;
    } catch (error) {
      console.error('❌ Error finding user by username:', error);
      throw error;
    }
  }

  /**
   * Find a user by email
   */
  async findByEmail(email) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE email = ?`;
      const stmt = this.connection.prepare(query);
      const result = stmt.get([email]);
      
      if (result) {
        return this.parseRecord(result);
      }
      return null;
    } catch (error) {
      console.error('❌ Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find a user by username or email
   */
  async findByUsernameOrEmail(usernameOrEmail) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE username = ? OR email = ?`;
      const stmt = this.connection.prepare(query);
      const result = stmt.get([usernameOrEmail, usernameOrEmail]);
      
      if (result) {
        return this.parseRecord(result);
      }
      return null;
    } catch (error) {
      console.error('❌ Error finding user by username or email:', error);
      throw error;
    }
  }

  /**
   * Find users by role
   */
  async findByRole(role) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE role = ? ORDER BY created_at DESC`;
      const stmt = this.connection.prepare(query);
      const results = stmt.all([role]);
      
      return results.map(record => this.parseRecord(record));
    } catch (error) {
      console.error('❌ Error finding users by role:', error);
      throw error;
    }
  }

  /**
   * Find all users
   */
  async findAll(limit = 100, offset = 0) {
    try {
      const query = `SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      const stmt = this.connection.prepare(query);
      const results = stmt.all([limit, offset]);
      
      return results.map(record => this.parseRecord(record));
    } catch (error) {
      console.error('❌ Error finding all users:', error);
      throw error;
    }
  }

  /**
   * Update a user by ID
   */
  async updateById(id, updateData) {
    try {
      const setClauses = [];
      const params = [];
      
      // Build dynamic SET clause
      Object.keys(updateData).forEach(key => {
        if (key !== 'id' && key !== 'created_at') {
          setClauses.push(`${key} = ?`);
          
          // Handle password hashing
          if (key === 'password') {
            // Hash the new password
            bcrypt.hash(updateData[key], 12, (err, hash) => {
              if (err) throw err;
              params.push(hash);
            });
            return; // Skip adding to params now, will be added in callback
          }
          
          // Convert JSON fields to strings
          if (key === 'databases') {
            params.push(JSON.stringify(updateData[key]));
          } else {
            params.push(updateData[key]);
          }
        }
      });
      
      // Add updated_at
      setClauses.push('updated_at = CURRENT_TIMESTAMP');
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
      console.error('❌ Error updating user:', error);
      throw error;
    }
  }

  /**
   * Update password
   */
  async updatePassword(id, newPassword) {
    try {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      const query = `
        UPDATE ${this.tableName} 
        SET password = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      const stmt = this.connection.prepare(query);
      const result = stmt.run([hashedPassword, id]);
      
      return result.changes > 0;
    } catch (error) {
      console.error('❌ Error updating user password:', error);
      throw error;
    }
  }

  /**
   * Update role
   */
  async updateRole(id, newRole) {
    try {
      const query = `
        UPDATE ${this.tableName} 
        SET role = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      const stmt = this.connection.prepare(query);
      const result = stmt.run([newRole, id]);
      
      if (result.changes > 0) {
        return this.findById(id);
      }
      return null;
    } catch (error) {
      console.error('❌ Error updating user role:', error);
      throw error;
    }
  }

  /**
   * Add database to user's databases
   */
  async addDatabase(id, databaseInfo) {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new Error('User not found');
      }
      
      const databases = [...user.databases];
      databases.push(databaseInfo);
      
      const query = `
        UPDATE ${this.tableName} 
        SET databases = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      const stmt = this.connection.prepare(query);
      const result = stmt.run([JSON.stringify(databases), id]);
      
      if (result.changes > 0) {
        return this.findById(id);
      }
      return null;
    } catch (error) {
      console.error('❌ Error adding database to user:', error);
      throw error;
    }
  }

  /**
   * Remove database from user's databases
   */
  async removeDatabase(id, databaseName) {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new Error('User not found');
      }
      
      const databases = user.databases.filter(db => db.name !== databaseName);
      
      const query = `
        UPDATE ${this.tableName} 
        SET databases = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      const stmt = this.connection.prepare(query);
      const result = stmt.run([JSON.stringify(databases), id]);
      
      if (result.changes > 0) {
        return this.findById(id);
      }
      return null;
    } catch (error) {
      console.error('❌ Error removing database from user:', error);
      throw error;
    }
  }

  /**
   * Verify password
   */
  async verifyPassword(user, candidatePassword) {
    try {
      return await bcrypt.compare(candidatePassword, user.password);
    } catch (error) {
      console.error('❌ Error verifying password:', error);
      throw error;
    }
  }

  /**
   * Delete a user by ID
   */
  async deleteById(id) {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const stmt = this.connection.prepare(query);
      const result = stmt.run([id]);
      
      return result.changes > 0;
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getStatistics() {
    try {
      const queries = [
        'SELECT COUNT(*) as total FROM ' + this.tableName,
        'SELECT COUNT(*) as admins FROM ' + this.tableName + ' WHERE role = "admin"',
        'SELECT COUNT(*) as regularUsers FROM ' + this.tableName + ' WHERE role = "user"',
        'SELECT COUNT(*) as viewers FROM ' + this.tableName + ' WHERE role = "viewer"',
        'SELECT COUNT(*) as withDatabases FROM ' + this.tableName + ' WHERE json_array_length(databases) > 0'
      ];

      const results = {};
      results.total = this.connection.prepare(queries[0]).get().total;
      results.admins = this.connection.prepare(queries[1]).get().admins;
      results.regularUsers = this.connection.prepare(queries[2]).get().regularUsers;
      results.viewers = this.connection.prepare(queries[3]).get().viewers;
      results.withDatabases = this.connection.prepare(queries[4]).get().withDatabases;

      return results;
    } catch (error) {
      console.error('❌ Error getting user statistics:', error);
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
    if (parsed.databases) {
      try {
        parsed.databases = JSON.parse(parsed.databases);
      } catch (e) {
        console.warn('⚠️  Failed to parse databases as JSON:', parsed.databases);
        parsed.databases = [];
      }
    }
    
    // Remove password from parsed record for security
    delete parsed.password;
    
    return parsed;
  }
}

module.exports = SQLiteUser;
