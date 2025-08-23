
import { useState, useRef, useEffect } from 'react'

import { ThemeProvider, useTheme } from './contexts/ThemeContext'

import DatabaseSidebar from './components/DatabaseSidebar'
import type { DatabaseSidebarRef } from './components/DatabaseSidebar'
import ConnectionForm from './components/ConnectionForm'
import CreateTableForm from './components/CreateTableForm'
import CreateViewForm from './components/CreateViewForm'
import QueryEditor from './components/QueryEditor'
import TableDetails from './components/TableDetails'
import ObjectDDLViewer from './components/ObjectDDLViewer'
import NavigationTabs from './components/NavigationTabs'
import apiService from './services/apiService'
import type { DatabaseConnection } from './services/apiService'
import './App.css'


function AppContent() {
  


  const [showConnectionModal, setShowConnectionModal] = useState(false)

  
  const [showCreateTableModal, setShowCreateTableModal] = useState(false)
  const [showCreateViewModal, setShowCreateViewModal] = useState(false)
  const [createTableData, setCreateTableData] = useState<{ connectionId: string; } | null>(null)
  const [createViewData, setCreateViewData] = useState<{ connectionId: string; } | null>(null)
  const [initialQuery, setInitialQuery] = useState<string>('')


  const [selectedConnection, setSelectedConnection] = useState<string | null>(null)


  const [connections, setConnections] = useState<DatabaseConnection[]>([])


  const [selectedTable, setSelectedTable] = useState<string | null>(null)

  const [selectedObjectType, setSelectedObjectType] = useState<'function' | 'trigger' | 'procedure' | 'view' | 'index' | 'sequence' | 'user' | null>(null)

  const [selectedObjectName, setSelectedObjectName] = useState<string | null>(null)

  const [activeView, setActiveView] = useState<'welcome' | 'query' | 'table' | 'object'>('welcome')

  const sidebarRef = useRef<DatabaseSidebarRef | null>(null)


  const { isDarkMode, toggleTheme } = useTheme()

  useEffect(() => {
    const loadConnections = async () => {
      try {
        const result = await apiService.getAllConnections()
        if (result.success) {
          setConnections(result.connections || [])
        }
      } catch (error) {
        console.error('Error al cargar conexiones:', error)
      }
    }
    
    loadConnections()
  }, [])


  const handleConnectionSuccess = async () => {
    // Recargamos las conexiones en el sidebar inmediatamente
    if (sidebarRef.current) {
      await sidebarRef.current.loadConnections()
    }
    
    // También actualizamos el estado local de conexiones
    try {
      const result = await apiService.getAllConnections()
      if (result.success) {
        setConnections(result.connections || [])
      }
    } catch (error) {
      console.error('Error al cargar conexiones:', error)
    }
  }

  const handleConnectionSelect = (connectionId: string) => {
    setSelectedConnection(connectionId) 
    setActiveView('query') 
  }

  const handleTableSelect = (connectionId: string, tableName: string) => {


    if (tableName) {
      setSelectedConnection(connectionId);
      setSelectedTable(tableName);
      setSelectedObjectType(null); 
      setSelectedObjectName(null); 
      setActiveView('table'); 
    } else {
      console.error('Invalid table selection:', { tableName });
    }
  };

  
  const handleObjectSelect = (connectionId: string, objectType: 'function' | 'trigger' | 'procedure' | 'view' | 'index' | 'sequence' | 'user', objectName: string) => {
    
    if (objectName) {
      setSelectedConnection(connectionId);
      setSelectedTable(null); 
      setSelectedObjectType(objectType);
      setSelectedObjectName(objectName);
      setActiveView('object');
    } else {
      console.error('Invalid object selection:', { objectType, objectName });
    }
  };

 
  const handleCreateTable = (connectionId: string) => {
    setCreateTableData({ connectionId });
    setShowCreateTableModal(true);
  };


  const handleCreateView = (connectionId: string) => {
    setCreateViewData({ connectionId });
    setShowCreateViewModal(true);
  };


  const handleViewDDL = (connectionId: string, objectType: 'table' | 'view' | 'function' | 'trigger' | 'procedure' | 'index' | 'sequence' | 'user', objectName: string) => {
    
 
    setSelectedConnection(connectionId);
    setSelectedTable(null);
    setSelectedObjectType(objectType as 'function' | 'trigger' | 'procedure' | 'view' | 'index' | 'sequence' | 'user');
    setSelectedObjectName(objectName);
    setActiveView('object');
  };


  const handleModifyDDL = async (connectionId: string, objectType: 'table' | 'view' | 'function' | 'trigger' | 'procedure' | 'index' | 'sequence' | 'user' | 'package', objectName: string) => {
    
    try {

      let ddlResult;
      
      switch (objectType) {
        case 'table':
          ddlResult = await apiService.generateTableDDL(connectionId, objectName);
          break;
        case 'view':
          ddlResult = await apiService.generateViewDDL(connectionId, objectName);
          break;
        case 'function':
          ddlResult = await apiService.generateFunctionDDL(connectionId, objectName);
          break;
        case 'procedure':
          ddlResult = await apiService.generateProcedureDDL(connectionId, objectName);
          break;
        case 'trigger':
          ddlResult = await apiService.generateTriggerDDL(connectionId, objectName);
          break;
        case 'index':
          ddlResult = await apiService.generateIndexDDL(connectionId, objectName);
          break;
        case 'sequence':
          ddlResult = await apiService.generateSequenceDDL(connectionId, objectName);
          break;
        case 'user':
          ddlResult = await apiService.generateUserDDL(connectionId, objectName);
          break;
        case 'package':
          ddlResult = await apiService.generatePackageDDL(connectionId, objectName);
          break;
        default:
          throw new Error('Tipo de objeto no soportado');
      }
      
      if (ddlResult.success && ddlResult.data) {
        setSelectedConnection(connectionId);
        setInitialQuery(ddlResult.data);
        setActiveView('query');
      } else {
        alert(`Error al obtener DDL: ${ddlResult.message}`);
      }
    } catch (error) {
      console.error('Error en handleModifyDDL:', error);
      alert(`Error al obtener DDL: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleViewTable = (connectionId: string, tableName: string) => {
    setSelectedConnection(connectionId);
    setSelectedTable(tableName);
    setSelectedObjectType(null);
    setSelectedObjectName(null);
    setActiveView('table');
  };



  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1>Gestor de Base de Datos Firebird</h1>
        </div>

        <div className="header-right">
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={isDarkMode ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            {isDarkMode ? <span className="sun-icon"></span> : <span className="moon-icon"></span>}
          </button>

          <button
            className="new-connection-btn"
            onClick={() => setShowConnectionModal(true)}
          >
            + Nueva Conexión
          </button>
        </div>
      </header>

      <div className="app-content">
        <DatabaseSidebar
          ref={sidebarRef}
          onConnectionSelect={handleConnectionSelect} 
          onTableSelect={handleTableSelect} 
          onObjectSelect={handleObjectSelect} 
          onAddConnection={() => setShowConnectionModal(true)}
          onViewChange={setActiveView} 
          onCreateTable={handleCreateTable} 
          onCreateView={handleCreateView} 
          onViewDDL={handleViewDDL} 
          onModifyDDL={handleModifyDDL} 
          onViewTable={handleViewTable} 
        />


        <main className="main-content">

          <NavigationTabs
            activeView={activeView} 
            onViewChange={setActiveView} 
            hasConnection={!!selectedConnection} 
            hasTable={!!selectedTable} 
            hasObject={!!selectedObjectName} 
          />

          {activeView === 'query' ? (
            <QueryEditor
              connectionId={selectedConnection}
              connectionName={connections.find(conn => conn.id === selectedConnection)?.name}
              initialQuery={initialQuery}
            />
          ) : activeView === 'table' ? (
            <TableDetails
              connectionId={selectedConnection}
              tableName={selectedTable}
            />
          ) : activeView === 'object' ? (
            <ObjectDDLViewer
              connectionId={selectedConnection}
              objectName={selectedObjectName}
              objectType={selectedObjectType!}
            />
          ) : (
            <div className="welcome-message">
              <h2>Bienvenido al Gestor de Base de Datos</h2>
              <p>Selecciona una conexión del sidebar o crea una nueva para comenzar.</p>
              <div className="welcome-actions">
                <button
                  className="connect-btn"
                  onClick={() => setShowConnectionModal(true)}
                >
                  Crear Nueva Conexión
                </button>
                <button
                  className="query-btn"
                  onClick={() => setActiveView('query')}
                  disabled={!selectedConnection} 
                >
                  Abrir Editor de Consultas
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      
      <ConnectionForm
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        onConnectionSuccess={handleConnectionSuccess}
      />

      {createTableData && (
        <CreateTableForm
          isOpen={showCreateTableModal}
          onClose={() => {
            setShowCreateTableModal(false);
            setCreateTableData(null);
          }}
          connectionId={createTableData.connectionId}
          onSuccess={() => {
            if (sidebarRef.current) {
              sidebarRef.current.loadConnections();
            }
          }}
        />
      )}

      {createViewData && (
        <CreateViewForm
          isOpen={showCreateViewModal}
          onClose={() => {
            setShowCreateViewModal(false);
            setCreateViewData(null);
          }}
          connectionId={createViewData.connectionId}
          onSuccess={() => {
            if (sidebarRef.current) {
              sidebarRef.current.loadConnections();
            }
          }}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App