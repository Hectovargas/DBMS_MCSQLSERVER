# Documentación del Backend - Sistema de Gestión de Base de Datos Firebird

## 📋 **Descripción General**
El backend es un sistema de gestión de bases de datos Firebird que proporciona una API REST para operaciones CRUD, generación de DDL, y administración de conexiones.

## 🏗️ **Arquitectura del Sistema**

### **Frontend ↔ Backend ↔ Base de Datos Firebird**
```
Frontend (React) → API REST → DatabaseManager → Firebird Database
```

## 🔌 **1. GESTIÓN DE CONEXIONES**

### **1.1 Test de Conexión**
- **Función**: `testConnection(config)`
- **Propósito**: Verifica si una configuración de base de datos es válida
- **Frontend**: Formulario de nueva conexión (`ConnectionForm.tsx`)
- **Uso**: Antes de guardar una nueva conexión

### **1.2 Agregar Conexión**
- **Función**: `addConection(config)`
- **Propósito**: Crea y guarda una nueva conexión en el sistema
- **Frontend**: Formulario de nueva conexión (`ConnectionForm.tsx`)
- **Uso**: Al crear una nueva conexión desde la interfaz

### **1.3 Conectar a Base de Datos**
- **Función**: `connectToDatabase(connectionId)`
- **Propósito**: Establece conexión activa con la base de datos
- **Frontend**: Sidebar (`DatabaseSidebar.tsx`)
- **Uso**: Al hacer clic en una conexión del sidebar

### **1.4 Desconectar Base de Datos**
- **Función**: `disconnectFromDatabase(connectionId)`
- **Propósito**: Cierra la conexión activa
- **Frontend**: Menú contextual del sidebar
- **Uso**: Al desconectar una conexión

### **1.5 Eliminar Conexión**
- **Función**: `removeConnection(connectionId)`
- **Propósito**: Elimina completamente una conexión del sistema
- **Frontend**: Menú contextual del sidebar
- **Uso**: Al eliminar una conexión

## 📊 **2. OPERACIONES DE TABLAS**

### **2.1 Obtener Esquemas**
- **Función**: `getSchemas(connectionId)`
- **Propósito**: Lista todos los esquemas disponibles
- **Frontend**: Sidebar (`DatabaseSidebar.tsx`)
- **Uso**: Al expandir una conexión en el sidebar

### **2.2 Obtener Tablas**
- **Función**: `getTables(connectionId, schemaName)`
- **Propósito**: Lista todas las tablas de un esquema
- **Frontend**: Sidebar (`DatabaseSidebar.tsx`)
- **Uso**: Al expandir un esquema en el sidebar

### **2.3 Obtener Columnas de Tabla**
- **Función**: `getTablesColumns(connectionId, tableName, schemaName)`
- **Propósito**: Obtiene la estructura completa de una tabla
- **Frontend**: `TableDetails.tsx`, generación de DDL
- **Uso**: Al ver detalles de una tabla o generar DDL

### **2.4 Crear Tabla**
- **Función**: `createTable(params)`
- **Propósito**: Crea una nueva tabla en la base de datos
- **Frontend**: `CreateTableForm.tsx`
- **Uso**: Al crear una tabla desde la interfaz

### **2.5 Verificar Existencia de Tabla**
- **Función**: `checkTableExists(connectionId, schemaName, tableName)`
- **Propósito**: Verifica si una tabla ya existe
- **Frontend**: `CreateTableForm.tsx`
- **Uso**: Validación antes de crear una tabla

## 👁️ **3. OPERACIONES DE VISTAS**

### **3.1 Obtener Vistas**
- **Función**: `getViews(connectionId, schemaName)`
- **Propósito**: Lista todas las vistas de un esquema
- **Frontend**: Sidebar (`DatabaseSidebar.tsx`)
- **Uso**: Al expandir un esquema en el sidebar

### **3.2 Crear Vista**
- **Función**: `createView(params)`
- **Propósito**: Crea una nueva vista en la base de datos
- **Frontend**: `CreateViewForm.tsx`
- **Uso**: Al crear una vista desde la interfaz

