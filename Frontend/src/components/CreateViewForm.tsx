import React, { useState } from 'react';
import apiService from '../services/apiService';
import './CreateViewForm.css';

interface CreateViewFormProps {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
  onSuccess?: () => void;
}

const CreateViewForm: React.FC<CreateViewFormProps> = ({
  isOpen,
  onClose,
  connectionId,
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

      let ddl = `CREATE VIEW ${viewName.toUpperCase()} AS\n${sqlQuery}`;
      
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
                placeholder="Escribe tu consulta SQL aquí..."
                className="form-input"
                required
              />
              <button
                type="button"
                onClick={insertExampleQuery}
                className="example-query-btn"
              >
                Ejemplo
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

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
              disabled={loading || !viewName.trim() || !sqlQuery.trim()}
            >
              {loading ? 'Creando...' : 'Crear Vista'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateViewForm;
