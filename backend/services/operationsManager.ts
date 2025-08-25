const MetadataManager = require('./metadataManager');

class OperationsManager extends MetadataManager {
    
async createTable(connectionId: string, tableData: {
  tableName: string;
  columns: Array<{
    name: string;
    type: string;
    length?: number;
    precision?: number;
    scale?: number;
    nullable: boolean;
    defaultValue?: string;
    primaryKey: boolean;
    unique: boolean;
    checkConstraint?: string;
    foreignKey?: {
      referencedTable: string;
      referencedColumn: string;
    };
  }>;
}): Promise<any> {
  try {
    console.log('Checking connection:', connectionId);
    console.log('Available connections:', Object.keys(this.connections));

    if (!this.connections[connectionId]) {
      console.error('Connection not found:', connectionId);
      return {
        success: false,
        message: `Connection not found: ${connectionId}`
      };
    }

    let ddl = `CREATE TABLE ${tableData.tableName} (\n`;
    
    const columnDefinitions = [];
    const constraints = [];

    for (const column of tableData.columns) {
      let columnDef = `  ${column.name} ${column.type}`;
      

      if (['VARCHAR', 'CHAR'].includes(column.type) && column.length && column.length > 0) {
        columnDef += `(${column.length})`;

      } else if (['DECIMAL', 'NUMERIC'].includes(column.type)) {

        if (column.precision && column.scale !== undefined) {
          columnDef += `(${column.precision}, ${column.scale})`;

        } else if (column.precision) {
          columnDef += `(${column.precision})`;
        }

      }
      
      if (!column.nullable && column.defaultValue) {
        columnDef += ' NOT NULL';
      }
      
      if (column.defaultValue && column.defaultValue.trim() !== '') {
        const formattedDefault = this.formatDefaultValue(column.defaultValue, column.type);
        if (formattedDefault) {
          columnDef += ` DEFAULT ${formattedDefault}`;
        }
      }
      

      if (column.checkConstraint && column.checkConstraint.trim() !== '') {
        columnDef += ` CHECK (${column.checkConstraint})`;
      }
      
      columnDefinitions.push(columnDef);
      
      if (column.primaryKey) {
        constraints.push(`  CONSTRAINT PK_${tableData.tableName} PRIMARY KEY (${column.name})`);
      }
      
   
      if (column.unique && !column.primaryKey) {
        constraints.push(`  CONSTRAINT UK_${tableData.tableName}_${column.name} UNIQUE (${column.name})`);
      }
      
      if (column.foreignKey && column.foreignKey.referencedTable && column.foreignKey.referencedColumn) {
        const fkName = `FK_${tableData.tableName}_${column.name}`;
        constraints.push(`  CONSTRAINT ${fkName} FOREIGN KEY (${column.name}) ` +
                        `REFERENCES ${column.foreignKey.referencedTable} (${column.foreignKey.referencedColumn})`);
      }
    }

    ddl += columnDefinitions.join(',\n');
    
    if (constraints.length > 0) {
      ddl += ',\n' + constraints.join(',\n');
    }
    
    ddl += '\n);';
    
    console.log("Generated DDL:", ddl);
    
    const result = await this.executeQuery(connectionId, ddl);
    
    if (!result.success) {
      return result;
    }
    
    return {
      success: true,
      message: `Table "${tableData.tableName}" created successfully`,
      data: { ddl }
    };
    
  } catch (error: any) {
    console.error("Error in createTable:", error);
    return {
      success: false,
      message: 'Error creating table',
      error: { message: error.message }
    };
  }
}

private formatDefaultValue(value: string, type: string): string | null {
  if (!value || value.trim() === '') {
    return null;
  }

  const cleanValue = value.trim();
  const upperType = type.toUpperCase();

  if (upperType.includes('CHAR') || upperType.includes('TEXT') ||
      upperType.includes('BLOB') || upperType.includes('CLOB')) {
    return `'${cleanValue.replace(/'/g, "''")}'`;
  }

  if (upperType.includes('DATE') || upperType.includes('TIME')) {
    const upperValue = cleanValue.toUpperCase();
    if (['CURRENT_DATE', 'CURRENT_TIME', 'CURRENT_TIMESTAMP', 'NOW'].includes(upperValue)) {
      return upperValue;
    }
    return `'${cleanValue}'`;
  }

  if (upperType.includes('INT') || upperType.includes('DECIMAL') || 
      upperType.includes('NUMERIC') || upperType.includes('FLOAT') || 
      upperType.includes('DOUBLE') || upperType.includes('SMALLINT') ||
      upperType.includes('BIGINT')) {
    const numValue = parseFloat(cleanValue);
    if (isNaN(numValue)) {
      return `'${cleanValue.replace(/'/g, "''")}'`; 
    }
    return cleanValue;
  }

  if (upperType.includes('BOOLEAN')) {
    const boolValue = cleanValue.toLowerCase();
    if (['true', 'false', '1', '0'].includes(boolValue)) {
      return boolValue === 'true' || boolValue === '1' ? 'TRUE' : 'FALSE';
    }
    return `'${cleanValue.replace(/'/g, "''")}'`;
  }

  return `'${cleanValue.replace(/'/g, "''")}'`;
}
    

    async createView(params: {
        connectionId: string;
        viewName: string;
        selectQuery: string;
        columnNames?: string[];
        withCheckOption?: boolean;
    }): Promise<any> {
        try {
            const {
                connectionId,
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

            const existsResult = await this.checkViewExists(connectionId, viewName);
            if (existsResult.success && existsResult.exists) {
                return {
                    success: false,
                    message: `La vista ${viewName} ya existe`
                };
            }

            const sql = this.generateCreateViewSQL(
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
        tableName: string
    ): Promise<{ success: boolean; exists: boolean; message?: string }> {
        try {
            const query = `SELECT 1 
                FROM RDB$RELATIONS 
                WHERE RDB$RELATION_NAME = UPPER(?)`;

            const result = await this.executeQuery(connectionId, query, tableName);

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
        viewName: string
    ): Promise<{ success: boolean; exists: boolean; message?: string }> {
        try {
            const query = `
                SELECT 1 
                FROM RDB$RELATIONS 
                WHERE RDB$RELATION_NAME = UPPER(?)
                AND RDB$VIEW_BLR IS NOT NULL
            `;

            const result = await this.executeQuery(connectionId, query, viewName);

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



    private generateCreateViewSQL(
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

}

module.exports = OperationsManager;