### **3.3 Verificar Existencia de Vista**
- **Función**: `checkViewExists(connectionId, schemaName, viewName)`
- **Propósito**: Verifica si una vista ya existe
- **Frontend**: `CreateViewForm.tsx`
- **Uso**: Validación antes de crear una vista

## ⚡ **4. OPERACIONES DE PROCEDIMIENTOS Y FUNCIONES**

### **4.1 Obtener Procedimientos**
- **Función**: `getProcedures(connectionId, schemaName)`
- **Propósito**: Lista todos los procedimientos de un esquema
- **Frontend**: Sidebar (`DatabaseSidebar.tsx`)
- **Uso**: Al expandir un esquema en el sidebar

### **4.2 Obtener Funciones**
- **Función**: `getFunctions(connectionId, schemaName)`
- **Propósito**: Lista todas las funciones de un esquema
- **Frontend**: Sidebar (`DatabaseSidebar.tsx`)
- **Uso**: Al expandir un esquema en el sidebar

## 🔄 **5. OPERACIONES DE TRIGGERS E ÍNDICES**

### **5.1 Obtener Triggers**
- **Función**: `getTriggers(connectionId, schemaName)`
- **Propósito**: Lista todos los triggers de un esquema
- **Frontend**: Sidebar (`DatabaseSidebar.tsx`)
- **Uso**: Al expandir un esquema en el sidebar

### **5.2 Obtener Índices**
- **Función**: `getIndexes(connectionId, schemaName)`
- **Propósito**: Lista todos los índices de un esquema
- **Frontend**: Sidebar (`DatabaseSidebar.tsx`)
- **Uso**: Al expandir un esquema en el sidebar

## 📝 **6. GENERACIÓN DE DDL**

### **6.1 DDL de Tabla**
- **Función**: `generateTableDDL(connectionId, tableName, schemaName)`
- **Propósito**: Genera el código DDL para crear una tabla
- **Frontend**: `TableDetails.tsx`, `ObjectDDLViewer.tsx`
- **Uso**: Al ver el DDL de una tabla o exportarlo

### **6.2 DDL de Vista**
- **Función**: `generateViewDDL(connectionId, viewName, schemaName)`
- **Propósito**: Genera el código DDL para crear una vista
- **Frontend**: `ObjectDDLViewer.tsx`
- **Uso**: Al ver el DDL de una vista

### **6.3 DDL de Función**
- **Función**: `generateFunctionDDL(connectionId, functionName, schemaName)`
- **Propósito**: Genera el código DDL para crear una función
- **Frontend**: `ObjectDDLViewer.tsx`
- **Uso**: Al ver el DDL de una función

### **6.4 DDL de Procedimiento**
- **Función**: `generateProcedureDDL(connectionId, procedureName, schemaName)`
- **Propósito**: Genera el código DDL para crear un procedimiento
- **Frontend**: `ObjectDDLViewer.tsx`
- **Uso**: Al ver el DDL de un procedimiento

### **6.5 DDL de Trigger**
- **Función**: `generateTriggerDDL(connectionId, triggerName, schemaName)`
- **Propósito**: Genera el código DDL para crear un trigger
- **Frontend**: `ObjectDDLViewer.tsx`
- **Uso**: Al ver el DDL de un trigger

### **6.6 DDL de Índice**
- **Función**: `generateIndexDDL(connectionId, indexName, schemaName)`
- **Propósito**: Genera el código DDL para crear un índice
- **Frontend**: `ObjectDDLViewer.tsx`
- **Uso**: Al ver el DDL de un índice

## 🔍 **7. OPERACIONES DE CONSULTA**

### **7.1 Ejecutar Consulta**
- **Función**: `executeQuery(connectionId, query, parameters)`
- **Propósito**: Ejecuta consultas SQL personalizadas
- **Frontend**: `QueryEditor.tsx`
- **Uso**: Editor de consultas principal

