const Firebird = require('node-firebird');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuid } = require('uuid');

type FirebirdConnection = { //practicamente un "objeto" con las propiedades de la conexion, luego se guardan en el archivo 
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

type FirebirdConnectionResponse = {// tambien un objeto pero con las prpiedades de la respuesta de la conexion
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

interface connectionPool { //un objeto de la conexion activa a la abse de datos, cada cosa del sidebar es una de estos pools
    [connectionId: string]: {
        pool: any;
        config: FirebirdConnection;
        lastUsed: Date;
        isConnected: boolean;
    }
}

class databaseManager {
    // Arreglo de conexiones guardadas en el archivo
    private conexiones: connectionPool = {};
    // Ruta del archivo donde se guardan las conexiones
    private archivoConexiones: string;

    constructor() {
        this.archivoConexiones = path.join(__dirname, '../data/connections.json');
        this.cargarConexiones();
    }

    private async cargarConexiones(): Promise<void> {
        try {
            await this.asegurarDirectorioDatos();
            const data = await fs.readFile(this.archivoConexiones, 'utf8');
            const conexionesGuardadas = JSON.parse(data);

            for (const conexion of conexionesGuardadas) {
                if (conexion.id) {
                    const passwordPlano = typeof conexion.password === 'string' ? conexion.password : '';
                    this.conexiones[conexion.id] = {
                        pool: null,
                        config: {
                            ...conexion,
                            password: passwordPlano,
                            isActive: false
                        },
                        lastUsed: new Date(conexion.lastUsed || conexion.lastConnected),
                        isConnected: false
                    };
                }
            }
        } catch (error) {
            console.log('No tienes conexiones xdddd.');
        }
    }


    private async guardarConexiones(): Promise<void> {
        try {
            await this.asegurarDirectorioDatos();

            const conexionesParaGuardar = Object.values(this.conexiones).map(conexion => {
                const configParaGuardar = { ...conexion.config };
                return {
                    ...configParaGuardar,
                    lastUsed: conexion.lastUsed
                };
            });

            await fs.writeFile(this.archivoConexiones, JSON.stringify(conexionesParaGuardar, null, 2));
        } catch (error) {
            console.error("Error al guardar las conexiones: ", error);
        }
    }

    private async asegurarDirectorioDatos(): Promise<void> {
        const dataDir = path.dirname(this.archivoConexiones);
        try {
            await fs.access(dataDir);
        } catch (error) {
            await fs.mkdir(dataDir, { recursive: true });
        }
    }

    // Crea la configuración de la conexion 
    private crearConfiguracionFirebird(config: FirebirdConnection): any {
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
            encoding: config.options?.encoding || 'UTF-8'
        };
    }


    async testConnection(config: FirebirdConnection): Promise<FirebirdConnectionResponse> {
        try {
            const connectionConfig = {
                host: config.host,
                database: '/firebird/data/' + config.database,
                port: config.port || 3050,
                user: config.username || 'SYSDBA',
                password: config.password || 'masterkey'
            };

            const result = await this.intentarConexion(connectionConfig);
            return result;

        } catch (error: any) {
            return {
                success: false,
                message: 'Error de conexión',
                error: {
                    code: error.code,
                    message: error.message
                }
            };
        }
    }


    private async intentarConexion(firebirdConfig: any): Promise<FirebirdConnectionResponse> {
        return new Promise((resolve, reject) => {

            Firebird.attach(firebirdConfig, (err: any, db: any) => {
                if (err) {
                    console.error('Error al conectar:', err);
                    reject(err);
                    return;
                }


                db.query('SELECT 1 as test FROM RDB$DATABASE', (err: any, result: any) => {
                    if (err) {
                        db.detach();
                        reject(err);
                        return;
                    }


                    const serverInfo = {
                        version: 'Firebird 3.0',
                        dialect: 3,
                        odsVersion: 'Unknown',
                        engineVersion: 'Firebird 3.0'
                    };

                    try {
                        db.detach();;
                    } catch (detachError) {
                        console.error('Error al cerrar conexion:', detachError);
                    }

                    resolve({
                        success: true,
                        message: 'Conexion exitosa',
                        serverInfo
                    });
                });
            });
        });
    }

    async addConection(config: FirebirdConnection): Promise<FirebirdConnectionResponse> {
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

            this.conexiones[connectionId] = {
                pool: null,
                config: newConfig,
                lastUsed: new Date(),
                isConnected: false
            };

            await this.guardarConexiones();
            return {
                success: true,
                message: 'Conexion agregada exitosamente',
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

    async connectToDatabase(connectionId: string): Promise<FirebirdConnectionResponse> {
        try {

            // en caso de que no exista
            if (!this.conexiones[connectionId]) {
                return {
                    success: false,
                    message: 'conexion no encontrada'
                };
            }

            //se obtiene la referencia a la conexion 
            const connection = this.conexiones[connectionId];

            //si ya esta conectada no se necesita hacer nada mas
            if (connection.isConnected && connection.pool) {
                return {
                    success: true,
                    message: 'Ya esta conetado a esta base de datos'
                };
            }

            //se crea la configuracion de la conexion 
            const config = connection.config;
            const firebirdConfig = this.crearConfiguracionFirebird(config); //se formatea a como el driver espera la conexion

            //se crea el pool para la conexion 
            const pool = Firebird.pool(5, firebirdConfig);

            //se intenta obtener la conexion del pool
            return new Promise((resolve, reject) => {
                pool.get((err: any, db: any) => {
                    if (err) {
                        console.error('Error al obtener conexión del pool:', err);
                        pool.destroy();
                        resolve({
                            success: false,
                            message: 'Error al conectar',
                            error: {
                                code: err.code,
                                message: err.message
                            }
                        });
                        return;
                    }


                    //cuando se acepta el pool se testea 
                    db.query('SELECT 1 as test FROM RDB$DATABASE', (err: any, result: any) => {
                        if (err) {
                            db.detach();
                            pool.destroy();
                            resolve({
                                success: false,
                                message: 'Erro al obtener informacion del servidor',
                                error: {
                                    message: err.message
                                }
                            });
                            return;
                        }


                        db.detach();

                        connection.pool = pool;
                        connection.isConnected = true;
                        connection.lastUsed = new Date();
                        connection.config.isActive = true;
                        connection.config.lastConnected = new Date();

                        this.guardarConexiones();

                        console.log('Conexión configurada exitosamente');

                        resolve({
                            success: true,
                            message: 'Conectado exitosamente',
                            connectionId
                        });
                    });
                });
            });

        } catch (error: any) {
            console.error('Error en connectToDatabase:', error);
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

    async disconnectFromDatabase(connectionId: string): Promise<FirebirdConnectionResponse> {


        try {

            if (!this.conexiones[connectionId]) {
                return {
                    success: false,
                    message: 'Conexion no encontrada'
                }
            }

            const connection = this.conexiones[connectionId];

            if (connection.pool && connection.isConnected) {
                connection.pool.destroy();
            }

            connection.pool = null;
            connection.isConnected = false;
            connection.config.isActive = false;

            await this.guardarConexiones();

            return {
                success: true,
                message: 'Desonectado de la base de datos'
            };
        } catch (error: any) {
            return {
                success: false,
                message: 'Error al desconectar',
                error: {
                    message: error.message
                }
            };
        }
    }

    async removeConnection(connectionId: string): Promise<FirebirdConnectionResponse> {
        try {
            if (this.conexiones[connectionId]) {
                await this.disconnectFromDatabase(connectionId);
                delete this.conexiones[connectionId];
                await this.guardarConexiones();

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
                message: 'Error al eliminar conexion',
                error: {
                    message: error.message
                }
            };
        }
    }

    getAllConnections(): FirebirdConnection[] {
        return Object.values(this.conexiones).map(conn => ({
            ...conn.config,
            password: conn.config.password ? '***' : undefined,
            lastConnected: conn.lastUsed
        })) as FirebirdConnection[];
    }

    getActiveConnections(): FirebirdConnection[] {
        return Object.values(this.conexiones)
            .filter(conn => conn.isConnected)
            .map(conn => ({
                ...conn.config,
                password: conn.config.password ? '***' : undefined,
                lastConnected: conn.lastUsed
            })) as FirebirdConnection[];
    }

    async executeQuery(connectionId: string, query: string, parametrers?: any): Promise<any> {
        try {
            if (!this.conexiones[connectionId]) {
                throw new Error('conexion no encontrada');
            }

            const connection = this.conexiones[connectionId];

            if (!connection.isConnected || !connection.pool) {
                throw new Error('La conexion no esta activa');
            }

            connection.lastUsed = new Date();

            return new Promise((resolve, reject) => {
                connection.pool.get((err: any, db: any) => {
                    if (err) {
                        resolve({
                            success: false,
                            error: err.message
                        });
                        return;
                    }


                    const startTime = Date.now(); //con esto marco el inicio de la consulrta

                    db.query(query, parametrers || [], (err: any, result: any) => {
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

    async getSchemas(connectionId: string): Promise<any> {
        const query = `
          SELECT DISTINCT 
            TRIM(COALESCE(RDB$OWNER_NAME, 'SYSDBA')) as SCHEMA_NAME
          FROM RDB$RELATIONS 
          WHERE RDB$VIEW_BLR IS NULL 
            AND (RDB$SYSTEM_FLAG IS NULL OR RDB$SYSTEM_FLAG = 0)
          ORDER BY RDB$OWNER_NAME
        `;

        const result = await this.executeQuery(connectionId, query);

        if (result.success && this.conexiones[connectionId]) {
            this.conexiones[connectionId].isConnected = true;
            this.conexiones[connectionId].config.isActive = true;
            this.conexiones[connectionId].lastUsed = new Date();
        }

        return result;
    }

    async getTables(connectionId: string, schemaName: string = ''): Promise<any> {
        let query = `
          SELECT 
            TRIM(RDB$RELATION_NAME) as TABLE_NAME,
            TRIM(COALESCE(RDB$OWNER_NAME, 'SYSDBA')) as SCHEMA_NAME,
            RDB$DESCRIPTION as DESCRIPTION
          FROM RDB$RELATIONS 
          WHERE RDB$VIEW_BLR IS NULL 
            AND (RDB$SYSTEM_FLAG IS NULL OR RDB$SYSTEM_FLAG = 0)
        `;

        if (schemaName) {
            query += ` AND TRIM(RDB$OWNER_NAME) = '${schemaName.trim().toUpperCase()}'`;
        }

        query += ` ORDER BY RDB$RELATION_NAME`;

        const result = await this.executeQuery(connectionId, query);

        if (result.success && this.conexiones[connectionId]) {
            this.conexiones[connectionId].isConnected = true;
            this.conexiones[connectionId].config.isActive = true;
            this.conexiones[connectionId].lastUsed = new Date();
        }

        return result;
    }

    async getViews(connectionId: string, schemaName: string = ''): Promise<any> {
        let query = `
          SELECT 
            TRIM(RDB$RELATION_NAME) as VIEW_NAME,
            TRIM(COALESCE(RDB$OWNER_NAME, 'SYSDBA')) as SCHEMA_NAME,
            RDB$DESCRIPTION as DESCRIPTION
          FROM RDB$RELATIONS 
          WHERE RDB$VIEW_BLR IS NOT NULL 
            AND (RDB$SYSTEM_FLAG IS NULL OR RDB$SYSTEM_FLAG = 0)
        `;

        if (schemaName) {
            query += ` AND TRIM(RDB$OWNER_NAME) = '${schemaName.trim().toUpperCase()}'`;
        }

        query += ` ORDER BY RDB$RELATION_NAME`;

        const result = await this.executeQuery(connectionId, query);

        if (result.success && this.conexiones[connectionId]) {
            this.conexiones[connectionId].isConnected = true;
            this.conexiones[connectionId].config.isActive = true;
            this.conexiones[connectionId].lastUsed = new Date();
        }

        return result;
    }

    async getPackages(connectionId: string, schemaName: string = ''): Promise<any> {
        let query = `
          SELECT 
            TRIM(RDB$PACKAGE_NAME) AS PACKAGE_NAME,
            TRIM(COALESCE(RDB$OWNER_NAME, 'SYSDBA')) AS SCHEMA_NAME,
            RDB$SQL_SECURITY AS SQL_SECURITY,
            RDB$DESCRIPTION AS DESCRIPTION
          FROM RDB$PACKAGES
          WHERE (RDB$SYSTEM_FLAG IS NULL OR RDB$SYSTEM_FLAG = 0)
        `;

        if (schemaName) {
            query += ` AND TRIM(RDB$OWNER_NAME) = '${schemaName.trim().toUpperCase()}'`;
        }

        query += ` ORDER BY RDB$PACKAGE_NAME`;

        return this.executeQuery(connectionId, query);
    }

    async getProcedures(connectionId: string, schemaName: string = ''): Promise<any> {
        let query = `
          SELECT 
            TRIM(RDB$PROCEDURE_NAME) AS PROCEDURE_NAME,
            TRIM(COALESCE(RDB$OWNER_NAME, 'SYSDBA')) AS SCHEMA_NAME,
            RDB$DESCRIPTION AS DESCRIPTION
          FROM RDB$PROCEDURES
          WHERE (RDB$SYSTEM_FLAG IS NULL OR RDB$SYSTEM_FLAG = 0)
        `;

        if (schemaName) {
            query += ` AND TRIM(RDB$OWNER_NAME) = '${schemaName.trim().toUpperCase()}'`;
        }

        query += ` ORDER BY RDB$PROCEDURE_NAME`;

        return this.executeQuery(connectionId, query);
    }

    async getFunctions(connectionId: string, schemaName: string = ''): Promise<any> {
        let query = `
          SELECT 
            TRIM(RDB$FUNCTION_NAME) AS FUNCTION_NAME,
            TRIM(COALESCE(RDB$OWNER_NAME, 'SYSDBA')) AS SCHEMA_NAME,
            RDB$DESCRIPTION AS DESCRIPTION
          FROM RDB$FUNCTIONS
          WHERE (RDB$SYSTEM_FLAG IS NULL OR RDB$SYSTEM_FLAG = 0)
        `;

        if (schemaName) {
            query += ` AND TRIM(RDB$OWNER_NAME) = '${schemaName.trim().toUpperCase()}'`;
        }

        query += ` ORDER BY RDB$FUNCTION_NAME`;

        return this.executeQuery(connectionId, query);
    }

    async getSequences(connectionId: string): Promise<any> {
        const query = `
          SELECT 
            TRIM(RDB$GENERATOR_NAME) AS SEQUENCE_NAME,
            RDB$DESCRIPTION AS DESCRIPTION
          FROM RDB$GENERATORS
          WHERE (RDB$SYSTEM_FLAG IS NULL OR RDB$SYSTEM_FLAG = 0)
            AND UPPER(RDB$GENERATOR_NAME) NOT LIKE 'RDB$%'
          ORDER BY RDB$GENERATOR_NAME
        `;

        return this.executeQuery(connectionId, query);
    }

    async getTriggers(connectionId: string, schemaName: string = ''): Promise<any> {
        let query = `
          SELECT 
            TRIM(T.RDB$TRIGGER_NAME) AS TRIGGER_NAME,
            TRIM(T.RDB$RELATION_NAME) AS RELATION_NAME,
            TRIM(COALESCE(R.RDB$OWNER_NAME, 'SYSDBA')) AS SCHEMA_NAME,
            T.RDB$TRIGGER_TYPE AS TRIGGER_TYPE,
            T.RDB$TRIGGER_SEQUENCE AS SEQUENCE,
            T.RDB$DESCRIPTION AS DESCRIPTION
          FROM RDB$TRIGGERS T
          LEFT JOIN RDB$RELATIONS R ON R.RDB$RELATION_NAME = T.RDB$RELATION_NAME
          WHERE (T.RDB$SYSTEM_FLAG IS NULL OR T.RDB$SYSTEM_FLAG = 0)
            AND (T.RDB$TRIGGER_NAME NOT LIKE 'RDB$%')
        `;

        if (schemaName) {
            query += ` AND TRIM(R.RDB$OWNER_NAME) = '${schemaName.trim().toUpperCase()}'`;
        }

        query += ` ORDER BY T.RDB$TRIGGER_NAME`;

        return this.executeQuery(connectionId, query);
    }

    async getIndexes(connectionId: string, schemaName: string = ''): Promise<any> {
        let query = `
          SELECT 
            TRIM(I.RDB$INDEX_NAME) AS INDEX_NAME,
            TRIM(I.RDB$RELATION_NAME) AS RELATION_NAME,
            TRIM(COALESCE(R.RDB$OWNER_NAME, 'SYSDBA')) AS SCHEMA_NAME,
            I.RDB$UNIQUE_FLAG AS IS_UNIQUE,
            I.RDB$INACTIVE AS IS_INACTIVE
          FROM RDB$INDICES I
          LEFT JOIN RDB$RELATIONS R ON R.RDB$RELATION_NAME = I.RDB$RELATION_NAME
          WHERE (I.RDB$SYSTEM_FLAG IS NULL OR I.RDB$SYSTEM_FLAG = 0)
            AND (I.RDB$INDEX_NAME NOT LIKE 'RDB$%')
        `;

        if (schemaName) {
            query += ` AND TRIM(R.RDB$OWNER_NAME) = '${schemaName.trim().toUpperCase()}'`;
        }

        query += ` ORDER BY I.RDB$INDEX_NAME`;

        return this.executeQuery(connectionId, query);
    }

    async getUsers(connectionId: string): Promise<any> {
        const query = `
          SELECT 
            TRIM(SEC$USER_NAME) AS USER_NAME,
            SEC$ACTIVE AS ACTIVE,
            TRIM(SEC$PLUGIN) AS PLUGIN,
            TRIM(SEC$FIRST_NAME) AS FIRST_NAME,
            TRIM(SEC$LAST_NAME) AS LAST_NAME
          FROM SEC$USERS
          ORDER BY SEC$USER_NAME
        `;
        return this.executeQuery(connectionId, query);
    }

    async getTablespaces(connectionId: string): Promise<any> {
        return {
            success: true,
            data: [],
            message: 'Tablespaces no aplica en Firebird 3.0'
        };
    }

    async getTablesColumns(
        connectionId: string,
        tableName: string,
        schemaName: string = ''
    ): Promise<any> {

        /*
    System Tables usadas en Firebird para obtener metadata de columnas:

    1. RDB$RELATION_FIELDS ( RF)
       - Contiene la lista de campos que pertenecen a cada tabla o vista.
       - Campos clave:
            RDB$RELATION_NAME → Nombre de la tabla/vista.
            RDB$FIELD_NAME    → Nombre de la columna.
            RDB$FIELD_SOURCE  → Nombre del dominio o definición interna del tipo de dato.
            RDB$FIELD_POSITION→ Posición de la columna (orden).
            RDB$NULL_FLAG     → Si es 1 = NOT NULL, si es NULL = permite nulos.
            RDB$DEFAULT_SOURCE→ Valor por defecto en SQL.
            RDB$DESCRIPTION   → Comentario/nota asociada a la columna.

    2. RDB$FIELDS (alias F)
       - Define los dominios internos o tipos de datos reales.
       - Campos clave:
            RDB$FIELD_NAME     → Nombre interno del dominio/tipo.
            RDB$FIELD_TYPE     → Código numérico del tipo (ej. 37 = VARCHAR).
            RDB$FIELD_SUB_TYPE → Subtipo (para BLOBs, NUMERIC, etc.).
            RDB$FIELD_LENGTH   → Longitud en bytes.
            RDB$FIELD_PRECISION→ Precisión para tipos numéricos.
            RDB$FIELD_SCALE    → Escala (decimales) para numéricos.
            RDB$COMPUTED_SOURCE→ Expresión SQL si es un campo calculado.

    3. RDB$RELATIONS (alias R)
       - Lista todas las tablas, vistas y sus metadatos.
       - Campos clave:
            RDB$RELATION_NAME → Nombre de la tabla/vista.
            RDB$OWNER_NAME    → Usuario/rol dueño de la tabla.

    4. RDB$RELATION_CONSTRAINTS (alias RC)
       - Lista de restricciones a nivel de tabla (PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK).
       - Campos clave:
            RDB$RELATION_NAME → Tabla a la que pertenece la restricción.
            RDB$INDEX_NAME    → Índice asociado a la restricción.
            RDB$CONSTRAINT_TYPE → Tipo de restricción ('PRIMARY KEY', 'FOREIGN KEY', etc.).

    5. RDB$INDEX_SEGMENTS (alias S)
       - Lista de columnas que componen cada índice.
       - Campos clave:
            RDB$INDEX_NAME → Índice al que pertenece la columna.
            RDB$FIELD_NAME → Nombre de la columna dentro del índice.

    Resumen de uso en la función:
        - RDB$RELATION_FIELDS → Punto de partida, lista las columnas de la tabla.
        - RDB$FIELDS → Obtenemos el tipo real, longitud, precisión y escala.
        - RDB$RELATIONS → Usado para filtrar por tabla y esquema (owner).
        - RDB$RELATION_CONSTRAINTS + RDB$INDEX_SEGMENTS → Determinar si la columna es Primary Key o Foreign Key.
*/

    
        const query = `
            SELECT 
                TRIM(RF.RDB$FIELD_NAME) AS "name",
                F.RDB$FIELD_TYPE AS "dataType",
                TRIM(F.RDB$FIELD_SUB_TYPE) AS "subType",
                F.RDB$FIELD_LENGTH AS "maxLength",
                F.RDB$FIELD_PRECISION AS "precision",
                F.RDB$FIELD_SCALE AS "scale",
                CASE WHEN RF.RDB$NULL_FLAG = 1 THEN 0 ELSE 1 END AS "isNullable",
                TRIM(RF.RDB$DEFAULT_SOURCE) AS "defaultValue",
                TRIM(RF.RDB$DESCRIPTION) AS "description",
                CASE WHEN CPK.RDB$FIELD_NAME IS NOT NULL THEN 1 ELSE 0 END AS "isPrimaryKey",
                CASE WHEN CFK.RDB$FIELD_NAME IS NOT NULL THEN 1 ELSE 0 END AS "isForeignKey"
            FROM RDB$RELATION_FIELDS RF
            INNER JOIN RDB$RELATIONS R 
                ON RF.RDB$RELATION_NAME = R.RDB$RELATION_NAME
            INNER JOIN RDB$FIELDS F 
                ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
            -- Primary Keys
            LEFT JOIN (
                SELECT S.RDB$FIELD_NAME, RC.RDB$RELATION_NAME
                FROM RDB$RELATION_CONSTRAINTS RC
                INNER JOIN RDB$INDEX_SEGMENTS S 
                    ON RC.RDB$INDEX_NAME = S.RDB$INDEX_NAME
                WHERE RC.RDB$CONSTRAINT_TYPE = 'PRIMARY KEY'
            ) CPK ON CPK.RDB$FIELD_NAME = RF.RDB$FIELD_NAME
                AND CPK.RDB$RELATION_NAME = RF.RDB$RELATION_NAME
            -- Foreign Keys
            LEFT JOIN (
                SELECT S.RDB$FIELD_NAME, RC.RDB$RELATION_NAME
                FROM RDB$RELATION_CONSTRAINTS RC
                INNER JOIN RDB$INDEX_SEGMENTS S 
                    ON RC.RDB$INDEX_NAME = S.RDB$INDEX_NAME
                WHERE RC.RDB$CONSTRAINT_TYPE = 'FOREIGN KEY'
            ) CFK ON CFK.RDB$FIELD_NAME = RF.RDB$FIELD_NAME
                AND CFK.RDB$RELATION_NAME = RF.RDB$RELATION_NAME
            WHERE RF.RDB$RELATION_NAME = UPPER(?)
            ${schemaName && schemaName.trim() !== '' ? `AND R.RDB$OWNER_NAME = UPPER(?)` : ''}
            ORDER BY RF.RDB$FIELD_POSITION
        `;
    
        const params = schemaName && schemaName.trim() !== '' 
            ? [tableName, schemaName]
            : [tableName];
    
    
        const result = await this.executeQuery(connectionId, query, params);
    
        if (result.success && this.conexiones[connectionId]) {
            this.conexiones[connectionId].isConnected = true;
            this.conexiones[connectionId].config.isActive = true;
            this.conexiones[connectionId].lastUsed = new Date();
        }
    
        return result;
    }

    private generateConnectionId(): string {
        return `connection_${uuid()}`;
    }

    async closeAllconection(): Promise<void> {
        const idsConexiones = Object.keys(this.conexiones);
        for (const connectionId of idsConexiones) {
            await this.disconnectFromDatabase(connectionId);
        }
    }

    async checkConnectionsHealth(): Promise<void> {
        // Comentado temporalmente para evitar errores 
        console.log('Verificación de salud de conexiones deshabilitada temporalmente');
        return;

        /*
        for (const [id, connection] of Object.entries(this.conexiones)) {
          if (connection.isConnected && connection.pool) {
            try {
              await new Promise((resolve, reject) => {
                connection.pool.get((err: any, db: any) => {
                  if (err) {
                    reject(err);
                    return;
                  }
                  db.query('SELECT 1 FROM RDB$DATABASE', (err: any) => {
                    db.detach();
                    if (err) {
                      reject(err);
                    } else {
                      resolve(true);
                    }
                  });
                });
              });
              connection.lastUsed = new Date();
            } catch (error) {
              console.log(`Conexión ${id} perdida, marcando como desconectada`);
              connection.isConnected = false;
              connection.config.isActive = false;
              connection.pool = null;
            }
          }
        }
        await this.guardarConexiones();
        */
    }

    // Eliminadas utilidades de cifrado y verificación de contraseñas por simplificación solicitada
}

module.exports = new databaseManager();