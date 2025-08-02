
const sql = require('mssql');
const fs = require('fs').promises;
const path = require('path');

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

class databaseManager {
    private connections: connectionPool = {};
    private connectionsfile: string;

    constructor() {
        this.connectionsfile = path.join(__dirname, '../data/connections.json');
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
                    this.connections[conn.id] = {
                        pool: null,
                        config: { ...conn, isActive: false },
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

            const connectionsToSave = Object.values(this.connections).map(conn => ({
                ...conn.config,
                lastUsed: conn.lastUsed,
                password: '***'
            }));
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
            const sqlConfig = {
                server: config.server,
                database: config.database,
                user: config.username,
                password: config.password,
                port: config.port || 1433,
                options: {
                    encrypt: config.options?.encrypt ?? true,
                    trustServerCertificate: config.options?.trustServerCertificate ?? true,
                    enableArithAbort: config.options?.enableArithAbort ?? true,
                },
                connectionTimeout: config.options?.connectionTimeout || 30000,
                requestTimeout: config.options?.requestTimeout || 30000,
            };
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

}
