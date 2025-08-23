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
router.get('/:connectionId/schemas/tables', DatabaseController.getTables);
router.get('/:connectionId/schemas/:schemaName/tables', DatabaseController.getTables);
router.get('/:connectionId/tables/:tableName/columns', DatabaseController.getTableColumns);


router.get('/:connectionId/schemas/views', DatabaseController.getViews);
router.get('/:connectionId/schemas/:schemaName/views', DatabaseController.getViews);
router.get('/:connectionId/schemas/packages', DatabaseController.getPackages);
router.get('/:connectionId/schemas/:schemaName/packages', DatabaseController.getPackages);
router.get('/:connectionId/schemas/procedures', DatabaseController.getProcedures);
router.get('/:connectionId/schemas/:schemaName/procedures', DatabaseController.getProcedures);
router.get('/:connectionId/schemas/functions', DatabaseController.getFunctions);
router.get('/:connectionId/schemas/:schemaName/functions', DatabaseController.getFunctions);
router.get('/:connectionId/sequences', DatabaseController.getSequences);
router.get('/:connectionId/schemas/indexes', DatabaseController.getIndexes);
router.get('/:connectionId/schemas/:schemaName/indexes', DatabaseController.getIndexes);
router.get('/:connectionId/schemas/triggers', DatabaseController.getTriggers);
router.get('/:connectionId/schemas/:schemaName/triggers', DatabaseController.getTriggers);
router.get('/:connectionId/users', DatabaseController.getUsers);
router.get('/:connectionId/tablespaces', DatabaseController.getTablespaces);


router.get('/:connectionId/tables/:tableName/ddl', DatabaseController.generateTableDDL);
router.get('/:connectionId/functions/:functionName/ddl', DatabaseController.generateFunctionDDL);
router.get('/:connectionId/triggers/:triggerName/ddl', DatabaseController.generateTriggerDDL);
router.get('/:connectionId/procedures/:procedureName/ddl', DatabaseController.generateProcedureDDL);
router.get('/:connectionId/views/:viewName/ddl', DatabaseController.generateViewDDL);
router.get('/:connectionId/indexes/:indexName/ddl', DatabaseController.generateIndexDDL);
router.get('/:connectionId/sequences/:sequenceName/ddl', DatabaseController.generateSequenceDDL);
router.get('/:connectionId/users/:userName/ddl', DatabaseController.generateUserDDL);


router.post('/:connectionId/tables', DatabaseController.createTable);

// Endpoint temporal para debug
router.get('/debug/connections', (req: any, res: any) => {
  const databaseManager = require('../services/databaseManager');
  res.json({
    connections: Object.keys(databaseManager.conexiones || {}),
    connectionDetails: databaseManager.conexiones || {}
  });
});
router.post('/:connectionId/views', DatabaseController.createView);

router.post('/health-check', DatabaseController.checkConnectionsHealth);
router.post('/close-all', DatabaseController.closeAllConnections);

module.exports = router;