import console = require("node:console");

const Firebird = require('node-firebird');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuid } = require('uuid');


interface FirebirdConnection {
    id?: string;
    name: string;
    host: string;
    database: string;
    username?: string;
    password?: string;
    port?: number;
    options?: {
        lowercase_keys?: boolean;
        role?: string;
        pageSize?: number;
        retryConnectionInterval?: number;
        blobAsText?: boolean;
        encoding?: string;
    };
    isActive?: boolean;
    lastConnected?: Date;
    version?: string;
    dialect?: number;
}

interface FirebirdConnectionResponse {
    success: boolean;
    message: string;
    connectionId?: string;
    serverInfo?: {
        version: string;
        dialect: number;
        odsVersion: string;
        engineVersion: string;
    };
    error?: {
        code?: number;
        message: string;
        severity?: number;
        state?: number;
    };
}

interface ConnectionPool {
    [connectionId: string]: {
        pool: any;
        config: FirebirdConnection;
        lastUsed: Date;
        isConnected: boolean;
    }
}

class DatabaseManager {
    protected connections: ConnectionPool = {};
    private connectionsFilePath: string;

    constructor() {
        this.connectionsFilePath = path.join(__dirname, '../data/connections.json');
        this.loadConnections();
    }


    private async loadConnections(): Promise<void> {
        try {
            await this.ensureDataDirectory();
            const data = await fs.readFile(this.connectionsFilePath, 'utf8');
            const savedConnections = JSON.parse(data);

            for (const connection of savedConnections) {
                if (connection.id) {
                    const plainPassword = typeof connection.password === 'string' ? connection.password : '';
                    this.connections[connection.id] = {
                        pool: null,
                        config: {
                            ...connection,
                            password: plainPassword,
                            isActive: false
                        },
                        lastUsed: new Date(connection.lastUsed || connection.lastConnected),
                        isConnected: false
                    };
                }
            }
        } catch (error) {
            console.log('No hay conexiones guardadas.');
        }
    }

    protected async saveConnections(): Promise<void> {
        try {
            await this.ensureDataDirectory();
            const connectionsToSave = Object.values(this.connections).map(connection => ({
                ...connection.config,
                lastUsed: connection.lastUsed
            }));
            await fs.writeFile(this.connectionsFilePath, JSON.stringify(connectionsToSave, null, 2));
        } catch (error) {
            console.error("Error al guardar conexiones:", error);
        }
    }

    private async ensureDataDirectory(): Promise<void> {
        const dataDir = path.dirname(this.connectionsFilePath);
        try {
            await fs.access(dataDir);
        } catch (error) {
            await fs.mkdir(dataDir, { recursive: true });
        }
    }

    protected createFirebirdConfig(config: FirebirdConnection): any {
        return {
            host: config.host,
            database: '/firebird/data/' + config.database,
            port: config.port || 3050,
            user: config.username || 'SYSDBA',
            password: config.password || 'masterkey',
            lowercase_keys: config.options?.lowercase_keys ?? false,
            role: config.options?.role,
            pageSize: config.options?.pageSize || 4096,
            retryConnectionInterval: config.options?.retryConnectionInterval || 1000,
            blobAsText: config.options?.blobAsText ?? false,
            encoding: config.options?.encoding || 'UTF-8',
            WireCrypt: 'Disabled',
            wireCompression: false,
            legacy_auth: true,
            auth_plugin: 'Legacy_Auth'
        };
    }


