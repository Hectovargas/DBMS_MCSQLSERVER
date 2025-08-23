const DatabaseManager = require('./databaseManager_main');

class MetadataManager extends DatabaseManager {

    async getSchemas(connectionId: string): Promise<any> {
        try {
            const isHealthy = await this.checkConnectionHealth(connectionId);
            if (!isHealthy) {
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

            if (result.success && this.connections[connectionId]) {
                this.connections[connectionId].isConnected = true;
                this.connections[connectionId].config.isActive = true;
                this.connections[connectionId].lastUsed = new Date();
            }

            return result;
        } catch (error: any) {
            return {
                success: false,
                message: 'Error al obtener esquemas',
                error: { message: error.message }
            };
        }
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

        if (result.success && this.connections[connectionId]) {
            this.connections[connectionId].isConnected = true;
            this.connections[connectionId].config.isActive = true;
            this.connections[connectionId].lastUsed = new Date();
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


    async getTablesColumns(connectionId: string, tableName: string, schemaName: string = ''): Promise<any> {
        const query = `
            SELECT 
                TRIM(RF.RDB$FIELD_NAME) AS "name",                  
                F.RDB$FIELD_TYPE AS "dataType",                     
                F.RDB$FIELD_LENGTH AS "maxLength",                  
                F.RDB$FIELD_PRECISION AS "precision",               
                F.RDB$FIELD_SCALE AS "scale",                       
                CASE WHEN RF.RDB$NULL_FLAG = 1 THEN 0 ELSE 1 END AS "isNullable",
                CASE                                                       
                    WHEN RF.RDB$DEFAULT_SOURCE IS NULL THEN NULL            
                    WHEN CHAR_LENGTH(RF.RDB$DEFAULT_SOURCE) = 0 THEN NULL   
                    ELSE CAST(SUBSTRING(RF.RDB$DEFAULT_SOURCE FROM 9) AS VARCHAR(8000))      
                END AS "defaultValue",                                      
                CASE WHEN CPK.RDB$FIELD_NAME IS NOT NULL THEN 1 ELSE 0 END AS "isPrimaryKey",
                CASE WHEN CFK.RDB$FIELD_NAME IS NOT NULL THEN 1 ELSE 0 END AS "isForeignKey"
            FROM RDB$RELATION_FIELDS RF                             
            INNER JOIN RDB$RELATIONS R                              
                ON RF.RDB$RELATION_NAME = R.RDB$RELATION_NAME       
            INNER JOIN RDB$FIELDS F                                 
                ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME           
            LEFT JOIN (                                             
                SELECT S.RDB$FIELD_NAME, RC.RDB$RELATION_NAME       
                FROM RDB$RELATION_CONSTRAINTS RC                    
                INNER JOIN RDB$INDEX_SEGMENTS S                     
                    ON RC.RDB$INDEX_NAME = S.RDB$INDEX_NAME         
                WHERE RC.RDB$CONSTRAINT_TYPE = 'PRIMARY KEY'        
            ) CPK ON CPK.RDB$FIELD_NAME = RF.RDB$FIELD_NAME         
                AND CPK.RDB$RELATION_NAME = RF.RDB$RELATION_NAME    
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

        if (result.success && this.connections[connectionId]) {
            this.connections[connectionId].isConnected = true;       
            this.connections[connectionId].config.isActive = true;  
            this.connections[connectionId].lastUsed = new Date();   
        }

        return result; 
    }


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



    protected async getTableIndexes(connectionId: string, tableName: string, schemaName: string = ''): Promise<any> {
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


    protected async getTableConstraints(connectionId: string, tableName: string, schemaName: string = ''): Promise<any> {
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


    protected getConstraintFields(columns: any[], constraint: any): string[] {
        return columns.map(col => col.name);
    }
}

module.exports = MetadataManager;
