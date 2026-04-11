const express = require('express');
const router = express.Router();
const databaseController = require('../controllers/databaseController');
const { authenticateToken } = require('../middleware/auth');
const { body } = require('express-validator');

// Middleware for authentication
router.use(authenticateToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     Database:
 *       type: object
 *       required:
 *         - name
 *         - type
 *         - host
 *         - port
 *         - database_name
 *         - username
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           description: Database display name
 *         type:
 *           type: string
 *           enum: [mongodb, postgresql, mysql]
 *           description: Database type
 *         host:
 *           type: string
 *           description: Database host
 *         port:
 *           type: integer
 *           description: Database port
 *         database_name:
 *           type: string
 *           description: Database name
 *         username:
 *           type: string
 *           description: Database username
 *         password:
 *           type: string
 *           description: Database password
 *         status:
 *           type: string
 *           enum: [active, inactive, maintenance]
 *           description: Database status
 */

/**
 * @swagger
 * /api/v1/databases:
 *   get:
 *     summary: Get all databases for the authenticated user
 *     tags: [Databases]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of databases
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Database'
 *                 count:
 *                   type: integer
 */
router.get('/', databaseController.getAllDatabases);

/**
 * @swagger
 * /api/v1/databases/{id}:
 *   get:
 *     summary: Get a database by ID
 *     tags: [Databases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Database details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Database'
 *       404:
 *         description: Database not found
 */
router.get('/:id', databaseController.getDatabaseById);

/**
 * @swagger
 * /api/v1/databases:
 *   post:
 *     summary: Create a new database
 *     tags: [Databases]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Database'
 *     responses:
 *       201:
 *         description: Database created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Database'
 *                 message:
 *                   type: string
 */
router.post('/', [
  body('name').notEmpty().withMessage('Database name is required'),
  body('type').isIn(['mongodb', 'postgresql', 'mysql']).withMessage('Invalid database type'),
  body('host').notEmpty().withMessage('Host is required'),
  body('port').isInt({ min: 1, max: 65535 }).withMessage('Port must be between 1 and 65535'),
  body('database_name').notEmpty().withMessage('Database name is required'),
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], databaseController.createDatabase);

/**
 * @swagger
 * /api/v1/databases/{id}:
 *   put:
 *     summary: Update a database
 *     tags: [Databases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance]
 *               backup_schedule:
 *                 type: string
 *     responses:
 *       200:
 *         description: Database updated successfully
 *       404:
 *         description: Database not found
 */
router.put('/:id', databaseController.updateDatabase);

/**
 * @swagger
 * /api/v1/databases/{id}:
 *   delete:
 *     summary: Delete a database
 *     tags: [Databases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Database deleted successfully
 *       404:
 *         description: Database not found
 */
router.delete('/:id', databaseController.deleteDatabase);

/**
 * @swagger
 * /api/v1/databases/{id}/test:
 *   post:
 *     summary: Test database connection
 *     tags: [Databases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Connection test result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [success, failed]
 *                     message:
 *                       type: string
 *                     timestamp:
 *                       type: string
 */
router.post('/:id/test', databaseController.testDatabaseConnection);

/**
 * @swagger
 * /api/v1/databases/{id}/models:
 *   get:
 *     summary: Get database models
 *     tags: [Databases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Database models retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     databaseId:
 *                       type: string
 *                     models:
 *                       type: array
 *                       items:
 *                         type: string
 *                     modelCount:
 *                       type: integer
 */
router.get('/:id/models', databaseController.getDatabaseModels);

module.exports = router;
