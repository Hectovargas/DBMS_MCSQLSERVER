// ========== IMPORTS ==========
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-sql';
import 'prismjs/themes/prism-tomorrow.css';
import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import './ObjectDDLViewer.css';

// ========== INTERFAZ DE PROPS ==========
interface ObjectDDLViewerProps {
  connectionId: string | null;
  objectName: string | null;
  schemaName: string | null;
  objectType: 'function' | 'trigger' | 'procedure' | 'view' | 'index' | 'sequence' | 'table' | 'user';
}

// ========== COMPONENTE PRINCIPAL ==========
const ObjectDDLViewer: React.FC<ObjectDDLViewerProps> = ({ 
  connectionId, 
  objectName, 
  schemaName, 
  objectType 
}) => {
  console.log('ObjectDDLViewer rendered with props:', { connectionId, objectName, schemaName, objectType });
  
  // ========== ESTADOS DEL COMPONENTE ==========
  const [ddl, setDdl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // ========== EFECTO PARA CARGAR DDL ==========
  useEffect(() => {
    if (connectionId && objectName) {
      loadObjectDDL();
    } else {
      setDdl('');
      setError('');
    }
  }, [connectionId, objectName, objectType]);

  // ========== FUNCIONES PARA CARGAR DATOS ==========
  const loadObjectDDL = async () => {
    if (!connectionId || !objectName) return;

    setLoading(true);
    setError('');

    try {
      let result;
      
      switch (objectType) {
        case 'table':
          result = await apiService.generateTableDDL(connectionId, objectName, schemaName || '');
          break;
        case 'function':
          result = await apiService.generateFunctionDDL(connectionId, objectName, schemaName || '');
          break;
        case 'trigger':
          result = await apiService.generateTriggerDDL(connectionId, objectName, schemaName || '');
          break;
        case 'procedure':
          result = await apiService.generateProcedureDDL(connectionId, objectName, schemaName || '');
          break;
        case 'view':
          result = await apiService.generateViewDDL(connectionId, objectName, schemaName || '');
          break;
        case 'index':
          result = await apiService.generateIndexDDL(connectionId, objectName, schemaName || '');
          break;
        case 'sequence':
          result = await apiService.generateSequenceDDL(connectionId, objectName, schemaName || '');
          break;
        case 'user':
          result = await apiService.generateUserDDL(connectionId, objectName, schemaName || '');
          break;
        default:
          throw new Error('Tipo de objeto no soportado');
      }

      if (result.success) {
        setDdl(result.data || '');
      } else {
        setError(result.message || 'Error al cargar el DDL');
      }
    } catch (err: any) {
      console.error('Error al cargar DDL:', err);
      setError(err.message || 'Error al cargar el DDL');
    } finally {
      setLoading(false);
    }
  };

  // ========== FUNCIONES AUXILIARES ==========
  const getObjectTypeDisplayName = (): string => {
    switch (objectType) {
      case 'table': return 'Tabla';
      case 'function': return 'Función';
      case 'trigger': return 'Trigger';
      case 'procedure': return 'Procedimiento';
      case 'view': return 'Vista';
      case 'index': return 'Índice';
      case 'sequence': return 'Secuencia';
      case 'user': return 'Usuario';
      default: return 'Objeto';
    }
  };

  const getDDLTitle = (): string => {
    switch (objectType) {
      case 'function': return 'CREATE FUNCTION';
      case 'trigger': return 'CREATE TRIGGER';
      case 'procedure': return 'CREATE PROCEDURE';
      case 'view': return 'CREATE VIEW';
      case 'index': return 'CREATE INDEX';
      case 'sequence': return 'CREATE SEQUENCE';
      default: return 'CREATE';
    }
  };

  // ========== VALIDACIÓN DE PROPS ==========
  if (!connectionId || !objectName) {
    return (
      <div className="object-ddl-viewer">
        <div className="no-object-selected">
          <p><span className="warning-icon"></span> Selecciona un {getObjectTypeDisplayName().toLowerCase()} del sidebar para ver su DDL</p>
        </div>
      </div>
    );
  }

  // ========== RENDERIZADO DEL COMPONENTE ==========
  return (
    <div className="object-ddl-viewer">
      {/* ========== ENCABEZADO CON INFORMACIÓN DEL OBJETO ========== */}
      <div className="object-header">
        <h3>DDL del {getObjectTypeDisplayName()}: {objectName}</h3>
        {schemaName && <span className="schema-name">Esquema: {schemaName}</span>}
      </div>

      {/* ========== INDICADOR DE CARGA ========== */}
      {loading && (
        <div className="loading-message">
          <p>Generando DDL del {getObjectTypeDisplayName().toLowerCase()}...</p>
        </div>
      )}

      {/* ========== MENSAJE DE ERROR ========== */}
      {error && (
        <div className="error-message">
          <p><span className="error-icon"></span> {error}</p>
        </div>
      )}

      {/* ========== CONTENIDO DEL DDL ========== */}
      {!loading && !error && (
        <div className="ddl-content">
          <div className="ddl-header">
            <h4>Sentencia {getDDLTitle()}</h4>
            <p>Consulta para recrear este {getObjectTypeDisplayName().toLowerCase()}:</p>
          </div>

          {/* DDL del objeto */}
          <div className="ddl-suggestion">
            <div className="ddl-header">
              <span>DDL del {getObjectTypeDisplayName().toLowerCase()}</span>
              <button
                className="copy-btn"
                onClick={() => navigator.clipboard.writeText(ddl)}
              >
                Copiar
              </button>
            </div>
            <Editor
              value={ddl}
              onValueChange={() => { }}
              highlight={(code) => highlight(code, languages.sql, 'sql')}
              padding={16}
              style={{
                fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace',
                fontSize: 13,
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                lineHeight: 1.5
              }}
              textareaClassName="ddl-code"
              readOnly
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Exportamos el componente para que pueda ser usado en otros archivos
export default ObjectDDLViewer;
