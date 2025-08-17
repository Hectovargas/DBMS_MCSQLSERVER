// CreateTableForm.tsx
import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import './CreateTableForm.css';

interface ColumnDefinition {
  name: string;
  type: string;
  length?: number;
  nullable: boolean;
  defaultValue?: string;
  primaryKey: boolean;
  unique: boolean;
}

interface CreateTableFormProps {
  connectionId: string;
  schemaName: string;
  isOpen: boolean;
  onClose: () => void;
  onTableCreated: () => void;
}

const CreateTableForm: React.FC<CreateTableFormProps> = ({
  connectionId,
  schemaName,
  isOpen,
  onClose,
  onTableCreated
}) => {
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<ColumnDefinition[]>([
    { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true, unique: true }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Tipos de datos comunes para Firebird
  const dataTypes = [
    'INTEGER', 'BIGINT', 'SMALLINT', 'FLOAT', 'DOUBLE PRECISION',
    'CHAR', 'VARCHAR', 'BLOB', 'DATE', 'TIME', 'TIMESTAMP',
    'BOOLEAN', 'DECIMAL', 'NUMERIC'
  ];

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setTableName('');
    setColumns([{ name: 'id', type: 'INTEGER', nullable: false, primaryKey: true, unique: true }]);
    setError('');
    setSuccess('');
    setLoading(false);
  };

  const handleAddColumn = () => {
    setColumns([...columns, {
      name: '',
      type: 'VARCHAR',
      length: 255,
      nullable: true,
      primaryKey: false,
      unique: false
    }]);
  };

  const handleRemoveColumn = (index: number) => {
    const newColumns = [...columns];
    newColumns.splice(index, 1);
    setColumns(newColumns);
  };

  const handleColumnChange = (index: number, field: keyof ColumnDefinition, value: any) => {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], [field]: value };
    
    // Si se marca como primary key, asegurarse de que no sea nullable
    if (field === 'primaryKey' && value) {
      newColumns[index].nullable = false;
    }
    
    setColumns(newColumns);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tableName) {
      setError('El nombre de la tabla es requerido');
      return;
    }

    if (columns.length === 0) {
      setError('Debe agregar al menos una columna');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await apiService.createTable({
        connectionId,
        schemaName,
        tableName,
        columns
      });

      if (result.success) {
        setSuccess(`Tabla "${tableName}" creada exitosamente`);
        setTimeout(() => {
          onTableCreated();
          onClose();
        }, 1500);
      } else {
        setError(result.message || 'Error al crear la tabla');
      }
    } catch (err: any) {
      console.error('Error al crear tabla:', err);
      setError(err.message || 'Error al crear la tabla');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Crear Nueva Tabla</h2>
          <button 
            className="modal-close-btn" 
            onClick={onClose}
            disabled={loading}
            title="Cerrar"
          >
            ✕
          </button>
        </div>
        
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {success && (
          <div className="success-message">
            <strong>Éxito:</strong> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="create-table-form">
          <div className="form-group">
            <label htmlFor="tableName">Nombre de la Tabla *</label>
            <input
              type="text"
              id="tableName"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              required
              placeholder="nombre_tabla"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Esquema:</label>
            <div className="schema-display">{schemaName}</div>
          </div>

          <div className="form-group">
            <label>Columnas:</label>
            <div className="columns-container">
              {columns.map((column, index) => (
                <div key={index} className="column-definition">
                  <div className="column-row">
                    <input
                      type="text"
                      placeholder="nombre_columna"
                      value={column.name}
                      onChange={(e) => handleColumnChange(index, 'name', e.target.value)}
                      required
                      disabled={loading}
                    />
                    
                    <select
                      value={column.type}
                      onChange={(e) => handleColumnChange(index, 'type', e.target.value)}
                      disabled={loading}
                    >
                      {dataTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    
                    {(column.type === 'VARCHAR' || column.type === 'CHAR') && (
                      <input
                        type="number"
                        placeholder="Longitud"
                        value={column.length || ''}
                        onChange={(e) => handleColumnChange(index, 'length', parseInt(e.target.value) || undefined)}
                        min="1"
                        disabled={loading}
                      />
                    )}
                    
                    <div className="column-options">
                      <label>
                        <input
                          type="checkbox"
                          checked={column.nullable}
                          onChange={(e) => handleColumnChange(index, 'nullable', e.target.checked)}
                          disabled={column.primaryKey || loading}
                        /> NULL
                      </label>
                      
                      <label>
                        <input
                          type="checkbox"
                          checked={column.primaryKey}
                          onChange={(e) => handleColumnChange(index, 'primaryKey', e.target.checked)}
                          disabled={loading}
                        /> PK
                      </label>
                      
                      <label>
                        <input
                          type="checkbox"
                          checked={column.unique}
                          onChange={(e) => handleColumnChange(index, 'unique', e.target.checked)}
                          disabled={loading}
                        /> UNIQUE
                      </label>
                    </div>
                    
                    <button
                      type="button"
                      className="remove-column-btn"
                      onClick={() => handleRemoveColumn(index)}
                      disabled={loading}
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="column-row">
                    <input
                      type="text"
                      placeholder="Valor por defecto (opcional)"
                      value={column.defaultValue || ''}
                      onChange={(e) => handleColumnChange(index, 'defaultValue', e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                className="add-column-btn"
                onClick={handleAddColumn}
                disabled={loading}
              >
                + Agregar Columna
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              className="create-btn"
              disabled={loading || !tableName || columns.length === 0}
            >
              {loading ? 'Creando...' : 'Crear Tabla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTableForm;