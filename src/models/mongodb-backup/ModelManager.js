const mongoose = require('mongoose');
const { getConnection, getDatabaseForModel, getModelDistribution } = require('../config/mongodb');

class ModelManager {
  constructor() {
    this.models = {};
    this.schemas = {};
    this.initializeSchemas();
  }

  /**
   * Initialize all schemas
   */
  initializeSchemas() {
    // Section Management Schema
    this.schemas.SectionManagement = new mongoose.Schema({
      id: {
        type: String,
        required: true,
        unique: true,
        index: true
      },
      playerId: {
        type: String,
        required: true,
        index: true
      },
      stageA: { type: mongoose.Schema.Types.Mixed, default: null },
      stageB: { type: mongoose.Schema.Types.Mixed, default: null },
      stageC: { type: mongoose.Schema.Types.Mixed, default: null },
      stageD: { type: mongoose.Schema.Types.Mixed, default: null },
      stageE: { type: mongoose.Schema.Types.Mixed, default: null },
      stageF: { type: mongoose.Schema.Types.Mixed, default: null },
      stageG: { type: mongoose.Schema.Types.Mixed, default: null },
      stageH: { type: mongoose.Schema.Types.Mixed, default: null },
      stageI: { type: mongoose.Schema.Types.Mixed, default: null },
      stageJ: { type: mongoose.Schema.Types.Mixed, default: null },
      stageK: { type: mongoose.Schema.Types.Mixed, default: null },
      stageL: { type: mongoose.Schema.Types.Mixed, default: null },
      currentStage: { type: String, default: 'A' },
      stageProgress: { type: Map, of: String, default: {} },
      stageStatus: { type: Map, of: String, default: {} },
      isActive: { type: Boolean, default: true },
      metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
      lastActiveAt: { type: Date, default: Date.now },
      completedStages: { type: [String], default: [] }
    }, {
      timestamps: true,
      collection: 'section_management'
    });

    // Base Stage Schema
    this.createStageSchemas();
  }

  /**
   * Create schemas for all stages (A-L)
   */
  createStageSchemas() {
    const stages = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    
    stages.forEach(stage => {
      const stageSpecificFields = this.getStageSpecificFields(stage);
      
      this.schemas[`Stage${stage}`] = new mongoose.Schema({
        gameId: {
          type: String,
          required: true,
          index: true
        },
        playerId: {
          type: String,
          required: true,
          index: true
        },
        payout: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
        totalBet: { type: Number, default: 0 },
        owner: { type: String, required: true },
        winnerBoard: { type: mongoose.Schema.Types.Mixed, default: null },
        winnerPlayerId: { type: String, default: null },
        selectedBoard: { type: mongoose.Schema.Types.Mixed, default: null },
        status: {
          type: String,
          enum: ['active', 'completed', 'cancelled', 'pending', 'expired'],
          default: 'active'
        },
        stage: { type: String, default: stage },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
        ...stageSpecificFields
      }, {
        timestamps: true,
        collection: `stage_${stage.toLowerCase()}`
      });
    });
  }

