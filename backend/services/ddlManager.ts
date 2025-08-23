const OperationsManager = require('./operationsManager');



class DDLManager extends OperationsManager {
    

    async generateTableDDL(connectionId: string, tableName: string, schemaName: string = ''): Promise<any> {
        try {
            if (!this.connections[connectionId]) {
                return {
                    success: false,
                    message: 'Conexión no encontrada'
                };
            }

            const columnsResult = await this.getTablesColumns(connectionId, tableName, schemaName);
            if (!columnsResult.success) {
                return columnsResult;
            }

            const indexesResult = await this.getTableIndexes(connectionId, tableName, schemaName);
            const indexes = indexesResult.success ? indexesResult.data : [];

            const constraintsResult = await this.getTableConstraints(connectionId, tableName, schemaName);
            const constraints = constraintsResult.success ? constraintsResult.data : [];

            const ddl = await this.buildTableDDL(connectionId, tableName, schemaName, columnsResult.data, indexes, constraints);

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


    async generateViewDDL(connectionId: string, viewName: string, schemaName: string = ''): Promise<any> {
        try {
            if (!this.connections[connectionId]) {
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


    async generateFunctionDDL(connectionId: string, functionName: string, schemaName: string = ''): Promise<any> {
        try {
            if (!this.connections[connectionId]) {
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


    async generateProcedureDDL(connectionId: string, procedureName: string, schemaName: string = ''): Promise<any> {
        try {
            if (!this.connections[connectionId]) {
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


    async generateTriggerDDL(connectionId: string, triggerName: string, schemaName: string = ''): Promise<any> {
        try {
            if (!this.connections[connectionId]) {
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


    async generateIndexDDL(connectionId: string, indexName: string, schemaName: string = ''): Promise<any> {
        try {
            if (!this.connections[connectionId]) {
                return {
                    success: false,
                    message: 'Conexión no encontrada'
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
                    message: 'Índice no encontrado'
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


    private async buildTableDDL(connectionId: string, tableName: string, schemaName: string, columns: any[], indexes: any[], constraints: any[]): Promise<string> {
        const schemaPrefix = schemaName && schemaName !== 'SYSDBA' ? `"${schemaName}".` : '';
        
        // Encabezado con comentarios
        let ddl = `-- ${tableName} definition\n\n`;
        ddl += `-- Drop table\n\n`;
        ddl += `-- DROP TABLE ${schemaPrefix}"${tableName}";\n\n`;
        
        // CREATE TABLE
        ddl += `CREATE TABLE ${schemaPrefix}"${tableName}" (\n`;

        const columnDefinitions = columns.map(col => {
            let definition = `\t"${col.name}" ${this.getFirebirdDataType(col)}`;

            if (!col.isNullable && !col.defaultValue) {
                definition += ' NOT NULL';
            }

            if (col.defaultValue) {
                let defaultValue = col.defaultValue;
                const dataType = this.getFirebirdDataType(col);
                
                if (typeof defaultValue === 'string') {
                    defaultValue = defaultValue.replace(/^['"]+|['"]+$/g, '');
                }
                
                if (defaultValue === 'TRUE' || defaultValue === 'true') {
                    defaultValue = '1';
                } else if (defaultValue === 'FALSE' || defaultValue === 'false') {
                    defaultValue = '0';
                }
                
                if (defaultValue === 'CURRENT_TIMESTAMP') {
                    defaultValue = 'NULL';
                }
                
                if (defaultValue === 'NULL' || defaultValue === 'null') {
                    defaultValue = 'NULL';
                }
                
                if (dataType.startsWith('VARCHAR') || dataType.startsWith('CHAR')) {
                    if (defaultValue !== 'NULL') {
                        defaultValue = `'${defaultValue}'`;
                    }
                }
                
                if (dataType === 'BLOB' && typeof defaultValue === 'string' && defaultValue !== 'NULL') {
                    defaultValue = `'${defaultValue}'`;
                }
                
                if (dataType.includes('INT') || dataType.includes('SMALLINT') || dataType.includes('BIGINT') || 
                    dataType.includes('FLOAT') || dataType.includes('DOUBLE')) {
                    if (typeof defaultValue === 'string' && defaultValue.startsWith("'")) {
                        defaultValue = defaultValue.replace(/^['"]+|['"]+$/g, '');
                    }
                }
                
                if (dataType === 'TIMESTAMP') {
                    defaultValue = 'NULL';
                }
                
                definition += ` DEFAULT ${defaultValue}`;
            }

            return definition;
        });

        ddl += columnDefinitions.join(',\n');

        // Agregar restricciones de tabla
        const primaryKeys = constraints.filter(c => c.CONSTRAINT_TYPE === 'PRIMARY KEY');
        const uniqueKeys = constraints.filter(c => c.CONSTRAINT_TYPE === 'UNIQUE');
        const foreignKeys = constraints.filter(c => c.CONSTRAINT_TYPE === 'FOREIGN KEY');

        if (primaryKeys.length > 0) {
            ddl += ',\n\tCONSTRAINT ';
            const pkFields = this.getConstraintFields(columns, primaryKeys[0]);
            if (primaryKeys[0].CONSTRAINT_NAME) {
                ddl += `"${primaryKeys[0].CONSTRAINT_NAME}" `;
            } else {
                ddl += `INTEG_${Math.floor(Math.random() * 1000)} `;
            }
            ddl += 'PRIMARY KEY (';
            ddl += pkFields.map((f: any) => `"${f}"`).join(', ');
            ddl += ')';
        }

        if (uniqueKeys.length > 0) {
            for (const uk of uniqueKeys) {
                ddl += ',\n\tCONSTRAINT ';
                if (uk.CONSTRAINT_NAME) {
                    ddl += `"${uk.CONSTRAINT_NAME}" `;
                } else {
                    ddl += `INTEG_${Math.floor(Math.random() * 1000)} `;
                }
                ddl += 'UNIQUE (';
                const ukFields = this.getConstraintFields(columns, uk);
                ddl += ukFields.map((f: any) => `"${f}"`).join(', ');
                ddl += ')';
            }
        }

        ddl += '\n);\n';

        // Agregar índices
        for (const index of indexes) {
            if (index.INDEX_NAME && !index.INDEX_NAME.startsWith('RDB$')) {
                const indexSchemaPrefix = schemaName && schemaName !== 'SYSDBA' ? `"${schemaName}".` : '';
                ddl += `CREATE ${index.IS_UNIQUE ? 'UNIQUE ' : ''}INDEX "${index.INDEX_NAME}" ON ${indexSchemaPrefix}"${tableName}" (`;
                
                // Obtener los campos del índice
                const indexFields = await this.getIndexFields(connectionId, index.INDEX_NAME);
                if (indexFields && indexFields.length > 0) {
                    ddl += indexFields.map((field: any) => `"${field.FIELD_NAME}"`).join(', ');
                } else {
                    ddl += '/* campos del índice - especificar manualmente */';
                }
                
                ddl += ');\n';
            }
        }

        // Agregar restricciones de clave foránea
        if (foreignKeys.length > 0) {
            ddl += `\n-- ${tableName} foreign keys\n\n`;
            
            for (const fk of foreignKeys) {
                const fkFields = this.getConstraintFields(columns, fk);
                const referencedTable = fk.REFERENCED_TABLE_NAME || '/* tabla referenciada */';
                const referencedFields = fk.REFERENCED_COLUMN_NAMES ? 
                    fk.REFERENCED_COLUMN_NAMES.split(',').map((f: string) => `"${f.trim()}"`).join(', ') : 
                    '/* campos referenciados */';
                
                ddl += `ALTER TABLE ${schemaPrefix}"${tableName}" ADD CONSTRAINT `;
                if (fk.CONSTRAINT_NAME) {
                    ddl += `"${fk.CONSTRAINT_NAME}" `;
                } else {
                    ddl += `FK_${Math.floor(Math.random() * 1000)} `;
                }
                ddl += `FOREIGN KEY (${fkFields.map((f: any) => `"${f}"`).join(', ')}) `;
                ddl += `REFERENCES ${referencedTable}(${referencedFields});\n`;
            }
        }

        return ddl;
    }

    /**
     * Construye el DDL de una función
     */
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

    /**
     * Construye el DDL de un trigger
     */
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

    /**
     * Construye el DDL de un procedimiento
     */
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

    /**
     * Construye el DDL de una vista
     */
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

    /**
     * Construye el DDL de un índice
     */
    private buildIndexDDL(index: any, fields: any[]): string {
        let ddl = `CREATE ${index.IS_UNIQUE ? 'UNIQUE ' : ''}INDEX "${index.INDEX_NAME}" `;
        ddl += `ON ${index.RELATION_NAME} (`;
        if (fields.length > 0) {
            ddl += fields.map(f => `"${f.FIELD_NAME}"`).join(', ');
        } else {
            ddl += '/* campos del índice */';
        }
        
        ddl += ');';
        
        return ddl;
    }

    // ============================================================================
    // FUNCIONES AUXILIARES
    // ============================================================================

    /**
     * Mapea los tipos de datos de Firebird a nombres legibles
     */
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

    /**
     * Obtiene los campos de un índice específico
     */
    private async getIndexFields(connectionId: string, indexName: string): Promise<any[]> {
        try {
            const query = `
                SELECT 
                    TRIM(S.RDB$FIELD_NAME) AS FIELD_NAME,
                    S.RDB$FIELD_POSITION AS FIELD_POSITION
                FROM RDB$INDEX_SEGMENTS S
                WHERE S.RDB$INDEX_NAME = UPPER(?)
                ORDER BY S.RDB$FIELD_POSITION
            `;
            
            const result = await this.executeQuery(connectionId, query, [indexName]);
            return result.success ? result.data : [];
        } catch (error) {
            return [];
        }
    }

    /**
     * Obtiene el tipo de trigger basado en el código numérico
     */
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

    /**
     * Lista todas las secuencias disponibles (método de debug)
     */
    async listAllSequences(connectionId: string): Promise<any> {
        try {
            if (!this.connections[connectionId]) {
                return {
                    success: false,
                    message: 'Conexión no encontrada'
                };
            }

            const query = `
                SELECT 
                    TRIM(G.RDB$GENERATOR_NAME) AS SEQUENCE_NAME,
                    G.RDB$DESCRIPTION AS DESCRIPTION,
                    G.RDB$GENERATOR_ID AS GENERATOR_ID,
                    G.RDB$SYSTEM_FLAG AS SYSTEM_FLAG
                FROM RDB$GENERATORS G
                WHERE (G.RDB$SYSTEM_FLAG IS NULL OR G.RDB$SYSTEM_FLAG = 0)
                ORDER BY G.RDB$GENERATOR_NAME
            `;

            const result = await this.executeQuery(connectionId, query);

            return {
                success: true,
                data: result.data || [],
                message: `Se encontraron ${result.data ? result.data.length : 0} secuencias`
            };

        } catch (error: any) {
            return {
                success: false,
                message: 'Error al listar secuencias',
                error: { message: error.message }
            };
        }
    }

    /**
     * Genera el DDL para crear un paquete (implementación nativa para Firebird)
     */
    async generatePackageDDL(connectionId: string, packageName: string, schemaName: string = ''): Promise<any> {
        try {
            if (!this.connections[connectionId]) {
                return {
                    success: false,
                    message: 'Conexión no encontrada'
                };
            }

            // Intentar obtener información del paquete con una consulta más específica
            let query = `
                SELECT 
                    TRIM(P.RDB$PACKAGE_NAME) AS PACKAGE_NAME,
                    CAST(P.RDB$PACKAGE_HEADER_SOURCE AS VARCHAR(8000)) AS HEADER_SOURCE,
                    CAST(P.RDB$PACKAGE_BODY_SOURCE AS VARCHAR(8000)) AS BODY_SOURCE,
                    P.RDB$DESCRIPTION AS DESCRIPTION,
                    P.RDB$SYSTEM_FLAG AS SYSTEM_FLAG,
                    P.RDB$SECURITY_CLASS AS SECURITY_CLASS,
                    P.RDB$OWNER_NAME AS OWNER_NAME
                FROM RDB$PACKAGES P
                WHERE P.RDB$PACKAGE_NAME = UPPER(?)
                AND (P.RDB$SYSTEM_FLAG IS NULL OR P.RDB$SYSTEM_FLAG = 0)
                ${schemaName ? `AND P.RDB$OWNER_NAME = UPPER(?)` : ''}
            `;

            const params = schemaName ? [packageName, schemaName] : [packageName];
            let result = await this.executeQuery(connectionId, query, params);

            if (!result.success || !result.data || result.data.length === 0) {
                return {
                    success: false,
                    message: 'Paquete no encontrado'
                };
            }

            const packageInfo = result.data[0];
            
            // Si no hay código fuente o está vacío, intentar con una consulta alternativa
            if ((!packageInfo.HEADER_SOURCE || packageInfo.HEADER_SOURCE.trim() === '') && 
                (!packageInfo.BODY_SOURCE || packageInfo.BODY_SOURCE.trim() === '')) {
                
                // Intentar obtener el código fuente usando una consulta diferente
                const altQuery = `
                    SELECT 
                        TRIM(P.RDB$PACKAGE_NAME) AS PACKAGE_NAME,
                        P.RDB$PACKAGE_HEADER_SOURCE AS HEADER_SOURCE_RAW,
                        P.RDB$PACKAGE_BODY_SOURCE AS BODY_SOURCE_RAW,
                        P.RDB$DESCRIPTION AS DESCRIPTION,
                        P.RDB$OWNER_NAME AS OWNER_NAME
                    FROM RDB$PACKAGES P
                    WHERE P.RDB$PACKAGE_NAME = UPPER(?)
                    AND (P.RDB$SYSTEM_FLAG IS NULL OR P.RDB$SYSTEM_FLAG = 0)
                    ${schemaName ? `AND P.RDB$OWNER_NAME = UPPER(?)` : ''}
                `;
                
                const altResult = await this.executeQuery(connectionId, altQuery, params);
                if (altResult.success && altResult.data && altResult.data.length > 0) {
                    const altPackageInfo = altResult.data[0];
                    packageInfo.HEADER_SOURCE = altPackageInfo.HEADER_SOURCE_RAW;
                    packageInfo.BODY_SOURCE = altPackageInfo.BODY_SOURCE_RAW;
                }
            }
            
            const ddl = this.buildPackageDDL(packageInfo);

            return {
                success: true,
                data: ddl,
                message: 'DDL de paquete generado exitosamente'
            };

        } catch (error: any) {
            return {
                success: false,
                message: 'Error al generar DDL de paquete',
                error: { message: error.message }
            };
        }
    }

    async generateSequenceDDL(connectionId: string, sequenceName: string, schemaName: string = ''): Promise<any> {
        try {
            if (!this.connections[connectionId]) {
                return {
                    success: false,
                    message: 'Conexión no encontrada'
                };
            }

            const query = `
                SELECT 
                    TRIM(G.RDB$GENERATOR_NAME) AS SEQUENCE_NAME,
                    'SYSDBA' AS SCHEMA_NAME,
                    G.RDB$DESCRIPTION AS DESCRIPTION,
                    G.RDB$GENERATOR_ID AS GENERATOR_ID,
                    G.RDB$SYSTEM_FLAG AS SYSTEM_FLAG
                FROM RDB$GENERATORS G
                WHERE G.RDB$GENERATOR_NAME = UPPER(?)
                AND (G.RDB$SYSTEM_FLAG IS NULL OR G.RDB$SYSTEM_FLAG = 0)
            `;

            const params = [sequenceName];
            const result = await this.executeQuery(connectionId, query, params);

            if (!result.success || !result.data || result.data.length === 0) {
                return {
                    success: false,
                    message: 'Secuencia no encontrada'
                };
            }

            const sequence = result.data[0];
            const ddl = this.buildSequenceDDL(sequence);

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


    private buildSequenceDDL(sequence: any): string {
        let ddl = `CREATE SEQUENCE "${sequence.SEQUENCE_NAME}"`;
        
        if (sequence.DESCRIPTION) {
            ddl += `\n/* ${sequence.DESCRIPTION} */`;
        }
        
        ddl += ';';
        
        return ddl;
    }

    /**
     * Construye el DDL de un paquete
     */
    private buildPackageDDL(packageInfo: any): string {
        let ddl = `-- ========================================\n`;
        ddl += `-- PAQUETE: ${packageInfo.PACKAGE_NAME}\n`;
        ddl += `-- ========================================\n\n`;
        
        // Agregar descripción si existe
        if (packageInfo.DESCRIPTION) {
            ddl += `-- Descripción: ${packageInfo.DESCRIPTION}\n`;
            ddl += `-- Propietario: ${packageInfo.OWNER_NAME || 'SYSDBA'}\n\n`;
        }
        
        // Agregar header del paquete (especificación)
        if (packageInfo.HEADER_SOURCE && packageInfo.HEADER_SOURCE.trim() !== '') {
            ddl += `-- ESPECIFICACIÓN DEL PAQUETE (HEADER)\n`;
            ddl += `-- ========================================\n`;
            ddl += packageInfo.HEADER_SOURCE;
            ddl += `\n\n`;
        }
        
        // Agregar body del paquete (implementación)
        if (packageInfo.BODY_SOURCE && packageInfo.BODY_SOURCE.trim() !== '') {
            ddl += `-- IMPLEMENTACIÓN DEL PAQUETE (BODY)\n`;
            ddl += `-- ========================================\n`;
            ddl += packageInfo.BODY_SOURCE;
            ddl += `\n\n`;
        }
        
        // Si no hay código fuente disponible o está vacío
        if ((!packageInfo.HEADER_SOURCE || packageInfo.HEADER_SOURCE.trim() === '') && 
            (!packageInfo.BODY_SOURCE || packageInfo.BODY_SOURCE.trim() === '')) {
            ddl += `-- Código fuente del paquete no disponible\n`;
            ddl += `-- El paquete puede estar compilado o no tener código fuente\n`;
            ddl += `-- Para ver el código fuente, use herramientas como isql o FlameRobin\n\n`;
        }
        
        ddl += `-- FIN DEL PAQUETE ${packageInfo.PACKAGE_NAME}\n`;
        ddl += `-- ========================================\n`;
        
        return ddl;
    }


    async generateUserDDL(connectionId: string, userName: string): Promise<any> {
        try {
            if (!this.connections[connectionId]) {
                return {
                    success: false,
                    message: 'Conexión no encontrada'
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

    /**
     * Construye el DDL de un usuario
     */
    private buildUserDDL(user: any): string {
        let ddl = `CREATE USER "${user.USER_NAME}"`;
        
        if (user.FIRST_NAME || user.LAST_NAME) {
            ddl += `\nFIRSTNAME '${user.FIRST_NAME || ''}'`;
            ddl += `\nLASTNAME '${user.LAST_NAME || ''}'`;
        }
        
        ddl += ';';
        
        return ddl;
    }

    /**
     * Obtiene todos los paquetes de un esquema (implementación nativa para Firebird)
     */
    async getPackages(connectionId: string, schemaName: string = ''): Promise<any> {
        try {
            if (!this.connections[connectionId]) {
                return {
                    success: false,
                    message: 'Conexión no encontrada'
                };
            }

            // Firebird tiene soporte nativo para paquetes usando RDB$PACKAGES
            // Primero probamos una consulta simple para ver si hay paquetes
            let query;
            if (schemaName) {
                query = `
                    SELECT 
                        'PACKAGE' AS OBJECT_TYPE,
                        TRIM(COALESCE(P.RDB$OWNER_NAME, 'SYSDBA')) AS SCHEMA_NAME,
                        TRIM(P.RDB$PACKAGE_NAME) AS PACKAGE_NAME,
                        CAST(P.RDB$PACKAGE_HEADER_SOURCE AS VARCHAR(8000)) AS HEADER_SOURCE,
                        CAST(P.RDB$PACKAGE_BODY_SOURCE AS VARCHAR(8000)) AS BODY_SOURCE,
                        P.RDB$DESCRIPTION AS DESCRIPTION,
                        P.RDB$SYSTEM_FLAG AS SYSTEM_FLAG,
                        P.RDB$SECURITY_CLASS AS SECURITY_CLASS,
                        P.RDB$OWNER_NAME AS OWNER_NAME
                    FROM RDB$PACKAGES P
                    WHERE (P.RDB$SYSTEM_FLAG IS NULL OR P.RDB$SYSTEM_FLAG = 0)
                    AND P.RDB$OWNER_NAME = UPPER(?)
                    ORDER BY P.RDB$PACKAGE_NAME
                `;
            } else {
                // Consulta más simple para ver todos los paquetes
                query = `
                    SELECT 
                        'PACKAGE' AS OBJECT_TYPE,
                        TRIM(COALESCE(P.RDB$OWNER_NAME, 'SYSDBA')) AS SCHEMA_NAME,
                        TRIM(P.RDB$PACKAGE_NAME) AS PACKAGE_NAME,
                        CAST(P.RDB$PACKAGE_HEADER_SOURCE AS VARCHAR(8000)) AS HEADER_SOURCE,
                        CAST(P.RDB$PACKAGE_BODY_SOURCE AS VARCHAR(8000)) AS BODY_SOURCE,
                        P.RDB$DESCRIPTION AS DESCRIPTION,
                        P.RDB$SYSTEM_FLAG AS SYSTEM_FLAG,
                        P.RDB$SECURITY_CLASS AS SECURITY_CLASS,
                        P.RDB$OWNER_NAME AS OWNER_NAME
                    FROM RDB$PACKAGES P
                    WHERE (P.RDB$SYSTEM_FLAG IS NULL OR P.RDB$SYSTEM_FLAG = 0)
                    ORDER BY P.RDB$PACKAGE_NAME
                `;
            }

            const params = schemaName ? [schemaName] : [];
            const result = await this.executeQuery(connectionId, query, params);

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

    /**
     * Obtiene todos los tablespaces de la base de datos
     */
    async getTablespaces(connectionId: string): Promise<any> {
        try {
            if (!this.connections[connectionId]) {
                return {
                    success: false,
                    message: 'Conexión no encontrada'
                };
            }

            // Firebird no tiene tablespaces como otros motores, pero podemos retornar un array vacío
            return {
                success: true,
                data: [],
                message: 'Firebird no soporta tablespaces'
            };
        } catch (error: any) {
            return {
                success: false,
                message: 'Error al obtener tablespaces',
                error: { message: error.message }
            };
        }
    }

    /**
     * Verifica la salud de todas las conexiones
     */
    async checkConnectionsHealth(): Promise<any> {
        try {
            const connectionIds = Object.keys(this.connections);
            const healthResults = [];

            for (const connectionId of connectionIds) {
                const isHealthy = await this.checkConnectionHealth(connectionId);
                healthResults.push({
                    connectionId,
                    isHealthy,
                    config: this.connections[connectionId]?.config
                });
            }

            return {
                success: true,
                data: healthResults,
                message: 'Estado de conexiones verificado'
            };
        } catch (error: any) {
            return {
                success: false,
                message: 'Error al verificar salud de conexiones',
                error: { message: error.message }
            };
        }
    }

    /**
     * Cierra todas las conexiones (alias para closeAllConnections)
     */
    async closeAllconection(): Promise<any> {
        try {
            await this.closeAllConnections();
            return {
                success: true,
                message: 'Todas las conexiones cerradas'
            };
        } catch (error: any) {
            return {
                success: false,
                message: 'Error al cerrar conexiones',
                error: { message: error.message }
            };
        }
    }

    /**
     * Agrega una conexión (alias para addConnection)
     */
    async addConection(config: any): Promise<any> {
        try {
            return await this.addConnection(config);
        } catch (error: any) {
            return {
                success: false,
                message: 'Error al agregar conexión',
                error: { message: error.message }
            };
        }
    }

    /**
     * Crea una vista (alias para createView de OperationsManager)
     */
    async createViewFromData(connectionId: string, viewData: any): Promise<any> {
        try {
            return await this.createView(connectionId, viewData.schemaName, viewData.viewName, viewData.selectQuery, viewData.columnNames, viewData.withCheckOption);
        } catch (error: any) {
            return {
                success: false,
                message: 'Error al crear vista',
                error: { message: error.message }
            };
        }
    }

    /**
     * Obtiene los campos de una restricción
     */
    private getConstraintFields(columns: any[], constraint: any): string[] {
        try {
            if (constraint.COLUMN_NAMES) {
                // Si ya tenemos los nombres de las columnas en la restricción
                return constraint.COLUMN_NAMES.split(',').map((name: string) => name.trim());
            }
            
            // Si no tenemos los nombres, intentar obtenerlos de las columnas
            if (constraint.COLUMN_POSITIONS) {
                const positions = constraint.COLUMN_POSITIONS.split(',').map((pos: string) => parseInt(pos.trim()));
                return positions.map((pos: number) => {
                    const column = columns.find(col => col.position === pos);
                    return column ? column.name : `COLUMN_${pos}`;
                });
            }
            
            // Fallback: usar la primera columna
            return columns.length > 0 ? [columns[0].name] : ['UNKNOWN_COLUMN'];
        } catch (error) {
            // Fallback: usar la primera columna
            return columns.length > 0 ? [columns[0].name] : ['UNKNOWN_COLUMN'];
        }
    }
}

module.exports = DDLManager;
