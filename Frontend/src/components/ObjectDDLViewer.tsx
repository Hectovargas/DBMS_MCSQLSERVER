
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-sql';
import 'prismjs/themes/prism-tomorrow.css';
import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import './ObjectDDLViewer.css';

interface ObjectDDLViewerProps {
  connectionId: string | null;
  objectName: string | null;
  objectType: 'function' | 'trigger' | 'procedure' | 'view' | 'index' | 'sequence' | 'table' | 'user' | 'package';
}

const ObjectDDLViewer: React.FC<ObjectDDLViewerProps> = ({ 
  connectionId, 
  objectName, 
  objectType 
}) => {
  
  const [ddl, setDdl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (connectionId && objectName) {
      loadObjectDDL();
    } else {
      setDdl('');
      setError('');
    }
  }, [connectionId, objectName, objectType]);

  const loadObjectDDL = async () => {
    if (!connectionId || !objectName) return;

    setLoading(true);
    setError('');

    try {
      let result;
      
      switch (objectType) {
        case 'table':
          result = await apiService.generateTableDDL(connectionId, objectName);
          break;
        case 'function':
          result = await apiService.generateFunctionDDL(connectionId, objectName);
          break;
        case 'trigger':
          result = await apiService.generateTriggerDDL(connectionId, objectName);
          break;
        case 'procedure':
          result = await apiService.generateProcedureDDL(connectionId, objectName);
          break;
        case 'view':
          result = await apiService.generateViewDDL(connectionId, objectName);
          break;
        case 'index':
          result = await apiService.generateIndexDDL(connectionId, objectName);
          break;
        case 'sequence':
          result = await apiService.generateSequenceDDL(connectionId, objectName);
          break;
        case 'user':
          result = await apiService.generateUserDDL(connectionId, objectName);
          break;
        case 'package':
          result = await apiService.generatePackageDDL(connectionId, objectName);
          break;
        default:
          throw new Error('Tipo de objeto no soportado');
      }

      if (result.success) {
        const ddlContent = objectType === 'package' 
          ? result.data?.ddl || '' 
          : result.data || '';
        
        setDdl(ddlContent);
      } else {
        setError(result.message || 'Error al cargar el DDL');
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar el DDL');
    } finally {
      setLoading(false);
    }
  };

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
      case 'package': return 'Paquete';
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
      case 'package': return 'CREATE PACKAGE';
      default: return 'CREATE';
    }
  };


  
  const safeHighlight = (code: any): string => {
    try {
      if (typeof code !== 'string') {
        console.warn('Expected string for highlighting, got:', typeof code);
        return highlight('', languages.sql, 'sql');
      }
      return highlight(code, languages.sql, 'sql');
    } catch (error) {
      console.error('Error in syntax highlighting:', error);
      return code || '';
    }
  };

  if (!connectionId || !objectName) {
    return (
      <div className="object-ddl-viewer">
        <div className="no-object-selected">
          <p><span className="warning-icon"></span> Selecciona un {getObjectTypeDisplayName().toLowerCase()} del sidebar para ver su DDL</p>
        </div>
      </div>
    );
  }

  return (
    <div className="object-ddl-viewer">
      <div className="object-header">
        <h3>DDL del {getObjectTypeDisplayName()}: {objectName}</h3>
      </div>

      {loading && (
        <div className="loading-message">
          <p>Generando DDL del {getObjectTypeDisplayName().toLowerCase()}...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <p><span className="error-icon"></span> {error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="ddl-content">
          <div className="ddl-header">
            <h4>Sentencia {getDDLTitle()}</h4>
            <p>Consulta para recrear este {getObjectTypeDisplayName().toLowerCase()}:</p>
          </div>

          <div className="ddl-suggestion">
            <div className="ddl-header">
              <span>DDL del {getObjectTypeDisplayName().toLowerCase()}</span>
              <button
                className="copy-btn"
                onClick={() => navigator.clipboard.writeText(ddl || '')}
                disabled={!ddl}
              >
                Copiar
              </button>
            </div>
            <Editor
              value={ddl || ''} 
              onValueChange={() => { }}
              highlight={(code) => safeHighlight(code)}
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

export default ObjectDDLViewer;