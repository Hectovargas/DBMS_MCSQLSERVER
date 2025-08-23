// ========== IMPORTS ==========
// Importamos React y el hook useState para manejar el estado del componente
import { useState, useRef, useEffect } from 'react'
// Importamos el proveedor de tema para manejar el tema claro/oscuro de la aplicación
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
// Importamos todos los componentes que vamos a usar en la aplicación
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
// Importamos los estilos CSS para este componente
import './App.css'

// ========== COMPONENTE PRINCIPAL DE LA APLICACIÓN ==========
function AppContent() {
  // ========== ESTADOS DE LA APLICACIÓN ==========

  // Estado para controlar si mostrar el modal de nueva conexión
  const [showConnectionModal, setShowConnectionModal] = useState(false)

  // Estados para los formularios de crear tabla y vista
  const [showCreateTableModal, setShowCreateTableModal] = useState(false)
  const [showCreateViewModal, setShowCreateViewModal] = useState(false)
  const [createTableData, setCreateTableData] = useState<{ connectionId: string; schemaName: string } | null>(null)
  const [createViewData, setCreateViewData] = useState<{ connectionId: string; schemaName: string } | null>(null)
  const [initialQuery, setInitialQuery] = useState<string>('')

  // Estado para almacenar el ID de la conexión seleccionada actualmente
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null)

  // Estado para almacenar la lista de conexiones
  const [connections, setConnections] = useState<DatabaseConnection[]>([])

  // Estado para almacenar el nombre de la tabla seleccionada
  const [selectedTable, setSelectedTable] = useState<string | null>(null)

  // Estado para almacenar el nombre del esquema seleccionado
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null)

  // Estado para almacenar el tipo de objeto seleccionado
  const [selectedObjectType, setSelectedObjectType] = useState<'function' | 'trigger' | 'procedure' | 'view' | 'index' | 'sequence' | 'user' | null>(null)

  // Estado para almacenar el nombre del objeto seleccionado
  const [selectedObjectName, setSelectedObjectName] = useState<string | null>(null)

  // Estado para controlar qué vista está activa: 'welcome', 'query', 'table', o 'object'
  const [activeView, setActiveView] = useState<'welcome' | 'query' | 'table' | 'object'>('welcome')

  // Referencia al sidebar para poder llamar sus métodos
  const sidebarRef = useRef<DatabaseSidebarRef | null>(null)

  // Hook para manejar el tema
  const { isDarkMode, toggleTheme } = useTheme()

  // ========== EFECTOS ==========
  
  // Efecto para cargar las conexiones al inicio
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

  // ========== FUNCIONES MANEJADORAS DE EVENTOS ==========

  // Función que se ejecuta cuando se crea exitosamente una nueva conexión
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

  // Función que se ejecuta cuando el usuario selecciona una conexión del sidebar
  const handleConnectionSelect = (connectionId: string) => {
    setSelectedConnection(connectionId) // Guarda la conexión seleccionada
    setActiveView('query') // Cambia a la vista del editor de consultas
  }

  const handleTableSelect = (connectionId: string, tableName: string, schemaName: string) => {
    console.log('handleTableSelect called with:', { tableName, schemaName });
    // Solo actualiza si tenemos valores válidos
    if (tableName && schemaName) {
      setSelectedConnection(connectionId);
      setSelectedTable(tableName);
      setSelectedSchema(schemaName);
      setSelectedObjectType(null); // Limpiar tipo de objeto
      setSelectedObjectName(null); // Limpiar nombre de objeto
      setActiveView('table'); // Forzar cambio de vista
      console.log('Table selected:', tableName, 'in schema:', schemaName);
      console.log('Active view set to: table');
    } else {
      console.error('Invalid table selection:', { tableName, schemaName });
    }
  };

  // Función para manejar la selección de otros objetos (funciones, triggers, etc.)
  const handleObjectSelect = (connectionId: string, objectType: 'function' | 'trigger' | 'procedure' | 'view' | 'index' | 'sequence' | 'user', objectName: string, schemaName: string) => {
    console.log('handleObjectSelect called with:', { objectType, objectName, schemaName });
    
    if (objectName && schemaName) {
      setSelectedConnection(connectionId);
      setSelectedTable(null); // Limpiar tabla seleccionada
      setSelectedSchema(schemaName);
      setSelectedObjectType(objectType);
      setSelectedObjectName(objectName);
      setActiveView('object');
      console.log('Object selected:', objectType, objectName, 'in schema:', schemaName);
      console.log('Active view set to: object');
    } else {
      console.error('Invalid object selection:', { objectType, objectName, schemaName });
    }
  };

  // Función para manejar la creación de tabla
  const handleCreateTable = (connectionId: string, schemaName: string) => {
    console.log('handleCreateTable called with:', { connectionId, schemaName });
    setCreateTableData({ connectionId, schemaName });
    setShowCreateTableModal(true);
  };

  // Función para manejar la creación de vista
  const handleCreateView = (connectionId: string, schemaName: string) => {
    console.log('handleCreateView called with:', { connectionId, schemaName });
    setCreateViewData({ connectionId, schemaName });
    setShowCreateViewModal(true);
  };

  // Función para manejar la visualización de DDL
  const handleViewDDL = (connectionId: string, objectType: 'table' | 'view' | 'function' | 'trigger' | 'procedure' | 'index' | 'sequence' | 'user', objectName: string, schemaName: string) => {
    console.log('handleViewDDL called with:', { connectionId, objectType, objectName, schemaName });
    
    // Para todos los objetos, usar la vista de objeto (DDL)
    setSelectedConnection(connectionId);
    setSelectedTable(null);
    setSelectedSchema(schemaName);
    setSelectedObjectType(objectType as 'function' | 'trigger' | 'procedure' | 'view' | 'index' | 'sequence' | 'user');
    setSelectedObjectName(objectName);
    setActiveView('object');
  };

  // Función para manejar la modificación de DDL (exportar al editor de consultas)
  const handleModifyDDL = async (connectionId: string, objectType: 'table' | 'view' | 'function' | 'trigger' | 'procedure' | 'index' | 'sequence' | 'user', objectName: string, schemaName: string) => {
    console.log('handleModifyDDL called with:', { connectionId, objectType, objectName, schemaName });
    
    try {
      // Obtener el DDL del objeto
      let ddlResult;
      
      switch (objectType) {
        case 'table':
          ddlResult = await apiService.generateTableDDL(connectionId, objectName, schemaName);
          break;
        case 'view':
          ddlResult = await apiService.generateViewDDL(connectionId, objectName, schemaName);
          break;
        case 'function':
          ddlResult = await apiService.generateFunctionDDL(connectionId, objectName, schemaName);
          break;
        case 'procedure':
          ddlResult = await apiService.generateProcedureDDL(connectionId, objectName, schemaName);
          break;
        case 'trigger':
          ddlResult = await apiService.generateTriggerDDL(connectionId, objectName, schemaName);
          break;
        case 'index':
          ddlResult = await apiService.generateIndexDDL(connectionId, objectName, schemaName);
          break;
        case 'sequence':
          ddlResult = await apiService.generateSequenceDDL(connectionId, objectName, schemaName);
          break;
        case 'user':
          ddlResult = await apiService.generateUserDDL(connectionId, objectName, schemaName);
          break;
        default:
          throw new Error('Tipo de objeto no soportado');
      }
      
      if (ddlResult.success && ddlResult.data) {
        // Establecer la conexión y cambiar a la vista del editor de consultas
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

  // Función para manejar la acción de ver tabla
  const handleViewTable = (connectionId: string, tableName: string, schemaName: string) => {
    console.log('handleViewTable called with:', { connectionId, tableName, schemaName });
    setSelectedConnection(connectionId);
    setSelectedTable(tableName);
    setSelectedSchema(schemaName);
    setSelectedObjectType(null);
    setSelectedObjectName(null);
    setActiveView('table');
  };


  // ========== RENDERIZADO DEL COMPONENTE ==========
  return (
    <div className="app">
      {/* ========== ENCABEZADO DE LA APLICACIÓN ========== */}
      <header className="header">
        {/* Lado izquierdo del header: título y estado del servidor */}
        <div className="header-left">
          <h1>Gestor de Base de Datos Firebird</h1>
        </div>

        {/* Lado derecho del header: botones */}
        <div className="header-right">
          {/* Botón para cambiar el tema */}
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={isDarkMode ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            {isDarkMode ? <span className="sun-icon"></span> : <span className="moon-icon"></span>}
          </button>

          {/* Botón para crear una nueva conexión */}
          <button
            className="new-connection-btn"
            onClick={() => setShowConnectionModal(true)}
          >
            + Nueva Conexión
          </button>
        </div>
      </header>

      {/* ========== CONTENIDO PRINCIPAL DE LA APLICACIÓN ========== */}
      <div className="app-content">
        {/* ========== SIDEBAR CON CONEXIONES Y ESTRUCTURA DE BD ========== */}
        <DatabaseSidebar
          ref={sidebarRef}
          onConnectionSelect={handleConnectionSelect} // Callback cuando se selecciona una conexión
          onTableSelect={handleTableSelect} // Callback cuando se selecciona una tabla
          onObjectSelect={handleObjectSelect} // Callback cuando se selecciona un objeto
          onAddConnection={() => setShowConnectionModal(true)} // <-- PASA LA FUNCIÓN
          onViewChange={setActiveView} // Callback para cambiar la vista
          onCreateTable={handleCreateTable} // Callback para crear tabla
          onCreateView={handleCreateView} // Callback para crear vista
          onViewDDL={handleViewDDL} // Callback para ver DDL
          onModifyDDL={handleModifyDDL} // Callback para modificar DDL
          onViewTable={handleViewTable} // Callback para ver tabla
        />

        {/* ========== ÁREA PRINCIPAL DE CONTENIDO ========== */}
        <main className="main-content">
          {/* ========== PESTAÑAS DE NAVEGACIÓN ========== */}
          <NavigationTabs
            activeView={activeView} // Vista actualmente activa
            onViewChange={setActiveView} // Función para cambiar de vista
            hasConnection={!!selectedConnection} // Si hay una conexión seleccionada
            hasTable={!!selectedTable} // Si hay una tabla seleccionada
            hasObject={!!selectedObjectName} // Si hay un objeto seleccionado
          />

          {/* ========== CONTENIDO SEGÚN LA VISTA ACTIVA ========== */}
          {activeView === 'query' ? (
            <QueryEditor
              connectionId={selectedConnection}
              connectionName={connections.find(conn => conn.id === selectedConnection)?.name}
              initialQuery={initialQuery}
              onQueryExecuted={(result) => console.log('Query executed:', result)}
            />
          ) : activeView === 'table' ? (
            // Vista de detalles de tabla
            <TableDetails
              connectionId={selectedConnection}
              tableName={selectedTable}
              schemaName={selectedSchema}
            />
          ) : activeView === 'object' ? (
            // Vista de DDL de objeto
            <ObjectDDLViewer
              connectionId={selectedConnection}
              objectName={selectedObjectName}
              schemaName={selectedSchema}
              objectType={selectedObjectType!}
            />
          ) : (
            // Vista de bienvenida (por defecto)
            <div className="welcome-message">
              <h2>Bienvenido al Gestor de Base de Datos</h2>
              <p>Selecciona una conexión del sidebar o crea una nueva para comenzar.</p>
              <div className="welcome-actions">
                {/* Botón para crear nueva conexión */}
                <button
                  className="connect-btn"
                  onClick={() => setShowConnectionModal(true)}
                >
                  Crear Nueva Conexión
                </button>
                {/* Botón para abrir editor de consultas (solo si hay conexión) */}
                <button
                  className="query-btn"
                  onClick={() => setActiveView('query')}
                  disabled={!selectedConnection} // Deshabilitado si no hay conexión
                >
                  Abrir Editor de Consultas
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========== MODALES ========== */}
      
      {/* Modal de nueva conexión */}
      <ConnectionForm
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        onConnectionSuccess={handleConnectionSuccess}
      />

      {/* Modal de crear tabla */}
      {createTableData && (
        <CreateTableForm
          isOpen={showCreateTableModal}
          onClose={() => {
            setShowCreateTableModal(false);
            setCreateTableData(null);
          }}
          connectionId={createTableData.connectionId}
          schemaName={createTableData.schemaName}
          onSuccess={() => {
            // Recargar el sidebar para mostrar la nueva tabla
            if (sidebarRef.current) {
              sidebarRef.current.loadConnections();
            }
          }}
        />
      )}

      {/* Modal de crear vista */}
      {createViewData && (
        <CreateViewForm
          isOpen={showCreateViewModal}
          onClose={() => {
            setShowCreateViewModal(false);
            setCreateViewData(null);
          }}
          connectionId={createViewData.connectionId}
          schemaName={createViewData.schemaName}
          onSuccess={() => {
            // Recargar el sidebar para mostrar la nueva vista
            if (sidebarRef.current) {
              sidebarRef.current.loadConnections();
            }
          }}
        />
      )}
    </div>
  )
}

// ========== COMPONENTE PRINCIPAL CON PROVIDER ==========
function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

// Exportamos el componente para que pueda ser usado en otros archivos
export default App