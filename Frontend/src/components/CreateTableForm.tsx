import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import './CreateTableForm.css';

interface CreateTableFormProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
  onSuccess?: () => void;
}

interface Column {
  name: string;
  type: string;
  size?: string;
  precision?: string;
  scale?: string;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  defaultValue?: string;
  checkConstraint?: string;
  foreignKey?: ForeignKeyInfo;
}

interface ForeignKeyInfo {
  referencedTable: string;
  referencedColumn: string;
}

interface TableInfo {
  name: string;
  columns: string[];
}

const CreateTableForm: React.FC<CreateTableFormProps> = ({
  isOpen,
  onClose,
  connectionId,
  onSuccess
}) => {
  const { isDarkMode } = useTheme();
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<Column[]>([{ 
    name: '', 
    type: 'VARCHAR', 
    size: '255', 
    nullable: true, 
    primaryKey: false,
    unique: false,
    defaultValue: '' 
  }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableTables, setAvailableTables] = useState<TableInfo[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);

  const dataTypeCategories = {
    'Números Enteros': ['SMALLINT', 'INTEGER', 'BIGINT'],
    'Números Decimales': ['FLOAT', 'DOUBLE PRECISION', 'DECIMAL', 'NUMERIC'],
    'Texto': ['VARCHAR', 'CHAR', 'TEXT', 'BLOB SUB_TYPE TEXT'],
    'Fechas y Tiempo': ['DATE', 'TIME', 'TIMESTAMP'],
    'Otros': ['BOOLEAN', 'BLOB', 'CHAR CHARACTER SET OCTETS']
  };


  useEffect(() => {
    const loadAvailableTables = async () => {
      setLoadingTables(true);
      try {
        const result = await apiService.getTables(connectionId);
        
        if (result.success && result.data) {

          const tablePromises = result.data.map(async (table: any) => {
            const tableName = table.TABLE_NAME?.trim() || table.table_name?.trim();
            if (!tableName) return null;
            
            try {

              const columnsResult = await apiService.getTableColumns(connectionId, tableName);
              const columns = columnsResult.success && columnsResult.data 
                ? columnsResult.data.map((col: any) => col.name?.trim()).filter(Boolean)
                : [];
              
              return { name: tableName, columns };
            } catch {
              return { name: tableName, columns: [] };
            }
          });
          
          const tables = (await Promise.all(tablePromises)).filter(Boolean) as TableInfo[];
          setAvailableTables(tables);
        }
      } catch (err) {
        console.error('Error loading tables:', err);
      } finally {
        setLoadingTables(false);
      }
    };
  
    if (isOpen) {
      loadAvailableTables();
    }
  }, [isOpen, connectionId]);
  

  const [tableExists, setTableExists] = useState(false);
  
  useEffect(() => {
    const checkTableExists = async () => {
      if (!tableName.trim()) {
        setTableExists(false);
        return;
      }
      
      try {
        const tablesResult = await apiService.getTables(connectionId);
        if (tablesResult.success && tablesResult.data) {
          const tableNames = tablesResult.data.map((table: any) => 
            table.TABLE_NAME?.trim() || table.table_name?.trim()
          ).filter(Boolean);
          
          setTableExists(tableNames.includes(tableName.toUpperCase()));
        }
      } catch (err) {
        console.error('Error checking table existence:', err);
      }
    };
    
    if (tableName) {
      checkTableExists();
    } else {
      setTableExists(false);
    }
  }, [tableName, connectionId]);


  const addColumn = () => {
    setColumns([...columns, { 
      name: '', 
      type: 'VARCHAR', 
      size: '255', 
      nullable: true, 
      primaryKey: false,
      unique: false,
      defaultValue: '' 
    }]);
  };

  const removeColumn = (index: number) => {
    if (columns.length > 1) {
      setColumns(columns.filter((_, i) => i !== index));
    }
  };

  const updateColumn = (index: number, field: keyof Column, value: any) => {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], [field]: value };
    

    if (field === 'primaryKey' && value === true) {
      newColumns[index].nullable = false;
      newColumns[index].unique = false; 
    }
    
    if (field === 'unique' && value === true && newColumns[index].primaryKey) {
      newColumns[index].unique = false; 
    }
    
    
    if (field === 'type') {
      const newType = value.toUpperCase();
      
    
      if (!['VARCHAR', 'CHAR'].includes(newType)) {
        newColumns[index].size = undefined;
      }
      if (!['DECIMAL', 'NUMERIC'].includes(newType)) {
        newColumns[index].precision = undefined;
        newColumns[index].scale = undefined;
      }
    
    }
    
    setColumns(newColumns);
  };

  const updateForeignKey = (index: number, field: keyof ForeignKeyInfo, value: any) => {
    const newColumns = [...columns];
    if (!newColumns[index].foreignKey) {
      newColumns[index].foreignKey = {
        referencedTable: '',
        referencedColumn: ''
      };
    }
    
    newColumns[index].foreignKey = {
      ...newColumns[index].foreignKey!,
      [field]: value
    };
    

    if (field === 'referencedTable') {
      newColumns[index].foreignKey!.referencedColumn = '';
    }
    
    setColumns(newColumns);
  };

  const removeForeignKey = (index: number) => {
    const newColumns = [...columns];
    delete newColumns[index].foreignKey;
    setColumns(newColumns);
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    

    if (!tableName.trim()) {
      errors.push('El nombre de la tabla es requerido');
    } else if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(tableName)) {
      errors.push('El nombre de la tabla debe empezar con letra o guión bajo y solo puede contener letras, números y guiones bajos');
    }
    

    if (columns.length === 0) {
      errors.push('Debe haber al menos una columna');
    }
    

    const primaryKeys = columns.filter(col => col.primaryKey);
    if (primaryKeys.length > 1) {
      errors.push('Solo puede haber una clave primaria por tabla');
    }
    

    columns.forEach((col, index) => {
      if (!col.name.trim()) {
        errors.push(`La columna ${index + 1} debe tener un nombre`);
      } else if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(col.name)) {
        errors.push(`El nombre de la columna ${index + 1} debe empezar con letra o guión bajo`);
      }
      

      if (['VARCHAR', 'CHAR'].includes(col.type) && (!col.size || parseInt(col.size) <= 0)) {
        errors.push(`La columna ${col.name} debe tener un tamaño válido mayor a 0`);
      }
      

      if (['DECIMAL', 'NUMERIC'].includes(col.type)) {
        if (!col.precision || parseInt(col.precision) <= 0) {
          errors.push(`La columna ${col.name} debe tener una precisión válida mayor a 0`);
        }
        if (col.scale && col.precision && parseInt(col.scale) > parseInt(col.precision)) {
          errors.push(`La escala de la columna ${col.name} no puede ser mayor que la precisión`);
        }
      }
      

      if (col.foreignKey) {
        if (!col.foreignKey.referencedTable) {
          errors.push(`La clave foránea en columna ${col.name} debe especificar una tabla de referencia`);
        }
        if (!col.foreignKey.referencedColumn) {
          errors.push(`La clave foránea en columna ${col.name} debe especificar una columna de referencia`);
        }
      }
      

    });
    
    const columnNames = columns.map(col => col.name.toLowerCase());
    const duplicateNames = columnNames.filter((name, index) => columnNames.indexOf(name) !== index);
    if (duplicateNames.length > 0) {
      errors.push('No puede haber nombres de columnas duplicados');
    }
    
    return errors;
  };

