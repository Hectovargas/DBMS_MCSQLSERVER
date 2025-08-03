# Gestor de Base de Datos SQL Server - Frontend

Una aplicación web moderna para gestionar y consultar bases de datos SQL Server con una interfaz intuitiva y funcional.

## 🚀 Características

### 🔌 Gestión de Conexiones
- **Prueba de conexiones**: Verifica la conectividad antes de agregar una conexión
- **Múltiples conexiones**: Gestiona múltiples conexiones a diferentes servidores
- **Estado de conexión**: Visualiza el estado activo/inactivo de cada conexión
- **Desconexión**: Cierra conexiones de forma segura

### 🔍 Editor de Consultas SQL
- **Editor de texto**: Interfaz intuitiva para escribir consultas SQL
- **Ejecución rápida**: Usa Ctrl+Enter para ejecutar consultas
- **Resultados tabulares**: Visualiza resultados en formato de tabla
- **Información de ejecución**: Tiempo de ejecución y filas afectadas
- **Manejo de errores**: Mensajes de error detallados con códigos y líneas

### 📊 Explorador de Base de Datos
- **Navegación jerárquica**: Servidores → Esquemas → Tablas
- **Información detallada**: Muestra metadatos de tablas y columnas
- **Propiedades de columnas**: Tipo de datos, nulabilidad, claves, etc.
- **Scripts generados**: Genera automáticamente consultas SELECT y CREATE TABLE

### 🏗️ Detalles de Tablas
- **Vista de columnas**: Información completa de la estructura de la tabla
- **Generación de consultas**: Scripts SQL sugeridos para consultar datos
- **Estructura de tabla**: Script CREATE TABLE para recrear la tabla
- **Resumen estadístico**: Conteo de columnas, claves primarias, etc.

### 🎨 Interfaz Moderna
- **Tema adaptable**: Soporte para modo claro y oscuro
- **Navegación por pestañas**: Cambio fácil entre diferentes vistas
- **Diseño responsivo**: Funciona en dispositivos móviles y de escritorio
- **Indicadores de estado**: Estado del servidor backend en tiempo real

## 🛠️ Tecnologías Utilizadas

- **React 18**: Framework de interfaz de usuario
- **TypeScript**: Tipado estático para mayor robustez
- **CSS Variables**: Sistema de temas personalizable
- **Fetch API**: Comunicación con el backend
- **Vite**: Herramienta de construcción rápida

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── ConnectionForm.tsx      # Formulario de conexión
│   ├── DatabaseSidebar.tsx     # Explorador de base de datos
│   ├── QueryEditor.tsx         # Editor de consultas SQL
│   ├── TableDetails.tsx        # Detalles de tablas
│   ├── NavigationTabs.tsx      # Navegación entre vistas
│   ├── ServerStatus.tsx        # Estado del servidor
│   └── *.css                   # Estilos de componentes
├── services/
│   └── apiService.ts           # Servicio de comunicación con API
├── contexts/
│   └── ThemeContext.tsx        # Contexto de tema
└── App.tsx                     # Componente principal
```

## 🚀 Instalación y Uso

### Prerrequisitos
- Node.js 16+ 
- Backend del gestor de base de datos ejecutándose en puerto 3001

### Instalación
```bash
cd Frontend
npm install
```

### Desarrollo
```bash
npm run dev
```

### Construcción
```bash
npm run build
```

## 🔧 Configuración

### Variables de Entorno
El frontend se conecta por defecto al backend en `http://localhost:3001`. Para cambiar esto, modifica la constante `API_BASE` en `src/services/apiService.ts`.

### Temas
El sistema de temas utiliza CSS variables que se pueden personalizar en `src/index.css`.

## 📖 Guía de Uso

### 1. Crear una Conexión
1. Haz clic en "+ Nueva Conexión" en el header
2. Completa los campos requeridos (servidor, base de datos, credenciales)
3. Usa "Probar Conexión" para verificar la conectividad
4. Haz clic en "Agregar Conexión" para guardar

### 2. Ejecutar Consultas
1. Selecciona una conexión del sidebar
2. Navega a "Editor de Consultas"
3. Escribe tu consulta SQL
4. Presiona Ctrl+Enter o haz clic en "Ejecutar"

### 3. Explorar Estructura
1. Selecciona una conexión del sidebar
2. Navega por esquemas y tablas
3. Haz clic en una tabla para ver sus detalles
4. Usa las pestañas para ver columnas, datos y estructura

### 4. Generar Scripts
1. Selecciona una tabla en el sidebar
2. Ve a la pestaña "Datos" para obtener consultas SELECT
3. Ve a la pestaña "Estructura" para obtener CREATE TABLE
4. Usa los botones "Copiar" para copiar los scripts

## 🎯 Funcionalidades Avanzadas

### Atajos de Teclado
- **Ctrl+Enter**: Ejecutar consulta en el editor
- **Ctrl+C**: Copiar scripts generados

### Características de Seguridad
- Validación de entrada en formularios
- Manejo seguro de credenciales
- Verificación de conectividad antes de operaciones

### Optimizaciones
- Carga lazy de datos de esquemas y tablas
- Verificación periódica del estado del servidor
- Caché de conexiones activas

## 🐛 Solución de Problemas

### Error de Conexión
- Verifica que el backend esté ejecutándose en el puerto 3001
- Confirma que las credenciales sean correctas
- Revisa el estado del servidor en el header

### Problemas de Rendimiento
- Usa consultas con LIMIT para tablas grandes
- Cierra conexiones no utilizadas
- Verifica la conectividad de red

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o preguntas, contacta al equipo de desarrollo o crea un issue en el repositorio.