  /**
   * Get stage-specific fields for each stage
   */
  getStageSpecificFields(stage) {
    const stageFields = {
      A: {
        registrationData: {
          playerName: { type: String, required: true },
          playerEmail: { type: String, required: true },
          registrationTime: { type: Date, default: Date.now },
          gameMode: { type: String, default: 'standard' },
          maxPlayers: { type: Number, default: 100 }
        }
      },
      B: {
        cardData: {
          cardId: { type: String, required: true },
          cardNumbers: [{ type: Number }],
          cardType: { type: String, default: 'standard' },
          generatedAt: { type: Date, default: Date.now },
          cardTemplate: { type: String, default: 'classic' },
          freeSpace: { type: Boolean, default: true }
        },
        cardValidation: {
          isValid: { type: Boolean, default: true },
          validationErrors: [{ type: String }],
          validatedAt: { type: Date }
        }
      },
      C: {
        gameManagement: {
          gameSettings: {
            autoCallNumbers: { type: Boolean, default: true },
            callInterval: { type: Number, default: 5000 },
            winPatterns: [{ type: String }],
            maxWinners: { type: Number, default: 3 }
          },
          gameControl: {
            isPaused: { type: Boolean, default: false },
            isStarted: { type: Boolean, default: false },
            isStopped: { type: Boolean, default: false },
            startTime: { type: Date },
            endTime: { type: Date },
            duration: { type: Number }
          },
          playerActions: {
            joinedAt: { type: Date, default: Date.now },
            lastAction: { type: Date },
            actionHistory: [{
              action: { type: String },
              timestamp: { type: Date },
              details: { type: mongoose.Schema.Types.Mixed }
            }]
          }
        }
      },
      D: {
        numberCalling: {
          currentNumber: { type: Number, default: null },
          calledNumbers: [{ type: Number }],
          callHistory: [{
            number: { type: Number },
            letter: { type: String },
            calledAt: { type: Date, default: Date.now },
            callOrder: { type: Number }
          }],
          callingPattern: { type: String, default: 'random' },
          callInterval: { type: Number, default: 5000 },
          lastCallTime: { type: Date },
          autoCallEnabled: { type: Boolean, default: true }
        },
        numberStats: {
          totalCalled: { type: Number, default: 0 },
          averageCallTime: { type: Number, default: 0 },
          letterDistribution: {
            B: { type: Number, default: 0 },
            I: { type: Number, default: 0 },
            N: { type: Number, default: 0 },
            G: { type: Number, default: 0 },
            O: { type: Number, default: 0 }
          }
        }
      },
      E: {
        winDetection: {
          markedNumbers: [{ type: Number }],
          winningPatterns: [{
            pattern: { type: String },
            isMatched: { type: Boolean, default: false },
            matchedAt: { type: Date },
            winningNumbers: [{ type: Number }],
            positions: [{ type: Number }]
          }],
          winClaim: {
            claimedAt: { type: Date },
            claimedPattern: { type: String },
            isVerified: { type: Boolean, default: false },
            verifiedAt: { type: Date },
            verifiedBy: { type: String },
            verificationResult: { type: String }
          },
          autoDetection: {
            enabled: { type: Boolean, default: true },
            lastCheck: { type: Date },
            checkInterval: { type: Number, default: 1000 }
          }
        },
        patternMatching: {
          currentPatterns: [{ type: String }],
          completedPatterns: [{ type: String }],
          patternProgress: {
            type: Map,
            of: Number,
            default: {}
          }
        }
      },
      F: {
        prizeDistribution: {
          prizePool: { type: Number, default: 0 },
          prizeStructure: [{
            position: { type: Number },
            amount: { type: Number },
            percentage: { type: Number },
            pattern: { type: String }
          }],
          distributionHistory: [{
            playerId: { type: String },
            amount: { type: Number },
            position: { type: Number },
            pattern: { type: String },
            distributedAt: { type: Date, default: Date.now },
            transactionId: { type: String },
            status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' }
          }],
          totalDistributed: { type: Number, default: 0 },
          distributionMethod: { type: String, default: 'automatic' }
        },
        paymentProcessing: {
          paymentGateway: { type: String, default: 'internal' },
          transactionFees: { type: Number, default: 0 },
          currency: { type: String, default: 'USD' },
          exchangeRate: { type: Number, default: 1.0 },
          paymentStatus: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
          processedAt: { type: Date }
        }
      },
      G: {
        resultsRecording: {
          gameSummary: {
            startTime: { type: Date },
            endTime: { type: Date },
            duration: { type: Number },
            totalPlayers: { type: Number },
            totalCards: { type: Number },
            totalPrizePool: { type: Number },
            totalPayouts: { type: Number }
          },
          winnerDetails: [{
            playerId: { type: String },
            playerName: { type: String },
            cardId: { type: String },
            winningPattern: { type: String },
            winningNumbers: [{ type: Number }],
            prizeAmount: { type: Number },
            position: { type: Number },
            wonAt: { type: Date }
          }],
          gameStatistics: {
            averageCallsPerWin: { type: Number },
            fastestWin: { type: Number },
            slowestWin: { type: Number },
            totalRevenue: { type: Number },
            totalProfit: { type: Number }
          },
          recordingStatus: {
            isRecorded: { type: Boolean, default: false },
            recordedAt: { type: Date },
            recordedBy: { type: String },
            verified: { type: Boolean, default: false },
            verifiedAt: { type: Date }
          }
        },
        auditTrail: [{
          action: { type: String },
          timestamp: { type: Date, default: Date.now },
          userId: { type: String },
          details: { type: mongoose.Schema.Types.Mixed },
          ipAddress: { type: String },
          userAgent: { type: String }
        }]
      },
      H: {
        analyticsProcessing: {
          processedData: {
            playerPerformance: {
              gamesPlayed: { type: Number, default: 0 },
              gamesWon: { type: Number, default: 0 },
              winRate: { type: Number, default: 0 },
              totalWinnings: { type: Number, default: 0 },
              averageBet: { type: Number, default: 0 },
              favoritePatterns: [{ type: String }]
            },
            gameMetrics: {
              averageGameDuration: { type: Number, default: 0 },
              averageCallsPerGame: { type: Number, default: 0 },
              peakActivePlayers: { type: Number, default: 0 },
              totalRevenueGenerated: { type: Number, default: 0 }
            },
            patternAnalysis: {
              mostWonPatterns: [{
                pattern: { type: String },
                wins: { type: Number },
                percentage: { type: Number }
              }],
              averageCallsToWin: { type: Number, default: 0 },
              patternDistribution: {
                type: Map,
                of: Number,
                default: {}
              }
            }
          },
          processingStatus: {
            isProcessed: { type: Boolean, default: false },
            processedAt: { type: Date },
            processingDuration: { type: Number },
            processingErrors: [{ type: String }],
            nextProcessingTime: { type: Date }
          },
          insights: [{
            type: { type: String, enum: ['trend', 'anomaly', 'recommendation', 'alert'] },
            title: { type: String },
            description: { type: String },
            confidence: { type: Number, min: 0, max: 1 },
            generatedAt: { type: Date, default: Date.now },
            data: { type: mongoose.Schema.Types.Mixed }
          }]
        },
        realTimeMetrics: {
          currentActivePlayers: { type: Number, default: 0 },
          currentGameProgress: { type: Number, default: 0 },
          lastUpdated: { type: Date, default: Date.now },
          performanceScore: { type: Number, default: 0 }
        }
      },
      I: {
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
        reportTemplates: [{
          templateId: { type: String, required: true },
          templateName: { type: String, required: true },
          description: { type: String },
          sections: [{ type: String }],
          customFields: { type: mongoose.Schema.Types.Mixed },
          createdAt: { type: Date, default: Date.now },
          isActive: { type: Boolean, default: true }
        }]
      },
      J: {
        archiveManagement: {
          archiveConfig: {
            retentionPeriod: { type: Number, default: 365 },
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
        archivedData: {
          originalCollection: { type: String },
          archiveDate: { type: Date },
          dataHash: { type: String },
          isArchived: { type: Boolean, default: false },
          archiveLocation: { type: String },
          retrievalKey: { type: String }
        },
        lifecycle: {
          createdAt: { type: Date, default: Date.now },
          lastAccessed: { type: Date, default: Date.now },
          accessCount: { type: Number, default: 0 },
          expiryDate: { type: Date },
          deletionScheduled: { type: Boolean, default: false },
          deletionDate: { type: Date }
        }
      },
      K: {
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
        }
      },
      L: {
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
        }
      }
    };

    return stageFields[stage] || {};
  }

