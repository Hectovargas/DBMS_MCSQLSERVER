const express = require('express');
const databaseManager = require('../services/databaseManager');

interface ConnectionParams {
  connectionId: string;
}

interface TableParams extends ConnectionParams {
  tableName: string;
  schemaName?: string;
}

interface SchemaParams extends ConnectionParams {
  schemaName: string;
}

class databaseController {

  async testConnection(req: any, res: any): Promise<void> {
    try {
      const connectionConfig = req.body;
      
      if (!connectionConfig.server || !connectionConfig.database) {
        res.status(400).json({
          success: false,
          message: 'Server y database son campos requeridos'
        });
        return;
      }

      const result = await databaseManager.testConnection(connectionConfig);
      
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

  async addConnection(req: any, res: any): Promise<void> {
    try {
      const connectionConfig = req.body;
      
      if (!connectionConfig.name || !connectionConfig.server || !connectionConfig.database) {
        res.status(400).json({
          success: false,
          message: 'Name, server y database son campos requeridos'
        });
        return;
      }

      const result = await databaseManager.addConection(connectionConfig);
      
      if (result.success) {
        res.status(201).json(result);
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

  async connectToDatabase(req: any, res: any): Promise<void> {
    try {
      const { connectionId } = req.params;
      
      if (!connectionId) {
        res.status(400).json({
          success: false,
          message: 'connectionId es requerido'
        });
        return;
      }

      const result = await databaseManager.connectToDatabase(connectionId);
      
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

  async disconnectFromDatabase(req: any, res: any): Promise<void> {
    try {
      const { connectionId } = req.params;
      
      if (!connectionId) {
        res.status(400).json({
          success: false,
          message: 'connectionId es requerido'
        });
        return;
      }

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

  async removeConnection(req: any, res: any): Promise<void> {
    try {
      const { connectionId } = req.params;
      
      if (!connectionId) {
        res.status(400).json({
          success: false,
          message: 'connectionId es requerido'
        });
        return;
      }

      const result = await databaseManager.removeConnection(connectionId);
      
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

  async getAllConnections(req: any, res: any): Promise<void> {
    try {
      const connections = databaseManager.getAllConnections();
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

  async getActiveConnections(req: any, res: any): Promise<void> {
    try {
      const connections = databaseManager.getActiveConnections();
      res.status(200).json({
        success: true,
        connections
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener conexiones activas',
        error: { message: error.message }
      });
    }
  }

  async executeQuery(req: any, res: any): Promise<void> {
    try {
      const { connectionId } = req.params;
      const { query, parameters } = req.body;
      
      if (!connectionId) {
        res.status(400).json({
          success: false,
          message: 'connectionId es requerido'
        });
        return;
      }

      if (!query || typeof query !== 'string' || query.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'Query es requerido y debe ser una cadena no vacía'
        });
        return;
      }

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

  async getSchemas(req: any, res: any): Promise<void> {
    try {
      const { connectionId } = req.params;
      
      if (!connectionId) {
        res.status(400).json({
          success: false,
          message: 'connectionId es requerido'
        });
        return;
      }

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

  async getTables(req: any, res: any): Promise<void> {
    try {
      const { connectionId, schemaName = 'dbo' } = req.params;
      
      if (!connectionId) {
        res.status(400).json({
          success: false,
          message: 'connectionId es requerido'
        });
        return;
      }

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

  async getTableColumns(req: any, res: any): Promise<void> {
    try {
      const { connectionId, tableName } = req.params;
      const { schemaName = 'dbo' } = req.query as { schemaName?: string };
      
      if (!connectionId || !tableName) {
        res.status(400).json({
          success: false,
          message: 'connectionId y tableName son requeridos'
        });
        return;
      }

      const result = await databaseManager.getTablesColumns(connectionId, tableName, schemaName);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener columnas de la tabla',
        error: { message: error.message }
      });
    }
  }

  async checkConnectionsHealth(req: any, res: any): Promise<void> {
    try {
      await databaseManager.checkConnectionsHealth();
      res.status(200).json({
        success: true,
        message: 'Verificación de salud de conexiones completada'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al verificar salud de conexiones',
        error: { message: error.message }
      });
    }
  }

  async closeAllConnections(req: any, res: any): Promise<void> {
    try {
      await databaseManager.closeAllconection();
      res.status(200).json({
        success: true,
        message: 'Todas las conexiones han sido cerradas'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al cerrar todas las conexiones',
        error: { message: error.message }
      });
    }
  }
}

module.exports = new databaseController();