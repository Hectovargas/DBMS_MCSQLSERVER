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


export interface Table {
  table_name: string;
  description?: string;
}

export interface View { view_name: string; description?: string }
export interface Package { package_name: string;  description?: string }
export interface Procedure { procedure_name: string;  description?: string }
export interface DbFunction { function_name: string;  description?: string }
export interface Sequence { sequence_name: string; description?: string }
export interface Trigger { trigger_name: string; relation_name?: string; description?: string }
export interface Index { index_name: string; relation_name?: string; is_inactive?: number }
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

  private async handleResponse(response: Response): Promise<any> {
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de respuesta del servidor:', response.status, errorText);
      throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
    }
    
    try {
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error al parsear respuesta JSON:', error);
      throw new Error('Error al procesar respuesta del servidor');
    }
  }


  async testConnection(config: ConnectionConfig): Promise<any> {
    try {
      
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


  async addConnection(config: ConnectionConfig): Promise<any> {
    try {      
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

  async getAllConnections(): Promise<any> {
    try {
      
      const response = await fetch(`${API_BASE}/all`);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getAllConnections:', error);
      throw error;
    }
  }

  async getActiveConnections(): Promise<any> {
    try {
      
      const response = await fetch(`${API_BASE}/active`);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getActiveConnections:', error);
      throw error;
    }
  }

  async removeConnection(connectionId: string): Promise<any> {
    try {
      
      const response = await fetch(`${API_BASE}/${connectionId}`, {
        method: 'DELETE',
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en removeConnection:', error);
      throw error;
    }
  }

  async connectToDatabase(connectionId: string): Promise<any> {
    try {
      
      const response = await fetch(`${API_BASE}/${connectionId}/connect`, {
        method: 'POST',
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en connectToDatabase:', error);
      throw error;
    }
  }

  async disconnectFromDatabase(connectionId: string): Promise<any> {
    try {
      
      const response = await fetch(`${API_BASE}/${connectionId}/disconnect`, {
        method: 'POST',
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en disconnectFromDatabase:', error);
      throw error;
    }
  }

  async executeQuery(connectionId: string, query: string, parameters?: any): Promise<QueryResult> {
    try {
      
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


  async getTables(connectionId: string): Promise<any> {
    try {
      
      let url = `${API_BASE}/${connectionId}/tables`;
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      throw error;
    }
  }

  async getViews(connectionId: string): Promise<any> {
    try {
      let url = `${API_BASE}/${connectionId}/views`;
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getViews:', error);
      throw error;
    }
  }

  async getPackages(connectionId: string): Promise<any> {
    try {
      let url = `${API_BASE}/${connectionId}/packages`;
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getPackages:', error);
      throw error;
    }
  }

  async getProcedures(connectionId: string): Promise<any> {
    try {
      let url = `${API_BASE}/${connectionId}/procedures`;
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getProcedures:', error);
      throw error;
    }
  }

  async getFunctions(connectionId: string): Promise<any> {
    try {
      let url = `${API_BASE}/${connectionId}/functions`;
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getFunctions:', error);
      throw error;
    }
  }

  async getSequences(connectionId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/${connectionId}/sequences`);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getSequences:', error);
      throw error;
    }
  }


  async getTriggers(connectionId: string): Promise<any> {
    try {
      let url = `${API_BASE}/${connectionId}/triggers`;
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getTriggers:', error);
      throw error;
    }
  }

  async getIndexes(connectionId: string): Promise<any> {
    try {
      let url = `${API_BASE}/${connectionId}/indexes`;
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getIndexes:', error);
      throw error;
    }
  }

  async getUsers(connectionId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/${connectionId}/users`);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getUsers:', error);
      throw error;
    }
  }

  async getTablespaces(connectionId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/${connectionId}/tablespaces`);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getTablespaces:', error);
      throw error;
    }
  }

  async getTableColumns(connectionId: string, tableName: string): Promise<any> {
    try {
      
      const url = `${API_BASE}/${connectionId}/tables/${tableName}/columns?`;
     
      
      const response = await fetch(url);
      const result = await this.handleResponse(response);
      return result;
    } catch (error) {
      console.error('Error en getTableColumns:', error);
      throw error;
    }
  }

  async checkConnectionsHealth(): Promise<any> {
    try {
      
      const response = await fetch(`${API_BASE}/health-check`, {
        method: 'POST',
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en checkConnectionsHealth:', error);
      throw error;
    }
  }

  async closeAllConnections(): Promise<any> {
    try {

      
      const response = await fetch(`${API_BASE}/close-all`, {
        method: 'POST',
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en closeAllConnections:', error);
      throw error;
    }
  }


  async checkServerHealth(): Promise<any> {
    try {
      
      const response = await fetch('http://localhost:3001/api/health');
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en checkServerHealth:', error);
      throw error;
    }
  }


  async generateTableDDL(connectionId: string, tableName: string): Promise<any> {
    try {
      
      const url = `${API_BASE}/${connectionId}/tables/${tableName}/ddl?`;
      
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en generateTableDDL:', error);
      throw error;
    }
  }

  async generateFunctionDDL(connectionId: string, functionName: string): Promise<any> {
    try {
      
      const url = `${API_BASE}/${connectionId}/functions/${functionName}/ddl?`;
      
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en generateFunctionDDL:', error);
      throw error;
    }
  }

  async generateTriggerDDL(connectionId: string, triggerName: string): Promise<any> {
    try {

      const url = `${API_BASE}/${connectionId}/triggers/${triggerName}/ddl?`;
      
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en generateTriggerDDL:', error);
      throw error;
    }
  }

  async generateProcedureDDL(connectionId: string, procedureName: string): Promise<any> {
    try {


      const url = `${API_BASE}/${connectionId}/procedures/${procedureName}/ddl?`;
      
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en generateProcedureDDL:', error);
      throw error;
    }
  }

  async generateViewDDL(connectionId: string, viewName: string): Promise<any> {
    try {
      

      const url = `${API_BASE}/${connectionId}/views/${viewName}/ddl?`;
      
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en generateViewDDL:', error);
      throw error;
    }
  }

  async generateIndexDDL(connectionId: string, indexName: string): Promise<any> {
    try {
      

      const url = `${API_BASE}/${connectionId}/indexes/${indexName}/ddl?`;
      
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en generateIndexDDL:', error);
      throw error;
    }
  }

  async generateSequenceDDL(connectionId: string, sequenceName: string): Promise<any> {
    try {
      const url = `${API_BASE}/${connectionId}/sequences/${sequenceName}/ddl`;
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en generateSequenceDDL:', error);
      throw error;
    }
  }

  async generateUserDDL(connectionId: string, userName: string): Promise<any> {
    try {
      
      const url = `${API_BASE}/${connectionId}/users/${userName}/ddl`;
      
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en generateUserDDL:', error);
      throw error;
    }
  }

  async generatePackageDDL(connectionId: string, packageName: string): Promise<any> {
    try {
      console.log(`🔍 [FRONTEND] Generando DDL para paquete: ${packageName} en conexión: ${connectionId}`);
      
      // Codificar el nombre del paquete para la URL
      const encodedPackageName = encodeURIComponent(packageName);
      const url = `${API_BASE}/${connectionId}/packages/${encodedPackageName}/ddl`;
      
      console.log(`📡 [FRONTEND] URL de la petición: ${url}`);
      console.log(`📡 [FRONTEND] Nombre original: "${packageName}"`);
      console.log(`📡 [FRONTEND] Nombre codificado: "${encodedPackageName}"`);
      
      const response = await fetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en generatePackageDDL:', error);
      throw error;
    }
  }


  async createTable(connectionId: string, tableData: {
    tableName: string;
    columns: Array<{
      name: string;
      type: string;
      length?: number;
      nullable: boolean;
      defaultValue?: string;
      primaryKey: boolean;
      unique: boolean;
    }>;
  }): Promise<any> {
    try {

      const response = await fetch(`${API_BASE}/${connectionId}/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tableData),
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en createTable:', error);
      throw error;
    }
  }


  async createView(connectionId: string, viewData: {
    viewName: string;
    selectStatement: string;
    withCheckOption?: boolean;
  }): Promise<any> {
    try {
      
      const response = await fetch(`${API_BASE}/${connectionId}/views`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(viewData),
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en createView:', error);
      throw error;
    }
  }
}

export default new ApiService(); 