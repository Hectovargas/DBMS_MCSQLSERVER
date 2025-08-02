const databaseManager = require('../services/databaseManager');

class DatabaseController {
  // Conectar a una nueva base de datos
  async connectToDatabase(req: any, res: any) {
    try {
      const connectionConfig = req.body;
      const result = await databaseManager.connectToDatabase(connectionConfig);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: { message: error.message }
      });
    }
  }

  // Desconectar de una base de datos
  async disconnectFromDatabase(req: any, res: any) {
    try {
      const { connectionId } = req.params;
      const result = await databaseManager.disconnectFromDatabase(connectionId);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: { message: error.message }
      });
    }
  }

  // Obtener todas las conexiones activas
  async getActiveConnections(req: any, res: any) {
    try {
      const connections = databaseManager.getActiveConnections();
      res.status(200).json({
        success: true,
        connections
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener conexiones',
        error: { message: error.message }
      });
    }
  }

  // Ejecutar consulta
  async executeQuery(req: any, res: any) {
    try {
      const { connectionId } = req.params;
      const { query, parameters } = req.body;
      
      const result = await databaseManager.executeQuery(connectionId, query, parameters);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al ejecutar consulta',
        error: { message: error.message }
      });
    }
  }

  // Obtener esquemas de una base de datos
  async getSchemas(req: any, res: any) {
    try {
      const { connectionId } = req.params;
      const result = await databaseManager.getSchemas(connectionId);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener esquemas',
        error: { message: error.message }
      });
    }
  }

  // Obtener tablas de un esquema
  async getTables(req: any, res: any) {
    try {
      const { connectionId, schemaName } = req.params;
      const result = await databaseManager.getTables(connectionId, schemaName);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener tablas',
        error: { message: error.message }
      });
    }
  }
}

module.exports = new DatabaseController(); 