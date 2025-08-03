// ========== IMPORTS ==========
// Importamos React y el hook useState para manejar el estado del componente
import { useState, useRef } from 'react'
// Importamos el proveedor de tema para manejar el tema claro/oscuro de la aplicación
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
// Importamos todos los componentes que vamos a usar en la aplicación
import DatabaseSidebar from './components/DatabaseSidebar'
import type { DatabaseSidebarRef } from './components/DatabaseSidebar'
import ConnectionForm from './components/ConnectionForm'
import QueryEditor from './components/QueryEditor'
import TableDetails from './components/TableDetails'
import NavigationTabs from './components/NavigationTabs'
import ServerStatus from './components/ServerStatus'
// Importamos los estilos CSS para este componente
import './App.css'

// ========== COMPONENTE PRINCIPAL DE LA APLICACIÓN ==========
function AppContent() {
  // ========== ESTADOS DE LA APLICACIÓN ==========
  
  // Estado para controlar si mostrar el formulario de nueva conexión
  const [showConnectionForm, setShowConnectionForm] = useState(false)
  
  // Estado para almacenar el ID de la conexión seleccionada actualmente
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null)
  
  // Estado para almacenar el nombre de la tabla seleccionada
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  
  // Estado para almacenar el nombre del esquema seleccionado
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null)
  
  // Estado para controlar qué vista está activa: 'welcome', 'query', o 'table'
  const [activeView, setActiveView] = useState<'welcome' | 'query' | 'table'>('welcome')

  // Referencia al sidebar para poder llamar sus métodos
  const sidebarRef = useRef<DatabaseSidebarRef | null>(null)

  // Hook para manejar el tema
  const { isDarkMode, toggleTheme } = useTheme()

  // ========== FUNCIONES MANEJADORAS DE EVENTOS ==========
  
  // Función que se ejecuta cuando se crea exitosamente una nueva conexión
  const handleConnectionSuccess = async () => {
    setShowConnectionForm(false) // Oculta el formulario de conexión
    
    // Recargamos las conexiones en el sidebar inmediatamente
    if (sidebarRef.current) {
      await sidebarRef.current.loadConnections()
    }
  }

  // Función que se ejecuta cuando el usuario selecciona una conexión del sidebar
  const handleConnectionSelect = (connectionId: string) => {
    setSelectedConnection(connectionId) // Guarda la conexión seleccionada
    setActiveView('query') // Cambia a la vista del editor de consultas
  }

  // Función que se ejecuta cuando el usuario selecciona una tabla del sidebar
  const handleTableSelect = (tableName: string, schemaName: string) => {
    setSelectedTable(tableName) // Guarda la tabla seleccionada
    setSelectedSchema(schemaName) // Guarda el esquema seleccionado
    setActiveView('table') // Cambia a la vista de detalles de tabla
  }

  // ========== RENDERIZADO DEL COMPONENTE ==========
  return (
    <div className="app">
      {/* ========== ENCABEZADO DE LA APLICACIÓN ========== */}
      <header className="header">
        {/* Lado izquierdo del header: título y estado del servidor */}
        <div className="header-left">
          <h1>Gestor de Base de Datos Microsoft SQL Server</h1>
          {/* Componente que muestra el estado de conexión con el servidor backend */}
          <ServerStatus />
        </div>
        
        {/* Lado derecho del header: botones */}
        <div className="header-right">
          {/* Botón para cambiar el tema */}
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={isDarkMode ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          
          {/* Botón para crear una nueva conexión */}
          <button
            className="new-connection-btn"
            onClick={() => setShowConnectionForm(true)}
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
          onAddConnection={() => setShowConnectionForm(true)} // <-- PASA LA FUNCIÓN
        />
        
        {/* ========== ÁREA PRINCIPAL DE CONTENIDO ========== */}
        <main className="main-content">
          {/* Renderizado condicional: si se debe mostrar el formulario de conexión */}
          {showConnectionForm ? (
            // Muestra el formulario para crear una nueva conexión
            <ConnectionForm onConnectionSuccess={handleConnectionSuccess} />
          ) : (
            // Si no se muestra el formulario, muestra el contenido normal
            <>
              {/* ========== PESTAÑAS DE NAVEGACIÓN ========== */}
              <NavigationTabs
                activeView={activeView} // Vista actualmente activa
                onViewChange={setActiveView} // Función para cambiar de vista
                hasConnection={!!selectedConnection} // Si hay una conexión seleccionada
                hasTable={!!selectedTable} // Si hay una tabla seleccionada
              />
              
              {/* ========== CONTENIDO SEGÚN LA VISTA ACTIVA ========== */}
              {activeView === 'query' ? (
                // Vista del editor de consultas SQL
                <QueryEditor 
                  connectionId={selectedConnection} // ID de la conexión activa
                  onQueryExecuted={(result) => {
                    console.log('Query executed:', result) // Log del resultado de la consulta
                  }}
                />
              ) : activeView === 'table' ? (
                // Vista de detalles de tabla
                <TableDetails 
                  connectionId={selectedConnection} // ID de la conexión activa
                  tableName={selectedTable} // Nombre de la tabla seleccionada
                  schemaName={selectedSchema} // Nombre del esquema seleccionado
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
                      onClick={() => setShowConnectionForm(true)}
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
            </>
          )}
        </main>
      </div>
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