    private generateConnectionId(): string {
        return `connection_${uuid()}`;
    }

    
    async testConnection(config: FirebirdConnection): Promise<FirebirdConnectionResponse> {
        try {
            const connectionConfig = this.createFirebirdConfig(config);
    
            return new Promise((resolve) => {
                Firebird.attach(connectionConfig, (err: any, db: any) => {
                    if (err) {
                        resolve({
                            success: false,
                            message: 'Error de conexiOn',
                            error: { code: err.code, message: err.message }
                        });
                        return;
                    }
    
                    db.query('SELECT 1 as test FROM RDB$DATABASE', (err: any, result: any) => {
                        if (err) {
                            db.detach();
                            resolve({
                                success: false,
                                message: 'Error en el testeo',
                                error: { message: err.message }
                            });
                            return;
                        }
    
                        try {
                            db.detach();
                        } catch (detachError) {
                            console.error('Error al cerrar conexiOn:', detachError);
                        }
    
                        resolve({
                            success: true,
                            message: 'ConexiOn exitosa'
                        });
                    });
                });
            });
    
        } catch (error: any) {
            return {
                success: false,
                message: 'Error de conexiOn',
                error: {
                    code: error.code,
                    message: error.message
                }
            };
        }
    }

    
    async addConnection(config: FirebirdConnection): Promise<FirebirdConnectionResponse> {
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
                message: 'Conexión añadida exitosamente',
                connectionId,
                ...(test.serverInfo && { serverInfo: test.serverInfo })
            };

        } catch (error: any) {
            return {
                success: false,
                message: 'Error al agregar conexiOn',
                error: { message: error.message }
            };
        }
    }

    
    async connectToDatabase(connectionId: string): Promise<FirebirdConnectionResponse> {
        try {
            if (!this.connections[connectionId]) {
                return {
                    success: false,
                    message: 'Conexión no encontrada'
                };
            }

            const connection = this.connections[connectionId];

            if (connection.isConnected && connection.pool) {
                return {
                    success: true,
                    message: 'Ya está conectado a esta base de datos'
                };
            }

            const config = connection.config;
            const firebirdConfig = this.createFirebirdConfig(config);
            const pool = Firebird.pool(5, firebirdConfig);

            return new Promise((resolve) => {
                pool.get((err: any, db: any) => {
                    if (err) {
                        pool.destroy();
                        resolve({
                            success: false,
                            message: 'Error al conectar',
                            error: { code: err.code, message: err.message }
                        });
                        return;
                    }

                    db.query('SELECT 1 as test FROM RDB$DATABASE', (err: any, result: any) => {
                        if (err) {
                            db.detach();
                            pool.destroy();
                            resolve({
                                success: false,
                                message: 'Error al obtener información del servidor',
                                error: { message: err.message }
                            });
                            return;
                        }

                        db.detach();

                        connection.pool = pool;
                        connection.isConnected = true;
                        connection.lastUsed = new Date();
                        connection.config.isActive = true;
                        connection.config.lastConnected = new Date();

                        this.saveConnections();

                        resolve({
                            success: true,
                            message: 'Conectado exitosamente',
                            connectionId
                        });
                    });
                });
            });

        } catch (error: any) {
            return {
                success: false,
                message: 'Error al conectar',
                error: { code: error.code, message: error.message }
            };
        }
    }

    
    async disconnectFromDatabase(connectionId: string): Promise<FirebirdConnectionResponse> {
        try {
            if (!this.connections[connectionId]) {
                return {
                    success: false,
                    message: 'Conexión no encontrada'
                }
            }

            const connection = this.connections[connectionId];

            if (connection.pool && connection.isConnected) {
                connection.pool.destroy();
            }

            connection.pool = null;
            connection.isConnected = false;
            connection.config.isActive = false;

            await this.saveConnections();

            return {
                success: true,
                message: 'Desconectado de la base de datos'
            };
        } catch (error: any) {
            return {
                success: false,
                message: 'Error al desconectar',
                error: { message: error.message }
            };
        }
    }

    
    async removeConnection(connectionId: string): Promise<FirebirdConnectionResponse> {
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
                error: { message: error.message }
            };
        }
    }

    
    getAllConnections(): FirebirdConnection[] {
        return Object.values(this.connections).map(conn => ({
            ...conn.config,
            password: conn.config.password ? '***' : undefined,
            lastConnected: conn.lastUsed
        })) as FirebirdConnection[];
    }

    
    getActiveConnections(): FirebirdConnection[] {
        return Object.values(this.connections)
            .filter(conn => conn.isConnected)
            .map(conn => ({
                ...conn.config,
                password: conn.config.password ? '***' : undefined,
                lastConnected: conn.lastUsed
            })) as FirebirdConnection[];
    }

    
    async executeQuery(connectionId: string, query: string, parameters?: any): Promise<any> {
        try {
            if (!this.connections[connectionId]) {
                throw new Error('Conexión no encontrada');
            }

            const connection = this.connections[connectionId];

            if (!connection.isConnected || !connection.pool) {
                return {
                    success: false,
                    error: 'La conexion no esta activa. Por favor, conectate primero.',
                    message: 'Conexion no activa'
                };
            }

            connection.lastUsed = new Date();

            return new Promise((resolve) => {
                connection.pool.get((err: any, db: any) => {
                    if (err) {
                        resolve({
                            success: false,
                            error: err.message
                        });
                        return;
                    }

                    db.query('SET BLOB_DISPLAY_DEFAULT = TEXT', (err: any) => {});
                    const startTime = Date.now();

                    db.query(query, parameters || [], (err: any, result: any) => {
                        const executionTime = Date.now() - startTime;

                        if (err) {
                            db.detach();
                            resolve({
                                success: false,
                                error: err.message
                            });
                            return;
                        }

                        let columns: { name: string; type: string }[] = [];
                        if (result && result.length > 0) {
                            columns = Object.keys(result[0]).map(key => ({ 
                                name: key, 
                                type: typeof result[0][key] 
                            }));
                        }

                        db.detach();

                        connection.isConnected = true;
                        connection.config.isActive = true;
                        connection.lastUsed = new Date();

                        resolve({
                            success: true,
                            data: result,
                            rowsAffected: result ? result.length : 0,
                            executionTime,
                            columns: columns
                        });
                    });
                });
            });

        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }


    async checkConnectionHealth(connectionId: string): Promise<boolean> {
        try {
            if (!this.connections[connectionId]) {
                return false;
            }

            const connection = this.connections[connectionId];
            
            if (!connection.isConnected || !connection.pool) {
                return false;
            }

            const result = await this.executeQuery(connectionId, 'SELECT 1 as test FROM RDB$DATABASE');
            return result.success;
        } catch (error) {
            return false;
        }
    }


    async closeAllConnections(): Promise<void> {
        const connectionIds = Object.keys(this.connections);
        for (const connectionId of connectionIds) {
            await this.disconnectFromDatabase(connectionId);
        }
    }

  
}

module.exports = DatabaseManager;
