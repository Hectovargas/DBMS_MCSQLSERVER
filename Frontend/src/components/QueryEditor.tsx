// ========== IMPORTS ==========
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-sql';
import 'prismjs/themes/prism-tomorrow.css';
// Importamos React y los hooks necesarios para el componente
import React, { useState, useEffect } from 'react';
// Importamos el servicio para ejecutar consultas SQL
import apiService from '../services/apiService';
// Importamos el tipo TypeScript para los resultados de consultas
import type { QueryResult } from '../services/apiService';
// Importamos los estilos CSS específicos para este componente
import './QueryEditor.css';

// ========== INTERFAZ DE PROPS ==========
// Definimos la interfaz TypeScript para las props que recibe el componente
interface QueryEditorProps {
  connectionId: string | null; // ID de la conexión activa (puede ser null si no hay conexión)
  onQueryExecuted?: (result: QueryResult) => void; // Callback opcional cuando se ejecuta una consulta
  initialQuery?: string; // Query inicial para cargar en el editor
}

// ========== COMPONENTE PRINCIPAL ==========
const QueryEditor: React.FC<QueryEditorProps> = ({ connectionId, onQueryExecuted, initialQuery = '' }) => {
  // ========== ESTADOS DEL EDITOR ==========
  
  // Estado para almacenar la consulta SQL que escribe el usuario
  const [query, setQuery] = useState<string>(initialQuery);
  
  // Estado para almacenar el resultado de la consulta ejecutada
  const [result, setResult] = useState<QueryResult | null>(null);
  
  // Estado para controlar si se está ejecutando una consulta
  const [loading, setLoading] = useState(false);
  
  // Estado para mostrar mensajes de error
  const [error, setError] = useState<string>('');
  
  // Estado para almacenar el tiempo de ejecución de la consulta
  const [executionTime, setExecutionTime] = useState<number>(0);

  // ========== EFECTOS ==========
  
  // Efecto para actualizar la query cuando cambia initialQuery
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // ========== FUNCIONES MANEJADORAS ==========
  
  // Función principal para ejecutar la consulta SQL
  const handleExecuteQuery = async () => {
    // Validación: necesitamos una conexión y una consulta
    if (!connectionId || !query.trim()) {
      setError('Selecciona una conexión y escribe una consulta');
      return;
    }

    // Preparamos el estado para la ejecución
    setLoading(true); // Activamos el indicador de carga
    setError(''); // Limpiamos errores anteriores
    setResult(null); // Limpiamos resultados anteriores

    try {
      // Medimos el tiempo de inicio
      const startTime = Date.now();
      
      // Ejecutamos la consulta a través del servicio
      const queryResult = await apiService.executeQuery(connectionId, query.trim());
      
      // Medimos el tiempo de fin
      const endTime = Date.now();
      
      // Calculamos y guardamos el tiempo de ejecución
      setExecutionTime(endTime - startTime);
      
      // Verificamos si la consulta fue exitosa
      if (queryResult.success) {
        // Guardamos el resultado exitoso
        setResult(queryResult);
        
        // Notificamos al componente padre si se proporcionó el callback
        if (onQueryExecuted) {
          onQueryExecuted(queryResult);
        }
      } else {
        // Si la consulta no fue exitosa, mostramos el error
        setError(queryResult.error?.message || 'Error al ejecutar la consulta');
        setResult(null);
      }
    } catch (err: any) {
      // Manejamos errores de red o del servidor
      setError(err.message || 'Error al ejecutar la consulta');
      setResult(null);
    } finally {
      // Siempre desactivamos el indicador de carga
      setLoading(false);
    }
  };

  // Función para limpiar la consulta actual
  const handleClearQuery = () => {
    setQuery(''); // Limpiamos el texto de la consulta
    setResult(null); // Limpiamos los resultados
    setError(''); // Limpiamos errores
    setExecutionTime(0); // Reseteamos el tiempo de ejecución
  };

  // Función para limpiar solo los resultados
  const handleClearResults = () => {
    setResult(null); // Limpiamos los resultados
    setError(''); // Limpiamos errores
    setExecutionTime(0); // Reseteamos el tiempo de ejecución
  };

  // ========== FUNCIONES AUXILIARES ==========
  
  // Función para formatear valores en la tabla de resultados
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'NULL'; // Mostramos NULL para valores nulos
    }
    if (typeof value === 'object') {
      return JSON.stringify(value); // Convertimos objetos a JSON
    }
    return String(value); // Convertimos otros tipos a string
  };

  // Función para obtener las columnas de los datos
  const getColumnsFromData = (data: any[] | undefined): { name: string; type: string }[] => {
    if (!data || data.length === 0) return [];
    
    const firstRow = data[0];
    return Object.keys(firstRow).map(key => ({
      name: key,
      type: typeof firstRow[key]
    }));
  };

  // ========== RENDERIZADO DEL COMPONENTE ==========
  return (
    // Contenedor principal del editor
    <div className="query-editor">
      {/* ========== ENCABEZADO DEL EDITOR ========== */}
      <div className="query-editor-header">
        <h3>Editor de Consultas SQL</h3>
        
        {/* ========== BOTONES DE ACCIÓN ========== */}
        <div className="query-actions">
          {/* Botón para ejecutar la consulta */}
          <button
            className="execute-btn"
            onClick={handleExecuteQuery}
            disabled={loading || !connectionId || !query.trim()} // Deshabilitado si está cargando, no hay conexión o no hay consulta
          >
            {loading ? 'Ejecutando...' : 'Ejecutar (Ctrl+Enter)'}
          </button>
          
          {/* Botón para limpiar la consulta */}
          <button className="clear-query-btn" onClick={handleClearQuery}>
            Limpiar Consulta
          </button>
          
          {/* Botón para limpiar solo los resultados */}
          <button className="clear-results-btn" onClick={handleClearResults}>
            Limpiar Resultados
          </button>
        </div>
      </div>

      {/* ========== ADVERTENCIA SI NO HAY CONEXIÓN ========== */}
      {!connectionId && (
        <div className="no-connection-warning">
          <p><span className="warning-icon"></span> Selecciona una conexión de base de datos para ejecutar consultas</p>
        </div>
      )}

      {/* ========== SECCIÓN DE ENTRADA DE CONSULTA ========== */}
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
      {/* ========== SECCIÓN DE RESULTADOS ========== */}
      {result && result.success && (
        <div className="query-results">
          {/* ========== INFORMACIÓN DE LA EJECUCIÓN ========== */}
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

          {/* ========== TABLA DE RESULTADOS ========== */}
          {result.data && result.data.length > 0 && (
            <div className="result-table-container">
              <table className="result-table">
                {/* ========== ENCABEZADOS DE LA TABLA ========== */}
                <thead>
                  <tr>
                    {/* Usamos las columnas del resultado o las inferimos de los datos */}
                    {(result.columns || getColumnsFromData(result.data)).map((column, index) => (
                      <th key={index}>{column.name}</th>
                    ))}
                  </tr>
                </thead>
                
                {/* ========== CUERPO DE LA TABLA ========== */}
                <tbody>
                  {result.data.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {/* Usamos las columnas del resultado o las inferimos de los datos */}
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

          {/* ========== MENSAJE SI NO HAY DATOS ========== */}
          {result.data && result.data.length === 0 && (
            <div className="no-data-message">
              <p>La consulta se ejecutó correctamente pero no devolvió datos.</p>
            </div>
          )}

          {/* ========== MENSAJE PARA CONSULTAS SIN DATOS (INSERT, UPDATE, DELETE) ========== */}
          {!result.data && result.rowsAffected !== undefined && (
            <div className="no-data-message">
              <p>Consulta ejecutada correctamente. Filas afectadas: {result.rowsAffected}</p>
            </div>
          )}
        </div>
      )}

      {/* ========== MENSAJE DE ERROR ========== */}
      {error && (
        <div className="error-message">
          <p><span className="error-icon"></span> {error}</p>
        </div>
      )}
    </div>
  );
};

// Exportamos el componente para que pueda ser usado en otros archivos
export default QueryEditor;