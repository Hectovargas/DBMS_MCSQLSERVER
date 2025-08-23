const Firebird = require('node-firebird');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuid } = require('uuid');

//estructura de las columnas de firebird, lo uso unicamente la estructura al crear o modificar tablas desde el GUI
//en las funciones de CreateTable Y generateCreateTableSQL ya que se forma un string para hacer el SQL de la cracion de tablas
interface ColumnDefinition {
    name: string;
    type: string;
    length?: number;
    nullable: boolean;
    defaultValue?: string;
    primaryKey: boolean;
    unique: boolean;
}

//estructura de la operacion que se va a hacer en una tabla, se usa para tener la estructura de la informacion 
// que devuelve la base de datos al crear una tabla o modificrla
interface TableOperationResponse {
    success: boolean;
    message?: string;
    data?: any;
    error?: {
        message: string;
        code?: string | number;
        details?: any;
    };
    exists?: boolean;
    sql?: string;
    executionTime?: number;
    rowsAffected?: number;
    columns?: Array<{
        name: string;
        type: string;
        maxLength?: number;
        isNullable?: boolean;
        isPrimaryKey?: boolean;
        isForeignKey?: boolean;
        defaultValue?: string;
    }>;
    table?: {
        name: string;
        schema?: string;
        columns?: ColumnDefinition[];
    };
}

//--------------------------------------------------------------------------------------------------------------------------------------

