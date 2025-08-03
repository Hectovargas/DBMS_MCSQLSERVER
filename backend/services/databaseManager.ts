const sql = require('mssql');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { v4: uuid } = require('uuid');

type SqlServerConnection = {
    id?: string;
    name: string;
    server: string;
    database: string;
    username?: string;
    password?: string;
    port?: number;
    options?: {
        encrypt?: boolean;
        trustServerCertificate?: boolean;
        enableArithAbort?: boolean;
        connectionTimeout?: number;
        requestTimeout?: number;
    };
    isActive?: boolean;
    lastConnected?: Date;
    version?: string;
    edition?: string;
}

type SqlServerConnectionResponse = {
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

interface connectionPool {
    [connectionId: string]: {
        pool: any;
        config: SqlServerConnection;
        lastUsed: Date;
        isConnected: boolean;
    }
}

class PasswordManager {
    private static readonly ALGORITHM = 'aes-256-cbc';
    private static readonly KEY_LENGTH = 32;
    private static readonly IV_LENGTH = 16;
    private static readonly TAG_LENGTH = 16;
    private masterKey!: Buffer;
    private keyFile: string;

    constructor() {
        this.keyFile = path.join(__dirname, '../data/.master.key');
        this.initializeMasterKey();
    }

    private async initializeMasterKey(): Promise<void> {
        try {
            const keyData = await fs.readFile(this.keyFile);
            this.masterKey = keyData;
        } catch (error) {

            this.masterKey = crypto.randomBytes(PasswordManager.KEY_LENGTH);
            await this.ensureDataDirectory();
            await fs.writeFile(this.keyFile, this.masterKey);
            
            if (process.platform !== 'win32') {
                await fs.chmod(this.keyFile, 0o600);
            }
            
            console.log('Nueva clave maestra generada y guardada');
        }
    }

    private async ensureDataDirectory(): Promise<void> {
        const dataDir = path.dirname(this.keyFile);
        try {
            await fs.access(dataDir);
        } catch (error) {
            await fs.mkdir(dataDir, { recursive: true });
        }
    }

    encryptPassword(password: string): string {
        if (!password) return '';
        
        const iv = crypto.randomBytes(PasswordManager.IV_LENGTH);
        const cipher = crypto.createCipheriv(PasswordManager.ALGORITHM, this.masterKey, iv);
        
        let encrypted = cipher.update(password, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return iv.toString('hex') + ':' + encrypted;
    }

    decryptPassword(encryptedPassword: string): string {
        if (!encryptedPassword || encryptedPassword === '***') return '';
        
        try {
            const parts = encryptedPassword.split(':');
            if (parts.length !== 2) {
                throw new Error('Formato de contraseña cifrada inválido');
            }
            
            const iv = Buffer.from(parts[0] || '', 'hex');
            const encrypted = parts[1];
            
            const decipher = crypto.createDecipheriv(PasswordManager.ALGORITHM, this.masterKey, iv);
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('Error al descifrar contraseña:', error);
            return ''; 
        }
    }

    async rotateMasterKey(): Promise<void> {
        const oldKey = this.masterKey;
        this.masterKey = crypto.randomBytes(PasswordManager.KEY_LENGTH);
        
        await fs.writeFile(this.keyFile, this.masterKey);
        
        if (process.platform !== 'win32') {
            await fs.chmod(this.keyFile, 0o600);
        }
        
        console.log('Clave maestra rotada exitosamente');
    }
}

class databaseManager {
    private connections: connectionPool = {};
    private connectionsfile: string;
    private passwordManager: PasswordManager;

    constructor() {
        this.connectionsfile = path.join(__dirname, '../data/connections.json');
        this.passwordManager = new PasswordManager();
        this.loadConnections();
    }

    private async loadConnections(): Promise<void> {
        try {
            await this.ensureDataDirectory();
            const data = await fs.readFile(this.connectionsfile, 'utf8');
            const savedConnections = JSON.parse(data);

            console.log(`Cargadas ${savedConnections.length} conexiones guardadas`);

            for (const conn of savedConnections) {
                if (conn.id) {
                    const decryptedPassword = conn.password && conn.password !== '***' 
                        ? this.passwordManager.decryptPassword(conn.password)
                        : '';
                    
                    this.connections[conn.id] = {
                        pool: null,
                        config: { 
                            ...conn, 
                            password: decryptedPassword,
                            isActive: false 
                        },
                        lastUsed: new Date(conn.lastUsed || conn.lastConnected),
                        isConnected: false
                    };
                }
            }
        } catch (error) {
            console.log('No se encontraron conexiones guardadas, comenzando con lista vacía');
        }
    }

    private async saveConnections(): Promise<void> {
        try {
            await this.ensureDataDirectory();

            const connectionsToSave = Object.values(this.connections).map(conn => {
                const configToSave = { ...conn.config };
                
                if (configToSave.password) {
                    configToSave.password = this.passwordManager.encryptPassword(configToSave.password);
                }
                
                return {
                    ...configToSave,
                    lastUsed: conn.lastUsed
                };
            });
            
            await fs.writeFile(this.connectionsfile, JSON.stringify(connectionsToSave, null, 2));
        } catch (error) {
            console.error("Error al guardar las conexiones: ", error);
        }
    }

    private async ensureDataDirectory(): Promise<void> {
        const dataDir = path.dirname(this.connectionsfile);
        try {
            await fs.access(dataDir);
        } catch (error) {
            await fs.mkdir(dataDir, { recursive: true });
        }
    }

    async testConnection(config: SqlServerConnection): Promise<SqlServerConnectionResponse> {
        try {
            const sqlConfig: any = {
                server: config.server,
                database: config.database,
                port: config.port || 1433,
                options: {
                    encrypt: config.options?.encrypt ?? true,
                    trustServerCertificate: config.options?.trustServerCertificate ?? true,
                    enableArithAbort: config.options?.enableArithAbort ?? true,
                },
                connectionTimeout: config.options?.connectionTimeout || 30000,
                requestTimeout: config.options?.requestTimeout || 30000,
            };

            // Si se proporcionan credenciales, usarlas; si no, usar autenticación de Windows
            if (config.username && config.password) {
                sqlConfig.user = config.username;
                sqlConfig.password = config.password;
            } else {
                // Autenticación de Windows
                sqlConfig.integratedSecurity = true;
            }
            const pool = await sql.connect(sqlConfig)
            const serverInfo = await this.getServerInfo(pool)
            await pool.close();

            return {
                success: true,
                message: 'conexion exitosa',
                serverInfo
            };

        } catch (error: any) {
            return {
                success: false,
                message: 'Error de conexión',
                error: {
                    code: error.code,
                    message: error.message,
                    severity: error.class,
                    state: error.state
                }
            };
        }
    }

    async addConection(config: SqlServerConnection): Promise<SqlServerConnectionResponse> {
        try {
            const test = await this.testConnection(config);
            if (!test.success) {
                return test;
            }

            const connectionId = this.generateConnectionId();
            const newConfig = {
                ...config,
                id: connectionId,
                isActive: false,
                lastConnected: new Date()
            };

            this.connections[connectionId] = {
                pool: null,
                config: newConfig,
                lastUsed: new Date(),
                isConnected: false
            };

            await this.saveConnections();
            return {
                success: true,
                message: 'Conexión agregada exitosamente',
                connectionId,
                ...(test.serverInfo && { serverInfo: test.serverInfo })
            };

        } catch (error: any) {
            return {
                success: false,
                message: 'Error al agregar conexión',
                error: {
                    message: error.message
                }
            };
        }
    }

    async connectToDatabase(connectionId: string): Promise<SqlServerConnectionResponse> {
        try {
            if (!this.connections[connectionId]) {
                return {
                    success: false,
                    message: 'conexion no encontrada'
                };
            }

            const connection = this.connections[connectionId];

            if (connection.isConnected && connection.pool) {
                return {
                    success: true,
                    message: 'Ya esta conetado a esta base de datos'
                };
            }

            const config = connection.config;

            const sqlConfig: any = {
                server: config.server,
                database: config.database,
                port: config.port || 1433,
                options: {
                    encrypt: config.options?.encrypt ?? true,
                    trustServerCertificate: config.options?.trustServerCertificate ?? true,
                    enableArithAbort: config.options?.enableArithAbort ?? true,
                },
                connectionTimeout: config.options?.connectionTimeout || 30000,
                requestTimeout: config.options?.requestTimeout || 30000,
            };

            // Si se proporcionan credenciales, usarlas; si no, usar autenticación de Windows
            if (config.username && config.password) {
                sqlConfig.user = config.username;
                sqlConfig.password = config.password;
            } else {
                // Autenticación de Windows
                sqlConfig.integratedSecurity = true;
            }

            const pool = await sql.connect(sqlConfig);
            const serverInfo = await this.getServerInfo(pool);

            connection.pool = pool;
            connection.isConnected = true;
            connection.lastUsed = new Date();
            connection.config.isActive = true;
            connection.config.lastConnected = new Date();
            connection.config.version = serverInfo.version;
            connection.config.edition = serverInfo.edition;

            await this.saveConnections();

            return {
                success: true,
                message: 'Conectado exitosamente',
                connectionId,
                serverInfo
            };

        } catch (error: any) {
            return {
                success: false,
                message: 'Error al conectar',
                error: {
                    code: error.code,
                    message: error.message
                }
            };
        }
    }

    async disconnectFromDatabase(connectionId: string): Promise<SqlServerConnectionResponse> {
        try {
            if (!this.connections[connectionId]) {
                return {
                    success: false,
                    message: 'Conexion no encontrada'
                }
            }
    
            const connection = this.connections[connectionId];
    
            if (connection.pool && connection.isConnected) {
                await connection.pool.close();
            }
    
            connection.pool = null;
            connection.isConnected = false;
            connection.config.isActive = false;
    
            await this.saveConnections();
    
            return {
                success: true,
                message: 'Desonectado de la base de datos'
            };
        } catch(error: any) {
            return {
                success: false,
                message: 'Error al desconectar',
                error: {
                    message: error.message
                }
            };
        }
    }

    async removeConnection(connectionId: string): Promise<SqlServerConnectionResponse> {
        try {
            if (this.connections[connectionId]) {
                await this.disconnectFromDatabase(connectionId);
                delete this.connections[connectionId];
                await this.saveConnections();

                return {
                    success: true,
                    message: 'Conexión eliminada exitosamente'
                };
            }

            return {
                success: false,
                message: 'Conexión no encontrada'
            };
        } catch (error: any) {
            return {
                success: false,
                message: 'Error al eliminar conexión',
                error: {
                    message: error.message
                }
            };
        }
    }

    getAllConnections(): SqlServerConnection[] {
        return Object.values(this.connections).map(conn => ({
            ...conn.config,
            password: conn.config.password ? '***' : undefined,
            lastConnected: conn.lastUsed
        })) as SqlServerConnection[];
    }

    getActiveConnections(): SqlServerConnection[] {
        return Object.values(this.connections)
            .filter(conn => conn.isConnected)
            .map(conn => ({
                ...conn.config,
                password: conn.config.password ? '***' : undefined,
                lastConnected: conn.lastUsed
            })) as SqlServerConnection[];
    }

    private async getServerInfo(pool: any) {
        try {
            const result = await pool.request().query(`
                SELECT 
                  SERVERPROPERTY('ProductVersion') as version,
                  SERVERPROPERTY('Edition') as edition,
                  SERVERPROPERTY('ProductLevel') as productLevel,
                  SERVERPROPERTY('InstanceName') as instanceName
              `);

            return result.recordset[0];
        } catch (error) {
            return {
                version: 'Unknown',
                edition: 'Unknown',
                productLevel: 'Unknown',
                instanceName: null
            };
        }
    }

    async executeQuery(connectionId: string, query: string, parametrers?: any): Promise<any> {
        try {
            if (!this.connections[connectionId]) {
                throw new Error('conexion no encontrada');
            }

            const connection = this.connections[connectionId];

            if (!connection.isConnected || !connection.pool) {
                throw new Error('La conexion no esta activa');
            }

            connection.lastUsed = new Date();
            const request = connection.pool.request();

            if (parametrers) {
                Object.keys(parametrers).forEach(key => {
                    request.input(key, parametrers[key]);
                });
            }

            const startTime = Date.now();
            const result = await request.query(query);
            const executionTime = Date.now() - startTime;

            // Extraemos las columnas de los metadatos del recordset
            let columns: { name: string; type: string }[] = [];
            if (result.recordset && result.recordset.length > 0) {
                columns = Object.keys(result.recordset[0]).map(key => ({
                    name: key,
                    type: typeof result.recordset[0][key]
                }));
            }

            return {
                success: true,
                data: result.recordset,
                rowsAffected: result.rowsAffected[0] || 0,
                executionTime,
                columns: columns
            };

        } catch (error: any) {
            return {
                success: false,
                error: {
                    message: error.message,
                    code: error.code,
                    lineNumber: error.lineNumber,
                    procedure: error.procName
                }
            };
        }
    }

    async getSchemas(connectionId: string): Promise<any> {
        const queryto = `
            SELECT 
                s.name as schema_name, 
                s.schema_id, 
                ISNULL(p.name, 'dbo') as principal_name
            FROM sys.schemas s 
            LEFT JOIN sys.database_principals p ON s.principal_id = p.principal_id
            WHERE s.schema_id < 16384  -- Excluir esquemas del sistema por ID
                AND s.name NOT IN ('sys', 'INFORMATION_SCHEMA', 'guest')
            ORDER BY s.name;
        `;
    
        return await this.executeQuery(connectionId, queryto);
    }

    async getTables(connectionId: string, schemaName: String = 'dbo'): Promise<any> {
        const queryto = `SELECT 
        t.name as table_name,
        s.name as schema_name,
        t.create_date,
        t.modify_date,
        p.rows as row_count
        FROM sys.tables t INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
        LEFT JOIN sys.dm_db_partition_stats p ON t.object_id = p.object_id AND p.index_id <= 1
        WHERE s.name = @schemaName
        ORDER BY t.name
        `;
        return await this.executeQuery(connectionId, queryto, { schemaName });
    }

    async getTablesColumns(connectionId: string, tableName: string, schemaName: string = 'dbo'): Promise<any> {
        const queryto = `SELECT c.name as column_name,
         t.name as data_type,
         c.max_lenght,
         c.precision,
         c.scale,
         c.is_nulleable,
         c.is_identity,
         dc.definition as default_value
        FROM sys.columns c
        INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
        INNER JOIN sys.tables tb ON c.object_id = tb.object_id
        INNER JOIN sys.schemas s ON tb.schema_id = s.schema_id
        LEFT JOIN sys.default_constraints dc ON c.default_object_id = dc.object_id
        WHERE tb.name = @tableName AND s.name = @schemaName
        ORDER BY c.column_id
    `;
    return await this.executeQuery(connectionId, queryto, { tableName, schemaName });
    }

    private generateConnectionId(): string {
        return `connection_${uuid()}`;
    }

    async closeAllconection(): Promise<void>{
        const conectionsIDs = Object.keys(this.connections);
        for (const connectionId of conectionsIDs){
            await this.disconnectFromDatabase(connectionId);
        }
    }

    async checkConnectionsHealth(): Promise<void> {
        for (const [id, connection] of Object.entries(this.connections)) {
          if (connection.isConnected && connection.pool) {
            try {
              await connection.pool.request().query('SELECT 1');
              connection.lastUsed = new Date();
            } catch (error) {
              console.log(`Conexión ${id} perdida, marcando como desconectada`);
              connection.isConnected = false;
              connection.config.isActive = false;
              connection.pool = null;
            }
          }
        }
        await this.saveConnections();
    }

    // Métodos adicionales para gestión de seguridad
    async rotateEncryptionKey(): Promise<SqlServerConnectionResponse> {
        try {
            // Guardar todas las contraseñas descifradas temporalmente
            const tempPasswords: { [key: string]: string } = {};
            
            Object.entries(this.connections).forEach(([id, connection]) => {
                if (connection.config.password) {
                    tempPasswords[id] = connection.config.password;
                }
            });

            // Rotar la clave maestra
            await this.passwordManager.rotateMasterKey();

            // Re-cifrar todas las contraseñas con la nueva clave
            Object.entries(this.connections).forEach(([id, connection]) => {
                if (tempPasswords[id]) {
                    connection.config.password = tempPasswords[id];
                }
            });

            // Guardar las conexiones con las contraseñas re-cifradas
            await this.saveConnections();

            return {
                success: true,
                message: 'Clave de cifrado rotada exitosamente'
            };
        } catch (error: any) {
            return {
                success: false,
                message: 'Error al rotar la clave de cifrado',
                error: {
                    message: error.message
                }
            };
        }
    }

    async verifyPasswordIntegrity(): Promise<{ valid: number; invalid: number; details: string[] }> {
        let valid = 0;
        let invalid = 0;
        const details: string[] = [];

        Object.entries(this.connections).forEach(([id, connection]) => {
            if (connection.config.password) {
                try {
   
                    const decrypted = this.passwordManager.decryptPassword(connection.config.password);
                    if (decrypted) {
                        valid++;
                    } else {
                        invalid++;
                        details.push(`Conexión ${connection.config.name} (${id}): contraseña no se pudo descifrar`);
                    }
                } catch (error) {
                    invalid++; 
                    details.push(`Conexión ${connection.config.name} (${id}): error al descifrar - ${error}`);
                }
            }
        });

        return { valid, invalid, details };
    }
}

module.exports = new databaseManager();