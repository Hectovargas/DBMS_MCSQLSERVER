// Importamos React y los hooks que necesitamos
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { Ref } from 'react';
// Importamos el servicio para hacer llamadas a la API
import apiService from '../services/apiService';
// Importamos los tipos TypeScript para tener tipado fuerte
import type { DatabaseConnection, Schema, Table } from '../services/apiService';
// Importamos los estilos CSS específicos para este componente
import './DatabaseSidebar.css';

// Definimos la interfaz TypeScript para las props que recibe el componente
interface DatabaseSidebarProps {
  onConnectionSelect?: (connectionId: string) => void;
  onTableSelect?: (connectionId: string, tableName: string, schemaName: string) => void;
  onAddConnection?: () => void;
  onViewChange?: (view: 'welcome' | 'query' | 'table') => void; // Nueva prop

}

// Definimos la interfaz para los métodos que expondremos
export interface DatabaseSidebarRef {
  loadConnections: () => Promise<void>;
}

// Componente principal
const DatabaseSidebar = forwardRef(({
  onConnectionSelect,
  onTableSelect,
  onAddConnection,
  onViewChange,
}: DatabaseSidebarProps, ref: Ref<DatabaseSidebarRef>) => {

  const [sidebarState, setSidebarState] = useState<'normal' | 'collapsed' | 'expanded'>('normal');
  // ========== ESTADOS DEL COMPONENTE ==========
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [, setSelectedConnection] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Estados para controlar dropdowns
  const [showSchemasDropdown, setShowSchemasDropdown] = useState<Set<string>>(new Set());
  const [showTablesDropdown, setShowTablesDropdown] = useState<Set<string>>(new Set()); // CORREGIDO: renombrado para consistencia

  // Estados para controlar la expansión de elementos (mantenemos para compatibilidad)
  const [expandedConnections, setExpandedConnections] = useState<Set<string>>(new Set());

  // Datos cargados
  const [connectionSchemas, setConnectionSchemas] = useState<Record<string, Schema[]>>({});
  const [schemaTables, setSchemaTables] = useState<Record<string, Table[]>>({});
  const [schemaViews, setSchemaViews] = useState<Record<string, any[]>>({});
  const [schemaPackages, setSchemaPackages] = useState<Record<string, any[]>>({});
  const [schemaProcedures, setSchemaProcedures] = useState<Record<string, any[]>>({});
  const [schemaFunctions, setSchemaFunctions] = useState<Record<string, any[]>>({});
  const [schemaTriggers, setSchemaTriggers] = useState<Record<string, any[]>>({});
  const [schemaIndexes, setSchemaIndexes] = useState<Record<string, any[]>>({});
  const [connectionSequences, setConnectionSequences] = useState<Record<string, any[]>>({});
  const [connectionUsers, setConnectionUsers] = useState<Record<string, any[]>>({});

  // Estados de carga
  const [loadingSchemas, setLoadingSchemas] = useState<Set<string>>(new Set());
  const [loadingTables, setLoadingTables] = useState<Set<string>>(new Set());
  const [loadingViews, setLoadingViews] = useState<Set<string>>(new Set());
  const [loadingPackages, setLoadingPackages] = useState<Set<string>>(new Set());
  const [loadingProcedures, setLoadingProcedures] = useState<Set<string>>(new Set());
  const [loadingFunctions, setLoadingFunctions] = useState<Set<string>>(new Set());
  const [loadingTriggers, setLoadingTriggers] = useState<Set<string>>(new Set());
  const [loadingIndexes, setLoadingIndexes] = useState<Set<string>>(new Set());
  const [loadingSequences, setLoadingSequences] = useState<Set<string>>(new Set());
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set());

  // ========== EFECTO PARA CARGA INICIAL ==========
  useEffect(() => {
    loadConnections();
  }, []);

  // ========== FUNCIONES PARA CARGAR DATOS ==========
  const loadConnections = async () => {
    try {
      setLoading(true);
      const result = await apiService.getAllConnections();

      if (result.success) {
        setConnections(result.connections || []);
      }
    } catch (error) {
      console.error('Error al cargar conexiones:', error);
    } finally {
      setLoading(false);
    }
  };

  // Exponemos el método loadConnections
  useImperativeHandle(ref, () => ({
    loadConnections
  }));

  // ========== FUNCIONES PARA MANEJAR DROPDOWNS ==========

  // Función para alternar dropdown de esquemas
  const toggleSchemasDropdown = async (connectionId: string) => {
    const newDropdown = new Set(showSchemasDropdown);
    if (newDropdown.has(connectionId)) {
      newDropdown.delete(connectionId);
      // Cuando cerramos esquemas, también cerramos todas las tablas de esa conexión
      const newTablesDropdown = new Set(showTablesDropdown);
      Array.from(showTablesDropdown).forEach(key => {
        if (key.startsWith(`${connectionId}-`)) {
          newTablesDropdown.delete(key);
        }
      });
      setShowTablesDropdown(newTablesDropdown);
    } else {
      newDropdown.add(connectionId);
      // Cargar esquemas si no los tenemos
      if (!connectionSchemas[connectionId]) {
        await loadSchemas(connectionId);
      }
    }
    setShowSchemasDropdown(newDropdown);
  };

  // Función CORREGIDA para alternar dropdown de tablas
  const toggleTablesDropdown = async (connectionId: string, schemaName: string) => {
    const schemaKey = `${connectionId}-${schemaName}`;
    const newDropdown = new Set(showTablesDropdown);

    if (newDropdown.has(schemaKey)) {
      newDropdown.delete(schemaKey);
    } else {
      newDropdown.add(schemaKey);
      // Cargar tablas si no las tenemos
      if (!schemaTables[schemaKey]) {
        await loadTables(connectionId, schemaName);
      }
    }
    setShowTablesDropdown(newDropdown);
  };

  // Dropdowns adicionales por objeto
  const [showViewsDropdown, setShowViewsDropdown] = useState<Set<string>>(new Set());
  const [showPackagesDropdown, setShowPackagesDropdown] = useState<Set<string>>(new Set());
  const [showProceduresDropdown, setShowProceduresDropdown] = useState<Set<string>>(new Set());
  const [showFunctionsDropdown, setShowFunctionsDropdown] = useState<Set<string>>(new Set());
  const [showTriggersDropdown, setShowTriggersDropdown] = useState<Set<string>>(new Set());
  const [showIndexesDropdown, setShowIndexesDropdown] = useState<Set<string>>(new Set());
  const [showSequencesDropdown, setShowSequencesDropdown] = useState<Set<string>>(new Set());
  const [showUsersDropdown, setShowUsersDropdown] = useState<Set<string>>(new Set());

  const toggleGenericSchemaDropdown = async (
    kind: 'views' | 'packages' | 'procedures' | 'functions' | 'triggers' | 'indexes',
    connectionId: string,
    schemaName: string
  ) => {
    const schemaKey = `${connectionId}-${schemaName}`;
    const dropdownMap = {
      views: [showViewsDropdown, setShowViewsDropdown] as const,
      packages: [showPackagesDropdown, setShowPackagesDropdown] as const,
      procedures: [showProceduresDropdown, setShowProceduresDropdown] as const,
      functions: [showFunctionsDropdown, setShowFunctionsDropdown] as const,
      triggers: [showTriggersDropdown, setShowTriggersDropdown] as const,
      indexes: [showIndexesDropdown, setShowIndexesDropdown] as const,
    } as const;
    const [state, setState] = dropdownMap[kind];
    const newDropdown = new Set(state);
    if (newDropdown.has(schemaKey)) {
      newDropdown.delete(schemaKey);
    } else {
      newDropdown.add(schemaKey);
      // carga perezosa
      if (kind === 'views' && !schemaViews[schemaKey]) await loadViews(connectionId, schemaName);
      if (kind === 'packages' && !schemaPackages[schemaKey]) await loadPackages(connectionId, schemaName);
      if (kind === 'procedures' && !schemaProcedures[schemaKey]) await loadProcedures(connectionId, schemaName);
      if (kind === 'functions' && !schemaFunctions[schemaKey]) await loadFunctions(connectionId, schemaName);
      if (kind === 'triggers' && !schemaTriggers[schemaKey]) await loadTriggers(connectionId, schemaName);
      if (kind === 'indexes' && !schemaIndexes[schemaKey]) await loadIndexes(connectionId, schemaName);
    }
    setState(newDropdown);
  };

  const toggleConnectionLevelDropdown = async (
    kind: 'sequences' | 'users',
    connectionId: string
  ) => {
    const [state, setState] = kind === 'sequences'
      ? [showSequencesDropdown, setShowSequencesDropdown] as const
      : [showUsersDropdown, setShowUsersDropdown] as const;
    const newDropdown = new Set(state);
    if (newDropdown.has(connectionId)) {
      newDropdown.delete(connectionId);
    } else {
      newDropdown.add(connectionId);
      if (kind === 'sequences' && !connectionSequences[connectionId]) await loadSequences(connectionId);
      if (kind === 'users' && !connectionUsers[connectionId]) await loadUsers(connectionId);
    }
    setState(newDropdown);
  };

  // Función para expandir/contraer una conexión (mantenemos para compatibilidad)
  const toggleConnection = async (connectionId: string) => {
    const newExpanded = new Set(expandedConnections);

    if (newExpanded.has(connectionId)) {
      newExpanded.delete(connectionId);
      setExpandedConnections(newExpanded);
    } else {
      newExpanded.add(connectionId);
      setExpandedConnections(newExpanded);

      if (!connectionSchemas[connectionId]) {
        await loadSchemas(connectionId);
      }
    }
  };

  // Función para seleccionar una conexión
  const selectConnection = async (connectionId: string) => {
    try {
      console.log('Intentando conectar a la base de datos:', connectionId);

      const result = await apiService.connectToDatabase(connectionId);

      console.log('Respuesta del servidor:', result);

      if (result.success) {
        console.log('Conexión exitosa');
        setSelectedConnection(connectionId);

        if (onConnectionSelect) {
          onConnectionSelect(connectionId);
        }

        await loadConnections();
      } else {
        console.error('Error en la respuesta del servidor:', result);
        const errorMessage = result.error?.message || result.message || 'Error desconocido';
        alert(`Error al conectar: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error al conectar a la base de datos:', error);
      alert(`Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  // Función para cargar esquemas de una conexión específica
  const loadSchemas = async (connectionId: string) => {
    try {
      setLoadingSchemas(prev => new Set(prev).add(connectionId));

      const result = await apiService.getSchemas(connectionId);

      if (result.success) {
        console.log('Esquemas recibidos:', result.data);
        const normalizedSchemas = result.data.map((schema: any) => ({
          ...schema,
          schema_name: schema.SCHEMA_NAME?.trim() || 'SYSDBA'
        }));

        setConnectionSchemas(prev => ({
          ...prev,
          [connectionId]: normalizedSchemas
        }));
      } else {
        console.error('Error al cargar esquemas:', result.error);
      }
    } catch (error) {
      console.error('Error al cargar esquemas:', error);
    } finally {
      setLoadingSchemas(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        return newSet;
      });
    }
  };

  // Modifica la función loadTables para normalizar los nombres
  const loadTables = async (connectionId: string, schemaName: string) => {
    try {
      const schemaKey = `${connectionId}-${schemaName}`;
      setLoadingTables(prev => new Set(prev).add(schemaKey));

      const response = await apiService.getTables(connectionId, schemaName);

      if (response.success) {
        console.log('Tablas recibidas para esquema', schemaName, ':', response.data);
        const normalizedTables = response.data.map((table: any) => ({
          ...table,
          table_name: table.TABLE_NAME?.trim() || '',
          schema_name: table.SCHEMA_NAME?.trim() || schemaName
        }));

        setSchemaTables(prev => ({
          ...prev,
          [schemaKey]: normalizedTables
        }));
      } else {
        console.error('Error al cargar tablas:', response.error);
      }
    } catch (error) {
      console.error('Error al cargar tablas:', error);
    } finally {
      setLoadingTables(prev => {
        const newSet = new Set(prev);
        newSet.delete(`${connectionId}-${schemaName}`);
        return newSet;
      });
    }
  };

  const loadViews = async (connectionId: string, schemaName: string) => {
    const schemaKey = `${connectionId}-${schemaName}`;
    try {
      setLoadingViews(prev => new Set(prev).add(schemaKey));
      const response = await apiService.getViews(connectionId, schemaName);
      if (response.success) {
        const normalized = response.data.map((item: any) => ({
          ...item,
          view_name: item.VIEW_NAME?.trim() || '',
          schema_name: item.SCHEMA_NAME?.trim() || schemaName,
          description: item.DESCRIPTION || item.description
        }));
        setSchemaViews(prev => ({ ...prev, [schemaKey]: normalized }));
      }
    } finally {
      setLoadingViews(prev => { const s = new Set(prev); s.delete(schemaKey); return s; });
    }
  };

  const loadPackages = async (connectionId: string, schemaName: string) => {
    const schemaKey = `${connectionId}-${schemaName}`;
    try {
      setLoadingPackages(prev => new Set(prev).add(schemaKey));
      const response = await apiService.getPackages(connectionId, schemaName);
      if (response.success) {
        const normalized = response.data.map((item: any) => ({
          ...item,
          package_name: item.PACKAGE_NAME?.trim() || '',
          schema_name: item.SCHEMA_NAME?.trim() || schemaName,
          description: item.DESCRIPTION || item.description
        }));
        setSchemaPackages(prev => ({ ...prev, [schemaKey]: normalized }));
      }
    } finally {
      setLoadingPackages(prev => { const s = new Set(prev); s.delete(schemaKey); return s; });
    }
  };

  const loadProcedures = async (connectionId: string, schemaName: string) => {
    const schemaKey = `${connectionId}-${schemaName}`;
    try {
      setLoadingProcedures(prev => new Set(prev).add(schemaKey));
      const response = await apiService.getProcedures(connectionId, schemaName);
      if (response.success) {
        const normalized = response.data.map((item: any) => ({
          ...item,
          procedure_name: item.PROCEDURE_NAME?.trim() || '',
          schema_name: item.SCHEMA_NAME?.trim() || schemaName,
          description: item.DESCRIPTION || item.description
        }));
        setSchemaProcedures(prev => ({ ...prev, [schemaKey]: normalized }));
      }
    } finally {
      setLoadingProcedures(prev => { const s = new Set(prev); s.delete(schemaKey); return s; });
    }
  };

  const loadFunctions = async (connectionId: string, schemaName: string) => {
    const schemaKey = `${connectionId}-${schemaName}`;
    try {
      setLoadingFunctions(prev => new Set(prev).add(schemaKey));
      const response = await apiService.getFunctions(connectionId, schemaName);
      if (response.success) {
        const normalized = response.data.map((item: any) => ({
          ...item,
          function_name: item.FUNCTION_NAME?.trim() || '',
          schema_name: item.SCHEMA_NAME?.trim() || schemaName,
          description: item.DESCRIPTION || item.description
        }));
        setSchemaFunctions(prev => ({ ...prev, [schemaKey]: normalized }));
      }
    } finally {
      setLoadingFunctions(prev => { const s = new Set(prev); s.delete(schemaKey); return s; });
    }
  };

  const loadTriggers = async (connectionId: string, schemaName: string) => {
    const schemaKey = `${connectionId}-${schemaName}`;
    try {
      setLoadingTriggers(prev => new Set(prev).add(schemaKey));
      const response = await apiService.getTriggers(connectionId, schemaName);
      if (response.success) {
        const normalized = response.data.map((item: any) => ({
          ...item,
          trigger_name: item.TRIGGER_NAME?.trim() || '',
          relation_name: item.RELATION_NAME?.trim() || '',
          schema_name: item.SCHEMA_NAME?.trim() || schemaName,
          description: item.DESCRIPTION || item.description
        }));
        setSchemaTriggers(prev => ({ ...prev, [schemaKey]: normalized }));
      }
    } finally {
      setLoadingTriggers(prev => { const s = new Set(prev); s.delete(schemaKey); return s; });
    }
  };

  const loadIndexes = async (connectionId: string, schemaName: string) => {
    const schemaKey = `${connectionId}-${schemaName}`;
    try {
      setLoadingIndexes(prev => new Set(prev).add(schemaKey));
      const response = await apiService.getIndexes(connectionId, schemaName);
      if (response.success) {
        const normalized = response.data.map((item: any) => ({
          ...item,
          index_name: item.INDEX_NAME?.trim() || '',
          relation_name: item.RELATION_NAME?.trim() || '',
          schema_name: item.SCHEMA_NAME?.trim() || schemaName,
          is_unique: item.IS_UNIQUE,
          is_inactive: item.IS_INACTIVE
        }));
        setSchemaIndexes(prev => ({ ...prev, [schemaKey]: normalized }));
      }
    } finally {
      setLoadingIndexes(prev => { const s = new Set(prev); s.delete(schemaKey); return s; });
    }
  };

  const loadSequences = async (connectionId: string) => {
    try {
      setLoadingSequences(prev => new Set(prev).add(connectionId));
      const response = await apiService.getSequences(connectionId);
      if (response.success) {
        const normalized = response.data.map((item: any) => ({
          ...item,
          sequence_name: item.SEQUENCE_NAME?.trim() || item.GENERATOR_NAME?.trim() || '',
          description: item.DESCRIPTION || item.description
        }));
        setConnectionSequences(prev => ({ ...prev, [connectionId]: normalized }));
      }
    } finally {
      setLoadingSequences(prev => { const s = new Set(prev); s.delete(connectionId); return s; });
    }
  };

  const loadUsers = async (connectionId: string) => {
    try {
      setLoadingUsers(prev => new Set(prev).add(connectionId));
      const response = await apiService.getUsers(connectionId);
      if (response.success) {
        const normalized = response.data.map((item: any) => ({
          ...item,
          user_name: item.USER_NAME?.trim() || '',
          active: item.ACTIVE,
          plugin: item.PLUGIN,
          first_name: item.FIRST_NAME?.trim() || '',
          last_name: item.LAST_NAME?.trim() || ''
        }));
        setConnectionUsers(prev => ({ ...prev, [connectionId]: normalized }));
      }
    } finally {
      setLoadingUsers(prev => { const s = new Set(prev); s.delete(connectionId); return s; });
    }
  };

  // Función para desconectar una base de datos
  const disconnectDatabase = async (connectionId: string) => {
    try {
      const result = await apiService.disconnectFromDatabase(connectionId);

      if (result.success) {
        await loadConnections();

        // Limpiar todos los datos relacionados
        setConnectionSchemas(prev => {
          const newState = { ...prev };
          delete newState[connectionId];
          return newState;
        });

        setSchemaTables(prev => {
          const newState = { ...prev };
          Object.keys(newState).forEach(key => {
            if (key.startsWith(`${connectionId}-`)) {
              delete newState[key];
            }
          });
          return newState;
        });

        // Limpiar estados de expansión y dropdowns
        setExpandedConnections(prev => {
          const newSet = new Set(prev);
          newSet.delete(connectionId);
          return newSet;
        });

        setShowSchemasDropdown(prev => {
          const newSet = new Set(prev);
          newSet.delete(connectionId);
          return newSet;
        });

        setShowTablesDropdown(prev => {
          const newSet = new Set(prev);
          Array.from(prev).forEach(key => {
            if (key.startsWith(`${connectionId}-`)) {
              newSet.delete(key);
            }
          });
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error al desconectar:', error);
    }
  };

  // Función para eliminar una conexión
  const deleteConnection = async (connectionId: string) => {
    try {
      console.log('Eliminando conexión:', connectionId);

      const result = await apiService.removeConnection(connectionId);

      console.log('Respuesta del servidor:', result);

      if (result.success) {
        console.log('Conexión eliminada exitosamente');

        // Limpiar todos los datos relacionados
        setConnectionSchemas(prev => {
          const newState = { ...prev };
          delete newState[connectionId];
          return newState;
        });

        setSchemaTables(prev => {
          const newState = { ...prev };
          Object.keys(newState).forEach(key => {
            if (key.startsWith(`${connectionId}-`)) {
              delete newState[key];
            }
          });
          return newState;
        });

        setExpandedConnections(prev => {
          const newSet = new Set(prev);
          newSet.delete(connectionId);
          return newSet;
        });

        setShowSchemasDropdown(prev => {
          const newSet = new Set(prev);
          newSet.delete(connectionId);
          return newSet;
        });

        setShowTablesDropdown(prev => {
          const newSet = new Set(prev);
          Array.from(prev).forEach(key => {
            if (key.startsWith(`${connectionId}-`)) {
              newSet.delete(key);
            }
          });
          return newSet;
        });

        await loadConnections();
      } else {
        console.error('Error al eliminar conexión:', result.message);
        alert(`Error al eliminar conexión: ${result.message}`);
      }
    } catch (error) {
      console.error('Error al eliminar conexión:', error);
      alert(`Error al eliminar conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  // ========== RENDERIZADO DEL COMPONENTE ==========
  return (
    <>
      <div className="sidebar-container">
        {/* Contenedor principal del sidebar */}
        <div className={`database-sidebar ${sidebarState}`}>
          <button
            className="sidebar-toggle"
            onClick={() => {
              setSidebarState(prev =>
                prev === 'normal' ? 'collapsed' :
                  prev === 'collapsed' ? 'expanded' : 'normal'
              );
            }}
          >
            {sidebarState === 'collapsed' ? <span className="expand-right-icon"></span> :
              sidebarState === 'expanded' ? <span className="expand-left-icon"></span> : <span className="expand-center-icon"></span>}
          </button>
          {/* Encabezado de la barra lateral */}
          <div className="sidebar-header">
            <h3>Conexiones de Base de Datos</h3>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button
                className="refresh-btn"
                onClick={loadConnections}
                disabled={loading}
              >
                <span className="refresh-icon"></span>
              </button>
              <button
                className="refresh-btn"
                onClick={() => onAddConnection && onAddConnection()}
              >
                <span className="add-icon"></span>
              </button>
            </div>
          </div>

          {loading && <div className="loading">Cargando...</div>}

          {/* Lista de conexiones */}
          <div className="connections-list">
            {connections.map((connection) => {
              const isExpanded = expandedConnections.has(connection.id);
              const schemas = connectionSchemas[connection.id] || [];
              const isLoadingSchemas = loadingSchemas.has(connection.id);

              return (
                <div key={connection.id} className="connection-item">

                  {/* Encabezado de cada conexión */}
                  <div
                    className="connection-header"
                    onClick={() => toggleConnection(connection.id)}
                  >
                    <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                      {isExpanded ? <span className="expand-down-icon"></span> : <span className="expand-right-icon"></span>}
                    </span>
                    <span className="connection-name">{connection.name}</span>
                    <span className="connection-status">
                      {connection.isActive ? <span className="status-active-icon"></span> : <span className="status-inactive-icon"></span>}
                    </span>
                  </div>

                  {/* Contenido expandible */}
                  {isExpanded && (
                    <div className="connection-content">

                      {/* Detalles de la conexión */}
                      <div className="connection-details">
                        <div className="detail-item">
                          <strong>Host:</strong> {connection.host}
                        </div>
                        <div className="detail-item">
                          <strong>Base de datos:</strong> {connection.database}
                        </div>
                        {connection.lastConnected && (
                          <div className="detail-item">
                            <strong>Última conexión:</strong> {new Date(connection.lastConnected).toLocaleString()}
                          </div>
                        )}

                        {/* Botones de acción */}
                        <div className="connection-actions">
                          {connection.isActive ? (
                            <button
                              className="disconnect-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                disconnectDatabase(connection.id);
                              }}
                            >
                              Desconectar
                            </button>
                          ) : (
                            <button
                              className="connect-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                selectConnection(connection.id);
                              }}
                            >
                              Conectar
                            </button>
                          )}

                          <button
                            className="delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`¿Estás seguro de que quieres eliminar la conexión "${connection.name}"?`)) {
                                deleteConnection(connection.id);
                              }
                            }}
                          >
                            Eliminar
                          </button>
                          <button
                            className="query-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onViewChange) onViewChange('query');
                              if (onConnectionSelect) onConnectionSelect(connection.id);
                            }}
                          >
                            Editor de Consultas
                          </button>
                        </div>
                      </div>

                      {/* Sección de esquemas */}
                      <div className="schemas-section">
                        {/* Header clickeable para esquemas */}
                        <div
                          className="section-header clickeable-header"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSchemasDropdown(connection.id);
                          }}
                        >
                          <span className={`expand-icon ${showSchemasDropdown.has(connection.id) ? 'expanded' : ''}`}>
                            {showSchemasDropdown.has(connection.id) ? <span className="expand-down-icon"></span> : <span className="expand-right-icon"></span>}
                          </span>

                          <span className="section-title">Esquemas</span>
                          <span className="schema-count">({schemas.length})</span>

                          {isLoadingSchemas && <span className="loading-indicator loading-icon"></span>}
                        </div>

                        {/* Dropdown de esquemas */}
                        {showSchemasDropdown.has(connection.id) && (
                          <div className="schemas-dropdown">
                            {schemas.map((schema) => {
                              const schemaKey = `${connection.id}-${schema.schema_name}`;
                              const tables = schemaTables[schemaKey] || [];
                              const isLoadingTables = loadingTables.has(schemaKey);

                              return (
                                <div key={`schema-${connection.id}-${schema.schema_name}`} className="schema-item">

                                  {/* Header del esquema */}
                                  <div className="schema-header">
                                    <span className="schema-name">{schema.schema_name}</span>
                                    <span className="schema-owner">(Esquema)</span>
                                  </div>

                                  {/* NUEVA SECCIÓN: Header clickeable para tablas */}
                                  <div
                                    className="section-header clickeable-header"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleTablesDropdown(connection.id, schema.schema_name);
                                    }}
                                  >
                                    <span className={`expand-icon ${showTablesDropdown.has(schemaKey) ? 'expanded' : ''}`}>
                                      {showTablesDropdown.has(schemaKey) ? <span className="expand-down-icon"></span> : <span className="expand-right-icon"></span>}
                                    </span>

                                    <span className="section-title">Tablas</span>
                                    <span className="schema-count">({tables.length})</span>

                                    {isLoadingTables && <span className="loading-indicator loading-icon"></span>}
                                  </div>

                                  {/* DROPDOWN DE TABLAS - Solo se muestra si está expandido */}
                                  {showTablesDropdown.has(schemaKey) && (
                                    <div className="schemas-dropdown"> {/* Reutilizamos la clase CSS */}
                                      <div className="tables-list">
                                        {tables.map((table) => (
                                          <div
                                            key={`table-${connection.id}-${schema.schema_name}-${table.table_name}`}
                                            className="table-item"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              console.log('Table clicked:', table.table_name, 'in schema:', schema.schema_name);
                                              if (onTableSelect) {
                                                console.log('Calling onTableSelect...');
                                                onTableSelect(connection.id, table.table_name, schema.schema_name);
                                                if (onViewChange) {
                                                  console.log('Calling onViewChange...');
                                                  onViewChange('table'); // Doble seguro para cambiar vista
                                                }
                                              } else {
                                                console.log('onTableSelect is not defined');
                                              }
                                            }}
                                          >
                                            <span className="table-icon table-icon-img"></span>
                                            <span className="table-name">{table.table_name}</span>
                                            <span className="table-date">
                                            </span>
                                          </div>
                                        ))}
                                      </div>

                                      {/* Mensaje cuando no hay tablas */}
                                      {tables.length === 0 && !isLoadingTables && (
                                        <div className="no-schemas-message">
                                          No hay tablas disponibles
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Vistas */}
                                  <div
                                    className="section-header clickeable-header"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleGenericSchemaDropdown('views', connection.id, schema.schema_name);
                                    }}
                                  >
                                    <span className={`expand-icon ${showViewsDropdown.has(schemaKey) ? 'expanded' : ''}`}>
                                      {showViewsDropdown.has(schemaKey) ? <span className="expand-down-icon"></span> : <span className="expand-right-icon"></span>}
                                    </span>
                                    <span className="section-title">Vistas</span>
                                    <span className="schema-count">({(schemaViews[schemaKey] || []).length})</span>
                                    {loadingViews.has(schemaKey) && <span className="loading-indicator loading-icon"></span>}
                                  </div>
                                  {showViewsDropdown.has(schemaKey) && (
                                    <div className="schemas-dropdown">
                                      <div className="tables-list">
                                        {(schemaViews[schemaKey] || []).map((view) => (
                                          <div key={`view-${connection.id}-${schema.schema_name}-${view.view_name}`} className="table-item">
                                            <span className="table-icon table-icon-img"></span>
                                            <span className="table-name">{view.view_name}</span>
                                          </div>
                                        ))}
                                      </div>
                                      {(schemaViews[schemaKey] || []).length === 0 && !loadingViews.has(schemaKey) && (
                                        <div className="no-schemas-message">No hay vistas disponibles</div>
                                      )}
                                    </div>
                                  )}

                                  {/* Procedimientos */}
                                  <div
                                    className="section-header clickeable-header"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleGenericSchemaDropdown('procedures', connection.id, schema.schema_name);
                                    }}
                                  >
                                    <span className={`expand-icon ${showProceduresDropdown.has(schemaKey) ? 'expanded' : ''}`}>
                                      {showProceduresDropdown.has(schemaKey) ? <span className="expand-down-icon"></span> : <span className="expand-right-icon"></span>}
                                    </span>
                                    <span className="section-title">Procedimientos</span>
                                    <span className="schema-count">({(schemaProcedures[schemaKey] || []).length})</span>
                                    {loadingProcedures.has(schemaKey) && <span className="loading-indicator loading-icon"></span>}
                                  </div>
                                  {showProceduresDropdown.has(schemaKey) && (
                                    <div className="schemas-dropdown">
                                      <div className="tables-list">
                                        {(schemaProcedures[schemaKey] || []).map((proc) => (
                                          <div key={`proc-${connection.id}-${schema.schema_name}-${proc.procedure_name}`} className="table-item">
                                            <span className="table-icon table-icon-img"></span>
                                            <span className="table-name">{proc.procedure_name}</span>
                                          </div>
                                        ))}
                                      </div>
                                      {(schemaProcedures[schemaKey] || []).length === 0 && !loadingProcedures.has(schemaKey) && (
                                        <div className="no-schemas-message">No hay procedimientos disponibles</div>
                                      )}
                                    </div>
                                  )}

                                  {/* Funciones */}
                                  <div
                                    className="section-header clickeable-header"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleGenericSchemaDropdown('functions', connection.id, schema.schema_name);
                                    }}
                                  >
                                    <span className={`expand-icon ${showFunctionsDropdown.has(schemaKey) ? 'expanded' : ''}`}>
                                      {showFunctionsDropdown.has(schemaKey) ? <span className="expand-down-icon"></span> : <span className="expand-right-icon"></span>}
                                    </span>
                                    <span className="section-title">Funciones</span>
                                    <span className="schema-count">({(schemaFunctions[schemaKey] || []).length})</span>
                                    {loadingFunctions.has(schemaKey) && <span className="loading-indicator loading-icon"></span>}
                                  </div>
                                  {showFunctionsDropdown.has(schemaKey) && (
                                    <div className="schemas-dropdown">
                                      <div className="tables-list">
                                        {(schemaFunctions[schemaKey] || []).map((fn) => (
                                          <div key={`fn-${connection.id}-${schema.schema_name}-${fn.function_name}`} className="table-item">
                                            <span className="table-icon table-icon-img"></span>
                                            <span className="table-name">{fn.function_name}</span>
                                          </div>
                                        ))}
                                      </div>
                                      {(schemaFunctions[schemaKey] || []).length === 0 && !loadingFunctions.has(schemaKey) && (
                                        <div className="no-schemas-message">No hay funciones disponibles</div>
                                      )}
                                    </div>
                                  )}

                                  {/* Triggers */}
                                  <div
                                    className="section-header clickeable-header"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleGenericSchemaDropdown('triggers', connection.id, schema.schema_name);
                                    }}
                                  >
                                    <span className={`expand-icon ${showTriggersDropdown.has(schemaKey) ? 'expanded' : ''}`}>
                                      {showTriggersDropdown.has(schemaKey) ? <span className="expand-down-icon"></span> : <span className="expand-right-icon"></span>}
                                    </span>
                                    <span className="section-title">Triggers</span>
                                    <span className="schema-count">({(schemaTriggers[schemaKey] || []).length})</span>
                                    {loadingTriggers.has(schemaKey) && <span className="loading-indicator loading-icon"></span>}
                                  </div>
                                  {showTriggersDropdown.has(schemaKey) && (
                                    <div className="schemas-dropdown">
                                      <div className="tables-list">
                                        {(schemaTriggers[schemaKey] || []).map((tr) => (
                                          <div key={`tr-${connection.id}-${schema.schema_name}-${tr.trigger_name}`} className="table-item">
                                            <span className="table-icon table-icon-img"></span>
                                            <span className="table-name">{tr.trigger_name}</span>
                                            <span className="table-date">{tr.relation_name || ''}</span>
                                          </div>
                                        ))}
                                      </div>
                                      {(schemaTriggers[schemaKey] || []).length === 0 && !loadingTriggers.has(schemaKey) && (
                                        <div className="no-schemas-message">No hay triggers disponibles</div>
                                      )}
                                    </div>
                                  )}

                                  {/* Índices */}
                                  <div
                                    className="section-header clickeable-header"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleGenericSchemaDropdown('indexes', connection.id, schema.schema_name);
                                    }}
                                  >
                                    <span className={`expand-icon ${showIndexesDropdown.has(schemaKey) ? 'expanded' : ''}`}>
                                      {showIndexesDropdown.has(schemaKey) ? <span className="expand-down-icon"></span> : <span className="expand-right-icon"></span>}
                                    </span>
                                    <span className="section-title">Índices</span>
                                    <span className="schema-count">({(schemaIndexes[schemaKey] || []).length})</span>
                                    {loadingIndexes.has(schemaKey) && <span className="loading-indicator loading-icon"></span>}
                                  </div>
                                  {showIndexesDropdown.has(schemaKey) && (
                                    <div className="schemas-dropdown">
                                      <div className="tables-list">
                                        {(schemaIndexes[schemaKey] || []).map((ix) => (
                                          <div key={`ix-${connection.id}-${schema.schema_name}-${ix.index_name}`} className="table-item">
                                            <span className="table-icon table-icon-img"></span>
                                            <span className="table-name">{ix.index_name}</span>
                                            <span className="table-date">{ix.relation_name || ''}</span>
                                          </div>
                                        ))}
                                      </div>
                                      {(schemaIndexes[schemaKey] || []).length === 0 && !loadingIndexes.has(schemaKey) && (
                                        <div className="no-schemas-message">No hay índices disponibles</div>
                                      )}
                                    </div>
                                  )}

                                  {connections.map((connection) => (
                                    expandedConnections.has(connection.id) && (
                                      <div key={`conn-sections-${connection.id}`} className="connection-extra-sections">
                                        {/* Secuencias */}
                                        <div
                                          className="section-header clickeable-header"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleConnectionLevelDropdown('sequences', connection.id);
                                          }}
                                        >
                                          <span className={`expand-icon ${showSequencesDropdown.has(connection.id) ? 'expanded' : ''}`}>
                                            {showSequencesDropdown.has(connection.id) ? <span className="expand-down-icon"></span> : <span className="expand-right-icon"></span>}
                                          </span>
                                          <span className="section-title">Secuencias</span>
                                          <span className="schema-count">({(connectionSequences[connection.id] || []).length})</span>
                                          {loadingSequences.has(connection.id) ? <span className="loading-indicator loading-icon"></span> : null}
                                        </div>
                                        {showSequencesDropdown.has(connection.id) && (
                                          <div className="schemas-dropdown">
                                            <div className="tables-list">
                                              {(connectionSequences[connection.id] || []).map((seq) => (
                                                <div key={`seq-${connection.id}-${seq.sequence_name}`} className="table-item">
                                                  <span className="table-icon table-icon-img"></span>
                                                  <span className="table-name">{seq.sequence_name}</span>
                                                </div>
                                              ))}
                                            </div>
                                            {(connectionSequences[connection.id] || []).length === 0 && !loadingSequences.has(connection.id) && (
                                              <div className="no-schemas-message">No hay secuencias disponibles</div>
                                            )}
                                          </div>
                                        )}

                                        {/* Usuarios */}
                                        <div
                                          className="section-header clickeable-header"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleConnectionLevelDropdown('users', connection.id);
                                          }}
                                        >
                                          <span className={`expand-icon ${showUsersDropdown.has(connection.id) ? 'expanded' : ''}`}>
                                            {showUsersDropdown.has(connection.id) ? <span className="expand-down-icon"></span> : <span className="expand-right-icon"></span>}
                                          </span>
                                          <span className="section-title">Usuarios</span>
                                          <span className="schema-count">({(connectionUsers[connection.id] || []).length})</span>
                                          {loadingUsers.has(connection.id) ? <span className="loading-indicator loading-icon"></span> : null}
                                        </div>
                                        {showUsersDropdown.has(connection.id) && (
                                          <div className="schemas-dropdown">
                                            <div className="tables-list">
                                              {(connectionUsers[connection.id] || []).map((usr) => (
                                                <div key={`usr-${connection.id}-${usr.user_name}`} className="table-item">
                                                  <span className="table-icon table-icon-img"></span>
                                                  <span className="table-name">{usr.user_name}</span>
                                                </div>
                                              ))}
                                            </div>
                                            {(connectionUsers[connection.id] || []).length === 0 && !loadingUsers.has(connection.id) && (
                                              <div className="no-schemas-message">No hay usuarios visibles</div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  ))}
                                </div>
                              );
                            })}

                            {/* Mensaje cuando no hay esquemas */}
                            {schemas.length === 0 && !isLoadingSchemas && (
                              <div className="no-schemas-message">
                                No hay esquemas disponibles
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mensaje cuando no hay conexiones */}
          {connections.length === 0 && !loading && (
            <div className="no-connections">
              <p>No hay conexiones activas</p>
              <p>Conecta a una base de datos para comenzar</p>
            </div>
          )}

          <button
            className="sidebar-toggle"
            onClick={() => {
              setSidebarState(prev =>
                prev === 'normal' ? 'collapsed' :
                  prev === 'collapsed' ? 'expanded' : 'normal'
              );
            }}
          >
            {sidebarState === 'collapsed' ? <span className="expand-right-icon"></span> :
              sidebarState === 'expanded' ? <span className="expand-left-icon"></span> : <span className="expand-center-icon"></span>}
          </button>
        </div>
      </div>

    </>
  );
});

export default DatabaseSidebar;