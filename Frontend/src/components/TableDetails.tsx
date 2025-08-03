// ========== IMPORTS ==========
// Importamos React y los hooks necesarios para el componente
import React, { useState, useEffect } from 'react';
// Importamos el servicio para obtener información de tablas
import apiService from '../services/apiService';
// Importamos el tipo TypeScript para las columnas de tabla
import type { Column } from '../services/apiService';
// Importamos los estilos CSS específicos para este componente
import './TableDetails.css';

// ========== INTERFAZ DE PROPS ==========
// Definimos la interfaz TypeScript para las props que recibe el componente
interface TableDetailsProps {
  connectionId: string | null; // ID de la conexión activa
  tableName: string | null; // Nombre de la tabla seleccionada
  schemaName: string | null; // Nombre del esquema de la tabla
}

// ========== COMPONENTE PRINCIPAL ==========
const TableDetails: React.FC<TableDetailsProps> = ({ connectionId, tableName, schemaName }) => {
  // ========== ESTADOS DEL COMPONENTE ==========
  
  // Estado para almacenar las columnas de la tabla
  const [columns, setColumns] = useState<Column[]>([]);
  
  // Estado para controlar si se están cargando los datos
  const [loading, setLoading] = useState(false);
  
  // Estado para mostrar mensajes de error
  const [error, setError] = useState<string>('');
  
  // Estado para controlar qué pestaña está activa
  const [activeTab, setActiveTab] = useState<'columns' | 'data' | 'structure'>('columns');

  // ========== EFECTO PARA CARGAR DATOS ==========
  // useEffect se ejecuta cuando cambian connectionId o tableName
  useEffect(() => {
    if (connectionId && tableName) {
      // Si tenemos conexión y tabla, cargamos las columnas
      loadTableColumns();
    } else {
      // Si no tenemos conexión o tabla, limpiamos los datos
      setColumns([]);
      setError('');
    }
  }, [connectionId, tableName]); // Dependencias del efecto

  // ========== FUNCIONES PARA CARGAR DATOS ==========
  
  // Función para cargar las columnas de la tabla desde la API
  const loadTableColumns = async () => {
    // Validación: necesitamos conexión y nombre de tabla
    if (!connectionId || !tableName) return;

    // Preparamos el estado para la carga
    setLoading(true);
    setError('');

    try {
      // Llamamos a la API para obtener las columnas
      const result = await apiService.getTableColumns(connectionId, tableName);
      
      if (result.success) {
        // Si la respuesta es exitosa, guardamos las columnas
        setColumns(result.data || []);
      } else {
        // Si hay error en la respuesta, mostramos el mensaje
        setError(result.message || 'Error al cargar las columnas');
      }
    } catch (err: any) {
      // Manejamos errores de red o del servidor
      setError(err.message || 'Error al cargar las columnas');
    } finally {
      // Siempre desactivamos el indicador de carga
      setLoading(false);
    }
  };

  // ========== FUNCIONES AUXILIARES ==========
  
  // Función para formatear el tipo de dato de una columna
  const getDataTypeDisplay = (column: Column): string => {
    let type = column.dataType; // Tipo base de la columna
    
    // Agregamos información de longitud si está disponible
    if (column.maxLength && column.maxLength !== -1) {
      type += `(${column.maxLength})`;
    } else if (column.precision && column.scale) {
      // Para tipos decimales con precisión y escala
      type += `(${column.precision},${column.scale})`;
    } else if (column.precision) {
      // Para tipos con solo precisión
      type += `(${column.precision})`;
    }
    
    return type;
  };

  // Función para obtener el icono apropiado según el tipo de columna
  const getColumnIcon = (column: Column): string => {
    if (column.isPrimaryKey) return '🔑'; // Llave primaria
    if (column.isForeignKey) return '��'; // Llave foránea
    if (column.isIdentity) return '🆔'; // Columna de identidad
    return '📋'; // Columna normal
  };

  // Función para generar una consulta SELECT para la tabla
  const generateSelectQuery = (): string => {
    if (!tableName || !schemaName) return '';
    
    // Creamos una lista de nombres de columnas separados por comas
    const columnNames = columns.map(col => col.name).join(', ');
    return `SELECT ${columnNames || '*'} FROM [${schemaName}].[${tableName}]`;
  };

  // Función para generar una consulta CREATE TABLE basada en la estructura actual
  const generateCreateTableQuery = (): string => {
    if (!tableName || !schemaName || columns.length === 0) return '';
    
    // Generamos las definiciones de cada columna
    const columnDefinitions = columns.map(col => {
      let definition = `  [${col.name}] ${getDataTypeDisplay(col)}`;
      
      // Agregamos restricciones según las propiedades de la columna
      if (!col.isNullable) {
        definition += ' NOT NULL';
      }
      
      if (col.isIdentity) {
        definition += ' IDENTITY(1,1)';
      }
      
      if (col.defaultValue) {
        definition += ` DEFAULT ${col.defaultValue}`;
      }
      
      return definition;
    }).join(',\n');
    
    // Retornamos la consulta CREATE TABLE completa
    return `CREATE TABLE [${schemaName}].[${tableName}] (\n${columnDefinitions}\n);`;
  };

  // ========== VALIDACIÓN DE PROPS ==========
  // Si no tenemos conexión o tabla, mostramos un mensaje
  if (!connectionId || !tableName) {
    return (
      <div className="table-details">
        <div className="no-table-selected">
          <p>⚠️ Selecciona una tabla del sidebar para ver sus detalles</p>
        </div>
      </div>
    );
  }

  // ========== RENDERIZADO DEL COMPONENTE ==========
  return (
    // Contenedor principal de detalles de tabla
    <div className="table-details">
      {/* ========== ENCABEZADO CON INFORMACIÓN DE LA TABLA ========== */}
      <div className="table-header">
        <h3>Detalles de la Tabla: {tableName}</h3>
        {schemaName && <span className="schema-name">Esquema: {schemaName}</span>}
      </div>

      {/* ========== PESTAÑAS DE NAVEGACIÓN ========== */}
      <div className="table-tabs">
        <button
          className={`tab-btn ${activeTab === 'columns' ? 'active' : ''}`}
          onClick={() => setActiveTab('columns')}
        >
          📋 Columnas
        </button>
        <button
          className={`tab-btn ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
        >
          📊 Datos
        </button>
        <button
          className={`tab-btn ${activeTab === 'structure' ? 'active' : ''}`}
          onClick={() => setActiveTab('structure')}
        >
          🏗️ Estructura
        </button>
      </div>

      {/* ========== INDICADOR DE CARGA ========== */}
      {loading && (
        <div className="loading-message">
          <p>Cargando información de la tabla...</p>
        </div>
      )}

      {/* ========== MENSAJE DE ERROR ========== */}
      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
        </div>
      )}

      {/* ========== CONTENIDO DE LAS PESTAÑAS ========== */}
      {!loading && !error && (
        <div className="tab-content">
          {/* ========== PESTAÑA: COLUMNAS ========== */}
          {activeTab === 'columns' && (
            <div className="columns-tab">
              <div className="columns-header">
                <h4>Columnas de la Tabla ({columns.length})</h4>
              </div>
              
              {/* Tabla de columnas */}
              <div className="columns-table-container">
                <table className="columns-table">
                  <thead>
                    <tr>
                      <th>Columna</th>
                      <th>Tipo de Dato</th>
                      <th>Nulo</th>
                      <th>Valor por Defecto</th>
                      <th>Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((column, index) => (
                      <tr key={index}>
                        <td>
                          <span className="column-icon">{getColumnIcon(column)}</span>
                          <span className="column-name">{column.name}</span>
                        </td>
                        <td className="data-type">{getDataTypeDisplay(column)}</td>
                        <td className="nullable">
                          {column.isNullable ? 'Sí' : 'No'}
                        </td>
                        <td className="default-value">
                          {column.defaultValue || '-'}
                        </td>
                        <td className="description">
                          {column.description || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========== PESTAÑA: DATOS ========== */}
          {activeTab === 'data' && (
            <div className="data-tab">
              <div className="data-header">
                <h4>Consulta de Datos</h4>
                <p>Usa esta consulta para obtener los datos de la tabla:</p>
              </div>
              
              {/* Consulta SELECT generada automáticamente */}
              <div className="query-section">
                <label>Consulta SELECT:</label>
                <textarea
                  className="generated-query"
                  value={generateSelectQuery()}
                  readOnly
                />
                <button
                  className="copy-query-btn"
                  onClick={() => navigator.clipboard.writeText(generateSelectQuery())}
                >
                  📋 Copiar Consulta
                </button>
              </div>
            </div>
          )}

          {/* ========== PESTAÑA: ESTRUCTURA ========== */}
          {activeTab === 'structure' && (
            <div className="structure-tab">
              <div className="structure-header">
                <h4>Estructura de la Tabla</h4>
                <p>Consulta CREATE TABLE para recrear esta tabla:</p>
              </div>
              
              {/* Consulta CREATE TABLE generada automáticamente */}
              <div className="query-section">
                <label>Consulta CREATE TABLE:</label>
                <textarea
                  className="generated-query"
                  value={generateCreateTableQuery()}
                  readOnly
                />
                <button
                  className="copy-query-btn"
                  onClick={() => navigator.clipboard.writeText(generateCreateTableQuery())}
                >
                  📋 Copiar Consulta
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Exportamos el componente para que pueda ser usado en otros archivos
export default TableDetails;