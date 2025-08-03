const express = require('express');
const DatabaseController = require('../controllers/databaseController');

const router = express.Router();


router.post('/test', DatabaseController.testConnection);
router.post('/add', DatabaseController.addConnection);
router.get('/all', DatabaseController.getAllConnections);
router.get('/active', DatabaseController.getActiveConnections);
router.delete('/:connectionId', DatabaseController.removeConnection);


router.post('/:connectionId/connect', DatabaseController.connectToDatabase);
router.post('/:connectionId/disconnect', DatabaseController.disconnectFromDatabase);


router.post('/:connectionId/query', DatabaseController.executeQuery);
router.get('/:connectionId/schemas', DatabaseController.getSchemas);
router.get('/:connectionId/schemas/:schemaName/tables', DatabaseController.getTables);
router.get('/:connectionId/tables/:tableName/columns', DatabaseController.getTableColumns);


router.post('/health-check', DatabaseController.checkConnectionsHealth);
router.post('/close-all', DatabaseController.closeAllConnections);

module.exports = router;