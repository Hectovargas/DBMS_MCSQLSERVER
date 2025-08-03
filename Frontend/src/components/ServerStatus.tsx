// ========== IMPORTS ==========
// Importamos React y los hooks necesarios para el componente
import React, { useState, useEffect } from 'react';
// Importamos el servicio para verificar el estado del servidor
import apiService from '../services/apiService';
// Importamos los estilos CSS específicos para este componente
import './ServerStatus.css';

// ========== COMPONENTE PRINCIPAL ==========
const ServerStatus: React.FC = () => {
  // ========== ESTADOS DEL COMPONENTE ==========
  
  // Estado para almacenar el estado actual del servidor
  // Puede ser: 'online', 'offline', o 'checking'
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  
  // Estado para almacenar la fecha/hora de la última verificación
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  // ========== FUNCIONES MANEJADORAS ==========
  
  // Función para verificar el estado de salud del servidor backend
  const checkServerHealth = async () => {
    // Indicamos que estamos verificando
    setServerStatus('checking');
    
    try {
      // Llamamos a la API para verificar el estado del servidor
      const result = await apiService.checkServerHealth();
      
      // Si recibimos un mensaje, el servidor está online
      if (result.message) {
        setServerStatus('online');
      } else {
        setServerStatus('offline');
      }
    } catch (error) {
      // Si hay un error de red, el servidor está offline
      setServerStatus('offline');
    }
    
    // Guardamos la fecha/hora de la verificación
    setLastCheck(new Date());
  };

  // ========== EFECTO PARA VERIFICACIÓN AUTOMÁTICA ==========
  // useEffect se ejecuta al montar el componente
  useEffect(() => {
    // Verificamos el estado del servidor inmediatamente
    checkServerHealth();
    
    // Configuramos un intervalo para verificar cada 30 segundos
    const interval = setInterval(checkServerHealth, 30000);
    
    // Función de limpieza que se ejecuta al desmontar el componente
    return () => clearInterval(interval);
  }, []); // Array vacío significa que solo se ejecuta al montar

  // ========== FUNCIONES AUXILIARES ==========
  
  // Función para obtener el icono apropiado según el estado del servidor
  const getStatusIcon = () => {
    switch (serverStatus) {
      case 'online':
        return '��'; // Círculo verde para online
      case 'offline':
        return '🔴'; // Círculo rojo para offline
      case 'checking':
        return '🟡'; // Círculo amarillo para verificando
      default:
        return '⚪'; // Círculo blanco para estado desconocido
    }
  };

  // Función para obtener el texto descriptivo del estado
  const getStatusText = () => {
    switch (serverStatus) {
      case 'online':
        return 'Servidor Online';
      case 'offline':
        return 'Servidor Offline';
      case 'checking':
        return 'Verificando...';
      default:
        return 'Desconocido';
    }
  };

  // Función para obtener la clase CSS apropiada según el estado
  const getStatusClass = () => {
    switch (serverStatus) {
      case 'online':
        return 'status-online'; // Clase para estado online
      case 'offline':
        return 'status-offline'; // Clase para estado offline
      case 'checking':
        return 'status-checking'; // Clase para estado verificando
      default:
        return ''; // Sin clase especial
    }
  };

  // ========== RENDERIZADO DEL COMPONENTE ==========
  return (
    // Contenedor principal del indicador de estado del servidor
    <div className="server-status">
      {/* ========== INDICADOR DE ESTADO ========== */}
      <div className={`status-indicator ${getStatusClass()}`}>
        {/* Icono del estado (círculo de color) */}
        <span className="status-icon">{getStatusIcon()}</span>
        {/* Texto descriptivo del estado */}
        <span className="status-text">{getStatusText()}</span>
      </div>
      
      {/* ========== INFORMACIÓN DE ÚLTIMA VERIFICACIÓN ========== */}
      {lastCheck && (
        <div className="last-check">
          Última verificación: {lastCheck.toLocaleTimeString()}
        </div>
      )}
      
      {/* ========== BOTÓN DE VERIFICACIÓN MANUAL ========== */}
      <button 
        className="refresh-status-btn"
        onClick={checkServerHealth} // Verifica el estado al hacer clic
        disabled={serverStatus === 'checking'} // Deshabilitado mientras verifica
      >
        🔄
      </button>
    </div>
  );
};

// Exportamos el componente para que pueda ser usado en otros archivos
export default ServerStatus;