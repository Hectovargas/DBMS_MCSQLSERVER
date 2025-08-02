import { useState } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import Sidebar from './components/Sidebar'
import './App.css'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <ThemeProvider>
      <div className="app">

        <header className="header">
          <button
            className="menu-btn"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <h1>Gestor de Base de Datos</h1>
        </header>


        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(false)}
        />

        <main className="main-content">

        </main>
      </div>
    </ThemeProvider>
  )
}

export default App