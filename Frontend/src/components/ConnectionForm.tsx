import React, { useState } from 'react';
import './ConnectionForm.css';

interface ConnectionFormProps {
  onConnectionSuccess: () => void;
}

interface ConnectionData {
  name: string;
  server: string;
  database: string;
  username: string;
  password: string;
  port: number;
}

const ConnectionForm: React.FC<ConnectionFormProps> = ({ onConnectionSuccess }) => {
  const [formData, setFormData] = useState<ConnectionData>({
    name: '',
    server: '',
    database: '',
    username: '',
    password: '',
    port: 1433
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const API_BASE = 'http://localhost:3001/api/database';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value) || 1433 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Conexión establecida exitosamente');
        setFormData({
          name: '',
          server: '',
          database: '',
          username: '',
          password: '',
          port: 1433
        });
        onConnectionSuccess();
      } else {
        setError(data.message || 'Error al conectar');
      }
    } catch (err) {
      setError('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="connection-form-container">
      <h2>Nueva Conexión de Base de Datos</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit} className="connection-form">
        <div className="form-group">
          <label htmlFor="name">Nombre de la Conexión *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            placeholder="Mi Base de Datos"
          />
        </div>

        <div className="form-group">
          <label htmlFor="server">Servidor *</label>
          <input
            type="text"
            id="server"
            name="server"
            value={formData.server}
            onChange={handleInputChange}
            required
            placeholder="localhost o 192.168.1.100"
          />
        </div>

        <div className="form-group">
          <label htmlFor="database">Base de Datos *</label>
          <input
            type="text"
            id="database"
            name="database"
            value={formData.database}
            onChange={handleInputChange}
            required
            placeholder="nombre_base_datos"
          />
        </div>

        <div className="form-group">
          <label htmlFor="username">Usuario *</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            required
            placeholder="usuario"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Contraseña *</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            placeholder="contraseña"
          />
        </div>

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
            placeholder="1433"
          />
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="connect-btn"
            disabled={loading}
          >
            {loading ? 'Conectando...' : 'Conectar'}
          </button>
        </div>
      </form>

      <div className="connection-tips">
        <h4>Consejos de Conexión:</h4>
        <ul>
          <li>Asegúrate de que SQL Server esté ejecutándose</li>
          <li>Verifica que el puerto esté abierto (por defecto 1433)</li>
          <li>Confirma que las credenciales sean correctas</li>
          <li>Para SQL Server Express, usa: <code>localhost\SQLEXPRESS</code></li>
        </ul>
      </div>
    </div>
  );
};

export default ConnectionForm; 