export interface SqlServerConnection {
    id: string;
    name: string;
    server: string;
    database: string;
    username?: string;               
    password?: string;               
    port?: number;                   
    options?: any;                   
    isActive?: boolean;
    lastConnected?: Date;
    version?: string;                
    edition?: string;                
  }
  
  // Esquema de base de datos
  export interface SqlServerSchema {
    name: string;
    tables: SqlServerTable[];
    views: SqlServerView[];
    procedures: SqlServerProcedure[];
    functions: SqlServerFunction[];
    schemas: string[];               
    userDefinedTypes?: string[];     
  }
  
  // Información detallada de tablas
  export interface SqlServerTable {
    name: string;
    schema: string;                 
    columns: SqlServerColumn[];
    rowCount?: number;
    sizeKB?: number;                 
    hasIdentity?: boolean;           
    hasPrimaryKey?: boolean;
    indexes?: SqlServerIndex[];
  }
  
  // Información de columnas
  export interface SqlServerColumn {
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
  
  // Información de índices
  export interface SqlServerIndex {
    name: string;
    type: 'CLUSTERED' | 'NONCLUSTERED' | 'UNIQUE';
    columns: string[];
    isUnique: boolean;
    isPrimaryKey: boolean;
  }
  
  // Vistas
  export interface SqlServerView {
    name: string;
    schema: string;
    definition?: string;             
    columns: SqlServerColumn[];
  }
  
  // Procedimientos almacenados
  export interface SqlServerProcedure {
    name: string;
    schema: string;
    parameters?: SqlServerParameter[];
    definition?: string;             
    lastModified?: Date;
  }
  
  // Funciones
  export interface SqlServerFunction {
    name: string;
    schema: string;
    type: 'SCALAR' | 'TABLE' | 'INLINE_TABLE';
    parameters?: SqlServerParameter[];
    returnType?: string;
    definition?: string;
  }
  
  // Parámetros de procedimientos/funciones
  export interface SqlServerParameter {
    name: string;
    dataType: string;
    direction: 'IN' | 'OUT' | 'INOUT';
    defaultValue?: string;
    maxLength?: number;
  }
  
  // Respuestas de conexión (mejoradas)
  export interface SqlServerConnectionResponse {
    success: boolean;
    message: string;
    connectionId?: string;
    serverInfo?: {
      version: string;
      edition: string;
      productLevel: string;         
      instanceName?: string;
    };
    error?: {
      code?: number;                 
      message: string;
      severity?: number;
      state?: number;
    };
  }
  
  // Lista de bases de datos
  export interface SqlServerDatabaseListResponse {
    success: boolean;
    databases: SqlServerConnection[];
    serverInfo?: {
      version: string;
      edition: string;
      instanceName?: string;
    };
    error?: string;
  }
  
  // Para ejecutar consultas
  export interface SqlServerQueryRequest {
    connectionId: string;
    query: string;
    parameters?: { [key: string]: any };
    timeout?: number;
  }
  
  export interface SqlServerQueryResponse {
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
  
  // Para información del servidor
  export interface SqlServerInfo {
    version: string;
    edition: string;
    productLevel: string;
    instanceName?: string;
    serverName: string;
    isClusteredInstance?: boolean;
    collation: string;
    maxConnections?: number;
    availableDatabases: string[];
  }