type FirebirdConnection = { //struct con las propiedades de la conexion, luego se guardan en el archivo 
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

//--------------------------------------------------------------------------------------------------------------------------------------

type FirebirdConnectionResponse = {// tambien un struct pero con las prpiedades de la respuesta de la conexion
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

//--------------------------------------------------------------------------------------------------------------------------------------

interface connectionPool { //un objeto de la conexion activa a la abse de datos, cada cosa del sidebar es una de estos pools
    [connectionId: string]: {
        pool: any;
        config: FirebirdConnection;
        lastUsed: Date;
        isConnected: boolean;
    }
}

//--------------------------------------------------------------------------------------------------------------------------------------

class databaseManager {

    // Arreglo de conexiones guardadas en el archivo
    private conexiones: connectionPool = {};
    // Ruta del archivo donde se guardan las conexiones
    private archivoConexiones: string;

    //cuando se inicializa la clase se cargan todas las conexiones que el usuario a creado.
    constructor() {
        this.archivoConexiones = path.join(__dirname, '../data/connections.json');
        this.cargarConexiones();
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    // cargamos las conexiones del archivo
    private async cargarConexiones(): Promise<void> {
        try {

            //verificamos si no hay relajo con que se borro el archivo
            await this.asegurarDirectorioDatos();
            //leemos el archivo
            const data = await fs.readFile(this.archivoConexiones, 'utf8');
            //parseamos las conexion a yeison
            const conexionesGuardadas = JSON.parse(data);

            //revisamos cada conexion guardada 
            for (const conexion of conexionesGuardadas) {
                //revisamos si esa conexion tiene id
                if (conexion.id) {
                    //guardamos la contraseña obtenida en una variable
                    const passwordPlano = typeof conexion.password === 'string' ? conexion.password : '';
                    //guardamos el resto de datos del pool
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
            //un avisito si el archivo esta vacio
        } catch (error) {
            console.log('No tienes conexiones xdddd.');
        }
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

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

    //--------------------------------------------------------------------------------------------------------------------------------------

    private async asegurarDirectorioDatos(): Promise<void> {
        const dataDir = path.dirname(this.archivoConexiones);
        try {
            await fs.access(dataDir);
        } catch (error) {
            await fs.mkdir(dataDir, { recursive: true });
        }
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

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
            encoding: config.options?.encoding || 'UTF-8',
            
            WireCrypt: 'Disabled',
            wireCompression: false,
            legacy_auth: true,
            auth_plugin: 'Legacy_Auth'
        };
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    async testConnection(config: FirebirdConnection): Promise<FirebirdConnectionResponse> {
        try {
            const connectionConfig = {
                host: config.host,
                database: '/firebird/data/' + config.database,
                port: config.port || 3050,
                user: config.username || 'SYSDBA',
                password: config.password || 'masterkey',
                
                WireCrypt: 'Disabled',
                wireCompression: false,
                legacy_auth: true,
                auth_plugin: 'Legacy_Auth'
            };
    
            return new Promise((resolve, reject) => {
                Firebird.attach(connectionConfig, (err: any, db: any) => {
                    if (err) {
                        resolve({
                            success: false,
                            message: 'Error de conexion',
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
                            console.error('Error al cerrar conexion:', detachError);
                        }
    
                        resolve({
                            success: true,
                            message: 'Conexión exitosa'
                        });
                    });
                });
            });
    
        } catch (error: any) {
            return {
                success: false,
                message: 'Error de conexion',
                error: {
                    code: error.code,
                    message: error.message
                }
            };
        }
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    async addConection(config: FirebirdConnection): Promise<FirebirdConnectionResponse> {
        try {
            const test = await this.testConnection(config);
            //si pasa la prueba del test es valida para agregarla como conexion
            if (!test.success) {
                return test;
            }

            //llenados todos los campos necesaios para el pool de conexion
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

            //se guarda la conexion en el archivo
            await this.guardarConexiones();
            return {
                success: true,
                message: 'Conexion añadida exitosamente',
                connectionId,
                ...(test.serverInfo && { serverInfo: test.serverInfo })
            };


        } catch (error: any) {
            return {
                success: false,
                message: 'Error al agregr conexin',
                error: {
                    message: error.message
                }
            };
        }
    }

    //--------------------------------------------------------------------------------------------------------------------------------------


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

            //si no esta conectada se procede a crear el pool de conexiones
            //se crea la configuracion de la conexion 
            const config = connection.config;
            const firebirdConfig = this.crearConfiguracionFirebird(config);

            //se crea el pool para la conexion 
            const pool = Firebird.pool(5, firebirdConfig);

            //se intenta obtener la conexion del pool para ver si no se fallo en una configutracion
            return new Promise((resolve, reject) => {

                pool.get((err: any, db: any) => {
                    if (err) {
                        console.error('Error al obtener conexion del pool:', err);
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

                        //si pasa la prueba del test es valida actualizar el estado de esa conexion
                        connection.pool = pool;
                        connection.isConnected = true;
                        connection.lastUsed = new Date();
                        connection.config.isActive = true;
                        connection.config.lastConnected = new Date();

                        this.guardarConexiones();

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

    //--------------------------------------------------------------------------------------------------------------------------------------

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

    //--------------------------------------------------------------------------------------------------------------------------------------

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

    //--------------------------------------------------------------------------------------------------------------------------------------

    getAllConnections(): FirebirdConnection[] {
        return Object.values(this.conexiones).map(conn => ({
            ...conn.config,
            password: conn.config.password ? '***' : undefined,
            lastConnected: conn.lastUsed
        })) as FirebirdConnection[];
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    getActiveConnections(): FirebirdConnection[] {
        return Object.values(this.conexiones)
            .filter(conn => conn.isConnected)
            .map(conn => ({
                ...conn.config,
                password: conn.config.password ? '***' : undefined,
                lastConnected: conn.lastUsed
            })) as FirebirdConnection[];
    }

    //--------------------------------------------------------------------------------------------------------------------------------------


    async executeQuery(connectionId: string, query: string, parametrers?: any): Promise<any> {
        try {

            if (!this.conexiones[connectionId]) {
                throw new Error('conexion no encontrada');
            }

            const connection = this.conexiones[connectionId];


            if (!connection.isConnected || !connection.pool) {
                console.log(`Intentando reconectar a la base de datos: ${connectionId}`);
                const reconnectResult = await this.connectToDatabase(connectionId);
                if (!reconnectResult.success) {
                    console.error(`Error al reconectar: ${reconnectResult.message}`);
                    throw new Error(`La conexion no esta activa y no se pudo reconectar: ${reconnectResult.message}`);
                }
                console.log(`Reconexión exitosa para: ${connectionId}`);
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


                    db.query('SET BLOB_DISPLAY_DEFAULT = TEXT', (err: any) => {});


                    const startTime = Date.now();


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
                            columns = Object.keys(result[0]).map(key => ({ name: key, type: typeof result[0][key] }));

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

    //--------------------------------------------------------------------------------------------------------------------------------------

    async getSchemas(connectionId: string): Promise<any> {
        try {
            // Verificar la salud de la conexión antes de proceder
            const isHealthy = await this.checkConnectionHealth(connectionId);
            if (!isHealthy) {
                console.log(`Conexión ${connectionId} no está saludable, intentando reconectar...`);
                const reconnectResult = await this.connectToDatabase(connectionId);
                if (!reconnectResult.success) {
                    return {
                        success: false,
                        message: 'No se pudo establecer conexión con la base de datos',
                        error: { message: reconnectResult.message }
                    };
                }
            }

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
        } catch (error: any) {
            console.error(`Error en getSchemas para conexión ${connectionId}:`, error);
            return {
                success: false,
                message: 'Error al obtener esquemas',
                error: { message: error.message }
            };
        }
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

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

    //--------------------------------------------------------------------------------------------------------------------------------------

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

    //--------------------------------------------------------------------------------------------------------------------------------------

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

    //--------------------------------------------------------------------------------------------------------------------------------------

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

    //--------------------------------------------------------------------------------------------------------------------------------------

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

    //--------------------------------------------------------------------------------------------------------------------------------------

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

    //--------------------------------------------------------------------------------------------------------------------------------------

    async getIndexes(connectionId: string, schemaName: string = ''): Promise<any> {
        let query = `
          SELECT 
            TRIM(I.RDB$INDEX_NAME) AS INDEX_NAME,
            TRIM(I.RDB$RELATION_NAME) AS RELATION_NAME,
            TRIM(COALESCE(R.RDB$OWNER_NAME, 'SYSDBA')) AS SCHEMA_NAME,
            I.RDB$UNIQUE_FLAG AS IS_UNIQUE
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

    //--------------------------------------------------------------------------------------------------------------------------------------

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

    //--------------------------------------------------------------------------------------------------------------------------------------

    async getTablesColumns(connectionId: string, tableName: string, schemaName: string = ''): Promise<any> {
        const query =
            `SELECT 
            --agarro los datos principales de la columna
                TRIM(RF.RDB$FIELD_NAME) AS "name",                  
                F.RDB$FIELD_TYPE AS "dataType",                     -- Codigo numerico del tipo de dato (8=INTEGER 37=VARCHAR etc)
                F.RDB$FIELD_LENGTH AS "maxLength",                  
                F.RDB$FIELD_PRECISION AS "precision",               
                F.RDB$FIELD_SCALE AS "scale",                       
                CASE WHEN RF.RDB$NULL_FLAG = 1 THEN 0 ELSE 1 END AS "isNullable",
    
                CASE                                                        --Manejo el valor por defecto de esta manera porque firebird guarda los defaultValues como blob 
                    WHEN RF.RDB$DEFAULT_SOURCE IS NULL THEN NULL            -- Si no hay valor por defecto devolver NULL
                    WHEN CHAR_LENGTH(RF.RDB$DEFAULT_SOURCE) = 0 THEN NULL   -- Si el BLOB está vacío, devolver NULL
                    ELSE CAST(SUBSTRING(RF.RDB$DEFAULT_SOURCE FROM 9) AS VARCHAR(8000))      -- Convertir BLOB a texto 
                END AS "defaultValue",                                      
    
                CASE WHEN CPK.RDB$FIELD_NAME IS NOT NULL THEN 1 ELSE 0 END AS "isPrimaryKey", -- Si es clave primaria (1=TRUE, 0=FALSE)
                CASE WHEN CFK.RDB$FIELD_NAME IS NOT NULL THEN 1 ELSE 0 END AS "isForeignKey"  -- Si es clave foránea (1=TRUE, 0=FALSE)
    
            -- JOINS PRINCIPALES
            FROM RDB$RELATION_FIELDS RF                             --me sirve para traer info especifica de ese campo
            INNER JOIN RDB$RELATIONS R                              --la utilizo unicamente para saber cual es la tabla padre de esa columna
                ON RF.RDB$RELATION_NAME = R.RDB$RELATION_NAME       --Toda columna debe de tener obligatoriamente una tabla por eso el inner join
            INNER JOIN RDB$FIELDS F                                 -- solo la utilizo para ver que tipo de dato era cada cosa
                ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME           --obligatoriamente un campo debe de tener un tipo de dato asi que tambien era innerjoin
    
            -- SUBCONSULTA PARA PRIMARY KEYS
            LEFT JOIN (                                             -- utilice left join porque no todos los campos son pk entonces ocupada hacer la resta
                SELECT S.RDB$FIELD_NAME, RC.RDB$RELATION_NAME       -- agarro solamente el nombre del campo y la tabla
                FROM RDB$RELATION_CONSTRAINTS RC                    -- agarro la tabla de la tabla de restricciones para ver si existe ahi
                INNER JOIN RDB$INDEX_SEGMENTS S                     -- AQUI HAY ALGO MUY IMPORTANTE, utilice inner join poque los campos constraint
                    ON RC.RDB$INDEX_NAME = S.RDB$INDEX_NAME         -- tienen OBLIGATORIAMENTE UN INDICE, asi que mediante ese indice puedo identificar
                                                                    -- quien es la llave primaria que esta en constraint y index_segments
                WHERE RC.RDB$CONSTRAINT_TYPE = 'PRIMARY KEY'        -- Filtro solo restricciones de tipo pk
            ) CPK ON CPK.RDB$FIELD_NAME = RF.RDB$FIELD_NAME         -- aqui ya identifico quien es la pk
                AND CPK.RDB$RELATION_NAME = RF.RDB$RELATION_NAME    -- Y verifico que sea de la misma tabla
    
            -- SUBCONSULTA PARA FOREIGN KEYS
            LEFT JOIN (
                SELECT S.RDB$FIELD_NAME, RC.RDB$RELATION_NAME       
                FROM RDB$RELATION_CONSTRAINTS RC                    
                INNER JOIN RDB$INDEX_SEGMENTS S                     
                    ON RC.RDB$INDEX_NAME = S.RDB$INDEX_NAME         
                WHERE RC.RDB$CONSTRAINT_TYPE = 'FOREIGN KEY'        
            ) CFK ON CFK.RDB$FIELD_NAME = RF.RDB$FIELD_NAME         
                AND CFK.RDB$RELATION_NAME = RF.RDB$RELATION_NAME    
    
            -- FILTROS: Especifico qué tabla quiero consultar    
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
    //--------------------------------------------------------------------------------------------------------------------------------------

    // Verifica si una conexión está activa y funcional
    async checkConnectionHealth(connectionId: string): Promise<boolean> {
        try {
            if (!this.conexiones[connectionId]) {
                return false;
            }

            const connection = this.conexiones[connectionId];
            
            if (!connection.isConnected || !connection.pool) {
                return false;
            }

            // Intentar hacer una consulta simple para verificar la conexión
            const result = await this.executeQuery(connectionId, 'SELECT 1 as test FROM RDB$DATABASE');
            return result.success;
        } catch (error) {
            console.error(`Error al verificar salud de conexión ${connectionId}:`, error);
            return false;
        }
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    private generateConnectionId(): string {
        return `connection_${uuid()}`;
    }
    //--------------------------------------------------------------------------------------------------------------------------------------

    async closeAllconection(): Promise<void> {
        const idsConexiones = Object.keys(this.conexiones);
        for (const connectionId of idsConexiones) {
            await this.disconnectFromDatabase(connectionId);
        }
    }
    //--------------------------------------------------------------------------------------------------------------------------------------
    async createTable(params: {
        connectionId: string; schemaName: string; tableName: string; columns: ColumnDefinition[];
    }): Promise<TableOperationResponse> {
        try {

            const { connectionId, schemaName, tableName, columns } = params;
            
            console.log('createTable called with params:', { connectionId, schemaName, tableName, columnsCount: columns?.length });
            console.log('Available connections:', Object.keys(this.conexiones));

            // si la conexión existe
            if (!this.conexiones[connectionId]) {
                console.log('Connection not found:', connectionId);
                return {
                    success: false,
                    message: 'Conexión no encontrada'
                };
            }

            //si no coloco la tabla y nombre de columnas vacio o sin columnas
            if (!tableName || !columns || columns.length === 0) {
                return {
                    success: false,
                    message: 'Nombre de tabla y columnas son requeridos'
                };
            }

            //miramos si la tabla existe usando con la funcion que hicimos abajo.
            const existsResult = await this.checkTableExists(connectionId, schemaName, tableName);
            if (existsResult.success && existsResult.exists) {
                return {
                    success: false,
                    message: `La tabla ${tableName} ya existe en el esquema ${schemaName}`
                };
            }

            // generamos el sql que no creara la tabla usando la funcion de abajo.
            const sql = this.generateCreateTableSQL(schemaName, tableName, columns);

            //usamos la funcion de ejecutar query que se usa tambien en el editor de consulta para crear la tabla con el string generado
            const result = await this.executeQuery(connectionId, sql);

            if (result.success) {
                return {
                    success: true,
                    message: `Tabla ${tableName} creada exitosamente`,
                    data: { tableName, schemaName, columns }
                };
            } else {
                return {
                    success: false,
                    message: result.error || 'Error al crear la tabla'
                };
            }

        } catch (error: any) {
            console.error('Error en createTable:', error);
            return {
                success: false,
                message: error.message || 'Error al crear la tabla'
            };
        }
    }
    //--------------------------------------------------------------------------------------------------------------------------------------

    private generateCreateTableSQL(schemaName: string, tableName: string, columns: ColumnDefinition[]): string {

        const columnDefinitions = columns.map(col => {
            let definition = `${col.name.toUpperCase()} ${col.type.toUpperCase()}`;

            if (col.length && (col.type.toUpperCase() === 'VARCHAR' || col.type.toUpperCase() === 'CHAR' || col.type.toUpperCase() === 'DECIMAL' || col.type.toUpperCase() === 'NUMERIC')) {
                definition += `(${col.length})`;
            }

            if (!col.nullable) {
                definition += ' NOT NULL';
            }

            if (col.defaultValue !== undefined && col.defaultValue.trim() !== '') {
                const defaultValue = this.formatDefaultValue(col.defaultValue, col.type);
                if (defaultValue !== '') {
                    definition += ` DEFAULT ${defaultValue}`;
                }
            }

            if (col.unique) {
                definition += ' UNIQUE';
            }

            return definition;
        });

        const primaryKeys = columns.filter(col => col.primaryKey).map(col => col.name.toUpperCase());

        // En Firebird, es mejor no especificar el esquema en el CREATE TABLE
        // El esquema se maneja a través de la conexión
        let sql = `CREATE TABLE ${tableName.toUpperCase()} (\n`;
        sql += `  ${columnDefinitions.join(',\n  ')}`;

        // Agregar primary key si hay
        if (primaryKeys.length > 0) {
            sql += `,\n  PRIMARY KEY (${primaryKeys.join(', ')})`;
        }

        sql += '\n);';

        return sql;
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    private formatDefaultValue(value: string, type: string): string {

        if (!value || value.trim() === '') {
            return '';
        }

        const upperType = type.toUpperCase();

        if (upperType.includes('CHAR') || upperType.includes('TEXT') ||
            upperType.includes('DATE') || upperType.includes('TIME') ||
            upperType.includes('BLOB') || upperType.includes('CLOB')) {
            return `'${value.replace(/'/g, "''")}'`;
        }

        if (upperType.includes('INT') || upperType.includes('DECIMAL') || 
            upperType.includes('NUMERIC') || upperType.includes('FLOAT') || 
            upperType.includes('DOUBLE') || upperType.includes('SMALLINT') ||
            upperType.includes('BIGINT')) {
            const numValue = parseFloat(value);
            if (isNaN(numValue)) {
                return `'${value.replace(/'/g, "''")}'`; 
            }
            return value;
        }

        if (upperType.includes('BOOLEAN')) {
            const boolValue = value.toLowerCase();
            if (boolValue === 'true' || boolValue === 'false') {
                return boolValue;
            }
            return `'${value.replace(/'/g, "''")}'`;
        }

        return `'${value.replace(/'/g, "''")}'`;
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    async checkTableExists(
        connectionId: string,
        schemaName: string,
        tableName: string
    ): Promise<{ success: boolean; exists: boolean; message?: string }> {
        try {
            const query = `SELECT 1 
      FROM RDB$RELATIONS 
      WHERE RDB$RELATION_NAME = UPPER(?) ${schemaName ? `AND RDB$OWNER_NAME = UPPER(?)` : ''}`;

            const params = schemaName ? [tableName, schemaName] : [tableName];
            const result = await this.executeQuery(connectionId, query, params);

            return {
                success: true,
                exists: result.success && result.data && result.data.length > 0
            };
        } catch (error: any) {
            return {
                success: false,
                exists: false,
                message: error.message
            };
        }
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    async createView(params: {
        connectionId: string;
        schemaName: string;
        viewName: string;
        selectQuery: string;
        columnNames?: string[];
        withCheckOption?: boolean;
    }): Promise<TableOperationResponse> {
        try {
            const {
                connectionId,
                schemaName,
                viewName,
                selectQuery,
                columnNames,
                withCheckOption = false
            } = params;

            if (!this.conexiones[connectionId]) {
                return {
                    success: false,
                    message: 'Conexión no encontrada'
                };
            }

            if (!viewName || !selectQuery) {
                return {
                    success: false,
                    message: 'Nombre de vista y consulta SELECT son requeridos'
                };
            }

            const existsResult = await this.checkViewExists(connectionId, schemaName, viewName);
            if (existsResult.success && existsResult.exists) {
                return {
                    success: false,
                    message: `La vista ${viewName} ya existe en el esquema ${schemaName}`
                };
            }

            const sql = this.generateCreateViewSQL(
                schemaName,
                viewName,
                selectQuery,
                columnNames,
                withCheckOption
            );

            const result = await this.executeQuery(connectionId, sql);

            if (result.success) {
                return {
                    success: true,
                    message: `Vista ${viewName} creada exitosamente`,
                    data: {
                        viewName,
                        schemaName,
                        selectQuery,
                        columnNames,
                        withCheckOption
                    }
                };
            } else {
                return {
                    success: false,
                    message: result.error || 'Error al crear la vista'
                };
            }

        } catch (error: any) {
            console.error('Error en createView:', error);
            return {
                success: false,
                message: error.message || 'Error al crear la vista'
            };
        }
    }

    //--------------------------------------------------------------------------------------------------------------------------------------
    private generateCreateViewSQL(
        schemaName: string,
        viewName: string,
        selectQuery: string,
        columnNames?: string[],
        withCheckOption: boolean = false
    ): string {

        const cleanedSelectQuery = selectQuery.trim();
        if (!cleanedSelectQuery.toUpperCase().startsWith('SELECT')) {
            throw new Error('La consulta debe comenzar con SELECT');
        }

        // En Firebird, es mejor no especificar el esquema en el CREATE VIEW
        // El esquema se maneja a través de la conexión
        let sql = `CREATE VIEW ${viewName.toUpperCase()}`;

        if (columnNames && columnNames.length > 0) {
            sql += ` (${columnNames.map(name => name.toUpperCase()).join(', ')})`;
        }

        sql += ` AS\n${cleanedSelectQuery}`;

        if (withCheckOption) {
            sql += `\nWITH CHECK OPTION`;
        }

        return sql;
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    async checkViewExists(
        connectionId: string,
        schemaName: string,
        viewName: string
    ): Promise<{ success: boolean; exists: boolean; message?: string }> {
        try {
            const query = `
            SELECT 1 
            FROM RDB$RELATIONS 
            WHERE RDB$RELATION_NAME = UPPER(?)
            AND RDB$VIEW_BLR IS NOT NULL
            ${schemaName ? `AND RDB$OWNER_NAME = UPPER(?)` : ''}
        `;

            const params = schemaName ? [viewName, schemaName] : [viewName];
            const result = await this.executeQuery(connectionId, query, params);

            return {
                success: true,
                exists: result.success && result.data && result.data.length > 0
            };
        } catch (error: any) {
            return {
                success: false,
                exists: false,
                message: error.message
            };
        }
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    async getSupportedDataTypes(connectionId: string): Promise<any> {
        const firebirdDataTypes = [
            'INTEGER', 'BIGINT', 'SMALLINT', 'FLOAT', 'DOUBLE PRECISION',
            'CHAR', 'VARCHAR', 'BLOB', 'DATE', 'TIME', 'TIMESTAMP',
            'BOOLEAN', 'DECIMAL', 'NUMERIC'
        ];

        return {
            success: true,
            data: firebirdDataTypes,
            message: 'Tipos de datos obtenidos exitosamente'
        };
    }

    //--------------------------------------------------------------------------------------------------------------------------------------
    // FUNCIONES PARA GENERAR DDL DE OBJETOS
    //--------------------------------------------------------------------------------------------------------------------------------------

    async generateTableDDL(connectionId: string, tableName: string, schemaName: string = ''): Promise<any> {
        try {
            if (!this.conexiones[connectionId]) {
                return {
                    success: false,
                    message: 'Conexión no encontrada'
                };
            }

            // Obtener columnas de la tabla
            const columnsResult = await this.getTablesColumns(connectionId, tableName, schemaName);
            if (!columnsResult.success) {
                return columnsResult;
            }

            // Obtener índices de la tabla
            const indexesResult = await this.getTableIndexes(connectionId, tableName, schemaName);
            const indexes = indexesResult.success ? indexesResult.data : [];

            // Obtener constraints de la tabla
            const constraintsResult = await this.getTableConstraints(connectionId, tableName, schemaName);
            const constraints = constraintsResult.success ? constraintsResult.data : [];

            // Generar DDL
            const ddl = this.buildTableDDL(tableName, schemaName, columnsResult.data, indexes, constraints);

            return {
                success: true,
                data: ddl,
                message: 'DDL de tabla generado exitosamente'
            };

        } catch (error: any) {
            return {
                success: false,
                message: 'Error al generar DDL de tabla',
                error: { message: error.message }
            };
        }
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    async generateFunctionDDL(connectionId: string, functionName: string, schemaName: string = ''): Promise<any> {
        try {
            if (!this.conexiones[connectionId]) {
                return {
                    success: false,
                    message: 'Conexión no encontrada'
                };
            }



            const query = `
                SELECT 
                    TRIM(R.RDB$FUNCTION_NAME) AS FUNCTION_NAME,
                    TRIM(R.RDB$OWNER_NAME) AS OWNER_NAME,
                    R.RDB$FUNCTION_TYPE AS FUNCTION_TYPE,
                    R.RDB$QUERY_NAME AS QUERY_NAME,
                    R.RDB$DESCRIPTION AS DESCRIPTION,
                    R.RDB$SYSTEM_FLAG AS SYSTEM_FLAG,
                    CAST(R.RDB$FUNCTION_SOURCE AS VARCHAR(8000)) AS FUNCTION_SOURCE,
                    R.RDB$MODULE_NAME AS MODULE_NAME,
                    R.RDB$ENTRYPOINT AS ENTRYPOINT,
                    R.RDB$RETURN_ARGUMENT AS RETURN_ARGUMENT
                FROM RDB$FUNCTIONS R
                WHERE R.RDB$FUNCTION_NAME = ?
            `;

            const params = [functionName];
            
            const result = await this.executeQuery(connectionId, query, params);

            if (!result.success || !result.data || result.data.length === 0) {
                return {
                    success: false,
                    message: 'Función no encontrada'
                };
            }

            const func = result.data[0];
            const ddl = this.buildFunctionDDL(func);

            return {
                success: true,
                data: ddl,
                message: 'DDL de función generado exitosamente'
            };

        } catch (error: any) {
            return {
                success: false,
                message: 'Error al generar DDL de función',
                error: { message: error.message }
            };
        }
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    async generateTriggerDDL(connectionId: string, triggerName: string, schemaName: string = ''): Promise<any> {
        try {
            if (!this.conexiones[connectionId]) {
                return {
                    success: false,
                    message: 'Conexión no encontrada'
                };
            }


            const query = `
                SELECT 
                    TRIM(T.RDB$TRIGGER_NAME) AS TRIGGER_NAME,
                    TRIM(T.RDB$RELATION_NAME) AS RELATION_NAME,
                    T.RDB$TRIGGER_TYPE AS TRIGGER_TYPE,
                    CAST(T.RDB$TRIGGER_SOURCE AS VARCHAR(8000)) AS TRIGGER_SOURCE,
                    T.RDB$TRIGGER_BLR AS TRIGGER_BLR,
                    T.RDB$DESCRIPTION AS DESCRIPTION,
                    T.RDB$TRIGGER_INACTIVE AS TRIGGER_INACTIVE,
                    T.RDB$SYSTEM_FLAG AS SYSTEM_FLAG,
                    T.RDB$FLAGS AS FLAGS,
                    T.RDB$VALID_BLR AS VALID_BLR,
                    T.RDB$DEBUG_INFO AS DEBUG_INFO
                FROM RDB$TRIGGERS T
                WHERE T.RDB$TRIGGER_NAME = ?
            `;

            const params = [triggerName];
            
            const result = await this.executeQuery(connectionId, query, params);


            if (!result.success || !result.data || result.data.length === 0) {
                return {
                    success: false,
                    message: 'Trigger no encontrado'
                };
            }

            const trigger = result.data[0];
            const ddl = this.buildTriggerDDL(trigger);

            return {
                success: true,
                data: ddl,
                message: 'DDL de trigger generado exitosamente'
            };

        } catch (error: any) {
            return {
                success: false,
                message: 'Error al generar DDL de trigger',
                error: { message: error.message }
            };
        }
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    async generateProcedureDDL(connectionId: string, procedureName: string, schemaName: string = ''): Promise<any> {
        try {
            if (!this.conexiones[connectionId]) {
                return {
                    success: false,
                    message: 'Conexión no encontrada'
                };
            }


            const query = `
                SELECT 
                    TRIM(P.RDB$PROCEDURE_NAME) AS PROCEDURE_NAME,
                    TRIM(P.RDB$OWNER_NAME) AS OWNER_NAME,
                    CAST(P.RDB$PROCEDURE_SOURCE AS VARCHAR(8000)) AS PROCEDURE_SOURCE,
                    P.RDB$PROCEDURE_BLR AS PROCEDURE_BLR,
                    P.RDB$DESCRIPTION AS DESCRIPTION,
                    P.RDB$SYSTEM_FLAG AS SYSTEM_FLAG,
                    P.RDB$SECURITY_CLASS AS SECURITY_CLASS,
                    P.RDB$PROCEDURE_TYPE AS PROCEDURE_TYPE,
                    P.RDB$VALID_BLR AS VALID_BLR,
                    P.RDB$DEBUG_INFO AS DEBUG_INFO
                FROM RDB$PROCEDURES P
                WHERE P.RDB$PROCEDURE_NAME = ?
            `;

            const params = [procedureName];
            
            const result = await this.executeQuery(connectionId, query, params);


            if (!result.success || !result.data || result.data.length === 0) {
                return {
                    success: false,
                    message: 'Procedimiento no encontrado'
                };
            }

            const proc = result.data[0];
            const ddl = this.buildProcedureDDL(proc);

            return {
                success: true,
                data: ddl,
                message: 'DDL de procedimiento generado exitosamente'
            };

        } catch (error: any) {
            return {
                success: false,
                message: 'Error al generar DDL de procedimiento',
                error: { message: error.message }
            };
        }
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    async generateViewDDL(connectionId: string, viewName: string, schemaName: string = ''): Promise<any> {
        try {
            if (!this.conexiones[connectionId]) {
                return {
                    success: false,
                    message: 'Conexión no encontrada'
                };
            }

            const query = `
                SELECT 
                    TRIM(R.RDB$RELATION_NAME) AS VIEW_NAME,
                    TRIM(R.RDB$OWNER_NAME) AS OWNER_NAME,
                    CAST(R.RDB$VIEW_SOURCE AS VARCHAR(8000)) AS VIEW_SOURCE,
                    R.RDB$DESCRIPTION AS DESCRIPTION,
                    R.RDB$SYSTEM_FLAG AS SYSTEM_FLAG
                FROM RDB$RELATIONS R
                WHERE R.RDB$RELATION_NAME = ?
                AND R.RDB$VIEW_BLR IS NOT NULL
            `;

            const params = [viewName];
            
            const result = await this.executeQuery(connectionId, query, params);

            if (!result.success || !result.data || result.data.length === 0) {
                return {
                    success: false,
                    message: 'Vista no encontrada'
                };
            }

            const view = result.data[0];
            
            const ddl = this.buildViewDDL(view);

            return {
                success: true,
                data: ddl,
                message: 'DDL de vista generado exitosamente'
            };

        } catch (error: any) {
            return {
                success: false,
                message: 'Error al generar DDL de vista',
                error: { message: error.message }
            };
        }
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    async generateIndexDDL(connectionId: string, indexName: string, schemaName: string = ''): Promise<any> {
        try {
            if (!this.conexiones[connectionId]) {
                return {
                    success: false,
                    message: 'ConexiOn no encontrada'
                };
            }

            const query = `
                SELECT 
                    TRIM(I.RDB$INDEX_NAME) AS INDEX_NAME,
                    TRIM(I.RDB$RELATION_NAME) AS RELATION_NAME,
                    TRIM(COALESCE(R.RDB$OWNER_NAME, 'SYSDBA')) AS SCHEMA_NAME,
                    I.RDB$UNIQUE_FLAG AS IS_UNIQUE,
                    I.RDB$INDEX_TYPE AS INDEX_TYPE,
                    I.RDB$SYSTEM_FLAG AS SYSTEM_FLAG,
                    I.RDB$STATISTICS AS STATISTICS,
                    I.RDB$FOREIGN_KEY AS FOREIGN_KEY
                FROM RDB$INDICES I
                LEFT JOIN RDB$RELATIONS R ON R.RDB$RELATION_NAME = I.RDB$RELATION_NAME
                WHERE I.RDB$INDEX_NAME = UPPER(?)
                ${schemaName ? `AND R.RDB$OWNER_NAME = UPPER(?)` : ''}
            `;

            const params = schemaName ? [indexName, schemaName] : [indexName];
            const result = await this.executeQuery(connectionId, query, params);

            if (!result.success || !result.data || result.data.length === 0) {
                return {
                    success: false,
                    message: 'Indice no encontrado'
                };
            }

            const index = result.data[0];
            
            const fieldsQuery = `
                SELECT 
                    TRIM(S.RDB$FIELD_NAME) AS FIELD_NAME,
                    S.RDB$FIELD_POSITION AS FIELD_POSITION
                FROM RDB$INDEX_SEGMENTS S
                WHERE S.RDB$INDEX_NAME = UPPER(?)
                ORDER BY S.RDB$FIELD_POSITION
            `;
            
            const fieldsResult = await this.executeQuery(connectionId, fieldsQuery, [indexName]);
            const fields = fieldsResult.success ? fieldsResult.data : [];

            const ddl = this.buildIndexDDL(index, fields);

            return {
                success: true,
                data: ddl,
                message: 'DDL de índice generado exitosamente'
            };

        } catch (error: any) {
            return {
                success: false,
                message: 'Error al generar DDL de índice',
                error: { message: error.message }
            };
        }
    }

    //--------------------------------------------------------------------------------------------------------------------------------------
    // FUNCIONES AUXILIARES PARA CONSTRUIR DDL
    //--------------------------------------------------------------------------------------------------------------------------------------

    private async getTableIndexes(connectionId: string, tableName: string, schemaName: string = ''): Promise<any> {
        const query = `
            SELECT 
                TRIM(I.RDB$INDEX_NAME) AS INDEX_NAME,
                I.RDB$UNIQUE_FLAG AS IS_UNIQUE,
                I.RDB$INDEX_TYPE AS INDEX_TYPE
            FROM RDB$INDICES I
            LEFT JOIN RDB$RELATIONS R ON R.RDB$RELATION_NAME = I.RDB$RELATION_NAME
            WHERE I.RDB$RELATION_NAME = UPPER(?)
            AND (I.RDB$SYSTEM_FLAG IS NULL OR I.RDB$SYSTEM_FLAG = 0)
            ${schemaName ? `AND R.RDB$OWNER_NAME = UPPER(?)` : ''}
        `;

        const params = schemaName ? [tableName, schemaName] : [tableName];
        return this.executeQuery(connectionId, query, params);
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    private async getTableConstraints(connectionId: string, tableName: string, schemaName: string = ''): Promise<any> {
        const query = `
            SELECT 
                TRIM(RC.RDB$CONSTRAINT_NAME) AS CONSTRAINT_NAME,
                RC.RDB$CONSTRAINT_TYPE AS CONSTRAINT_TYPE,
                TRIM(RC.RDB$RELATION_NAME) AS RELATION_NAME,
                TRIM(RC.RDB$INDEX_NAME) AS INDEX_NAME,
                TRIM(RC.RDB$DEFERRABLE) AS DEFERRABLE,
                TRIM(RC.RDB$INITIALLY_DEFERRED) AS INITIALLY_DEFERRED
            FROM RDB$RELATION_CONSTRAINTS RC
            LEFT JOIN RDB$RELATIONS R ON R.RDB$RELATION_NAME = RC.RDB$RELATION_NAME
            WHERE RC.RDB$RELATION_NAME = UPPER(?)
            ${schemaName ? `AND R.RDB$OWNER_NAME = UPPER(?)` : ''}
        `;

        const params = schemaName ? [tableName, schemaName] : [tableName];
        return this.executeQuery(connectionId, query, params);
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    private buildTableDDL(tableName: string, schemaName: string, columns: any[], indexes: any[], constraints: any[]): string {
        // Firebird no necesita el esquema en el CREATE TABLE si es SYSDBA
        const schemaPrefix = schemaName && schemaName !== 'SYSDBA' ? `"${schemaName}".` : '';
        let ddl = `CREATE TABLE ${schemaPrefix}"${tableName}" (\n`;


        const columnDefinitions = columns.map(col => {
            let definition = `  "${col.name}" ${this.getFirebirdDataType(col)}`;

            // Si la columna tiene valor por defecto, no puede ser NOT NULL
            // Si no tiene valor por defecto y es NOT NULL, mantener NOT NULL
            if (!col.isNullable && !col.defaultValue) {
                definition += ' NOT NULL';
            }

            if (col.defaultValue) {
                // Manejar valores por defecto específicos de Firebird
                let defaultValue = col.defaultValue;
                const dataType = this.getFirebirdDataType(col);
                
                // Limpiar comillas extra si las hay
                if (typeof defaultValue === 'string') {
                    defaultValue = defaultValue.replace(/^['"]+|['"]+$/g, '');
                }
                
                // Convertir valores booleanos
                if (defaultValue === 'TRUE' || defaultValue === 'true') {
                    defaultValue = '1';
                } else if (defaultValue === 'FALSE' || defaultValue === 'false') {
                    defaultValue = '0';
                }
                
                // Manejar CURRENT_TIMESTAMP - Firebird no soporta esta función directamente
                if (defaultValue === 'CURRENT_TIMESTAMP') {
                    // Para Firebird, usar NULL en lugar de CURRENT_TIMESTAMP
                    defaultValue = 'NULL';
                }
                
                // Manejar NULL como string
                if (defaultValue === 'NULL' || defaultValue === 'null') {
                    defaultValue = 'NULL';
                }
                
                // Para campos VARCHAR/CHAR, TODOS los valores deben estar entre comillas
                if (dataType.startsWith('VARCHAR') || dataType.startsWith('CHAR')) {
                    if (defaultValue !== 'NULL') {
                        defaultValue = `'${defaultValue}'`;
                    }
                }
                
                // Para BLOB, también poner entre comillas si es string
                if (dataType === 'BLOB' && typeof defaultValue === 'string' && defaultValue !== 'NULL') {
                    defaultValue = `'${defaultValue}'`;
                }
                
                // Para campos numéricos, asegurar que no tengan comillas
                if (dataType.includes('INT') || dataType.includes('SMALLINT') || dataType.includes('BIGINT') || 
                    dataType.includes('FLOAT') || dataType.includes('DOUBLE')) {
                    if (typeof defaultValue === 'string' && defaultValue.startsWith("'")) {
                        defaultValue = defaultValue.replace(/^['"]+|['"]+$/g, '');
                    }
                }
                
                // Para campos TIMESTAMP, usar NULL por defecto
                if (dataType === 'TIMESTAMP') {
                    defaultValue = 'NULL';
                }
                
                definition += ` DEFAULT ${defaultValue}`;
            }

            return definition;
        });

        ddl += columnDefinitions.join(',\n');


        const primaryKeys = constraints.filter(c => c.CONSTRAINT_TYPE === 'PRIMARY KEY');
        const uniqueKeys = constraints.filter(c => c.CONSTRAINT_TYPE === 'UNIQUE');

        if (primaryKeys.length > 0) {
            ddl += ',\n  PRIMARY KEY (';
            const pkFields = this.getConstraintFields(columns, primaryKeys[0]);
            ddl += pkFields.map(f => `"${f}"`).join(', ');
            ddl += ')';
        }

        if (uniqueKeys.length > 0) {
            for (const uk of uniqueKeys) {
                ddl += ',\n  UNIQUE (';
                const ukFields = this.getConstraintFields(columns, uk);
                ddl += ukFields.map(f => `"${f}"`).join(', ');
                ddl += ')';
            }
        }

        ddl += '\n);\n';


        for (const index of indexes) {
            if (index.INDEX_NAME && !index.INDEX_NAME.startsWith('RDB$')) {
                const indexSchemaPrefix = schemaName && schemaName !== 'SYSDBA' ? `"${schemaName}".` : '';
                ddl += `\nCREATE ${index.IS_UNIQUE ? 'UNIQUE ' : ''}INDEX "${index.INDEX_NAME}" ON ${indexSchemaPrefix}"${tableName}" (`;
                
                // Aquí podrías agregar los campos del índice si los tienes disponibles
                ddl += '/* campos del índice - especificar manualmente */';
                ddl += ');\n';
            }
        }

        return ddl;
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    private buildFunctionDDL(func: any): string {
        let ddl = `CREATE FUNCTION ${func.OWNER_NAME ? `${func.OWNER_NAME}.` : ''}"${func.FUNCTION_NAME}" `;
        
        ddl += '()\n';

        if (func.RETURN_ARGUMENT) {
            ddl += `RETURNS ${this.getFirebirdDataType({ dataType: func.RETURN_ARGUMENT })}\n`;
        }
        
        ddl += 'AS\n';
        
        if (func.FUNCTION_SOURCE) {
            ddl += func.FUNCTION_SOURCE;
        } else {
            ddl += '/* Código de la función no disponible */';
        }
        
        return ddl;
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    private buildTriggerDDL(trigger: any): string {
        let ddl = `CREATE TRIGGER "${trigger.TRIGGER_NAME}" `;
        
        const triggerType = this.getTriggerType(trigger.TRIGGER_TYPE);
        ddl += `${triggerType} ON "${trigger.RELATION_NAME}"\n`;
        
        if (trigger.TRIGGER_INACTIVE) {
            ddl += 'INACTIVE\n';
        }
        
        
        if (trigger.TRIGGER_SOURCE) {
            ddl += trigger.TRIGGER_SOURCE;
        } else {
            ddl += '/* Código del trigger no disponible */';
        }
        
        return ddl;
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    private buildProcedureDDL(proc: any): string {
        let ddl = `CREATE PROCEDURE "${proc.PROCEDURE_NAME}" `;
        
        ddl += '()\n';
        
        ddl += 'AS\n';
        
        if (proc.PROCEDURE_SOURCE) {
            ddl += proc.PROCEDURE_SOURCE;
        } else {
            ddl += '/* Código del procedimiento no disponible */';
        }
        
        return ddl;
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    private buildViewDDL(view: any): string {
        let ddl = `CREATE VIEW "${view.VIEW_NAME}" `;
        
        ddl += 'AS\n';
        
        if (view.VIEW_SOURCE) {
            ddl += view.VIEW_SOURCE;
        } else {
            ddl += '/* Código de la vista no disponible */';
        }
        
        return ddl;
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    async generateSequenceDDL(connectionId: string, sequenceName: string, schemaName: string = ''): Promise<any> {
        try {
            if (!this.conexiones[connectionId]) {
                return {
                    success: false,
                    message: 'Conexion no encontrada'
                };
            }

            const query = `
                SELECT 
                    TRIM(G.RDB$GENERATOR_NAME) AS SEQUENCE_NAME,
                    TRIM(G.RDB$OWNER_NAME) AS OWNER_NAME,
                    G.RDB$DESCRIPTION AS DESCRIPTION,
                    G.RDB$SYSTEM_FLAG AS SYSTEM_FLAG
                FROM RDB$GENERATORS G
                WHERE G.RDB$GENERATOR_NAME = UPPER(?)
                ${schemaName ? `AND G.RDB$OWNER_NAME = UPPER(?)` : ''}
            `;

            const params = schemaName ? [sequenceName, schemaName] : [sequenceName];
            const result = await this.executeQuery(connectionId, query, params);

            if (!result.success || !result.data || result.data.length === 0) {
                return {
                    success: false,
                    message: 'Secuencia no encontrada'
                };
            }

            const seq = result.data[0];
            const ddl = this.buildSequenceDDL(seq);

            return {
                success: true,
                data: ddl,
                message: 'DDL de secuencia generado exitosamente'
            };

        } catch (error: any) {
            return {
                success: false,
                message: 'Error al generar DDL de secuencia',
                error: { message: error.message }
            };
        }
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    async generateUserDDL(connectionId: string, userName: string): Promise<any> {
        try {
            if (!this.conexiones[connectionId]) {
                return {
                    success: false,
                    message: 'Conexion no encontrada'
                };
            }

            const query = `
                SELECT 
                    TRIM(SEC$USER_NAME) AS USER_NAME,
                    SEC$ACTIVE AS ACTIVE,
                    TRIM(SEC$PLUGIN) AS PLUGIN,
                    TRIM(SEC$FIRST_NAME) AS FIRST_NAME,
                    TRIM(SEC$LAST_NAME) AS LAST_NAME
                FROM SEC$USERS
                WHERE SEC$USER_NAME = UPPER(?)
            `;

            const result = await this.executeQuery(connectionId, query, [userName]);

            if (!result.success || !result.data || result.data.length === 0) {
                return {
                    success: false,
                    message: 'Usuario no encontrado'
                };
            }

            const user = result.data[0];
            const ddl = this.buildUserDDL(user);

            return {
                success: true,
                data: ddl,
                message: 'DDL de usuario generado exitosamente'
            };

        } catch (error: any) {
            return {
                success: false,
                message: 'Error al generar DDL de usuario',
                error: { message: error.message }
            };
        }
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    private buildUserDDL(user: any): string {
        let ddl = `CREATE USER "${user.USER_NAME}"`;
        
        if (user.FIRST_NAME) {
            ddl += ` FIRSTNAME '${user.FIRST_NAME}'`;
        }
        
        if (user.LAST_NAME) {
            ddl += ` LASTNAME '${user.LAST_NAME}'`;
        }
        
        if (user.PLUGIN) {
            ddl += ` USING PLUGIN ${user.PLUGIN}`;
        }
        
        return ddl;
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    private buildSequenceDDL(seq: any): string {
        let ddl = `CREATE SEQUENCE "${seq.SEQUENCE_NAME}"`;
        return ddl;
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    private buildIndexDDL(index: any, fields: any[]): string {
        let ddl = `CREATE ${index.IS_UNIQUE ? 'UNIQUE ' : ''}INDEX "${index.INDEX_NAME}" `;
        ddl += `ON ${index.RELATION_NAME} (`;
        if (fields.length > 0) {
            ddl += fields.map(f => `"${f.FIELD_NAME}"`).join(', ');
        } else {
            ddl += '/* campos del indice */';
        }
        
        ddl += ');';
        
        return ddl;
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    private getFirebirdDataType(column: any): string {
        const typeCode = column.dataType;
        const maxLength = column.maxLength;
        const precision = column.precision;
        const scale = column.scale;

        let type = '';
        switch (typeCode) {
            case 7: type = 'SMALLINT'; break;
            case 8: type = 'INTEGER'; break;
            case 9: type = 'BIGINT'; break; // QUAD se mapea a BIGINT
            case 10: type = 'FLOAT'; break;
            case 11: type = 'DOUBLE PRECISION'; break; // D_FLOAT se mapea a DOUBLE PRECISION
            case 12: type = 'DATE'; break;
            case 13: type = 'TIME'; break;
            case 14: type = 'CHAR'; break;
            case 16: type = 'BIGINT'; break; // INT64 se mapea a BIGINT
            case 27: type = 'DOUBLE PRECISION'; break;
            case 35: type = 'TIMESTAMP'; break;
            case 37: type = 'VARCHAR'; break;
            case 40: type = 'VARCHAR'; break; // CSTRING se mapea a VARCHAR
            case 261: type = 'BLOB'; break;
            default: type = 'VARCHAR(255)'; break; // UNKNOWN se mapea a VARCHAR por defecto
        }

        if ((type === 'CHAR' || type === 'VARCHAR') && maxLength) {
            type += `(${maxLength})`;
        }

        if ((type === 'DECIMAL' || type === 'NUMERIC') && precision && scale !== undefined) {
            type += `(${precision},${scale})`;
        }

        return type;
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    private getTriggerType(type: number): string {
        switch (type) {
            case 1: return 'BEFORE INSERT';
            case 2: return 'AFTER INSERT';
            case 3: return 'BEFORE UPDATE';
            case 4: return 'AFTER UPDATE';
            case 5: return 'BEFORE DELETE';
            case 6: return 'AFTER DELETE';
            case 17: return 'BEFORE INSERT OR UPDATE';
            case 18: return 'AFTER INSERT OR UPDATE';
            case 25: return 'BEFORE INSERT OR DELETE';
            case 26: return 'AFTER INSERT OR DELETE';
            case 27: return 'BEFORE UPDATE OR DELETE';
            case 28: return 'AFTER UPDATE OR DELETE';
            case 113: return 'BEFORE INSERT OR UPDATE OR DELETE';
            case 114: return 'AFTER INSERT OR UPDATE OR DELETE';
            default: return 'UNKNOWN';
        }
    }

    //--------------------------------------------------------------------------------------------------------------------------------------

    private getConstraintFields(columns: any[], constraint: any): string[] {

        return [];
    }

    
    async alterTable(params: {
        connectionId: string;
        schemaName: string;
        tableName: string;
        alterationType: 'ADD_COLUMN' | 'DROP_COLUMN' | 'MODIFY_COLUMN' | 'RENAME_COLUMN' | 'RENAME_TABLE';
        columnDefinition?: ColumnDefinition;
        oldColumnName?: string;
        newColumnName?: string;
        newTableName?: string;
    }): Promise<TableOperationResponse> {
        try {
            const { connectionId, schemaName, tableName, alterationType } = params;

            if (!this.conexiones[connectionId]) {
                return {
                    success: false,
                    message: 'Conexión no encontrada'
                };
            }

            let sql = '';
            
            switch (alterationType) {
                case 'ADD_COLUMN':
                    if (!params.columnDefinition) {
                        return { success: false, message: 'Definición de columna requerida' };
                    }
                    sql = `ALTER TABLE ${schemaName ? `${schemaName}.` : ''}"${tableName}" ADD "${params.columnDefinition.name}" ${params.columnDefinition.type}`;
                    if (params.columnDefinition.length) {
                        sql += `(${params.columnDefinition.length})`;
                    }
                    if (!params.columnDefinition.nullable) {
                        sql += ' NOT NULL';
                    }
                    break;

                case 'DROP_COLUMN':
                    if (!params.oldColumnName) {
                        return { success: false, message: 'Nombre de columna requerido' };
                    }
                    sql = `ALTER TABLE ${schemaName ? `${schemaName}.` : ''}"${tableName}" DROP "${params.oldColumnName}"`;
                    break;

                case 'RENAME_TABLE':
                    if (!params.newTableName) {
                        return { success: false, message: 'Nuevo nombre de tabla requerido' };
                    }
                    sql = `ALTER TABLE ${schemaName ? `${schemaName}.` : ''}"${tableName}" TO "${params.newTableName}"`;
                    break;

                default:
                    return { success: false, message: 'Tipo de alteración no soportado' };
            }

            const result = await this.executeQuery(connectionId, sql);
            
            if (result.success) {
                return {
                    success: true,
                    message: `Tabla ${tableName} modificada exitosamente`,
                    sql: sql
                };
            } else {
                return {
                    success: false,
                    message: result.error || 'Error al modificar la tabla',
                    sql: sql
                };
            }

        } catch (error: any) {
            return {
                success: false,
                message: error.message || 'Error al modificar la tabla'
            };
        }
    }

}






module.exports = new databaseManager();