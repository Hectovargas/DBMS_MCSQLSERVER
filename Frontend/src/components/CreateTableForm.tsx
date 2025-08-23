import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import './CreateTableForm.css';

interface CreateTableFormProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
  schemaName: string;
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
  defaultValue?: string;
}

const CreateTableForm: React.FC<CreateTableFormProps> = ({
  isOpen,
  onClose,
  connectionId,
  schemaName,
  onSuccess
}) => {
  const { isDarkMode } = useTheme();
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<Column[]>([
    { name: '', type: 'VARCHAR', size: '255', nullable: true, primaryKey: false, defaultValue: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tableExists, setTableExists] = useState(false);

  // Tipos de datos organizados por categorías
  const dataTypeCategories = {
    'Números Enteros': ['SMALLINT', 'INTEGER', 'BIGINT'],
    'Números Decimales': ['FLOAT', 'DOUBLE PRECISION', 'DECIMAL', 'NUMERIC'],
    'Texto': ['VARCHAR', 'CHAR', 'TEXT'],
    'Fechas y Tiempo': ['DATE', 'TIME', 'TIMESTAMP'],
    'Otros': ['BOOLEAN', 'BLOB', 'CLOB']
  };

  // Verificar si la tabla existe
  useEffect(() => {
    const checkTableExists = async () => {
      if (tableName.trim()) {
        try {
          const result = await apiService.executeQuery(
            connectionId, 
            `SELECT 1 FROM RDB$RELATIONS WHERE RDB$RELATION_NAME = UPPER('${tableName}')`
          );
          setTableExists(!!(result.success && result.data && result.data.length > 0));
        } catch (err) {
          setTableExists(false);
        }
      } else {
        setTableExists(false);
      }
    };

    const timeoutId = setTimeout(checkTableExists, 500);
    return () => clearTimeout(timeoutId);
  }, [tableName, connectionId]);

  // Agregar nueva columna
  const addColumn = () => {
    setColumns([...columns, { 
      name: '', 
      type: 'VARCHAR', 
      size: '255', 
      nullable: true, 
      primaryKey: false, 
      defaultValue: '' 
    }]);
  };

  // Eliminar columna
  const removeColumn = (index: number) => {
    if (columns.length > 1) {
      setColumns(columns.filter((_, i) => i !== index));
    }
  };

  // Actualizar columna
  const updateColumn = (index: number, field: keyof Column, value: any) => {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], [field]: value };
    
    // Si se marca como PK, desmarcar NULL automáticamente
    if (field === 'primaryKey' && value === true) {
      newColumns[index].nullable = false;
    }
    
    // Limpiar campos no aplicables según el tipo
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

  // Validar formulario
  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    // Validar nombre de tabla
    if (!tableName.trim()) {
      errors.push('El nombre de la tabla es requerido');
    } else if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(tableName)) {
      errors.push('El nombre de la tabla debe empezar con letra o guión bajo y solo puede contener letras, números y guiones bajos');
    }
    
    // Validar columnas
    if (columns.length === 0) {
      errors.push('Debe haber al menos una columna');
    }
    
    columns.forEach((col, index) => {
      if (!col.name.trim()) {
        errors.push(`La columna ${index + 1} debe tener un nombre`);
      } else if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(col.name)) {
        errors.push(`El nombre de la columna ${index + 1} debe empezar con letra o guión bajo`);
      }
      
      // Validar tamaño para tipos que lo requieren
      if (['VARCHAR', 'CHAR'].includes(col.type) && (!col.size || parseInt(col.size) <= 0)) {
        errors.push(`La columna ${col.name} debe tener un tamaño válido mayor a 0`);
      }
      
      // Validar precisión y escala para DECIMAL/NUMERIC
      if (['DECIMAL', 'NUMERIC'].includes(col.type)) {
        if (!col.precision || parseInt(col.precision) <= 0) {
          errors.push(`La columna ${col.name} debe tener una precisión válida mayor a 0`);
        }
        if (col.scale && col.precision && parseInt(col.scale) > parseInt(col.precision)) {
          errors.push(`La escala de la columna ${col.name} no puede ser mayor que la precisión`);
        }
      }
    });
    
    // Verificar que no haya nombres duplicados
    const columnNames = columns.map(col => col.name.toLowerCase());
    const duplicateNames = columnNames.filter((name, index) => columnNames.indexOf(name) !== index);
    if (duplicateNames.length > 0) {
      errors.push('No puede haber nombres de columnas duplicados');
    }
    
    return errors;
  };

  // Crear tabla
  const handleSubmit = async () => {
    setError('');
    
    // Validar formulario
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'));
      return;
    }
    
    // Verificar si la tabla ya existe
    if (tableExists) {
      setError('La tabla ya existe. Por favor, elija otro nombre.');
      return;
    }
    
    setLoading(true);

    try {
      // Preparar datos para el backend
      const tableData = {
        schemaName: schemaName === 'DEFAULT' ? '' : schemaName,
        tableName: tableName.trim(),
        columns: columns.map(col => ({
          name: col.name.trim(),
          type: col.type,
          length: col.type === 'DECIMAL' || col.type === 'NUMERIC' 
            ? parseInt(col.precision || '0') 
            : parseInt(col.size || '0') || 0,
          nullable: col.nullable,
          defaultValue: col.defaultValue?.trim() || '',
          primaryKey: col.primaryKey,
          unique: false
        }))
      };

      console.log('Sending tableData to backend:', { connectionId, tableData });

      // Pequeño delay para asegurar que la conexión esté establecida
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await apiService.createTable(connectionId, tableData);
      
      if (result.success) {
        alert('Tabla creada exitosamente');
        onSuccess?.();
        onClose();
        setTableName('');
        setColumns([{ name: '', type: 'VARCHAR', size: '255', nullable: true, primaryKey: false, defaultValue: '' }]);
      } else {
        setError(result.message || result.error?.message || 'Error al crear la tabla');
      }
    } catch (err) {
      setError('Error al crear la tabla: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setLoading(false);
    }
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
          {/* Información de la tabla */}
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

          {/* Definición de columnas */}
          <div className="form-section">
            <h3>Definición de Columnas</h3>
            <p className="section-description">
              Defina las columnas de su tabla. Cada columna debe tener un nombre único y un tipo de dato.
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
                    {/* Nombre de la columna */}
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
                    
                    {/* Tipo de dato */}
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
                    
                    {/* Tamaño/Precisión */}
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
                    
                    {/* Precisión para DECIMAL/NUMERIC */}
                    {['DECIMAL', 'NUMERIC'].includes(column.type) && (
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
                    )}
                    
                    {/* Escala para DECIMAL/NUMERIC */}
                    {['DECIMAL', 'NUMERIC'].includes(column.type) && (
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
                    )}
                    
                    {/* Valor por defecto */}
                    <div className="field-group">
                      <label>Valor por Defecto</label>
                      <input
                        type="text"
                        placeholder="ej: 0, 'N/A', CURRENT_DATE"
                        value={column.defaultValue || ''}
                        onChange={(e) => updateColumn(index, 'defaultValue', e.target.value)}
                        className="field-input"
                      />
                      <small className="field-help">Valor que se asigna automáticamente (opcional)</small>
                    </div>
                    
                    {/* Opciones de la columna */}
                    <div className="column-options">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={column.nullable}
                          onChange={(e) => updateColumn(index, 'nullable', e.target.checked)}
                          disabled={column.primaryKey}
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

          {/* Mensajes de error */}
          {error && (
            <div className="error-section">
              <div className="error-message">
                <strong>Errores encontrados:</strong>
                <pre>{error}</pre>
              </div>
            </div>
          )}

          {/* Acciones del formulario */}
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
