import React, { useState } from 'react';
import apiService from '../services/apiService';
import './CreateViewForm.css';

interface CreateViewFormProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
  schemaName: string;
  onSuccess?: () => void;
}

const CreateViewForm: React.FC<CreateViewFormProps> = ({
  isOpen,
  onClose,
  connectionId,
  schemaName,
  onSuccess
}) => {
  const [viewName, setViewName] = useState('');
  const [sqlQuery, setSqlQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      if (!viewName.trim()) {
        setError('El nombre de la vista es requerido');
        return;
      }

      if (!sqlQuery.trim()) {
        setError('La consulta SQL es requerida');
        return;
      }

      const ddl = `CREATE VIEW ${schemaName}.${viewName.toUpperCase()} AS\n${sqlQuery}`;
      
      const result = await apiService.executeQuery(connectionId, ddl);
      
      if (result.success) {
        alert('Vista creada exitosamente');
        onSuccess?.();
        onClose();
        setViewName('');
        setSqlQuery('');
      } else {
        setError(result.error?.message || 'Error al crear la vista');
      }
    } catch (err) {
      setError('Error al crear la vista: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const insertExampleQuery = () => {
    setSqlQuery(`SELECT 
  t1.id,
  t1.nombre,
  t1.apellido,
  t2.departamento
FROM tabla1 t1
LEFT JOIN tabla2 t2 ON t1.id = t2.id
WHERE t1.activo = 1`);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content create-view-modal">
        <div className="modal-header">
          <h2>Crear Nueva Vista</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="viewName">Nombre de la Vista:</label>
            <input
              type="text"
              id="viewName"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="nombre_vista"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="sqlQuery">Consulta SQL:</label>
            <div className="query-container">
              <textarea
                id="sqlQuery"
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                placeholder="SELECT * FROM tabla WHERE condicion = 'valor'"
                className="sql-textarea"
                rows={12}
              />
              <button
                type="button"
                onClick={insertExampleQuery}
                className="example-btn"
              >
                Insertar Ejemplo
              </button>
            </div>
            <small className="help-text">
              Escribe la consulta SQL que definirá la vista. La vista se creará en el esquema: <strong>{schemaName}</strong>
            </small>
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
            {loading ? 'Creando...' : 'Crear Vista'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateViewForm;
