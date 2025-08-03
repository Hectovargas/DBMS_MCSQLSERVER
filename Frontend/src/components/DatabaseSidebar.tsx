// Importamos React y los hooks que necesitamos
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
// Importamos el servicio para hacer llamadas a la API
import apiService from '../services/apiService';
// Importamos los tipos TypeScript para tener tipado fuerte
import type { DatabaseConnection, Schema, Table } from '../services/apiService';
// Importamos los estilos CSS específicos para este componente
import './DatabaseSidebar.css';

// Definimos la interfaz TypeScript para las props que recibe el componente
// El '?' indica que estas propiedades son opcionales
interface DatabaseSidebarProps {
  onConnectionSelect?: (connectionId: string) => void;  // Callback cuando se selecciona una conexión
  onTableSelect?: (tableName: string, schemaName: string) => void;  // Callback cuando se selecciona una tabla
  onAddConnection?: () => void; // <-- NUEVA PROP
}

// Definimos la interfaz para los métodos que expondremos
export interface DatabaseSidebarRef {
  loadConnections: () => Promise<void>;
}

// Definimos el componente funcional con tipado TypeScript usando forwardRef
const DatabaseSidebar = forwardRef<DatabaseSidebarRef, DatabaseSidebarProps>(({ 
  onConnectionSelect, 
  onTableSelect, 
  onAddConnection, // <-- NUEVA PROP
}, ref) => {
  
  // ========== ESTADOS DEL COMPONENTE ==========
  
  // Estado para almacenar la lista de conexiones de base de datos
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  
  // Estado para rastrear cuál conexión está seleccionada actualmente
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  
  // Estado booleano para mostrar/ocultar indicador de carga general
  const [loading, setLoading] = useState(false);

  const [showschemasdropdown, setShowschemasdropdown] = useState<Set<string>>(new Set());
  
  // ========== ESTADOS PARA CONTROLAR LA EXPANSIÓN DE ELEMENTOS ==========
  
  // Set para rastrear qué conexiones y esquemas están expandidos
  // Usamos Set porque es eficiente para verificar si un elemento existe
  const [expandedConnections, setExpandedConnections] = useState<Set<string>>(new Set());
  
  // Objeto que mapea connectionId -> array de esquemas
  // Solo cargamos esquemas cuando el usuario expande una conexión
  const [connectionSchemas, setConnectionSchemas] = useState<Record<string, Schema[]>>({});
  
  // Objeto que mapea "connectionId-schemaName" -> array de tablas
  // Solo cargamos tablas cuando el usuario expande un esquema
  const [schemaTables, setSchemaTables] = useState<Record<string, Table[]>>({});
  
  // Sets para rastrear qué elementos están cargando actualmente
  const [loadingSchemas, setLoadingSchemas] = useState<Set<string>>(new Set());
  const [loadingTables, setLoadingTables] = useState<Set<string>>(new Set());

  // ========== EFECTO PARA CARGA INICIAL ==========
  
  // useEffect se ejecuta después del primer renderizado
  // El array vacío [] significa que solo se ejecuta una vez (al montar el componente)
  useEffect(() => {
    loadConnections();
  }, []);

  // ========== FUNCIONES PARA CARGAR DATOS ==========

  // Función asíncrona para cargar todas las conexiones desde la API
  const loadConnections = async () => {
    try {
      setLoading(true);  // Activamos el indicador de carga
      const result = await apiService.getAllConnections();  // Llamada a la API
      
      // Verificamos si la respuesta fue exitosa
      if (result.success) {
        // Actualizamos el estado con las conexiones recibidas
        // Si result.connections es undefined, usamos array vacío
        setConnections(result.connections || []);
      }
    } catch (error) {
      // Manejo de errores - mostramos en consola
      console.error('Error al cargar conexiones:', error);
    } finally {
      // finally se ejecuta siempre, haya error o no
      setLoading(false);  // Desactivamos el indicador de carga
    }
  };

  // Exponemos el método loadConnections a través de useImperativeHandle
  useImperativeHandle(ref, () => ({
    loadConnections
  }));

  const toggleSchemasDropdown = async (connectionId: string) => {
    const newdropdown = new Set(showschemasdropdown);
    if(newdropdown.has(connectionId)){
      newdropdown.delete(connectionId);
    } else {
      newdropdown.add(connectionId);
    }
    setShowschemasdropdown(newdropdown);

    if(!connectionSchemas[connectionId]){
      await loadSchemas(connectionId);
    }
  }

  // Función para expandir/contraer una conexión
  const toggleConnection = async (connectionId: string) => {
    // Creamos una nueva copia del Set para no mutar el estado directamente
    const newExpanded = new Set(expandedConnections);
    
    if (newExpanded.has(connectionId)) {
      // Si ya está expandida, la contraemos
      newExpanded.delete(connectionId);
      setExpandedConnections(newExpanded);
    } else {
      // Si no está expandida, la expandimos
      newExpanded.add(connectionId);
      setExpandedConnections(newExpanded);
      
      // Si no hemos cargado los esquemas de esta conexión, los cargamos
      if (!connectionSchemas[connectionId]) {
        await loadSchemas(connectionId);
      }
    }
  };

  // Función para seleccionar una conexión
  const selectConnection = async (connectionId: string) => {
    try {
      console.log('Intentando conectar a la base de datos:', connectionId);
      
      // Llamada a la API para conectar a la base de datos
      const result = await apiService.connectToDatabase(connectionId);
      
      console.log('Respuesta del servidor:', result);
      
      if (result.success) {
        console.log('Conexión exitosa');
        // Actualizamos el estado de conexión seleccionada
        setSelectedConnection(connectionId);
        
        // Si existe el callback, lo ejecutamos
        if (onConnectionSelect) {
          onConnectionSelect(connectionId);
        }
        
        // Recargamos las conexiones para actualizar el estado
        await loadConnections();
             } else {
         console.error('Error en la respuesta del servidor:', result);
         console.error('Detalles del error:', result.error);
         console.error('Mensaje del error:', result.message);
         // Aquí podrías mostrar un mensaje de error al usuario
         const errorMessage = result.error?.message || result.message || 'Error desconocido';
         alert(`Error al conectar: ${errorMessage}`);
       }
    } catch (error) {
      console.error('Error al conectar a la base de datos:', error);
      // Aquí podrías mostrar un mensaje de error al usuario
      alert(`Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  // Función para cargar esquemas de una conexión específica
  const loadSchemas = async (connectionId: string) => {
    try {
      // Agregamos este connectionId al set de "cargando esquemas"
      setLoadingSchemas(prev => new Set(prev).add(connectionId));
      
      // Llamada a la API para obtener esquemas
      const result = await apiService.getSchemas(connectionId);
      
      if (result.success) {
        // Actualizamos el estado con los esquemas recibidos
        // Usamos spread operator para no mutar el objeto existente
        setConnectionSchemas(prev => ({
          ...prev,
          [connectionId]: result.data || []
        }));
      }
    } catch (error) {
      console.error('Error al cargar esquemas:', error);
    } finally {
      // Removemos este connectionId del set de "cargando esquemas"
      setLoadingSchemas(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        return newSet;
      });
    }
  };

  // Función para expandir/contraer un esquema
  const toggleSchema = async (connectionId: string, schemaName: string) => {
    // Creamos una clave única combinando connectionId y schemaName
    const schemaKey = `${connectionId}-${schemaName}`;
    const newExpanded = new Set(expandedConnections);
    
    if (newExpanded.has(schemaKey)) {
      // Si ya está expandido, lo contraemos
      newExpanded.delete(schemaKey);
      setExpandedConnections(newExpanded);
    } else {
      // Si no está expandido, lo expandimos
      newExpanded.add(schemaKey);
      setExpandedConnections(newExpanded);
      
      // Si no hemos cargado las tablas de este esquema, las cargamos
      if (!schemaTables[schemaKey]) {
        await loadTables(connectionId, schemaName);
      }
    }
  };

  // Función para cargar tablas de un esquema específico
  const loadTables = async (connectionId: string, schemaName: string) => {
    const schemaKey = `${connectionId}-${schemaName}`;
    try {
      // Agregamos esta clave al set de "cargando tablas"
      setLoadingTables(prev => new Set(prev).add(schemaKey));
      
      // Llamada a la API para obtener tablas
      const result = await apiService.getTables(connectionId, schemaName);
      
      if (result.success) {
        // Actualizamos el estado con las tablas recibidas
        setSchemaTables(prev => ({
          ...prev,
          [schemaKey]: result.data || []
        }));
      }
    } catch (error) {
      console.error('Error al cargar tablas:', error);
    } finally {
      // Removemos esta clave del set de "cargando tablas"
      setLoadingTables(prev => {
        const newSet = new Set(prev);
        newSet.delete(schemaKey);
        return newSet;
      });
    }
  };

  // Función para desconectar una base de datos
  const disconnectDatabase = async (connectionId: string) => {
    try {
      // Llamada a la API para desconectar
      const result = await apiService.disconnectFromDatabase(connectionId);
      
      if (result.success) {
        // Recargamos la lista de conexiones
        await loadConnections();
        
        // Limpiamos todos los datos relacionados con esta conexión
        
        // Eliminamos los esquemas de esta conexión
        setConnectionSchemas(prev => {
          const newState = { ...prev };
          delete newState[connectionId];
          return newState;
        });
        
        // Eliminamos todas las tablas que pertenecen a esta conexión
        setSchemaTables(prev => {
          const newState = { ...prev };
          Object.keys(newState).forEach(key => {
            // Si la clave empieza con el connectionId, la eliminamos
            if (key.startsWith(`${connectionId}-`)) {
              delete newState[key];
            }
          });
          return newState;
        });
        
        // Limpiamos el estado de expansión
        setExpandedConnections(prev => {
          const newSet = new Set(prev);
          newSet.delete(connectionId);
          // También eliminamos esquemas expandidos de esta conexión
          Object.keys(schemaTables).forEach(key => {
            if (key.startsWith(`${connectionId}-`)) {
              newSet.delete(key);
            }
          });
          return newSet;
        });
        setShowschemasdropdown(prev => {
          const newSet = new Set(prev);
          newSet.delete(connectionId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error al desconectar:', error);
    }
  };

  const closeAllDropdowns = () => {
    setShowschemasdropdown(new Set());
  };

  // Función para eliminar una conexión
  const deleteConnection = async (connectionId: string) => {
    try {
      console.log('Eliminando conexión:', connectionId);
      
      // Llamada a la API para eliminar la conexión
      const result = await apiService.removeConnection(connectionId);
      
      console.log('Respuesta del servidor:', result);
      
      if (result.success) {
        console.log('Conexión eliminada exitosamente');
        
        // Limpiamos todos los datos relacionados con esta conexión
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
          Object.keys(schemaTables).forEach(key => {
            if (key.startsWith(`${connectionId}-`)) {
              newSet.delete(key);
            }
          });
          return newSet;
        });
        setShowschemasdropdown(prev => {
          const newSet = new Set(prev);
          newSet.delete(connectionId);
          return newSet;
        });
        // Recargamos la lista de conexiones
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
    <div className="database-sidebar">
      
      {/* Encabezado de la barra lateral */}
      <div className="sidebar-header">
        <h3>Conexiones de Base de Datos</h3>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button 
            className="refresh-btn"
            onClick={loadConnections}  // Al hacer clic, recarga las conexiones
            disabled={loading}         // Deshabilitado mientras está cargando
          >
            🔄  {/* Emoji de actualizar */}
          </button>
          <button 
            className="refresh-btn"
            onClick={async () => {
              try {
                console.log('Probando conexión al servidor...');
                const result = await apiService.checkServerHealth();
                console.log('Estado del servidor:', result);
                alert(`Servidor: ${result.status || 'Desconocido'}`);
              } catch (error) {
                console.error('Error al conectar con el servidor:', error);
                alert('Error al conectar con el servidor');
              }
            }}
          >
            🏥  {/* Emoji de hospital para health check */}
          </button>
          <button 
            className="refresh-btn"
            onClick={() => onAddConnection && onAddConnection()}
          >
            ➕  {/* Emoji de agregar */}
          </button>
        </div>
      </div>

      {/* Renderizado condicional: solo muestra "Cargando..." si loading es true */}
      {loading && <div className="loading">Cargando...</div>}

      {/* Lista de conexiones */}
      <div className="connections-list">
        {/* map() crea un elemento para cada conexión en el array */}
        {connections.map((connection) => {
          // Variables para facilitar la lectura del código
          const isExpanded = expandedConnections.has(connection.id);
          const schemas = connectionSchemas[connection.id] || [];
          const isLoadingSchemas = loadingSchemas.has(connection.id);
          
          return (
            <div key={connection.id} className="connection-item">
              
              {/* Encabezado de cada conexión (clickeable para expandir/contraer) */}
              <div 
                className="connection-header"
                onClick={() => toggleConnection(connection.id)}
              >
                {/* Icono de expansión que cambia según el estado */}
                <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                  {isExpanded ? '▼' : '▶'}
                </span>
                <span className="connection-name">{connection.name}</span>
                {/* Indicador visual del estado de conexión */}
                <span className="connection-status">
                  {connection.isActive ? '🟢' : '🔴'}
                </span>
              </div>
              
              {/* Contenido expandible: solo se muestra si isExpanded es true */}
              {isExpanded && (
                <div className="connection-content">
                  
                  {/* Detalles de la conexión */}
                  <div className="connection-details">
                    <div className="detail-item">
                      <strong>Servidor:</strong> {connection.server}
                    </div>
                    <div className="detail-item">
                      <strong>Base de datos:</strong> {connection.database}
                    </div>
                    {/* Renderizado condicional: solo muestra si lastConnected existe */}
                    {connection.lastConnected && (
                      <div className="detail-item">
                        <strong>Última conexión:</strong> {new Date(connection.lastConnected).toLocaleString()}
                      </div>
                    )}
                                         {/* Botones de acción */}
                     <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                       {/* Botón condicional: Conectar si no está activa, Desconectar si está activa */}
                       {connection.isActive ? (
                         <button 
                           className="disconnect-btn"
                           onClick={(e) => {
                             e.stopPropagation();  // Evita que se propague el evento al padre
                             disconnectDatabase(connection.id);
                           }}
                         >
                           Desconectar
                         </button>
                       ) : (
                         <button 
                           className="connect-btn"
                           onClick={(e) => {
                             e.stopPropagation();  // Evita que se propague el evento al padre
                             selectConnection(connection.id);
                           }}
                         >
                           Conectar
                         </button>
                       )}
                       
                       {/* Botón de eliminar conexión */}
                       <button 
                         className="delete-btn"
                         onClick={(e) => {
                           e.stopPropagation();  // Evita que se propague el evento al padre
                           if (confirm(`¿Estás seguro de que quieres eliminar la conexión "${connection.name}"?`)) {
                             deleteConnection(connection.id);
                           }
                         }}
                       >
                         🗑️ Eliminar
                       </button>
                     </div>
                  </div>
                  
                  <div className="schemas-section">
  {/* HEADER CLICKEABLE para abrir/cerrar dropdown */}
  <div 
    className="section-header clickeable-header"
    onClick={(e) => {
      e.stopPropagation();
      toggleSchemasDropdown(connection.id);
    }}
  >
    {/* ICONO de expansión para el dropdown */}
    <span className={`expand-icon ${showschemasdropdown.has(connection.id) ? 'expanded' : ''}`}>
      {showschemasdropdown.has(connection.id) ? '▼' : '▶'}
    </span>
    
    <span className="section-title">Esquemas</span>
    
    {/* CONTADOR de esquemas (opcional) */}
    <span className="schema-count">({schemas.length})</span>
    
    {/* INDICADOR de carga */}
    {isLoadingSchemas && <span className="loading-indicator">⏳</span>}
  </div>
  
  {/* DROPDOWN CONDICIONAL - solo se muestra si está expandido */}
  {showschemasdropdown.has(connection.id) && (
    <div className="schemas-dropdown">
      {/* LISTA DE ESQUEMAS */}
      {schemas.map((schema) => {
        const schemaKey = `${connection.id}-${schema.schema_name}`;
        const isSchemaExpanded = expandedConnections.has(schemaKey);
        const tables = schemaTables[schemaKey] || [];
        const isLoadingTables = loadingTables.has(schemaKey);
        
        return (
          <div key={schema.schema_id} className="schema-item">
            
            {/* ENCABEZADO del esquema */}
            <div 
              className="schema-header"
              onClick={(e) => {
                e.stopPropagation();
                toggleSchema(connection.id, schema.schema_name);
              }}
            >
              <span className={`expand-icon ${isSchemaExpanded ? 'expanded' : ''}`}>
                {isSchemaExpanded ? '▼' : '▶'}
              </span>
              <span className="schema-name">{schema.schema_name}</span>
              <span className="schema-owner">({schema.principal_name})</span>
            </div>
            
            {/* CONTENIDO expandido del esquema (tablas) */}
            {isSchemaExpanded && (
              <div className="schema-content">
                <div className="section-header">
                  <span className="section-title">Tablas</span>
                  {isLoadingTables && <span className="loading-indicator">⏳</span>}
                </div>
                
                <div className="tables-list">
                  {tables.map((table) => (
                    <div 
                      key={table.table_name} 
                      className="table-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onTableSelect) {
                          onTableSelect(table.table_name, schema.schema_name);
                        }
                      }}
                    >
                      <span className="table-icon">📋</span>
                      <span className="table-name">{table.table_name}</span>
                      <span className="table-date">
                        {new Date(table.modify_date).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      {/* MENSAJE cuando no hay esquemas */}
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

      {/* Mensaje cuando no hay conexiones - renderizado condicional */}
      {connections.length === 0 && !loading && (
        <div className="no-connections">
          <p>No hay conexiones activas</p>
          <p>Conecta a una base de datos para comenzar</p>
        </div>
      )}
    </div>
  );
});

export default DatabaseSidebar;