import { useState } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import DatabaseSidebar from './components/DatabaseSidebar'
import ConnectionForm from './components/ConnectionForm'
import './App.css'

function App() {
  const [showConnectionForm, setShowConnectionForm] = useState(false)

  const handleConnectionSuccess = () => {
    setShowConnectionForm(false)
  }

  return (
    <ThemeProvider>
      <div className="app">
        <header className="header">
          <h1>Gestor de Base de Datos SQL Server</h1>
          <button
            className="new-connection-btn"
            onClick={() => setShowConnectionForm(true)}
          >
            + Nueva Conexión
          </button>
        </header>

        <div className="app-content">
          <DatabaseSidebar />
          
          <main className="main-content">
            {showConnectionForm ? (
              <ConnectionForm onConnectionSuccess={handleConnectionSuccess} />
            ) : (
              <div className="welcome-message">
                <h2>Bienvenido al Gestor de Base de Datos</h2>
                <p>Selecciona una conexión del sidebar o crea una nueva para comenzar.</p>
                <button
                  className="connect-btn"
                  onClick={() => setShowConnectionForm(true)}
                >
                  Crear Nueva Conexión
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}

export default App