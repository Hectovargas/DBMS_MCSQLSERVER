const API_BASE = 'http://localhost:3001/api/database';

export interface ConnectionConfig {
  name: string;
  server: string;
  database: string;
  username: string;
  password: string;
  port: number;
}

export interface DatabaseConnection {
  id: string;
  name: string;
  server: string;
  database: string;
  username?: string;
  port?: number;
  isActive?: boolean;
  lastConnected?: Date;
  version?: string;
  edition?: string;
}

export interface Schema {
  schema_name: string;
  schema_id: number;
  principal_name: string;
}

export interface Table {
  table_name: string;
  schema_name: string;
  create_date: string;
  modify_date: string;
}

export interface Column {
  name: string;
  dataType: string;
  maxLength?: number;
  precision?: number;
  scale?: number;
  isNullable: boolean;
  isIdentity?: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  defaultValue?: string;
  description?: string;
}

export interface QueryResult {
  success: boolean;
  data?: any[];
  rowsAffected?: number;
  executionTime?: number;
  columns?: {
    name: string;
    type: string;
  }[];
  error?: {
    code?: number;
    message: string;
    lineNumber?: number;
    procedure?: string;
  };
}

class ApiService {
  // Función helper para manejar errores de red
  private async handleResponse(response: Response): Promise<any> {
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de respuesta del servidor:', response.status, errorText);
      throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
    }
    
    try {
      const data = await response.json();
      console.log('Respuesta del servidor:', data);
      return data;
    } catch (error) {
      console.error('Error al parsear respuesta JSON:', error);
      throw new Error('Error al procesar respuesta del servidor');
    }
  }

  // Prueba de conexión
  async testConnection(config: ConnectionConfig): Promise<any> {
    try {
      console.log('Probando conexión con config:', { ...config, password: '***' });
      
      const response = await fetch(`${API_BASE}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en testConnection:', error);
      throw error;
    }
  }

  // Agregar conexión
  async addConnection(config: ConnectionConfig): Promise<any> {
    try {
      console.log('Agregando conexión con config:', { ...config, password: '***' });
      
      const response = await fetch(`${API_BASE}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en addConnection:', error);
      throw error;
    }
  }

  // Obtener todas las conexiones
  async getAllConnections(): Promise<any> {
    try {
      console.log('Obteniendo todas las conexiones');
      
      const response = await fetch(`${API_BASE}/all`);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getAllConnections:', error);
      throw error;
    }
  }

  // Obtener conexiones activas
  async getActiveConnections(): Promise<any> {
    try {
      console.log('Obteniendo conexiones activas');
      
      const response = await fetch(`${API_BASE}/active`);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getActiveConnections:', error);
      throw error;
    }
  }

  // Eliminar conexión
  async removeConnection(connectionId: string): Promise<any> {
    try {
      console.log('Eliminando conexión:', connectionId);
      
      const response = await fetch(`${API_BASE}/${connectionId}`, {
        method: 'DELETE',
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en removeConnection:', error);
      throw error;
    }
  }

  // Conectar a base de datos
  async connectToDatabase(connectionId: string): Promise<any> {
    try {
      console.log('Conectando a base de datos:', connectionId);
      
      const response = await fetch(`${API_BASE}/${connectionId}/connect`, {
        method: 'POST',
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en connectToDatabase:', error);
      throw error;
    }
  }

  // Desconectar de base de datos
  async disconnectFromDatabase(connectionId: string): Promise<any> {
    try {
      console.log('Desconectando de base de datos:', connectionId);
      
      const response = await fetch(`${API_BASE}/${connectionId}/disconnect`, {
        method: 'POST',
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en disconnectFromDatabase:', error);
      throw error;
    }
  }

  // Ejecutar consulta
  async executeQuery(connectionId: string, query: string, parameters?: any): Promise<QueryResult> {
    try {
      console.log('Ejecutando query:', { connectionId, query, parameters });
      
      const response = await fetch(`${API_BASE}/${connectionId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, parameters }),
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en executeQuery:', error);
      throw error;
    }
  }

  // Obtener esquemas
  async getSchemas(connectionId: string): Promise<any> {
    try {
      console.log('Obteniendo esquemas para:', connectionId);
      
      const response = await fetch(`${API_BASE}/${connectionId}/schemas`);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getSchemas:', error);
      throw error;
    }
  }

  // Obtener tablas
  async getTables(connectionId: string, schemaName: string): Promise<any> {
    try {
      console.log('Obteniendo tablas:', { connectionId, schemaName });
      
      const response = await fetch(`${API_BASE}/${connectionId}/schemas/${schemaName}/tables`);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getTables:', error);
      throw error;
    }
  }

  // Obtener columnas de tabla
  async getTableColumns(connectionId: string, tableName: string, schemaName: string = 'dbo'): Promise<any> {
    try {
      console.log('Obteniendo columnas de tabla:', { connectionId, tableName, schemaName });
      
      const response = await fetch(`${API_BASE}/${connectionId}/tables/${tableName}/columns?schemaName=${encodeURIComponent(schemaName)}`);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getTableColumns:', error);
      throw error;
    }
  }

  // Verificar salud de conexiones
  async checkConnectionsHealth(): Promise<any> {
    try {
      console.log('Verificando salud de conexiones');
      
      const response = await fetch(`${API_BASE}/health-check`, {
        method: 'POST',
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en checkConnectionsHealth:', error);
      throw error;
    }
  }

  // Cerrar todas las conexiones
  async closeAllConnections(): Promise<any> {
    try {
      console.log('Cerrando todas las conexiones');
      
      const response = await fetch(`${API_BASE}/close-all`, {
        method: 'POST',
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en closeAllConnections:', error);
      throw error;
    }
  }

  // Verificar salud del servidor
  async checkServerHealth(): Promise<any> {
    try {
      console.log('Verificando salud del servidor');
      
      const response = await fetch('http://localhost:3001/api/health');
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en checkServerHealth:', error);
      throw error;
    }
  }
}

export default new ApiService(); 