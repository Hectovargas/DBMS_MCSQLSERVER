const MetadataManager = require('./metadataManager');

class OperationsManager extends MetadataManager {
    
    async createTable(params: {
        connectionId: string; 
        schemaName: string; 
        tableName: string; 
        columns: any[];
    }): Promise<any> {
        try {
            const { connectionId, schemaName, tableName, columns } = params;
            
            if (!this.connections[connectionId]) {
                return {
                    success: false,
                    message: 'Conexión no encontrada'
                };
            }

            if (!tableName || !columns || columns.length === 0) {
                return {
                    success: false,
                    message: 'Nombre de tabla y columnas son requeridos'
                };
            }

            const existsResult = await this.checkTableExists(connectionId, schemaName, tableName);
            if (existsResult.success && existsResult.exists) {
                return {
                    success: false,
                    message: `La tabla ${tableName} ya existe en el esquema ${schemaName}`
                };
            }

            const sql = this.generateCreateTableSQL(schemaName, tableName, columns);
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
            return {
                success: false,
                message: error.message || 'Error al crear la tabla'
            };
        }
    }


    async createView(params: {
        connectionId: string;
        schemaName: string;
        viewName: string;
        selectQuery: string;
        columnNames?: string[];
        withCheckOption?: boolean;
    }): Promise<any> {
        try {
            const {
                connectionId,
                schemaName,
                viewName,
                selectQuery,
                columnNames,
                withCheckOption = false
            } = params;

            if (!this.connections[connectionId]) {
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
            return {
                success: false,
                message: error.message || 'Error al crear la vista'
            };
        }
    }


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



    private generateCreateTableSQL(schemaName: string, tableName: string, columns: any[]): string {
        const columnDefinitions = columns.map(col => {
            let definition = `${col.name.toUpperCase()} ${col.type.toUpperCase()}`;

            if (col.length && (col.type.toUpperCase() === 'VARCHAR' || col.type.toUpperCase() === 'CHAR' || 
                col.type.toUpperCase() === 'DECIMAL' || col.type.toUpperCase() === 'NUMERIC')) {
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

        let sql = `CREATE TABLE ${tableName.toUpperCase()} (\n`;
        sql += `  ${columnDefinitions.join(',\n  ')}`;

        if (primaryKeys.length > 0) {
            sql += `,\n  PRIMARY KEY (${primaryKeys.join(', ')})`;
        }

        sql += '\n);';
        return sql;
    }


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
}

module.exports = OperationsManager;