### **7.2 Verificar Salud de Conexión**
- **Función**: `checkConnectionHealth(connectionId)`
- **Propósito**: Verifica si una conexión está activa y funcional
- **Frontend**: Interno del backend
- **Uso**: Antes de ejecutar operaciones

## 👥 **8. OPERACIONES DE USUARIOS Y SECUENCIAS**

### **8.1 Obtener Usuarios**
- **Función**: `getUsers(connectionId)`
- **Propósito**: Lista todos los usuarios de la base de datos
- **Frontend**: Sidebar (`DatabaseSidebar.tsx`)
- **Uso**: Al expandir una conexión en el sidebar

### **8.2 Obtener Secuencias**
- **Función**: `getSequences(connectionId)`
- **Propósito**: Lista todas las secuencias de la base de datos
- **Frontend**: Sidebar (`DatabaseSidebar.tsx`)
- **Uso**: Al expandir una conexión en el sidebar

## 🛠️ **9. FUNCIONES AUXILIARES**

### **9.1 Generar ID de Conexión**
- **Función**: `generateConnectionId()`
- **Propósito**: Genera un ID único para cada conexión
- **Frontend**: Interno del backend
- **Uso**: Al crear nuevas conexiones

### **9.2 Formatear Valores por Defecto**
- **Función**: `formatDefaultValue(value, type)`
- **Propósito**: Formatea valores por defecto según el tipo de dato
- **Frontend**: Interno del backend
- **Uso**: Al crear tablas con valores por defecto

### **9.3 Mapear Tipos de Datos Firebird**
- **Función**: `getFirebirdDataType(column)`
- **Propósito**: Convierte códigos numéricos de Firebird a nombres legibles
- **Frontend**: Interno del backend
- **Uso**: Al generar DDL y mostrar información de columnas

## 📁 **10. ESTRUCTURA DE ARCHIVOS**

```
backend/
├── services/
│   └── databaseManager.ts    # Lógica principal del backend
├── controllers/
│   └── databaseController.ts # Controladores de la API REST
├── routers/
│   └── databaseRoutes.ts     # Definición de rutas de la API
└── server.ts                 # Servidor Express principal
```

## 🔄 **11. FLUJO DE DATOS TÍPICO**

### **Ejemplo: Crear una Nueva Tabla**
1. **Frontend**: Usuario llena formulario en `CreateTableForm.tsx`
2. **API Call**: Se envía POST a `/api/database/create-table`
3. **Controller**: `databaseController.createTable()` recibe la petición
4. **Service**: `databaseManager.createTable()` ejecuta la lógica
5. **Database**: Se ejecuta SQL en Firebird
6. **Response**: Se devuelve resultado al frontend
7. **Frontend**: Se actualiza la interfaz según el resultado

## 📊 **12. MANEJO DE ERRORES**

### **Tipos de Respuesta**
- **Success**: Operación completada exitosamente
- **Error**: Error específico con mensaje descriptivo
- **Validation**: Error de validación de datos

### **Estructura de Error**
```typescript
{
  success: false,
  message: 'Descripción del error',
  error: {
    message: 'Mensaje técnico',
    code: 'Código de error',
    details: 'Información adicional'
  }
}
```

## 🚀 **13. CONSIDERACIONES DE RENDIMIENTO**

- **Pool de Conexiones**: Máximo 5 conexiones simultáneas por base de datos
- **Reconexión Automática**: Se intenta reconectar automáticamente si se pierde la conexión
- **Cache de Metadatos**: Se almacenan esquemas y tablas para evitar consultas repetidas
- **Limpieza de Recursos**: Se cierran conexiones automáticamente después de cada operación

## 🔒 **14. SEGURIDAD**

- **Validación de Entrada**: Todas las entradas se validan antes de procesarse
- **Escape de SQL**: Se utilizan parámetros preparados para evitar inyección SQL
- **Autenticación**: Se requieren credenciales válidas para cada conexión
- **Logs de Auditoría**: Se registran todas las operaciones importantes
