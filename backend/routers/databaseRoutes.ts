const express = require('express');
const databaseController = require('../controllers/databaseController');

const router = express.Router();

// Rutas para conexiones
router.post('/connect', databaseController.connectToDatabase);
router.get('/connections', databaseController.getActiveConnections);
router.delete('/disconnect/:connectionId', databaseController.disconnectFromDatabase);

// Rutas para consultas
router.post('/query/:connectionId', databaseController.executeQuery);

// Rutas para esquemas y tablas
router.get('/schemas/:connectionId', databaseController.getSchemas);
router.get('/tables/:connectionId/:schemaName', databaseController.getTables);

module.exports = router; 