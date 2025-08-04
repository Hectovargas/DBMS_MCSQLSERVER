// ========== IMPORTS ==========
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-sql';
import 'prismjs/themes/prism-tomorrow.css';
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

  // Función para transformar los datos de las columnas
  const transformColumnData = (columns: any[]): Column[] => {
    return columns.map(col => ({
      name: col.name || '',
      dataType: col.dataType || 'unknown',
      maxLength: col.maxLength,
      precision: col.precision,
      scale: col.scale,
      isNullable: Boolean(col.isNullable),
      isIdentity: Boolean(col.isIdentity),
      isPrimaryKey: Boolean(col.isPrimaryKey),
      isForeignKey: Boolean(col.isForeignKey),
      defaultValue: col.defaultValue || '',
      description: col.description || ''
    }));
  };

  // Función para cargar las columnas de la tabla desde la API
  const loadTableColumns = async () => {
    // Validación: necesitamos conexión y nombre de tabla
    if (!connectionId || !tableName) return;

    // Preparamos el estado para la carga
    setLoading(true);
    setError('');

    try {
      // Llamamos a la API para obtener las columnas
      const result = await apiService.getTableColumns(connectionId, tableName, schemaName || 'dbo');

      if (result.success) {
        // Si la respuesta es exitosa, transformamos y guardamos las columnas
        const transformedColumns = transformColumnData(result.data || []);
        setColumns(transformedColumns);
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
    let type = column.dataType || 'unknown'; // Tipo base de la columna

    // Agregamos información de longitud si está disponible
    if (column.maxLength !== undefined && column.maxLength !== null) {
      // Para tipos de caracteres, maxLength se divide por 2 para Unicode
      if (type.toLowerCase().includes('char') || type.toLowerCase().includes('text') || type.toLowerCase().includes('nchar') || type.toLowerCase().includes('nvarchar')) {
        const length = column.maxLength === -1 ? 'MAX' : column.maxLength;
        type += `(${length})`;
      } else if (type.toLowerCase() === 'decimal' || type.toLowerCase() === 'numeric') {
        // Para tipos decimales con precisión y escala
        if (column.precision !== undefined && column.scale !== undefined) {
          type += `(${column.precision},${column.scale})`;
        } else if (column.precision !== undefined) {
          type += `(${column.precision})`;
        }
      } else if (type.toLowerCase() === 'float' || type.toLowerCase() === 'real') {
        // Para tipos flotantes
        if (column.precision !== undefined) {
          type += `(${column.precision})`;
        }
      } else if (type.toLowerCase() === 'datetime2' || type.toLowerCase() === 'datetimeoffset') {
        // Para tipos de fecha con precisión
        if (column.scale !== undefined) {
          type += `(${column.scale})`;
        }
      }
    }

    return type;
  };

  // Función para obtener el icono apropiado según el tipo de columna
  const getColumnIcon = (column: Column): string => {
    if (column.isPrimaryKey) return '🔑'; // Llave primaria
    if (column.isForeignKey) return '🔗'; // Llave foránea
    if (column.isIdentity) return '🆔'; // Columna de identidad
    return '';
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
                      <th>Longitud</th>
                      <th>Escala</th>
                      <th>Presicion</th>
                      <th>Nulo</th>
                      <th>Identity</th>
                      <th>Valor por Defecto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((column, index) => (
                      <tr key={index}>
                        <td>
                          <span className="column-name">{getColumnIcon(column)}{' '}{column.name}</span>
                        </td>
                        <td className="data-type">{getDataTypeDisplay(column)}</td>
                        <td className='Longitud'>{column.maxLength}</td>
                        <td className='escala'>{column.scale || '--'}</td>
                        <td className="presicion">{column.precision || '--'}</td>
                        <td className="nullable">{column.isNullable ? 'SI' : 'NO'}</td>
                        <td className="identity">{column.isIdentity ? 'SI' : 'NO'}</td>
                        <td className="default-value">{column.defaultValue || '--'}</td>
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
              <div className="query-suggestion">
                <div className="query-header">
                  <span>Consulta SELECT</span>
                  <button
                    className="copy-btn"
                    onClick={() => navigator.clipboard.writeText(generateSelectQuery())}
                  >
                    Copiar
                  </button>
                </div>
                <Editor
                  value={generateSelectQuery()}
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
                  textareaClassName="query-code"
                  readOnly
                />
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
              <div className="query-suggestion">
                <div className="query-header">
                  <span>Consulta CREATE TABLE</span>
                  <button
                    className="copy-btn"
                    onClick={() => navigator.clipboard.writeText(generateCreateTableQuery())}
                  >
                    Copiar
                  </button>
                </div>
                <Editor
                  value={generateCreateTableQuery()}
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
                  textareaClassName="query-code"
                  readOnly
                />
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