  /**
   * Initialize Section Management schema on Database 1 (Primary)
   */
  async initializeSectionManagement() {
    try {
      const connection = getConnection('primary');
      if (!connection || connection.readyState !== 1) {
        throw new Error('Primary database is not connected');
      }

      console.log(`📋 Initializing Section Management on Database 1 (Primary)...`);
      
      // Create Section Management model on primary database
      const SectionManagement = require('./SectionManagement');
      const SectionModel = connection.model('SectionManagement', SectionManagement.schema);
      
      this.models.SectionManagement = SectionModel;
      
      console.log(`  ✅ Section Management initialized on Database 1`);
      
      return SectionModel;
    } catch (error) {
      console.error('Failed to initialize Section Management:', error);
      throw error;
    }
  }

  /**
   * Initialize all stage models on their respective databases
   */
  async initializeStageModels() {
    console.log('\n🏗️  Initializing Stage Models Across Databases...');
    console.log('─'.repeat(60));

    const modelDistribution = getModelDistribution();
    const initializationResults = [];

    for (const [dbKey, dbConfig] of Object.entries(modelDistribution)) {
      try {
        const connection = getConnection(dbKey);
        if (!connection || connection.readyState !== 1) {
          throw new Error(`Database ${dbKey} is not connected`);
        }

        console.log(`\n📦 Creating models on ${dbConfig.name}...`);
        
        const modelsCreated = [];
        
        // Create models for this database
        for (const modelName of dbConfig.models) {
          try {
            const schema = this.schemas[modelName];
            if (!schema) {
              console.log(`  ⚠️  Schema not found for model: ${modelName}`);
              continue;
            }

            // Create model on the specific database connection
            const model = connection.model(modelName, schema);
            this.models[modelName] = model;
            modelsCreated.push(modelName);
            
            console.log(`  ✅ Created model: ${modelName}`);
          } catch (error) {
            console.log(`  ❌ Failed to create model ${modelName}: ${error.message}`);
          }
        }

        initializationResults.push({
          database: dbConfig.name,
          connectionKey: dbKey,
          status: 'success',
          modelsCreated,
          totalModels: dbConfig.models.length
        });

        console.log(`📊 ${dbConfig.name}: ${modelsCreated.length}/${dbConfig.models.length} models created`);

      } catch (error) {
        console.log(`❌ Failed to initialize models on ${dbConfig.name}: ${error.message}`);
        initializationResults.push({
          database: dbConfig.name,
          connectionKey: dbKey,
          status: 'failed',
          error: error.message,
          modelsCreated: []
        });
      }
    }

    // Display initialization summary
    console.log('\n📋 Model Initialization Summary:');
    console.log('─'.repeat(60));
    
    initializationResults.forEach(result => {
      const status = result.status === 'success' ? '✅ SUCCESS' : '❌ FAILED';
      const statusColor = result.status === 'success' ? '\x1b[32m' : '\x1b[31m';
      const reset = '\x1b[0m';
      
      console.log(`${result.database.padEnd(25)} | ${statusColor}${status}${reset}`);
      console.log(`${''.padEnd(25)} | Models: ${result.modelsCreated.join(', ')}`);
      console.log(`${''.padEnd(25)} | Count: ${result.modelsCreated.length}/${result.totalModels}`);
      if (result.error) {
        console.log(`${''.padEnd(25)} | Error: ${result.error}`);
      }
    });
    
    console.log('─'.repeat(60));
    console.log('');

    return this.models;
  }

  /**
   * Get a specific model
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
   * Get models for a specific database
   */
  getModelsForDatabase(databaseKey) {
    const modelsForDb = getModelsForDatabase(databaseKey);
    const result = {};
    modelsForDb.forEach(modelName => {
      if (this.models[modelName]) {
        result[modelName] = this.models[modelName];
      }
    });
    return result;
  }

  /**
   * Get database for a specific model
   */
  getDatabaseForModel(modelName) {
    return getDatabaseForModel(modelName);
  }

  /**
   * Check if all models are initialized
   */
  areAllModelsInitialized() {
    const expectedModels = [
      'SectionManagement', 'StageA', 'StageB', 'StageC', 'StageD', 'StageE', 'StageF', 
      'StageG', 'StageH', 'StageI', 'StageJ', 'StageK', 'StageL'
    ];
    return expectedModels.every(model => this.models[modelName]);
  }
}

module.exports = ModelManager;
