const express = require('express');
const DatabaseController = require('../controllers/databaseController');

const router = express.Router();

// Rutas de conexión
router.post('/test', DatabaseController.testConnection);
router.post('/add', DatabaseController.addConnection);
router.get('/all', DatabaseController.getAllConnections);
router.get('/active', DatabaseController.getActiveConnections);
router.delete('/:connectionId', DatabaseController.removeConnection);

// Rutas de conexión a base de datos
router.post('/:connectionId/connect', DatabaseController.connectToDatabase);
router.post('/:connectionId/disconnect', DatabaseController.disconnectFromDatabase);

// Rutas de consultas
router.post('/:connectionId/query', DatabaseController.executeQuery);

// Rutas de objetos de base de datos
router.get('/:connectionId/tables', DatabaseController.getTables);
router.get('/:connectionId/tables/:tableName/columns', DatabaseController.getTableColumns);
router.get('/:connectionId/views', DatabaseController.getViews);
router.get('/:connectionId/packages', DatabaseController.getPackages);
router.get('/:connectionId/procedures', DatabaseController.getProcedures);
router.get('/:connectionId/functions', DatabaseController.getFunctions);
router.get('/:connectionId/sequences', DatabaseController.getSequences);
router.get('/:connectionId/indexes', DatabaseController.getIndexes);
router.get('/:connectionId/triggers', DatabaseController.getTriggers);
router.get('/:connectionId/users', DatabaseController.getUsers);
router.get('/:connectionId/tablespaces', DatabaseController.getTablespaces);

// Rutas de DDL
router.get('/:connectionId/tables/:tableName/ddl', DatabaseController.generateTableDDL);
router.get('/:connectionId/functions/:functionName/ddl', DatabaseController.generateFunctionDDL);
router.get('/:connectionId/triggers/:triggerName/ddl', DatabaseController.generateTriggerDDL);
router.get('/:connectionId/procedures/:procedureName/ddl', DatabaseController.generateProcedureDDL);
router.get('/:connectionId/views/:viewName/ddl', DatabaseController.generateViewDDL);
router.get('/:connectionId/indexes/:indexName/ddl', DatabaseController.generateIndexDDL);
router.get('/:connectionId/packages/:packageName/ddl', DatabaseController.generatePackageDDL);
router.get('/:connectionId/sequences/:sequenceName/ddl', DatabaseController.generateSequenceDDL);
router.get('/:connectionId/users/:userName/ddl', DatabaseController.generateUserDDL);

// Rutas de creación
router.post('/:connectionId/tables', DatabaseController.createTable);
router.post('/:connectionId/views', DatabaseController.createView);

// Rutas de mantenimiento
router.post('/health-check', DatabaseController.checkConnectionsHealth);
router.post('/close-all', DatabaseController.closeAllConnections);

module.exports = router;