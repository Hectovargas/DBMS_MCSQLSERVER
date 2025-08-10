const API_BASE = 'http://localhost:3001/api/database';

export interface ConnectionConfig {
  name: string;
  host: string;
  database: string;
  username?: string;
  password?: string;
  port: number;
}

export interface DatabaseConnection {
  id: string;
  name: string;
  host: string;
  database: string;
  username?: string;
  port?: number;
  isActive?: boolean;
  lastConnected?: Date;
  version?: string;
  dialect?: number;
}

export interface Schema {
  schema_name: string;
  table_name: string;
}

export interface Table {
  table_name: string;
  schema_name: string;
  description?: string;
}

export interface View { view_name: string; schema_name: string; description?: string }
export interface Package { package_name: string; schema_name: string; description?: string }
export interface Procedure { procedure_name: string; schema_name: string; description?: string }
export interface DbFunction { function_name: string; schema_name: string; description?: string }
export interface Sequence { sequence_name: string; description?: string }
export interface Trigger { trigger_name: string; relation_name?: string; schema_name: string; description?: string }
export interface Index { index_name: string; relation_name?: string; schema_name: string; is_unique?: number; is_inactive?: number }
export interface DbUser { user_name: string; active?: number; plugin?: string; first_name?: string; last_name?: string }

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
  async getTables(connectionId: string, schemaName: string = ''): Promise<any> {
    try {
      console.log('Obteniendo tablas:', { connectionId, schemaName });
      
      let url = `${API_BASE}/${connectionId}/schemas`;
      if (schemaName && schemaName !== 'DEFAULT') {
        url += `/${schemaName}/tables`;
      } else {
        url += '/tables';
      }
      
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getTables:', error);
      throw error;
    }
  }

  // Obtener vistas
  async getViews(connectionId: string, schemaName: string = ''): Promise<any> {
    try {
      let url = `${API_BASE}/${connectionId}/schemas`;
      url += schemaName && schemaName !== 'DEFAULT' ? `/${schemaName}/views` : `/views`;
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getViews:', error);
      throw error;
    }
  }

  // Obtener paquetes
  async getPackages(connectionId: string, schemaName: string = ''): Promise<any> {
    try {
      let url = `${API_BASE}/${connectionId}/schemas`;
      url += schemaName && schemaName !== 'DEFAULT' ? `/${schemaName}/packages` : `/packages`;
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getPackages:', error);
      throw error;
    }
  }

  // Obtener procedimientos
  async getProcedures(connectionId: string, schemaName: string = ''): Promise<any> {
    try {
      let url = `${API_BASE}/${connectionId}/schemas`;
      url += schemaName && schemaName !== 'DEFAULT' ? `/${schemaName}/procedures` : `/procedures`;
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getProcedures:', error);
      throw error;
    }
  }

  // Obtener funciones
  async getFunctions(connectionId: string, schemaName: string = ''): Promise<any> {
    try {
      let url = `${API_BASE}/${connectionId}/schemas`;
      url += schemaName && schemaName !== 'DEFAULT' ? `/${schemaName}/functions` : `/functions`;
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getFunctions:', error);
      throw error;
    }
  }

  // Obtener secuencias
  async getSequences(connectionId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/${connectionId}/sequences`);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getSequences:', error);
      throw error;
    }
  }

  // Obtener triggers
  async getTriggers(connectionId: string, schemaName: string = ''): Promise<any> {
    try {
      let url = `${API_BASE}/${connectionId}/schemas`;
      url += schemaName && schemaName !== 'DEFAULT' ? `/${schemaName}/triggers` : `/triggers`;
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getTriggers:', error);
      throw error;
    }
  }

  // Obtener índices
  async getIndexes(connectionId: string, schemaName: string = ''): Promise<any> {
    try {
      let url = `${API_BASE}/${connectionId}/schemas`;
      url += schemaName && schemaName !== 'DEFAULT' ? `/${schemaName}/indexes` : `/indexes`;
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getIndexes:', error);
      throw error;
    }
  }

  // Obtener usuarios
  async getUsers(connectionId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/${connectionId}/users`);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getUsers:', error);
      throw error;
    }
  }

  // Obtener tablespaces (no aplica, pero endpoint informativo)
  async getTablespaces(connectionId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/${connectionId}/tablespaces`);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getTablespaces:', error);
      throw error;
    }
  }

  // Obtener columnas de tabla
  async getTableColumns(connectionId: string, tableName: string, schemaName: string = ''): Promise<any> {
    try {
      console.log('Obteniendo columnas de tabla:', { connectionId, tableName, schemaName });
      
      // Si el esquema es DEFAULT, no lo incluimos en la URL
      const schemaParam = schemaName && schemaName !== 'DEFAULT' ? schemaName : '';
      const url = `${API_BASE}/${connectionId}/tables/${tableName}/columns?schemaName=${encodeURIComponent(schemaParam)}`;
      console.log('API URL:', url);
      
      const response = await fetch(url);
      const result = await this.handleResponse(response);
      console.log('API result:', result);
      return result;
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