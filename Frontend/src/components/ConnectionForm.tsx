// ========== IMPORTS ==========
// Importamos React y el hook useState para manejar el estado del formulario
import React, { useState, useEffect } from 'react';
// Importamos el servicio para hacer llamadas a la API del backend
import apiService from '../services/apiService';
// Importamos el tipo TypeScript para la configuración de conexión
import type { ConnectionConfig } from '../services/apiService';
// Importamos los estilos CSS específicos para este componente
import './ConnectionForm.css';

// ========== INTERFAZ DE PROPS ==========
// Definimos la interfaz TypeScript para las props que recibe el componente
interface ConnectionFormProps {
  onConnectionSuccess: () => void; // Callback que se ejecuta cuando se crea exitosamente una conexión
  isOpen: boolean; // Controla si el modal está abierto
  onClose: () => void; // Callback para cerrar el modal
}

// ========== COMPONENTE PRINCIPAL ==========
const ConnectionForm: React.FC<ConnectionFormProps> = ({ onConnectionSuccess, isOpen, onClose }) => {
  // ========== ESTADOS DEL FORMULARIO ==========
  
  // Estado para almacenar todos los datos del formulario
  // Usamos el tipo ConnectionConfig para tener tipado fuerte
  const [formData, setFormData] = useState<ConnectionConfig>({
    name: '', // Nombre descriptivo de la conexión
    host: '', // Dirección del servidor Firebird
    database: '', // Nombre de la base de datos
    username: '', // Usuario para autenticación
    password: '', // Contraseña para autenticación
    port: 3050 // Puerto por defecto de Firebird
  });

  // Estado para controlar si el formulario está procesando una acción
  const [loading, setLoading] = useState(false);
  
  // Estado para mostrar mensajes de error
  const [error, setError] = useState<string>('');
  
  // Estado para mostrar mensajes de éxito
  const [success, setSuccess] = useState<string>('');
  
  // Estado para distinguir entre modo de prueba y modo de guardado
  const [testMode, setTestMode] = useState(false);

  // ========== EFECTO PARA LIMPIAR FORMULARIO ==========
  // Limpiamos el formulario cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        host: '',
        database: '',
        username: '',
        password: '',
        port: 3050
      });
      setError('');
      setSuccess('');
      setLoading(false);
      setTestMode(false);
    }
  }, [isOpen]);

  // ========== FUNCIONES MANEJADORAS ==========
  
  // Función que se ejecuta cada vez que el usuario cambia un campo del formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target; // Extraemos el nombre del campo y su valor
    
    // Limpiamos mensajes anteriores cuando el usuario empieza a escribir
    if (error || success) {
      setError('');
      setSuccess('');
    }
    
    // Actualizamos el estado del formulario
    setFormData(prev => ({
      ...prev, // Mantenemos todos los valores anteriores
      [name]: name === 'port' ? parseInt(value) || 3050 : value // Si es el puerto, lo convertimos a número
    }));
  };

  // Función para manejar el cierre del modal
  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  // Función para manejar el clic fuera del modal
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  // Función para probar la conexión antes de guardarla
  const handleTestConnection = async () => {
    // Validación básica: host y base de datos son obligatorios
    if (!formData.host || !formData.database) {
      setError('Host y database son campos requeridos para la prueba');
      return;
    }

    // Preparamos el estado para la prueba
    setLoading(true); // Activamos el indicador de carga
    setError(''); // Limpiamos errores anteriores
    setSuccess(''); // Limpiamos mensajes de éxito anteriores
    setTestMode(true); // Indicamos que estamos en modo de prueba

    try {
      console.log('Iniciando prueba de conexión...');
      
      // Llamamos a la API para probar la conexión
      const result = await apiService.testConnection(formData);
      
      console.log('Resultado de la prueba:', result);
      
      if (result.success) {
                    setSuccess('Prueba de conexión exitosa');
      } else {
        setError(result.message || 'Error en la prueba de conexión');
      }
    } catch (err: any) {
      console.error('Error en prueba de conexión:', err);
      // Manejamos errores de red o del servidor
      setError(err.message || 'Error de conexión al servidor. Verifica que el backend esté ejecutándose.');
    } finally {
      // Siempre desactivamos el indicador de carga
      setLoading(false);
    }
  };

  // Función que se ejecuta cuando se envía el formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevenimos el comportamiento por defecto del formulario
    
    // Validación básica
    if (!formData.name || !formData.host || !formData.database) {
      setError('Nombre, host y base de datos son campos requeridos');
      return;
    }
    
    setLoading(true); // Activamos el indicador de carga
    setError(''); // Limpiamos errores anteriores
    setSuccess(''); // Limpiamos mensajes de éxito anteriores
    setTestMode(false); // Indicamos que no estamos en modo de prueba

    try {
      console.log('Iniciando agregado de conexión...');
      
      // Llamamos a la API para agregar la conexión
      const result = await apiService.addConnection(formData);
      
      console.log('Resultado del agregado:', result);
      
      if (result.success) {
                    setSuccess('Conexión agregada exitosamente');
        // Notificamos al componente padre que la conexión se creó exitosamente
        onConnectionSuccess();
        // Cerramos el modal después de un breve delay para mostrar el mensaje de éxito
        setTimeout(() => {
          onClose();
        }, 1500);
        
      } else {
        setError(result.message || 'Error al agregar la conexión');
      }
    } catch (err: any) {
      console.error('Error al agregar conexión:', err);
      // Manejamos errores de red o del servidor
      setError(err.message || 'Error de conexión al servidor. Verifica que el backend esté ejecutándose.');
    } finally {
      // Siempre desactivamos el indicador de carga
      setLoading(false);
    }
  };

  // ========== RENDERIZADO DEL COMPONENTE ==========
  if (!isOpen) return null;

  return (
    // Overlay del modal
    <div className="modal-overlay" onClick={handleBackdropClick}>
      {/* Contenedor principal del modal */}
      <div className="modal-container">
        {/* Header del modal */}
        <div className="modal-header">
          <h2>Nueva Conexión de Base de Datos Firebird</h2>
          <button 
            className="modal-close-btn" 
            onClick={handleClose}
            disabled={loading}
            title="Cerrar"
          >
            ✕
          </button>
        </div>
        
        {/* ========== MENSAJES DE ESTADO ========== */}
        {/* Mostramos mensaje de error si existe */}
        {error && (
          <div className="error-message">
            <strong><span className="error-icon"></span> Error:</strong> {error}
          </div>
        )}
        {/* Mostramos mensaje de éxito si existe */}
        {success && (
          <div className="success-message">
            <strong><span className="success-icon"></span> Éxito:</strong> {success}
          </div>
        )}

        {/* ========== FORMULARIO PRINCIPAL ========== */}
        <form onSubmit={handleSubmit} className="connection-form">
          {/* ========== CAMPO: NOMBRE DE LA CONEXIÓN ========== */}
          <div className="form-group">
            <label htmlFor="name">Nombre de la Conexión *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="Mi Base de Datos Firebird"
              disabled={loading}
            />
          </div>

          {/* ========== CAMPO: HOST ========== */}
          <div className="form-group">
            <label htmlFor="host">Host *</label>
            <input
              type="text"
              id="host"
              name="host"
              value={formData.host}
              onChange={handleInputChange}
              required
              placeholder="localhost o 192.168.1.100"
              disabled={loading}
            />
          </div>

          {/* ========== CAMPO: BASE DE DATOS ========== */}
          <div className="form-group">
            <label htmlFor="database">Base de Datos *</label>
            <input
              type="text"
              id="database"
              name="database"
              value={formData.database}
              onChange={handleInputChange}
              required
              placeholder="/path/to/database.fdb"
              disabled={loading}
            />
          </div>

          {/* ========== CAMPO: USUARIO ========== */}
          <div className="form-group">
            <label htmlFor="username">Usuario</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="SYSDBA"
              disabled={loading}
            />
          </div>

          {/* ========== CAMPO: CONTRASEÑA ========== */}
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="masterkey"
              disabled={loading}
            />
          </div>

          {/* ========== CAMPO: PUERTO ========== */}
          <div className="form-group">
            <label htmlFor="port">Puerto</label>
            <input
              type="number"
              id="port"
              name="port"
              value={formData.port}
              onChange={handleInputChange}
              min="1"
              max="65535"
              placeholder="3050"
              disabled={loading}
            />
          </div>

          {/* ========== BOTONES DE ACCIÓN ========== */}
          <div className="form-actions">
            {/* Botón para probar la conexión */}
            <button
              type="button"
              className={`test-btn ${loading && testMode ? 'loading' : ''}`}
              onClick={handleTestConnection}
              disabled={loading || !formData.host || !formData.database}
            >
              {loading && testMode ? 'Probando...' : 'Probar Conexión'}
            </button>
            
            {/* Botón para guardar la conexión */}
            <button
              type="submit"
              className={`test-btn ${loading && !testMode ? 'loading' : ''}`}
              disabled={loading || !formData.name || !formData.host || !formData.database}
            >
              {loading && !testMode ? 'Agregando...' : 'Agregar Conexión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConnectionForm;