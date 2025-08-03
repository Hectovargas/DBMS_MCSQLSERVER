// ========== IMPORTS ==========
// Importamos React para crear el componente
import React from 'react';
// Importamos los estilos CSS específicos para este componente
import './NavigationTabs.css';

// ========== INTERFAZ DE PROPS ==========
// Definimos la interfaz TypeScript para las props que recibe el componente
interface NavigationTabsProps {
  activeView: 'welcome' | 'query' | 'table'; // Vista actualmente activa
  onViewChange: (view: 'welcome' | 'query' | 'table') => void; // Función para cambiar de vista
  hasConnection: boolean; // Si hay una conexión de base de datos activa
  hasTable: boolean; // Si hay una tabla seleccionada
}

// ========== COMPONENTE PRINCIPAL ==========
const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeView, // Vista actualmente activa
  onViewChange, // Función para cambiar de vista
  hasConnection, // Si hay conexión activa
  hasTable // Si hay tabla seleccionada
}) => {
  // ========== RENDERIZADO DEL COMPONENTE ==========
  return (
    // Contenedor principal de las pestañas de navegación
    <div className="navigation-tabs">
      {/* ========== PESTAÑA: INICIO ========== */}
      <button
        className={`nav-tab ${activeView === 'welcome' ? 'active' : ''}`} // Clase activa si es la vista actual
        onClick={() => onViewChange('welcome')} // Cambia a la vista de bienvenida
      >
        🏠 Inicio
      </button>
      
      {/* ========== PESTAÑA: EDITOR DE CONSULTAS ========== */}
      <button
        className={`nav-tab ${activeView === 'query' ? 'active' : ''}`} // Clase activa si es la vista actual
        onClick={() => onViewChange('query')} // Cambia a la vista del editor de consultas
        disabled={!hasConnection} // Deshabilitado si no hay conexión activa
      >
        🔍 Editor de Consultas
      </button>
    </div>
  );
};

// Exportamos el componente para que pueda ser usado en otros archivos
export default NavigationTabs;