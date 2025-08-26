const DatabaseManager = require('./databaseManager_main');

class MetadataManager extends DatabaseManager {

    async getTables(connectionId: string): Promise<any> {
        let query = `
        
            SELECT 
            RDB$RELATION_NAME as TABLE_NAME
            FROM RDB$RELATIONS 
            WHERE RDB$VIEW_BLR IS NULL 
            AND (RDB$SYSTEM_FLAG IS NULL OR RDB$SYSTEM_FLAG = 0)
            ORDER BY RDB$RELATION_NAME
        `;

        const result = await this.executeQuery(connectionId, query);

        if (result.success && this.connections[connectionId]) {
            this.connections[connectionId].isConnected = true;
            this.connections[connectionId].config.isActive = true;
            this.connections[connectionId].lastUsed = new Date();
        }

        return result;
    }


    async getViews(connectionId: string): Promise<any> {
        let query = `
            SELECT 
            RDB$RELATION_NAME AS VIEW_NAME
            FROM RDB$RELATIONS 
            WHERE RDB$VIEW_BLR IS NOT NULL 
            AND (RDB$SYSTEM_FLAG IS NULL OR RDB$SYSTEM_FLAG = 0)
            ORDER BY RDB$RELATION_NAME
        `;

        return this.executeQuery(connectionId, query);
    }


    async getProcedures(connectionId: string): Promise<any> {
        let query = `
            SELECT 
            RDB$PROCEDURE_NAME AS PROCEDURE_NAME
            FROM RDB$PROCEDURES 
            WHERE (RDB$SYSTEM_FLAG IS NULL OR RDB$SYSTEM_FLAG = 0)
            AND RDB$PACKAGE_NAME IS NULL
            ORDER BY RDB$PROCEDURE_NAME
        `;


        return this.executeQuery(connectionId, query);
    }


    async getFunctions(connectionId: string): Promise<any> {
        let query = `
        SELECT 
        RDB$FUNCTION_NAME AS FUNCTION_NAME
        FROM RDB$FUNCTIONS 
        WHERE (RDB$SYSTEM_FLAG IS NULL OR RDB$SYSTEM_FLAG = 0)
        AND RDB$PACKAGE_NAME IS NULL
        ORDER BY RDB$FUNCTION_NAME  
        `;

        return this.executeQuery(connectionId, query);
    }

    async getPackages(connectionId: string): Promise<any> {
        try {
            if (!this.connections[connectionId]) {
                return {
                    success: false,
                    message: 'Conexión no encontrada'
                };
            }

            let query = `
                    SELECT 
                    RDB$PACKAGE_NAME AS PACKAGE_NAME
                    FROM RDB$PACKAGES 
                    WHERE (RDB$SYSTEM_FLAG IS NULL OR RDB$SYSTEM_FLAG = 0)
                    ORDER BY RDB$PACKAGE_NAME
                `;


            const result = await this.executeQuery(connectionId, query);

            return {
                success: true,
                data: result.data || [],
                message: `Se encontraron ${result.data ? result.data.length : 0} paquetes`
            };
        } catch (error: any) {
            return {
                success: false,
                message: 'Error al obtener paquetes',
                error: { message: error.message }
            };
        }
    }

    async getSequences(connectionId: string): Promise<any> {
        const query = `
            SELECT 
            RDB$GENERATOR_NAME AS SEQUENCE_NAME
            FROM RDB$GENERATORS
            WHERE (RDB$SYSTEM_FLAG IS NULL OR RDB$SYSTEM_FLAG = 0)
            ORDER BY RDB$GENERATOR_NAME
        `;

        return this.executeQuery(connectionId, query);
    }


    async getTriggers(connectionId: string): Promise<any> {
        let query = `
            SELECT 
            RDB$TRIGGER_NAME AS TRIGGER_NAME
            FROM RDB$TRIGGERS 
            WHERE (RDB$SYSTEM_FLAG IS NULL OR RDB$SYSTEM_FLAG = 0)
            ORDER BY RDB$TRIGGER_NAME
        `;

        return this.executeQuery(connectionId, query);
    }


    async getIndexes(connectionId: string): Promise<any> {
        let query = `
            SELECT 
            I.RDB$INDEX_NAME AS INDEX_NAME
            FROM RDB$INDICES I
            LEFT JOIN RDB$RELATIONS R ON R.RDB$RELATION_NAME = I.RDB$RELATION_NAME
            WHERE (I.RDB$SYSTEM_FLAG IS NULL OR I.RDB$SYSTEM_FLAG = 0)
            ORDER BY I.RDB$INDEX_NAME 
        `;
        return this.executeQuery(connectionId, query);
    }


    async getUsers(connectionId: string): Promise<any> {
        const query = `
            SELECT 
            SEC$USER_NAME AS USER_NAME
            FROM SEC$USERS
            ORDER BY SEC$USER_NAME
        `;
        return this.executeQuery(connectionId, query);
    }


