import React, { useState } from 'react';
import apiService from '../services/apiService';
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
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<Column[]>([
    { name: '', type: 'VARCHAR', size: '255', nullable: true, primaryKey: false, defaultValue: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const dataTypes = [
    'VARCHAR', 'CHAR', 'INTEGER', 'BIGINT', 'SMALLINT', 'DECIMAL', 'NUMERIC',
    'FLOAT', 'DOUBLE PRECISION', 'DATE', 'TIME', 'TIMESTAMP', 'BLOB', 'TEXT'
  ];

  const addColumn = () => {
    setColumns([...columns, { name: '', type: 'VARCHAR', size: '255', nullable: true, primaryKey: false, defaultValue: '' }]);
  };

  const removeColumn = (index: number) => {
    if (columns.length > 1) {
      setColumns(columns.filter((_, i) => i !== index));
    }
  };

  const updateColumn = (index: number, field: keyof Column, value: any) => {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], [field]: value };
    setColumns(newColumns);
  };

  const generateDDL = () => {
    if (!tableName.trim()) {
      setError('El nombre de la tabla es requerido');
      return;
    }

    const invalidColumns = columns.filter(col => !col.name.trim());
    if (invalidColumns.length > 0) {
      setError('Todos los nombres de columnas son requeridos');
      return;
    }

    let ddl = `CREATE TABLE ${schemaName}.${tableName.toUpperCase()} (\n`;
    
    const columnDefinitions = columns.map(col => {
      let definition = `  ${col.name.toUpperCase()} ${col.type}`;
      
      if (col.size && ['VARCHAR', 'CHAR', 'DECIMAL', 'NUMERIC'].includes(col.type)) {
        definition += `(${col.size})`;
      }
      
      if (!col.nullable) {
        definition += ' NOT NULL';
      }
      
      if (col.defaultValue && col.defaultValue.trim()) {
        definition += ` DEFAULT ${col.defaultValue}`;
      }
      
      return definition;
    });

    const primaryKeys = columns.filter(col => col.primaryKey).map(col => col.name.toUpperCase());
    if (primaryKeys.length > 0) {
      columnDefinitions.push(`  PRIMARY KEY (${primaryKeys.join(', ')})`);
    }

    ddl += columnDefinitions.join(',\n') + '\n);';
    
    return ddl;
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const ddl = generateDDL();
      if (!ddl) return;

      const result = await apiService.executeQuery(connectionId, ddl);
      
      if (result.success) {
        alert('Tabla creada exitosamente');
        onSuccess?.();
        onClose();
        setTableName('');
        setColumns([{ name: '', type: 'VARCHAR', size: '255', nullable: true, primaryKey: false, defaultValue: '' }]);
      } else {
        setError(result.error?.message || 'Error al crear la tabla');
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
      <div className="modal-content create-table-modal">
        <div className="modal-header">
          <h2>Crear Nueva Tabla</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="tableName">Nombre de la Tabla:</label>
            <input
              type="text"
              id="tableName"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="nombre_tabla"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Columnas:</label>
            <div className="columns-container">
              {columns.map((column, index) => (
                <div key={index} className="column-row">
                  <input
                    type="text"
                    placeholder="Nombre columna"
                    value={column.name}
                    onChange={(e) => updateColumn(index, 'name', e.target.value)}
                    className="column-name"
                  />
                  
                  <select
                    value={column.type}
                    onChange={(e) => updateColumn(index, 'type', e.target.value)}
                    className="column-type"
                  >
                    {dataTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  
                  {['VARCHAR', 'CHAR', 'DECIMAL', 'NUMERIC'].includes(column.type) && (
                    <input
                      type="text"
                      placeholder="Tamaño"
                      value={column.size || ''}
                      onChange={(e) => updateColumn(index, 'size', e.target.value)}
                      className="column-size"
                    />
                  )}
                  
                  <input
                    type="text"
                    placeholder="Valor por defecto"
                    value={column.defaultValue || ''}
                    onChange={(e) => updateColumn(index, 'defaultValue', e.target.value)}
                    className="column-default"
                  />
                  
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={column.nullable}
                      onChange={(e) => updateColumn(index, 'nullable', e.target.checked)}
                    />
                    NULL
                  </label>
                  
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={column.primaryKey}
                      onChange={(e) => updateColumn(index, 'primaryKey', e.target.checked)}
                    />
                    PK
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => removeColumn(index)}
                    className="remove-column-btn"
                    disabled={columns.length === 1}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            
            <button type="button" onClick={addColumn} className="add-column-btn">
              + Agregar Columna
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="cancel-btn">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="submit-btn"
          >
            {loading ? 'Creando...' : 'Crear Tabla'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTableForm;
