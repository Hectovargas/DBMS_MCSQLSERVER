
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-sql';
import 'prismjs/themes/prism-tomorrow.css';
import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import type { QueryResult } from '../services/apiService';
import './QueryEditor.css';

interface QueryEditorProps {
  connectionId: string | null; 
  connectionName?: string; 
  onQueryExecuted?: (result: QueryResult) => void; 
  initialQuery?: string; 
}

const QueryEditor: React.FC<QueryEditorProps> = ({ connectionId, connectionName, onQueryExecuted, initialQuery = '' }) => {
  
  const [query, setQuery] = useState<string>(initialQuery);
  
  const [result, setResult] = useState<QueryResult | null>(null);
  
  const [loading, setLoading] = useState(false);
  
  const [error, setError] = useState<string>('');
  
  const [executionTime, setExecutionTime] = useState<number>(0);

  
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  
  const handleExecuteQuery = async () => {
    if (!connectionId || !query.trim()) {
      setError('Selecciona una conexión y escribe una consulta');
      return;
    }

    setLoading(true); 
    setError(''); 
    setResult(null); 

    try {

      const startTime = Date.now();
      
      const queryResult = await apiService.executeQuery(connectionId, query.trim());
      
      const endTime = Date.now();
      
      setExecutionTime(endTime - startTime);
      
      if (queryResult.success) {
        setResult(queryResult);
        
        if (onQueryExecuted) {
          onQueryExecuted(queryResult);
        }
      } else {
        setError(queryResult.error?.message || 'Error al ejecutar la consulta');
        setResult(null);
      }
    } catch (err: any) {
      setError(err.message || 'Error al ejecutar la consulta');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClearQuery = () => {
    setQuery(''); 
    setResult(null); 
    setError('');
    setExecutionTime(0); 
  };

  const handleClearResults = () => {
    setResult(null); 
    setError('');
    setExecutionTime(0); 
  };

  
  
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'NULL'; 
    }
    if (typeof value === 'object') {
      return JSON.stringify(value); 
    }
    return String(value); 
  };

  const getColumnsFromData = (data: any[] | undefined): { name: string; type: string }[] => {
    if (!data || data.length === 0) return [];
    
    const firstRow = data[0];
    return Object.keys(firstRow).map(key => ({
      name: key,
      type: typeof firstRow[key]
    }));
  };

  return (
    <div className="query-editor">
      <div className="query-editor-header">
        <div className="header-info">
          <h3>Editor de Consultas SQL</h3>
          {connectionName && (
            <div className="connection-info">
              <span className="connection-label">Conectado a:</span>
              <span className="connection-name">{connectionName}</span>
            </div>
          )}
        </div>
        
        <div className="query-actions">
          <button
            className="execute-btn"
            onClick={handleExecuteQuery}
            disabled={loading || !connectionId || !query.trim()} 
            >
            {loading ? 'Ejecutando...' : 'Ejecutar (Ctrl+Enter)'}
          </button>
          
          <button className="clear-query-btn" onClick={handleClearQuery}>
            Limpiar Consulta
          </button>
          
          <button className="clear-results-btn" onClick={handleClearResults}>
            Limpiar Resultados
          </button>
        </div>
      </div>

      {!connectionId && (
        <div className="no-connection-warning">
          <p><span className="warning-icon"></span> Selecciona una conexión de base de datos para ejecutar consultas</p>
        </div>
      )}

      <div className="query-input-section">
  <Editor
    value={query}
    onValueChange={(code) => setQuery(code)}
    highlight={(code) => highlight(code, languages.sql, 'sql')}
    padding={16}
    style={{
      fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace',
      fontSize: 14,
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-color)',
      borderRadius: '6px',
      minHeight: '180px',
      lineHeight: 1.5
    }}
    textareaClassName="query-textarea"
    placeholder="Escribe tu consulta SQL aquí..."
    disabled={!connectionId}
  />
</div>

      {result && result.success && (
        <div className="query-results">

          <div className="result-info">
            <span className="execution-time">
              Tiempo de ejecución: {executionTime}ms
            </span>
            {result.rowsAffected !== undefined && (
              <span className="rows-affected">
                Filas afectadas: {result.rowsAffected}
              </span>
            )}
          </div>


          {result.data && result.data.length > 0 && (
            <div className="result-table-container">
              <table className="result-table">

                <thead>
                  <tr>

                    {(result.columns || getColumnsFromData(result.data)).map((column, index) => (
                      <th key={index}>{column.name}</th>
                    ))}
                  </tr>
                </thead>
                

                <tbody>
                  {result.data.map((row, rowIndex) => (
                    <tr key={rowIndex}>

                      {(result.columns || getColumnsFromData(result.data)).map((column, colIndex) => (
                        <td key={colIndex}>
                          {formatValue(row[column.name])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}


          {result.data && result.data.length === 0 && (
            <div className="no-data-message">
              <p>La consulta se ejecutó correctamente pero no devolvió datos.</p>
            </div>
          )}


          {!result.data && result.rowsAffected !== undefined && (
            <div className="no-data-message">
              <p>Consulta ejecutada correctamente. Filas afectadas: {result.rowsAffected}</p>
            </div>
          )}
        </div>
      )}


      {error && (
        <div className="error-message">
          <p><span className="error-icon"></span> {error}</p>
        </div>
      )}
    </div>
  );
};


export default QueryEditor;