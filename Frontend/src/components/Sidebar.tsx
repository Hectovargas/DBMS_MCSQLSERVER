import React from 'react';
import {useTheme} from '../contexts/ThemeContext';
import './Sidebar.css';

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> =  ({ isOpen, onToggle}) =>{
    const {isDarkMode, toggleTheme} = useTheme();
    
    return (
        <>
        <div className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className = "sidebar-header">
                <h2>DBMS MICROSOFT SQL SERVER</h2>
                <button className = "close-btn" onClick = {onToggle}>
                ✕
                </button>
            </div>
            <nav className = "sidebar-nav">
                <ul>
                    
                </ul>
            </nav>

            <div className="sidebar-footer">
          <button 
            className="theme-toggle"
            onClick={toggleTheme}
          >
            {isDarkMode ? ' Modo Claro' : ' Modo Oscuro'}
          </button>
        </div>
      </div>
      
      {isOpen && <div className="sidebar-overlay" onClick={onToggle} />}
    </>
  );
};

export default Sidebar;