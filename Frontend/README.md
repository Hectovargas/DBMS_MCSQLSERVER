# Gestor de Base de Datos Firebird - Frontend

Una aplicación web moderna para gestionar y consultar bases de datos Firebird con una interfaz intuitiva y funcional.

## Características

- **Conexión a Firebird**: Conecta fácilmente a bases de datos Firebird
- **Editor de Consultas**: Ejecuta consultas SQL con sintaxis highlighting
- **Explorador de Esquemas**: Navega por esquemas, tablas y columnas
- **Gestión de Conexiones**: Guarda y gestiona múltiples conexiones
- **Interfaz Moderna**: Diseño responsive y intuitivo
- **Tema Oscuro/Claro**: Soporte para múltiples temas

## Tecnologías Utilizadas

- **React 18** con TypeScript
- **Vite** para el bundling y desarrollo
- **CSS Modules** para estilos modulares
- **Context API** para gestión de estado
- **Fetch API** para comunicación con el backend

## Instalación

1. **Clona el repositorio**:
   ```bash
   git clone <url-del-repositorio>
   cd Frontend
   ```

2. **Instala las dependencias**:
   ```bash
   npm install
   ```

3. **Inicia el servidor de desarrollo**:
   ```bash
   npm run dev
   ```

4. **Abre tu navegador** en `http://localhost:5173`

## Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Previsualiza la build de producción
- `npm run lint` - Ejecuta el linter

## Configuración de Conexión

Para conectarte a una base de datos Firebird:

1. **Host**: Dirección del servidor Firebird (ej: localhost)
2. **Base de Datos**: Ruta completa al archivo .fdb (ej: /path/to/database.fdb)
3. **Usuario**: Usuario de Firebird (por defecto: SYSDBA)
4. **Contraseña**: Contraseña del usuario (por defecto: masterkey)
5. **Puerto**: Puerto de Firebird (por defecto: 3050)

## Estructura del Proyecto

```
Frontend/
├── src/
│   ├── components/          # Componentes React
│   │   ├── ConnectionForm.tsx
│   │   ├── DatabaseSidebar.tsx
│   │   ├── NavigationTabs.tsx
│   │   ├── QueryEditor.tsx
│   │   └── TableDetails.tsx
│   ├── contexts/           # Contextos de React
│   │   └── ThemeContext.tsx
│   ├── services/           # Servicios de API
│   │   └── apiService.ts
│   ├── App.tsx            # Componente principal
│   └── main.tsx           # Punto de entrada
├── public/                # Archivos estáticos
└── package.json           # Dependencias y scripts
```

## Componentes Principales

### ConnectionForm
Formulario para crear y probar conexiones a bases de datos Firebird.

### DatabaseSidebar
Explorador de conexiones, esquemas y tablas con navegación jerárquica.

### QueryEditor
Editor de consultas SQL con resaltado de sintaxis y ejecución de queries.

### TableDetails
Visualización detallada de la estructura de tablas y sus columnas.

## API Integration

El frontend se comunica con el backend a través de la API REST:

- `POST /api/database/test` - Probar conexión
- `POST /api/database/add` - Agregar conexión
- `GET /api/database/all` - Obtener todas las conexiones
- `POST /api/database/:id/connect` - Conectar a base de datos
- `POST /api/database/:id/query` - Ejecutar consulta SQL

## Temas

La aplicación soporta múltiples temas:

- **Claro**: Tema por defecto con colores claros
- **Oscuro**: Tema oscuro para mejor experiencia visual

Los temas se gestionan a través del `ThemeContext` y se pueden cambiar dinámicamente.

## Desarrollo

### Agregar Nuevos Componentes

1. Crea el archivo en `src/components/`
2. Exporta el componente como default
3. Importa y usa en `App.tsx`

### Modificar Estilos

Los estilos están organizados en archivos CSS separados para cada componente:

- `ComponentName.css` - Estilos específicos del componente
- `index.css` - Estilos globales

### Agregar Nuevas Funcionalidades

1. **Servicios**: Agrega métodos en `apiService.ts`
2. **Interfaces**: Define tipos en el archivo de servicio correspondiente
3. **Componentes**: Crea nuevos componentes en `src/components/`

## Troubleshooting

### Problemas Comunes

1. **Error de conexión al backend**:
   - Verifica que el backend esté ejecutándose en `http://localhost:3001`
   - Revisa la consola del navegador para errores de red

2. **Error de CORS**:
   - Asegúrate de que el backend tenga CORS configurado correctamente

3. **Problemas con Firebird**:
   - Verifica que el servidor Firebird esté ejecutándose
   - Confirma las credenciales y la ruta de la base de datos

### Debugging

- Usa las herramientas de desarrollador del navegador
- Revisa la consola para errores de JavaScript
- Verifica la pestaña Network para problemas de API

## Contribución

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.