const handleSubmit = async () => {
  setError('');
  
  const validationErrors = validateForm();
  if (validationErrors.length > 0) {
    setError(validationErrors.join('\n'));
    return;
  }
  
  if (tableExists) {
    setError('La tabla ya existe. Por favor, elija otro nombre.');
    return;
  }
  
  setLoading(true);

  try {
    // Verificar explícitamente que la conexión esté activa
    const connectResult = await apiService.connectToDatabase(connectionId);
    if (!connectResult.success) {
      throw new Error('No se pudo conectar a la base de datos: ' + connectResult.message);
    }
    
    const tableData = {
      tableName: tableName.trim(),
      columns: columns.map(col => ({
        name: col.name.trim(),
        type: col.type,
        length: col.type === 'DECIMAL' || col.type === 'NUMERIC' 
          ? parseInt(col.precision || '0') 
          : parseInt(col.size || '0') || 0,
        precision: col.precision ? parseInt(col.precision) : undefined,
        scale: col.scale ? parseInt(col.scale) : undefined,
        nullable: col.nullable,
        defaultValue: col.defaultValue?.trim() || '',
        primaryKey: col.primaryKey,
        unique: col.unique,
        checkConstraint: col.checkConstraint?.trim() || '',
        foreignKey: col.foreignKey ? {
          referencedTable: col.foreignKey.referencedTable,
          referencedColumn: col.foreignKey.referencedColumn
        } : undefined
      }))
    };

    const result = await apiService.createTable(connectionId, tableData);
    
    if (result.success) {
      alert('Tabla creada exitosamente');
      onSuccess?.();
      onClose();
      setTableName('');
      setColumns([{ 
        name: '', 
        type: 'VARCHAR', 
        size: '255', 
        nullable: true, 
        primaryKey: false,
        unique: false,
        defaultValue: '' 
      }]);
    } else {
      setError(result.message || result.error?.message || 'Error al crear la tabla');
    }
  } catch (err) {
    setError('Error al crear la tabla: ' + (err instanceof Error ? err.message : 'Error desconocido'));
  } finally {
    setLoading(false);
  }
};

  const getReferencedTableColumns = (tableName: string): string[] => {
    const table = availableTables.find(t => t.name === tableName);
    return table ? table.columns : [];
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className={`modal-content create-table-modal ${isDarkMode ? 'dark' : ''}`}>
        <div className="modal-header">
          <h2>Crear Nueva Tabla</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">

          <div className="form-section">
            <h3>Información de la Tabla</h3>
            <div className="form-group">
              <label htmlFor="tableName">
                Nombre de la Tabla <span className="required">*</span>
              </label>
              <input
                type="text"
                id="tableName"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="ej: usuarios, productos, ventas"
                className={`form-input ${tableExists ? 'error' : ''}`}
                required
              />
              {tableExists && (
                <div className="error-message">La tabla ya existe en la base de datos</div>
              )}
              <small className="form-help">
                Use solo letras, números y guiones bajos. Debe empezar con letra o guión bajo.
              </small>
            </div>
          </div>


          <div className="form-section">
            <h3>Definición de Columnas</h3>
            <p className="section-description">
              Defina las columnas de su tabla con todas las restricciones y relaciones necesarias.
            </p>
            
            <div className="columns-container">
              {columns.map((column, index) => (
                <div key={index} className="column-card">
                  <div className="column-header">
                    <h4>Columna {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeColumn(index)}
                      className="remove-column-btn"
                      disabled={columns.length === 1}
                      title="Eliminar columna"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="column-fields">

                    <div className="field-group">
                      <label>
                        Nombre de la Columna <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="ej: id, nombre, email"
                        value={column.name}
                        onChange={(e) => updateColumn(index, 'name', e.target.value)}
                        className="field-input"
                        required
                      />
                    </div>
                    

                    <div className="field-group">
                      <label>
                        Tipo de Dato <span className="required">*</span>
                      </label>
                      <select
                        value={column.type}
                        onChange={(e) => updateColumn(index, 'type', e.target.value)}
                        className="field-select"
                      >
                        {Object.entries(dataTypeCategories).map(([category, types]) => (
                          <optgroup key={category} label={category}>
                            {types.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    

                    {['VARCHAR', 'CHAR'].includes(column.type) && (
                      <div className="field-group">
                        <label>Tamaño <span className="required">*</span></label>
                        <input
                          type="number"
                          placeholder="ej: 255"
                          value={column.size || ''}
                          onChange={(e) => updateColumn(index, 'size', e.target.value)}
                          className="field-input"
                          min="1"
                        />
                        <small className="field-help">Número máximo de caracteres</small>
                      </div>
                    )}
                    

                    {['DECIMAL', 'NUMERIC'].includes(column.type) && (
                      <>
                        <div className="field-group">
                          <label>Precisión <span className="required">*</span></label>
                          <input
                            type="number"
                            placeholder="ej: 10"
                            value={column.precision || ''}
                            onChange={(e) => updateColumn(index, 'precision', e.target.value)}
                            className="field-input"
                            min="1"
                          />
                          <small className="field-help">Número total de dígitos</small>
                        </div>
                        
                        <div className="field-group">
                          <label>Escala</label>
                          <input
                            type="number"
                            placeholder="ej: 2"
                            value={column.scale || ''}
                            onChange={(e) => updateColumn(index, 'scale', e.target.value)}
                            className="field-input"
                            min="0"
                          />
                          <small className="field-help">Número de decimales (opcional)</small>
                        </div>
                      </>
                    )}
                    

                    <div className="field-group">
                      <label>Valor por Defecto</label>
                      <input
                        type="text"
                        placeholder="ej: 0, 'N/A', CURRENT_DATE, CURRENT_TIMESTAMP"
                        value={column.defaultValue || ''}
                        onChange={(e) => updateColumn(index, 'defaultValue', e.target.value)}
                        className="field-input"
                      />
                    </div>
                    
                    

                    <div className="column-options">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={column.nullable}
                          onChange={(e) => updateColumn(index, 'nullable', e.target.checked)}
                        />
                        <span className="checkmark"></span>
                        Permitir valores NULL
                      </label>
                      
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={column.primaryKey}
                          onChange={(e) => updateColumn(index, 'primaryKey', e.target.checked)}
                        />
                        <span className="checkmark"></span>
                        Clave Primaria
                      </label>
                      
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={column.unique}
                          onChange={(e) => updateColumn(index, 'unique', e.target.checked)}
                          disabled={column.primaryKey}
                        />
                        <span className="checkmark"></span>
                        Único (UNIQUE)
                      </label>
                      
                    </div>
                    
                    <div className="foreign-key-section">
                      <div className="foreign-key-header">
                        <label>Clave Foránea (Foreign Key)</label>
                        {column.foreignKey ? (
                          <button
                            type="button"
                            onClick={() => removeForeignKey(index)}
                            className="remove-fk-btn"
                            title="Quitar clave foránea"
                          >
                            Quitar FK
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => updateForeignKey(index, 'referencedTable', '')}
                            className="add-fk-btn"
                            disabled={loadingTables}
                          >
                            {loadingTables ? 'Cargando...' : 'Agregar FK'}
                          </button>
                        )}
                      </div>
                      
                      {column.foreignKey && (
                        <div className="foreign-key-options">
                          <div className="field-group">
                            <label>Tabla Referenciada</label>
                            <select
                              value={column.foreignKey.referencedTable}
                              onChange={(e) => updateForeignKey(index, 'referencedTable', e.target.value)}
                              className="field-select"
                            >
                              <option value="">Seleccionar tabla...</option>
                              {availableTables.map(table => (
                                <option key={table.name} value={table.name}>
                                  {table.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          {column.foreignKey.referencedTable && (
                            <div className="field-group">
                              <label>Columna Referenciada</label>
                              <select
                                value={column.foreignKey.referencedColumn}
                                onChange={(e) => updateForeignKey(index, 'referencedColumn', e.target.value)}
                                className="field-select"
                              >
                                <option value="">Seleccionar columna...</option>
                                {getReferencedTableColumns(column.foreignKey.referencedTable).map(colName => (
                                  <option key={colName} value={colName}>
                                    {colName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button
              type="button"
              onClick={addColumn}
              className="add-column-btn"
            >
              + Agregar Nueva Columna
            </button>
          </div>

 
          {error && (
            <div className="error-section">
              <div className="error-message">
                <strong>Errores encontrados:</strong>
                <pre>{error}</pre>
              </div>
            </div>
          )}
          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="cancel-btn"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="submit-btn"
              disabled={loading || !tableName.trim() || columns.some(col => !col.name.trim()) || tableExists}
            >
              {loading ? 'Creando Tabla...' : 'Crear Tabla'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTableForm;