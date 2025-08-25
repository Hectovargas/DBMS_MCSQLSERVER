import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { Ref } from 'react';
import apiService from '../services/apiService';
import type { DatabaseConnection, Table } from '../services/apiService';
import './DatabaseSidebar.css';

interface DatabaseSidebarProps {
  onConnectionSelect?: (connectionId: string) => void;
  onTableSelect?: (connectionId: string, tableName: string) => void;
  onObjectSelect?: (connectionId: string, objectType: 'function' | 'trigger' | 'procedure' | 'view' | 'index' | 'sequence' | 'package' | 'user', objectName: string) => void;
  onAddConnection?: () => void;
  onViewChange?: (view: 'welcome' | 'query' | 'table' | 'object') => void; 
  onCreateTable?: (connectionId: string) => void; 
  onCreateView?: (connectionId: string) => void; 
  onViewDDL?: (connectionId: string, objectType: 'table' | 'view' | 'function' | 'trigger' | 'procedure' | 'index' | 'sequence' | 'user' | 'package', objectName: string) => void;
  onModifyDDL?: (connectionId: string, objectType: 'table' | 'view' | 'function' | 'trigger' | 'procedure' | 'index' | 'sequence' | 'user' | 'package', objectName: string) => void;
  onViewTable?: (connectionId: string, tableName: string) => void; 
}

export interface DatabaseSidebarRef {
  loadConnections: () => Promise<void>;
}

const DatabaseSidebar = forwardRef(({
  onConnectionSelect,
  onTableSelect,
  onObjectSelect,
  onAddConnection,
  onViewChange,
  onCreateTable,
  onCreateView,
  onViewDDL,
  onModifyDDL,
  onViewTable,
}: DatabaseSidebarProps, ref: Ref<DatabaseSidebarRef>) => {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    connectionId: string;
    isVisible: boolean;
  }>({
    x: 0,
    y: 0,
    connectionId: '',
    isVisible: false
  });

  const [objectContextMenu, setObjectContextMenu] = useState<{
    x: number;
    y: number;
    connectionId: string;
    objectType: 'table' | 'view' | 'function' | 'trigger' | 'procedure' | 'index' | 'sequence' | 'user' | 'package';
    objectName: string;
    isVisible: boolean;
  }>({
    x: 0,
    y: 0,
    connectionId: '',
    objectType: 'table',
    objectName: '',
    isVisible: false
  });

  const [sidebarState, setSidebarState] = useState<'normal' | 'collapsed' | 'expanded'>('expanded');
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [, setSelectedConnection] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Estados para objetos de conexión directa
  const [connectionTables, setConnectionTables] = useState<Record<string, Table[]>>({});
  const [connectionViews, setConnectionViews] = useState<Record<string, any[]>>({});
  const [connectionProcedures, setConnectionProcedures] = useState<Record<string, any[]>>({});
  const [connectionFunctions, setConnectionFunctions] = useState<Record<string, any[]>>({});
  const [connectionTriggers, setConnectionTriggers] = useState<Record<string, any[]>>({});
  const [connectionIndexes, setConnectionIndexes] = useState<Record<string, any[]>>({});
  const [connectionPackages, setConnectionPackages] = useState<Record<string, any[]>>({});
  const [connectionSequences, setConnectionSequences] = useState<Record<string, any[]>>({});
  const [connectionUsers, setConnectionUsers] = useState<Record<string, any[]>>({});

  // Estados para dropdowns de objetos
  const [showTablesDropdown, setShowTablesDropdown] = useState<Set<string>>(new Set());
  const [showViewsDropdown, setShowViewsDropdown] = useState<Set<string>>(new Set());
  const [showProceduresDropdown, setShowProceduresDropdown] = useState<Set<string>>(new Set());
  const [showFunctionsDropdown, setShowFunctionsDropdown] = useState<Set<string>>(new Set());
  const [showTriggersDropdown, setShowTriggersDropdown] = useState<Set<string>>(new Set());
  const [showIndexesDropdown, setShowIndexesDropdown] = useState<Set<string>>(new Set());
  const [showPackagesDropdown, setShowPackagesDropdown] = useState<Set<string>>(new Set());
  const [showSequencesDropdown, setShowSequencesDropdown] = useState<Set<string>>(new Set());
  const [showUsersDropdown, setShowUsersDropdown] = useState<Set<string>>(new Set());

  const [expandedConnections, setExpandedConnections] = useState<Set<string>>(new Set());

  // Estados de carga
  const [loadingTables, setLoadingTables] = useState<Set<string>>(new Set());
  const [loadingViews, setLoadingViews] = useState<Set<string>>(new Set());
  const [loadingProcedures, setLoadingProcedures] = useState<Set<string>>(new Set());
  const [loadingFunctions, setLoadingFunctions] = useState<Set<string>>(new Set());
  const [loadingTriggers, setLoadingTriggers] = useState<Set<string>>(new Set());
  const [loadingIndexes, setLoadingIndexes] = useState<Set<string>>(new Set());
  const [loadingPackages, setLoadingPackages] = useState<Set<string>>(new Set());
  const [loadingSequences, setLoadingSequences] = useState<Set<string>>(new Set());
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set());

  // Exponer métodos al componente padre
  useImperativeHandle(ref, () => ({
    loadConnections
  }));

  const loadConnections = async () => {
      setLoading(true);
    try {
      const result = await apiService.getAllConnections();

      if (result.success) {

        const connectionsData = result.data || result.connections || result.data?.connections || [];
        setConnections(connectionsData);
      } else {
      }
    } catch (error) {

    } finally {

      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  useEffect(() => {
  }, [loading, connections]);


  useEffect(() => {
  });


  useEffect(() => {
  }, [connections]);

  const toggleConnectionExpansion = async (connectionId: string) => {

    const connection = connections.find(conn => conn.id === connectionId);
    if (connection && !connection.isActive) {
      await selectConnection(connectionId);
    }
    

    setExpandedConnections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(connectionId)) {
        newSet.delete(connectionId);
      } else {
        newSet.add(connectionId);
      }
      return newSet;
    });
  };

  const toggleGenericDropdown = (connectionId: string, dropdownType: string) => {
    const setterMap: Record<string, React.Dispatch<React.SetStateAction<Set<string>>>> = {
      'tables': setShowTablesDropdown,
      'views': setShowViewsDropdown,
      'procedures': setShowProceduresDropdown,
      'functions': setShowFunctionsDropdown,
      'triggers': setShowTriggersDropdown,
      'indexes': setShowIndexesDropdown,
      'packages': setShowPackagesDropdown,
      'sequences': setShowSequencesDropdown,
      'users': setShowUsersDropdown
    };

    const setter = setterMap[dropdownType];
    if (setter) {
      setter(prev => {
        const newSet = new Set(prev);
        if (newSet.has(connectionId)) {
          newSet.delete(connectionId);
    } else {
          newSet.add(connectionId);
        }
        return newSet;
      });
    }
  };

  const loadTables = async (connectionId: string) => {
    if (loadingTables.has(connectionId)) return;
    
    setLoadingTables(prev => new Set(prev).add(connectionId));
    try {
      const result = await apiService.getTables(connectionId);
      if (result.success) {
        const tables = result.data || [];

        setConnectionTables(prev => ({
          ...prev,
          [connectionId]: tables
        }));
      }
    } catch (error) {
    } finally {
      setLoadingTables(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        return newSet;
      });
    }
  };

  const loadViews = async (connectionId: string) => {
    if (loadingViews.has(connectionId)) return;
    
    setLoadingViews(prev => new Set(prev).add(connectionId));
    try {
      const result = await apiService.getViews(connectionId);
      if (result.success) {
        setConnectionViews(prev => ({
          ...prev,
          [connectionId]: result.data || []
        }));
      }
    } catch (error) {
    } finally {
      setLoadingViews(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        return newSet;
      });
    }
  };

  const loadProcedures = async (connectionId: string) => {
    if (loadingProcedures.has(connectionId)) return;
    
    setLoadingProcedures(prev => new Set(prev).add(connectionId));
    try {
      const result = await apiService.getProcedures(connectionId);
      if (result.success) {
        setConnectionProcedures(prev => ({
          ...prev,
          [connectionId]: result.data || []
        }));
      }
    } catch (error) {
    } finally {
      setLoadingProcedures(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        return newSet;
      });
    }
  };

  const loadFunctions = async (connectionId: string) => {
    if (loadingFunctions.has(connectionId)) return;
    
    setLoadingFunctions(prev => new Set(prev).add(connectionId));
    try {
      const result = await apiService.getFunctions(connectionId);
      if (result.success) {
        setConnectionFunctions(prev => ({
          ...prev,
          [connectionId]: result.data || []
        }));
      }
    } catch (error) {
    } finally {
      setLoadingFunctions(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        return newSet;
      });
    }
  };

  const loadTriggers = async (connectionId: string) => {
    if (loadingTriggers.has(connectionId)) return;
    
    setLoadingTriggers(prev => new Set(prev).add(connectionId));
    try {
      const result = await apiService.getTriggers(connectionId);
      if (result.success) {
        setConnectionTriggers(prev => ({
          ...prev,
          [connectionId]: result.data || []
        }));
      }
    } catch (error) {
    } finally {
      setLoadingTriggers(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        return newSet;
      });
    }
  };

  const loadIndexes = async (connectionId: string) => {
    if (loadingIndexes.has(connectionId)) return;
    
    setLoadingIndexes(prev => new Set(prev).add(connectionId));
    try {
      const result = await apiService.getIndexes(connectionId);
      if (result.success) {
        setConnectionIndexes(prev => ({
          ...prev,
          [connectionId]: result.data || []
        }));
      }
    } catch (error) {
    } finally {
      setLoadingIndexes(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        return newSet;
      });
    }
  };

  const loadPackages = async (connectionId: string) => {
    if (loadingPackages.has(connectionId)) {
      return;
    }
    
    setLoadingPackages(prev => new Set(prev).add(connectionId));
    
    try {
      const result = await apiService.getPackages(connectionId);
      
      if (result.success) {
        const packages = result.data || [];

        
        if (packages.length > 0) {

        }
        
        setConnectionPackages(prev => ({
          ...prev,
          [connectionId]: packages
        }));
        
      } else {

      }
    } catch (error) {
      if (error instanceof Error) {
      }
    } finally {
      setLoadingPackages(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        return newSet;
      });    }
  };

  const loadSequences = async (connectionId: string) => {
    if (loadingSequences.has(connectionId)) return;
    
      setLoadingSequences(prev => new Set(prev).add(connectionId));
    try {
      const result = await apiService.getSequences(connectionId);
      if (result.success) {
        setConnectionSequences(prev => ({
          ...prev,
          [connectionId]: result.data || []
        }));
      }
    } catch (error) {
    } finally {
      setLoadingSequences(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        return newSet;
      });
    }
  };

  const loadUsers = async (connectionId: string) => {
    if (loadingUsers.has(connectionId)) return;
    
    setLoadingUsers(prev => new Set(prev).add(connectionId));
    try {
      const result = await apiService.getUsers(connectionId);
      if (result.success) {
        setConnectionUsers(prev => ({
          ...prev,
          [connectionId]: result.data || []
        }));
      }
    } catch (error) {
    } finally {
      setLoadingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(connectionId);
          return newSet;
        });
    }
  };

  const selectConnection = async (connectionId: string) => {
    try {
      const result = await apiService.connectToDatabase(connectionId);
      
      if (result.success) {
        setConnections(prev => prev.map(conn => 
          conn.id === connectionId ? { ...conn, isActive: true } : conn
        ));
        
      }
    } catch (error) {
    }
    
    setSelectedConnection(connectionId);
    if (onConnectionSelect) {
      onConnectionSelect(connectionId);
    }
  };

  const disconnectDatabase = async (connectionId: string) => {
    try {
      const result = await apiService.disconnectFromDatabase(connectionId);
      
      if (result.success) {
        
        setConnections(prev => prev.map(conn => 
          conn.id === connectionId ? { ...conn, isActive: false } : conn
        ));
        
        setExpandedConnections(prev => {
          const newSet = new Set(prev);
          newSet.delete(connectionId);
          return newSet;
        });
        
        setConnectionTables(prev => {
          const newState = { ...prev };
          delete newState[connectionId];
          return newState;
        });
        setConnectionViews(prev => {
          const newState = { ...prev };
          delete newState[connectionId];
          return newState;
        });
        setConnectionProcedures(prev => {
          const newState = { ...prev };
          delete newState[connectionId];
          return newState;
        });
        setConnectionFunctions(prev => {
          const newState = { ...prev };
          delete newState[connectionId];
          return newState;
        });
        setConnectionTriggers(prev => {
          const newState = { ...prev };
          delete newState[connectionId];
          return newState;
        });
        setConnectionIndexes(prev => {
          const newState = { ...prev };
          delete newState[connectionId];
          return newState;
        });
        setConnectionPackages(prev => {
          const newState = { ...prev };
          delete newState[connectionId];
          return newState;
        });
        setConnectionSequences(prev => {
          const newState = { ...prev };
          delete newState[connectionId];
          return newState;
        });
        setConnectionUsers(prev => {
          const newState = { ...prev };
          delete newState[connectionId];
          return newState;
        });
        
        setShowTablesDropdown(prev => {
          const newSet = new Set(prev);
          newSet.delete(connectionId);
          return newSet;
        });
        setShowViewsDropdown(prev => {
          const newSet = new Set(prev);
          newSet.delete(connectionId);
          return newSet;
        });
        setShowProceduresDropdown(prev => {
          const newSet = new Set(prev);
          newSet.delete(connectionId);
          return newSet;
        });
        setShowFunctionsDropdown(prev => {
          const newSet = new Set(prev);
          newSet.delete(connectionId);
          return newSet;
        });
        setShowTriggersDropdown(prev => {
          const newSet = new Set(prev);
          newSet.delete(connectionId);
          return newSet;
        });
        setShowIndexesDropdown(prev => {
          const newSet = new Set(prev);
          newSet.delete(connectionId);
          return newSet;
        });
        setShowPackagesDropdown(prev => {
          const newSet = new Set(prev);
          newSet.delete(connectionId);
          return newSet;
        });
        setShowSequencesDropdown(prev => {
          const newSet = new Set(prev);
          newSet.delete(connectionId);
          return newSet;
        });
        setShowUsersDropdown(prev => {
          const newSet = new Set(prev);
          newSet.delete(connectionId);
          return newSet;
        });
        
      }
    } catch (error) {
    }
  };

  const deleteConnection = async (connectionId: string) => {
    try {
      const result = await apiService.removeConnection(connectionId);
      if (result.success) {
        setConnections(prev => prev.filter(conn => conn.id !== connectionId));
      }
    } catch (error) {
    }
  };

  const refreshConnection = async (connectionId: string) => {
    await Promise.all([
      loadTables(connectionId),
      loadViews(connectionId),
      loadProcedures(connectionId),
      loadFunctions(connectionId),
      loadTriggers(connectionId),
      loadIndexes(connectionId),
      loadPackages(connectionId),
      loadSequences(connectionId),
      loadUsers(connectionId)
    ]);
  };

  const showObjectContextMenu = (e: React.MouseEvent, connectionId: string, objectType: 'table' | 'view' | 'function' | 'trigger' | 'procedure' | 'index' | 'sequence' | 'user' | 'package', objectName: string) => {
    e.preventDefault();
    setObjectContextMenu({
      x: e.clientX,
      y: e.clientY,
      connectionId,
      objectType, 
      objectName,
      isVisible: true
    });
  };

  const handleTableSelect = (connectionId: string, tableName: string) => {
    if (onTableSelect) {
      onTableSelect(connectionId, tableName);
      if (onViewChange) {
        onViewChange('table');
      }
    }
  };

  const handleObjectSelect = (connectionId: string, objectType: 'function' | 'trigger' | 'procedure' | 'view' | 'index' | 'sequence' | 'package' | 'user', objectName: string) => {
    if (onObjectSelect) {
      onObjectSelect(connectionId, objectType, objectName);
      if (onViewChange) {
        onViewChange('object');
      }
    }
  };

  const handleCreateTable = (connectionId: string) => {
    if (onCreateTable) {
      onCreateTable(connectionId);
    }
  };

  const handleCreateView = (connectionId: string) => {
    if (onCreateView) {
      onCreateView(connectionId);
    }
  };

  const handleViewDDL = (connectionId: string, objectType: 'table' | 'view' | 'function' | 'trigger' | 'procedure' | 'index' | 'sequence' | 'user' | 'package', objectName: string) => {
    if (onViewDDL) {
      onViewDDL(connectionId, objectType, objectName);
      if (onViewChange) {
        onViewChange('object');
      }
    }
  };

  const handleModifyDDL = (connectionId: string, objectType: 'table' | 'view' | 'function' | 'trigger' | 'procedure' | 'index' | 'sequence' | 'user' | 'package', objectName: string) => {
    if (onModifyDDL) {
      onModifyDDL(connectionId, objectType, objectName);
      if (onViewChange) {
        onViewChange('object');
      }
    }
  };

  const handleViewTable = (connectionId: string, tableName: string) => {
    if (onViewTable) {
      onViewTable(connectionId, tableName);
      if (onViewChange) {
        onViewChange('table');
      }
    }
  };

  return (
        <div className={`database-sidebar ${sidebarState}`}>
          <div className="sidebar-header">
        <h3>Conexiones</h3>
        <button className="add-connection-btn" onClick={onAddConnection}>
                <span className="add-icon"></span>
              </button>
          </div>

      <div className="sidebar-content" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 100px)' }}>

        {loading && (
          <div className="loading">Cargando conexiones...</div>
        )}

          <div className="connections-list">
            {connections.map((connection) => {
              const isExpanded = expandedConnections.has(connection.id);
            const tables = connectionTables[connection.id] || [];
            const views = connectionViews[connection.id] || [];
            const procedures = connectionProcedures[connection.id] || [];
            const functions = connectionFunctions[connection.id] || [];
            const triggers = connectionTriggers[connection.id] || [];
            const indexes = connectionIndexes[connection.id] || [];
            const packages = connectionPackages[connection.id] || [];
            const sequences = connectionSequences[connection.id] || [];
            const users = connectionUsers[connection.id] || [];

            const isLoadingTables = loadingTables.has(connection.id);
            const isLoadingViews = loadingViews.has(connection.id);
            const isLoadingProcedures = loadingProcedures.has(connection.id);
            const isLoadingFunctions = loadingFunctions.has(connection.id);
            const isLoadingTriggers = loadingTriggers.has(connection.id);
            const isLoadingIndexes = loadingIndexes.has(connection.id);
            const isLoadingPackages = loadingPackages.has(connection.id);
            const isLoadingSequences = loadingSequences.has(connection.id);
            const isLoadingUsers = loadingUsers.has(connection.id);

              return (
              <div key={connection.id} className="tree-item connection-item">
                <div 
                  className="tree-content connection-content"
                  onClick={() => toggleConnectionExpansion(connection.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        connectionId: connection.id,
                        isVisible: true
                      });
                    }}
                  >
                    <span className="tree-icon connection-icon-img"></span>
                    <span className="tree-label">{connection.name}</span>
                    <span className="connection-status">
                      {connection.isActive ? <span className="status-active-icon"></span> : <span className="status-inactive-icon"></span>}
                    </span>
                  </div>

                  {/* Contenido expandible */}
                  {isExpanded && (
                    <div className="tree-structure">
                      <>
                        {/* Tablas */}
                        <div className="object-section">
                          <div
                            className="section-header clickeable-header schema-category"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!connectionTables[connection.id]) {
                                loadTables(connection.id);
                              }
                              toggleGenericDropdown(connection.id, 'tables');
                            }}
                            onContextMenu={(e) => {
                              e.stopPropagation();
                              showObjectContextMenu(e, connection.id, 'table', '');
                            }}
                          >
                            <span className={`expand-icon ${showTablesDropdown.has(connection.id) ? 'expanded' : ''}`}>
                              {showTablesDropdown.has(connection.id) ? <span className="expand-down-icon"></span> : <span className="expand-right-icon"></span>}
                            </span>
                            <span className="section-title">Tablas</span>
                            <span className="schema-count">({tables.length})</span>
                            {isLoadingTables && <span className="loading-indicator loading-icon"></span>}
                          </div>

                          {showTablesDropdown.has(connection.id) && (
                            <div className="schemas-dropdown schema-element"> 
                              <div className="tables-list">
                                {tables.map((table: any) => {
                                  const tableName = table.table_name || table.name || table.TABLE_NAME || table.NAME || 'Sin nombre';
                                  
                                  return (
                                    <div
                                      key={`table-${connection.id}-${tableName}`}
                                      className="table-item"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTableSelect(connection.id, tableName);
                                      }}
                                      onContextMenu={(e) => {
                                        e.stopPropagation();
                                        showObjectContextMenu(e, connection.id, 'table', tableName);
                                      }}
                                    >
                                      <span className="table-icon table-icon-img"></span>
                                      <span className="table-name">{tableName}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              {tables.length === 0 && !isLoadingTables && (
                                <div className="no-schemas-message">
                                  No hay tablas disponibles
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Vistas */}
                        <div className="object-section">
                          <div
                            className="section-header clickeable-header schema-category"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!connectionViews[connection.id]) {
                                loadViews(connection.id);
                              }
                              toggleGenericDropdown(connection.id, 'views');
                            }}
                            onContextMenu={(e) => {
                              e.stopPropagation();
                              showObjectContextMenu(e, connection.id, 'view', '');
                            }}
                          >
                            <span className={`expand-icon ${showViewsDropdown.has(connection.id) ? 'expanded' : ''}`}>
                              {showViewsDropdown.has(connection.id) ? <span className="expand-down-icon"></span> : <span className="expand-right-icon"></span>}
                            </span>
                            <span className="section-title">Vistas</span>
                            <span className="schema-count">({views.length})</span>
                            {isLoadingViews && <span className="loading-indicator loading-icon"></span>}
                          </div>

                          {showViewsDropdown.has(connection.id) && (
                            <div className="schemas-dropdown schema-element">
                              <div className="tables-list">
                                {views.map((view: any) => {
                                  const viewName = view.view_name || view.name || view.VIEW_NAME || view.NAME || 'Sin nombre';
                                  
                                  return (
                                    <div
                                      key={`view-${connection.id}-${viewName}`}
                                      className="table-item clickeable-item"
                                      onClick={() => {
                                        handleObjectSelect(connection.id, 'view', viewName);
                                      }}
                                      onContextMenu={(e) => {
                                        e.stopPropagation();
                                        showObjectContextMenu(e, connection.id, 'view', viewName);
                                      }}
                                    >
                                      <span className="table-icon table-icon-img"></span>
                                      <span className="table-name">{viewName}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              {views.length === 0 && !isLoadingViews && (
                                <div className="no-schemas-message">No hay vistas disponibles</div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Procedimientos */}
                        <div className="object-section">
                          <div
                            className="section-header clickeable-header schema-category"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!connectionProcedures[connection.id]) {
                                loadProcedures(connection.id);
                              }
                              toggleGenericDropdown(connection.id, 'procedures');
                            }}
                            onContextMenu={(e) => {
                              e.stopPropagation();
                              showObjectContextMenu(e, connection.id, 'procedure', '');
                            }}
                          >
                            <span className={`expand-icon ${showProceduresDropdown.has(connection.id) ? 'expanded' : ''}`}>
                              {showProceduresDropdown.has(connection.id) ? <span className="expand-down-icon"></span> : <span className="expand-right-icon"></span>}
                            </span>
                            <span className="section-title">Procedimientos</span>
                            <span className="schema-count">({procedures.length})</span>
                            {isLoadingProcedures && <span className="loading-indicator loading-icon"></span>}
                          </div>

                          {showProceduresDropdown.has(connection.id) && (
                            <div className="schemas-dropdown schema-element">
                              <div className="tables-list">
                                {procedures.map((proc: any) => {
                                  const procName = proc.procedure_name || proc.name || proc.PROCEDURE_NAME || proc.NAME || 'Sin nombre';
                                  
                                  return (
                                    <div
                                      key={`proc-${connection.id}-${procName}`}
                                      className="table-item clickeable-item"
                                      onClick={() => {
                                        handleObjectSelect(connection.id, 'procedure', procName);
                                      }}
                                      onContextMenu={(e) => {
                                        e.stopPropagation();
                                        showObjectContextMenu(e, connection.id, 'procedure', procName);
                                      }}
                                    >
                                      <span className="table-icon table-icon-img"></span>
                                      <span className="table-name">{procName}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              {procedures.length === 0 && !isLoadingProcedures && (
                                <div className="no-schemas-message">No hay procedimientos disponibles</div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Funciones */}
                        <div className="object-section">
                          <div
                            className="section-header clickeable-header schema-category"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!connectionFunctions[connection.id]) {
                                loadFunctions(connection.id);
                              }
                              toggleGenericDropdown(connection.id, 'functions');
                            }}
                            onContextMenu={(e) => {
                              e.stopPropagation();
                              showObjectContextMenu(e, connection.id, 'function', '');
                            }}
                          >
                            <span className={`expand-icon ${showFunctionsDropdown.has(connection.id) ? 'expanded' : ''}`}>
                              {showFunctionsDropdown.has(connection.id) ? <span className="expand-down-icon"></span> : <span className="expand-right-icon"></span>}
                            </span>
                            <span className="section-title">Funciones</span>
                            <span className="schema-count">({functions.length})</span>
                            {isLoadingFunctions && <span className="loading-indicator loading-icon"></span>}
                          </div>

                          {showFunctionsDropdown.has(connection.id) && (
                            <div className="schemas-dropdown schema-element">
                              <div className="tables-list">
                                {functions.map((fn: any) => {
                                  const funcName = fn.function_name || fn.name || fn.FUNCTION_NAME || fn.NAME || 'Sin nombre';
                                  
                                  return (
                                    <div
                                      key={`fn-${connection.id}-${funcName}`}
                                      className="table-item clickeable-item"
                                      onClick={() => {
                                        handleObjectSelect(connection.id, 'function', funcName);
                                      }}
                                      onContextMenu={(e) => {
                                        e.stopPropagation();
                                        showObjectContextMenu(e, connection.id, 'function', funcName);
                                      }}
                                    >
                                      <span className="table-icon table-icon-img"></span>
                                      <span className="table-name">{funcName}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              {functions.length === 0 && !isLoadingFunctions && (
                                <div className="no-schemas-message">No hay funciones disponibles</div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Triggers */}
                        <div className="object-section">
                          <div
                            className="section-header clickeable-header schema-category"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!connectionTriggers[connection.id]) {
                                loadTriggers(connection.id);
                              }
                              toggleGenericDropdown(connection.id, 'triggers');
                            }}
                            onContextMenu={(e) => {
                              e.stopPropagation();
                              showObjectContextMenu(e, connection.id, 'trigger', '');
                            }}
                          >
                            <span className={`expand-icon ${showTriggersDropdown.has(connection.id) ? 'expanded' : ''}`}>
                              {showTriggersDropdown.has(connection.id) ? <span className="expand-down-icon"></span> : <span className="expand-right-icon"></span>}
                            </span>
                            <span className="section-title">Triggers</span>
                            <span className="schema-count">({triggers.length})</span>
                            {isLoadingTriggers && <span className="loading-indicator loading-icon"></span>}
                          </div>

                          {showTriggersDropdown.has(connection.id) && (
                            <div className="schemas-dropdown schema-element">
                              <div className="tables-list">
                                {triggers.map((tr: any) => {
                                  const triggerName = tr.trigger_name || tr.name || tr.TRIGGER_NAME || tr.NAME || 'Sin nombre';
                                  const relationName = tr.relation_name || tr.table_name || tr.RELATION_NAME || tr.TABLE_NAME || '';
                                  
                                  return (
                                    <div
                                      key={`tr-${connection.id}-${triggerName}`}
                                      className="table-item clickeable-item"
                                      onClick={() => {
                                        handleObjectSelect(connection.id, 'trigger', triggerName);
                                      }}
                                      onContextMenu={(e) => {
                                        e.stopPropagation();
                                        showObjectContextMenu(e, connection.id, 'trigger', triggerName);
                                      }}
                                    >
                                      <span className="table-icon table-icon-img"></span>
                                      <span className="table-name">{triggerName}</span>
                                      <span className="table-date">{relationName}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              {triggers.length === 0 && !isLoadingTriggers && (
                                <div className="no-schemas-message">No hay triggers disponibles</div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Índices */}
                        <div className="object-section">
                          <div
                            className="section-header clickeable-header schema-category"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!connectionIndexes[connection.id]) {
                                loadIndexes(connection.id);
                              }
                              toggleGenericDropdown(connection.id, 'indexes');
                            }}
                            onContextMenu={(e) => {
                              e.stopPropagation();
                              showObjectContextMenu(e, connection.id, 'index', '');
                            }}
                          >
                            <span className={`expand-icon ${showIndexesDropdown.has(connection.id) ? 'expanded' : ''}`}>
                              {showIndexesDropdown.has(connection.id) ? <span className="expand-down-icon"></span> : <span className="expand-right-icon"></span>}
                            </span>
                            <span className="section-title">Índices</span>
                            <span className="schema-count">({indexes.length})</span>
                            {isLoadingIndexes && <span className="loading-indicator loading-icon"></span>}
                          </div>

                          {showIndexesDropdown.has(connection.id) && (
                            <div className="schemas-dropdown schema-element">
                              <div className="tables-list">
                                {indexes.map((ix: any) => {
                                  const indexName = ix.index_name || ix.name || ix.INDEX_NAME || ix.NAME || 'Sin nombre';
                                  const relationName = ix.relation_name || ix.table_name || ix.RELATION_NAME || ix.TABLE_NAME || '';
                                  
                                  return (
                                    <div
                                      key={`ix-${connection.id}-${indexName}`}
                                      className="table-item clickeable-item"
                                      onClick={() => {
                                        handleObjectSelect(connection.id, 'index', indexName);
                                      }}
                                      onContextMenu={(e) => {
                                        e.stopPropagation();
                                        showObjectContextMenu(e, connection.id, 'index', indexName);
                                      }}
                                    >
                                      <span className="table-icon table-icon-img"></span>
                                      <span className="table-name">{indexName}</span>
                                      <span className="table-date">{relationName}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              {indexes.length === 0 && !isLoadingIndexes && (
                                <div className="no-schemas-message">No hay índices disponibles</div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Paquetes */}
                        <div className="object-section">
                          <div
                            className="section-header clickeable-header schema-category"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!connectionPackages[connection.id]) {
                                loadPackages(connection.id);
                              }
                              toggleGenericDropdown(connection.id, 'packages');
                            }}
                            onContextMenu={(e) => {
                              e.stopPropagation();
                              showObjectContextMenu(e, connection.id, 'package', '');
                            }}
                          >
                            <span className={`expand-icon ${showPackagesDropdown.has(connection.id) ? 'expanded' : ''}`}>
                              {showPackagesDropdown.has(connection.id) ? <span className="expand-down-icon"></span> : <span className="expand-right-icon"></span>}
                            </span>
                            <span className="section-title">Paquetes</span>
                            <span className="schema-count">({packages.length})</span>
                            {isLoadingPackages && <span className="loading-indicator loading-icon"></span>}
                          </div>

                          {showPackagesDropdown.has(connection.id) && (
                            <div className="schemas-dropdown schema-element">
                              <div className="tables-list">
                                {packages.map((pkg: any) => {
                                  const packageName = pkg.package_name || pkg.name || pkg.PACKAGE_NAME || pkg.NAME || 'Sin nombre';
                                  
                                  return (
                                    <div
                                      key={`pkg-${connection.id}-${packageName}`}
                                      className="table-item clickeable-item"
                                      onClick={() => {
                                        handleObjectSelect(connection.id, 'package', packageName);
                                      }}
                                      onContextMenu={(e) => {
                                        e.stopPropagation();
                                        showObjectContextMenu(e, connection.id, 'package', packageName);
                                      }}
                                    >
                                      <span className="table-icon table-icon-img"></span>
                                      <span className="table-name">{packageName}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              {packages.length === 0 && !isLoadingPackages && (
                                <div className="no-schemas-message">No hay paquetes disponibles</div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Secuencias */}
                        <div className="object-section">
                          <div
                            className="section-header clickeable-header schema-category"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!connectionSequences[connection.id]) {
                                loadSequences(connection.id);
                              }
                              toggleGenericDropdown(connection.id, 'sequences');
                            }}
                            onContextMenu={(e) => {
                              e.stopPropagation();
                              showObjectContextMenu(e, connection.id, 'sequence', '');
                            }}
                          >
                            <span className={`expand-icon ${showSequencesDropdown.has(connection.id) ? 'expanded' : ''}`}>
                              {showSequencesDropdown.has(connection.id) ? <span className="expand-down-icon"></span> : <span className="expand-right-icon"></span>}
                            </span>
                            <span className="section-title">Secuencias</span>
                            <span className="schema-count">({sequences.length})</span>
                            {isLoadingSequences && <span className="loading-indicator loading-icon"></span>}
                          </div>

                          {showSequencesDropdown.has(connection.id) && (
                            <div className="schemas-dropdown schema-element">
                              <div className="tables-list">
                                {sequences.map((seq: any) => {
                                  const sequenceName = seq.sequence_name || seq.name || seq.SEQUENCE_NAME || seq.NAME || seq.generator_name || seq.GENERATOR_NAME || 'Sin nombre';
                                  
                                  return (
                                    <div
                                      key={`seq-${connection.id}-${sequenceName}`}
                                      className="table-item clickeable-item"
                                      onClick={() => {
                                        handleObjectSelect(connection.id, 'sequence', sequenceName);
                                      }}
                                      onContextMenu={(e) => {
                                        e.stopPropagation();
                                        showObjectContextMenu(e, connection.id, 'sequence', sequenceName);
                                      }}
                                    >
                                      <span className="table-icon table-icon-img"></span>
                                      <span className="table-name">{sequenceName}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              {sequences.length === 0 && !isLoadingSequences && (
                                <div className="no-schemas-message">No hay secuencias disponibles</div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Usuarios */}
                        <div className="object-section">
                          <div
                            className="section-header clickeable-header schema-category"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!connectionUsers[connection.id]) {
                                loadUsers(connection.id);
                              }
                              toggleGenericDropdown(connection.id, 'users');
                            }}
                            onContextMenu={(e) => {
                              e.stopPropagation();
                              showObjectContextMenu(e, connection.id, 'user', '');
                            }}
                          >
                            <span className={`expand-icon ${showUsersDropdown.has(connection.id) ? 'expanded' : ''}`}>
                              {showUsersDropdown.has(connection.id) ? <span className="expand-down-icon"></span> : <span className="expand-right-icon"></span>}
                            </span>
                            <span className="section-title">Usuarios</span>
                            <span className="schema-count">({users.length})</span>
                            {isLoadingUsers && <span className="loading-indicator loading-icon"></span>}
                          </div>

                          {showUsersDropdown.has(connection.id) && (
                            <div className="schemas-dropdown schema-element">
                              <div className="tables-list">
                                {users.map((usr: any) => {
                                  const userName = usr.user_name || usr.name || usr.USER_NAME || usr.NAME || 'Sin nombre';
                                  
                                  return (
                                    <div
                                      key={`usr-${connection.id}-${userName}`}
                                      className="table-item clickeable-item"
                                      onContextMenu={(e) => {
                                        e.stopPropagation();
                                        showObjectContextMenu(e, connection.id, 'user', userName);
                                      }}
                                    >
                                      <span className="table-icon table-icon-img"></span>
                                      <span className="table-name">{userName}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              {users.length === 0 && !isLoadingUsers && (
                                <div className="no-schemas-message">No hay usuarios visibles</div>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {connections.length === 0 && !loading && (
                          <div className="tree-item empty">
                <div className="tree-content">
                  <span className="tree-icon info-icon-img"></span>
                  <span className="tree-label">
                    No hay conexiones. Conecta a una base de datos para comenzar.
                  </span>
                </div>
              </div>
          )}
      </div>

      {/* Menú contextual para conexiones */}
      {contextMenu.isVisible && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 1000
          }}
        >
          <div className="context-menu-item connect" onClick={() => {
            selectConnection(contextMenu.connectionId);
            setContextMenu({ ...contextMenu, isVisible: false });
          }}>
            <span className="tree-icon connection-icon-img"></span>
            <span>Conectar</span>
          </div>
          
          <div className="context-menu-item disconnect" onClick={() => {
            disconnectDatabase(contextMenu.connectionId);
            setContextMenu({ ...contextMenu, isVisible: false });
          }}>
            <span className="tree-icon disconnect-icon-img"></span>
            <span>Desconectar</span>
          </div>

          <div className="context-menu-item query" onClick={() => {
            if (onViewChange) onViewChange('query');
            if (onConnectionSelect) onConnectionSelect(contextMenu.connectionId);
            setContextMenu({ ...contextMenu, isVisible: false });
          }}>
            <span className="tree-icon query-icon-img"></span>
            <span>Editor de Consultas</span>
          </div>

          <div className="context-menu-item refresh" onClick={() => {
            refreshConnection(contextMenu.connectionId);
            setContextMenu({ ...contextMenu, isVisible: false });
          }}>
            <span className="tree-icon refresh-icon-img"></span>
            <span>Refresh</span>
          </div>

          <div className="context-menu-item delete" onClick={() => {
            if (confirm(`¿Estás seguro de que quieres eliminar esta conexión?`)) {
              deleteConnection(contextMenu.connectionId);
            }
            setContextMenu({ ...contextMenu, isVisible: false });
          }}>
            <span className="tree-icon delete-icon-img"></span>
            <span>Eliminar</span>
          </div>
        </div>
      )}

      {/* Menú contextual para objetos */}
      {objectContextMenu.isVisible && (
        <div
          className="context-menu object-context-menu"
          style={{
            position: 'fixed',
            top: objectContextMenu.y,
            left: objectContextMenu.x,
            zIndex: 1000
          }}
        >
           {objectContextMenu.objectType === 'table' && !objectContextMenu.objectName && (
            <div className="context-menu-item create-table"  onClick={() => {
              handleCreateTable(objectContextMenu.connectionId);
              setContextMenu({ ...contextMenu, isVisible: false });
            }}>
              <span className="tree-icon table-icon-img"></span>
              <span>Crear Tabla</span>
            </div>
          )}


          {objectContextMenu.objectType === 'view' && !objectContextMenu.objectName && (
            <div className="context-menu-item create-view" onClick={() => {
              handleCreateView(objectContextMenu.connectionId);
              setContextMenu({ ...contextMenu, isVisible: false });
            }}>
              <span className="tree-icon view-icon-img"></span>
              <span>Crear Vista</span>
            </div>
          )}
          
          <div className="context-menu-item view-ddl" onClick={() => {
            handleViewDDL(objectContextMenu.connectionId, objectContextMenu.objectType, objectContextMenu.objectName);
            setObjectContextMenu({ ...objectContextMenu, isVisible: false });
          }}>
            <span className="tree-icon ddl-icon-img"></span>
            <span>Ver DDL</span>
          </div>

          <div className="context-menu-item modify-ddl" onClick={() => {
            handleModifyDDL(objectContextMenu.connectionId, objectContextMenu.objectType, objectContextMenu.objectName);
            setObjectContextMenu({ ...objectContextMenu, isVisible: false });
          }}>
            <span className="tree-icon modify-icon-img"></span>
            <span>Modificar DDL</span>
            </div>

          {objectContextMenu.objectType === 'table' && (
            <div className="context-menu-item view-table" onClick={() => {
              handleViewTable(objectContextMenu.connectionId, objectContextMenu.objectName);
              setObjectContextMenu({ ...objectContextMenu, isVisible: false });
            }}>
              <span className="tree-icon table-icon-img"></span>
              <span>Ver Tabla</span>
            </div>
          )}
            </div>
          )}

      {/* Overlay para cerrar menús contextuales */}
      {(contextMenu.isVisible || objectContextMenu.isVisible) && (
        <div
          className="context-menu-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
            backgroundColor: 'transparent'
          }}
          onClick={() => {
            setContextMenu({ ...contextMenu, isVisible: false });
            setObjectContextMenu({ ...objectContextMenu, isVisible: false });
          }}
        />
      )}
    </div>
  );
});

DatabaseSidebar.displayName = 'DatabaseSidebar';

export default DatabaseSidebar;