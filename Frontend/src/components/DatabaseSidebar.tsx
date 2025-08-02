import React, { useState, useEffect } from 'react';
import './DatabaseSidebar.css';

interface DatabaseConnection {
  id: string;
  name: string;
  server: string;
  database: string;
  lastConnected?: Date;
  isActive?: boolean;
}

interface Schema {
  schema_name: string;
  schema_id: number;
  principal_name: string;
}

interface Table {
  table_name: string;
  schema_name: string;
  create_date: string;
  modify_date: string;
}

const DatabaseSidebar: React.FC = () => {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(false);

  const API_BASE = 'http://localhost:3001/api/database';

  // Cargar conexiones al montar el componente
  useEffect(() => {
    loadConnections();
  }, []);

  // Cargar esquemas cuando se selecciona una conexión
  useEffect(() => {
    if (selectedConnection) {
      loadSchemas(selectedConnection);
    }
  }, [selectedConnection]);

  // Cargar tablas cuando se selecciona un esquema
  useEffect(() => {
    if (selectedConnection && selectedSchema) {
      loadTables(selectedConnection, selectedSchema);
    }
  }, [selectedConnection, selectedSchema]);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/connections`);
      const data = await response.json();
      
      if (data.success) {
        setConnections(data.connections);
      }
    } catch (error) {
      console.error('Error al cargar conexiones:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSchemas = async (connectionId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/schemas/${connectionId}`);
      const data = await response.json();
      
      if (data.success) {
        setSchemas(data.data);
        setSelectedSchema(null);
        setTables([]);
      }
    } catch (error) {
      console.error('Error al cargar esquemas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async (connectionId: string, schemaName: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/tables/${connectionId}/${schemaName}`);
      const data = await response.json();
      
      if (data.success) {
        setTables(data.data);
      }
    } catch (error) {
      console.error('Error al cargar tablas:', error);
    } finally {
      setLoading(false);
    }
  };

  const disconnectDatabase = async (connectionId: string) => {
    try {
      const response = await fetch(`${API_BASE}/disconnect/${connectionId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        await loadConnections();
        if (selectedConnection === connectionId) {
          setSelectedConnection(null);
          setSchemas([]);
          setTables([]);
        }
      }
    } catch (error) {
      console.error('Error al desconectar:', error);
    }
  };

  return (
    <div className="database-sidebar">
      <div className="sidebar-header">
        <h3>Conexiones de Base de Datos</h3>
        <button 
          className="refresh-btn"
          onClick={loadConnections}
          disabled={loading}
        >
          🔄
        </button>
      </div>

      {loading && <div className="loading">Cargando...</div>}

      <div className="connections-list">
        {connections.map((connection) => (
          <div 
            key={connection.id} 
            className={`connection-item ${selectedConnection === connection.id ? 'selected' : ''}`}
          >
            <div 
              className="connection-header"
              onClick={() => setSelectedConnection(connection.id)}
            >
              <span className="connection-name">{connection.name}</span>
              <span className="connection-status">
                {connection.isActive ? '🟢' : '🔴'}
              </span>
            </div>
            
            {selectedConnection === connection.id && (
              <div className="connection-details">
                <div className="detail-item">
                  <strong>Servidor:</strong> {connection.server}
                </div>
                <div className="detail-item">
                  <strong>Base de datos:</strong> {connection.database}
                </div>
                {connection.lastConnected && (
                  <div className="detail-item">
                    <strong>Última conexión:</strong> {new Date(connection.lastConnected).toLocaleString()}
                  </div>
                )}
                <button 
                  className="disconnect-btn"
                  onClick={() => disconnectDatabase(connection.id)}
                >
                  Desconectar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedConnection && schemas.length > 0 && (
        <div className="schemas-section">
          <h4>Esquemas</h4>
          <div className="schemas-list">
            {schemas.map((schema) => (
              <div 
                key={schema.schema_id}
                className={`schema-item ${selectedSchema === schema.schema_name ? 'selected' : ''}`}
                onClick={() => setSelectedSchema(schema.schema_name)}
              >
                <span className="schema-name">{schema.schema_name}</span>
                <span className="schema-owner">{schema.principal_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedSchema && tables.length > 0 && (
        <div className="tables-section">
          <h4>Tablas ({selectedSchema})</h4>
          <div className="tables-list">
            {tables.map((table) => (
              <div key={table.table_name} className="table-item">
                <span className="table-name">{table.table_name}</span>
                <span className="table-date">
                  {new Date(table.modify_date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {connections.length === 0 && !loading && (
        <div className="no-connections">
          <p>No hay conexiones activas</p>
          <p>Conecta a una base de datos para comenzar</p>
        </div>
      )}
    </div>
  );
};

export default DatabaseSidebar; 