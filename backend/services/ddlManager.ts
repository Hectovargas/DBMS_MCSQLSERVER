import console = require("node:console");

const OperationsManager = require('./operationsManager');



class DDLManager extends OperationsManager {
    

    async generateTableDDL(connectionId: string, tableName: string): Promise<any> {
        try {

            if (!this.connections[connectionId]) {
                return {success: false, message: 'Conexion no encontrada'};
            }
    
            const columnsResult = await this.getTablesColumns(connectionId, tableName);
            if (!columnsResult.success) return columnsResult;
    
            const indexesResult = await this.getTableIndexes(connectionId, tableName);
            const constraintsResult = await this.getTableConstraints(connectionId, tableName);
    
            const ddl = await this.buildTableDDL(
                connectionId, 
                tableName,
                columnsResult.data, 
                indexesResult.success ? indexesResult.data : [],
                constraintsResult.success ? constraintsResult.data : []
            );
    
            return {success: true, data: ddl, message: 'DDL generado exitosamente'};
    
        } catch (error: any) {
            return {success: false, message: 'Error al generar DDL', error: {message: error.message}};
        }
    }
    
    private async buildTableDDL(connectionId: string, tableName: string, columns: any[], indexes: any[], constraints: any[]): Promise<string> {
        
  
        let ddl = `-- ${tableName} definition\n\n-- DROP TABLE ${tableName};\n\n`;
        

        ddl += `CREATE TABLE ${tableName} (`;

        const columnDefs = columns.map(col => {
            let def = `\t${col.name} ${this.getFirebirdDataType(col)}`;
            if (!col.isNullable && !col.defaultValue) {
                def += ' NOT NULL';
            }
            if (col.defaultValue) {
                def += ` DEFAULT ${this.formatDefault(col)}`;
            }
            
            return def;
        });

        ddl += columnDefs.join(',\n');
        
       
        const pk = constraints.find(c => c.CONSTRAINT_TYPE === 'PRIMARY KEY');
        if (pk) {
            const pkName = pk.CONSTRAINT_NAME || `PK_${tableName}`;
            const pkFields = this.getConstraintFields(columns, pk);
            ddl += `,\n\tCONSTRAINT "${pkName}" PRIMARY KEY (${pkFields.map(f => `"${f}"`).join(', ')})`;
        }
        
        
        const uniques = constraints.filter(c => c.CONSTRAINT_TYPE === 'UNIQUE');
        for (const uk of uniques) {
            const ukName = uk.CONSTRAINT_NAME || `UK_${tableName}_${Date.now()}`;
            const ukFields = this.getConstraintFields(columns, uk);
            ddl += `,\n\tCONSTRAINT "${ukName}" UNIQUE (${ukFields.map(f => `"${f}"`).join(', ')})`;
        }
        
        ddl += '\n);\n\n';
        
       
        for (const index of indexes) {
            if (index.INDEX_NAME && !index.INDEX_NAME.startsWith('RDB$')) {
                const unique = index.IS_UNIQUE ? 'UNIQUE ' : '';
                const indexFields = await this.getIndexFields(connectionId, index.INDEX_NAME);
                
                if (indexFields && indexFields.length > 0) {
                    const fieldList = indexFields.map(f => `"${f.FIELD_NAME}"`).join(', ');
                    ddl += `CREATE ${unique}INDEX ${index.INDEX_NAME} ON ${tableName} (${fieldList});\n`;
                }
            }
        }
        
    
        
        return ddl;
    }
    
    
    private formatDefault(col: any): string {
        let value = String(col.defaultValue).replace(/^['"]+|['"]+$/g, '');
        
       
        if (value === 'TRUE' || value === 'true') return '1';
        if (value === 'FALSE' || value === 'false') return '0';
        if (value === 'CURRENT_TIMESTAMP') return 'NULL';
        if (value === 'NULL' || value === 'null') return 'NULL';
        
        const dataType = this.getFirebirdDataType(col);
        
        
        if ((dataType.includes('VARCHAR') || dataType.includes('CHAR') || dataType === 'BLOB') && value !== 'NULL') {
            return `'${value}'`;
        }
        
        return value;
    }

    async generateViewDDL(connectionId: string, viewName: string): Promise<any> {
        try {
            if (!this.connections[connectionId]) {
                return {
                    success: false,
                    message: 'Conexion no encontrada'
                };
            }

            const query = `
                SELECT 
                    TRIM(R.RDB$RELATION_NAME) AS VIEW_NAME,
                    CAST(R.RDB$VIEW_SOURCE AS VARCHAR(8000)) AS VIEW_SOURCE
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


    async generateFunctionDDL(connectionId: string, functionName: string): Promise<any> {
        try {
            if (!this.connections[connectionId]) {
                return {
                    success: false,
                    message: 'Conexion no encontrada'
                };
            }

            const query = `
                SELECT 
                    TRIM(R.RDB$FUNCTION_NAME) AS FUNCTION_NAME,
                    R.RDB$FUNCTION_TYPE AS FUNCTION_TYPE,
                    CAST(R.RDB$FUNCTION_SOURCE AS VARCHAR(8000)) AS FUNCTION_SOURCE,
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


    async generateProcedureDDL(connectionId: string, procedureName: string): Promise<any> {
        try {
            if (!this.connections[connectionId]) {
                return {
                    success: false,
                    message: 'Conexion no encontrada'
                };
            }

            const query = `
                SELECT 
                    TRIM(P.RDB$PROCEDURE_NAME) AS PROCEDURE_NAME,
                    CAST(P.RDB$PROCEDURE_SOURCE AS VARCHAR(8000)) AS PROCEDURE_SOURCE
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


    async generateTriggerDDL(connectionId: string, triggerName: string): Promise<any> {
        try {
            if (!this.connections[connectionId]) {
                return {
                    success: false,
                    message: 'Conexion no encontrada'
                };
            }

            const query = `
                SELECT 
                    TRIM(T.RDB$TRIGGER_NAME) AS TRIGGER_NAME,
                    TRIM(T.RDB$RELATION_NAME) AS RELATION_NAME,
                    T.RDB$TRIGGER_TYPE AS TRIGGER_TYPE,
                    CAST(T.RDB$TRIGGER_SOURCE AS VARCHAR(8000)) AS TRIGGER_SOURCE,    
                    T.RDB$DESCRIPTION AS DESCRIPTION,
                    T.RDB$TRIGGER_INACTIVE AS TRIGGER_INACTIVE

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


    async generateIndexDDL(connectionId: string, indexName: string): Promise<any> {
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
                    I.RDB$UNIQUE_FLAG AS IS_UNIQUE,
                    I.RDB$INDEX_TYPE AS INDEX_TYPE,
                    I.RDB$SYSTEM_FLAG AS SYSTEM_FLAG,
                    I.RDB$STATISTICS AS STATISTICS,
                    I.RDB$FOREIGN_KEY AS FOREIGN_KEY
                FROM RDB$INDICES I
                LEFT JOIN RDB$RELATIONS R ON R.RDB$RELATION_NAME = I.RDB$RELATION_NAME
                WHERE I.RDB$INDEX_NAME = UPPER(?)
            `;

            const result = await this.executeQuery(connectionId, query, indexName);

            if (!result.success || !result.data || result.data.length === 0) {
                return {
                    success: false,
                    message: 'indice no encontrado'
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





    private buildFunctionDDL(func: any): string {
        let ddl = `CREATE FUNCTION ${func.FUNCTION_NAME} `;
        
        ddl += '()\n';

        if (func.RETURN_ARGUMENT) {
            ddl += `RETURNS ${this.getFirebirdDataType({ dataType: func.RETURN_ARGUMENT })}\n`;
        }
        
        ddl += 'AS\n';
        
        if (func.FUNCTION_SOURCE) {
            ddl += func.FUNCTION_SOURCE;
        } else {
            ddl += '/* Codigo de la funcion no disponible */';
        }
        
        return ddl;
    }

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
            ddl += '/* Codigo del trigger no disponible */';
        }
        
        return ddl;
    }

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


    private getFirebirdDataType(column: any): string {
        const typeCode = column.dataType;
        const maxLength = column.maxLength;
        const precision = column.precision;
        const scale = column.scale;

        let type = '';
        switch (typeCode) {
            case 7: type = 'SMALLINT'; break;
            case 8: type = 'INTEGER'; break;
            case 9: type = 'BIGINT'; break; 
            case 10: type = 'FLOAT'; break;
            case 11: type = 'DOUBLE PRECISION'; break; 
            case 12: type = 'DATE'; break;
            case 13: type = 'TIME'; break;
            case 14: type = 'CHAR'; break;
            case 16: type = 'BIGINT'; break;
            case 27: type = 'DOUBLE PRECISION'; break;
            case 35: type = 'TIMESTAMP'; break;
            case 37: type = 'VARCHAR'; break;
            case 40: type = 'VARCHAR'; break; 
            case 261: type = 'BLOB'; break;
            default: type = 'VARCHAR(255)'; break; 
        }

        if ((type === 'CHAR' || type === 'VARCHAR') && maxLength) {
            type += `(${maxLength})`;
        }

        if ((type === 'DECIMAL' || type === 'NUMERIC') && precision && scale !== undefined) {
            type += `(${precision},${scale})`;
        }

        return type;
    }


    private async getIndexFields(connectionId: string, indexName: string): Promise<any[]> {
        try {
            const query = `
                SELECT 
                TRIM(S.RDB$FIELD_NAME) AS FIELD_NAME
                FROM RDB$INDEX_SEGMENTS S
                WHERE S.RDB$INDEX_NAME = UPPER(?)
            `;
            
            const result = await this.executeQuery(connectionId, query, [indexName]);
            return result.success ? result.data : [];
        } catch (error) {
            return [];
        }
    }


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

    async generatePackageDDL(connectionId: string, packageName: string): Promise<any> {
        console.log("1");
        try {
            if (!this.connections[connectionId]) {
                return {
                    success: false,
                    message: 'Conexión no encontrada'
                };
            }
            console.log("2");
            
            const searchQuery = `
                SELECT TRIM(P.RDB$PACKAGE_NAME) AS PACKAGE_NAME,
                    CAST(P.RDB$PACKAGE_HEADER_SOURCE AS VARCHAR(8000)) AS HEADER_SOURCE,
                    CAST(P.RDB$PACKAGE_BODY_SOURCE AS VARCHAR(8000)) AS BODY_SOURCE,
                    P.RDB$DESCRIPTION AS DESCRIPTION
                FROM RDB$PACKAGES P
                WHERE P.RDB$PACKAGE_NAME = UPPER(?)
            `;
            console.log("3");

            const result = await this.executeQuery(connectionId, searchQuery, [packageName]);
            console.log("5");
            
            if (!result.success) {
                return {
                    success: false,
                    message: 'Error al buscar el paquete'
                };
            }
    
            console.log("6");
            
    
            if (!result.data || result.data.length === 0) {
                return {
                    success: false,
                    message: `No se encontró el paquete: ${packageName}`
                };
            }
    
            const packageData = result.data[0];
            

            let ddl = `-- DDL para el paquete: ${packageData.PACKAGE_NAME || packageName}\n\n`;
    
 
            if (packageData.HEADER_SOURCE) {
                ddl += `-- HEADER DEL PAQUETE\n`;
                ddl += `${packageData.HEADER_SOURCE}\n\n`;
            } else {
                ddl += `-- HEADER DEL PAQUETE: No disponible\n\n`;
            }
            
            if (packageData.BODY_SOURCE) {
                ddl += `-- BODY DEL PAQUETE\n`;
                ddl += `${packageData.BODY_SOURCE}\n\n`;
            } else {
                ddl += `-- BODY DEL PAQUETE: No disponible\n\n`;
            }
    
            if (packageData.DESCRIPTION) {
                ddl += `-- DESCRIPCION: ${packageData.DESCRIPTION}\n`;
            }
    
            console.log("Generated DDL:", ddl);
    
            return {
                success: true,
                data: {
                    ddl: ddl, 
                    packageName: packageData.PACKAGE_NAME || packageName,
                    objectType: 'PACKAGE'
                },
                message: `DDL generado para el paquete: ${packageData.PACKAGE_NAME || packageName}`
            };
    
        } catch (error: any) {
            console.log("7 - Error:", error);
            return {
                success: false,
                message: 'Error al generar DDL del paquete',
                error: { message: error.message }
            };
        }
    }

    async generateSequenceDDL(connectionId: string, sequenceName: string): Promise<any> {
        try {
            if (!this.connections[connectionId]) {
                return {
                    success: false,
                    message: 'Conexion no encontrada'
                };
            }

            const query = `
                SELECT 
                    TRIM(G.RDB$GENERATOR_NAME) AS SEQUENCE_NAME,
                    G.RDB$DESCRIPTION AS DESCRIPTION
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
                TRIM(SEC$MIDDLE_NAME) AS MIDDLE_NAME,
                TRIM(SEC$LAST_NAME) AS LAST_NAME,
                SEC$DESCRIPTION AS DESCRIPTION
            FROM SEC$USERS
            WHERE SEC$USER_NAME = ?
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
            error: error.message
        };
    }
}

private buildUserDDL(user: any): string {

    const parts = [`CREATE USER "${user.USER_NAME}"`];
    
    parts.push(`PASSWORD '<<PASSWORD>>'`);
    
    if (user.FIRST_NAME) {
        parts.push(`FIRSTNAME '${this.escapeString(user.FIRST_NAME)}'`);
    }
    
    if (user.MIDDLE_NAME) {
        parts.push(`MIDDLENAME '${this.escapeString(user.MIDDLE_NAME)}'`);
    }
    
    if (user.LAST_NAME) {
        parts.push(`LASTNAME '${this.escapeString(user.LAST_NAME)}'`);
    }
    
    if (user.PLUGIN) {
        parts.push(`USING PLUGIN ${user.PLUGIN}`);
    }
    
    if (user.DESCRIPTION) {
        parts.push(`DESCRIPTION '${this.escapeString(user.DESCRIPTION)}'`);
    }
    
    return parts.join('\n') + ';';
}

private escapeString(value: string): string {
    if (!value) return '';
    return value.replace(/'/g, "''");
}




    async createViewFromData(connectionId: string, viewData: any): Promise<any> {
        try {
            return await this.createView(connectionId, viewData.viewName, viewData.selectQuery, viewData.columnNames, viewData.withCheckOption);
        } catch (error: any) {
            return {
                success: false,
                message: 'Error al crear vista',
                error: { message: error.message }
            };
        }
    }

 
    private getConstraintFields(columns: any[], constraint: any): string[] {
        try {

            if (constraint.COLUMN_NAMES) {

                return constraint.COLUMN_NAMES.split(',').map((name: string) => name.trim());
            }
            
    
            if (constraint.COLUMN_POSITIONS) {
                const positions = constraint.COLUMN_POSITIONS.split(',').map((pos: string) => parseInt(pos.trim()));
                return positions.map((pos: number) => {
                    const column = columns.find(col => col.position === pos);
                    return column ? column.name : `COLUMN_${pos}`;
                });
            }
            
            return columns.length > 0 ? [columns[0].name] : ['UNKNOWN_COLUMN'];
        } catch (error) {

            return columns.length > 0 ? [columns[0].name] : ['UNKNOWN_COLUMN'];
        }
    }
}

module.exports = DDLManager;
