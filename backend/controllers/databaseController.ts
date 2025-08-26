const express = require('express');
const databaseManager = require('../services/databaseManager');

class databaseController {

  async testConnection(req: any, res: any): Promise<void> {
    try {
      const connectionConfig = req.body;
      
      if (!connectionConfig.host || !connectionConfig.database) {
        res.status(400).json({
          success: false,
          message: 'Host y database son campos requeridos'
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
      
      if (!connectionConfig.name || !connectionConfig.host || !connectionConfig.database) {
        res.status(400).json({
          success: false,
          message: 'Name, host y database son campos requeridos'
        });
        return;
      }

      const result = await databaseManager.addConnection(connectionConfig);
      
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
      const firebirdErrorMsg = error.message;
      res.status(500).json({
          success: false,
          error: firebirdErrorMsg 
      });
  }
  
  }

  async getTables(req: any, res: any): Promise<void> {
    try {
      const { connectionId} = req.params;
      
      if (!connectionId) {
        res.status(400).json({
          success: false,
          message: 'connectionId es requerido'
        });
        return;
      }

      const result = await databaseManager.getTables(connectionId);
      
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

  async getViews(req: any, res: any): Promise<void> {
    try {
      const { connectionId} = req.params;
      if (!connectionId) {
        res.status(400).json({ success: false, message: 'connectionId es requerido' });
        return;
      }
      const result = await databaseManager.getViews(connectionId);
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error al obtener vistas', error: { message: error.message } });
    }
  }

  async getPackages(req: any, res: any): Promise<void> {
    try {
      const { connectionId } = req.params;
      if (!connectionId) {
        res.status(400).json({ success: false, message: 'connectionId es requerido' });
        return;
      }
      const result = await databaseManager.getPackages(connectionId);
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error al obtener paquetes', error: { message: error.message } });
    }
  }

  async getProcedures(req: any, res: any): Promise<void> {
    try {
      const { connectionId} = req.params;
      if (!connectionId) {
        res.status(400).json({ success: false, message: 'connectionId es requerido' });
        return;
      }
      const result = await databaseManager.getProcedures(connectionId);
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error al obtener procedimientos', error: { message: error.message } });
    }
  }

  async getFunctions(req: any, res: any): Promise<void> {
    try {
      const { connectionId} = req.params;
      if (!connectionId) {
        res.status(400).json({ success: false, message: 'connectionId es requerido' });
        return;
      }
      const result = await databaseManager.getFunctions(connectionId);
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error al obtener funciones', error: { message: error.message } });
    }
  }

  async getSequences(req: any, res: any): Promise<void> {
    try {
      const { connectionId } = req.params;
      if (!connectionId) {
        res.status(400).json({ success: false, message: 'connectionId es requerido' });
        return;
      }
      const result = await databaseManager.getSequences(connectionId);
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error al obtener secuencias', error: { message: error.message } });
    }
  }

  async getTriggers(req: any, res: any): Promise<void> {
    try {
      const { connectionId} = req.params;
      if (!connectionId) {
        res.status(400).json({ success: false, message: 'connectionId es requerido' });
        return;
      }
      const result = await databaseManager.getTriggers(connectionId);
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error al obtener triggers', error: { message: error.message } });
    }
  }

  async getIndexes(req: any, res: any): Promise<void> {
    try {
      const { connectionId} = req.params;
      if (!connectionId) {
        res.status(400).json({ success: false, message: 'connectionId es requerido' });
        return;
      }
      const result = await databaseManager.getIndexes(connectionId);
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error al obtener índices', error: { message: error.message } });
    }
  }

  async getUsers(req: any, res: any): Promise<void> {
    try {
      const { connectionId } = req.params;
      if (!connectionId) {
        res.status(400).json({ success: false, message: 'connectionId es requerido' });
        return;
      }
      const result = await databaseManager.getUsers(connectionId);
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error al obtener usuarios', error: { message: error.message } });
    }
  }

  async getTableColumns(req: any, res: any): Promise<void> {
    try {
      const { connectionId, tableName } = req.params;
      
      console.log('getTableColumns called with:', { connectionId, tableName });
      
      if (!connectionId || !tableName) {
        res.status(400).json({
          success: false,
          message: 'connectionId y tableName son requeridos'
        });
        return;
      }

      const result = await databaseManager.getTablesColumns(connectionId, tableName);
      
      console.log('getTableColumns result:', result);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      console.error('getTableColumns error:', error);
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

  // DDL Generation Methods
  async generateTableDDL(req: any, res: any): Promise<void> {
    try {
      const { connectionId, tableName } = req.params;
      
      if (!connectionId || !tableName) {
        res.status(400).json({
          success: false,
          message: 'connectionId y tableName son requeridos'
        });
        return;
      }

      const result = await databaseManager.generateTableDDL(connectionId, tableName);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al generar DDL de la tabla',
        error: { message: error.message }
      });
    }
  }

  async generateFunctionDDL(req: any, res: any): Promise<void> {
    try {
      const { connectionId, functionName } = req.params;
      
      if (!connectionId || !functionName) {
        res.status(400).json({
          success: false,
          message: 'connectionId y functionName son requeridos'
        });
        return;
      }

      const result = await databaseManager.generateFunctionDDL(connectionId, functionName);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al generar DDL de la función',
        error: { message: error.message }
      });
    }
  }

  async generateTriggerDDL(req: any, res: any): Promise<void> {
    try {
      const { connectionId, triggerName } = req.params;
      
      if (!connectionId || !triggerName) {
        res.status(400).json({
          success: false,
          message: 'connectionId y triggerName son requeridos'
        });
        return;
      }

      const result = await databaseManager.generateTriggerDDL(connectionId, triggerName);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al generar DDL del trigger',
        error: { message: error.message }
      });
    }
  }

  async generateProcedureDDL(req: any, res: any): Promise<void> {
    try {
      const { connectionId, procedureName } = req.params;
      
      if (!connectionId || !procedureName) {
        res.status(400).json({
          success: false,
          message: 'connectionId y procedureName son requeridos'
        });
        return;
      }

      const result = await databaseManager.generateProcedureDDL(connectionId, procedureName);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al generar DDL del procedimiento',
        error: { message: error.message }
      });
    }
  }

  async generateViewDDL(req: any, res: any): Promise<void> {
    try {
      const { connectionId, viewName } = req.params;
      
      if (!connectionId || !viewName) {
        res.status(400).json({
          success: false,
          message: 'connectionId y viewName son requeridos'
        });
        return;
      }

      const result = await databaseManager.generateViewDDL(connectionId, viewName);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al generar DDL de la vista',
        error: { message: error.message }
      });
    }
  }

  async generateIndexDDL(req: any, res: any): Promise<void> {
    try {
      const { connectionId, indexName } = req.params;
      
      if (!connectionId || !indexName) {
        res.status(400).json({
          success: false,
          message: 'connectionId y indexName son requeridos'
        });
        return;
      }

      const result = await databaseManager.generateIndexDDL(connectionId, indexName);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al generar DDL del índice',
        error: { message: error.message }
      });
    }
  }

  async generatePackageDDL(req: any, res: any): Promise<void> {
    try {
      const { connectionId, packageName } = req.params;
      
      if (!connectionId || !packageName) {
        res.status(400).json({
          success: false,
          message: 'connectionId y packageName son requeridos'
        });
        return;
      }

      const result = await databaseManager.generatePackageDDL(connectionId, packageName);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al generar DDL del paquete',
        error: { message: error.message }
      });
    }
  }

  async generateSequenceDDL(req: any, res: any): Promise<void> {
    try {
      const { connectionId, sequenceName } = req.params;

      
      if (!connectionId || !sequenceName) {
        res.status(400).json({
          success: false,
          message: 'connectionId y sequenceName son requeridos'
        });
        return;
      }

      const result = await databaseManager.generateSequenceDDL(connectionId, sequenceName);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al generar DDL de la secuencia',
        error: { message: error.message }
      });
    }
  }

  async generateUserDDL(req: any, res: any): Promise<void> {
    try {
      const { connectionId, userName } = req.params;
      
      if (!connectionId || !userName) {
        res.status(400).json({
          success: false,
          message: 'connectionId y userName son requeridos'
        });
        return;
      }

      const result = await databaseManager.generateUserDDL(connectionId, userName);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al generar DDL del usuario',
        error: { message: error.message }
      });
    }
  }

async createTable(req: any, res: any): Promise<void> {
  try {
    const { connectionId } = req.params;
    const tableData = req.body;
    
    console.log('Creating table for connection:', connectionId);
    console.log('Table data:', tableData);
    
    if (!connectionId) {
      res.status(400).json({
        success: false,
        message: 'connectionId es requerido'
      });
      return;
    }

    if (!tableData.tableName || !tableData.columns || !Array.isArray(tableData.columns)) {
      res.status(400).json({
        success: false,
        message: 'tableName y columns (array) son requeridos'
      });
      return;
    }
    const result = await databaseManager.createTable(connectionId, tableData);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error al crear tabla',
      error: { message: error.message }
    });
  }
}

  async createView(req: any, res: any): Promise<void> {
    try {
      const { connectionId } = req.params;
      const viewData = req.body;
      
      if (!connectionId) {
        res.status(400).json({
          success: false,
          message: 'connectionId es requerido'
        });
        return;
      }

      if (!viewData.viewName || !viewData.query) {
        res.status(400).json({
          success: false,
          message: 'viewName y query son requeridos'
        });
        return;
      }

      const result = await databaseManager.createView(connectionId, viewData);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al crear vista',
        error: { message: error.message }
      });
    }
  }
}

module.exports = new databaseController();