    async getTablesColumns(connectionId: string, tableName: string): Promise<any> {
        const query = `
            SELECT 
                TRIM(RF.RDB$FIELD_NAME) AS "name",                  
                F.RDB$FIELD_TYPE AS "dataType",                     
                F.RDB$FIELD_LENGTH AS "maxLength",                  
                F.RDB$FIELD_PRECISION AS "precision",               
                F.RDB$FIELD_SCALE AS "scale",                       
                CASE WHEN RF.RDB$NULL_FLAG = 1 THEN 0 ELSE 1 END AS "isNullable",
                
                
                CASE WHEN RF.RDB$DEFAULT_SOURCE IS NULL THEN NULL            
                    ELSE CAST(SUBSTRING(RF.RDB$DEFAULT_SOURCE FROM 9) AS VARCHAR(8000))      
                END AS "defaultValue", 
                
                CASE WHEN EXISTS (
                    SELECT 1 FROM RDB$RELATION_CONSTRAINTS RC
                    INNER JOIN RDB$INDEX_SEGMENTS S ON RC.RDB$INDEX_NAME = S.RDB$INDEX_NAME
                    WHERE RC.RDB$RELATION_NAME = RF.RDB$RELATION_NAME
                    AND RC.RDB$CONSTRAINT_TYPE = 'PRIMARY KEY'
                    AND S.RDB$FIELD_NAME = RF.RDB$FIELD_NAME
                ) THEN 1 ELSE 0 END AS "isPrimaryKey",
                
                CASE WHEN EXISTS (
                    SELECT 1 FROM RDB$RELATION_CONSTRAINTS RC
                    INNER JOIN RDB$INDEX_SEGMENTS S ON RC.RDB$INDEX_NAME = S.RDB$INDEX_NAME
                    WHERE RC.RDB$RELATION_NAME = RF.RDB$RELATION_NAME
                    AND RC.RDB$CONSTRAINT_TYPE = 'FOREIGN KEY'
                    AND S.RDB$FIELD_NAME = RF.RDB$FIELD_NAME
                ) THEN 1 ELSE 0 END AS "isForeignKey"

            FROM RDB$RELATION_FIELDS RF INNER JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
            WHERE RF.RDB$RELATION_NAME = UPPER(?)                  
            ORDER BY RF.RDB$FIELD_POSITION                          
        `;

        const result = await this.executeQuery(connectionId, query, tableName);
        console.log(result)

        if (result.success && this.connections[connectionId]) {
            this.connections[connectionId].isConnected = true;
            this.connections[connectionId].config.isActive = true;
            this.connections[connectionId].lastUsed = new Date();
        }

        return result;
    }



    protected async getTableIndexes(connectionId: string, tableName: string): Promise<any> {
        const query = `
            SELECT 
            TRIM(I.RDB$INDEX_NAME) AS INDEX_NAME
            FROM RDB$INDICES I
            LEFT JOIN RDB$RELATIONS R ON R.RDB$RELATION_NAME = I.RDB$RELATION_NAME
            WHERE I.RDB$RELATION_NAME = UPPER(?)
            AND (I.RDB$SYSTEM_FLAG IS NULL OR I.RDB$SYSTEM_FLAG = 0);
        `;

        const params = tableName;
        return this.executeQuery(connectionId, query, params);
    }


     async getTableConstraints(connectionId: string, tableName: string): Promise<any> {
        const query = `
                SELECT 
                    RC.RDB$CONSTRAINT_NAME AS CONSTRAINT_NAME,
                    RC.RDB$CONSTRAINT_TYPE AS CONSTRAINT_TYPE,
                    RC.RDB$RELATION_NAME AS RELATION_NAME,
                    RC.RDB$INDEX_NAME AS INDEX_NAME,
                    
                    REF.RDB$RELATION_NAME AS REFERENCED_TABLE_NAME,
                    REF.RDB$INDEX_NAME AS REFERENCED_INDEX_NAME,
                    
                    (SELECT LIST(ISG.RDB$FIELD_NAME)
                        FROM RDB$INDEX_SEGMENTS ISG
                        WHERE ISG.RDB$INDEX_NAME = RC.RDB$INDEX_NAME
                        ORDER BY ISG.RDB$FIELD_POSITION
                    ) AS COLUMN_NAMES,
                    
                    CASE WHEN RC.RDB$CONSTRAINT_TYPE = 'FOREIGN KEY' THEN
                        (
                            SELECT LIST(ISG_REF.RDB$FIELD_NAME)
                            FROM RDB$INDEX_SEGMENTS ISG_REF
                            WHERE ISG_REF.RDB$INDEX_NAME = REF.RDB$INDEX_NAME
                            ORDER BY ISG_REF.RDB$FIELD_POSITION
                        )
                    ELSE NULL END AS REFERENCED_COLUMN_NAMES
                    
                FROM RDB$RELATION_CONSTRAINTS RC
                            
                LEFT JOIN RDB$REF_CONSTRAINTS REFC 
                ON RC.RDB$CONSTRAINT_NAME = REFC.RDB$CONSTRAINT_NAME
                LEFT JOIN RDB$RELATION_CONSTRAINTS REF 
                ON REFC.RDB$CONST_NAME_UQ = REF.RDB$CONSTRAINT_NAME
                            
                WHERE RC.RDB$RELATION_NAME = UPPER(?)
                ORDER BY RC.RDB$CONSTRAINT_TYPE, RC.RDB$CONSTRAINT_NAME;
        `;

        return this.executeQuery(connectionId, query, tableName);
    }


    protected getConstraintFields(columns: any[], constraint: any): string[] {
        try {
            if (constraint.COLUMN_NAMES) {
                return constraint.COLUMN_NAMES.split(',').map((name: string) => name.trim());
            }
            return columns.map(col => col.name);
        } catch (error) {
            return columns.map(col => col.name);
        }
    }
}

module.exports = MetadataManager;
