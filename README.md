
# Proyecto 1: Herramienta Administrativa de Base de Datos (Database Management Tool)

## Clase
**Teoría de Base de Datos II**

---

## 1. Descripción General
**Database Management Tool para Firebird** es una aplicación **web full-stack** diseñada para la administración de bases de datos Firebird.  
El proyecto cumple con los requisitos establecidos: **gestión de conexiones, soporte de objetos de base de datos, operaciones de creación y modificación, ejecución de SQL y uso exclusivo de system tables para la obtención de metadata**.  

---

## 2. Definición del Proyecto
La herramienta permite:
- Conexión con cualquier usuario válido de Firebird.  
- Administración de múltiples conexiones a diferentes bases de datos.  
- Interacción con objetos de base de datos vía consultas directas a **system tables (RDB$)**.  
- Administración de los principales objetos de base de datos:  
  - Tablas  
  - Vistas  
  - Paquetes 
  - Procedimientos almacenados  
  - Funciones  
  - Secuencias/Generadores  
  - Triggers 
  - Índices  
  - Usuarios  
  - **Tablespaces** (No aplica en Firebird – ver limitaciones)  

⚠️ **Restricciones aplicadas**  
- No se utilizo `information_schema`.  
- No se utilizaron librerías de administración (ej. SQLAlchemy, Hibernate, Entity Framework, etc.).  
- Toda la metadata se obtiene mediante **consultas a system tables de Firebird**.  

---

## 3. Características Mínimas Requeridas

### 3.1. Gestión de conexiones y autenticación
- Inicio de sesión con cualquier usuario válido de Firebird.  
- Almacenamiento de múltiples conexiones a diferentes instancias.  
- Visualización y monitoreo de conexiones activas.  

### 3.2. Soporte de objetos de base de datos
- Exploración de objetos desde system tables:  
  - Tablas (`RDB$RELATIONS`)  
  - Columnas (`RDB$RELATION_FIELDS`)  
  - Vistas (`RDB$RELATIONS` con `RDB$VIEW_SOURCE`)  
  - Procedimientos (`RDB$PROCEDURES`)  
  - Funciones (`RDB$FUNCTIONS`)  
  - Triggers (`RDB$TRIGGERS`)  
  - Índices (`RDB$INDICES`)  
  - Secuencias/Generadores (`RDB$GENERATORS`)  
  - Usuarios (`SEC$USERS`)  
  - Paquetes (`RDB$PACKAGES`)  
  - Tablespaces (**No soportado en Firebird**)  

### 3.3. Operaciones sobre objetos
- **Creación visual:** tablas y vistas.  
- **Generación de DDL:** exportación del `CREATE` directamente desde metadata.  
- **Modificación:** edición mediante SQL (scripts DDL).  

### 3.4. Ejecución de sentencias SQL
- Ejecución de **SELECT** y sentencias DML.  
- Ejecución de **scripts completos** para creación y modificación de objetos.  

---

## 6. Limitaciones de Firebird

Durante el desarrollo se identificaron **limitaciones inherentes al SGBD Firebird** que afectan la implementación completa:

### 6.1. Esquemas
- Firebird no implementa **schemas** como otros SGBD.  
- Todos los objetos pertenecen a un único espacio de nombres.  
- Impacto:  
  - No es posible implementar gestión de esquemas.  
  - Organización de objetos solo por nombre y tipo.  

### 6.2. Tablespaces
- Firebird no soporta **tablespaces**.  
- Maneja un único archivo `.fdb` por base de datos.  
- Impacto:  
- No es posible implementar administración de tablespaces.  
 
## 3. Estructura del proyecto