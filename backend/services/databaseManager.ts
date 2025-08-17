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

    //cuando se inicializa la clase se cargan todas las conexiones que el usuario a creado.
    constructor() {
        this.archivoConexiones = path.join(__dirname, '../data/connections.json');
        this.cargarConexiones();
    }


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

    // Crea la configuración de la conexion que se usara en el form de conexion. 
    private crearConfiguracionFirebird(config: FirebirdConnection): any {
        return {
            host: config.host, //host de siempre
            database: '/firebird/data/' + config.database, //ruta del archivo de la base de datos
            port: config.port || 3050,  //puerto
            user: config.username || 'SYSDBA', //usuario
            password: config.password || 'masterkey', //contraseña
            lowercase_keys: config.options?.lowercase_keys ?? false, //en caso de que en las opciones el nombre de las cosas se devuelvan en minusculas 
            role: config.options?.role, //en caso de que haya roles de usuario especifico
            pageSize: config.options?.pageSize || 4096, //tamaño de pagina
            retryConnectionInterval: config.options?.retryConnectionInterval || 1000, //tiempo de intervalos de reconexion automatica
            blobAsText: config.options?.blobAsText ?? false, //si los blob se devulevn como text o binario
            encoding: config.options?.encoding || 'UTF-8' //el encoding
        };
    }

    async testConnection(config: FirebirdConnection): Promise<FirebirdConnectionResponse> {
        try {

            //configuracion de la conexion que se le va a hacer (desde el formconexionc del frontend)
            const connectionConfig = {
                host: config.host,
                database: '/firebird/data/' + config.database,
                port: config.port || 3050,
                user: config.username || 'SYSDBA',
                password: config.password || 'masterkey'
            };

            return new Promise((resolve, reject) => {
                //se usa attach de node-firebird ya que me es util al solo querer probar la conexion, directa y temporal
                //la sintaxis es attach(config, callback)
                Firebird.attach(connectionConfig, (err: any, db: any) => {
                    if (err) {
                        resolve({
                            success: false,
                            message: 'Error de conexion',
                            error: { code: err.code, message: err.message }
                        });
                        return;
                    }

                    //se usa db.query del callback que dio el attach a la conexion,
                    // ya que el callback o nos devuleve un error o la base de datos (por asi decirlo) (err, db)
                    db.query('SELECT 1 as test FROM RDB$DATABASE', (err: any, result: any) => {
                        //el query simplemente le pide una constante a la base de datos, si la devuelve funca, si no no.
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

    /*
    Esta funcion es simple pero la mas importante, esta diseñada para ejecutar querys en la base de datos
    un ejemplo de uso seria 
    -await executeQuery("conn_123", "SELECT * FROM users");

   - await executeQuery("conn_123", "SELECT * FROM users WHERE id = ?", [42]);

   - await executeQuery("conn_123", "INSERT INTO users (name) VALUES (?)", ["efrain"]);
    */

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
                //agarramos el pool de la conexion de donde se hara la consulta
                connection.pool.get((err: any, db: any) => {
                    if (err) {
                        resolve({
                            success: false,
                            error: err.message
                        });
                        return;
                    }

                

                //registraos el comienzo de la consultaa
                    const startTime = Date.now(); 

                //ejecutamos la consulta en la base de datos obtenida del pool
                    db.query(query, parametrers || [], (err: any, result: any) => {

                        //registramos la duracion de la consulta
                        const executionTime = Date.now() - startTime;

                        //si la consulta no es valisda
                        if (err) {
                            db.detach();
                            resolve({
                                success: false,
                                error: err.message
                            });
                            return;
                        }

                        /*
                        esta parte se usa para procesar las columnas en caso de que sea un select
                            Consulta SQL: "SELECT ID, NAME, ACTIVE FROM USERS"
                                                    ↓
                            la base de datos  devuelve: [
                                { ID: 1, NAME: "Juan", ACTIVE: true },
                                { ID: 2, NAME: "andre", ACTIVE: false }
                            ]
                                                    ↓
                            result[0] = { ID: 1, NAME: "Juan", ACTIVE: true }
                                                    ↓
                            Object.keys(result[0]) = ["ID", "NAME", "ACTIVE"]
                                                    ↓
                            .map() procesa cada key:
                                "ID" → { name: "ID", type: typeof 1 } → { name: "ID", type: "number" }
                                "NAME" → { name: "NAME", type: typeof "Juan" } → { name: "NAME", type: "string" }
                                "ACTIVE" → { name: "ACTIVE", type: typeof true } → { name: "ACTIVE", type: "boolean" }
                                                    ↓
                            columns = [
                                { name: "ID", type: "number" },
                                { name: "NAME", type: "string" },
                                { name: "ACTIVE", type: "boolean" }
                            ]
                        */
                        let columns: { name: string; type: string }[] = [];
                        if (result && result.length > 0) {
                            columns = Object.keys(result[0]).map(key => ({name: key, type: typeof result[0][key]}));
                            
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

    async createTable(params: {
        connectionId: string; schemaName: string; tableName: string; columns: ColumnDefinition[];
    }): Promise<TableOperationResponse> {
        try {

            const { connectionId, schemaName, tableName, columns } = params;

            // si la conexión existe
            if (!this.conexiones[connectionId]) {
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




    private generateCreateTableSQL(schemaName: string, tableName: string, columns: ColumnDefinition[]): string {

        const columnDefinitions = columns.map(col => {
            let definition = `${col.name} ${col.type}`;

            if (col.length && (col.type === 'VARCHAR' || col.type === 'CHAR')) {
                definition += `(${col.length})`;
            }

            if (!col.nullable) {
                definition += ' NOT NULL';
            }

            if (col.defaultValue !== undefined) {
                definition += ` DEFAULT ${this.formatDefaultValue(col.defaultValue, col.type)}`;
            }

            if (col.unique) {
                definition += ' UNIQUE';
            }

            return definition;
        });

        const primaryKeys = columns.filter(col => col.primaryKey).map(col => col.name);

        let sql = `CREATE TABLE ${schemaName ? `${schemaName}.` : ''}"${tableName}" (\n`;
        sql += `  ${columnDefinitions.join(',\n  ')}`;

        // Agregar primary key si hay
        if (primaryKeys.length) {
            sql += `,\n  PRIMARY KEY (${primaryKeys.map(pk => `"${pk}"`).join(', ')})`;
        }

        sql += '\n);';

        return sql;
    }

    private formatDefaultValue(value: string, type: string): string {
        if (type.includes('CHAR') || type.includes('TEXT') ||
            type.includes('DATE') || type.includes('TIME')) {
            return `'${value.replace(/'/g, "''")}'`;
        }
        return value;
    }

    async checkTableExists(
        connectionId: string,
        schemaName: string,
        tableName: string
    ): Promise<{ success: boolean; exists: boolean; message?: string }> {
        try {
            const query = `
      SELECT 1 
      FROM RDB$RELATIONS 
      WHERE RDB$RELATION_NAME = UPPER(?)
      ${schemaName ? `AND RDB$OWNER_NAME = UPPER(?)` : ''}
    `;

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

    async getSupportedDataTypes(connectionId: string): Promise<any> {
        // Tipos de datos básicos de Firebird
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

}

module.exports = new databaseManager();