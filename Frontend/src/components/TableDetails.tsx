import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-sql';
import 'prismjs/themes/prism-tomorrow.css';
import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import type { Column } from '../services/apiService';
import './TableDetails.css';
interface TableDetailsProps {
  connectionId: string | null;
  tableName: string | null;
}
const TableDetails: React.FC<TableDetailsProps> = ({ connectionId, tableName }) => {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'columns' | 'data'>('columns');
  useEffect(() => {
    if (connectionId && tableName) {
      loadTableColumns();
    } else {
      setColumns([]);
      setError('');
    }
  }, [connectionId, tableName]);
  const transformColumnData = (columns: any[]): Column[] => {
    const mapFirebirdTypeCodeToName = (typeCode: any): string => {
      const numericCode = typeof typeCode === 'number' ? typeCode : parseInt(String(typeCode), 10);
      switch (numericCode) {
        case 7: return 'SMALLINT';
        case 8: return 'INTEGER';
        case 9: return 'QUAD';
        case 10: return 'FLOAT';
        case 11: return 'D_FLOAT';
        case 12: return 'DATE';
        case 13: return 'TIME';
        case 14: return 'CHAR';
        case 16: return 'INT64';
        case 27: return 'DOUBLE';
        case 35: return 'TIMESTAMP';
        case 37: return 'VARCHAR';
        case 40: return 'CSTRING';
        case 261: return 'BLOB';
        default: return 'UNKNOWN';
      }
    };
    return columns.map(col => {
      const rawType = col.dataType ?? col.DATATYPE ?? 'unknown';
      const normalizedType = typeof rawType === 'number' || /^\d+$/.test(String(rawType))
        ? mapFirebirdTypeCodeToName(rawType)
        : String(rawType).trim();
      return {
        name: (col.name || col.NAME || '').trim(),
        dataType: normalizedType,
        maxLength: col.maxLength || col.MAXLENGTH,
        precision: col.precision || col.PRECISION || undefined,
        scale: col.scale || col.SCALE,
        isNullable: !(col.isNullable === 0 || col.ISNULLABLE === 0 || col.isNullable === false),
        isIdentity: Boolean(col.isIdentity || col.ISIDENTITY),
        isPrimaryKey: Boolean(col.isPrimaryKey || col.ISPRIMARYKEY),
        isForeignKey: Boolean(col.isForeignKey || col.ISFOREIGNKEY),
        defaultValue: (col.defaultValue || col.DEFAULTVALUE || '').trim(),
        description: (col.description || col.DESCRIPTION || '').trim()
      };
    });
  };
  const loadTableColumns = async () => {
    if (!connectionId || !tableName) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await apiService.getTableColumns(connectionId, tableName);
      if (result.success) {
        const transformedColumns = transformColumnData(result.data || []);
        setColumns(transformedColumns);
        loadTableDDL();
      } else {
        setError(result.message || 'Error al cargar las columnas');
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar las columnas');
    } finally {
      setLoading(false);
    }
  };
  const loadTableDDL = async () => {
    if (!connectionId || !tableName) return;
    setLoadingDDL(true);
    try {
      const result = await apiService.generateTableDDL(connectionId, tableName);
      if (result.success) {
        setTableDDL(result.data || '');
      } else {
        setTableDDL('');
      }
    } catch (err: any) {
      setTableDDL('');
    } finally {
      setLoadingDDL(false);
    }
  };
  const getDataTypeDisplay = (column: Column): string => {
    let type = column.dataType || 'unknown';
    if (column.maxLength !== undefined && column.maxLength !== null) {
      if (type.toLowerCase().includes('char') || type.toLowerCase().includes('text') || type.toLowerCase().includes('nchar') || type.toLowerCase().includes('nvarchar')) {
        const length = column.maxLength === -1 ? 'MAX' : column.maxLength;
        type += `(${length})`;
      } else if (type.toLowerCase() === 'decimal' || type.toLowerCase() === 'numeric') {
        if (column.precision !== undefined && column.scale !== undefined) {
          type += `(${column.precision},${column.scale})`;
        } else if (column.precision !== undefined) {
          type += `(${column.precision})`;
        }
      } else if (type.toLowerCase() === 'float' || type.toLowerCase() === 'real') {
        if (column.precision !== undefined) {
          type += `(${column.precision})`;
        }
      } else if (type.toLowerCase() === 'datetime2' || type.toLowerCase() === 'datetimeoffset') {
        if (column.scale !== undefined) {
          type += `(${column.scale})`;
        }
      }
    }
    return type;
  };
  const getColumnIcon = (column: Column): string => {
    if (column.isPrimaryKey) return '(PK)';
    if (column.isForeignKey) return '(FK)';
    if (column.isIdentity) return '(identy)';
    return '';
  };
  const generateSelectQuery = (): string => {
    if (!tableName) return '';
    const columnNames = columns.map(col => col.name).join(', ');
    return `SELECT ${columnNames || '*'} FROM ${tableName}`;
  };
  return (
    <div className="table-details">
      { }
      <div className="table-header">
        <h3>Detalles de la Tabla: {tableName}</h3>
      </div>
      { }
      <div className="table-tabs">
        <button
          className={`tab-btn ${activeTab === 'columns' ? 'active' : ''}`}
          onClick={() => setActiveTab('columns')}
        >
          <span className="tab-icon columns-icon"></span>
          Columnas
        </button>
        <button
          className={`tab-btn ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
        >
          <span className="tab-icon data-icon"></span>
          Datos
        </button>
      </div>

      {
        loading && (
          <div className="loading-message">
            <p>Cargando información de la tabla...</p>
          </div>
        )}

      {error && (
        <div className="error-message">
          <p><span className="error-icon"></span> {error}</p>
        </div>
      )}
      { }
      {!loading && !error && (
        <div className="tab-content">

          {activeTab === 'columns' && (
            <div className="columns-tab">
              <div className="columns-header">
                <h4>Columnas de la Tabla ({columns.length})</h4>
              </div>
              { }
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
                        <td className="default-value">{column.defaultValue || '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="data-tab">
              <div className="data-header">
                <h4>Consulta de Datos</h4>
                <p>Usa esta consulta para obtener los datos de la tabla:</p>
              </div>

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
        </div>
      )}
    </div>
  );
};
export default TableDetails;