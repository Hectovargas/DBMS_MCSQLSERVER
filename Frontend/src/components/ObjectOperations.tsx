import React, { useState } from 'react';
import CreateTableForm from './CreateTableForm';
import CreateViewForm from './CreateViewForm';
import DDLViewer from './DDLViewer';
import './ObjectOperations.css';
interface ObjectOperationsProps {
  connectionId: string;
  onRefresh?: () => void;
}
type OperationMode = 'none' | 'create-table' | 'create-view' | 'view-ddl';
interface DDLObject {
  type: 'table' | 'view' | 'function' | 'procedure' | 'trigger' | 'index' | 'sequence';
  name: string;
}
const ObjectOperations: React.FC<ObjectOperationsProps> = ({
  connectionId,
  onRefresh
}) => {
  const [operationMode, setOperationMode] = useState<OperationMode>('none');
  const [ddlObject, setDdlObject] = useState<DDLObject | null>(null);
  const handleSuccess = () => {
    setOperationMode('none');
    onRefresh?.();
  };
  const handleCancel = () => {
    setOperationMode('none');
  };
  const openDDLViewer = (object: DDLObject) => {
    setDdlObject(object);
  };
  const closeDDLViewer = () => {
    setDdlObject(null);
  };
  const renderContent = () => {
    switch (operationMode) {
      case 'create-table':
        return (
          <CreateTableForm
            connectionId={connectionId}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        );
      case 'create-view':
        return (
          <CreateViewForm
            connectionId={connectionId}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        );
      default:
        return (
          <div className="object-operations-main">
            <div className="operations-header">
              <h2>Operaciones sobre Objetos</h2>
              <p>Gestiona tablas, vistas y otros objetos de base de datos</p>
            </div>
            <div className="operations-grid">
              <div className="operation-card">
                <div className="card-icon table-icon-img"></div>
                <h3>Crear Tabla</h3>
                <p>Define la estructura de una nueva tabla con columnas, tipos de datos y restricciones</p>
                <button
                  onClick={() => setOperationMode('create-table')}
                  className="btn btn-primary"
                >
                  Crear Tabla
                </button>
              </div>
              <div className="operation-card">
                <div className="card-icon view-icon-img"></div>
                <h3>Crear Vista</h3>
                <p>Crea una nueva vista basada en una consulta SELECT personalizada</p>
                <button
                  onClick={() => setOperationMode('create-view')}
                  className="btn btn-primary"
                >
                  Crear Vista
                </button>
              </div>
              <div className="operation-card">
                <div className="card-icon search-icon-img"></div>
                <h3>Ver DDL</h3>
                <p>Genera y visualiza el DDL de objetos existentes para modificaciones</p>
                <div className="ddl-options">
                  <button
                    onClick={() => openDDLViewer({ type: 'table', name: 'ejemplo_tabla' })}
                    className="btn btn-secondary btn-sm"
                  >
                    Tabla
                  </button>
                  <button
                    onClick={() => openDDLViewer({ type: 'view', name: 'ejemplo_vista' })}
                    className="btn btn-secondary btn-sm"
                  >
                    Vista
                  </button>
                  <button
                    onClick={() => openDDLViewer({ type: 'function', name: 'ejemplo_funcion' })}
                    className="btn btn-secondary btn-sm"
                  >
                    Función
                  </button>
                </div>
              </div>
              <div className="operation-card">
                <div className="card-icon edit-icon-img"></div>
                <h3>Modificar Objetos</h3>
                <p>Exporta el DDL de objetos existentes para realizar modificaciones</p>
                <div className="modify-options">
                  <p className="info-text">
                    Para modificar un objeto:
                  </p>
                  <ol className="steps-list">
                    <li>Genera el DDL del objeto</li>
                    <li>Modifica el SQL según tus necesidades</li>
                    <li>Ejecuta el SQL modificado</li>
                  </ol>
                </div>
              </div>
            </div>
            <div className="operations-info">
              <h3>Información Importante</h3>
              <div className="info-grid">
                <div className="info-item">
                  <strong>Creación:</strong> Las tablas y vistas se crean directamente en la base de datos
                </div>
                <div className="info-item">
                  <strong>DDL:</strong> Se genera automáticamente desde los metadatos de la base de datos
                </div>
                <div className="info-item">
                  <strong>Modificación:</strong> Exporta el DDL, modifícalo y ejecútalo manualmente
                </div>
                <div className="info-item">
                  <strong>Compatibilidad:</strong> Soporta Firebird y otros motores de base de datos
                </div>
              </div>
            </div>
          </div>
        );
    }
  };
  return (
    <div className="object-operations">
      {renderContent()}
      {ddlObject && (
        <DDLViewer
          connectionId={connectionId}
          objectType={ddlObject.type}
          objectName={ddlObject.name}
          onClose={closeDDLViewer}
        />
      )}
    </div>
  );
};
export default ObjectOperations;